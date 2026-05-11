import asyncio
import base64
import hashlib
import hmac
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from db.database import init_db, get_session
from db.models import Concept, ConceptRelation, Course, CourseMaterial, Enrollment, GenerationRun, Lesson, PaymentSession, QuizAttempt, User, UserProgress
from agent.transcript import get_transcript, is_youtube_url
from agent.concept_mapper import map_concepts
from agent.gap_finder import find_and_fill_gaps, search_youtube
from agent.curriculum_builder import build_curriculum, write_lesson, generate_quiz
from agent.learning_intelligence import (
    build_knowledge_graph,
    enrich_curriculum,
    tutor_reply,
    update_mastery,
)

# SSE event store: course_id -> list of events
sse_store: dict[str, list[dict]] = {}
job_store: dict[str, dict] = {}
transcript_cache: dict[str, dict] = {}
concept_cache: dict[str, dict] = {}
rate_limit_store: dict[str, list[float]] = {}
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(title="RabbitCourse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def push(course_id: str, event: dict):
    if course_id not in sse_store:
        sse_store[course_id] = []
    sse_store[course_id].append(event)


async def stream_events(course_id: str):
    sent = 0
    for _ in range(6000):  # 10 min max at 100ms poll
        events = sse_store.get(course_id, [])
        while sent < len(events):
            ev = events[sent]
            yield f"data: {json.dumps(ev)}\n\n"
            sent += 1
            if ev.get("stage") in ("done", "error"):
                return
        await asyncio.sleep(0.1)


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{base64.urlsafe_b64encode(salt).decode()}.{base64.urlsafe_b64encode(digest).decode()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_b64, digest_b64 = stored_hash.split(".", 1)
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": int((datetime.utcnow() + timedelta(days=7)).timestamp()),
    }
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), body.encode(), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{body}.{sig}"


def _decode_token(token: str) -> str:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(JWT_SECRET.encode(), body.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(sig + "=" * (-len(sig) % 4))
        if not hmac.compare_digest(actual, expected):
            raise ValueError("bad signature")
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if int(payload.get("exp", 0)) < int(datetime.utcnow().timestamp()):
            raise ValueError("expired")
        return payload["sub"]
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


def _public_user(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "email": user.email,
        "display_name": user.display_name,
        "created_at": user.created_at.isoformat(),
    }


async def _require_user(authorization: Optional[str] = Header(default=None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")

    user_id = _decode_token(authorization.replace("Bearer ", "", 1))
    with get_session() as session:
        from sqlmodel import select
        user = session.exec(select(User).where(User.user_id == user_id)).first()
        if not user:
            raise HTTPException(401, "User not found")
        return user


async def _optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return await _require_user(authorization)


# ── Routes ─────────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    input: str = Field(min_length=3, max_length=500)  # YouTube URL or topic string
    max_videos: int = Field(default=6, ge=1, le=12)
    user_id: str = "local"
    learner_level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    learning_goal: str = Field(default="", max_length=500)
    weekly_time_commitment: str = Field(default="3 hours/week", max_length=80)
    preferred_format: str = Field(default="mixed", max_length=80)


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class EnrollRequest(BaseModel):
    course_id: str = Field(min_length=1)


class CheckoutRequest(BaseModel):
    course_id: str = Field(min_length=1)
    success_url: str = Field(min_length=1)
    cancel_url: str = Field(min_length=1)


class ProgressRequest(BaseModel):
    lesson_key: str
    completed: bool = True
    time_spent_sec: int = 0
    quiz_score: Optional[int] = None
    weak_concepts: list[str] = []


class CompleteLessonRequest(BaseModel):
    completed: bool = True
    time_spent_sec: int = Field(default=300, ge=0)
    notes: str = Field(default="", max_length=5000)


class TutorRequest(BaseModel):
    message: str
    lesson_key: Optional[str] = None


class ForkRequest(BaseModel):
    title_suffix: str = "Fork"


@app.post("/auth/signup")
async def signup(req: SignupRequest):
    email = req.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(422, "Enter a valid email address")

    with get_session() as session:
        from sqlmodel import select
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(409, "Email already registered")

        user = User(
            user_id=str(uuid.uuid4()),
            email=email,
            display_name=req.display_name.strip(),
            password_hash=_hash_password(req.password),
        )
        session.add(user)
        token = _create_token(user.user_id)
        return {"token": token, "user": _public_user(user)}


@app.post("/auth/login")
async def login(req: LoginRequest):
    with get_session() as session:
        from sqlmodel import select
        user = session.exec(select(User).where(User.email == req.email.strip().lower())).first()
        if not user or not _verify_password(req.password, user.password_hash):
            raise HTTPException(401, "Invalid email or password")
        return {"token": _create_token(user.user_id), "user": _public_user(user)}


@app.get("/auth/me")
async def me(user: User = Depends(_require_user)):
    return {"user": _public_user(user)}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/generate")
async def generate(req: GenerateRequest, user: Optional[User] = Depends(_optional_user)):
    user_id = user.user_id if user else "local"
    if not _rate_limit(user_id):
        raise HTTPException(429, "Rate limit exceeded. Please wait before starting another agent run.")

    course_id = str(uuid.uuid4())
    sse_store[course_id] = []
    job_store[course_id] = {
        "status": "queued",
        "attempts": 0,
        "created_at": datetime.utcnow().isoformat(),
        "resume_supported": True,
    }

    with get_session() as session:
        course = Course(
            course_id=course_id,
            input_value=req.input,
            status="processing",
            owner_user_id=user_id,
            source_type="youtube" if is_youtube_url(req.input) else "topic",
            difficulty=req.learner_level,
            learning_goal=req.learning_goal,
            weekly_time_commitment=req.weekly_time_commitment,
            preferred_format=req.preferred_format,
            estimated_minutes=360,
        )
        session.add(course)
        session.add(GenerationRun(
            run_id=str(uuid.uuid4()),
            course_id=course_id,
            user_id=user_id,
            status="running",
            current_stage="analyzing input",
            progress_percent=5,
        ))

    asyncio.create_task(_run_pipeline_with_retry(course_id, req.input, req.max_videos))
    return {"course_id": course_id, "status": "started"}


@app.get("/stream/{course_id}")
async def stream(course_id: str):
    return StreamingResponse(
        stream_events(course_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/jobs/{course_id}")
async def get_job(course_id: str):
    return job_store.get(course_id, {"status": "unknown"})


@app.get("/course/{course_id}")
async def get_course(course_id: str):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(
            select(Course).where(Course.course_id == course_id)
        ).first()
        if not course:
            raise HTTPException(404, "Course not found")
        if not course.curriculum_json:
            return {"status": course.status, "error": course.error}
        curriculum = json.loads(course.curriculum_json)
        return {
            "course_id": course_id,
            "status": course.status,
            "title": course.title,
            "topic": course.topic,
            "difficulty": course.difficulty,
            "source_type": course.source_type,
            "learning_goal": course.learning_goal,
            "weekly_time_commitment": course.weekly_time_commitment,
            "estimated_minutes": course.estimated_minutes or max(course.lesson_count * 18, 45),
            "quality_score": json.loads(course.quality_score_json or "{}") or _quality_score(course),
            "video_count": course.video_count,
            "lesson_count": course.lesson_count,
            "concept_count": course.concept_count,
            "curriculum": curriculum,
            "knowledge_graph": json.loads(course.knowledge_graph_json or "{}"),
            "learning_intelligence": json.loads(course.intelligence_json or "{}"),
        }


@app.get("/courses")
async def list_courses():
    with get_session() as session:
        from sqlmodel import select
        courses = session.exec(
            select(Course).order_by(Course.created_at.desc())
        ).all()
        return [
            {
                "course_id": c.course_id,
                "title": c.title,
                "topic": c.topic,
                "status": c.status,
                "video_count": c.video_count,
                "lesson_count": c.lesson_count,
                "difficulty": c.difficulty,
                "source_type": c.source_type,
                "estimated_minutes": c.estimated_minutes or max(c.lesson_count * 18, 45),
                "quality_score": json.loads(c.quality_score_json or "{}") or _quality_score(c),
                "parent_course_id": c.parent_course_id,
                "created_at": c.created_at.isoformat(),
            }
            for c in courses
        ]


@app.post("/courses/enroll")
async def enroll(req: EnrollRequest, user: User = Depends(_require_user)):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == req.course_id)).first()
        if not course:
            raise HTTPException(404, "Course not found")

        existing = session.exec(
            select(Enrollment).where(
                Enrollment.course_id == req.course_id,
                Enrollment.user_id == user.user_id,
            )
        ).first()
        if existing:
            return {"status": existing.status, "course_id": req.course_id}

        enrollment = Enrollment(user_id=user.user_id, course_id=req.course_id)
        session.add(enrollment)
        return {"status": "active", "course_id": req.course_id}


@app.get("/me/enrollments")
async def my_enrollments(user: User = Depends(_require_user)):
    with get_session() as session:
        from sqlmodel import select
        enrollments = session.exec(select(Enrollment).where(Enrollment.user_id == user.user_id)).all()
        return [
            {
                "course_id": item.course_id,
                "status": item.status,
                "created_at": item.created_at.isoformat(),
            }
            for item in enrollments
        ]


@app.post("/courses/{course_id}/materials")
async def upload_material(course_id: str, file: UploadFile = File(...), user: User = Depends(_require_user)):
    if not file.filename:
        raise HTTPException(422, "File name is required")
    allowed_types = {
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(415, "Allowed uploads: PDF, notes, slides, and documents")

    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course:
            raise HTTPException(404, "Course not found")
        if course.owner_user_id not in ("local", user.user_id):
            enrollment = session.exec(
                select(Enrollment).where(Enrollment.course_id == course_id, Enrollment.user_id == user.user_id)
            ).first()
            if not enrollment:
                raise HTTPException(403, "Enroll before uploading materials")

    material_id = str(uuid.uuid4())
    safe_name = os.path.basename(file.filename).replace(" ", "_")
    course_dir = os.path.join(UPLOAD_DIR, course_id)
    os.makedirs(course_dir, exist_ok=True)
    file_path = os.path.join(course_dir, f"{material_id}-{safe_name}")

    size = 0
    with open(file_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > 25 * 1024 * 1024:
                out_file.close()
                os.remove(file_path)
                raise HTTPException(413, "File upload limit is 25MB")
            out_file.write(chunk)

    with get_session() as session:
        material = CourseMaterial(
            material_id=material_id,
            course_id=course_id,
            user_id=user.user_id,
            filename=safe_name,
            content_type=file.content_type or "application/octet-stream",
            file_path=file_path,
            size_bytes=size,
        )
        session.add(material)
        return {
            "material_id": material_id,
            "course_id": course_id,
            "filename": safe_name,
            "size_bytes": size,
        }


@app.get("/courses/{course_id}/materials")
async def list_materials(course_id: str, user: User = Depends(_require_user)):
    with get_session() as session:
        from sqlmodel import select
        materials = session.exec(
            select(CourseMaterial).where(
                CourseMaterial.course_id == course_id,
                CourseMaterial.user_id == user.user_id,
            )
        ).all()
        return [
            {
                "material_id": item.material_id,
                "course_id": item.course_id,
                "filename": item.filename,
                "content_type": item.content_type,
                "size_bytes": item.size_bytes,
                "created_at": item.created_at.isoformat(),
            }
            for item in materials
        ]


@app.post("/payments/checkout")
async def checkout(req: CheckoutRequest, user: User = Depends(_require_user)):
    session_id = str(uuid.uuid4())
    checkout_url = req.success_url if PAYMENT_PROVIDER == "disabled" else ""
    with get_session() as session:
        session.add(PaymentSession(
            session_id=session_id,
            user_id=user.user_id,
            course_id=req.course_id,
            provider=PAYMENT_PROVIDER,
            checkout_url=checkout_url,
        ))
    if PAYMENT_PROVIDER == "disabled":
        return {
            "session_id": session_id,
            "provider": "disabled",
            "checkout_url": req.success_url,
            "message": "Set PAYMENT_PROVIDER and provider keys to enable paid checkout.",
        }
    raise HTTPException(501, f"{PAYMENT_PROVIDER} checkout is not configured yet")


@app.post("/course/{course_id}/progress")
async def update_progress(course_id: str, req: ProgressRequest):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course:
            raise HTTPException(404, "Course not found")

        progress = session.exec(
            select(UserProgress).where(
                UserProgress.course_id == course_id,
                UserProgress.lesson_key == req.lesson_key,
                UserProgress.user_id == "local",
            )
        ).first() or UserProgress(course_id=course_id, lesson_key=req.lesson_key)

        progress.completed = req.completed
        progress.time_spent_sec += req.time_spent_sec
        session.add(progress)

        if req.quiz_score is not None:
            session.add(QuizAttempt(
                course_id=course_id,
                lesson_key=req.lesson_key,
                score=req.quiz_score,
                weak_concepts_json=json.dumps(req.weak_concepts),
            ))

        intelligence = update_mastery(
            json.loads(course.intelligence_json or "{}"),
            quiz_score=req.quiz_score,
        )
        course.intelligence_json = json.dumps(intelligence)
        session.add(course)
        return {"status": "ok", "learning_intelligence": intelligence}


@app.post("/course/{course_id}/lessons/{lesson_id}/complete")
async def complete_lesson(course_id: str, lesson_id: str, req: CompleteLessonRequest, user: User = Depends(_require_user)):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course:
            raise HTTPException(404, "Course not found")
        enrollment = session.exec(
            select(Enrollment).where(Enrollment.course_id == course_id, Enrollment.user_id == user.user_id)
        ).first()
        if course.owner_user_id not in ("local", user.user_id) and not enrollment:
            raise HTTPException(403, "Enroll before tracking lesson progress")

        progress = session.exec(
            select(UserProgress).where(
                UserProgress.course_id == course_id,
                UserProgress.lesson_key == lesson_id,
                UserProgress.user_id == user.user_id,
            )
        ).first() or UserProgress(course_id=course_id, lesson_key=lesson_id, user_id=user.user_id)

        progress.completed = req.completed
        progress.time_spent_sec += req.time_spent_sec
        progress.mastery_delta_json = json.dumps({"notes": req.notes[:500], "completed_at": datetime.utcnow().isoformat()})
        progress.updated_at = datetime.utcnow()
        session.add(progress)
        return {"status": "ok", "lesson_id": lesson_id, "completed": progress.completed}


@app.post("/course/{course_id}/tutor")
async def ask_tutor(course_id: str, req: TutorRequest):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course or not course.curriculum_json:
            raise HTTPException(404, "Course not found")
        curriculum = json.loads(course.curriculum_json)
        lesson = _find_lesson(curriculum, req.lesson_key)
        reply = tutor_reply(
            {"title": course.title, "topic": course.topic},
            req.message,
            lesson,
            json.loads(course.intelligence_json or "{}"),
        )
        return {"reply": reply}


@app.post("/course/{course_id}/fork")
async def fork_course(course_id: str, req: ForkRequest):
    new_id = str(uuid.uuid4())
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course:
            raise HTTPException(404, "Course not found")
        fork = Course(
            course_id=new_id,
            parent_course_id=course_id,
            input_value=course.input_value,
            status=course.status,
            title=f"{course.title} ({req.title_suffix})",
            topic=course.topic,
            video_count=course.video_count,
            lesson_count=course.lesson_count,
            concept_count=course.concept_count,
            curriculum_json=course.curriculum_json,
            knowledge_graph_json=course.knowledge_graph_json,
            intelligence_json=course.intelligence_json,
            completed_at=datetime.utcnow(),
        )
        session.add(fork)
    return {"course_id": new_id, "status": "forked"}


@app.get("/course/{course_id}/search")
async def search_course(course_id: str, q: str):
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(select(Course).where(Course.course_id == course_id)).first()
        if not course or not course.curriculum_json:
            raise HTTPException(404, "Course not found")
        curriculum = json.loads(course.curriculum_json)
    needle = q.lower()
    results = []
    for module in curriculum.get("modules", []):
        for lesson in module.get("lessons", []):
            haystack = " ".join([
                lesson.get("title", ""),
                lesson.get("summary", ""),
                " ".join(lesson.get("concepts", []) or []),
                lesson.get("content", ""),
            ]).lower()
            if needle in haystack:
                results.append({
                    "lesson_key": lesson.get("lesson_key"),
                    "title": lesson.get("title"),
                    "type": lesson.get("type"),
                    "concepts": lesson.get("concepts", [])[:5],
                })
    return {"query": q, "results": results[:20]}


@app.get("/export/{course_id}")
async def export_course(course_id: str):
    """Export course as a single Markdown file."""
    with get_session() as session:
        from sqlmodel import select
        course = session.exec(
            select(Course).where(Course.course_id == course_id)
        ).first()
        if not course or not course.curriculum_json:
            raise HTTPException(404, "Course not found or not ready")
        curriculum = json.loads(course.curriculum_json)

    md = f"# {curriculum.get('course_title', course.title)}\n\n"
    md += f"*Course outline and notes*\n\n---\n\n"

    for mi, module in enumerate(curriculum.get("modules", []), 1):
        md += f"## Module {mi}: {module['title']}\n\n"
        md += f"*{module.get('description', '')}*\n\n"

        for li, lesson in enumerate(module.get("lessons", []), 1):
            md += f"### {mi}.{li} {lesson['title']}\n\n"

            if lesson["type"] == "video":
                md += f"**Source:** [{lesson.get('video_title', '')}]({lesson.get('video_url', '')}) — {lesson.get('channel', '')}\n\n"
                if lesson.get("focus_start_sec"):
                    start = lesson["focus_start_sec"]
                    end = lesson.get("focus_end_sec", 0)
                    md += f"**Watch:** {start//60}:{start%60:02d} – {end//60}:{end%60:02d}\n\n"
                md += f"{lesson.get('summary', '')}\n\n"
                if lesson.get("concepts"):
                    md += "**Concepts:** " + ", ".join(lesson["concepts"]) + "\n\n"

            elif lesson["type"] == "written":
                md += lesson.get("content", "*No content generated*") + "\n\n"

            elif lesson["type"] == "quiz":
                md += "**Quiz**\n\n"
                for qi, q in enumerate(lesson.get("questions", []), 1):
                    md += f"{qi}. {q['question']}\n"
                    for oi, opt in enumerate(q.get("options", [])):
                        marker = "✓" if oi == q.get("correct_index") else " "
                        md += f"   {marker} {chr(65+oi)}. {opt}\n"
                    md += f"\n   *{q.get('explanation', '')}*\n\n"

        md += "---\n\n"

    filename = f"{course.title or 'course'}.md".replace(" ", "_")
    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Pipeline ───────────────────────────────────────────────────────────────────

async def _run_pipeline(course_id: str, input_value: str, max_videos: int):
    loop = asyncio.get_event_loop()

    def emit(stage: str, message: str, **extra):
        push(course_id, {"stage": stage, "message": message, **extra})

    def checkpoint(name: str, payload: dict):
        with get_session() as session:
            from sqlmodel import select
            course_row = session.exec(select(Course).where(Course.course_id == course_id)).first()
            if course_row:
                existing = json.loads(course_row.checkpoints_json or "{}")
                existing[name] = {"at": datetime.utcnow().isoformat(), "payload": payload}
                course_row.checkpoints_json = json.dumps(existing)
                session.add(course_row)

    try:
        # ── Step 1: Resolve seed video ─────────────────────────────────────
        emit("fetch", "Finding seed video...")

        if is_youtube_url(input_value):
            seed_url = input_value
        else:
            emit("fetch", f"Searching YouTube for: {input_value}")
            results = await loop.run_in_executor(
                None, lambda: search_youtube(f"{input_value} tutorial explained", 3)
            )
            if not results:
                raise ValueError(f"No YouTube videos found for: {input_value}")
            seed_url = results[0]["url"]
            emit("fetch", f"Found seed: {results[0]['title']}")

        # ── Step 2: Extract transcript ─────────────────────────────────────
        emit("transcript", "Extracting transcript from seed video...")
        seed_data = await loop.run_in_executor(None, lambda: _cached_transcript(seed_url))
        emit("transcript", f"Got transcript: {seed_data['title']}", video_title=seed_data["title"])
        checkpoint("seed_transcript", {"url": seed_url, "title": seed_data.get("title", "")})

        all_videos = [seed_data]
        existing_urls = {seed_url}

        # ── Step 3: Map concepts from seed ─────────────────────────────────
        emit("concepts", "Mapping concepts from seed video...")
        seed_concepts = await loop.run_in_executor(None, lambda: _cached_concepts(seed_data))

        topic = seed_concepts.get("topic", seed_data["title"])
        all_concept_objects = seed_concepts.get("concepts", [])
        missing = seed_concepts.get("missing_concepts", [])

        emit("concepts", f"Found {len(all_concept_objects)} concepts, {len(missing)} gaps",
             concept_count=len(all_concept_objects),
             missing=missing[:8],
             confidence="initial")
        checkpoint("seed_concepts", {"topic": topic, "concepts": all_concept_objects, "missing": missing})

        # ── Step 4: Agent gap-filling loop ─────────────────────────────────
        emit("gaps", f"Agent searching for {len(missing)} missing concepts...")

        def gap_cb(event_type: str, message: str):
            asyncio.run_coroutine_threadsafe(
                asyncio.coroutine(lambda: push(course_id, {"stage": "gaps", "event": event_type, "message": message}))(),
                loop,
            )

        covered = [c["concept"] for c in all_concept_objects]
        new_refs = await loop.run_in_executor(
            None,
            lambda: find_and_fill_gaps(
                covered, missing, existing_urls, topic,
                max_videos=max_videos - 1,
                progress_cb=lambda et, msg: push(course_id, {"stage": "gaps", "event": et, "message": msg}),
            ),
        )

        # ── Step 5: Fetch transcripts for new videos ────────────────────────
        for ref in new_refs:
            emit("transcript", f"Extracting: {ref['url']}")
            try:
                vdata = await loop.run_in_executor(None, lambda url=ref["url"]: _cached_transcript(url))
                all_videos.append(vdata)
                vconcepts = await loop.run_in_executor(None, lambda data=vdata: _cached_concepts(data))
                all_concept_objects.extend(vconcepts.get("concepts", []))
                emit(
                    "transcript",
                    f"Got: {vdata['title']}",
                    video_title=vdata["title"],
                    fills_gap=ref.get("fills_gap", ""),
                )
                await asyncio.sleep(0.3)
            except Exception as e:
                emit("transcript", f"Failed to fetch {ref['url']}: {e}")
        checkpoint("expanded_sources", {"video_count": len(all_videos), "concept_count": len(all_concept_objects)})

        # ── Step 6: Build curriculum ────────────────────────────────────────
        emit("curriculum", f"Building curriculum from {len(all_videos)} videos...")
        curriculum = await loop.run_in_executor(
            None,
            lambda: build_curriculum(all_videos, all_concept_objects, topic),
        )
        emit("graph", "Building persistent knowledge graph...")
        knowledge_graph = build_knowledge_graph(course_id, curriculum, all_concept_objects, all_videos)
        curriculum = enrich_curriculum(curriculum, knowledge_graph)

        # ── Step 7: Write missing lessons + quizzes ─────────────────────────
        all_prior_concepts: list[str] = []
        total_lessons = 0

        for module in curriculum.get("modules", []):
            module_concepts: list[str] = []

            for lesson in module.get("lessons", []):
                lesson_concepts = lesson.get("concepts", [])

                if lesson["type"] == "written":
                    emit("writing", f"Writing lesson: {lesson['title']}")
                    content = await loop.run_in_executor(
                        None,
                        lambda l=lesson: write_lesson(
                            l.get("topic", l["title"]),
                            all_prior_concepts[:10],
                            curriculum["course_title"],
                        ),
                    )
                    lesson["content"] = content
                    await asyncio.sleep(0.3)

                elif lesson["type"] == "quiz":
                    quiz_concepts = module_concepts or lesson_concepts
                    emit("quiz", f"Generating quiz: {module['title']}")
                    questions = await loop.run_in_executor(
                        None,
                        lambda mc=quiz_concepts, mt=module["title"]: generate_quiz(mt, mc, 4),
                    )
                    lesson["questions"] = questions
                    await asyncio.sleep(0.3)

                module_concepts.extend(lesson_concepts)
                all_prior_concepts.extend(lesson_concepts)
                total_lessons += 1

        # ── Step 8: Persist ────────────────────────────────────────────────
        with get_session() as session:
            from sqlmodel import select
            course_row = session.exec(
                select(Course).where(Course.course_id == course_id)
            ).first()
            if course_row:
                course_row.title = curriculum.get("course_title", topic)
                course_row.topic = topic
                course_row.status = "done"
                course_row.video_count = len(all_videos)
                course_row.lesson_count = total_lessons
                course_row.concept_count = len(all_concept_objects)
                course_row.estimated_minutes = max(total_lessons * 18, len(all_videos) * 35)
                course_row.quality_score_json = json.dumps(_quality_score(course_row))
                course_row.curriculum_json = json.dumps(curriculum)
                course_row.knowledge_graph_json = json.dumps(knowledge_graph)
                course_row.intelligence_json = json.dumps(curriculum.get("learning_intelligence", {}))
                course_row.completed_at = datetime.utcnow()
                session.add(course_row)
                _persist_course_entities(session, course_id, curriculum, knowledge_graph)

        emit("done", "Course ready!", course_id=course_id,
             title=curriculum.get("course_title", topic),
             video_count=len(all_videos),
             lesson_count=total_lessons)
        job_store[course_id] = {**job_store.get(course_id, {}), "status": "done", "completed_at": datetime.utcnow().isoformat()}

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        push(course_id, {"stage": "error", "message": str(e), "traceback": tb})

        with get_session() as session:
            from sqlmodel import select
            course_row = session.exec(
                select(Course).where(Course.course_id == course_id)
            ).first()
            if course_row:
                course_row.status = "failed"
                course_row.error = str(e)
                session.add(course_row)
        job_store[course_id] = {**job_store.get(course_id, {}), "status": "failed", "error": str(e)}


async def _run_pipeline_with_retry(course_id: str, input_value: str, max_videos: int):
    job_store[course_id] = {**job_store.get(course_id, {}), "status": "running", "attempts": 1}
    await _run_pipeline(course_id, input_value, max_videos)


def _cached_transcript(url: str) -> dict:
    if url not in transcript_cache:
        transcript_cache[url] = get_transcript(url)
    return transcript_cache[url]


def _cached_concepts(video_data: dict) -> dict:
    key = video_data.get("video_id") or video_data.get("url") or video_data.get("title", "")
    if key not in concept_cache:
        concept_cache[key] = map_concepts(video_data)
    return concept_cache[key]


def _rate_limit(user_id: str, limit: int = 6, window_sec: int = 3600) -> bool:
    now = datetime.utcnow().timestamp()
    recent = [t for t in rate_limit_store.get(user_id, []) if now - t < window_sec]
    if len(recent) >= limit:
        rate_limit_store[user_id] = recent
        return False
    recent.append(now)
    rate_limit_store[user_id] = recent
    return True


def _quality_score(course: Course) -> dict:
    coverage = min(98, 58 + course.concept_count * 2)
    depth = min(96, 52 + course.lesson_count * 3)
    transcript = 88 if course.source_type == "youtube" else 92
    assessment = 82 if course.lesson_count else 60
    overall = round((coverage + depth + transcript + assessment) / 4)
    return {
        "overall": overall,
        "transcript_quality": transcript,
        "concept_coverage": coverage,
        "lesson_depth": depth,
        "assessment_readiness": assessment,
    }


def _find_lesson(curriculum: dict, lesson_key: Optional[str]) -> Optional[dict]:
    if not lesson_key:
        return None
    for module in curriculum.get("modules", []):
        for lesson in module.get("lessons", []):
            if lesson.get("lesson_key") == lesson_key:
                return lesson
    return None


def _persist_course_entities(session, course_id: str, curriculum: dict, graph: dict):
    for module_index, module in enumerate(curriculum.get("modules", [])):
        for lesson_index, lesson in enumerate(module.get("lessons", [])):
            session.add(Lesson(
                lesson_id=f"{course_id}:{module_index}-{lesson_index}",
                course_id=course_id,
                module_index=module_index,
                lesson_index=lesson_index,
                lesson_type=lesson.get("type", "written"),
                title=lesson.get("title", ""),
                concepts_json=json.dumps(lesson.get("concepts", [])),
                payload_json=json.dumps(lesson),
            ))

    for node in graph.get("nodes", []):
        if node.get("type") == "concept":
            session.add(Concept(
                concept_id=f"{course_id}:{node['id']}",
                course_id=course_id,
                name=node.get("label", ""),
                difficulty=node.get("difficulty", "beginner"),
                confidence=float(node.get("confidence", 0.0)),
                mastery_default=int(node.get("mastery", 35)),
                source_count=int(node.get("source_count", 0)),
                sources_json=json.dumps([]),
            ))

    for edge in graph.get("edges", []):
        session.add(ConceptRelation(
            course_id=course_id,
            source_concept_id=edge.get("from", ""),
            target_id=edge.get("to", ""),
            relation_type=edge.get("type", "reinforces"),
            strength=float(edge.get("strength", 0.5)),
            evidence=edge.get("evidence", ""),
        ))
