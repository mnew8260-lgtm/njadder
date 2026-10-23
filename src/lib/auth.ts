import { cookies } from "next/headers";
import { sql, ensureSchema, verifyToken } from "./db";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("njadder_session")?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  await ensureSchema();
  const rows = await sql`SELECT id, username, role FROM users WHERE id = ${userId}`;
  return (rows as any[])[0] || null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
