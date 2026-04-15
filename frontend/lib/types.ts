export type Category = {
  id: string;
  name: string;
};

export const Role = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const VideoSourceType = {
  UPLOAD: "UPLOAD",
  EXTERNAL: "EXTERNAL",
} as const;

export type VideoSourceType =
  (typeof VideoSourceType)[keyof typeof VideoSourceType];

export const VideoProvider = {
  YOUTUBE: "YOUTUBE",
  VIMEO: "VIMEO",
  OTHER: "OTHER",
} as const;

export type VideoProvider = (typeof VideoProvider)[keyof typeof VideoProvider];

export const TranscriptStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  NOT_AVAILABLE: "NOT_AVAILABLE",
} as const;

export type TranscriptStatus =
  (typeof TranscriptStatus)[keyof typeof TranscriptStatus];

export type Course = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  isPublished: boolean;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Chapter = {
  id: string;
  title: string;
  description: string | null;
  videoSourceType: VideoSourceType | null;
  videoUrl: string | null;
  externalUrl: string | null;
  embedUrl: string | null;
  videoProvider: VideoProvider | null;
  transcript: string | null;
  transcriptStatus: TranscriptStatus | null;
  duration: number | null;
  position: number;
  isPublished: boolean;
  isFree: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Attachment = {
  id: string;
  name: string;
  url: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProgress = {
  id: string;
  userId: string;
  chapterId: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Purchase = {
  id: string;
  userId: string;
  courseId: string;
  lastChapterId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MuxData = {
  id: string;
  assetId: string;
  playbackId: string | null;
  chapterId: string;
};

