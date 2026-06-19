from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field
from datetime import datetime, time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ReadingAnalysis, User
from app.services.reading_analyzer import (
    analyze_reading_image_public,
    analyze_reading_image,
    analyze_reading_passage_public,
    analyze_reading_passage,
    extract_text_from_reading_image,
    public_shared_analysis,
    user_has_active_pro,
)

router = APIRouter(prefix="/api", tags=["reading-analyzer"])
ANON_COOKIE_NAME = "sattest_ra_anon_id"


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


@router.post("/reading-analyzer/public/analyze")
async def analyze_text_public(
    payload: PassageInput,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    anonymous_id = _anonymous_id(request, response)
    try:
        result = analyze_reading_passage_public(db, anonymous_id, payload.text, payload.language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if result.get("limit_reached"):
        raise HTTPException(status_code=403, detail=result)
    return result


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


@router.post("/reading-analyzer/public/analyze-image")
async def analyze_image_public(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    language: str = Form("uz"),
    db: Session = Depends(get_db),
) -> dict:
    anonymous_id = _anonymous_id(request, response)
    contents = await file.read()
    try:
        result = analyze_reading_image_public(db, anonymous_id, contents, file.content_type or "", language)
    except ValueError as exc:
        error_key = str(exc)
        raise HTTPException(status_code=400, detail={"error": error_key}) from exc
    if result.get("limit_reached"):
        raise HTTPException(status_code=403, detail=result)
    return result


@router.post("/reading-analyzer/test-image-reading")
async def test_image_reading(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    contents = await file.read()
    try:
        extracted_text = extract_text_from_reading_image(contents, file.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
    if not extracted_text:
        raise HTTPException(status_code=400, detail={"error": "image_error"})
    return {"extracted_text": extracted_text}


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


def _anonymous_id(request: Request, response: Response) -> str:
    from_header = request.headers.get("X-SATTEST-RA-ID")
    if from_header and len(from_header) <= 80:
        anonymous_id = from_header
        response.set_cookie(
            ANON_COOKIE_NAME,
            anonymous_id,
            max_age=60 * 60 * 24 * 365,
            secure=request.url.scheme == "https",
            samesite="lax",
        )
        return anonymous_id
    existing = request.cookies.get(ANON_COOKIE_NAME)
    if existing and len(existing) <= 80:
        return existing
    anonymous_id = secrets.token_urlsafe(24)
    response.set_cookie(
        ANON_COOKIE_NAME,
        anonymous_id,
        max_age=60 * 60 * 24 * 365,
        secure=request.url.scheme == "https",
        samesite="lax",
    )
    return anonymous_id
