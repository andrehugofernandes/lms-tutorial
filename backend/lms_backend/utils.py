import random
from datetime import datetime
from google.cloud import firestore

def iso(dt):
    if not dt:
        return None
    if hasattr(dt, 'isoformat'):
        return dt.isoformat()
    # Handle Firestore timestamps
    if hasattr(dt, 'to_datetime'):
        return dt.to_datetime().isoformat()
    return str(dt)


def serialize_profile(profile: dict | None) -> dict | None:
    if not profile:
        return None
    return {
        "id": profile.get("id"),
        "userId": profile.get("userId"),
        "name": profile.get("name"),
        "email": profile.get("email"),
        "role": profile.get("role"),
        "createdAt": iso(profile.get("createdAt")),
        "updatedAt": iso(profile.get("updatedAt")),
    }


def serialize_category(category: dict | None) -> dict | None:
    if not category:
        return None
    return {"id": category.get("id"), "name": category.get("name")}


def serialize_attachment(attachment: dict) -> dict:
    return {
        "id": attachment.get("id"),
        "name": attachment.get("name"),
        "url": attachment.get("url"),
        "courseId": attachment.get("courseId"),
        "createdAt": iso(attachment.get("createdAt")),
        "updatedAt": iso(attachment.get("updatedAt")),
    }


def serialize_mux_data(mux_data: dict | None) -> dict | None:
    if not mux_data:
        return None
    return {
        "id": mux_data.get("id"),
        "assetId": mux_data.get("assetId"),
        "playbackId": mux_data.get("playbackId"),
        "chapterId": mux_data.get("chapterId"),
    }


def serialize_option(option: dict, include_correct: bool = True) -> dict:
    payload = {"id": option.get("id"), "text": option.get("text")}
    if include_correct:
        payload["isCorrect"] = option.get("isCorrect")
    return payload


def serialize_question(
    question: dict,
    include_correct: bool = True,
    shuffle_options: bool = False,
) -> dict:
    options = sorted(question.get("options", []), key=lambda item: item.get("createdAt") or datetime.utcnow().isoformat())
    if shuffle_options:
        options = options[:]
        random.shuffle(options)

    return {
        "id": question.get("id"),
        "quizId": question.get("quizId"),
        "prompt": question.get("prompt"),
        "position": question.get("position"),
        "isBonus": question.get("isBonus"),
        "bonusPoints": question.get("bonusPoints"),
        "pointWeight": question.get("pointWeight"),
        "options": [serialize_option(opt, include_correct) for opt in options],
    }


def serialize_quiz(quiz: dict | None, include_correct: bool = True) -> dict | None:
    if not quiz:
        return None
    questions = sorted(quiz.get("questions", []), key=lambda item: item.get("position", 0))
    should_shuffle_for_student = quiz.get("shuffleQuestions", False) and not include_correct

    return {
        "id": quiz.get("id"),
        "chapterId": quiz.get("chapterId"),
        "isPublished": quiz.get("isPublished"),
        "isRequired": quiz.get("isRequired"),
        "shuffleQuestions": quiz.get("shuffleQuestions", False),
        "maxQuestions": quiz.get("maxQuestions", 5),
        "passingScore": quiz.get("passingScore", 70),
        "timeLimit": quiz.get("timeLimit"),
        "createdAt": iso(quiz.get("createdAt")),
        "updatedAt": iso(quiz.get("updatedAt")),
        "questions": [
            serialize_question(
                q,
                include_correct,
                shuffle_options=should_shuffle_for_student,
            )
            for q in questions
        ],
    }


def serialize_progress(progress: dict | None) -> dict | None:
    if not progress:
        return None
    return {
        "id": progress.get("id"),
        "userId": progress.get("userId"),
        "chapterId": progress.get("chapterId"),
        "isCompleted": progress.get("isCompleted"),
        "createdAt": iso(progress.get("createdAt")),
        "updatedAt": iso(progress.get("updatedAt")),
    }


def serialize_chapter(
    chapter: dict,
    include_relations: bool = False,
    progress_map: dict | None = None,
    include_transcript: bool = True,
) -> dict:
    payload = {
        "id": chapter.get("id"),
        "title": chapter.get("title"),
        "description": chapter.get("description"),
        "duration": chapter.get("duration"),
        "videoSourceType": chapter.get("videoSourceType"),
        "videoUrl": chapter.get("videoUrl"),
        "externalUrl": chapter.get("externalUrl"),
        "embedUrl": chapter.get("embedUrl"),
        "videoProvider": chapter.get("videoProvider"),
        "transcriptStatus": chapter.get("transcriptStatus"),
        "position": chapter.get("position"),
        "isPublished": chapter.get("isPublished"),
        "isFree": chapter.get("isFree"),
        "courseId": chapter.get("courseId"),
        "createdAt": iso(chapter.get("createdAt")),
        "updatedAt": iso(chapter.get("updatedAt")),
    }
    if include_transcript:
        payload["transcript"] = chapter.get("transcript")
    if include_relations:
        payload["muxData"] = chapter.get("muxData")
        payload["quiz"] = chapter.get("quiz")
    if progress_map is not None:
        payload["userProgress"] = progress_map.get(chapter.get("id"), [])
    return payload


def serialize_course(course: dict, include_relations: bool = False, progress: float | None = None) -> dict:
    payload = {
        "id": course.get("id"),
        "userId": course.get("userId"),
        "title": course.get("title"),
        "description": course.get("description"),
        "imageUrl": course.get("imageUrl"),
        "price": course.get("price"),
        "isPublished": course.get("isPublished"),
        "categoryId": course.get("categoryId"),
        "createdAt": iso(course.get("createdAt")),
        "updatedAt": iso(course.get("updatedAt")),
        "category": course.get("category"),
    }
    if include_relations:
        payload["chapters"] = course.get("chapters", [])
        payload["attachments"] = course.get("attachments", [])
    if progress is not None:
        payload["progress"] = progress
    return payload


def serialize_note(note: dict) -> dict:
    return {
        "id": note.get("id"),
        "userId": note.get("userId"),
        "chapterId": note.get("chapterId"),
        "content": note.get("content"),
        "timestamp": note.get("timestamp"),
        "createdAt": iso(note.get("createdAt")),
        "updatedAt": iso(note.get("updatedAt")),
    }


def serialize_forum_post(
    post: dict,
    author_name: str | None = None,
    current_user_id: str | None = None,
) -> dict:
    return {
        "id": post.get("id"),
        "userId": post.get("userId"),
        "courseId": post.get("courseId"),
        "chapterId": post.get("chapterId"),
        "content": post.get("content"),
        "authorName": author_name or "Aluno",
        "isMine": post.get("userId") == current_user_id if current_user_id else False,
        "createdAt": iso(post.get("createdAt")),
        "updatedAt": iso(post.get("updatedAt")),
    }


def serialize_user_xp(user_xp: dict | None) -> dict:
    if not user_xp:
        return {"totalXp": 0, "level": 1}
    return {"totalXp": user_xp.get("totalXp", 0), "level": user_xp.get("level", 1)}


def serialize_quiz_result(result: dict | None) -> dict | None:
    if not result:
        return None
    return {
        "id": result.get("id"),
        "userId": result.get("userId"),
        "quizId": result.get("quizId"),
        "score": result.get("score"),
        "xpEarned": result.get("xpEarned"),
        "passed": result.get("passed"),
        "createdAt": iso(result.get("createdAt")),
    }


def serialize_achievement(achievement: dict) -> dict:
    return {
        "id": achievement.get("id"),
        "userId": achievement.get("userId"),
        "courseId": achievement.get("courseId"),
        "title": achievement.get("title"),
        "description": achievement.get("description"),
        "icon": achievement.get("icon"),
        "createdAt": iso(achievement.get("createdAt")),
    }
