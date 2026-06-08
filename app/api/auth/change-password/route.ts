import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { dbGetUser, dbSaveUser, checkPassword, hashPassword } from "@/lib/db/users-db";

export async function POST(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const [userId] = session.split(":");
  const { currentPassword, newPassword } = await request.json();
  const user = await dbGetUser(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!checkPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Nova senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }
  await dbSaveUser({ ...user, passwordHash: hashPassword(newPassword) });
  return NextResponse.json({ success: true });
}
