from fastapi import APIRouter, Depends, HTTPException, status
from app.db.models.user_model import UserReceived, User
from app.db.session import get_session
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt as jose_jwt
from sqlalchemy.exc import IntegrityError
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/register")
async def create_user(username: str, password: str, email: EmailStr, session: AsyncSession = Depends(get_session)):
    
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        raise HTTPException(status_code=400, detail="password too long for bcrypt (max 72 bytes); please use a shorter password")

    try:
        hashed_password = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")
        user = User(username=username, password=hashed_password, email=email)
    except ValueError as e:
        # This can occur when the underlying bcrypt backend rejects the input (e.g. >72 bytes)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch other unexpected backend errors and return a 400 with the message.
        raise HTTPException(status_code=400, detail=str(e))
    

    async with session:
        session.add(user)
        try:
            await session.commit()
            await session.refresh(user)
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=400, detail="email already exists")
    

    return {"message": "User registered successfully"}

@router.post("/token")
async def login_for_access_token(username: str, password: str, session: AsyncSession = Depends(get_session)):
    
    user = await authenticate_user(username, password, session)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=90)
    access_token = create_access_token(data={"sub": username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

async def authenticate_user(username: str, password: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        return False
    if not bcrypt.checkpw(password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jose_jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM"))
    return encoded_jwt