from fastAPI import APIRouter, Depends
from db.models.experiments import Experiment
from db.session import get_session
from sqlmodel import Session, select, where

router = APIRouter(prefix="/experiments", tags=["experiments"])
user = get_current_user()  # Assuming you have a function to get the current user

@router.post("/")
async def create_experiment(name: str, description: str, 
                            session: Session = Depends(get_session),
                            owner: User = Depends(get_current_user)):
    experiment = Experiment(name=experiment.name, 
                            description=experiment.description, 
                            owner_id=User.user_id)
    
    with session:
        await session.add(experiment)
        await session.commit()
        await session.refresh(experiment)
    return {"message": "Experiment created"}

@router.get("/")
async def get_experiments():
    async with Session() as session:
        result = await session.execute(select(Experiment).where(Experiment.owner_id == user.id))
        experiments = result.scalars().all()
    yield {"experiments": experiments}

@router.get("/{experiment_id}")
async def get_experiment(experiment_id: int, session: Session = Depends(get_session)):
    async with session:
            result = await session.execute(select(Experiment).where(Experiment.owner_id == user.id, Experiment.id == experiment_id))
            experiments = result.scalars().all()
    yield {"experiments": experiments}

@router.patch("/{experiment_id}")
async def update_experiment(experiment_id: int):
    return {"message": f"Experiment {experiment_id} updated"}

