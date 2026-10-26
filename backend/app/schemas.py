from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CandidateBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    project_id: int | None = None
    mentor: str = "Unassigned"
    start_date: date | None = None
    end_date: date | None = None
    review_frequency: str = "Monthly"
    status: str = "Active"


class CandidateCreate(CandidateBase):
    candidate_id: str | None = None


class CandidateOut(CandidateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: str
    archived: bool
    is_demo: bool
    project_name: str | None = None


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    mentor: str = "Unassigned"
    status: str = "Active"
    milestones: str = ""
    deliverables: str = ""


class ProjectOut(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_count: int = 0


class ReviewCreate(BaseModel):
    candidate_id: int
    reviewer: str = "Unassigned"
    start_at: datetime
    end_at: datetime
    meeting_link: str = ""


class ReviewSubmission(BaseModel):
    tasks_completed: str = ""
    progress: str = ""
    technical_skills: str = ""
    strengths: str = ""
    challenges: str = ""
    improvements: str = ""
    mentor_comments: str = ""
    next_steps: str = ""


class EmailPreviewCreate(BaseModel):
    recipient: EmailStr
    template: str = "custom"
    subject: str = Field(min_length=1)
