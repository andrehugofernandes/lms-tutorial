from flask import Blueprint, jsonify, request
from sqlalchemy.orm import joinedload

from .auth import AuthError, get_current_user, get_user_profile, require_roles
from .extensions import db
from .models import (
    Achievement,
    Answer,
    Attachment,
    Category,
    Chapter,
    Course,
    MuxData,
    Option,
    Purchase,
    Question,
    Quiz,
    QuizResult,
    RoleEnum,
    TranscriptStatusEnum,
    UserNote,
    UserProgress,
    UserXP,
    VideoProviderEnum,
    VideoSourceTypeEnum,
)
from .services import (
    LEVEL_LABELS,
    build_embed,
    calc_level,
    calc_quiz_xp,
    calc_score,
    create_mux_asset,
    delete_mux_asset,
    ensure_student_profile,
    ensure_teacher_profile,
    generate_quiz_questions,
    get_level_progress,
    get_progress,
    promote_admin_profile,
    start_transcription,
    update_user_streak,
)
from .utils import (
    serialize_achievement,
    serialize_attachment,
    serialize_category,
    serialize_chapter,
    serialize_course,
    serialize_mux_data,
    serialize_note,
    serialize_profile,
    serialize_progress,
    serialize_question,
    serialize_quiz,
    serialize_quiz_result,
)


api_bp = Blueprint("api", __name__, url_prefix="/api")


def text_response(message: str, status: int):
    return message, status, {"Content-Type": "text/plain; charset=utf-8"}


def require_user():
    return get_current_user(optional=False)


def require_course_owner(course_id: str, user_id: str) -> Course:
    course = (
        Course.query.options(
            joinedload(Course.chapters).joinedload(Chapter.quiz),
            joinedload(Course.attachments),
            joinedload(Course.category),
        )
        .filter_by(id=course_id, userId=user_id)
        .first()
    )
    if not course:
        raise AuthError("Unauthorized", 401)
    return course


def require_chapter_owner(course_id: str, chapter_id: str, user_id: str) -> Chapter:
    require_course_owner(course_id, user_id)
    chapter = (
        Chapter.query.options(
            joinedload(Chapter.muxData),
            joinedload(Chapter.quiz).joinedload(Quiz.questions).joinedload(Question.options),
        )
        .filter_by(id=chapter_id, courseId=course_id)
        .first()
    )
    if not chapter:
        raise AuthError("Not found", 404)
    return chapter


def ensure_purchase(user_id: str, course_id: str, last_chapter_id: str | None = None) -> Purchase:
    purchase = Purchase.query.filter_by(userId=user_id, courseId=course_id).first()
    if not purchase:
        purchase = Purchase(userId=user_id, courseId=course_id, lastChapterId=last_chapter_id)
        db.session.add(purchase)
    elif last_chapter_id:
        purchase.lastChapterId = last_chapter_id
    db.session.commit()
    return purchase


def build_catalog_payload(user_id: str, title: str | None, category_id: str | None):
    query = Course.query.options(joinedload(Course.category), joinedload(Course.chapters)).filter_by(isPublished=True)
    if title:
        query = query.filter(Course.title.ilike(f"%{title}%"))
    if category_id:
        query = query.filter(Course.categoryId == category_id)

    courses = query.order_by(Course.createdAt.desc()).all()
    purchases = {purchase.courseId for purchase in Purchase.query.filter_by(userId=user_id).all()}

    payload = []
    for course in courses:
        progress = get_progress(user_id, course.id) if course.id in purchases else None
        course_payload = serialize_course(course, progress=progress)
        course_payload["chapters"] = [
            serialize_chapter(chapter)
            for chapter in sorted(course.chapters, key=lambda item: item.position)
            if chapter.isPublished
        ]
        payload.append(course_payload)
    return payload


def build_dashboard_courses(user_id: str):
    purchases = Purchase.query.filter_by(userId=user_id).all()
    course_ids = [purchase.courseId for purchase in purchases]
    if not course_ids:
        return {"completedCourses": [], "coursesInProgress": []}

    courses = (
        Course.query.options(joinedload(Course.category), joinedload(Course.chapters))
        .filter(Course.id.in_(course_ids))
        .all()
    )
    purchases_by_course = {purchase.courseId: purchase for purchase in purchases}

    completed_courses = []
    courses_in_progress = []
    for course in courses:
        progress = get_progress(user_id, course.id)
        course_payload = serialize_course(course, progress=progress)
        course_payload["chapters"] = [
            serialize_chapter(chapter) for chapter in sorted(course.chapters, key=lambda item: item.position) if chapter.isPublished
        ]
        purchase = purchases_by_course.get(course.id)
        course_payload["lastChapter"] = next(
            (serialize_chapter(chapter) for chapter in course.chapters if purchase and chapter.id == purchase.lastChapterId),
            course_payload["chapters"][0] if course_payload["chapters"] else None,
        )
        if progress == 100:
            completed_courses.append(course_payload)
        else:
            courses_in_progress.append(course_payload)
    return {"completedCourses": completed_courses, "coursesInProgress": courses_in_progress}


def build_student_metrics(user_id: str):
    purchases = Purchase.query.filter_by(userId=user_id).all()
    course_ids = [purchase.courseId for purchase in purchases]
    courses = (
        Course.query.options(joinedload(Course.category), joinedload(Course.chapters))
        .filter(Course.id.in_(course_ids))
        .all()
        if course_ids
        else []
    )
    completed_progress = {
        progress.chapterId
        for progress in UserProgress.query.filter_by(userId=user_id, isCompleted=True).all()
    }
    achievements = Achievement.query.filter_by(userId=user_id).all()
    user_streak = update_user_streak(user_id)

    total_minutes_watched = 0
    total_minutes_target = 0
    completed_courses_count = 0
    courses_in_progress = []
    purchases_by_course = {purchase.courseId: purchase for purchase in purchases}

    for course in courses:
        published_chapters = [chapter for chapter in course.chapters if chapter.isPublished]
        total_minutes_target += sum(chapter.duration or 0 for chapter in published_chapters)
        completed_chapters = [chapter for chapter in published_chapters if chapter.id in completed_progress]
        total_minutes_watched += sum(chapter.duration or 0 for chapter in completed_chapters)

        progress = 0 if not published_chapters else round((len(completed_chapters) / len(published_chapters)) * 100, 2)
        if progress == 100:
            completed_courses_count += 1
        else:
            purchase = purchases_by_course.get(course.id)
            payload = serialize_course(course, progress=progress)
            payload["chapters"] = [serialize_chapter(chapter) for chapter in published_chapters]
            payload["lastChapter"] = next(
                (serialize_chapter(chapter) for chapter in published_chapters if purchase and chapter.id == purchase.lastChapterId),
                serialize_chapter(published_chapters[0]) if published_chapters else None,
            )
            courses_in_progress.append(payload)

    return {
        "totalHoursWatched": round(total_minutes_watched / 60, 1),
        "totalHoursTarget": round(total_minutes_target / 60, 1),
        "completedCoursesCount": completed_courses_count,
        "coursesInProgress": courses_in_progress,
        "achievements": [serialize_achievement(achievement) for achievement in achievements],
        "streakCount": user_streak.count,
    }


@api_bp.get("/categories")
def list_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([serialize_category(category) for category in categories])


@api_bp.post("/categories")
def create_category():
    user = require_user()
    require_roles(user["userId"], [RoleEnum.TEACHER, RoleEnum.ADMIN])
    name = (request.get_json(silent=True) or {}).get("name", "").strip()
    if not name:
        return text_response("Name is required", 400)

    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify(serialize_category(category))


@api_bp.post("/courses")
def create_course():
    user = require_user()
    require_roles(user["userId"], [RoleEnum.TEACHER, RoleEnum.ADMIN])
    title = (request.get_json(silent=True) or {}).get("title", "").strip()
    if not title:
        return text_response("Bad Request", 400)

    course = Course(userId=user["userId"], title=title)
    db.session.add(course)
    db.session.commit()
    return jsonify(serialize_course(course)), 201


@api_bp.patch("/courses/<course_id>")
def update_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    values = request.get_json(silent=True) or {}

    for key in ["title", "description", "imageUrl", "price", "categoryId"]:
        if key in values:
            setattr(course, key, values[key])

    db.session.commit()
    return jsonify(serialize_course(course))


@api_bp.delete("/courses/<course_id>")
def delete_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])

    for chapter in course.chapters:
        if chapter.muxData and chapter.muxData.assetId:
            delete_mux_asset(chapter.muxData.assetId)

    db.session.delete(course)
    db.session.commit()
    return jsonify(serialize_course(course))


@api_bp.patch("/courses/<course_id>/publish")
def publish_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])

    missing_fields = []
    if not (course.title or "").strip():
        missing_fields.append("titulo do curso")
    if not (course.description or "").strip():
        missing_fields.append("descricao do curso")
    if not course.imageUrl:
        missing_fields.append("imagem de capa")
    if not course.categoryId:
        missing_fields.append("categoria do curso")
    if not any(chapter.isPublished for chapter in course.chapters):
        missing_fields.append("pelo menos 1 capitulo publicado")

    if missing_fields:
        return text_response(f"Campos obrigatorios faltando: {', '.join(missing_fields)}", 400)

    course.isPublished = True
    db.session.commit()
    return jsonify(serialize_course(course))


@api_bp.patch("/courses/<course_id>/unpublish")
def unpublish_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    course.isPublished = False
    db.session.commit()
    return jsonify(serialize_course(course))


@api_bp.post("/courses/<course_id>/attachments")
def create_attachment(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    url = (request.get_json(silent=True) or {}).get("url")
    if not url:
        return text_response("Bad Request", 400)

    attachment = Attachment(courseId=course_id, url=url, name=url.rstrip("/").split("/")[-1] or "arquivo")
    db.session.add(attachment)
    db.session.commit()
    return jsonify(serialize_attachment(attachment))


@api_bp.delete("/courses/<course_id>/attachments/<attachment_id>")
def delete_attachment(course_id: str, attachment_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    attachment = Attachment.query.filter_by(id=attachment_id, courseId=course_id).first()
    if not attachment:
        return text_response("Not found", 404)
    db.session.delete(attachment)
    db.session.commit()
    return jsonify(serialize_attachment(attachment))


@api_bp.post("/courses/<course_id>/chapters")
def create_chapter(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    title = (request.get_json(silent=True) or {}).get("title", "").strip()
    if not title:
        return text_response("Bad Request", 400)

    last_chapter = Chapter.query.filter_by(courseId=course_id).order_by(Chapter.position.desc()).first()
    chapter = Chapter(title=title, courseId=course_id, position=(last_chapter.position + 1 if last_chapter else 1))
    db.session.add(chapter)
    db.session.commit()
    return jsonify(serialize_chapter(chapter))


@api_bp.put("/courses/<course_id>/chapters/reorder")
def reorder_chapters(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    items = (request.get_json(silent=True) or {}).get("list", [])
    for item in items:
        chapter = Chapter.query.filter_by(id=item.get("id"), courseId=course_id).first()
        if chapter:
            chapter.position = item.get("position", chapter.position)
    db.session.commit()
    return text_response("Success", 200)


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>")
def update_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    values = request.get_json(silent=True) or {}

    for key in ["title", "description", "isFree", "duration", "videoUrl", "videoSourceType", "externalUrl"]:
        if key in values:
            if key == "videoSourceType" and values[key]:
                setattr(chapter, key, VideoSourceTypeEnum(values[key]))
            else:
                setattr(chapter, key, values[key])

    if values.get("externalUrl") and str(values.get("videoSourceType")) == "EXTERNAL":
        embed_url, provider = build_embed(values["externalUrl"])
        chapter.embedUrl = embed_url
        chapter.videoProvider = provider
        chapter.transcriptStatus = TranscriptStatusEnum.PENDING
        db.session.commit()
        start_transcription(chapter.id, provider, values["externalUrl"])
    elif values.get("videoUrl") and str(values.get("videoSourceType")) == "UPLOAD":
        if chapter.muxData and chapter.muxData.assetId:
            delete_mux_asset(chapter.muxData.assetId)
            db.session.delete(chapter.muxData)
            db.session.flush()

        asset_id, playback_id = create_mux_asset(values["videoUrl"])
        if asset_id:
            mux_data = MuxData(chapterId=chapter.id, assetId=asset_id, playbackId=playback_id)
            db.session.add(mux_data)

    db.session.commit()
    refreshed = require_chapter_owner(course_id, chapter_id, user["userId"])
    return jsonify(serialize_chapter(refreshed, include_relations=True))


@api_bp.delete("/courses/<course_id>/chapters/<chapter_id>")
def delete_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    if chapter.muxData and chapter.muxData.assetId:
        delete_mux_asset(chapter.muxData.assetId)

    db.session.delete(chapter)
    db.session.commit()

    published_chapters = Chapter.query.filter_by(courseId=course_id, isPublished=True).count()
    if published_chapters == 0:
        course = Course.query.filter_by(id=course_id).first()
        if course:
            course.isPublished = False
            db.session.commit()

    return jsonify(serialize_chapter(chapter))


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>/publish")
def publish_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])

    has_external_video = chapter.videoSourceType == VideoSourceTypeEnum.EXTERNAL and bool(chapter.externalUrl or chapter.embedUrl)
    has_uploaded_video = bool(chapter.videoUrl)
    missing_fields = []
    if not (chapter.title or "").strip():
        missing_fields.append("titulo do capitulo")
    if not (chapter.description or "").strip():
        missing_fields.append("descricao do capitulo")
    if not has_external_video and not has_uploaded_video:
        missing_fields.append("video do capitulo")
    if missing_fields:
        return text_response(f"Campos obrigatorios faltando: {', '.join(missing_fields)}", 400)

    chapter.isPublished = True
    db.session.commit()
    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>/unpublish")
def unpublish_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    chapter.isPublished = False
    db.session.commit()

    published_chapters = Chapter.query.filter_by(courseId=course_id, isPublished=True).count()
    if published_chapters == 0:
        course = Course.query.filter_by(id=course_id).first()
        if course:
            course.isPublished = False
            db.session.commit()

    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.put("/courses/<course_id>/chapters/<chapter_id>/progress")
def update_chapter_progress(course_id: str, chapter_id: str):
    user = require_user()
    is_completed = bool((request.get_json(silent=True) or {}).get("isCompleted"))

    progress = UserProgress.query.filter_by(userId=user["userId"], chapterId=chapter_id).first()
    if not progress:
        progress = UserProgress(userId=user["userId"], chapterId=chapter_id, isCompleted=is_completed)
        db.session.add(progress)
    else:
        progress.isCompleted = is_completed

    db.session.commit()

    if is_completed:
        ensure_purchase(user["userId"], course_id, chapter_id)
        published_chapters = Chapter.query.filter_by(courseId=course_id, isPublished=True).all()
        chapter_ids = [chapter.id for chapter in published_chapters]
        completed_count = (
            UserProgress.query.filter(
                UserProgress.userId == user["userId"],
                UserProgress.chapterId.in_(chapter_ids),
                UserProgress.isCompleted.is_(True),
            )
            .count()
        )
        if chapter_ids and completed_count == len(chapter_ids):
            course = Course.query.filter_by(id=course_id).first()
            achievement = Achievement.query.filter_by(userId=user["userId"], courseId=course_id).first()
            if not achievement:
                achievement = Achievement(
                    userId=user["userId"],
                    courseId=course_id,
                    title=f"Especialista em {course.title if course else 'Curso'}",
                    description=f"Completou todas as aulas do curso {course.title if course else course_id}.",
                    icon="Trophy",
                )
                db.session.add(achievement)
                db.session.commit()

    return jsonify(serialize_progress(progress))


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/notes")
def create_note(course_id: str, chapter_id: str):
    user = require_user()
    payload = request.get_json(silent=True) or {}
    note = UserNote(
        userId=user["userId"],
        chapterId=chapter_id,
        content=payload.get("content", ""),
        timestamp=payload.get("timestamp") or 0,
    )
    db.session.add(note)
    db.session.commit()
    return jsonify(serialize_note(note))


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/notes")
def list_notes(course_id: str, chapter_id: str):
    user = require_user()
    notes = (
        UserNote.query.filter_by(userId=user["userId"], chapterId=chapter_id)
        .order_by(UserNote.createdAt.desc())
        .all()
    )
    return jsonify([serialize_note(note) for note in notes])


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/data")
def chapter_data(course_id: str, chapter_id: str):
    user = require_user()
    course = Course.query.options(joinedload(Course.attachments), joinedload(Course.chapters)).filter_by(id=course_id, isPublished=True).first()
    chapter = (
        Chapter.query.options(joinedload(Chapter.muxData), joinedload(Chapter.quiz).joinedload(Quiz.questions).joinedload(Question.options))
        .filter_by(id=chapter_id, courseId=course_id, isPublished=True)
        .first()
    )
    if not course or not chapter:
        return text_response("Not found", 404)

    user_progress = UserProgress.query.filter_by(userId=user["userId"], chapterId=chapter_id).first()
    next_chapter = (
        Chapter.query.filter(
            Chapter.courseId == course_id,
            Chapter.isPublished.is_(True),
            Chapter.position > chapter.position,
        )
        .order_by(Chapter.position.asc())
        .first()
    )
    attachments = [serialize_attachment(attachment) for attachment in course.attachments]
    quiz = serialize_quiz(chapter.quiz, include_correct=False) if chapter.quiz else None
    return jsonify(
        {
            "course": serialize_course(course),
            "chapter": serialize_chapter(chapter),
            "muxData": serialize_mux_data(chapter.muxData),
            "attachments": attachments,
            "nextChapter": serialize_chapter(next_chapter) if next_chapter else None,
            "userProgress": serialize_progress(user_progress),
            "quiz": quiz,
        }
    )


@api_bp.post("/courses/<course_id>/enroll")
def enroll_course(course_id: str):
    user = require_user()
    course = (
        Course.query.options(joinedload(Course.chapters))
        .filter_by(id=course_id, isPublished=True)
        .first()
    )
    if not course:
        return text_response("Course not found", 404)

    first_chapter = next((chapter for chapter in sorted(course.chapters, key=lambda item: item.position) if chapter.isPublished), None)
    if not first_chapter:
        return text_response("No published chapters found", 404)

    existing_purchase = Purchase.query.filter_by(userId=user["userId"], courseId=course_id).first()
    if existing_purchase:
        return text_response("Already enrolled", 400)

    purchase = Purchase(userId=user["userId"], courseId=course_id, lastChapterId=first_chapter.id)
    db.session.add(purchase)
    progress = UserProgress.query.filter_by(userId=user["userId"], chapterId=first_chapter.id).first()
    if not progress:
        db.session.add(UserProgress(userId=user["userId"], chapterId=first_chapter.id, isCompleted=False))
    db.session.commit()
    return jsonify({"enrolled": True})


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/quiz")
def get_chapter_quiz(course_id: str, chapter_id: str):
    require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.questions).joinedload(Question.options))
        .filter_by(chapterId=chapter_id)
        .first()
    )
    return jsonify(serialize_quiz(quiz, include_correct=True))


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/quiz")
def create_chapter_quiz(course_id: str, chapter_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])

    existing = Quiz.query.filter_by(chapterId=chapter_id).first()
    if existing:
        return text_response("Quiz already exists", 400)

    quiz = Quiz(chapterId=chapter_id)
    db.session.add(quiz)
    db.session.commit()
    return jsonify(serialize_quiz(quiz))


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/quiz/generate")
def generate_chapter_quiz(course_id: str, chapter_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    chapter = Chapter.query.filter_by(id=chapter_id, courseId=course_id).first()
    if not chapter:
        return text_response("Chapter not found", 404)
    if chapter.transcriptStatus == TranscriptStatusEnum.PROCESSING:
        return text_response("A transcricao do video ainda esta em andamento. Tente novamente em alguns segundos.", 400)

    quiz = Quiz.query.filter_by(chapterId=chapter_id).first()
    if not quiz:
        quiz = Quiz(chapterId=chapter_id, maxQuestions=5)
        db.session.add(quiz)
        db.session.flush()

    context = f"""
Titulo do Curso: {course.title}
Titulo do Capitulo: {chapter.title}
Descricao do Capitulo: {chapter.description or 'Sem descricao'}

CONTEUDO DO VIDEO (Transcricao):
{chapter.transcript or 'Nenhum conteudo transcrito disponivel para este video.'}
"""
    questions = generate_quiz_questions(context, 5)
    for existing in Question.query.filter_by(quizId=quiz.id).all():
        db.session.delete(existing)
    db.session.flush()

    for index, question_payload in enumerate(questions):
        question = Question(
            quizId=quiz.id,
            prompt=question_payload["prompt"],
            position=index,
        )
        db.session.add(question)
        db.session.flush()
        for option_payload in question_payload.get("options", []):
            db.session.add(
                Option(
                    questionId=question.id,
                    text=option_payload["text"],
                    isCorrect=bool(option_payload.get("isCorrect")),
                )
            )
    db.session.commit()
    return jsonify({"quizId": quiz.id, "questionsCount": len(questions)})


@api_bp.patch("/quiz/<quiz_id>")
def update_quiz(quiz_id: str):
    user = require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.chapter).joinedload(Chapter.course))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or quiz.chapter.course.userId != user["userId"]:
        return text_response("Unauthorized", 401)

    values = request.get_json(silent=True) or {}
    for key in ["isPublished", "isRequired", "maxQuestions", "timeLimit", "passingScore"]:
        if key in values:
            setattr(quiz, key, values[key])
    db.session.commit()
    return jsonify(serialize_quiz(quiz))


@api_bp.delete("/quiz/<quiz_id>")
def delete_quiz(quiz_id: str):
    user = require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.chapter).joinedload(Chapter.course))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or quiz.chapter.course.userId != user["userId"]:
        return text_response("Unauthorized", 401)
    db.session.delete(quiz)
    db.session.commit()
    return "", 204


@api_bp.post("/quiz/<quiz_id>/questions")
def create_question(quiz_id: str):
    user = require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.chapter).joinedload(Chapter.course), joinedload(Quiz.questions))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or quiz.chapter.course.userId != user["userId"]:
        return text_response("Unauthorized", 401)
    if len(quiz.questions) >= quiz.maxQuestions:
        return text_response(f"Limite de {quiz.maxQuestions} questoes atingido", 400)

    payload = request.get_json(silent=True) or {}
    last_position = max((question.position for question in quiz.questions), default=0)
    question = Question(
        quizId=quiz_id,
        prompt=payload.get("prompt", ""),
        isBonus=bool(payload.get("isBonus")),
        bonusPoints=payload.get("bonusPoints"),
        pointWeight=payload.get("pointWeight") or 1.0,
        position=last_position + 1,
    )
    db.session.add(question)
    db.session.commit()
    return jsonify(serialize_question(question))


@api_bp.patch("/quiz/<quiz_id>/questions/<question_id>")
def update_question(quiz_id: str, question_id: str):
    user = require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.chapter).joinedload(Chapter.course))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or quiz.chapter.course.userId != user["userId"]:
        return text_response("Unauthorized", 401)

    question = Question.query.filter_by(id=question_id, quizId=quiz_id).first()
    if not question:
        return text_response("Not found", 404)

    values = request.get_json(silent=True) or {}
    for key in ["prompt", "isBonus", "bonusPoints", "pointWeight", "position"]:
        if key in values:
            setattr(question, key, values[key])

    if "options" in values:
        Option.query.filter_by(questionId=question_id).delete()
        db.session.flush()
        for option_payload in values["options"]:
            db.session.add(
                Option(
                    questionId=question_id,
                    text=option_payload["text"],
                    isCorrect=bool(option_payload.get("isCorrect")),
                )
            )

    db.session.commit()
    question = Question.query.options(joinedload(Question.options)).filter_by(id=question_id).first()
    return jsonify(serialize_question(question))


@api_bp.delete("/quiz/<quiz_id>/questions/<question_id>")
def delete_question(quiz_id: str, question_id: str):
    user = require_user()
    quiz = (
        Quiz.query.options(joinedload(Quiz.chapter).joinedload(Chapter.course))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or quiz.chapter.course.userId != user["userId"]:
        return text_response("Unauthorized", 401)

    question = Question.query.filter_by(id=question_id, quizId=quiz_id).first()
    if not question:
        return text_response("Not found", 404)
    db.session.delete(question)
    db.session.commit()
    return "", 204


@api_bp.post("/quiz/<quiz_id>/submit")
def submit_quiz(quiz_id: str):
    user = require_user()
    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers", [])

    quiz = (
        Quiz.query.options(joinedload(Quiz.questions).joinedload(Question.options))
        .filter_by(id=quiz_id)
        .first()
    )
    if not quiz or not quiz.isPublished:
        return text_response("Quiz not found", 404)

    existing_result = QuizResult.query.filter_by(userId=user["userId"], quizId=quiz_id).first()
    if existing_result:
        return jsonify({"alreadySubmitted": True, "result": serialize_quiz_result(existing_result)})

    question_results = []
    for answer_payload in answers:
        question = next((item for item in quiz.questions if item.id == answer_payload.get("questionId")), None)
        if not question:
            continue
        option = next((item for item in question.options if item.id == answer_payload.get("optionId")), None)
        question_results.append(
            {
                "isCorrect": bool(option.isCorrect) if option else False,
                "isBonus": question.isBonus,
                "bonusPoints": question.bonusPoints,
                "pointWeight": question.pointWeight,
                "timeRemaining": answer_payload.get("timeRemaining"),
            }
        )
        if option:
            answer = Answer.query.filter_by(userId=user["userId"], questionId=question.id).first()
            if not answer:
                answer = Answer(userId=user["userId"], questionId=question.id, optionId=option.id)
                db.session.add(answer)
            else:
                answer.optionId = option.id

    score = calc_score(question_results)
    xp_earned = calc_quiz_xp(question_results)
    passed = score >= quiz.passingScore

    result = QuizResult(userId=user["userId"], quizId=quiz_id, score=score, xpEarned=xp_earned, passed=passed)
    db.session.add(result)

    user_xp = UserXP.query.filter_by(userId=user["userId"]).first()
    if not user_xp:
        user_xp = UserXP(userId=user["userId"], totalXp=xp_earned, level=1)
        db.session.add(user_xp)
        db.session.flush()
    else:
        user_xp.totalXp += xp_earned

    user_xp.level = calc_level(user_xp.totalXp)
    db.session.commit()

    return jsonify(
        {
            "result": serialize_quiz_result(result),
            "xpEarned": xp_earned,
            "score": score,
            "passed": passed,
            "totalXp": user_xp.totalXp,
        }
    )


@api_bp.get("/quiz/<quiz_id>/submit")
def get_quiz_result(quiz_id: str):
    user = require_user()
    result = QuizResult.query.filter_by(userId=user["userId"], quizId=quiz_id).first()
    return jsonify(serialize_quiz_result(result))


@api_bp.get("/users/role")
def get_user_role():
    user = require_user()
    profile = get_user_profile(user["userId"])
    role = profile.role if profile else None
    return jsonify(
        {
            "isTeacher": role in {RoleEnum.TEACHER, RoleEnum.ADMIN},
            "isAdmin": role == RoleEnum.ADMIN,
            "isStudent": role == RoleEnum.STUDENT,
        }
    )


@api_bp.get("/users/xp")
def get_user_xp():
    user = require_user()
    user_xp = UserXP.query.filter_by(userId=user["userId"]).first()
    if not user_xp:
        return jsonify(
            {
                "totalXp": 0,
                "level": 1,
                "levelLabel": LEVEL_LABELS[1],
                "progress": {"current": 0, "max": 200, "level": 1},
            }
        )
    return jsonify(
        {
            "totalXp": user_xp.totalXp,
            "level": user_xp.level,
            "levelLabel": LEVEL_LABELS.get(user_xp.level, "Especialista"),
            "progress": get_level_progress(user_xp.totalXp),
        }
    )


@api_bp.post("/profiles/onboard/student")
def onboard_student():
    user = require_user()
    profile = ensure_student_profile(user["userId"], user.get("email"), user.get("name"))
    streak = update_user_streak(user["userId"])
    return jsonify({"profile": serialize_profile(profile), "streakCount": streak.count})


@api_bp.post("/profiles/onboard/teacher")
def onboard_teacher():
    user = require_user()
    profile = ensure_teacher_profile(user["userId"], user.get("email"), user.get("name"))
    return jsonify({"profile": serialize_profile(profile)})


@api_bp.post("/profiles/become-teacher")
def become_teacher():
    user = require_user()
    profile = get_user_profile(user["userId"])
    if not profile:
        return jsonify({"error": "Perfil nao encontrado"}), 400
    if profile.role != RoleEnum.STUDENT:
        return jsonify({"error": "Voce ja e um professor ou administrador"}), 400
    profile.role = RoleEnum.TEACHER
    db.session.commit()
    return jsonify({"success": True, "profile": serialize_profile(profile)})


@api_bp.post("/profiles/promote-admin")
def promote_admin():
    user = require_user()
    profile = promote_admin_profile(user["userId"], user.get("email"), user.get("name"))
    return jsonify({"success": serialize_profile(profile)})


@api_bp.post("/profiles/streak")
def profile_streak():
    user = require_user()
    streak = update_user_streak(user["userId"])
    return jsonify({"count": streak.count})


@api_bp.get("/meta/courses/catalog")
def meta_catalog():
    user = require_user()
    title = request.args.get("title")
    category_id = request.args.get("categoryId")
    return jsonify(build_catalog_payload(user["userId"], title, category_id))


@api_bp.get("/meta/courses/<course_id>/progress")
def meta_progress(course_id: str):
    user = require_user()
    return jsonify({"progress": get_progress(user["userId"], course_id)})


@api_bp.get("/meta/dashboard-courses")
def meta_dashboard_courses():
    user = require_user()
    return jsonify(build_dashboard_courses(user["userId"]))


@api_bp.get("/meta/student-metrics")
def meta_student_metrics():
    user = require_user()
    return jsonify(build_student_metrics(user["userId"]))


@api_bp.get("/meta/teacher-analytics")
def meta_teacher_analytics():
    user = require_user()
    courses = (
        Course.query.options(joinedload(Course.chapters).joinedload(Chapter.userProgress))
        .filter_by(userId=user["userId"])
        .all()
    )
    data = []
    for course in courses:
        progress_records = [progress for chapter in course.chapters for progress in chapter.userProgress]
        total_enrollments = len({progress.userId for progress in progress_records})
        total_completed = len([progress for progress in progress_records if progress.isCompleted])
        completion_rate = round((total_completed / len(progress_records)) * 100) if progress_records else 0
        data.append({"name": course.title, "total": total_enrollments, "completionRate": completion_rate})

    return jsonify(
        {
            "data": data,
            "totalEnrollments": sum(item["total"] for item in data),
            "totalCourses": len(courses),
        }
    )


@api_bp.get("/meta/teacher/courses")
def meta_teacher_courses():
    user = require_user()
    courses = Course.query.filter_by(userId=user["userId"]).order_by(Course.createdAt.desc()).all()
    return jsonify([serialize_course(course) for course in courses])


@api_bp.get("/meta/teacher/courses/<course_id>")
def meta_teacher_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    payload = serialize_course(course, include_relations=True)
    payload["chapters"] = [
        serialize_chapter(chapter, include_relations=True) for chapter in sorted(course.chapters, key=lambda item: item.position)
    ]
    payload["attachments"] = [
        serialize_attachment(attachment) for attachment in sorted(course.attachments, key=lambda item: item.createdAt, reverse=True)
    ]
    payload["categories"] = [serialize_category(category) for category in Category.query.order_by(Category.name.asc()).all()]
    return jsonify(payload)


@api_bp.get("/meta/teacher/courses/<course_id>/chapters/<chapter_id>")
def meta_teacher_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.get("/meta/courses/<course_id>")
def meta_public_course(course_id: str):
    course = (
        Course.query.options(joinedload(Course.chapters))
        .filter_by(id=course_id)
        .first()
    )
    if not course:
        return text_response("Not found", 404)

    payload = serialize_course(course)
    payload["chapters"] = [
        serialize_chapter(chapter) for chapter in sorted(course.chapters, key=lambda item: item.position) if chapter.isPublished
    ]
    return jsonify(payload)


@api_bp.get("/meta/courses/<course_id>/layout")
def meta_course_layout(course_id: str):
    user = require_user()
    course = (
        Course.query.options(joinedload(Course.chapters).joinedload(Chapter.userProgress))
        .filter_by(id=course_id)
        .first()
    )
    if not course:
        return text_response("Not found", 404)

    purchase = Purchase.query.filter_by(userId=user["userId"], courseId=course_id).first()
    progress_count = get_progress(user["userId"], course_id)
    progress_map = {
        chapter.id: [serialize_progress(item) for item in chapter.userProgress if item.userId == user["userId"]]
        for chapter in course.chapters
    }

    payload = serialize_course(course)
    payload["chapters"] = [
        serialize_chapter(chapter, progress_map=progress_map) for chapter in sorted(course.chapters, key=lambda item: item.position) if chapter.isPublished
    ]
    payload["progressCount"] = progress_count
    payload["isEnrolled"] = bool(purchase)
    return jsonify(payload)


@api_bp.get("/meta/dashboard")
def meta_dashboard():
    user = require_user()
    profile = get_user_profile(user["userId"])
    is_teacher = profile and profile.role in {RoleEnum.TEACHER, RoleEnum.ADMIN}
    if is_teacher:
        courses = (
            Course.query.options(joinedload(Course.category), joinedload(Course.chapters))
            .filter_by(userId=user["userId"])
            .order_by(Course.updatedAt.desc())
            .all()
        )
        return jsonify(
            {
                "mode": "teacher",
                "courses": [
                    {
                        **serialize_course(course),
                        "chapters": [
                            {
                                "id": chapter.id,
                                "isPublished": chapter.isPublished,
                                "videoSourceType": chapter.videoSourceType.value if chapter.videoSourceType else None,
                            }
                            for chapter in course.chapters
                        ],
                    }
                    for course in courses
                ],
                "stats": {
                    "totalCourses": len(courses),
                    "publishedCourses": len([course for course in courses if course.isPublished]),
                    "draftCourses": len([course for course in courses if not course.isPublished]),
                    "pendingChapters": sum(
                        len([chapter for chapter in course.chapters if not chapter.videoSourceType]) for course in courses
                    ),
                },
            }
        )

    return jsonify({"mode": "student", **build_student_metrics(user["userId"])})
