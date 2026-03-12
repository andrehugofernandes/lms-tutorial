import { hasRole } from "./rbac";
import { Role } from "@prisma/client";

export const isTeacher = async (userId?: string | null) => {
  if (!userId) return false;
  return await hasRole(userId, [Role.TEACHER, Role.ADMIN]);
};

export const isAdmin = async (userId?: string | null) => {
  if (!userId) return false;
  return await hasRole(userId, [Role.ADMIN]);
};