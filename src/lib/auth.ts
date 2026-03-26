import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set (recommended 32+ chars).");
  }
  return secret;
}
const SECRET = getJwtSecret();

export interface TokenPayload {
  userId: number;
  username: string;
  role: "admin" | "customer";
  customerId?: number;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(role?: "admin" | "customer"): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (role && session.role !== role && session.role !== "admin") throw new Error("Forbidden");
  return session;
}
