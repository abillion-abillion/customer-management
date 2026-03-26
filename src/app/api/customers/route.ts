import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const search = req.nextUrl.searchParams.get("q") || "";

  let customers;
  if (session.role === "admin") {
    if (search) {
      customers = db.prepare("SELECT * FROM customers WHERE name LIKE ? OR label LIKE ? ORDER BY name").all(`%${search}%`, `%${search}%`);
    } else {
      customers = db.prepare("SELECT * FROM customers ORDER BY name").all();
    }
  } else {
    customers = db.prepare("SELECT * FROM customers WHERE id = ?").all(session.customerId);
  }

  return NextResponse.json(customers);
}
