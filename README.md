# DocFlow

DocFlow is a full-stack document intelligence platform for uploading files, extracting text, running OCR, chatting with documents, generating summaries, and performing PDF operations from one workspace.

## Stack

- Frontend: React, React Router, Zustand, Axios, Tailwind CSS
- Backend: Node.js, Express, Mongoose, Multer
- Database: MongoDB
- Storage: Supabase Storage
- AI/OCR: local AI service, Hugging Face fallback, Tesseract OCR, PDF/DOCX/XLSX/PPTX parsing

## Features

- User authentication with JWT
- Upload support for `PDF`, `DOCX`, `TXT`, `PNG`, `JPG`, `XLSX`, and `PPTX`
- Text extraction and OCR for scanned/image-based documents
- RAG-style document chat
- Key-information document summarization
- PDF compress, merge, and split tools
- Search inside processed document text
- User history and admin dashboard

## Project Structure

```text
docfloe/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
└── frontend/
    ├── public/
    └── src/
```

## How It Works

1. A user signs up or logs in.
2. The frontend stores the JWT and calls protected backend routes.
3. A document is uploaded through the backend using Multer.
4. The backend detects file type and extracts readable text.
5. If needed, OCR is used for scanned PDFs or images.
6. Extracted text is chunked and stored with document metadata.
7. The original file is uploaded to Supabase Storage.
8. AI features use the processed chunks for chat and summary generation.

## Backend Setup

From `backend/`:

```bash
npm install
node server.js
```

Required environment variables in `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
HF_API_KEY=your_huggingface_api_key
HF_FALLBACK_MODEL=your_huggingface_model
FRONTEND_URL=http://localhost:3000
```

Optional local AI service:

```bash
python ai_service.py
```

The backend first tries the local AI service and then falls back to Hugging Face if needed.

## Frontend Setup

From `frontend/`:

```bash
npm install
npm start
```

If needed, define:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Main API Areas

- `/api/auth` for register, login, and current user
- `/api/documents` for upload, list, search, and delete
- `/api/ai` for summarize, chat, logs, and summary download
- `/api/pdf` for compress, merge, split, and document fetch
- `/api/admin` for admin stats, user management, and document management

## Current AI Flow

- Upload pipeline extracts and normalizes document text
- Text is split into chunks
- Chat retrieves relevant chunks and answers from that context
- Summarization retrieves key chunks and generates a concise structured summary
- Fallback logic is used only when AI output is weak or unavailable

## Notes

- Uploaded files are temporarily stored in `backend/uploads/` before processing
- Supabase stores the original or generated file
- MongoDB stores document metadata, extracted text, chunk data, chat history, and summaries

## Scripts

Backend:

```bash
npm run dev
npm run start
npm run ai-service
```

Frontend:

```bash
npm start
npm run build
```
