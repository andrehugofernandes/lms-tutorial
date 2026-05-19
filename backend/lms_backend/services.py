import re
import threading
from datetime import date, datetime, timedelta

from flask import current_app

from .extensions import fdb
from .models import (
    RoleEnum,
    TranscriptStatusEnum,
    VideoProviderEnum,
    VideoSourceTypeEnum,
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
    published_chapters = fdb.collection('chapters').where('courseId', '==', course_id).where('isPublished', '==', True).get()
    if not published_chapters:
        return 0

    chapter_ids = [chapter.id for chapter in published_chapters]
    completed_query = fdb.collection('userProgress')\
        .where('userId', '==', user_id)\
        .where('chapterId', 'in', chapter_ids)\
        .where('isCompleted', '==', True)\
        .get()
    
    completed_count = len(completed_query)
    return round((completed_count / len(published_chapters)) * 100, 2)


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
            chapter_ref = fdb.collection('chapters').document(chapter_id)
            chapter_doc = chapter_ref.get()
            if not chapter_doc.exists:
                return

            chapter_ref.update({"transcriptStatus": TranscriptStatusEnum.PROCESSING.value})

            try:
                from youtube_transcript_api import YouTubeTranscriptApi

                video_id = extract_youtube_id(external_url)
                if not video_id:
                    raise ValueError("Invalid YouTube URL")

                transcript = YouTubeTranscriptApi().fetch(
                    video_id,
                    languages=["pt", "pt-BR", "en"],
                )
                transcript_text = " ".join(chunk["text"] for chunk in transcript)
                
                chapter_ref.update({
                    "transcript": transcript_text,
                    "transcriptStatus": TranscriptStatusEnum.COMPLETED.value
                })
            except Exception as e:
                print(f"Transcription error: {str(e)}")
                chapter_ref.update({"transcriptStatus": TranscriptStatusEnum.FAILED.value})

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


def update_user_streak(user_id: str) -> dict:
    today = date.today()
    streak_ref = fdb.collection('userStreaks').document(user_id)
    streak_doc = streak_ref.get()

    if not streak_doc.exists:
        streak_data = {
            "userId": user_id,
            "count": 1,
            "lastActivity": datetime.utcnow()
        }
        streak_ref.set(streak_data)
        return streak_data

    streak = streak_doc.to_dict()
    # lastActivity in Firestore is a datetime object when retrieved by Python SDK
    last_activity = streak["lastActivity"]
    if hasattr(last_activity, 'date'):
        last_visit = last_activity.date()
    else:
        # Fallback if it's already a date or other format
        last_visit = last_activity

    if last_visit == today:
        return streak

    if last_visit == today - timedelta(days=1):
        streak["count"] += 1
    else:
        streak["count"] = 1

    streak["lastActivity"] = datetime.utcnow()
    streak_ref.set(streak)
    return streak


def ensure_student_profile(user_id: str, email: str | None, name: str | None) -> dict:
    profile_query = fdb.collection('profiles').where('userId', '==', user_id).limit(1).get()
    if profile_query:
        return profile_query[0].to_dict()

    profile_data = {
        "userId": user_id,
        "email": email,
        "name": name or "Aluno",
        "role": RoleEnum.STUDENT.value,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    fdb.collection('profiles').add(profile_data)
    return profile_data


def ensure_teacher_profile(user_id: str, email: str | None, name: str | None) -> dict:
    profile_query = fdb.collection('profiles').where('userId', '==', user_id).limit(1).get()
    
    if not profile_query:
        profile_data = {
            "userId": user_id,
            "email": email,
            "name": name or "Professor",
            "role": RoleEnum.TEACHER.value,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        fdb.collection('profiles').add(profile_data)
        return profile_data
    
    profile_doc = profile_query[0]
    profile_data = profile_doc.to_dict()
    if profile_data.get("role") == RoleEnum.STUDENT.value:
        profile_data["role"] = RoleEnum.TEACHER.value
        profile_doc.reference.update({"role": RoleEnum.TEACHER.value})

    return profile_data


def promote_admin_profile(user_id: str, email: str | None, name: str | None) -> dict:
    profile_query = fdb.collection('profiles').where('userId', '==', user_id).limit(1).get()
    
    if not profile_query:
        profile_data = {
            "userId": user_id,
            "email": email,
            "name": name or "Administrador",
            "role": RoleEnum.ADMIN.value,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        fdb.collection('profiles').add(profile_data)
        return profile_data
    
    profile_doc = profile_query[0]
    profile_data = profile_doc.to_dict()
    profile_data["role"] = RoleEnum.ADMIN.value
    profile_doc.reference.update({"role": RoleEnum.ADMIN.value})

    return profile_data
