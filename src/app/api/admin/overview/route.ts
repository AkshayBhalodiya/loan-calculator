import { NextResponse } from "next/server";

export async function GET() {
  // placeholder admin-only endpoint (middleware enforces admin role)
  return NextResponse.json({ success: true, message: "Admin overview data" });
}
