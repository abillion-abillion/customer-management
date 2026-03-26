import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as {
    id: number; username: string; password: string; role: string; customer_id: number | null;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "customer",
    customerId: user.customer_id ?? undefined,
  });

  const res = NextResponse.json({
    role: user.role,
    customerId: user.customer_id,
    username: user.username,
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("token");
  return res;
}
