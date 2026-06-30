import { NextResponse } from "next/server";
import { parseReceiptText } from "@/lib/receipt-parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, message: "Receipt text is required." },
        { status: 400 }
      );
    }

    const parsed = parseReceiptText(text);
    return NextResponse.json({ success: true, receipt: parsed });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message ?? "Failed to scan receipt." },
      { status: 500 }
    );
  }
}
