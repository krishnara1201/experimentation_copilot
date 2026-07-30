from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from fastapi import status
import time
from sqlmodel import text
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.session import get_session

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("/")
async def health_check(session: AsyncSession = Depends(get_session)):
    details = {}
    
    # 1. Test Database
    try:
        start_time = time.time()
        await session.execute(text("SELECT 1"))
        details["database"] = f"connected ({int((time.time() - start_time) * 1000)}ms)"
    except Exception as e:
        details["database"] = f"unhealthy: {str(e)}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "details": details}
        )

    # 2. Add other checks here (Redis, disk, etc.)

    return {"status": "healthy", "details": details}