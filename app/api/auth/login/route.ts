import { NextRequest, NextResponse } from "next/server";
import { AUTH_USERS, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-config";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const user = AUTH_USERS.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password
  );

  if (!user) {
    return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, name: user.name, role: user.role });
  response.cookies.set(SESSION_COOKIE, `${user.id}:${user.username}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
