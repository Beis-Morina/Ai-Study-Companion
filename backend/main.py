from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import init_db, create_chat, add_message, get_messages

app = FastAPI(title="AI Study Companion API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"message": "AI Study Companion API running"}


@app.get("/health")
def health():
    return {"status": "ok"}


class ChatSendRequest(BaseModel):
    message: str
    chat_id: Optional[int] = None


@app.post("/api/chat/send")
def send_chat(payload: ChatSendRequest):
    # 1) create chat if missing
    chat_id = payload.chat_id if payload.chat_id is not None else create_chat()

    # 2) store user message
    add_message(chat_id, "user", payload.message)

    # 3) fake reply for now
    reply = f"You said: {payload.message}"

    # 4) store assistant reply
    add_message(chat_id, "assistant", reply)

    return {"chat_id": chat_id, "reply": reply}


@app.get("/api/chat/history")
def chat_history(chat_id: int):
    rows = get_messages(chat_id)

    if rows is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    return {
        "chat_id": chat_id,
        "messages": [
            {"role": r["role"], "content": r["content"], "created_at": r["created_at"]}
            for r in rows
        ],
    }
