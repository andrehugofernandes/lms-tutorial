import re
import threading
from datetime import date, datetime, timedelta

from flask import current_app
from sqlalchemy import func

from .extensions import db
from .models import (
    Achievement,
    Chapter,
    Course,
    MuxData,
    Profile,
    Purchase,
    RoleEnum,
    TranscriptStatusEnum,
    UserProgress,
    UserStreak,
    UserXP,
    VideoProviderEnum,
)


LEVEL_LABELS = {
    1: "Iniciante",
    2: "Aprendiz",
    3: "Estudante",
    4: "Avancado",
    5: "Especialista",
}

LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, float("inf")]


def calc_question_xp(result: dict, combo_count: int) -> int:
    if not result["isCorrect"]:
        return 0

    xp = 20 * result.get("pointWeight", 1.0)
    if result.get("isBonus") and result.get("bonusPoints"):
        xp += result["bonusPoints"]
    if combo_count >= 3:
        xp *= 2
    if result.get("timeRemaining") and result["timeRemaining"] > 0:
        xp += (result["timeRemaining"] // 5) * 5
    return round(xp)


def calc_quiz_xp(results: list[dict]) -> int:
    total_xp = 0
    combo = 0
    for result in results:
        combo = combo + 1 if result["isCorrect"] else 0
        total_xp += calc_question_xp(result, combo)
    return total_xp


def calc_score(results: list[dict]) -> int:
    if not results:
        return 0
    correct = len([result for result in results if result["isCorrect"]])
    return round((correct / len(results)) * 100)


def calc_level(total_xp: int) -> int:
    if total_xp < 200:
        return 1
    if total_xp < 500:
        return 2
    if total_xp < 1000:
        return 3
    if total_xp < 2000:
        return 4
    return 5


def get_level_progress(total_xp: int) -> dict:
    level = calc_level(total_xp)
    minimum = LEVEL_THRESHOLDS[level - 1]
    maximum = LEVEL_THRESHOLDS[level]
    return {
        "current": total_xp - minimum,
        "max": (total_xp - minimum + 500) if maximum == float("inf") else maximum - minimum,
        "level": level,
    }


def get_progress(user_id: str, course_id: str) -> float:
    published_chapters = Chapter.query.filter_by(courseId=course_id, isPublished=True).all()
    if not published_chapters:
        return 0

    chapter_ids = [chapter.id for chapter in published_chapters]
    completed = (
        UserProgress.query.filter(
            UserProgress.userId == user_id,
            UserProgress.chapterId.in_(chapter_ids),
            UserProgress.isCompleted.is_(True),
        )
        .count()
    )
    return round((completed / len(published_chapters)) * 100, 2)


def build_embed(video_url: str) -> tuple[str, VideoProviderEnum]:
    youtube_match = re.search(
        r"(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})",
        video_url or "",
    )
    if youtube_match:
        return f"https://www.youtube.com/embed/{youtube_match.group(1)}", VideoProviderEnum.YOUTUBE

    vimeo_match = re.search(r"(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)", video_url or "")
    if vimeo_match:
        return f"https://player.vimeo.com/video/{vimeo_match.group(1)}", VideoProviderEnum.VIMEO

    return video_url, VideoProviderEnum.OTHER


def extract_youtube_id(video_url: str | None) -> str | None:
    if not video_url:
        return None
    match = re.search(r"(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})", video_url)
    return match.group(1) if match else None


def start_transcription(chapter_id: str, video_provider: VideoProviderEnum | None, external_url: str | None) -> None:
    if video_provider != VideoProviderEnum.YOUTUBE:
        return

    app = current_app._get_current_object()

    def worker():
        with app.app_context():
            chapter = Chapter.query.filter_by(id=chapter_id).first()
            if not chapter:
                return

            chapter.transcriptStatus = TranscriptStatusEnum.PROCESSING
            db.session.commit()

            try:
                from youtube_transcript_api import YouTubeTranscriptApi

                video_id = extract_youtube_id(external_url)
                if not video_id:
                    raise ValueError("Invalid YouTube URL")

                transcript = YouTubeTranscriptApi().fetch(
                    video_id,
                    languages=["pt", "pt-BR", "en"],
                )
                chapter.transcript = " ".join(
                    chunk["text"] for chunk in transcript.to_raw_data()
                )
                chapter.transcriptStatus = TranscriptStatusEnum.COMPLETED
                db.session.commit()
            except Exception:
                chapter.transcriptStatus = TranscriptStatusEnum.FAILED
                db.session.commit()

    threading.Thread(target=worker, daemon=True).start()


def create_mux_asset(video_url: str) -> tuple[str | None, str | None]:
    import requests

    token_id = current_app.config.get("MUX_TOKEN_ID")
    token_secret = current_app.config.get("MUX_TOKEN_SECRET")
    if not token_id or not token_secret:
        return None, None

    response = requests.post(
        "https://api.mux.com/video/v1/assets",
        auth=(token_id, token_secret),
        json={"inputs": [{"url": video_url}], "playback_policy": ["public"], "test": False},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json().get("data", {})
    playback_ids = payload.get("playback_ids") or []
    playback_id = playback_ids[0]["id"] if playback_ids else None
    return payload.get("id"), playback_id


def delete_mux_asset(asset_id: str | None) -> None:
    import requests

    if not asset_id:
        return

    token_id = current_app.config.get("MUX_TOKEN_ID")
    token_secret = current_app.config.get("MUX_TOKEN_SECRET")
    if not token_id or not token_secret:
        return

    requests.delete(
        f"https://api.mux.com/video/v1/assets/{asset_id}",
        auth=(token_id, token_secret),
        timeout=30,
    )


def generate_quiz_questions(context: str, count: int = 5) -> list[dict]:
    import google.generativeai as genai

    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"""
Voce e um assistente educacional especialista em criar avaliacoes.
Com base no conteudo abaixo, crie um quiz com {count} questoes de multipla escolha.

CONTEUDO:
{context}

REGRAS:
1. Retorne APENAS um JSON valido.
2. Cada questao deve ter 4 alternativas.
3. Exatamente uma alternativa deve ser a correta.
4. Nao inclua markdown ou texto fora do JSON.
"""
    response = model.generate_content(prompt)
    text = (response.text or "").replace("```json", "").replace("```", "").strip()
    import json

    return json.loads(text)


def update_user_streak(user_id: str) -> UserStreak:
    today = date.today()
    streak = UserStreak.query.filter_by(userId=user_id).first()

    if not streak:
        streak = UserStreak(userId=user_id, count=1, lastVisit=datetime.utcnow())
        db.session.add(streak)
        db.session.commit()
        return streak

    last_visit = streak.lastVisit.date()
    if last_visit == today:
        return streak

    if last_visit == today - timedelta(days=1):
        streak.count += 1
    else:
        streak.count = 1

    streak.lastVisit = datetime.utcnow()
    db.session.commit()
    return streak


def ensure_student_profile(user_id: str, email: str | None, name: str | None) -> Profile:
    profile = Profile.query.filter_by(userId=user_id).first()
    if profile:
        return profile

    profile = Profile(
        userId=user_id,
        email=email,
        name=name or "Aluno",
        role=RoleEnum.STUDENT,
    )
    db.session.add(profile)
    db.session.commit()
    return profile


def ensure_teacher_profile(user_id: str, email: str | None, name: str | None) -> Profile:
    profile = Profile.query.filter_by(userId=user_id).first()
    if not profile:
        profile = Profile(
            userId=user_id,
            email=email,
            name=name or "Professor",
            role=RoleEnum.TEACHER,
        )
        db.session.add(profile)
    elif profile.role == RoleEnum.STUDENT:
        profile.role = RoleEnum.TEACHER

    db.session.commit()
    return profile


def promote_admin_profile(user_id: str, email: str | None, name: str | None) -> Profile:
    profile = Profile.query.filter_by(userId=user_id).first()
    if not profile:
        profile = Profile(
            userId=user_id,
            email=email,
            name=name or "Administrador",
            role=RoleEnum.ADMIN,
        )
        db.session.add(profile)
    else:
        profile.role = RoleEnum.ADMIN

    db.session.commit()
    return profile
