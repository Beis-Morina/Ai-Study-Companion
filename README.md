# AI Study Companion

AI-powered study assistant for summaries and quizzes.

## Project Goal
To provide clear, simple, and focused study support using an AI chatbot.

## MVP Features
- Text summarization
- Quiz generation from topics or pasted text

## Target Users
- High school students (Grades 11–12)

## Team Members
- Beis Morina
- Melos Lutolli
- Gerti Zeqiri
- Aron Rrmoku

## Project Links
- Trello: https://trello.com/invite/b/697ce316d7d388ff5f0ecb09/ATTI99f24b01519eda6f5caba9439545e5ec27691AAB/ai-study-companion
- Figma: https://www.figma.com/design/tELKFU7hQCOB6ocpnx8D4X/AI-Study-Companion-%E2%80%93-Wireframes?node-id=1-17&t=hAIWsWdJw6vht9RW-1
  
# AI Study Companion – Backend API

This is the backend system for the AI Study Companion project.

It handles:
- User registration
- User login (JWT authentication)
- Protected chat endpoints
- Chat creation
- Message storage
- Chat history retrieval
- SQLite database with foreign key relationships

---

## Technologies Used

- FastAPI
- SQLite
- JWT (python-jose)
- Passlib (bcrypt)
- Uvicorn

---

## Database Structure

Tables:
- users (id, username, password_hash, created_at)
- chats (id, user_id, created_at)
- messages (id, chat_id, role, content, created_at)

Relationships:
- A user can have multiple chats
- A chat can have multiple messages
- Messages belong to a specific chat
- Chats belong to a specific user

---

## How to Run the Backend

1. Open terminal inside backend folder
2. Activate virtual environment:
   Windows:
   venv\Scripts\activate

3. Install dependencies:
   pip install -r requirements.txt

4. Start server:
   python -m uvicorn main:app --reload

5. Open Swagger:
   http://127.0.0.1:8000/docs

---

## How to Use

1. Register a new user at:
   POST /api/auth/register

2. Login at:
   POST /api/auth/login

3. Click "Authorize" in Swagger and paste:
   Bearer <your_token>

4. Use:
   - POST /api/chat/send
   - GET /api/chat/history

---

## Project Status

Backend system completed and tested.
Authentication, chat storage, and message history are fully functional.
