import asyncio
import json
import traceback
from celery import Celery
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

from app.db.session import engine
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary
from app.stats.summary import decision_summary
from app.stats.stat_analysis import test_type as TestTypeEnum, uplift_mode as UpliftModeEnum

load_dotenv()
celery_app = Celery("worker",
                    broker=os.getenv("REDIS_URL"),
                    backend=os.getenv("REDIS_BACKEND_URL"),
                    broker_connection_retry_on_startup=True)

async def _update_analysis_status(task_id: str, status: Analysis_Run_Status, summary_data: dict = None, text_summary: str = None, error_msg: str = None):
    """Unified async helper to handle both successful updates and failure captures."""
    async with AsyncSession(engine) as session:
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

@celery_app.task(bind=True)
def run_analysis(self, experiment_id, metric_id, variant_a_successes, variant_a_total,
                 variant_b_successes, variant_b_total, alpha, test_type_val, uplift_mode_val):

    task_id = self.request.id

    try:
        # Reconstruct Enums
        actual_test_type = TestTypeEnum(test_type_val)
        actual_uplift_mode = UpliftModeEnum(uplift_mode_val)

        # Heavy computation
        summary = decision_summary(
            p1=variant_a_successes / variant_a_total,
            n1=variant_a_total,
            p2=variant_b_successes / variant_b_total,
            n2=variant_b_total,
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
