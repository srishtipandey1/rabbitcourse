from contextlib import contextmanager
import os
from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rabbitcourse.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def init_db():
    SQLModel.metadata.create_all(engine)
    _run_lightweight_migrations()


@contextmanager
def get_session():
    with Session(engine) as session:
        yield session
        session.commit()


def _run_lightweight_migrations():
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        user_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(user)")).fetchall()}
        if "email" not in user_columns:
            conn.execute(text("ALTER TABLE user ADD COLUMN email TEXT DEFAULT ''"))
        if "password_hash" not in user_columns:
            conn.execute(text("ALTER TABLE user ADD COLUMN password_hash TEXT DEFAULT ''"))

        course_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(course)")).fetchall()}
        additions = {
            "owner_user_id": "TEXT DEFAULT 'local'",
            "source_type": "TEXT DEFAULT 'topic'",
            "difficulty": "TEXT DEFAULT 'beginner'",
            "learning_goal": "TEXT DEFAULT ''",
            "weekly_time_commitment": "TEXT DEFAULT ''",
            "preferred_format": "TEXT DEFAULT 'mixed'",
            "estimated_minutes": "INTEGER DEFAULT 0",
            "quality_score_json": "TEXT DEFAULT '{}'",
        }
        for column, ddl in additions.items():
            if column not in course_columns:
                conn.execute(text(f"ALTER TABLE course ADD COLUMN {column} {ddl}"))
