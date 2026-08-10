import uuid

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary
from app.db import session as session_module
from app.tasks.worker import run_analysis


@pytest.mark.asyncio
async def test_run_analysis_creates_pending_run_and_status_polling(client, auth_headers, seeded_experiment, monkeypatch):
    experiment_id = seeded_experiment["experiment"]["id"]
    metric_id = seeded_experiment["metric"]["id"]

    dispatched = {}

    def fake_apply_async(*, args, task_id):
        dispatched["args"] = args
        dispatched["task_id"] = task_id

    monkeypatch.setattr(run_analysis, "apply_async", fake_apply_async)

    run_response = await client.post(
        f"/api/experiments/{experiment_id}/run-analysis",
        params={
            "metric_id": metric_id,
            "variant_a_successes": 50,
            "variant_a_total": 1000,
            "variant_b_successes": 75,
            "variant_b_total": 1000,
        },
        headers=auth_headers,
    )

    assert run_response.status_code == 200
    payload = run_response.json()
    assert payload["task_id"]
    assert payload["analysis_run_id"] > 0
    assert dispatched["task_id"] == payload["task_id"]

    status_response = await client.get(f"/api/analysis-runs/{payload['analysis_run_id']}", headers=auth_headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == Analysis_Run_Status.PENDING


@pytest.mark.asyncio
async def test_analysis_summary_and_result_endpoints(client, auth_headers, seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    task_id = str(uuid.uuid4())

    async with AsyncSession(session_module.engine) as session:
        run = Analysis_Run(experiment_id=experiment_id, task_id=task_id, status=Analysis_Run_Status.COMPLETED)
        session.add(run)
        await session.commit()
        await session.refresh(run)

        summary = Summary(
            analysis_run_id=run.id,
            summary_json='{"is_significant": true, "uplift": 0.1}',
            text_summary="Treatment is better.",
        )
        session.add(summary)
        await session.commit()

    summary_response = await client.get(f"/api/analysis-runs/{experiment_id}/summary", headers=auth_headers)
    assert summary_response.status_code == 200
    assert summary_response.json()["is_significant"] is True

    result_response = await client.get(f"/api/analysis-runs/{experiment_id}/result", headers=auth_headers)
    assert result_response.status_code == 200
    assert "Treatment is better" in result_response.text
