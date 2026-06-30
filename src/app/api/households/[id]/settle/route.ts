import { NextResponse } from "next/server";
import { getSettlementSuggestions } from "@/lib/household-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Household id is required." }, { status: 400 });
    }

    const suggestions = await getSettlementSuggestions(id);
    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message ?? "Failed to calculate settlements." }, { status: 500 });
  }
}
