from datetime import datetime

from .models import (
    Achievement,
    Attachment,
    Category,
    Chapter,
    Course,
    MuxData,
    Option,
    Profile,
    Question,
    Quiz,
    QuizResult,
    UserNote,
    UserProgress,
    UserXP,
)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def serialize_profile(profile: Profile | None) -> dict | None:
    if not profile:
        return None
    return {
        "id": profile.id,
        "userId": profile.userId,
        "name": profile.name,
        "email": profile.email,
        "role": profile.role.value if hasattr(profile.role, "value") else profile.role,
        "createdAt": iso(profile.createdAt),
        "updatedAt": iso(profile.updatedAt),
    }


def serialize_category(category: Category | None) -> dict | None:
    if not category:
        return None
    return {"id": category.id, "name": category.name}


def serialize_attachment(attachment: Attachment) -> dict:
    return {
        "id": attachment.id,
        "name": attachment.name,
        "url": attachment.url,
        "courseId": attachment.courseId,
        "createdAt": iso(attachment.createdAt),
        "updatedAt": iso(attachment.updatedAt),
    }


def serialize_mux_data(mux_data: MuxData | None) -> dict | None:
    if not mux_data:
        return None
    return {
        "id": mux_data.id,
        "assetId": mux_data.assetId,
        "playbackId": mux_data.playbackId,
        "chapterId": mux_data.chapterId,
    }


def serialize_option(option: Option, include_correct: bool = True) -> dict:
    payload = {"id": option.id, "text": option.text}
    if include_correct:
        payload["isCorrect"] = option.isCorrect
    return payload


def serialize_question(question: Question, include_correct: bool = True) -> dict:
    return {
        "id": question.id,
        "quizId": question.quizId,
        "prompt": question.prompt,
        "position": question.position,
        "isBonus": question.isBonus,
        "bonusPoints": question.bonusPoints,
        "pointWeight": question.pointWeight,
        "options": [serialize_option(option, include_correct) for option in sorted(question.options, key=lambda item: item.createdAt or datetime.utcnow())],
    }


def serialize_quiz(quiz: Quiz | None, include_correct: bool = True) -> dict | None:
    if not quiz:
        return None
    return {
        "id": quiz.id,
        "chapterId": quiz.chapterId,
        "isPublished": quiz.isPublished,
        "isRequired": quiz.isRequired,
        "maxQuestions": quiz.maxQuestions,
        "passingScore": quiz.passingScore,
        "timeLimit": quiz.timeLimit,
        "createdAt": iso(quiz.createdAt),
        "updatedAt": iso(quiz.updatedAt),
        "questions": [serialize_question(question, include_correct) for question in sorted(quiz.questions, key=lambda item: item.position)],
    }


def serialize_progress(progress: UserProgress | None) -> dict | None:
    if not progress:
        return None
    return {
        "id": progress.id,
        "userId": progress.userId,
        "chapterId": progress.chapterId,
        "isCompleted": progress.isCompleted,
        "createdAt": iso(progress.createdAt),
        "updatedAt": iso(progress.updatedAt),
    }


def serialize_chapter(chapter: Chapter, include_relations: bool = False, progress_map: dict | None = None) -> dict:
    payload = {
        "id": chapter.id,
        "title": chapter.title,
        "description": chapter.description,
        "duration": chapter.duration,
        "videoSourceType": chapter.videoSourceType.value if chapter.videoSourceType else None,
        "videoUrl": chapter.videoUrl,
        "externalUrl": chapter.externalUrl,
        "embedUrl": chapter.embedUrl,
        "videoProvider": chapter.videoProvider.value if chapter.videoProvider else None,
        "transcript": chapter.transcript,
        "transcriptStatus": chapter.transcriptStatus.value if chapter.transcriptStatus else None,
        "position": chapter.position,
        "isPublished": chapter.isPublished,
        "isFree": chapter.isFree,
        "courseId": chapter.courseId,
        "createdAt": iso(chapter.createdAt),
        "updatedAt": iso(chapter.updatedAt),
    }
    if include_relations:
        payload["muxData"] = serialize_mux_data(chapter.muxData)
        payload["quiz"] = serialize_quiz(chapter.quiz, include_correct=True) if chapter.quiz else None
    if progress_map is not None:
        payload["userProgress"] = progress_map.get(chapter.id, [])
    return payload


def serialize_course(course: Course, include_relations: bool = False, progress: float | None = None) -> dict:
    payload = {
        "id": course.id,
        "userId": course.userId,
        "title": course.title,
        "description": course.description,
        "imageUrl": course.imageUrl,
        "price": course.price,
        "isPublished": course.isPublished,
        "categoryId": course.categoryId,
        "createdAt": iso(course.createdAt),
        "updatedAt": iso(course.updatedAt),
        "category": serialize_category(course.category) if course.category else None,
    }
    if include_relations:
        payload["chapters"] = [serialize_chapter(chapter, include_relations=True) for chapter in sorted(course.chapters, key=lambda item: item.position)]
        payload["attachments"] = [serialize_attachment(attachment) for attachment in sorted(course.attachments, key=lambda item: item.createdAt or datetime.utcnow(), reverse=True)]
    if progress is not None:
        payload["progress"] = progress
    return payload


def serialize_note(note: UserNote) -> dict:
    return {
        "id": note.id,
        "userId": note.userId,
        "chapterId": note.chapterId,
        "content": note.content,
        "timestamp": note.timestamp,
        "createdAt": iso(note.createdAt),
        "updatedAt": iso(note.updatedAt),
    }


def serialize_user_xp(user_xp: UserXP | None) -> dict:
    if not user_xp:
        return {"totalXp": 0, "level": 1}
    return {"totalXp": user_xp.totalXp, "level": user_xp.level}


def serialize_quiz_result(result: QuizResult | None) -> dict | None:
    if not result:
        return None
    return {
        "id": result.id,
        "userId": result.userId,
        "quizId": result.quizId,
        "score": result.score,
        "xpEarned": result.xpEarned,
        "passed": result.passed,
        "completedAt": iso(result.completedAt),
    }


def serialize_achievement(achievement: Achievement) -> dict:
    return {
        "id": achievement.id,
        "userId": achievement.userId,
        "courseId": achievement.courseId,
        "title": achievement.title,
        "description": achievement.description,
        "icon": achievement.icon,
        "createdAt": iso(achievement.createdAt),
    }
