from fastapi import APIRouter, Depends, HTTPException
from app.db.models.experiment_model import Experiment
from app.db.models.metric_model import Metric, Metric_type, Metric_direction
from app.db.models.variant_model import Variant
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.session import get_session
from app.stats.calculators import calculate_sample_size, calculate_minimum_detectable_effect
from app.stats.stat_analysis import test_type, uplift_mode
from app.tasks.worker import run_analysis
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.models.user_model import UserReceived
from app.api.auth.dependency import get_current_user


router = APIRouter(prefix="/api/experiments", tags=["experiments"])

@router.post("/")
async def create_experiment(name: str, description: str, 
                            session: AsyncSession = Depends(get_session),
                            owner: UserReceived = Depends(get_current_user)):
    experiment = Experiment(name=name, 
                            description=description, 
                            owner_id=owner.id)
    
    async with session:
        session.add(experiment)
        await session.commit()
        await session.refresh(experiment)
    return {"message": "Experiment created"}

@router.get("/")
async def get_experiments(session: AsyncSession = Depends(get_session),
                          owner: UserReceived = Depends(get_current_user)):
    async with session:
        result = await session.execute(select(Experiment).where(Experiment.owner_id == owner.id))
        experiments = result.scalars().all()
    return {"experiments": experiments}

@router.get("/{experiment_id}")
async def get_experiment(experiment_id: int, session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    async with session:
            result = await session.execute(select(Experiment).where(Experiment.owner_id == owner.id, Experiment.id == experiment_id))
            experiments = result.scalars().all()
            experiment = experiments[0] if experiments else None
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to view it.")
    return {"experiment": experiment}

@router.patch("/{experiment_id}")
async def update_experiment(experiment_id: int, experiment_details: Experiment, 
                            session: AsyncSession = Depends(get_session),
                            user: UserReceived = Depends(get_current_user)):
    
    async with session:
        result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == user.id))
        existing_experiment = result.scalars().first()
        
        if not existing_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update it.")
        
        existing_experiment.name = experiment_details.name
        existing_experiment.description = experiment_details.description
        
        await session.commit()
        await session.refresh(existing_experiment)
    return {"message": f"Experiment {experiment_id} updated"}

@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: int, session: AsyncSession = Depends(get_session),
                            owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        existing_experiment = result.scalars().first()
        
        if not existing_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to delete it.")

        await session.delete(existing_experiment)
        await session.commit()
    return {"message": f"Experiment {experiment_id} deleted"}

@router.post("/{experiment_id}/metrics")
async def create_metric(experiment_id: int, metric_name: str, metric_type: Metric_type = Metric_type.NUMERIC, 
                        metric_direction: Metric_direction = Metric_direction.UP,
                        is_primary = False, is_guardrail = False, 
                        session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    
    if is_primary and is_guardrail:
        raise HTTPException(status_code=400, detail="A metric cannot be both primary and guardrail.")\
   
    metric = Metric(name=metric_name, 
                    type=metric_type, 
                    direction=metric_direction, 
                    is_primary=is_primary, 
                    is_guardrail=is_guardrail,
                    experiment_id=experiment_id)
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        session.add(metric)
        await session.commit()
        await session.refresh(metric)
    
    return {"message": "Metric created", "metric": metric}
    
@router.get("/{experiment_id}/metrics")
async def get_all_metrics(experiment_id: int, session: AsyncSession = Depends(get_session),
                      owner: UserReceived = Depends(get_current_user)):
    
    with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.experiment_id == experiment_id, Metric.owner_id == owner.id))
        metrics = result.scalars().all()
    return {"metrics": metrics}

@router.get("/{experiment_id}/metrics/{metric_id}")
async def get_metric(experiment_id: int, metric_id: int, session: AsyncSession = Depends(get_session),
                     owner: UserReceived = Depends(get_current_user)):
    
    with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.experiment_id == experiment_id, Metric.id == metric_id, Metric.owner_id == owner.id))
        metrics = result.scalars().all()
        metric = metrics[0] if metrics else None
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to view it.")
    return {"metric": metric}

@router.patch("/{experiment_id}/metrics/{metric_id}")
async def update_metric(experiment_id: int, metric_id: int, metric_details: Metric, 
                        session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        result = await session.execute(select(Metric).where(Metric.id == metric_id, Metric.experiment_id == experiment_id))
        existing_metric = result.scalars().first()
        
        if not existing_metric:
            raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to update it.")
        
        existing_metric.name = metric_details.name
        existing_metric.type = metric_details.type
        existing_metric.direction = metric_details.direction
        existing_metric.is_primary = metric_details.is_primary
        existing_metric.is_guardrail = metric_details.is_guardrail
        
        await session.commit()
        await session.refresh(existing_metric)
    return {"message": f"Metric {metric_id} updated", "metric": existing_metric}

@router.delete("/{experiment_id}/metrics/{metric_id}")
async def delete_metric(experiment_id: int, metric_id: int, session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.id == metric_id, Metric.experiment_id == experiment_id))
        existing_metric = result.scalars().first()
        
        if not existing_metric:
            raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to delete it.")
        
        await session.delete(existing_metric)
        await session.commit()
    return {"message": f"Metric {metric_id} deleted"}

@router.get("/{experiment_id}/variants")
async def get_all_variants(experiment_id: int, session: AsyncSession = Depends(get_session),
                    owner: UserReceived = Depends(get_current_user)):
    
    with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its variants.")
        
        result = await session.execute(select(Variant).where(Variant.experiment_id == experiment_id))
        variants = result.scalars().all()
    return {"variants": variants}

@router.get("/{experiment_id}/variants/{variant_id}")
async def get_variant(experiment_id: int, variant_id: int, session: AsyncSession = Depends(get_session),
                    owner: UserReceived = Depends(get_current_user)):
        
        with session:
            owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
            owner_experiment = owner_experiment_result.scalars().first()
            if not owner_experiment:
                raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its variants.")
            
            result = await session.execute(select(Variant).where(Variant.experiment_id == experiment_id, Variant.id == variant_id))
            variants = result.scalars().all()
            variant = variants[0] if variants else None
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found or you do not have permission to view it.")
        return {"variant": variant}

@router.post("/{experiment_id}/variants")
async def create_variant(experiment_id: int, variant_name: str, 
                         is_control: bool = False,
                         allocation_percentage: float = 0.0,
                         session: AsyncSession = Depends(get_session),
                        owner: UserReceived = Depends(get_current_user)):
    
    if allocation_percentage < 0.0 or allocation_percentage > 100.0:
        raise HTTPException(status_code=400, detail="Allocation percentage must be between 0 and 100.")
    variant = Variant(name=variant_name,
                      experiment_id=experiment_id,
                      is_control=is_control,
                      allocation_percentage=allocation_percentage)
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its variants.")
        
        session.add(variant)
        await session.commit()
        await session.refresh(variant)
    
    return {"message": "Variant created", "variant": variant}

@router.patch("/{experiment_id}/variants/{variant_id}")
async def update_variant(experiment_id: int, variant_id: int, variant_details: Variant,
                         session: AsyncSession = Depends(get_session),
                         owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its variants.")
        
        result = await session.execute(select(Variant).where(Variant.id == variant_id, Variant.experiment_id == experiment_id))
        existing_variant = result.scalars().first()
        
        if not existing_variant:
            raise HTTPException(status_code=404, detail="Variant not found or you do not have permission to update it.")
        
        existing_variant.name = variant_details.name
        existing_variant.is_control = variant_details.is_control
        existing_variant.allocation_percentage = variant_details.allocation_percentage
        
        await session.commit()
        await session.refresh(existing_variant)
    return {"message": f"Variant {variant_id} updated", "variant": existing_variant}

@router.delete("/{experiment_id}/variants/{variant_id}")
async def delete_variant(experiment_id: int, variant_id: int, session: AsyncSession = Depends(get_session),
                         owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its variants.")
        
        result = await session.execute(select(Variant).where(Variant.id == variant_id, Variant.experiment_id == experiment_id))
        existing_variant = result.scalars().first()
        
        if not existing_variant:
            raise HTTPException(status_code=404, detail="Variant not found or you do not have permission to delete it.")
        
        await session.delete(existing_variant)
        await session.commit()
    return {"message": f"Variant {variant_id} deleted"}

@router.post("/{experiment_id}/sample-size")
async def calculate_sample_size_endpoint(experiment_id: int, metric_id: int,
                                         alpha: float = 0.05, 
                                         power: float = 0.8, 
                                         effect_size: float = 0.1,
                                         base_rate: float = 0.5,
                                         session: AsyncSession = Depends(get_session),
                                         owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.id == metric_id, Metric.experiment_id == experiment_id))
        metric = result.scalars().first()
        
        if not metric:
            raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to view it.")
        
        sample_size = calculate_sample_size(alpha=alpha, power=power, mde=effect_size, p1=base_rate)
    
    return {"sample_size": sample_size}

@router.post("/{experiment_id}/mde")
async def calculate_mde_endpoint(experiment_id: int, metric_id: int,
                                   alpha: float = 0.05, 
                                   power: float = 0.8, 
                                   sample_size: int = 1000,
                                   base_rate: float = 0.5,
                                   session: AsyncSession = Depends(get_session),
                                   owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.id == metric_id, Metric.experiment_id == experiment_id))
        metric = result.scalars().first()
        
        if not metric:
            raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to view it.")
        
        mde = calculate_minimum_detectable_effect(alpha=alpha, power=power, n=sample_size, p1=base_rate)
    
    return {"minimum_detectable_effect": mde}

@router.post("/{experiment_id}/run-analysis")
async def run_analysis_task(experiment_id: int, metric_id: int,
                       variant_a_successes: int, variant_a_total: int,
                       variant_b_successes: int, variant_b_total: int,
                       alpha: float = 0.05, uplift_mode: uplift_mode = uplift_mode.ABSOLUTE, 
                       test_type: test_type = test_type.TWO_SIDED,
                       session: AsyncSession = Depends(get_session),
                       owner: UserReceived = Depends(get_current_user)):
    
    async with session:
        owner_experiment_result = await session.execute(select(Experiment).where(Experiment.id == experiment_id, Experiment.owner_id == owner.id))
        owner_experiment = owner_experiment_result.scalars().first()
        if not owner_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found or you do not have permission to update its metrics.")
        
        result = await session.execute(select(Metric).where(Metric.id == metric_id, Metric.experiment_id == experiment_id))
        metric = result.scalars().first()
        
        if not metric:
            raise HTTPException(status_code=404, detail="Metric not found or you do not have permission to view it.")
        
        task = run_analysis.delay(experiment_id, 
                                  metric_id, 
                                  variant_a_successes,
                                  variant_a_total, 
                                  variant_b_successes, 
                                  variant_b_total, 
                                  alpha, 
                                  uplift_mode.value, 
                                  test_type.value)

        analysis_run = Analysis_Run(experiment_id=experiment_id, task_id=task.id, status=Analysis_Run_Status.PENDING)
        session.add(analysis_run)
        await session.commit()
    return {"message": "Analysis task started", "task_id": task.id, "analysis_run_id": analysis_run.id}

