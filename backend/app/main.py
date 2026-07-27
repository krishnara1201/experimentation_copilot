from fastapi import FastAPI, APIRouter
from routes import health, experiments, metrics, uploads, analytics
from typing import Annotated

app = FastAPI()

# Include the routers
app.include_router(health.router)
app.include_router(experiments.router)
app.include_router(metrics.router)
app.include_router(uploads.router)
app.include_router(analytics.router)


@app.get("/")
async def read_root():
    return {"Hello": "World"}
