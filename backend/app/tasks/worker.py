import asyncio
import json
import traceback
from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

from app.db.session import DATABASE_URL
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.metric_model import Metric_type
from app.db.models.summary_model import Summary
from app.stats.summary import decision_summary
from app.stats.stat_analysis import test_type as TestTypeEnum, uplift_mode as UpliftModeEnum

load_dotenv()
celery_app = Celery("worker",
                    broker=os.getenv("REDIS_URL"),
                    backend=os.getenv("REDIS_BACKEND_URL"),
                    broker_connection_retry_on_startup=True)

async def _update_analysis_status(task_id: str, status: Analysis_Run_Status, summary_data: dict = None, text_summary: str = None, error_msg: str = None):
    """Unified async helper to handle both successful updates and failure captures.

    Each call creates and disposes its own engine rather than reusing a
    shared, module-level one. `run_analysis` calls this via a fresh
    `asyncio.run(...)` per task, and asyncpg connections are bound to the
    event loop that created them -- reusing one engine/pool across separate
    `asyncio.run()` calls (or across Celery's forked worker processes)
    breaks with "attached to a different loop" errors. NullPool means no
    connections are held open between calls, so there's nothing to leak.
    """
    worker_engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    try:
        async with AsyncSession(worker_engine) as session:
            statement = select(Analysis_Run).where(Analysis_Run.task_id == task_id)
            result = await session.execute(statement)
            analysis_run = result.scalars().first()

            if analysis_run:
                analysis_run.status = status
                if status == Analysis_Run_Status.COMPLETED:
                    analysis_run.error_message = None
                    summary = Summary(
                        analysis_run_id=analysis_run.id,
                        summary_json=json.dumps(summary_data),
                        text_summary=text_summary
                    )
                    session.add(summary)
                    analysis_run.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                else:
                    analysis_run.error_message = error_msg

                session.add(analysis_run)
                await session.commit()
    finally:
        await worker_engine.dispose()

@celery_app.task(bind=True)
def run_analysis(self, experiment_id, metric_id, metric_type_val,
                 variant_a_total, variant_b_total,
                 variant_a_successes, variant_b_successes,
                 variant_a_mean, variant_a_std, variant_b_mean, variant_b_std,
                 alpha, test_type_val, uplift_mode_val):

    task_id = self.request.id

    try:
        # Reconstruct Enums
        actual_test_type = TestTypeEnum(test_type_val)
        actual_uplift_mode = UpliftModeEnum(uplift_mode_val)
        actual_metric_type = Metric_type(metric_type_val)

        # Heavy computation
        if actual_metric_type == Metric_type.BINARY:
            summary = decision_summary(
                metric_type=actual_metric_type,
                n1=variant_a_total,
                n2=variant_b_total,
                p1=variant_a_successes / variant_a_total,
                p2=variant_b_successes / variant_b_total,
                alpha=alpha,
                test_type=actual_test_type,
                mode=actual_uplift_mode
            )
        else:
            summary = decision_summary(
                metric_type=actual_metric_type,
                n1=variant_a_total,
                n2=variant_b_total,
                mean1=variant_a_mean,
                std1=variant_a_std,
                mean2=variant_b_mean,
                std2=variant_b_std,
                alpha=alpha,
                test_type=actual_test_type,
                mode=actual_uplift_mode
            )
        text_summary = summary.generate_summary_text()

        # Commit success state
        asyncio.run(_update_analysis_status(
            task_id=task_id,
            status=Analysis_Run_Status.COMPLETED,
            summary_data=summary.summary,
            text_summary=text_summary
        ))
        return {"summary": summary.summary, "text_summary": text_summary}

    except Exception as e:
        # Catch mathematical or schema mapping anomalies
        error_trace = traceback.format_exc()

        # Commit failure state to the operational database
        asyncio.run(_update_analysis_status(
            task_id=task_id,
            status=Analysis_Run_Status.FAILED,  # Assumes your Enum has FAILED or ERROR
            error_msg=f"{str(e)}\n{error_trace}"
        ))

        # Reraise so Celery broker registers the failure state natively
        raise e
