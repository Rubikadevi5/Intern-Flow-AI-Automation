from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    mentor: Mapped[str] = mapped_column(String(120), default="Unassigned")
    status: Mapped[str] = mapped_column(String(30), default="Active")
    milestones: Mapped[str] = mapped_column(Text, default="")
    deliverables: Mapped[str] = mapped_column(Text, default="")
    candidates: Mapped[list["Candidate"]] = relationship(back_populates="project")


class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    mentor: Mapped[str] = mapped_column(String(120), default="Unassigned")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    review_frequency: Mapped[str] = mapped_column(String(30), default="Monthly")
    status: Mapped[str] = mapped_column(String(30), default="Active")
    archived: Mapped[int] = mapped_column(default=0)
    is_demo: Mapped[int] = mapped_column(default=0)
    project: Mapped[Project | None] = relationship(back_populates="candidates")
    reviews: Mapped[list["Review"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("candidate_id", "start_at", name="uq_candidate_review"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"))
    reviewer: Mapped[str] = mapped_column(String(120), default="Unassigned")
    start_at: Mapped[datetime] = mapped_column(DateTime)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    meeting_link: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(30), default="Scheduled")
    feedback_status: Mapped[str] = mapped_column(String(30), default="Not started")
    tasks_completed: Mapped[str] = mapped_column(Text, default="")
    progress: Mapped[str] = mapped_column(Text, default="")
    technical_skills: Mapped[str] = mapped_column(Text, default="")
    strengths: Mapped[str] = mapped_column(Text, default="")
    challenges: Mapped[str] = mapped_column(Text, default="")
    improvements: Mapped[str] = mapped_column(Text, default="")
    mentor_comments: Mapped[str] = mapped_column(Text, default="")
    next_steps: Mapped[str] = mapped_column(Text, default="")
    candidate: Mapped[Candidate] = relationship(back_populates="reviews")


class AIFeedback(Base):
    __tablename__ = "ai_feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id"), unique=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    milestones: Mapped[str] = mapped_column(Text, default="")
    strengths: Mapped[str] = mapped_column(Text, default="")
    improvements: Mapped[str] = mapped_column(Text, default="")
    challenges: Mapped[str] = mapped_column(Text, default="")
    actions: Mapped[str] = mapped_column(Text, default="")
    goals: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="Draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmailLog(Base):
    __tablename__ = "email_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipient: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    template: Mapped[str] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(30), default="Queued")
    demo_mode: Mapped[int] = mapped_column(default=1)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
