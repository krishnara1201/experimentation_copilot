import os

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, experiments, auth, analysis
# from api.routes import metrics, uploads
from typing import Annotated
from app.db.session import get_session, lifespan

app = FastAPI(lifespan=lifespan)

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# async def startup_event():

# Include the routers
app.include_router(health.router)
app.include_router(experiments.router)
# app.include_router(metrics.router)
# app.include_router(uploads.router)
app.include_router(analysis.router)
app.include_router(auth.router)


@app.get("/")
async def read_root():
    return {"Hello": "World"}
