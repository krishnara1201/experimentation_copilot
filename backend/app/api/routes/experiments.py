from fastapi import APIRouter, Depends
from app.db.models.experiment_model import Experiment
from app.db.session import get_session
from sqlmodel import Session, select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.models.user_model import UserReceived
from app.api.auth.dependency import get_current_user

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

@router.post("/")
async def create_experiment(name: str, description: str, 
                            session: AsyncSession = Depends(get_session),
                            owner: UserReceived = Depends(get_current_user)):
    experiment = Experiment(name=experiment.name, 
                            description=experiment.description, 
                            owner_id=owner.id)
    
    with session:
        await session.add(experiment)
        await session.commit()
        await session.refresh(experiment)
    return {"message": "Experiment created"}

@router.get("/")
async def get_experiments(session: AsyncSession = Depends(get_session),
                          owner: UserReceived = Depends(get_current_user)):
    async with Session() as session:
        result = await session.execute(select(Experiment).where(Experiment.owner_id == owner.id))
        experiments = result.scalars().all()
    yield {"experiments": experiments}

@router.get("/{experiment_id}")
async def get_experiment(experiment_id: int, session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    async with session:
            result = await session.execute(select(Experiment).where(Experiment.owner_id == owner.id, Experiment.id == experiment_id))
            experiments = result.scalars().all()
    yield {"experiments": experiments}

@router.patch("/{experiment_id}")
async def update_experiment(experiment_id: int, experiment_details: Experiment, 
                            session: AsyncSession = Depends(get_session),
                            user: UserReceived = Depends(get_current_user)):
    
    async with session:
        result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == user.id))
        existing_experiment = result.scalars().first()
        
        if not existing_experiment:
            return {"message": "Experiment not found or you do not have permission to update it."}
        
        existing_experiment.name = experiment_details.name
        existing_experiment.description = experiment_details.description
        
        await session.commit()
        await session.refresh(existing_experiment)
    return {"message": f"Experiment {experiment_id} updated"}

