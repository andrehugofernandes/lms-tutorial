import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, Float, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.sql import func

from .extensions import db


def uuid_str() -> str:
    return str(uuid.uuid4())


class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class VideoSourceTypeEnum(str, Enum):
    UPLOAD = "UPLOAD"
    EXTERNAL = "EXTERNAL"


class VideoProviderEnum(str, Enum):
    YOUTUBE = "YOUTUBE"
    VIMEO = "VIMEO"
    OTHER = "OTHER"


class TranscriptStatusEnum(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    NOT_AVAILABLE = "NOT_AVAILABLE"


class User(db.Model):
    __tablename__ = "User"

    id = db.Column(String, primary_key=True)
    name = db.Column(String)
    email = db.Column(String, unique=True)
    password = db.Column(String)
    emailVerified = db.Column(DateTime)
    image = db.Column(String)


class Profile(db.Model):
    __tablename__ = "Profile"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = db.Column(String)
    email = db.Column(String)
    role = db.Column(SQLEnum(RoleEnum, name="Role"), nullable=False, default=RoleEnum.STUDENT)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Category(db.Model):
    __tablename__ = "Category"

    id = db.Column(String, primary_key=True, default=uuid_str)
    name = db.Column(String, unique=True, nullable=False)


class Course(db.Model):
    __tablename__ = "Course"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    title = db.Column(String, nullable=False)
    description = db.Column(Text)
    imageUrl = db.Column(String)
    price = db.Column(Float)
    isPublished = db.Column(Boolean, nullable=False, default=False)
    categoryId = db.Column(String, ForeignKey("Category.id"))
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship("Category", lazy="joined")
    chapters = db.relationship("Chapter", back_populates="course", lazy="select")
    attachments = db.relationship("Attachment", back_populates="course", lazy="select")


class Attachment(db.Model):
    __tablename__ = "Attachment"

    id = db.Column(String, primary_key=True, default=uuid_str)
    name = db.Column(String, nullable=False)
    url = db.Column(String, nullable=False)
    courseId = db.Column(String, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = db.relationship("Course", back_populates="attachments")


class Chapter(db.Model):
    __tablename__ = "Chapter"

    id = db.Column(String, primary_key=True, default=uuid_str)
    title = db.Column(String, nullable=False)
    description = db.Column(Text)
    duration = db.Column(Integer)
    videoSourceType = db.Column(SQLEnum(VideoSourceTypeEnum, name="VideoSourceType"))
    videoUrl = db.Column(String)
    externalUrl = db.Column(String)
    embedUrl = db.Column(String)
    videoProvider = db.Column(SQLEnum(VideoProviderEnum, name="VideoProvider"))
    transcript = db.Column(Text)
    transcriptStatus = db.Column(
        SQLEnum(TranscriptStatusEnum, name="TranscriptStatus"),
        nullable=False,
        default=TranscriptStatusEnum.NOT_AVAILABLE,
    )
    position = db.Column(Integer, nullable=False)
    isPublished = db.Column(Boolean, nullable=False, default=False)
    isFree = db.Column(Boolean, nullable=False, default=False)
    courseId = db.Column(String, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = db.relationship("Course", back_populates="chapters")
    muxData = db.relationship("MuxData", uselist=False, back_populates="chapter", lazy="joined")
    quiz = db.relationship("Quiz", uselist=False, back_populates="chapter", lazy="select")
    userProgress = db.relationship("UserProgress", back_populates="chapter", lazy="select")


class MuxData(db.Model):
    __tablename__ = "MuxData"

    id = db.Column(String, primary_key=True, default=uuid_str)
    assetId = db.Column(String, nullable=False)
    playbackId = db.Column(String)
    chapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="CASCADE"), nullable=False, unique=True)

    chapter = db.relationship("Chapter", back_populates="muxData")


class UserProgress(db.Model):
    __tablename__ = "UserProgress"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    chapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="CASCADE"), nullable=False)
    isCompleted = db.Column(Boolean, nullable=False, default=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapter = db.relationship("Chapter", back_populates="userProgress")

    __table_args__ = (
        db.UniqueConstraint("userId", "chapterId", name="UserProgress_userId_chapterId_key"),
        Index("UserProgress_chapterId_idx", "chapterId"),
    )


class Quiz(db.Model):
    __tablename__ = "Quiz"

    id = db.Column(String, primary_key=True, default=uuid_str)
    chapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="CASCADE"), nullable=False, unique=True)
    isPublished = db.Column(Boolean, nullable=False, default=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    isRequired = db.Column(Boolean, nullable=False, default=False)
    shuffleQuestions = db.Column(Boolean, nullable=False, default=False)
    maxQuestions = db.Column(Integer, nullable=False, default=5)
    passingScore = db.Column(Integer, nullable=False, default=70)
    timeLimit = db.Column(Integer)

    chapter = db.relationship("Chapter", back_populates="quiz")
    questions = db.relationship("Question", back_populates="quiz", lazy="select", order_by="Question.position")


class Question(db.Model):
    __tablename__ = "Question"

    id = db.Column(String, primary_key=True, default=uuid_str)
    quizId = db.Column(String, ForeignKey("Quiz.id", ondelete="CASCADE"), nullable=False)
    prompt = db.Column(Text, nullable=False)
    position = db.Column(Integer, nullable=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    bonusPoints = db.Column(Integer)
    isBonus = db.Column(Boolean, nullable=False, default=False)
    pointWeight = db.Column(Float, nullable=False, default=1.0)

    quiz = db.relationship("Quiz", back_populates="questions")
    options = db.relationship("Option", back_populates="question", lazy="select")


class Option(db.Model):
    __tablename__ = "Option"

    id = db.Column(String, primary_key=True, default=uuid_str)
    questionId = db.Column(String, ForeignKey("Question.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(Text, nullable=False)
    isCorrect = db.Column(Boolean, nullable=False, default=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    question = db.relationship("Question", back_populates="options")


class Answer(db.Model):
    __tablename__ = "Answer"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    questionId = db.Column(String, ForeignKey("Question.id", ondelete="CASCADE"), nullable=False)
    optionId = db.Column(String, ForeignKey("Option.id", ondelete="CASCADE"), nullable=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("userId", "questionId", name="Answer_userId_questionId_key"),
        Index("Answer_questionId_idx", "questionId"),
        Index("Answer_optionId_idx", "optionId"),
    )


class QuizResult(db.Model):
    __tablename__ = "QuizResult"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    quizId = db.Column(String, ForeignKey("Quiz.id", ondelete="CASCADE"), nullable=False)
    score = db.Column(Integer, nullable=False)
    xpEarned = db.Column(Integer, nullable=False)
    passed = db.Column(Boolean, nullable=False)
    completedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("userId", "quizId", name="QuizResult_userId_quizId_key"),
        Index("QuizResult_quizId_idx", "quizId"),
    )


class UserXP(db.Model):
    __tablename__ = "UserXP"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False, unique=True)
    totalXp = db.Column(Integer, nullable=False, default=0)
    level = db.Column(Integer, nullable=False, default=1)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Purchase(db.Model):
    __tablename__ = "Purchase"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    courseId = db.Column(String, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False)
    lastChapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="SET NULL"))
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("userId", "courseId", name="Purchase_userId_courseId_key"),
        Index("Purchase_courseId_idx", "courseId"),
    )


class Achievement(db.Model):
    __tablename__ = "Achievement"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    courseId = db.Column(String, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(String, nullable=False)
    description = db.Column(Text)
    icon = db.Column(String)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("userId", "courseId", name="Achievement_userId_courseId_key"),
        Index("Achievement_courseId_idx", "courseId"),
    )


class UserNote(db.Model):
    __tablename__ = "UserNote"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    chapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="CASCADE"), nullable=False)
    content = db.Column(Text, nullable=False)
    timestamp = db.Column(Integer, nullable=False, default=0)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("UserNote_chapterId_idx", "chapterId"),)


class ForumPost(db.Model):
    __tablename__ = "ForumPost"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False)
    courseId = db.Column(String, ForeignKey("Course.id", ondelete="CASCADE"), nullable=False)
    chapterId = db.Column(String, ForeignKey("Chapter.id", ondelete="CASCADE"), nullable=False)
    content = db.Column(Text, nullable=False)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ForumPost_courseId_idx", "courseId"),
        Index("ForumPost_chapterId_idx", "chapterId"),
    )


class UserStreak(db.Model):
    __tablename__ = "UserStreak"

    id = db.Column(String, primary_key=True, default=uuid_str)
    userId = db.Column(String, nullable=False, unique=True)
    count = db.Column(Integer, nullable=False, default=1)
    lastVisit = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    createdAt = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


def ensure_schema() -> None:
    statements = [
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TranscriptStatus') THEN
            CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NOT_AVAILABLE');
          END IF;
        END
        $$;
        """,
        'ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION',
        'ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "duration" INTEGER',
        'ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "transcript" TEXT',
        'ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT \'NOT_AVAILABLE\'',
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Quiz') THEN
            ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false;
          END IF;
        END
        $$;
        """,
        """
        CREATE TABLE IF NOT EXISTS "Purchase" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
          "lastChapterId" TEXT REFERENCES "Chapter"("id") ON DELETE SET NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        'CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_userId_courseId_key" ON "Purchase"("userId", "courseId")',
        'CREATE INDEX IF NOT EXISTS "Purchase_courseId_idx" ON "Purchase"("courseId")',
        """
        CREATE TABLE IF NOT EXISTS "Achievement" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "icon" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        'CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_userId_courseId_key" ON "Achievement"("userId", "courseId")',
        """
        CREATE TABLE IF NOT EXISTS "UserNote" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "chapterId" TEXT NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE,
          "content" TEXT NOT NULL,
          "timestamp" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        'CREATE INDEX IF NOT EXISTS "UserNote_chapterId_idx" ON "UserNote"("chapterId")',
        """
        CREATE TABLE IF NOT EXISTS "ForumPost" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
          "chapterId" TEXT NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        'CREATE INDEX IF NOT EXISTS "ForumPost_courseId_idx" ON "ForumPost"("courseId")',
        'CREATE INDEX IF NOT EXISTS "ForumPost_chapterId_idx" ON "ForumPost"("chapterId")',
        """
        CREATE TABLE IF NOT EXISTS "UserStreak" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE,
          "count" INTEGER NOT NULL DEFAULT 1,
          "lastVisit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    with db.engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
