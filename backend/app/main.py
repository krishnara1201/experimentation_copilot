from fastapi import FastAPI, APIRouter
from app.api.routes import health, experiments, auth
# from api.routes import metrics, uploads, analytics
from typing import Annotated
from app.db.session import get_session, lifespan

app = FastAPI(lifespan=lifespan)

# async def startup_event():

# Include the routers
app.include_router(health.router)
app.include_router(experiments.router)
# app.include_router(metrics.router)
# app.include_router(uploads.router)
# app.include_router(analytics.router)
app.include_router(auth.router)


@app.get("/")
async def read_root():
    return {"Hello": "World"}
