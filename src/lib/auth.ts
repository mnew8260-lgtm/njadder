import { cookies } from "next/headers";
import { sql, ensureSchema, verifyToken } from "./db";

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

export type UserRole = "admin" | "user";
export type UserStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

export type AuthResult =
  | { user: AuthUser; error: null }
  | { user: null; error: string };

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated or user doesn't exist.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("njadder_session")?.value;
    if (!token) return null;

    const userId = await verifyToken(token);
    if (!userId) return null;

    await ensureSchema();
    const rows = await sql`
      SELECT id, username, role, status
      FROM users
      WHERE id = ${userId}
    `;
    const user = (rows as any[])[0];
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      role: (user.role || "user") as UserRole,
      status: (user.status || "pending") as UserStatus,
    };
  } catch (e) {
    console.error("[auth] getCurrentUser error:", e);
    return null;
  }
}

/**
 * Require any authenticated user (regardless of status).
 */
export async function requireUser(): Promise<AuthUser | null> {
  return getCurrentUser();
}

/**
 * Require admin role. Returns null if not admin.
 */
export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/**
 * Require approved user (admins auto-pass).
 * Returns null if: not authenticated, pending, or rejected.
 */
export async function requireApproved(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  // Admins always pass (even if status is somehow not 'approved')
  if (user.role === "admin") return user;
  if (user.status === "approved") return user;
  return null;
}

/**
 * Check if user can access protected resources.
 * Returns { allowed: boolean, reason?: string }
 */
export async function checkAccess(): Promise<{ allowed: boolean; user: AuthUser | null; reason?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false, user: null, reason: "Not authenticated" };
  }
  if (user.role === "admin") {
    return { allowed: true, user };
  }
  if (user.status === "pending") {
    return { allowed: false, user, reason: "حسابك بانتظار موافقة المطور" };
  }
  if (user.status === "rejected") {
    return { allowed: false, user, reason: "تم رفض حسابك من قبل المطور" };
  }
  if (user.status === "approved") {
    return { allowed: true, user };
  }
  return { allowed: false, user, reason: "حالة الحساب غير معروفة" };
}
