from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
import hashlib

from db import (
    init_db,
    create_user,
    get_user_by_username,
    get_user_by_id,
    create_chat,
    add_message,
    get_messages,
    chat_belongs_to_user,
)

app = FastAPI(title="AI Study Companion API")

# ---- Auth config ----
SECRET_KEY = "super_secret_key_change_this"
ALGORITHM = "HS256"
security = HTTPBearer()


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"message": "AI Study Companion API running"}


@app.get("/health")
def health():
    return {"status": "ok"}


def create_token(user_id: int) -> str:
    return jwt.encode({"user_id": user_id}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    token = creds.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("user_id"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---- Schemas ----
class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ChatSendRequest(BaseModel):
    message: str
    chat_id: Optional[int] = None


# ---- Auth endpoints ----
@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    existing = get_user_by_username(payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    password_hash = hashlib.sha256(payload.password.encode()).hexdigest()
    user_id = create_user(payload.username, password_hash)
    token = create_token(user_id)

    return {"user_id": user_id, "token": token}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = get_user_by_username(payload.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    password_hash = hashlib.sha256(payload.password.encode()).hexdigest()
    if password_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(user["id"])
    return {"user_id": user["id"], "token": token}


# ---- Chat endpoints (protected) ----
@app.post("/api/chat/send")
def send_chat(payload: ChatSendRequest, user=Depends(get_current_user)):
    user_id = user["id"]

    if payload.chat_id is None:
        chat_id = create_chat(user_id)
    else:
        chat_id = payload.chat_id
        if not chat_belongs_to_user(chat_id, user_id):
            raise HTTPException(status_code=403, detail="No access to this chat")

    add_message(chat_id, "user", payload.message)

    reply = f"You said: {payload.message}"
    add_message(chat_id, "assistant", reply)

    return {"chat_id": chat_id, "reply": reply}


@app.get("/api/chat/history")
def chat_history(chat_id: int, user=Depends(get_current_user)):
    user_id = user["id"]

    if not chat_belongs_to_user(chat_id, user_id):
        raise HTTPException(status_code=403, detail="No access to this chat")

    rows = get_messages(chat_id)

    return {
        "chat_id": chat_id,
        "messages": [
            {"role": r["role"], "content": r["content"], "created_at": r["created_at"]}
            for r in rows
        ],
    }
