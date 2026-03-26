import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseFinancialExcel, saveToDb } from "@/lib/excel-parser";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "컨설팅";

  if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  if (![".xlsx", ".xls"].includes(ext)) {
    return NextResponse.json({ error: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "data", "incoming");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}_${crypto.randomUUID()}${ext || ".xlsx"}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  try {
    const parsed = parseFinancialExcel(filePath);
    const result = saveToDb(parsed, label);
    return NextResponse.json({
      success: true,
      customerId: result.customerId,
      snapshotId: result.snapshotId,
      customerName: parsed.customer.name,
      customerLabel: result.customerLabel,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `파싱 오류: ${message}` }, { status: 500 });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
