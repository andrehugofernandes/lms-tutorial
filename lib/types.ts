export type Category = {
  id: string;
  name: string;
};

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
  videoUrl: string | null;
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
