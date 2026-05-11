from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: str = Field(unique=True, index=True)
    title: str = ""
    topic: str = ""
    input_value: str = ""
    status: str = "pending"  # pending | processing | done | failed
    error: Optional[str] = None
    video_count: int = 0
    lesson_count: int = 0
    concept_count: int = 0
    curriculum_json: Optional[str] = None   # full JSON blob
    knowledge_graph_json: Optional[str] = None
    intelligence_json: Optional[str] = None
    checkpoints_json: Optional[str] = None
    parent_course_id: Optional[str] = Field(default=None, index=True)
    owner_user_id: str = Field(default="local", index=True)
    source_type: str = "topic"
    difficulty: str = "beginner"
    learning_goal: str = ""
    weekly_time_commitment: str = ""
    preferred_format: str = "mixed"
    estimated_minutes: int = 0
    quality_score_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(unique=True, index=True)
    email: str = Field(default="", unique=True, index=True)
    password_hash: str = ""
    display_name: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Enrollment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    course_id: str = Field(index=True)
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CourseMaterial(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    material_id: str = Field(unique=True, index=True)
    course_id: str = Field(index=True)
    user_id: str = Field(index=True)
    filename: str
    content_type: str = "application/octet-stream"
    file_path: str
    size_bytes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Lesson(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lesson_id: str = Field(unique=True, index=True)
    course_id: str = Field(index=True)
    module_index: int = 0
    lesson_index: int = 0
    lesson_type: str = "written"
    title: str = ""
    concepts_json: str = "[]"
    payload_json: str = "{}"


class Concept(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    concept_id: str = Field(unique=True, index=True)
    course_id: str = Field(index=True)
    name: str = Field(index=True)
    difficulty: str = "beginner"
    confidence: float = 0.0
    mastery_default: int = 35
    source_count: int = 0
    sources_json: str = "[]"


class ConceptRelation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: str = Field(index=True)
    source_concept_id: str = Field(index=True)
    target_id: str = Field(index=True)
    relation_type: str = Field(index=True)  # explains | depends_on | contradicts | reinforces
    strength: float = 0.5
    evidence: str = ""


class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: str = Field(index=True)
    user_id: str = Field(default="local", index=True)
    lesson_key: str = Field(index=True)
    score: int = 0
    weak_concepts_json: str = "[]"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: str = Field(index=True)
    user_id: str = Field(default="local", index=True)
    lesson_key: str = Field(index=True)
    completed: bool = False
    time_spent_sec: int = 0
    mastery_delta_json: str = "{}"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GenerationRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: str = Field(unique=True, index=True)
    course_id: str = Field(index=True)
    user_id: str = Field(default="local", index=True)
    status: str = "queued"
    current_stage: str = "analyzing input"
    progress_percent: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class PaymentSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True)
    user_id: str = Field(index=True)
    course_id: str = Field(index=True)
    provider: str = "disabled"
    status: str = "created"
    checkout_url: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
