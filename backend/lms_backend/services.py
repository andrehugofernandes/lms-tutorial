import json
import os
import re
import threading
from datetime import date, datetime, timedelta

from flask import current_app

from .extensions import fdb
from .models import (
    RoleEnum,
    TranscriptStatusEnum,
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

DIFFICULTY_RULES = {
    "facil": {"pointWeight": 1.0, "isBonus": False, "bonusPoints": None},
    "media": {"pointWeight": 1.5, "isBonus": False, "bonusPoints": None},
    "razoavelmente_dificil": {"pointWeight": 2.0, "isBonus": False, "bonusPoints": None},
    "dificil": {"pointWeight": 2.0, "isBonus": False, "bonusPoints": None},
    "desafio": {"pointWeight": 2.0, "isBonus": True, "bonusPoints": 50},
}

YOUTUBE_TRANSCRIPT_LANGUAGES = ["pt", "pt-BR", "en"]


def build_difficulty_plan(count: int) -> list[str]:
    count = max(1, min(int(count or 1), 10))
    if count == 1:
        return ["media"]
    if count == 2:
        return ["facil", "media"]
    plan = ["facil", "media", "razoavelmente_dificil", "dificil", "desafio"]
    while len(plan) < count:
        plan.extend(["facil", "media", "razoavelmente_dificil", "dificil", "desafio"])
    return plan[:count]


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


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _caption_text(chunk) -> str:
    if hasattr(chunk, "text"):
        return chunk.text or ""
    if isinstance(chunk, dict):
        return chunk.get("text") or ""
    return ""


def _transcript_to_text(transcript) -> str:
    text = " ".join(_caption_text(chunk).strip() for chunk in transcript).strip()
    if not text:
        raise ValueError("Empty YouTube transcript")
    return text


def _build_youtube_transcript_api():
    from youtube_transcript_api import YouTubeTranscriptApi

    if not can_attempt_youtube_transcript_fetch():
        raise RuntimeError("YouTube transcript fetch requires a proxy in Firebase runtime")

    proxy_username = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_USERNAME") or os.environ.get("WEBSHARE_PROXY_USERNAME")
    proxy_password = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_PASSWORD") or os.environ.get("WEBSHARE_PROXY_PASSWORD")
    if proxy_username and proxy_password:
        from youtube_transcript_api.proxies import WebshareProxyConfig

        locations = [
            item.strip().upper()
            for item in (os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_LOCATIONS") or "br,us").split(",")
            if item.strip()
        ]
        return YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=proxy_username,
                proxy_password=proxy_password,
                filter_ip_locations=locations or None,
            )
        )

    proxy_url = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_URL")
    if proxy_url:
        from youtube_transcript_api.proxies import GenericProxyConfig

        return YouTubeTranscriptApi(
            proxy_config=GenericProxyConfig(
                http_url=proxy_url,
                https_url=proxy_url,
            )
        )

    return YouTubeTranscriptApi()


def _is_firebase_runtime() -> bool:
    return bool(os.environ.get("K_SERVICE") or os.environ.get("FUNCTION_TARGET"))


def _youtube_transcript_proxy_configured() -> bool:
    proxy_username = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_USERNAME") or os.environ.get("WEBSHARE_PROXY_USERNAME")
    proxy_password = os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_PASSWORD") or os.environ.get("WEBSHARE_PROXY_PASSWORD")
    return bool(os.environ.get("YOUTUBE_TRANSCRIPT_PROXY_URL") or (proxy_username and proxy_password))


def can_attempt_youtube_transcript_fetch() -> bool:
    return not _is_firebase_runtime() or _youtube_transcript_proxy_configured()


def fetch_youtube_transcript_text(external_url: str | None) -> str:
    video_id = extract_youtube_id(external_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    api = _build_youtube_transcript_api()
    transcript_list = api.list(video_id)

    for finder in (
        transcript_list.find_transcript,
        transcript_list.find_manually_created_transcript,
        transcript_list.find_generated_transcript,
    ):
        try:
            return _transcript_to_text(finder(YOUTUBE_TRANSCRIPT_LANGUAGES).fetch())
        except Exception:
            pass

    transcripts = list(transcript_list)
    for transcript in transcripts:
        language_code = (transcript.language_code or "").lower()
        if language_code.startswith("pt") or language_code.startswith("en"):
            return _transcript_to_text(transcript.fetch())

    for transcript in transcripts:
        if transcript.is_translatable:
            for language in ("pt", "en"):
                try:
                    return _transcript_to_text(transcript.translate(language).fetch())
                except Exception:
                    pass

    if transcripts:
        return _transcript_to_text(transcripts[0].fetch())

    raise ValueError("No YouTube transcript available")


def _summarize_transcript_error(error: Exception) -> str:
    return " ".join((str(error) or error.__class__.__name__).split())[:1000]


def store_chapter_transcript(chapter_id: str, external_url: str | None) -> str:
    chapter_ref = fdb.collection('chapters').document(chapter_id)
    chapter_doc = chapter_ref.get()
    if not chapter_doc.exists:
        raise ValueError("Chapter not found")

    chapter_ref.update({
        "transcriptStatus": TranscriptStatusEnum.PROCESSING.value,
        "updatedAt": datetime.utcnow(),
    })

    try:
        transcript_text = fetch_youtube_transcript_text(external_url)
        chapter_ref.update({
            "transcript": transcript_text,
            "transcriptError": None,
            "transcriptStatus": TranscriptStatusEnum.COMPLETED.value,
            "updatedAt": datetime.utcnow(),
        })
        return transcript_text
    except Exception as error:
        error_message = _summarize_transcript_error(error)
        print(f"Transcription error ({error.__class__.__name__}): {error_message}")
        chapter_ref.update({
            "transcriptError": error_message,
            "transcriptStatus": TranscriptStatusEnum.FAILED.value,
            "updatedAt": datetime.utcnow(),
        })
        raise


def start_transcription(chapter_id: str, video_provider: VideoProviderEnum | str | None, external_url: str | None) -> None:
    if _enum_value(video_provider) != VideoProviderEnum.YOUTUBE.value:
        return
    if not can_attempt_youtube_transcript_fetch():
        return

    app = current_app._get_current_object()

    def worker():
        with app.app_context():
            try:
                store_chapter_transcript(chapter_id, external_url)
            except Exception:
                pass

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


def _parse_llm_json(text: str) -> object:
    clean = (text or "").replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", clean, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(1))


def _normalize_generated_questions(payload: object, difficulty_plan: list[str]) -> list[dict]:
    raw_questions = payload.get("questions") if isinstance(payload, dict) else payload
    if not isinstance(raw_questions, list):
        raise ValueError("A IA nao retornou uma lista de questoes")

    normalized = []
    for index, item in enumerate(raw_questions[: len(difficulty_plan)]):
        if not isinstance(item, dict):
            continue

        prompt = str(item.get("prompt") or item.get("question") or "").strip()
        options = item.get("options") or item.get("alternatives") or []
        if not prompt or not isinstance(options, list):
            continue

        expected_difficulty = difficulty_plan[index]
        raw_correct = item.get("correctIndex")
        if raw_correct is None:
            raw_correct = item.get("correctOptionIndex")
        if raw_correct is None:
            raw_correct = item.get("correctAnswerIndex")

        normalized_options = []
        correct_count = 0
        for option_index, option in enumerate(options[:4]):
            if isinstance(option, dict):
                text = str(option.get("text") or option.get("label") or "").strip()
                is_correct = bool(option.get("isCorrect"))
            else:
                text = str(option).strip()
                is_correct = False

            if raw_correct is not None:
                try:
                    is_correct = int(raw_correct) == option_index
                except (TypeError, ValueError):
                    is_correct = False

            if text:
                correct_count += 1 if is_correct else 0
                normalized_options.append({"text": text, "isCorrect": is_correct})

        if len(normalized_options) != 4:
            continue

        if correct_count != 1:
            for option in normalized_options:
                option["isCorrect"] = False
            normalized_options[0]["isCorrect"] = True

        rules = DIFFICULTY_RULES[expected_difficulty]
        normalized.append(
            {
                "prompt": prompt,
                "difficulty": expected_difficulty,
                "pointWeight": rules["pointWeight"],
                "isBonus": rules["isBonus"],
                "bonusPoints": rules["bonusPoints"],
                "options": normalized_options,
            }
        )

    if len(normalized) != len(difficulty_plan):
        raise ValueError("A IA retornou questoes incompletas ou invalidas")

    return normalized


def generate_quiz_questions(context: str, count: int = 5) -> list[dict]:
    difficulty_plan = build_difficulty_plan(count)
    difficulty_text = ", ".join(difficulty_plan)
    system_prompt = """
Voce e um assistente educacional especialista em criar avaliacoes.
Voce sempre responde somente JSON valido, sem markdown e sem texto antes ou depois.
"""
    user_prompt = f"""
Crie um quiz com {len(difficulty_plan)} questoes de multipla escolha.
A distribuicao obrigatoria de dificuldade, nesta ordem, e: {difficulty_text}.

Regras:
1. Cada questao deve ter 4 alternativas.
2. Exatamente uma alternativa deve ser a correta.
3. Use somente fatos presentes no conteudo, no titulo ou na descricao.
4. Cubra pontos centrais do conteudo e evite perguntas obvias ou repetidas.
5. Varie o raciocinio conforme a dificuldade: facil testa reconhecimento, media testa compreensao, razoavelmente_dificil testa aplicacao, dificil testa relacao entre conceitos, desafio testa analise.
6. O JSON deve seguir exatamente este formato:
{{
  "questions": [
    {{
      "prompt": "texto da pergunta",
      "difficulty": "facil|media|razoavelmente_dificil|dificil|desafio",
      "options": [
        {{ "text": "alternativa A", "isCorrect": true }},
        {{ "text": "alternativa B", "isCorrect": false }},
        {{ "text": "alternativa C", "isCorrect": false }},
        {{ "text": "alternativa D", "isCorrect": false }}
      ]
    }}
  ]
}}

Conteudo:
{context}
"""
    provider = (current_app.config.get("LLM_PROVIDER") or "local").lower()

    if provider == "gemini":
        import google.generativeai as genai

        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(current_app.config.get("LLM_MODEL") or "gemini-1.5-flash")
        response = model.generate_content(f"{system_prompt}\n{user_prompt}")
        text = response.text or ""
    else:
        from llm import generate_text

        text = generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=current_app.config.get("LLM_MODEL"),
            source=provider,
        )

    return _normalize_generated_questions(_parse_llm_json(text), difficulty_plan)


def _difficulty_from_question_config(question: dict) -> str:
    if question.get("isBonus"):
        return "desafio"

    try:
        point_weight = float(question.get("pointWeight") or 1.0)
    except (TypeError, ValueError):
        point_weight = 1.0

    if point_weight >= 2:
        return "dificil"
    if point_weight >= 1.5:
        return "media"
    return "facil"


def generate_replacement_questions(context: str, requests: list[dict]) -> list[dict]:
    if not requests:
        return []

    difficulty_plan = [
        item.get("difficulty") or _difficulty_from_question_config(item)
        for item in requests
    ]

    request_lines = []
    for index, item in enumerate(requests, start=1):
        suggestion = str(item.get("suggestion") or "").strip()
        use_default_config = bool(item.get("useDefaultConfig"))
        focus_content = bool(item.get("focusContentOverSuggestion"))
        options = item.get("options") or []
        options_text = "\n".join(
            f"      - {'CORRETA: ' if option.get('isCorrect') else ''}{option.get('text')}"
            for option in options
        )

        if use_default_config:
            guidance = (
                "Criar uma nova pergunta usando a configuracao atual da pergunta original. "
                "Ignore sugestoes do professor para este item."
            )
        elif suggestion:
            guidance = (
                f"Sugestao do professor: {suggestion}\n"
                + (
                    "Se a sugestao fugir do conteudo do video, priorize o conteudo do video e use a sugestao apenas como intencao pedagogica."
                    if focus_content
                    else "Tente atender a sugestao, mas nunca invente fatos fora do conteudo do video."
                )
            )
        else:
            guidance = "Criar uma nova pergunta alternativa, sem repetir a pergunta original."

        request_lines.append(
            f"""
  Item {index}
    Dificuldade esperada: {difficulty_plan[index - 1]}
    Pergunta original: {item.get("prompt")}
    Alternativas originais:
{options_text}
    Orientacao: {guidance}
"""
        )

    system_prompt = """
Voce e um assistente educacional especialista em reescrever avaliacoes.
Voce sempre responde somente JSON valido, sem markdown e sem texto antes ou depois.
"""
    user_prompt = f"""
Crie {len(requests)} novas perguntas de multipla escolha para substituir perguntas existentes.

Regras:
1. Cada pergunta deve ter 4 alternativas.
2. Exatamente uma alternativa deve ser a correta.
3. Use somente fatos presentes no conteudo, no titulo ou na descricao.
4. Nao copie o enunciado original; gere uma pergunta nova com objetivo equivalente.
5. Mantenha a ordem dos itens solicitados.
6. O JSON deve seguir exatamente este formato:
{{
  "questions": [
    {{
      "prompt": "texto da pergunta",
      "difficulty": "facil|media|razoavelmente_dificil|dificil|desafio",
      "options": [
        {{ "text": "alternativa A", "isCorrect": true }},
        {{ "text": "alternativa B", "isCorrect": false }},
        {{ "text": "alternativa C", "isCorrect": false }},
        {{ "text": "alternativa D", "isCorrect": false }}
      ]
    }}
  ]
}}

Itens para substituir:
{"".join(request_lines)}

Conteudo:
{context}
"""
    provider = (current_app.config.get("LLM_PROVIDER") or "local").lower()

    if provider == "gemini":
        import google.generativeai as genai

        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(current_app.config.get("LLM_MODEL") or "gemini-1.5-flash")
        response = model.generate_content(f"{system_prompt}\n{user_prompt}")
        text = response.text or ""
    else:
        from llm import generate_text

        text = generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=current_app.config.get("LLM_MODEL"),
            source=provider,
        )

    generated = _normalize_generated_questions(_parse_llm_json(text), difficulty_plan)

    for index, item in enumerate(requests):
        if bool(item.get("useDefaultConfig")) and index < len(generated):
            generated[index]["pointWeight"] = float(item.get("pointWeight") or 1.0)
            generated[index]["isBonus"] = bool(item.get("isBonus"))
            generated[index]["bonusPoints"] = item.get("bonusPoints")

    return generated


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
