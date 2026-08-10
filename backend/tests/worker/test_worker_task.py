import uuid

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary
from app.db.session import engine
from app.tasks.worker import run_analysis


@pytest.mark.asyncio
async def test_worker_marks_analysis_completed_and_writes_summary(seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    task_id = str(uuid.uuid4())

    async with AsyncSession(engine) as session:
        run = Analysis_Run(experiment_id=experiment_id, task_id=task_id, status=Analysis_Run_Status.PENDING)
        session.add(run)
        await session.commit()

    result = run_analysis.apply(
        args=(experiment_id, 1, 50, 1000, 70, 1000, 0.05, "two-sided", "absolute"),
        task_id=task_id,
        throw=False,
    )

    assert result.successful()

    async with AsyncSession(engine) as session:
        run_result = await session.execute(select(Analysis_Run).where(Analysis_Run.task_id == task_id))
        run = run_result.scalars().first()
        assert run is not None
        assert run.status == Analysis_Run_Status.COMPLETED

        summary_result = await session.execute(select(Summary).where(Summary.analysis_run_id == run.id))
        summary = summary_result.scalars().first()
        assert summary is not None
        assert summary.text_summary


@pytest.mark.asyncio
async def test_worker_marks_analysis_failed_on_exception(seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    task_id = str(uuid.uuid4())

    async with AsyncSession(engine) as session:
        run = Analysis_Run(experiment_id=experiment_id, task_id=task_id, status=Analysis_Run_Status.PENDING)
        session.add(run)
        await session.commit()

    result = run_analysis.apply(
        args=(experiment_id, 1, 0, 0, 70, 1000, 0.05, "two-sided", "absolute"),
        task_id=task_id,
        throw=False,
    )

    assert not result.successful()

    async with AsyncSession(engine) as session:
        run_result = await session.execute(select(Analysis_Run).where(Analysis_Run.task_id == task_id))
        run = run_result.scalars().first()
        assert run is not None
        assert run.status == Analysis_Run_Status.FAILED
        assert "division by zero" in (run.error_message or "")
