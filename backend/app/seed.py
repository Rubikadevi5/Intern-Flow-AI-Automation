from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Candidate, Project, Review

SEED_CANDIDATES = [
    ("INT001", "Rubikadevi", "rubikadevi50@gmail.com", "Automation System", None),
    ("INT002", "Logesh", "logeshvm2585m@gmail.com", "Automation System", None),
    ("INT003", "Rahul Verma", "rahul.verma@example.com", "Data Analytics", "2026-10-30T12:00:00"),
    ("INT004", "Sneha Reddy", "sneha.reddy@example.com", "Machine Learning", "2026-10-31T10:00:00"),
    ("INT005", "Arjun Kumar", "arjun.kumar2@example.com", "Cybersecurity", "2026-10-31T11:00:00"),
    ("INT006", "Divya Patel", "divya.patel@example.com", "Cloud Computing", "2026-10-31T12:00:00"),
    ("INT007", "Karthik Raj", "karthik.raj@example.com", "Python Automation", "2026-11-01T10:00:00"),
    ("INT008", "Ananya Singh", "ananya.singh@example.com", "Generative AI", "2026-11-01T11:00:00"),
]


def seed_data(db: Session) -> None:
    projects: dict[str, Project] = {}
    for _, _, _, project_name, _ in SEED_CANDIDATES:
        project = db.scalar(select(Project).where(Project.name == project_name))
        if not project:
            project = Project(name=project_name, description=f"{project_name} internship workstream")
            db.add(project)
            db.flush()
        projects[project_name] = project

    for candidate_id, name, email, project_name, review_at in SEED_CANDIDATES:
        candidate = db.scalar(select(Candidate).where(Candidate.candidate_id == candidate_id))
        if not candidate:
            candidate = Candidate(candidate_id=candidate_id, name=name, email=email, project_id=projects[project_name].id, is_demo=int(email.endswith("@example.com")))
            db.add(candidate)
            db.flush()
        if review_at and not db.scalar(select(Review).where(Review.candidate_id == candidate.id)):
            start = datetime.fromisoformat(review_at)
            db.add(Review(candidate_id=candidate.id, start_at=start, end_at=start.replace(hour=start.hour + 1)))
    db.commit()
