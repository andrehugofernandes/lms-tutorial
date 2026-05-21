from datetime import datetime
import time
from flask import Blueprint, jsonify, request
from firebase_admin import firestore
from .auth import AuthError, get_current_user, get_user_profile, require_roles
from .extensions import fdb
from .models import (
    RoleEnum,
    TranscriptStatusEnum,
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
    generate_replacement_questions,
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
    serialize_forum_post,
    serialize_mux_data,
    serialize_note,
    serialize_profile,
    serialize_progress,
    serialize_question,
    serialize_quiz,
    serialize_quiz_result,
)


api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.before_request
def log_request_info():
    print(f"DEBUG: Incoming request: {request.method} {request.url}")

@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


def text_response(message: str, status: int):
    return message, status, {"Content-Type": "text/plain; charset=utf-8"}


def transcript_status_payload(chapter: dict, status: str, message: str) -> dict:
    return {
        "status": status,
        "message": message,
        "transcriptStatus": chapter.get("transcriptStatus"),
        "hasTranscript": bool((chapter.get("transcript") or "").strip()),
    }


def require_user():
    return get_current_user(optional=False)


def require_course_owner(course_id: str, user_id: str) -> dict:
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists:
        raise AuthError("Not found", 404)
    
    course = course_doc.to_dict()
    if course.get("userId") != user_id:
        raise AuthError("Unauthorized", 401)
    
    # Fill relations (Firestore doesn't have joinedload)
    course["id"] = course_doc.id
    course["chapters"] = [doc.to_dict() for doc in fdb.collection('chapters').where('courseId', '==', course_id).get()]
    course["attachments"] = [doc.to_dict() for doc in fdb.collection('attachments').where('courseId', '==', course_id).get()]
    
    return course


def require_chapter_owner(course_id: str, chapter_id: str, user_id: str) -> dict:
    require_course_owner(course_id, user_id)
    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id:
        raise AuthError("Not found", 404)
    
    chapter = chapter_doc.to_dict()
    chapter["id"] = chapter_doc.id
    
    # Fill relations
    mux_data_query = fdb.collection('muxData').where('chapterId', '==', chapter_id).limit(1).get()
    chapter["muxData"] = mux_data_query[0].to_dict() if mux_data_query else None
    
    quiz_query = fdb.collection('quizzes').where('chapterId', '==', chapter_id).limit(1).get()
    if quiz_query:
        quiz = quiz_query[0].to_dict()
        quiz["id"] = quiz_query[0].id
        quiz["questions"] = []
        for q_doc in fdb.collection('questions').where('quizId', '==', quiz["id"]).get():
            q = q_doc.to_dict()
            q["id"] = q_doc.id
            q["options"] = [o.to_dict() for o in fdb.collection('options').where('questionId', '==', q["id"]).get()]
            quiz["questions"].append(q)
        chapter["quiz"] = quiz
    else:
        chapter["quiz"] = None

    return chapter



def ensure_purchase(user_id: str, course_id: str, last_chapter_id: str | None = None) -> dict:
    purchase_query = fdb.collection('purchases').where('userId', '==', user_id).where('courseId', '==', course_id).limit(1).get()
    
    if not purchase_query:
        purchase_data = {
            "userId": user_id, 
            "courseId": course_id, 
            "lastChapterId": last_chapter_id,
            "createdAt": datetime.utcnow()
        }
        ref = fdb.collection('purchases').document()
        ref.set(purchase_data)
        purchase_data["id"] = ref.id
        return purchase_data
    else:
        purchase_doc = purchase_query[0]
        purchase_data = purchase_doc.to_dict()
        if last_chapter_id:
            purchase_doc.reference.update({"lastChapterId": last_chapter_id})
            purchase_data["lastChapterId"] = last_chapter_id
        return purchase_data


def can_access_course(user_id: str, course: dict | None) -> bool:
    if not course:
        return False
    if course.get("userId") == user_id:
        return True
    purchase_query = fdb.collection('purchases')\
        .where('userId', '==', user_id)\
        .where('courseId', '==', course.get("id"))\
        .limit(1).get()
    return bool(purchase_query)


def build_catalog_payload(user_id: str, title: str | None, category_id: str | None):
    query = fdb.collection('courses').where('isPublished', '==', True)
    
    # Firestore doesn't support ilike naturally, but we can filter by prefix or do client-side filtering for demo
    courses_docs = query.get()
    
    # Get user purchases
    purchases = {p.to_dict().get("courseId") for p in fdb.collection('purchases').where('userId', '==', user_id).get()}

    payload = []
    for doc in courses_docs:
        course = doc.to_dict()
        course["id"] = doc.id
        
        # Filtering (Firestore limited where)
        if title and title.lower() not in course.get("title", "").lower():
            continue
        if category_id and course.get("categoryId") != category_id:
            continue
            
        progress = get_progress(user_id, course["id"]) if course["id"] in purchases else None
        
        # Category relation
        cat_id = course.get("categoryId")
        if cat_id:
            cat_doc = fdb.collection('categories').document(cat_id).get()
            course["category"] = cat_doc.to_dict() if cat_doc.exists else None
        
        course_payload = serialize_course(course, progress=progress)
        # Chapters
        chapters = [c.to_dict() for c in fdb.collection('chapters')
                    .where('courseId', '==', course["id"])
                    .where('isPublished', '==', True)
                    .get()]
        course_payload["chapters"] = [serialize_chapter({**c, "id": c.get("id")}, include_transcript=False) for c in sorted(chapters, key=lambda x: x.get("position", 0))]
        payload.append(course_payload)
        
    return payload


def build_course_leaderboard(course_id: str, current_user_id: str, limit: int = 10) -> dict:
    chapters = fdb.collection('chapters').where('courseId', '==', course_id).get()
    chapter_ids = {c.id for c in chapters}
    
    quizzes = fdb.collection('quizzes').get()
    quiz_ids = {q.id for q in quizzes if q.to_dict().get("chapterId") in chapter_ids}
    
    if not quiz_ids:
        return {
            "top": [],
            "currentUser": None,
            "totalParticipants": 0,
        }

    results_docs = fdb.collection('quizResults').get()
    results = [r.to_dict() for r in results_docs if r.to_dict().get("quizId") in quiz_ids]

    user_aggregates = {}
    for r in results:
        u_id = r.get("userId")
        if not u_id:
            continue
        if u_id not in user_aggregates:
            user_aggregates[u_id] = {
                "userId": u_id,
                "totalXp": 0,
                "totalScore": 0,
                "count": 0,
                "passedCount": 0
            }
        agg = user_aggregates[u_id]
        agg["totalXp"] += r.get("xpEarned", 0)
        agg["totalScore"] += r.get("score", 0)
        agg["count"] += 1
        if r.get("passed"):
            agg["passedCount"] += 1

    rows = []
    for u_id, agg in user_aggregates.items():
        rows.append({
            "userId": u_id,
            "totalXp": agg["totalXp"],
            "averageScore": agg["totalScore"] / agg["count"] if agg["count"] > 0 else 0,
            "quizzesCompleted": agg["count"],
            "passedCount": agg["passedCount"]
        })
        
    rows.sort(key=lambda x: (-x["totalXp"], -x["averageScore"], -x["quizzesCompleted"]))

    user_ids = [row["userId"] for row in rows]
    profile_map = {}
    if user_ids:
        for i in range(0, len(user_ids), 30):
            chunk = user_ids[i:i+30]
            p_docs = fdb.collection('profiles').where('userId', 'in', chunk).get()
            for p_doc in p_docs:
                p_data = p_doc.to_dict()
                profile_map[p_data.get("userId")] = p_data

    ranked = []
    for rank, row in enumerate(rows, start=1):
        profile = profile_map.get(row["userId"])
        ranked.append(
            {
                "rank": rank,
                "userId": row["userId"],
                "name": (profile.get("name") or profile.get("email") if profile else None) or "Aluno",
                "totalXp": int(row["totalXp"] or 0),
                "averageScore": round(float(row["averageScore"] or 0), 1),
                "quizzesCompleted": int(row["quizzesCompleted"] or 0),
                "passedCount": int(row["passedCount"] or 0),
                "isCurrentUser": row["userId"] == current_user_id,
            }
        )

    return {
        "top": ranked[:limit],
        "currentUser": next((item for item in ranked if item["userId"] == current_user_id), None),
        "totalParticipants": len(ranked),
    }


def build_global_leaderboard(current_user_id: str, limit: int = 20) -> dict:
    results_docs = fdb.collection('quizResults').get()
    results = [r.to_dict() for r in results_docs]

    user_aggregates = {}
    for r in results:
        u_id = r.get("userId")
        if not u_id:
            continue
        if u_id not in user_aggregates:
            user_aggregates[u_id] = {
                "userId": u_id,
                "totalXp": 0,
                "totalScore": 0,
                "count": 0,
                "passedCount": 0
            }
        agg = user_aggregates[u_id]
        agg["totalXp"] += r.get("xpEarned", 0)
        agg["totalScore"] += r.get("score", 0)
        agg["count"] += 1
        if r.get("passed"):
            agg["passedCount"] += 1

    rows = []
    for u_id, agg in user_aggregates.items():
        rows.append({
            "userId": u_id,
            "totalXp": agg["totalXp"],
            "averageScore": agg["totalScore"] / agg["count"] if agg["count"] > 0 else 0,
            "quizzesCompleted": agg["count"],
            "passedCount": agg["passedCount"]
        })
        
    rows.sort(key=lambda x: (-x["totalXp"], -x["averageScore"], -x["quizzesCompleted"]))

    user_ids = [row["userId"] for row in rows]
    profile_map = {}
    if user_ids:
        for i in range(0, len(user_ids), 30):
            chunk = user_ids[i:i+30]
            p_docs = fdb.collection('profiles').where('userId', 'in', chunk).get()
            for p_doc in p_docs:
                p_data = p_doc.to_dict()
                profile_map[p_data.get("userId")] = p_data

    ranked = []
    for rank, row in enumerate(rows, start=1):
        profile = profile_map.get(row["userId"])
        ranked.append(
            {
                "rank": rank,
                "userId": row["userId"],
                "name": (profile.get("name") or profile.get("email") if profile else None) or "Aluno",
                "totalXp": int(row["totalXp"] or 0),
                "averageScore": round(float(row["averageScore"] or 0), 1),
                "quizzesCompleted": int(row["quizzesCompleted"] or 0),
                "passedCount": int(row["passedCount"] or 0),
                "isCurrentUser": row["userId"] == current_user_id,
            }
        )

    return {
        "top": ranked[:limit],
        "currentUser": next((item for item in ranked if item["userId"] == current_user_id), None),
        "totalParticipants": len(ranked),
    }


def build_dashboard_courses(user_id: str):
    purchases_docs = fdb.collection('purchases').where('userId', '==', user_id).get()
    if not purchases_docs:
        return {"completedCourses": [], "coursesInProgress": []}

    course_ids = [p.to_dict().get("courseId") for p in purchases_docs]
    purchases_by_course = {p.to_dict().get("courseId"): p.to_dict() for p in purchases_docs}

    completed_courses = []
    courses_in_progress = []
    
    for course_id in course_ids:
        course_doc = fdb.collection('courses').document(course_id).get()
        if not course_doc.exists:
            continue
            
        course = course_doc.to_dict()
        course["id"] = course_doc.id
        
        progress = get_progress(user_id, course_id)
        
        # Category
        cat_id = course.get("categoryId")
        if cat_id:
            cat_doc = fdb.collection('categories').document(cat_id).get()
            course["category"] = cat_doc.to_dict() if cat_doc.exists else None

        course_payload = serialize_course(course, progress=progress)
        
        # Chapters
        chapters = [c.to_dict() for c in fdb.collection('chapters')
                    .where('courseId', '==', course_id)
                    .where('isPublished', '==', True)
                    .get()]
        course_payload["chapters"] = [serialize_chapter(c) for c in sorted(chapters, key=lambda x: x.get("position", 0))]
        
        purchase = purchases_by_course.get(course_id)
        last_chapter_id = purchase.get("lastChapterId")
        
        course_payload["lastChapter"] = next(
            (c for c in course_payload["chapters"] if c.get("id") == last_chapter_id),
            course_payload["chapters"][0] if course_payload["chapters"] else None
        )
        
        if progress == 100:
            completed_courses.append(course_payload)
        else:
            courses_in_progress.append(course_payload)
            
    return {"completedCourses": completed_courses, "coursesInProgress": courses_in_progress}


def build_student_metrics(user_id: str):
    purchases_docs = fdb.collection('purchases').where('userId', '==', user_id).get()
    course_ids = [p.to_dict().get("courseId") for p in purchases_docs]
    
    courses_data = []
    for c_id in course_ids:
        c_doc = fdb.collection('courses').document(c_id).get()
        if c_doc.exists:
            c_data = c_doc.to_dict()
            c_data["id"] = c_doc.id
            chap_docs = fdb.collection('chapters').where('courseId', '==', c_id).get()
            c_data["chapters"] = [ch.to_dict() for ch in chap_docs]
            courses_data.append(c_data)

    completed_progress = {
        p.to_dict().get("chapterId")
        for p in fdb.collection('userProgress').where('userId', '==', user_id).where('isCompleted', '==', True).get()
    }
    
    achievement_docs = fdb.collection('achievements').where('userId', '==', user_id).get()
    user_streak = update_user_streak(user_id)

    total_minutes_watched = 0
    total_minutes_target = 0
    completed_courses_count = 0
    courses_in_progress = []
    purchases_by_course = {p.to_dict().get("courseId"): p.to_dict() for p in purchases_docs}

    for course in courses_data:
        published_chapters = [ch for ch in course.get("chapters", []) if ch.get("isPublished")]
        total_minutes_target += sum(ch.get("duration") or 0 for ch in published_chapters)
        completed_chapters = [ch for ch in published_chapters if ch.get("id") in completed_progress]
        total_minutes_watched += sum(ch.get("duration") or 0 for ch in completed_chapters)

        progress = 0 if not published_chapters else round((len(completed_chapters) / len(published_chapters)) * 100, 2)
        if progress == 100:
            completed_courses_count += 1
        else:
            purchase = purchases_by_course.get(course["id"])
            payload = serialize_course(course, progress=progress)
            payload["chapters"] = [serialize_chapter(ch) for ch in published_chapters]
            payload["lastChapter"] = next(
                (serialize_chapter(ch) for ch in published_chapters if purchase and ch.get("id") == purchase.get("lastChapterId")),
                serialize_chapter(published_chapters[0]) if published_chapters else None,
            )
            courses_in_progress.append(payload)

    return {
        "totalHoursWatched": round(total_minutes_watched / 60, 1),
        "totalHoursTarget": round(total_minutes_target / 60, 1),
        "completedCoursesCount": completed_courses_count,
        "coursesInProgress": courses_in_progress,
        "achievements": [serialize_achievement({**d.to_dict(), "id": d.id}) for d in achievement_docs],
        "streakCount": user_streak.get("count", 0),
    }


@api_bp.get("/categories")
def list_categories():
    categories_docs = fdb.collection('categories').order_by('name').get()
    return jsonify([serialize_category({**d.to_dict(), "id": d.id}) for d in categories_docs])


@api_bp.post("/categories")
def create_category():
    user = require_user()
    require_roles(user["userId"], [RoleEnum.TEACHER, RoleEnum.ADMIN])
    name = (request.get_json(silent=True) or {}).get("name", "").strip()
    if not name:
        return text_response("Name is required", 400)

    category_data = {"name": name}
    ref = fdb.collection('categories').add(category_data)
    category_data["id"] = ref[1].id
    return jsonify(serialize_category(category_data))


@api_bp.post("/courses")
def create_course():
    user = require_user()
    require_roles(user["userId"], [RoleEnum.TEACHER, RoleEnum.ADMIN])
    title = (request.get_json(silent=True) or {}).get("title", "").strip()
    if not title:
        return text_response("Bad Request", 400)

    course_data = {
        "userId": user["userId"],
        "title": title,
        "description": None,
        "imageUrl": None,
        "price": 0.0,
        "isPublished": False,
        "categoryId": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    ref = fdb.collection('courses').document()
    ref.set(course_data)
    course_data["id"] = ref.id
    
    return jsonify(serialize_course(course_data)), 201


@api_bp.patch("/courses/<course_id>")
def update_course(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    values = request.get_json(silent=True) or {}

    update_payload = {}
    for key in ["title", "description", "imageUrl", "price", "categoryId"]:
        if key in values:
            update_payload[key] = values[key]
    
    if update_payload:
        update_payload["updatedAt"] = datetime.utcnow()
        fdb.collection('courses').document(course_id).update(update_payload)

    # Get updated course
    course_doc = fdb.collection('courses').document(course_id).get()
    course = course_doc.to_dict()
    course["id"] = course_doc.id
    
    return jsonify(serialize_course(course))


@api_bp.delete("/courses/<course_id>")
def delete_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])

    # Delete chapters and their related data
    chapters_query = fdb.collection('chapters').where('courseId', '==', course_id).get()
    for chap_doc in chapters_query:
        chap_id = chap_doc.id
        
        # Delete Mux Data
        mux_query = fdb.collection('muxData').where('chapterId', '==', chap_id).limit(1).get()
        if mux_query:
            mux_data = mux_query[0].to_dict()
            if mux_data.get("assetId"):
                delete_mux_asset(mux_data.get("assetId"))
            mux_query[0].reference.delete()
            
        # Delete Quizzes
        quiz_query = fdb.collection('quizzes').where('chapterId', '==', chap_id).limit(1).get()
        if quiz_query:
            quiz_id = quiz_query[0].id
            # Delete questions and options
            q_query = fdb.collection('questions').where('quizId', '==', quiz_id).get()
            for q_doc in q_query:
                o_query = fdb.collection('options').where('questionId', '==', q_doc.id).get()
                for o_doc in o_query:
                    o_doc.reference.delete()
                q_doc.reference.delete()
            quiz_query[0].reference.delete()
            
        chap_doc.reference.delete()

    # Delete attachments
    att_query = fdb.collection('attachments').where('courseId', '==', course_id).get()
    for att_doc in att_query:
        att_doc.reference.delete()

    # Delete course itself
    fdb.collection('courses').document(course_id).delete()
    
    return jsonify(serialize_course(course))


@api_bp.patch("/courses/<course_id>/publish")
def publish_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])

    missing_fields = []
    if not (course.get("title") or "").strip():
        missing_fields.append("titulo do curso")
    if not (course.get("description") or "").strip():
        missing_fields.append("descricao do curso")
    if not course.get("imageUrl"):
        missing_fields.append("imagem de capa")
    if not course.get("categoryId"):
        missing_fields.append("categoria do curso")
        
    chapters = [c for c in course.get("chapters", []) if c.get("isPublished")]
    if not chapters:
        missing_fields.append("pelo menos 1 capitulo publicado")

    if missing_fields:
        return text_response(f"Campos obrigatorios faltando: {', '.join(missing_fields)}", 400)

    fdb.collection('courses').document(course_id).update({"isPublished": True, "updatedAt": datetime.utcnow()})
    course["isPublished"] = True
    
    return jsonify(serialize_course(course))


@api_bp.patch("/courses/<course_id>/unpublish")
def unpublish_course(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    
    fdb.collection('courses').document(course_id).update({"isPublished": False, "updatedAt": datetime.utcnow()})
    
    course_doc = fdb.collection('courses').document(course_id).get()
    course = course_doc.to_dict()
    course["id"] = course_doc.id
    
    return jsonify(serialize_course(course))


@api_bp.post("/courses/<course_id>/attachments")
def create_attachment(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    url = (request.get_json(silent=True) or {}).get("url")
    if not url:
        return text_response("Bad Request", 400)

    attachment_data = {
        "courseId": course_id,
        "url": url,
        "name": url.rstrip("/").split("/")[-1] or "arquivo",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    ref = fdb.collection('attachments').document()
    ref.set(attachment_data)
    attachment_data["id"] = ref.id
    return jsonify(serialize_attachment(attachment_data))


@api_bp.delete("/courses/<course_id>/attachments/<attachment_id>")
def delete_attachment(course_id: str, attachment_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    att_ref = fdb.collection('attachments').document(attachment_id)
    att_doc = att_ref.get()
    if not att_doc.exists or att_doc.to_dict().get("courseId") != course_id:
        return text_response("Not found", 404)
    
    data = att_doc.to_dict()
    data["id"] = att_doc.id
    att_ref.delete()
    return jsonify(serialize_attachment(data))


@api_bp.post("/courses/<course_id>/chapters")
def create_chapter(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    title = (request.get_json(silent=True) or {}).get("title", "").strip()
    if not title:
        return text_response("Bad Request", 400)

    # Get last position
    chapters_query = fdb.collection('chapters').where('courseId', '==', course_id).order_by('position', direction=firestore.Query.DESCENDING).limit(1).get()
    last_pos = chapters_query[0].to_dict().get("position", 0) if chapters_query else 0
    
    chapter_data = {
        "title": title,
        "courseId": course_id,
        "position": last_pos + 1,
        "description": None,
        "isPublished": False,
        "isFree": False,
        "duration": None,
        "videoUrl": None,
        "videoSourceType": None,
        "externalUrl": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    ref = fdb.collection('chapters').document()
    ref.set(chapter_data)
    chapter_data["id"] = ref.id
    return jsonify(serialize_chapter(chapter_data))


@api_bp.put("/courses/<course_id>/chapters/reorder")
def reorder_chapters(course_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    items = (request.get_json(silent=True) or {}).get("list", [])
    
    # Batch update for efficiency
    batch = fdb.batch()
    for item in items:
        chap_id = item.get("id")
        if chap_id:
            chap_ref = fdb.collection('chapters').document(chap_id)
            batch.update(chap_ref, {"position": item.get("position"), "updatedAt": datetime.utcnow()})
    batch.commit()
    return text_response("Success", 200)


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>")
def update_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    values = request.get_json(silent=True) or {}

    update_payload = {}
    for key in ["title", "description", "isFree", "duration", "videoUrl", "videoSourceType", "externalUrl"]:
        if key in values:
            update_payload[key] = values[key]

    chapter_ref = fdb.collection('chapters').document(chapter_id)

    if values.get("externalUrl") and values.get("videoSourceType") == VideoSourceTypeEnum.EXTERNAL.value:
        embed_url, provider = build_embed(values["externalUrl"])
        update_payload["embedUrl"] = embed_url
        update_payload["videoProvider"] = provider.value if provider else None
        update_payload["transcriptStatus"] = TranscriptStatusEnum.PENDING.value
        chapter_ref.update(update_payload)
        start_transcription(chapter_id, provider, values["externalUrl"])
    elif values.get("videoUrl") and values.get("videoSourceType") == VideoSourceTypeEnum.UPLOAD.value:
        # Check existing MuxData
        mux_query = fdb.collection('muxData').where('chapterId', '==', chapter_id).limit(1).get()
        if mux_query:
            mux_doc = mux_query[0]
            mux_data = mux_doc.to_dict()
            if mux_data.get("assetId"):
                delete_mux_asset(mux_data.get("assetId"))
            mux_doc.reference.delete()

        asset_id, playback_id = create_mux_asset(values["videoUrl"])
        if asset_id:
            mux_data = {
                "chapterId": chapter_id,
                "assetId": asset_id,
                "playbackId": playback_id,
                "createdAt": datetime.utcnow()
            }
            fdb.collection('muxData').add(mux_data)
        
        chapter_ref.update(update_payload)
    else:
        if update_payload:
            chapter_ref.update(update_payload)

    refreshed = require_chapter_owner(course_id, chapter_id, user["userId"])
    return jsonify(serialize_chapter(refreshed, include_relations=True))


@api_bp.delete("/courses/<course_id>/chapters/<chapter_id>")
def delete_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    
    mux_data = chapter.get("muxData")
    if mux_data and mux_data.get("assetId"):
        delete_mux_asset(mux_data.get("assetId"))
        # Delete MuxData doc
        mux_query = fdb.collection('muxData').where('chapterId', '==', chapter_id).limit(1).get()
        if mux_query:
            mux_query[0].reference.delete()

    fdb.collection('chapters').document(chapter_id).delete()

    published_chapters_query = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True).get()
    
    if len(published_chapters_query) == 0:
        fdb.collection('courses').document(course_id).update({"isPublished": False, "updatedAt": datetime.utcnow()})

    return jsonify(serialize_chapter(chapter))


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>/publish")
def publish_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])

    has_external_video = chapter.get("videoSourceType") == VideoSourceTypeEnum.EXTERNAL.value and bool(chapter.get("externalUrl") or chapter.get("embedUrl"))
    has_uploaded_video = bool(chapter.get("videoUrl"))
    
    missing_fields = []
    if not (chapter.get("title") or "").strip():
        missing_fields.append("titulo do capitulo")
    if not (chapter.get("description") or "").strip():
        missing_fields.append("descricao do capitulo")
    if not has_external_video and not has_uploaded_video:
        missing_fields.append("video do capitulo")
        
    if missing_fields:
        return text_response(f"Campos obrigatorios faltando: {', '.join(missing_fields)}", 400)

    fdb.collection('chapters').document(chapter_id).update({"isPublished": True, "updatedAt": datetime.utcnow()})
    chapter["isPublished"] = True
    
    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.patch("/courses/<course_id>/chapters/<chapter_id>/unpublish")
def unpublish_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    
    fdb.collection('chapters').document(chapter_id).update({"isPublished": False, "updatedAt": datetime.utcnow()})
    chapter["isPublished"] = False

    published_chapters_query = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True).get()
        
    if len(published_chapters_query) == 0:
        fdb.collection('courses').document(course_id).update({"isPublished": False, "updatedAt": datetime.utcnow()})

    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.put("/courses/<course_id>/chapters/<chapter_id>/progress")
def update_chapter_progress(course_id: str, chapter_id: str):
    user = require_user()
    is_completed = bool((request.get_json(silent=True) or {}).get("isCompleted"))

    progress_query = fdb.collection('userProgress')\
        .where('userId', '==', user["userId"])\
        .where('chapterId', '==', chapter_id)\
        .limit(1).get()
    
    if not progress_query:
        progress_data = {
            "userId": user["userId"],
            "chapterId": chapter_id,
            "isCompleted": is_completed,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        fdb.collection('userProgress').add(progress_data)
    else:
        progress_query[0].reference.update({"isCompleted": is_completed, "updatedAt": datetime.utcnow()})

    if is_completed:
        ensure_purchase(user["userId"], course_id, chapter_id)
        
        # Check for achievement
        published_chapters_docs = fdb.collection('chapters').where('courseId', '==', course_id).where('isPublished', '==', True).get()
        chapter_ids = [doc.id for doc in published_chapters_docs]
        
        completed_count = 0
        if chapter_ids:
            # Firestore 'in' query limit is 10, but let's assume we can handle it or use multiple queries if needed
            # For simplicity in this tutorial context, let's just count
            completed_query = fdb.collection('userProgress')\
                .where('userId', '==', user["userId"])\
                .where('chapterId', 'in', chapter_ids)\
                .where('isCompleted', '==', True).get()
            completed_count = len(completed_query)
            
        if chapter_ids and completed_count == len(chapter_ids):
            # Check existing achievement
            achievement_query = fdb.collection('achievements')\
                .where('userId', '==', user["userId"])\
                .where('courseId', '==', course_id).limit(1).get()
                
            if not achievement_query:
                course_doc = fdb.collection('courses').document(course_id).get()
                course_title = course_doc.to_dict().get("title") if course_doc.exists else "Curso"
                
                achievement_data = {
                    "userId": user["userId"],
                    "courseId": course_id,
                    "title": f"Especialista em {course_title}",
                    "description": f"Completou todas as aulas do curso {course_title}.",
                    "icon": "Trophy",
                    "createdAt": datetime.utcnow()
                }
                fdb.collection('achievements').add(achievement_data)

    return jsonify({"success": True})


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/notes")
def create_note(course_id: str, chapter_id: str):
    user = require_user()
    payload = request.get_json(silent=True) or {}
    note_data = {
        "userId": user["userId"],
        "chapterId": chapter_id,
        "content": payload.get("content", ""),
        "timestamp": payload.get("timestamp") or 0,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    ref = fdb.collection('userNotes').document()
    ref.set(note_data)
    note_data["id"] = ref.id
    return jsonify(serialize_note(note_data))


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/notes")
def list_notes(course_id: str, chapter_id: str):
    user = require_user()
    notes_docs = fdb.collection('userNotes')\
        .where('userId', '==', user["userId"])\
        .where('chapterId', '==', chapter_id)\
        .order_by('createdAt', direction=firestore.Query.DESCENDING).get()
    
    return jsonify([serialize_note({**d.to_dict(), "id": d.id}) for d in notes_docs])


@api_bp.get("/courses/<course_id>/leaderboard")
def course_leaderboard(course_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists:
        return text_response("Course not found", 404)
    course = course_doc.to_dict()
    course["id"] = course_doc.id
    
    # Restrict to published unless the user is the course creator
    if not course.get("isPublished") and course.get("userId") != user["userId"]:
        return text_response("Course not found", 404)

    if not can_access_course(user["userId"], course):
        return text_response("Course not found", 404)

    return jsonify(build_course_leaderboard(course_id, user["userId"]))


@api_bp.get("/student/leaderboard")
def student_leaderboard():
    user = require_user()
    return jsonify(build_global_leaderboard(user["userId"]))


@api_bp.get("/student/forum")
def student_forum_feed():
    user = require_user()
    purchases_docs = fdb.collection('purchases').where('userId', '==', user["userId"]).get()
    course_ids = [p.to_dict().get("courseId") for p in purchases_docs]
    if not course_ids:
        return jsonify([])

    posts = []
    for i in range(0, len(course_ids), 30):
        chunk = course_ids[i:i+30]
        p_docs = fdb.collection('forumPosts')\
            .where('courseId', 'in', chunk)\
            .order_by('createdAt', direction=firestore.Query.DESCENDING)\
            .limit(80).get()
        for doc in p_docs:
            posts.append({**doc.to_dict(), "id": doc.id})
    
    posts.sort(key=lambda x: x.get("createdAt") or datetime.utcnow().isoformat(), reverse=True)
    posts = posts[:80]

    user_ids = list({p.get("userId") for p in posts if p.get("userId")})
    profile_map = {}
    if user_ids:
        for i in range(0, len(user_ids), 30):
            chunk = user_ids[i:i+30]
            p_docs = fdb.collection('profiles').where('userId', 'in', chunk).get()
            for p_doc in p_docs:
                p_data = p_doc.to_dict()
                profile_map[p_data.get("userId")] = p_data

    course_titles = {}
    chapter_titles = {}
    for post in posts:
        c_id = post.get("courseId")
        ch_id = post.get("chapterId")
        if c_id and c_id not in course_titles:
            c_doc = fdb.collection('courses').document(c_id).get()
            course_titles[c_id] = c_doc.to_dict().get("title") if c_doc.exists else "Curso"
        if ch_id and ch_id not in chapter_titles:
            ch_doc = fdb.collection('chapters').document(ch_id).get()
            chapter_titles[ch_id] = ch_doc.to_dict().get("title") if ch_doc.exists else "Capítulo"

    feed = []
    for post in posts:
        profile = profile_map.get(post.get("userId"))
        author_name = (profile.get("name") or profile.get("email")) if profile else None
        feed.append(
            {
                **serialize_forum_post(post, author_name, user["userId"]),
                "courseTitle": course_titles.get(post.get("courseId")),
                "chapterTitle": chapter_titles.get(post.get("chapterId")),
            }
        )

    return jsonify(feed)


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/forum")
def list_forum_posts(course_id: str, chapter_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists or not course_doc.to_dict().get("isPublished"):
        return text_response("Course not found", 404)
    course = course_doc.to_dict()
    course["id"] = course_id

    if not can_access_course(user["userId"], course):
        return text_response("Course not found", 404)

    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id or not chapter_doc.to_dict().get("isPublished"):
        return text_response("Chapter not found", 404)

    posts_docs = fdb.collection('forumPosts')\
        .where('courseId', '==', course_id)\
        .where('chapterId', '==', chapter_id)\
        .order_by('createdAt', direction=firestore.Query.DESCENDING)\
        .limit(50).get()
    posts = [{**doc.to_dict(), "id": doc.id} for doc in posts_docs]

    user_ids = list({p.get("userId") for p in posts if p.get("userId")})
    profile_map = {}
    if user_ids:
        for i in range(0, len(user_ids), 30):
            chunk = user_ids[i:i+30]
            p_docs = fdb.collection('profiles').where('userId', 'in', chunk).get()
            for p_doc in p_docs:
                p_data = p_doc.to_dict()
                profile_map[p_data.get("userId")] = p_data

    serialized_posts = []
    for post in posts:
        profile = profile_map.get(post.get("userId"))
        author_name = (profile.get("name") or profile.get("email")) if profile else None
        serialized_posts.append(
            serialize_forum_post(post, author_name, user["userId"])
        )

    return jsonify(serialized_posts)


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/forum")
def create_forum_post(course_id: str, chapter_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists or not course_doc.to_dict().get("isPublished"):
        return text_response("Course not found", 404)
    course = course_doc.to_dict()
    course["id"] = course_id

    if not can_access_course(user["userId"], course):
        return text_response("Course not found", 404)

    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id or not chapter_doc.to_dict().get("isPublished"):
        return text_response("Chapter not found", 404)

    payload = request.get_json(silent=True) or {}
    content = str(payload.get("content") or "").strip()
    if not content:
        return text_response("Escreva uma mensagem para publicar", 400)
    if len(content) > 1200:
        return text_response("A mensagem deve ter no maximo 1200 caracteres", 400)

    post_data = {
        "userId": user["userId"],
        "courseId": course_id,
        "chapterId": chapter_id,
        "content": content,
        "createdAt": datetime.utcnow()
    }
    post_ref = fdb.collection('forumPosts').document()
    post_ref.set(post_data)
    post_data["id"] = post_ref.id

    profile_doc = fdb.collection('profiles').document(user["userId"]).get()
    profile = profile_doc.to_dict() if profile_doc.exists else {}
    author_name = (profile.get("name") or profile.get("email")) or user.get("name") or "Aluno"
    return jsonify(
        serialize_forum_post(
            post_data,
            author_name,
            user["userId"]
        )
    )


@api_bp.delete("/courses/<course_id>/chapters/<chapter_id>/forum/<post_id>")
def delete_forum_post(course_id: str, chapter_id: str, post_id: str):
    user = require_user()
    post_ref = fdb.collection('forumPosts').document(post_id)
    post_doc = post_ref.get()
    if not post_doc.exists:
        return text_response("Mensagem nao encontrada", 404)
    post = post_doc.to_dict()
    if post.get("courseId") != course_id or post.get("chapterId") != chapter_id:
        return text_response("Mensagem nao encontrada", 404)
    if post.get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    post_ref.delete()
    return jsonify({"deleted": True})


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/data")
def chapter_data(course_id: str, chapter_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists or not course_doc.to_dict().get("isPublished"):
        return text_response("Not found", 404)
    
    course = course_doc.to_dict()
    course["id"] = course_doc.id
    
    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id or not chapter_doc.to_dict().get("isPublished"):
        return text_response("Not found", 404)
        
    chapter = chapter_doc.to_dict()
    chapter["id"] = chapter_doc.id
    
    # User progress
    progress_query = fdb.collection('userProgress')\
        .where('userId', '==', user["userId"])\
        .where('chapterId', '==', chapter_id)\
        .limit(1).get()
    user_progress = progress_query[0].to_dict() if progress_query else None
    
    # Next chapter
    next_chapter_query = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True)\
        .where('position', '>', chapter.get("position", 0))\
        .order_by('position', direction=firestore.Query.ASCENDING)\
        .limit(1).get()
    next_chapter = next_chapter_query[0].to_dict() if next_chapter_query else None
    if next_chapter:
        next_chapter["id"] = next_chapter_query[0].id
        
    # Attachments
    attachments_docs = fdb.collection('attachments').where('courseId', '==', course_id).get()
    attachments = [serialize_attachment({**d.to_dict(), "id": d.id}) for d in attachments_docs]
    
    # Mux Data
    mux_query = fdb.collection('muxData').where('chapterId', '==', chapter_id).limit(1).get()
    mux_data = mux_query[0].to_dict() if mux_query else None
    
    # Quiz
    quiz_query = fdb.collection('quizzes').where('chapterId', '==', chapter_id).limit(1).get()
    quiz = None
    if quiz_query:
        quiz = quiz_query[0].to_dict()
        quiz["id"] = quiz_query[0].id
        # Questions for quiz
        q_docs = fdb.collection('questions').where('quizId', '==', quiz["id"]).get()
        quiz["questions"] = []
        for q_doc in q_docs:
            q_data = q_doc.to_dict()
            q_data["id"] = q_doc.id
            o_docs = fdb.collection('options').where('questionId', '==', q_data["id"]).get()
            q_data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
            quiz["questions"].append(q_data)

    quiz_result = None
    if quiz:
        quiz_res_query = fdb.collection('quizResults')\
            .where('userId', '==', user["userId"])\
            .where('quizId', '==', quiz["id"])\
            .limit(1).get()
        if quiz_res_query:
            quiz_result = quiz_res_query[0].to_dict()
            quiz_result["id"] = quiz_res_query[0].id

    return jsonify(
        {
            "course": serialize_course(course),
            "chapter": serialize_chapter(chapter),
            "muxData": serialize_mux_data(mux_data),
            "attachments": attachments,
            "nextChapter": serialize_chapter(next_chapter) if next_chapter else None,
            "userProgress": serialize_progress(user_progress),
            "quiz": serialize_quiz(quiz, include_correct=False) if quiz else None,
            "quizResult": serialize_quiz_result(quiz_result),
        }
    )


@api_bp.post("/courses/<course_id>/enroll")
def enroll_course(course_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists or not course_doc.to_dict().get("isPublished"):
        return text_response("Course not found", 404)

    # Get first chapter
    chapters_query = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True)\
        .order_by('position').limit(1).get()
        
    if not chapters_query:
        return text_response("No published chapters found", 404)
    
    first_chapter_id = chapters_query[0].id
    
    # Check existing purchase
    purchase_query = fdb.collection('purchases')\
        .where('userId', '==', user["userId"])\
        .where('courseId', '==', course_id).limit(1).get()
        
    if purchase_query:
        return text_response("Already enrolled", 400)

    purchase_data = {
        "userId": user["userId"],
        "courseId": course_id,
        "lastChapterId": first_chapter_id,
        "createdAt": datetime.utcnow()
    }
    fdb.collection('purchases').add(purchase_data)
    
    # Init progress for first chapter if not exists
    progress_query = fdb.collection('userProgress')\
        .where('userId', '==', user["userId"])\
        .where('chapterId', '==', first_chapter_id).limit(1).get()
    if not progress_query:
        fdb.collection('userProgress').add({
            "userId": user["userId"],
            "chapterId": first_chapter_id,
            "isCompleted": False,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        })

    return jsonify({"enrolled": True})


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/quiz")
def get_chapter_quiz(course_id: str, chapter_id: str):
    require_user()
    quiz_query = fdb.collection('quizzes').where('chapterId', '==', chapter_id).limit(1).get()
    if not quiz_query:
        return jsonify(None)
        
    quiz = quiz_query[0].to_dict()
    quiz["id"] = quiz_query[0].id
    
    # Load questions and options
    q_docs = fdb.collection('questions').where('quizId', '==', quiz["id"]).get()
    quiz["questions"] = []
    for q_doc in q_docs:
        q_data = q_doc.to_dict()
        q_data["id"] = q_doc.id
        o_docs = fdb.collection('options').where('questionId', '==', q_data["id"]).get()
        q_data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
        quiz["questions"].append(q_data)

    return jsonify(serialize_quiz(quiz, include_correct=True))


@api_bp.get("/courses/<course_id>/chapters/<chapter_id>/transcript")
def get_chapter_transcript_status(course_id: str, chapter_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])
    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id:
        return text_response("Chapter not found", 404)
    chapter = chapter_doc.to_dict()
    chapter["id"] = chapter_doc.id
    return jsonify(
        transcript_status_payload(
            chapter,
            "TRANSCRIPTION_STATUS",
            "Status da transcricao carregado.",
        )
    )


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/quiz")
def create_chapter_quiz(course_id: str, chapter_id: str):
    user = require_user()
    require_course_owner(course_id, user["userId"])

    existing_query = fdb.collection('quizzes').where('chapterId', '==', chapter_id).limit(1).get()
    if existing_query:
        return text_response("Quiz already exists", 400)

    values = request.get_json(silent=True) or {}
    max_q = max(1, min(int(values.get("maxQuestions", 5)), 10))
    passing_s = max(0, min(int(values.get("passingScore", 70)), 100))

    quiz_data = {
        "chapterId": chapter_id,
        "isPublished": bool(values.get("isPublished", False)),
        "isRequired": bool(values.get("isRequired", False)),
        "shuffleQuestions": bool(values.get("shuffleQuestions", False)),
        "maxQuestions": max_q,
        "passingScore": passing_s,
        "timeLimit": values.get("timeLimit"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    ref = fdb.collection('quizzes').document()
    ref.set(quiz_data)
    quiz_data["id"] = ref.id
    return jsonify(serialize_quiz(quiz_data))


@api_bp.post("/courses/<course_id>/chapters/<chapter_id>/quiz/generate")
def generate_chapter_quiz(course_id: str, chapter_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    
    chapter_doc = fdb.collection('chapters').document(chapter_id).get()
    if not chapter_doc.exists or chapter_doc.to_dict().get("courseId") != course_id:
        return text_response("Chapter not found", 404)
    chapter = chapter_doc.to_dict()
    chapter["id"] = chapter_doc.id
    
    if chapter.get("transcriptStatus") == TranscriptStatusEnum.PROCESSING.value:
        return jsonify(
            transcript_status_payload(
                chapter,
                "TRANSCRIPTION_PROCESSING",
                "A transcricao do video ainda esta em andamento.",
            )
        ), 202

    values = request.get_json(silent=True) or {}

    if not chapter.get("transcript") and chapter.get("videoProvider") == VideoProviderEnum.YOUTUBE.value:
        fdb.collection('chapters').document(chapter_id).update({
            "transcriptStatus": TranscriptStatusEnum.PROCESSING.value,
            "updatedAt": datetime.utcnow()
        })
        chapter["transcriptStatus"] = TranscriptStatusEnum.PROCESSING.value
        start_transcription(chapter_id, chapter.get("videoProvider"), chapter.get("externalUrl"))
        return jsonify(
            transcript_status_payload(
                chapter,
                "TRANSCRIPTION_STARTED",
                "A transcricao do video foi iniciada. As perguntas serao geradas automaticamente quando ela terminar.",
            )
        ), 202

    transcript = (chapter.get("transcript") or "").strip()
    if not transcript:
        return text_response(
            "Este capitulo ainda nao tem transcricao disponivel. Informe um link do YouTube com legenda/transcricao ou adicione conteudo antes de gerar com IA.",
            400,
        )

    quiz_query = fdb.collection('quizzes').where('chapterId', '==', chapter_id).limit(1).get()
    if not quiz_query:
        max_q = max(1, min(int(values.get("maxQuestions", 5)), 10))
        passing_s = max(0, min(int(values.get("passingScore", 70)), 100))
        quiz_data = {
            "chapterId": chapter_id,
            "maxQuestions": max_q,
            "isPublished": bool(values.get("isPublished", False)),
            "isRequired": bool(values.get("isRequired", False)),
            "shuffleQuestions": bool(values.get("shuffleQuestions", False)),
            "passingScore": passing_s,
            "timeLimit": values.get("timeLimit"),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        quiz_ref = fdb.collection('quizzes').document()
        quiz_ref.set(quiz_data)
        quiz_id = quiz_ref.id
        quiz = quiz_data
        quiz["id"] = quiz_id
    else:
        quiz_ref = quiz_query[0].reference
        quiz_id = quiz_query[0].id
        quiz = quiz_query[0].to_dict()
        quiz["id"] = quiz_id
        
        # update fields from values
        update_payload = {}
        for key in ["isPublished", "isRequired", "shuffleQuestions", "maxQuestions", "timeLimit", "passingScore"]:
            if key in values:
                update_payload[key] = values[key]
                quiz[key] = values[key]
        if update_payload:
            update_payload["updatedAt"] = datetime.utcnow()
            quiz_ref.update(update_payload)

    max_questions = max(1, min(int(quiz.get("maxQuestions", 5)), 10))

    context = f"""
Titulo do Curso: {course.get('title')}
Titulo do Capitulo: {chapter.get('title')}
Descricao do Capitulo: {chapter.get('description') or 'Sem descricao'}

CONTEUDO DO VIDEO (Transcricao):
{transcript}
"""
    try:
        questions = generate_quiz_questions(context, max_questions)
    except Exception as error:
        return text_response(f"Erro ao gerar perguntas com IA: {error}", 502)

    # Delete existing questions and options
    old_q_query = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    for old_q in old_q_query:
        o_query = fdb.collection('options').where('questionId', '==', old_q.id).get()
        for o_doc in o_query:
            o_doc.reference.delete()
        old_q.reference.delete()

    for index, q_payload in enumerate(questions):
        q_data = {
            "quizId": quiz_id,
            "prompt": q_payload.get("prompt"),
            "position": index,
            "pointWeight": float(q_payload.get("pointWeight") or 1.0),
            "isBonus": bool(q_payload.get("isBonus", False)),
            "bonusPoints": q_payload.get("bonusPoints"),
            "createdAt": datetime.utcnow()
        }
        q_ref = fdb.collection('questions').document()
        q_ref.set(q_data)
        q_id = q_ref.id
        
        for o_payload in q_payload.get("options", []):
            o_data = {
                "questionId": q_id,
                "text": o_payload.get("text"),
                "isCorrect": bool(o_payload.get("isCorrect")),
                "createdAt": datetime.utcnow()
            }
            fdb.collection('options').add(o_data)

    # Reload quiz with new questions and options
    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    quiz = quiz_doc.to_dict()
    quiz["id"] = quiz_id
    q_docs = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    quiz["questions"] = []
    for q_doc in q_docs:
        q_data = q_doc.to_dict()
        q_data["id"] = q_doc.id
        o_docs = fdb.collection('options').where('questionId', '==', q_data["id"]).get()
        q_data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
        quiz["questions"].append(q_data)

    return jsonify({"quiz": serialize_quiz(quiz, include_correct=True), "questionsCount": len(questions)})


@api_bp.patch("/quiz/<quiz_id>")
def update_quiz(quiz_id: str):
    user = require_user()
    quiz_ref = fdb.collection('quizzes').document(quiz_id)
    quiz_doc = quiz_ref.get()
    if not quiz_doc.exists:
        return text_response("Not found", 404)
        
    quiz = quiz_doc.to_dict()
    # Check ownership
    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    values = request.get_json(silent=True) or {}
    update_payload = {}
    for key in ["isPublished", "isRequired", "shuffleQuestions", "maxQuestions", "timeLimit", "passingScore"]:
        if key in values:
            update_payload[key] = values[key]
            quiz[key] = values[key]
    
    if update_payload:
        update_payload["updatedAt"] = datetime.utcnow()
        quiz_ref.update(update_payload)
        
    quiz["id"] = quiz_doc.id
    return jsonify(serialize_quiz(quiz))


@api_bp.delete("/quiz/<quiz_id>")
def delete_quiz(quiz_id: str):
    user = require_user()
    quiz_ref = fdb.collection('quizzes').document(quiz_id)
    quiz_doc = quiz_ref.get()
    if not quiz_doc.exists:
        return text_response("Not found", 404)
    
    quiz = quiz_doc.to_dict()
    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    # Delete nested
    q_query = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    for q_doc in q_query:
        o_query = fdb.collection('options').where('questionId', '==', q_doc.id).get()
        for o_doc in o_query:
            o_doc.reference.delete()
        q_doc.reference.delete()
        
    quiz_ref.delete()
    return "", 204


@api_bp.post("/quiz/<quiz_id>/questions")
def create_question(quiz_id: str):
    user = require_user()
    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    if not quiz_doc.exists:
        return text_response("Not found", 404)
    
    quiz = quiz_doc.to_dict()
    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    existing_questions = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    if len(existing_questions) >= quiz.get("maxQuestions", 5):
        return text_response(f"Limite de {quiz.get('maxQuestions', 5)} questoes atingido", 400)

    payload = request.get_json(silent=True) or {}
    last_position = max((q.to_dict().get("position", 0) for q in existing_questions), default=0)
    
    question_data = {
        "quizId": quiz_id,
        "prompt": payload.get("prompt", ""),
        "isBonus": bool(payload.get("isBonus")),
        "bonusPoints": payload.get("bonusPoints"),
        "pointWeight": payload.get("pointWeight") or 1.0,
        "position": last_position + 1,
        "createdAt": datetime.utcnow()
    }
    ref = fdb.collection('questions').document()
    ref.set(question_data)
    question_data["id"] = ref.id
    return jsonify(serialize_question(question_data))


@api_bp.post("/quiz/<quiz_id>/questions/regenerate")
def regenerate_questions(quiz_id: str):
    from datetime import timedelta
    user = require_user()
    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    if not quiz_doc.exists:
        return text_response("Unauthorized", 401)
    quiz = quiz_doc.to_dict()
    quiz["id"] = quiz_doc.id

    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    chapter["id"] = chapter_doc.id

    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)
    course = course_doc.to_dict()
    course["id"] = course_doc.id

    if chapter.get("transcriptStatus") == TranscriptStatusEnum.PROCESSING:
        return jsonify(
            transcript_status_payload(
                chapter,
                "TRANSCRIPTION_PROCESSING",
                "A transcricao do video ainda esta em andamento.",
            )
        ), 202

    if not chapter.get("transcript") and chapter.get("videoProvider") == VideoProviderEnum.YOUTUBE:
        fdb.collection('chapters').document(chapter["id"]).update({
            "transcriptStatus": TranscriptStatusEnum.PROCESSING
        })
        chapter["transcriptStatus"] = TranscriptStatusEnum.PROCESSING
        start_transcription(chapter["id"], chapter.get("videoProvider"), chapter.get("externalUrl"))
        return jsonify(
            transcript_status_payload(
                chapter,
                "TRANSCRIPTION_STARTED",
                "A transcricao do video foi iniciada. As perguntas serao geradas automaticamente quando ela terminar.",
            )
        ), 202

    transcript = (chapter.get("transcript") or "").strip()
    if not transcript:
        return text_response(
            "Este capitulo ainda nao tem transcricao disponivel. Informe um link do YouTube com legenda/transcricao ou adicione conteudo antes de gerar com IA.",
            400,
        )

    payload = request.get_json(silent=True) or {}
    items = payload.get("items") or []
    if not isinstance(items, list) or not items:
        return text_response("Informe ao menos uma pergunta para regenerar", 400)

    # Load existing questions and options
    existing_questions = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    questions_by_id = {}
    for q_doc in existing_questions:
        q_data = q_doc.to_dict()
        q_data["id"] = q_doc.id
        o_docs = fdb.collection('options').where('questionId', '==', q_doc.id).get()
        q_data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
        questions_by_id[q_doc.id] = q_data

    generation_requests = []
    target_questions = []

    for item in items:
        if not isinstance(item, dict):
            continue
        question = questions_by_id.get(item.get("questionId"))
        if not question:
            continue

        generation_requests.append(
            {
                "questionId": question["id"],
                "prompt": question.get("prompt"),
                "options": [
                    {"text": option["text"], "isCorrect": option.get("isCorrect")}
                    for option in question.get("options", [])
                ],
                "pointWeight": question.get("pointWeight"),
                "isBonus": question.get("isBonus"),
                "bonusPoints": question.get("bonusPoints"),
                "suggestion": item.get("suggestion"),
                "useDefaultConfig": bool(item.get("useDefaultConfig")),
                "focusContentOverSuggestion": bool(item.get("focusContentOverSuggestion")),
            }
        )
        target_questions.append(question)

    if not generation_requests:
        return text_response("Nenhuma pergunta valida foi enviada", 400)

    context = f"""
Titulo do Curso: {course.get("title")}
Titulo do Capitulo: {chapter.get("title")}
Descricao do Capitulo: {chapter.get("description", "Sem descricao")}

CONTEUDO DO VIDEO (Transcricao):
{transcript}
"""
    try:
        generated_questions = generate_replacement_questions(context, generation_requests)
    except Exception as error:
        return text_response(f"Erro ao gerar perguntas com IA: {error}", 502)

    for question_payload in generated_questions:
        options_payload = question_payload.get("options") or []
        correct_count = len(
            [
                option_payload
                for option_payload in options_payload
                if option_payload.get("isCorrect")
            ]
        )
        if len(options_payload) != 4 or correct_count != 1:
            return text_response(
                "A IA retornou uma pergunta sem 4 alternativas validas ou sem uma unica alternativa correta.",
                502,
            )

    refreshed_questions = []
    base_time = datetime.utcnow()
    batch = fdb.batch()

    for q_idx, (question, question_payload) in enumerate(zip(target_questions, generated_questions)):
        q_ref = fdb.collection('questions').document(question["id"])
        updated_fields = {
            "prompt": question_payload["prompt"],
            "pointWeight": float(question_payload.get("pointWeight") or 1.0),
            "isBonus": bool(question_payload.get("isBonus")),
            "bonusPoints": question_payload.get("bonusPoints")
        }
        batch.update(q_ref, updated_fields)
        question.update(updated_fields)

        # Delete existing options
        for option in question.get("options", []):
            opt_ref = fdb.collection('options').document(option["id"])
            batch.delete(opt_ref)

        # Create new options
        new_options = []
        for o_idx, option_payload in enumerate(question_payload.get("options", [])):
            opt_ref = fdb.collection('options').document()
            opt_data = {
                "questionId": question["id"],
                "text": option_payload["text"],
                "isCorrect": bool(option_payload.get("isCorrect")),
                "createdAt": base_time + timedelta(seconds=q_idx * 10 + o_idx)
            }
            batch.set(opt_ref, opt_data)
            new_options.append({**opt_data, "id": opt_ref.id})

        question["options"] = new_options
        refreshed_questions.append(question)

    batch.commit()

    return jsonify(
        {
            "questions": [
                serialize_question(question)
                for question in refreshed_questions
            ]
        }
    )


@api_bp.patch("/quiz/<quiz_id>/questions/<question_id>")
def update_question(quiz_id: str, question_id: str):
    user = require_user()
    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    if not quiz_doc.exists:
        return text_response("Not found", 404)
    
    quiz = quiz_doc.to_dict()
    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    q_ref = fdb.collection('questions').document(question_id)
    q_doc = q_ref.get()
    if not q_doc.exists or q_doc.to_dict().get("quizId") != quiz_id:
        return text_response("Not found", 404)

    values = request.get_json(silent=True) or {}
    update_payload = {}
    for key in ["prompt", "isBonus", "bonusPoints", "pointWeight", "position"]:
        if key in values:
            update_payload[key] = values[key]

    if update_payload:
        q_ref.update(update_payload)

    if "options" in values:
        # Delete existing options
        o_query = fdb.collection('options').where('questionId', '==', question_id).get()
        for o_doc in o_query:
            o_doc.reference.delete()
            
        for option_payload in values["options"]:
            o_data = {
                "questionId": question_id,
                "text": option_payload["text"],
                "isCorrect": bool(option_payload.get("isCorrect")),
                "createdAt": datetime.utcnow()
            }
            fdb.collection('options').add(o_data)

    refreshed_q_doc = q_ref.get()
    data = refreshed_q_doc.to_dict()
    data["id"] = refreshed_q_doc.id
    
    # Load options for serialization
    o_docs = fdb.collection('options').where('questionId', '==', data["id"]).get()
    data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
    
    return jsonify(serialize_question(data))


@api_bp.delete("/quiz/<quiz_id>/questions/<question_id>")
def delete_question(quiz_id: str, question_id: str):
    user = require_user()
    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    if not quiz_doc.exists:
        return text_response("Not found", 404)
    
    quiz = quiz_doc.to_dict()
    chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
    if not chapter_doc.exists:
        return text_response("Unauthorized", 401)
    chapter = chapter_doc.to_dict()
    course_doc = fdb.collection('courses').document(chapter["courseId"]).get()
    if not course_doc.exists or course_doc.to_dict().get("userId") != user["userId"]:
        return text_response("Unauthorized", 401)

    q_ref = fdb.collection('questions').document(question_id)
    if not q_ref.get().exists:
        return text_response("Not found", 404)
        
    # Delete options
    o_query = fdb.collection('options').where('questionId', '==', question_id).get()
    for o_doc in o_query:
        o_doc.reference.delete()
        
    q_ref.delete()
    return "", 204


@api_bp.post("/quiz/<quiz_id>/submit")
def submit_quiz(quiz_id: str):
    user = require_user()
    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers", [])

    quiz_doc = fdb.collection('quizzes').document(quiz_id).get()
    if not quiz_doc.exists or not quiz_doc.to_dict().get("isPublished"):
        return text_response("Quiz not found", 404)
        
    quiz = quiz_doc.to_dict()
    quiz["id"] = quiz_id

    # Check chapter completion if quiz has chapterId
    if quiz.get("chapterId"):
        progress_query = fdb.collection('userProgress')\
            .where('userId', '==', user["userId"])\
            .where('chapterId', '==', quiz["chapterId"])\
            .limit(1).get()
        chapter_completed = progress_query[0].to_dict().get("isCompleted", False) if progress_query else False
        if not chapter_completed:
            return text_response("Conclua o capitulo antes de responder ao quiz", 403)

    existing_result_query = fdb.collection('quizResults')\
        .where('userId', '==', user["userId"])\
        .where('quizId', '==', quiz_id).limit(1).get()
        
    existing_result = None
    if existing_result_query:
        existing_result = existing_result_query[0].to_dict()
        existing_result["id"] = existing_result_query[0].id
        if existing_result.get("passed"):
            return jsonify({"alreadySubmitted": True, "result": serialize_quiz_result(existing_result)})

    # Load questions and options for validation
    q_docs = fdb.collection('questions').where('quizId', '==', quiz_id).get()
    questions_map = {}
    for q_doc in q_docs:
        q_data = q_doc.to_dict()
        q_data["id"] = q_doc.id
        o_docs = fdb.collection('options').where('questionId', '==', q_data["id"]).get()
        q_data["options"] = [{**o.to_dict(), "id": o.id} for o in o_docs]
        questions_map[q_data["id"]] = q_data

    question_results = []
    for answer_payload in answers:
        q_id = answer_payload.get("questionId")
        o_id = answer_payload.get("optionId")
        question = questions_map.get(q_id)
        if not question:
            continue
        
        option = next((o for o in question["options"] if o["id"] == o_id), None)
        question_results.append({
            "isCorrect": bool(option["isCorrect"]) if option else False,
            "isBonus": question.get("isBonus", False),
            "bonusPoints": question.get("bonusPoints", 0),
            "pointWeight": question.get("pointWeight", 1.0),
            "timeRemaining": answer_payload.get("timeRemaining")
        })
        
        if option:
            # Store answer
            ans_query = fdb.collection('answers')\
                .where('userId', '==', user["userId"])\
                .where('questionId', '==', q_id).limit(1).get()
            if not ans_query:
                fdb.collection('answers').add({
                    "userId": user["userId"],
                    "questionId": q_id,
                    "optionId": o_id,
                    "createdAt": datetime.utcnow()
                })
            else:
                ans_query[0].reference.update({"optionId": o_id, "updatedAt": datetime.utcnow()})

    score = calc_score(question_results)
    xp_earned = calc_quiz_xp(question_results)

    stored_score = max(existing_result.get("score", 0), score) if existing_result else score
    stored_xp = max(existing_result.get("xpEarned", 0), xp_earned) if existing_result else xp_earned
    passed = stored_score >= quiz.get("passingScore", 70)

    if existing_result:
        xp_delta = max(0, stored_xp - existing_result.get("xpEarned", 0))
        result_ref = fdb.collection('quizResults').document(existing_result["id"])
        result_data = {
            "score": stored_score,
            "xpEarned": stored_xp,
            "passed": passed,
            "completedAt": datetime.utcnow()
        }
        result_ref.update(result_data)
        result_data["id"] = existing_result["id"]
        result_data["userId"] = user["userId"]
        result_data["quizId"] = quiz_id
        result_data["createdAt"] = existing_result.get("createdAt")
    else:
        xp_delta = xp_earned
        result_data = {
            "userId": user["userId"],
            "quizId": quiz_id,
            "score": stored_score,
            "xpEarned": stored_xp,
            "passed": passed,
            "createdAt": datetime.utcnow(),
            "completedAt": datetime.utcnow()
        }
        res_ref = fdb.collection('quizResults').document()
        res_ref.set(result_data)
        result_data["id"] = res_ref.id

    # Update XP
    xp_query = fdb.collection('userXP').where('userId', '==', user["userId"]).limit(1).get()
    if not xp_query:
        total_xp = xp_delta
        level = calc_level(total_xp)
        fdb.collection('userXP').add({
            "userId": user["userId"],
            "totalXp": total_xp,
            "level": level,
            "updatedAt": datetime.utcnow()
        })
    else:
        xp_doc = xp_query[0]
        curr_xp = xp_doc.to_dict().get("totalXp", 0)
        new_xp = curr_xp + xp_delta
        new_level = calc_level(new_xp)
        xp_doc.reference.update({
            "totalXp": new_xp,
            "level": new_level,
            "updatedAt": datetime.utcnow()
        })
        total_xp = new_xp

    # Next chapter unlocking logic
    if passed and quiz.get("chapterId"):
        chapter_doc = fdb.collection('chapters').document(quiz["chapterId"]).get()
        if chapter_doc.exists:
            chapter = chapter_doc.to_dict()
            next_chapter_query = fdb.collection('chapters')\
                .where('courseId', '==', chapter.get("courseId"))\
                .where('isPublished', '==', True)\
                .where('position', '>', chapter.get("position", 0))\
                .order_by('position', direction=firestore.Query.ASCENDING)\
                .limit(1).get()
                
            if next_chapter_query:
                next_chapter = next_chapter_query[0].to_dict()
                next_chapter_id = next_chapter_query[0].id
                
                # Update purchase lastChapterId
                purchase_query = fdb.collection('purchases')\
                    .where('userId', '==', user["userId"])\
                    .where('courseId', '==', chapter.get("courseId"))\
                    .limit(1).get()
                if purchase_query:
                    purchase_query[0].reference.update({"lastChapterId": next_chapter_id})
                else:
                    fdb.collection('purchases').add({
                        "userId": user["userId"],
                        "courseId": chapter.get("courseId"),
                        "lastChapterId": next_chapter_id,
                        "createdAt": datetime.utcnow()
                    })

                # Ensure next progress document exists
                next_progress_query = fdb.collection('userProgress')\
                    .where('userId', '==', user["userId"])\
                    .where('chapterId', '==', next_chapter_id)\
                    .limit(1).get()
                if not next_progress_query:
                    fdb.collection('userProgress').add({
                        "userId": user["userId"],
                        "chapterId": next_chapter_id,
                        "isCompleted": False,
                        "createdAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow()
                    })

    return jsonify({
        "result": serialize_quiz_result(result_data),
        "xpEarned": xp_delta,
        "score": score,
        "passed": passed,
        "totalXp": total_xp
    })


@api_bp.get("/quiz/<quiz_id>/submit")
def get_quiz_result(quiz_id: str):
    user = require_user()
    res_query = fdb.collection('quizResults')\
        .where('userId', '==', user["userId"])\
        .where('quizId', '==', quiz_id).limit(1).get()
    if not res_query:
        return jsonify(None)
    
    data = res_query[0].to_dict()
    data["id"] = res_query[0].id
    return jsonify(serialize_quiz_result(data))


@api_bp.get("/users/role")
def get_user_role():
    user = require_user()
    profile = get_user_profile(user["userId"], email=user.get("email"))
    role = profile.get("role") if profile else None
    return jsonify(
        {
            "isTeacher": role in {RoleEnum.TEACHER.value, RoleEnum.ADMIN.value},
            "isAdmin": role == RoleEnum.ADMIN.value,
            "isStudent": role == RoleEnum.STUDENT.value,
        }
    )


@api_bp.get("/users/xp")
def get_user_xp():
    user = require_user()
    xp_query = fdb.collection('userXP').where('userId', '==', user["userId"]).limit(1).get()
    if not xp_query:
        return jsonify(
            {
                "totalXp": 0,
                "level": 1,
                "levelLabel": LEVEL_LABELS[1],
                "progress": {"current": 0, "max": 200, "level": 1},
            }
        )
    
    xp_data = xp_query[0].to_dict()
    total_xp = xp_data.get("totalXp", 0)
    level = xp_data.get("level", 1)
    
    return jsonify(
        {
            "totalXp": total_xp,
            "level": level,
            "levelLabel": LEVEL_LABELS.get(level, "Especialista"),
            "progress": get_level_progress(total_xp),
        }
    )


@api_bp.post("/profiles/onboard/student")
def onboard_student():
    user = require_user()
    profile = ensure_student_profile(user["userId"], user.get("email"), user.get("name"))
    streak = update_user_streak(user["userId"])
    return jsonify({"profile": serialize_profile(profile), "streakCount": streak.get("count", 0)})


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
    if profile.get("role") != RoleEnum.STUDENT.value:
        return jsonify({"error": "Voce ja e um professor ou administrador"}), 400
        
    fdb.collection('profiles').document(user["userId"]).update({"role": RoleEnum.TEACHER.value, "updatedAt": datetime.utcnow()})
    profile["role"] = RoleEnum.TEACHER.value
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
    courses_docs = fdb.collection('courses').where('userId', '==', user["userId"]).get()
    
    data = []
    for c_doc in courses_docs:
        course = c_doc.to_dict()
        chap_docs = fdb.collection('chapters').where('courseId', '==', c_doc.id).get()
        
        progress_records = []
        for chap in chap_docs:
            prog_docs = fdb.collection('userProgress').where('chapterId', '==', chap.id).get()
            progress_records.extend([p.to_dict() for p in prog_docs])
            
        total_enrollments = len({p["userId"] for p in progress_records})
        total_completed = len([p for p in progress_records if p.get("isCompleted")])
        completion_rate = round((total_completed / len(progress_records)) * 100) if progress_records else 0
        data.append({"name": course.get("title"), "total": total_enrollments, "completionRate": completion_rate})

    return jsonify(
        {
            "data": data,
            "totalEnrollments": sum(item["total"] for item in data),
            "totalCourses": len(courses_docs),
        }
    )


@api_bp.get("/meta/teacher/courses")
def meta_teacher_courses():
    user = require_user()
    profile = get_user_profile(user["userId"], email=user.get("email"))
    # Use the migrated userId from profile if available, otherwise the current one
    lookup_id = profile.get("userId") if profile else user["userId"]
    
    print(f"DEBUG: teacher_courses request - Email: {user.get('email')}, UID: {user['userId']}, LookupID: {lookup_id}")
    
    courses_docs = fdb.collection('courses')\
        .where('userId', '==', lookup_id)\
        .order_by('createdAt', direction=firestore.Query.DESCENDING).get()
    
    print(f"DEBUG: Found {len(courses_docs)} courses for ID {lookup_id}")
    
    return jsonify([serialize_course({**d.to_dict(), "id": d.id}) for d in courses_docs])


@api_bp.get("/meta/teacher/courses/<course_id>")
def meta_teacher_course(course_id: str):
    user = require_user()
    course = require_course_owner(course_id, user["userId"])
    payload = serialize_course(course, include_relations=True)
    
    # Load chapters
    chap_docs = fdb.collection('chapters').where('courseId', '==', course_id).order_by('position').get()
    
    # Pre-load quizzes for these chapters to set on serialized payload
    chapter_ids = [d.id for d in chap_docs]
    quizzes_by_chapter = {}
    if chapter_ids:
        chunk_size = 10
        for i in range(0, len(chapter_ids), chunk_size):
            chunk = chapter_ids[i:i + chunk_size]
            quiz_docs = fdb.collection('quizzes').where('chapterId', 'in', chunk).get()
            for q_doc in quiz_docs:
                q_data = q_doc.to_dict()
                q_data["id"] = q_doc.id
                quizzes_by_chapter[q_data["chapterId"]] = q_data

    chapters_list = []
    for d in chap_docs:
        ch_dict = d.to_dict()
        ch_dict["id"] = d.id
        ch_dict["quiz"] = quizzes_by_chapter.get(d.id)
        chapters_list.append(serialize_chapter(ch_dict, include_relations=True))
        
    payload["chapters"] = chapters_list
    
    # Load attachments
    att_docs = fdb.collection('attachments').where('courseId', '==', course_id).order_by('createdAt', direction=firestore.Query.DESCENDING).get()
    payload["attachments"] = [serialize_attachment({**d.to_dict(), "id": d.id}) for d in att_docs]
    
    # Categories
    cat_docs = fdb.collection('categories').order_by('name').get()
    payload["categories"] = [serialize_category({**d.to_dict(), "id": d.id}) for d in cat_docs]
    
    return jsonify(payload)


@api_bp.get("/meta/teacher/courses/<course_id>/chapters/<chapter_id>")
def meta_teacher_chapter(course_id: str, chapter_id: str):
    user = require_user()
    chapter = require_chapter_owner(course_id, chapter_id, user["userId"])
    return jsonify(serialize_chapter(chapter, include_relations=True))


@api_bp.get("/meta/courses/<course_id>")
def meta_public_course(course_id: str):
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists:
        return text_response("Not found", 404)
        
    course = course_doc.to_dict()
    payload = serialize_course({**course, "id": course_id})
    
    chap_docs = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True)\
        .order_by('position').get()
    
    payload["chapters"] = [serialize_chapter({**d.to_dict(), "id": d.id}) for d in chap_docs]
    return jsonify(payload)


@api_bp.get("/meta/courses/<course_id>/layout")
def meta_course_layout(course_id: str):
    user = require_user()
    course_doc = fdb.collection('courses').document(course_id).get()
    if not course_doc.exists:
        return text_response("Not found", 404)
        
    course = course_doc.to_dict()
    course["id"] = course_doc.id
    
    # Enrollment
    purchase_query = fdb.collection('purchases')\
        .where('userId', '==', user["userId"])\
        .where('courseId', '==', course_id).limit(1).get()
    purchase = purchase_query[0].to_dict() if purchase_query else None
    
    progress_count = get_progress(user["userId"], course_id)
    
    # Chapters
    chap_docs = fdb.collection('chapters')\
        .where('courseId', '==', course_id)\
        .where('isPublished', '==', True)\
        .order_by('position').get()
    published_chapters = []
    for d in chap_docs:
        c_data = d.to_dict()
        c_data["id"] = d.id
        published_chapters.append(c_data)
        
    # UserProgress map
    progress_map = {}
    for chapter in published_chapters:
        prog_query = fdb.collection('userProgress')\
            .where('userId', '==', user["userId"])\
            .where('chapterId', '==', chapter["id"])\
            .limit(1).get()
        progress_map[chapter["id"]] = [serialize_progress(prog_query[0].to_dict())] if prog_query else []

    # Quizzes
    quiz_ids = []
    quizzes_map = {}
    for chapter in published_chapters:
        q_query = fdb.collection('quizzes')\
            .where('chapterId', '==', chapter["id"])\
            .where('isPublished', '==', True)\
            .limit(1).get()
        if q_query:
            q_data = q_query[0].to_dict()
            q_data["id"] = q_query[0].id
            quizzes_map[chapter["id"]] = q_data
            quiz_ids.append(q_data["id"])

    # Quiz Results
    quiz_result_map = {}
    if quiz_ids:
        res_docs = fdb.collection('quizResults')\
            .where('userId', '==', user["userId"])\
            .get()
        for doc in res_docs:
            res_data = doc.to_dict()
            res_data["id"] = doc.id
            if res_data.get("quizId") in quiz_ids:
                quiz_result_map[res_data.get("quizId")] = res_data

    last_unlocked_position = None
    if purchase and purchase.get("lastChapterId"):
        last_chapter_doc = fdb.collection('chapters').document(purchase.get("lastChapterId")).get()
        if last_chapter_doc.exists:
            last_unlocked_position = last_chapter_doc.to_dict().get("position")

    payload = serialize_course(course)
    payload_chapters = []
    for index, chapter in enumerate(published_chapters):
        chapter_payload = serialize_chapter(chapter, progress_map=progress_map)
        
        if chapter.get("isFree"):
            chapter_payload["isLocked"] = False
        elif not purchase:
            chapter_payload["isLocked"] = True
        elif index == 0:
            chapter_payload["isLocked"] = False
        elif last_unlocked_position is not None and chapter.get("position", 0) <= last_unlocked_position:
            chapter_payload["isLocked"] = False
        else:
            previous_chapter = published_chapters[index - 1]
            previous_progress_list = progress_map.get(previous_chapter["id"], [])
            previous_progress = previous_progress_list[0] if previous_progress_list else None
            
            previous_quiz = quizzes_map.get(previous_chapter["id"])
            previous_quiz_result = (
                quiz_result_map.get(previous_quiz["id"])
                if previous_quiz
                else None
            )
            previous_quiz_passed = (
                not previous_quiz
                or bool(previous_quiz_result and previous_quiz_result.get("passed"))
            )
            chapter_payload["isLocked"] = not (
                previous_progress
                and previous_progress.get("isCompleted")
                and previous_quiz_passed
            )
        payload_chapters.append(chapter_payload)

    payload["chapters"] = payload_chapters
    payload["progressCount"] = progress_count
    payload["isEnrolled"] = bool(purchase_query)
    return jsonify(payload)


@api_bp.get("/meta/dashboard")
def meta_dashboard():
    user = require_user()
    profile = get_user_profile(user["userId"], email=user.get("email"))
    role = profile.get("role") if profile else None
    is_teacher = role in {RoleEnum.TEACHER.value, RoleEnum.ADMIN.value}
    
    if is_teacher:
        courses_docs = fdb.collection('courses')\
            .where('userId', '==', user["userId"])\
            .order_by('updatedAt', direction=firestore.Query.DESCENDING).get()
            
        courses_data = []
        for d in courses_docs:
            c_data = d.to_dict()
            c_data["id"] = d.id
            chap_docs = fdb.collection('chapters').where('courseId', '==', d.id).get()
            c_data["chapters"] = [{
                "id": ch.id,
                "isPublished": ch.to_dict().get("isPublished"),
                "videoSourceType": ch.to_dict().get("videoSourceType")
            } for ch in chap_docs]
            courses_data.append(c_data)

        return jsonify({
            "mode": "teacher",
            "courses": [
                {
                    **serialize_course(course),
                    "chapters": course.get("chapters", [])
                } for course in courses_data
            ],
            "stats": {
                "totalCourses": len(courses_data),
                "publishedCourses": len([c for c in courses_data if c.get("isPublished")]),
                "draftCourses": len([c for c in courses_data if not c.get("isPublished")]),
                "pendingChapters": sum(len([ch for ch in c.get("chapters", []) if not ch.get("isPublished")]) for c in courses_data)
            }
        })

    return jsonify({"mode": "student", **build_student_metrics(user["userId"])})
