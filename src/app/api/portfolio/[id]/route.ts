import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-가-힣]/g, "_");
}

function parseCustomerId(id: string): number | null {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = parseCustomerId((await params).id);
  if (!customerId) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

  if (session.role !== "admin" && session.customerId !== customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const files = db.prepare(`
    SELECT
      pf.id,
      pf.snapshot_id,
      pf.original_name,
      pf.mime_type,
      pf.file_size,
      pf.note,
      pf.created_at,
      s.label AS snapshot_label,
      ('/api/portfolio/file/' || pf.id) AS file_url
    FROM portfolio_files pf
    LEFT JOIN snapshots s ON s.id = pf.snapshot_id
    WHERE pf.customer_id = ?
    ORDER BY pf.created_at DESC
  `).all(customerId);

  return NextResponse.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customerId = parseCustomerId((await params).id);
  if (!customerId) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

  const db = getDb();
  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(customerId) as { id: number } | undefined;
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const note = (formData.get("note") as string | null)?.trim() || "";
  const snapshotIdRaw = formData.get("snapshotId") as string | null;
  const snapshotId = snapshotIdRaw ? Number(snapshotIdRaw) : null;

  if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "파일 용량은 25MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "PDF 또는 이미지(PNG/JPG/WEBP/GIF)만 업로드 가능합니다." }, { status: 400 });
  }

  if (snapshotId !== null) {
    if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
      return NextResponse.json({ error: "snapshotId 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const snapshot = db
      .prepare("SELECT id FROM snapshots WHERE id = ? AND customer_id = ?")
      .get(snapshotId, customerId) as { id: number } | undefined;
    if (!snapshot) {
      return NextResponse.json({ error: "선택한 점검 이력이 해당 고객에 존재하지 않습니다." }, { status: 400 });
    }
  }

  const relativeDir = path.join(`customer_${customerId}`);
  const absoluteDir = path.join(process.cwd(), "data", "portfolio", relativeDir);
  if (!fs.existsSync(absoluteDir)) fs.mkdirSync(absoluteDir, { recursive: true });

  const storedName = `${Date.now()}_${sanitizeFileName(file.name)}`;
  const absolutePath = path.join(absoluteDir, storedName);
  const relativePath = path.join(relativeDir, storedName).replace(/\\/g, "/");

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absolutePath, buffer);

  const result = db.prepare(`
    INSERT INTO portfolio_files (
      customer_id, snapshot_id, original_name, stored_name, relative_path,
      mime_type, file_size, note, uploaded_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customerId,
    snapshotId,
    file.name,
    storedName,
    relativePath,
    file.type || null,
    file.size,
    note || null,
    session.userId,
  );

  const inserted = db.prepare(`
    SELECT
      pf.id,
      pf.snapshot_id,
      pf.original_name,
      pf.mime_type,
      pf.file_size,
      pf.note,
      pf.created_at,
      s.label AS snapshot_label,
      ('/api/portfolio/file/' || pf.id) AS file_url
    FROM portfolio_files pf
    LEFT JOIN snapshots s ON s.id = pf.snapshot_id
    WHERE pf.id = ?
  `).get(result.lastInsertRowid);

  return NextResponse.json({ success: true, file: inserted });
}
