import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = parseInt(id);

  if (session.role !== "admin" && session.customerId !== customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshots = db.prepare("SELECT * FROM snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC").all(customerId);

  const latestSnapshot = snapshots[0] as { id: number } | undefined;
  let details = null;
  if (latestSnapshot) {
    details = {
      assets: db.prepare("SELECT * FROM assets WHERE snapshot_id = ?").all(latestSnapshot.id),
      expenses: db.prepare("SELECT * FROM expense_details WHERE snapshot_id = ?").all(latestSnapshot.id),
      real_estate: db.prepare("SELECT * FROM real_estate WHERE snapshot_id = ?").all(latestSnapshot.id),
      debts: db.prepare("SELECT * FROM debts WHERE snapshot_id = ?").all(latestSnapshot.id),
      insurance: db.prepare("SELECT * FROM insurance WHERE snapshot_id = ?").all(latestSnapshot.id),
    };
  }

  return NextResponse.json({ customer, snapshots, details });
}
