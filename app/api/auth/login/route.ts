import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-config";
import { dbGetUserByUsername, dbEnsureUsersSeeded, checkPassword } from "@/lib/db/users-db";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  await dbEnsureUsersSeeded();
  const user = await dbGetUserByUsername(username.trim().toLowerCase());
  if (!user || !checkPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
  }
  const response = NextResponse.json({ success: true, name: user.displayName, role: user.role });
  response.cookies.set(SESSION_COOKIE, `${user.id}:${user.username}:${user.role}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}
