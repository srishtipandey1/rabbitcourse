# RabbitCourse

RabbitCourse is a full-stack AI learning platform that turns a topic or YouTube URL into a structured course, then lets users sign up, watch live generation progress, browse polished course cards, enroll, track lessons, upload materials, and continue learning from a personalized dashboard.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js, React, Tailwind CSS | Minimal Landify-inspired hero and course-card grid. |
| Backend | FastAPI | RESTful API, validation with Pydantic, SSE for generation progress. |
| Database | SQLite locally, PostgreSQL via `DATABASE_URL` | SQLModel keeps the schema portable. |
| Auth | Signed bearer tokens | Standard-library HMAC token and PBKDF2 password hashing. |
| Uploads | FastAPI multipart uploads | Stores course materials under `backend/uploads`. |
| Payments | Provider hook | `/payments/checkout` is ready for a real provider when configured. |
| CI | GitHub Actions | Frontend build and backend compile checks. |

## Repo Structure

```text
rabbitcourse/
  .github/workflows/ci.yml
  backend/
    main.py
    requirements.txt
    db/
      database.py
      models.py
    agent/
      transcript.py
      concept_mapper.py
      gap_finder.py
      curriculum_builder.py
      learning_intelligence.py
  frontend/
    app/
      page.tsx
      auth/page.tsx
      dashboard/page.tsx
      courses/page.tsx
      generate/page.tsx
      history/page.tsx
      processing/[id]/page.tsx
      course/[id]/page.tsx
      settings/page.tsx
      globals.css
      layout.tsx
    components/
      RabbitUI.tsx
    lib/
```

## Frontend Experience

The app is designed as a bright learning workspace: white cards, soft gray panels, navy text, green/blue progress accents, and orange primary actions. Core screens include:

- `/` concise course-generation entry.
- `/auth` signup/login.
- `/dashboard` enrolled, generated, in-progress, completed, and recent activity overview.
- `/courses` filterable generated course grid.
- `/generate` AI course builder wizard for topic or YouTube URL mode.
- `/processing/[id]` live SSE generation timeline.
- `/course/[id]` module sidebar, lesson player, notes, materials, learning intelligence, quality score, and export action.
- `/history` previous generated courses.
- `/settings` learning preferences and account settings.

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

Useful environment variables:

```bash
GROQ_API_KEY=your_groq_key_here
YOUTUBE_API_KEY=your_youtube_data_api_key_here
DATABASE_URL=sqlite:///./rabbitcourse.db
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGINS=http://localhost:3000
UPLOAD_DIR=uploads
PAYMENT_PROVIDER=disabled
```

For PostgreSQL:

```bash
DATABASE_URL=postgresql+psycopg://user:password@host:5432/rabbitcourse
```

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` for local development.

## REST API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Create a user and return a bearer token. |
| `POST` | `/auth/login` | Authenticate and return a bearer token. |
| `GET` | `/auth/me` | Return the current user. |
| `GET` | `/courses` | List generated courses for the card grid. |
| `POST` | `/courses/enroll` | Enroll the current user in a course. |
| `POST` | `/courses/{course_id}/materials` | Upload course material, max 25MB. |
| `GET` | `/courses/{course_id}/materials` | List current user's uploaded course materials. |
| `POST` | `/course/{course_id}/lessons/{lesson_id}/complete` | Mark a lesson complete and update progress. |
| `POST` | `/generate` | Start AI course generation. |
| `GET` | `/stream/{course_id}` | Stream generation progress. |
| `GET` | `/course/{course_id}` | Fetch a generated course. |
| `POST` | `/payments/checkout` | Payment-provider integration point. |

Authenticated routes require:

```http
Authorization: Bearer <token>
```

## Deployment

### Frontend on Vercel

1. Import the repository in Vercel.
2. Set the root directory to `frontend`.
3. Add `NEXT_PUBLIC_API_URL=https://your-api-host`.
4. Deploy with the default Next.js build command.

### Backend on Heroku

1. Create a Heroku app and provision Heroku Postgres.
2. Set config vars: `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`, `CORS_ORIGINS`.
3. Use this start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

For Render, use the same build command `pip install -r requirements.txt` and the same start command.

## Example Commit Messages

```text
feat(frontend): add Landify-style course card grid
feat(api): add auth enrollment and course material uploads
ci: add frontend and backend GitHub Actions checks
docs: document deployment and release checklist
```

## Release Checklist

- [ ] `npm run build` passes in `frontend`.
- [ ] `python -m py_compile main.py db/database.py db/models.py` passes in `backend`.
- [ ] Auth signup and login return tokens.
- [ ] Course grid loads from `/courses`.
- [ ] Enroll action works with a bearer token.
- [ ] Material upload stores a file under `backend/uploads`.
- [ ] `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, and API keys are set in production.
- [ ] Payment provider keys and webhook handling are added before selling paid courses.
- [ ] CI passes on GitHub.

## Architecture

```mermaid
graph LR
  User([User]) --> UI[Next.js UI]
  UI --> API[FastAPI REST API]
  API --> DB[(SQLite or PostgreSQL)]
  API --> Auth[Token Auth]
  API --> Storage[(Course Material Uploads)]
  API --> AI[Course Generation Agent]
```
