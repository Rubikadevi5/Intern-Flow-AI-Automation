from datetime import datetime

import csv
import io

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import get_db, init_db
from .models import AIFeedback, Candidate, EmailLog, Project, Review
from .schemas import CandidateCreate, CandidateOut, EmailPreviewCreate, ProjectCreate, ProjectOut, ReviewCreate, ReviewSubmission
from .seed import seed_data

app = FastAPI(title="InternFlow AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def startup() -> None:
    init_db()
    db = next(get_db())
    try:
        seed_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo"}


def candidate_response(candidate: Candidate) -> dict:
    result = CandidateOut.model_validate(candidate).model_dump()
    result["project_name"] = candidate.project.name if candidate.project else None
    return result


@app.get("/api/candidates")
def list_candidates(db: Session = Depends(get_db), search: str = "", status: str = "", page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> dict:
    query = select(Candidate).where(Candidate.archived == 0)
    if search:
        query = query.where((Candidate.name.ilike(f"%{search}%")) | (Candidate.candidate_id.ilike(f"%{search}%")) | (Candidate.email.ilike(f"%{search}%")))
    if status:
        query = query.where(Candidate.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    candidates = db.scalars(query.order_by(Candidate.candidate_id).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [candidate_response(item) for item in candidates], "total": total, "page": page, "page_size": page_size}


@app.post("/api/candidates", response_model=CandidateOut)
def create_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
    candidate_id = payload.candidate_id or f"INT{(db.scalar(select(func.count(Candidate.id))) or 0) + 1:03d}"
    if db.scalar(select(Candidate).where((Candidate.candidate_id == candidate_id) | (Candidate.email == payload.email))):
        raise HTTPException(409, "Candidate ID or email already exists")
    candidate = Candidate(**payload.model_dump(exclude={"candidate_id"}), candidate_id=candidate_id, is_demo=int(str(payload.email).endswith("@example.com")))
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate_response(candidate)


@app.patch("/api/candidates/{candidate_id}", response_model=CandidateOut)
def update_candidate(candidate_id: str, payload: CandidateCreate, db: Session = Depends(get_db)):
    candidate = db.scalar(select(Candidate).where(Candidate.candidate_id == candidate_id))
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    for key, value in payload.model_dump(exclude={"candidate_id"}, exclude_unset=True).items():
        setattr(candidate, key, value)
    db.commit()
    db.refresh(candidate)
    return candidate_response(candidate)


@app.delete("/api/candidates/{candidate_id}")
def archive_candidate(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.scalar(select(Candidate).where(Candidate.candidate_id == candidate_id))
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    candidate.archived = 1
    db.commit()
    return {"status": "archived"}


@app.get("/api/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return [{**ProjectOut.model_validate(project).model_dump(), "candidate_count": len(project.candidates)} for project in db.scalars(select(Project).order_by(Project.name)).all()]


@app.post("/api/projects", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Project).where(Project.name == payload.name)):
        raise HTTPException(409, "Project already exists")
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return {**ProjectOut.model_validate(project).model_dump(), "candidate_count": 0}


@app.get("/api/reviews")
def list_reviews(db: Session = Depends(get_db)):
    reviews = db.scalars(select(Review).order_by(Review.start_at)).all()
    return [{"id": r.id, "candidate_id": r.candidate.candidate_id, "candidate_name": r.candidate.name, "email": r.candidate.email, "project": r.candidate.project.name if r.candidate.project else "Unassigned", "reviewer": r.reviewer, "start_at": r.start_at, "end_at": r.end_at, "meeting_link": r.meeting_link, "status": r.status, "feedback_status": r.feedback_status} for r in reviews]


@app.post("/api/reviews")
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    if payload.end_at <= payload.start_at:
        raise HTTPException(400, "End time must be after start time")
    if not db.get(Candidate, payload.candidate_id):
        raise HTTPException(404, "Candidate not found")
    overlap = db.scalar(select(Review).where(Review.reviewer == payload.reviewer, Review.start_at < payload.end_at, Review.end_at > payload.start_at, Review.status != "Cancelled"))
    if overlap:
        raise HTTPException(409, "Reviewer already has an overlapping appointment")
    review = Review(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"id": review.id, "status": review.status}


@app.patch("/api/reviews/{review_id}/submission")
def submit_review(review_id: int, payload: ReviewSubmission, db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    for key, value in payload.model_dump().items():
        setattr(review, key, value)
    review.feedback_status = "Awaiting approval"
    review.status = "Completed"
    db.commit()
    return {"status": "saved"}


@app.patch("/api/reviews/{review_id}")
def update_review_status(review_id: int, status: str, db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    if status not in {"Scheduled", "Completed", "Cancelled", "Rescheduled"}:
        raise HTTPException(400, "Unsupported review status")
    review.status = status
    db.commit()
    return {"id": review.id, "status": review.status}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    candidates = db.scalars(select(Candidate).where(Candidate.archived == 0)).all()
    reviews = db.scalars(select(Review)).all()
    return {"total_candidates": len(candidates), "active_internships": sum(c.status == "Active" for c in candidates), "completed_internships": sum(c.status == "Completed" for c in candidates), "upcoming_reviews": sum(r.start_at >= now and r.status == "Scheduled" for r in reviews), "completed_reviews": sum(r.status == "Completed" for r in reviews), "overdue_reviews": sum(r.start_at < now and r.status == "Scheduled" for r in reviews), "feedback_awaiting_approval": sum(r.feedback_status == "Awaiting approval" for r in reviews), "emails_sent": db.scalar(select(func.count(EmailLog.id)).where(EmailLog.status == "Sent")) or 0, "project_distribution": [{"name": p.name, "value": len(p.candidates)} for p in db.scalars(select(Project)).all()], "upcoming": [{"id": r.id, "candidate_id": r.candidate.candidate_id, "candidate_name": r.candidate.name, "project": r.candidate.project.name if r.candidate.project else "Unassigned", "start_at": r.start_at, "reviewer": r.reviewer} for r in reviews if r.start_at >= now and r.status == "Scheduled"][:5]}


@app.post("/api/ai-feedback/{review_id}")
def generate_feedback(review_id: int, db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    feedback = db.scalar(select(AIFeedback).where(AIFeedback.review_id == review_id))
    if not feedback:
        feedback = AIFeedback(review_id=review_id)
        db.add(feedback)
    feedback.summary = review.progress or "No progress evidence was provided."
    feedback.milestones = review.tasks_completed or "No milestone evidence was provided."
    feedback.strengths = review.strengths or "Not provided"
    feedback.improvements = review.improvements or "Not provided"
    feedback.challenges = review.challenges or "Not provided"
    feedback.actions = review.next_steps or "Not provided"
    feedback.goals = review.next_steps or "Define goals at the next review."
    feedback.status = "Draft"
    db.commit()
    return {"id": feedback.id, "mode": "demo", "status": feedback.status, "summary": feedback.summary, "strengths": feedback.strengths, "improvements": feedback.improvements}


@app.patch("/api/ai-feedback/{feedback_id}/decision")
def decide_feedback(feedback_id: int, status: str, db: Session = Depends(get_db)):
    feedback = db.get(AIFeedback, feedback_id)
    if not feedback:
        raise HTTPException(404, "Feedback not found")
    if status not in {"Approved", "Rejected", "Draft"}:
        raise HTTPException(400, "Unsupported feedback status")
    feedback.status = status
    db.commit()
    return {"id": feedback.id, "status": feedback.status}


@app.get("/api/email-history")
def email_history(db: Session = Depends(get_db)):
    return [{"id": e.id, "recipient": e.recipient, "subject": e.subject, "template": e.template, "status": e.status, "demo_mode": bool(e.demo_mode), "sent_at": e.sent_at} for e in db.scalars(select(EmailLog).order_by(EmailLog.id.desc())).all()]


@app.post("/api/notifications/preview")
def preview_email(payload: EmailPreviewCreate, db: Session = Depends(get_db)):
    log = EmailLog(recipient=str(payload.recipient), subject=payload.subject, template=payload.template, status="Queued", demo_mode=1)
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"id": log.id, "recipient": str(payload.recipient), "subject": payload.subject, "template": payload.template, "mode": "demo", "message": "Preview queued. No email was sent."}


@app.get("/api/integrations/status")
def integration_status():
    return {"mode": "demo", "openai": False, "gmail": False, "calendar": False, "authorization_required": True}


@app.get("/api/reports/candidates/{candidate_id}")
def candidate_report(candidate_id: str, db: Session = Depends(get_db)):
    candidate = db.scalar(select(Candidate).where(Candidate.candidate_id == candidate_id))
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    return {"candidate_id": candidate.candidate_id, "name": candidate.name, "email": candidate.email, "project": candidate.project.name if candidate.project else "Unassigned", "status": candidate.status, "reviews": [{"date": review.start_at, "status": review.status, "feedback_status": review.feedback_status, "progress": review.progress, "mentor_comments": review.mentor_comments} for review in candidate.reviews], "final_assessment": "Missing: no final mentor assessment has been recorded."}


@app.get("/api/reports/candidates.csv")
def candidate_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Candidate ID", "Name", "Email", "Project", "Status", "Demo data"])
    for candidate in db.scalars(select(Candidate).where(Candidate.archived == 0).order_by(Candidate.candidate_id)):
        writer.writerow([candidate.candidate_id, candidate.name, candidate.email, candidate.project.name if candidate.project else "", candidate.status, "Yes" if candidate.is_demo else "No"])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=internflow-candidates.csv"})
