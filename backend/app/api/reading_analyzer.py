from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ReadingAnalysis, User
from app.services.reading_analyzer import analyze_reading_passage, public_shared_analysis

router = APIRouter(prefix="/api", tags=["reading-analyzer"])


class PassageInput(BaseModel):
    text: str = Field(min_length=20, max_length=9000)
    language: str = Field(default="uz", pattern="^(uz|ru|en|UZ|RU|EN)$")


@router.post("/analyze-passage")
async def analyze_passage(
    payload: PassageInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        result = analyze_reading_passage(db, current_user, payload.text, payload.language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if result.get("limit_reached"):
        raise HTTPException(status_code=403, detail=result["message"])
    return result


@router.get("/reading-analyzer/history")
def reading_analyzer_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    rows = (
        db.execute(
            select(ReadingAnalysis)
            .where(ReadingAnalysis.user_id == current_user.id)
            .order_by(ReadingAnalysis.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": str(row.id),
            "share_id": row.share_id,
            "language": row.language,
            "created_at": row.created_at.isoformat(),
            "source_preview": row.source_text[:180],
            "is_pro": row.is_pro_snapshot,
        }
        for row in rows
    ]


@router.get("/shared/{share_id}")
def get_shared_analysis(share_id: str, db: Session = Depends(get_db)) -> dict:
    result = public_shared_analysis(db, share_id)
    if not result:
        raise HTTPException(status_code=404, detail="Shared analysis not found")
    return result
