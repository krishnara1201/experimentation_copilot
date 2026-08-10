import asyncio
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import session as session_module
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary
from app.tasks.worker import run_analysis


def _seed_analysis_run(experiment_id: int, task_id: str):
    async def _inner():
        async with AsyncSession(session_module.engine) as session:
            run = Analysis_Run(experiment_id=experiment_id, task_id=task_id, status=Analysis_Run_Status.PENDING)
            session.add(run)
            await session.commit()

    asyncio.run(_inner())


def _get_analysis_run(task_id: str) -> Analysis_Run | None:
    async def _inner():
        async with AsyncSession(session_module.engine) as session:
            run_result = await session.execute(select(Analysis_Run).where(Analysis_Run.task_id == task_id))
            return run_result.scalars().first()

    return asyncio.run(_inner())


def _get_summary_for_run(run_id: int) -> Summary | None:
    async def _inner():
        async with AsyncSession(session_module.engine) as session:
            summary_result = await session.execute(select(Summary).where(Summary.analysis_run_id == run_id))
            return summary_result.scalars().first()

    return asyncio.run(_inner())


def test_worker_marks_analysis_completed_and_writes_summary(seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    task_id = str(uuid.uuid4())
    _seed_analysis_run(experiment_id, task_id)

    result = run_analysis.apply(
        args=(experiment_id, 1, 50, 1000, 70, 1000, 0.05, "two-sided", "absolute"),
        task_id=task_id,
        throw=False,
    )

    assert result.successful()

    run = _get_analysis_run(task_id)
    assert run is not None
    assert run.status == Analysis_Run_Status.COMPLETED

    summary = _get_summary_for_run(run.id)
    assert summary is not None
    assert summary.text_summary


def test_worker_marks_analysis_failed_on_exception(seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    task_id = str(uuid.uuid4())
    _seed_analysis_run(experiment_id, task_id)

    result = run_analysis.apply(
        args=(experiment_id, 1, 0, 0, 70, 1000, 0.05, "two-sided", "absolute"),
        task_id=task_id,
        throw=False,
    )

    assert not result.successful()

    run = _get_analysis_run(task_id)
    assert run is not None
    assert run.status == Analysis_Run_Status.FAILED
    assert "division by zero" in (run.error_message or "")
