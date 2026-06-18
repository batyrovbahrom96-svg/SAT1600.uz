from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from datetime import datetime, time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ReadingAnalysis, User
from app.services.reading_analyzer import analyze_reading_image, analyze_reading_passage, public_shared_analysis, user_has_active_pro

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
        raise HTTPException(status_code=403, detail={"error": result["message"]})
    return result


@router.post("/reading-analyzer/analyze")
async def analyze_text_alias(
    payload: PassageInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await analyze_passage(payload, db, current_user)


@router.post("/reading-analyzer/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    language: str = Form("uz"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    contents = await file.read()
    try:
        result = analyze_reading_image(db, current_user, contents, file.content_type or "", language)
    except ValueError as exc:
        error_key = str(exc)
        raise HTTPException(status_code=400, detail={"error": error_key}) from exc
    if result.get("limit_reached"):
        raise HTTPException(status_code=403, detail={"error": result["message"]})
    return result


@router.get("/reading-analyzer/history")
def reading_analyzer_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    is_pro = user_has_active_pro(db, current_user)
    rows = (
        db.execute(
            select(ReadingAnalysis)
            .where(ReadingAnalysis.user_id == current_user.id)
            .order_by(ReadingAnalysis.created_at.desc())
            .limit(20 if is_pro else 3)
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
            "passage_type": (row.analysis or {}).get("passage_type", "SAT Passage"),
            "difficulty": (row.analysis or {}).get("difficulty", "Medium"),
            "input_type": row.input_type,
        }
        for row in rows
    ]


@router.get("/reading-analyzer/stats")
def reading_analyzer_stats(db: Session = Depends(get_db)) -> dict:
    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    today_count = (
        db.execute(select(func.count(ReadingAnalysis.id)).where(ReadingAnalysis.created_at >= today_start)).scalar()
        or 0
    )
    total_count = db.execute(select(func.count(ReadingAnalysis.id))).scalar() or 0
    return {
        "today": max(127, int(today_count)),
        "total": max(500, int(total_count)),
        "rating": 4.9,
    }


@router.get("/shared/{share_id}")
def get_shared_analysis(share_id: str, db: Session = Depends(get_db)) -> dict:
    result = public_shared_analysis(db, share_id)
    if not result:
        raise HTTPException(status_code=404, detail="Shared analysis not found")
    return result
