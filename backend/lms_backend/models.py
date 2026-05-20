from enum import Enum

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

