import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel, reportOwnerFilter } from "@/lib/report-model";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getSessionUserId,
  jsonError,
  jsonOk,
  mongoErrorMessage,
} from "@/lib/api-utils";
import { patchReportSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

async function findOwnedReport(id: string, userId: string | null, role: string | null) {
  const report = await ReportModel.findById(id);
  if (!report) return { report: null, forbidden: false };

  if (role === "admin") return { report, forbidden: false };
  if (!userId || report.userId !== userId) {
    return { report: null, forbidden: true };
  }
  return { report, forbidden: false };
}

export async function GET(_: Request, { params }: Params) {
  const limited = enforceRateLimit(_, "report-id");
  if (limited) return limited;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid report id.", 400);
  }

  try {
    await connectMongo();
    const session = await auth();
    const userId = session?.user?.email ?? null;
    const role = session?.user?.role ?? null;
    const { report, forbidden } = await findOwnedReport(id, userId, role);
    if (forbidden) return jsonError("Sign in to view this report.", 403);
    if (!report) return jsonError("Report not found.", 404);
    return jsonOk({ report: report.toObject() });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to load report"), 500);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, "report-patch");
  if (limited) return limited;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid report id.", 400);
  }

  try {
    const body = await req.json();
    const parsed = patchReportSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.", 400);
    }

    await connectMongo();
    const session = await auth();
    const userId = session?.user?.email ?? null;
    const role = session?.user?.role ?? null;
    const { report, forbidden } = await findOwnedReport(id, userId, role);
    if (forbidden) return jsonError("Not allowed to edit this report.", 403);
    if (!report) return jsonError("Report not found.", 404);

    if (parsed.data.title !== undefined) report.title = parsed.data.title;
    if (parsed.data.notes !== undefined) report.notes = parsed.data.notes;
    await report.save();

    return jsonOk({ report: report.toObject() });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to update report"), 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, "report-delete");
  if (limited) return limited;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid report id.", 400);
  }

  try {
    await connectMongo();
    const session = await auth();
    const userId = session?.user?.email ?? null;
    const role = session?.user?.role ?? null;
    const { report, forbidden } = await findOwnedReport(id, userId, role);
    if (forbidden) return jsonError("Not allowed to delete this report.", 403);
    if (!report) return jsonError("Report not found.", 404);

    await ReportModel.deleteOne({ _id: report._id });
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to delete report"), 500);
  }
}
