import json

from fastapi import APIRouter, Depends, HTTPException
from app.db.models.experiment_model import Experiment
from app.db.models.metric_model import Metric, Metric_type, Metric_direction
from app.db.models.variant_model import Variant
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary
from app.db.session import get_session
from app.stats.calculators import calculate_sample_size, calculate_minimum_detectable_effect
from app.stats.stat_analysis import test_type, uplift_mode
from app.tasks.worker import run_analysis
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.models.user_model import UserReceived
from app.api.auth.dependency import get_current_user

router = APIRouter(prefix="/api/analysis-runs", tags=["analysis"])

@router.get("/{analysis_run_id}")
async def poll_status(analysis_run_id: int, current_user: UserReceived = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Fetch record directly from the application database

    statement = select(Analysis_Run).where(Analysis_Run.id == analysis_run_id)
    result = await session.execute(statement)
    analysis_run = result.scalars().first()

    if not analysis_run:
        raise HTTPException(status_code=404, detail="Analysis run not found.")

    # Return structured data for frontend UI state evaluation
    return {
        "id": analysis_run.id,
        "status": analysis_run.status,  # PENDING, COMPLETED, FAILED
        "error": analysis_run.error_message  # Contains trace stack if FAILED
    }

@router.get("/{experiment_id}/summary")
async def get_analysis_result(experiment_id: int, current_user: UserReceived = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Check if the experiment belongs to the current user
    statement = select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == current_user.id)
    result = await session.execute(statement)
    experiment = result.scalars().first()
    
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or you do not have access to it.")
    
    # Fetch the latest analysis run for the given experiment
    statement = select(Analysis_Run).where(Analysis_Run.experiment_id == experiment_id).order_by(Analysis_Run.created_at.desc())
    result = await session.execute(statement)
    analysis_run = result.scalars().first()
    
    if not analysis_run:
        raise HTTPException(status_code=404, detail="No analysis run found for this experiment.")
    
    # Fetch the summary for the latest analysis run
    statement = select(Summary).where(Summary.analysis_run_id == analysis_run.id)
    result = await session.execute(statement)
    summary = result.scalars().first()
    
    if not summary:
        raise HTTPException(status_code=404, detail="No summary found for the latest analysis run.")

    return json.loads(summary.summary_json)

@router.get("/{experiment_id}/result")
async def get_analysis_text_result(experiment_id: int, current_user: UserReceived = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Check if the experiment belongs to the current user
    statement = select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == current_user.id)
    result = await session.execute(statement)
    experiment = result.scalars().first()
    
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or you do not have access to it.")
    
    # Fetch the latest analysis run for the given experiment
    statement = select(Analysis_Run).where(Analysis_Run.experiment_id == experiment_id).order_by(Analysis_Run.created_at.desc())
    result = await session.execute(statement)
    analysis_run = result.scalars().first()
    
    if not analysis_run:
        raise HTTPException(status_code=404, detail="No analysis run found for this experiment.")
    
    # Fetch the summary for the latest analysis run
    statement = select(Summary).where(Summary.analysis_run_id == analysis_run.id)
    result = await session.execute(statement)
    summary = result.scalars().first()
    
    if not summary:
        raise HTTPException(status_code=404, detail="No summary found for the latest analysis run.")
    
    return summary.text_summary