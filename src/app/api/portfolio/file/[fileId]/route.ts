import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function parseFileId(fileId: string): number | null {
  const parsed = Number(fileId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveAbsolutePath(relativePath: string): string | null {
  if (!relativePath) return null;
  if (relativePath.includes("..")) return null;

  // Legacy public path support (before security hardening).
  if (relativePath.startsWith("/")) {
    const normalized = relativePath.replace(/^\/+/, "");
    return path.join(process.cwd(), "public", normalized);
  }

  return path.join(process.cwd(), "data", "portfolio", relativePath);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fileId = parseFileId((await params).fileId);
  if (!fileId) return NextResponse.json({ error: "Invalid file id" }, { status: 400 });

  const db = getDb();
  const file = db.prepare(`
    SELECT id, customer_id, original_name, relative_path, mime_type
    FROM portfolio_files
    WHERE id = ?
  `).get(fileId) as
    | {
      id: number;
      customer_id: number;
      original_name: string;
      relative_path: string;
      mime_type: string | null;
    }
    | undefined;

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (session.role !== "admin" && session.customerId !== file.customer_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const absolutePath = resolveAbsolutePath(file.relative_path);
  if (!absolutePath) return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  if (!fs.existsSync(absolutePath)) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  const fileBuffer = fs.readFileSync(absolutePath);
  const extension = path.extname(file.original_name).toLowerCase();
  const contentType = file.mime_type || MIME_BY_EXTENSION[extension] || "application/octet-stream";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
