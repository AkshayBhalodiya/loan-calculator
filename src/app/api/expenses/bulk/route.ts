import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { ExpenseModel } from "@/lib/expense-model";
import { enforceRateLimit, requireUserId, jsonOk, jsonError } from "@/lib/api-utils";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "expenses-bulk");
  if (limited) return limited;

  const { userId, error } = await requireUserId();
  if (error) return error;

  try {
    const body = await req.json();
    if (!Array.isArray(body)) return jsonError("Expected an array of expenses.", 400);

    const items = body;
    const validationFailures: Array<{ index: number; message: string; details?: any }> = [];
    const validDocs: any[] = [];

    // Validate each item using Mongoose schema validation
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const doc = Object.assign({}, raw, { userId });
      const instance = new ExpenseModel(doc);
      try {
        await instance.validate();
        // push raw doc (without Mongoose internals)
        validDocs.push(doc);
      } catch (err: any) {
        // collect validation error details
        if (err && err.name === "ValidationError" && err.errors) {
          const details = Object.values(err.errors).map((e: any) => e.message);
          validationFailures.push({ index: i, message: "Validation failed", details });
        } else {
          validationFailures.push({ index: i, message: err?.message ?? "Validation failed" });
        }
      }
    }

    let insertedCount = 0;
    const insertionFailures: Array<{ index?: number; message: string }> = [];

    if (validDocs.length > 0) {
      await connectMongo();
      try {
        const inserted = await ExpenseModel.insertMany(validDocs, { ordered: false });
        insertedCount = Array.isArray(inserted) ? inserted.length : 0;
      } catch (err: any) {
        // handle partial failures from insertMany
        // MongoBulkWriteError may include writeErrors array
        if (err && err.writeErrors && Array.isArray(err.writeErrors)) {
          insertedCount = (err.result && err.result.nInserted) || 0;
          for (const we of err.writeErrors) {
            insertionFailures.push({ index: we.index, message: we.errmsg || "Insert failed" });
          }
        } else if (err && err.message) {
          // unknown insertion error
          insertionFailures.push({ message: err.message });
        }
      }
    }

    const succeeded = insertedCount;
    const failed = validationFailures.length + insertionFailures.length;

    return jsonOk({ succeeded, failed, validationFailures, insertionFailures });
  } catch (err: any) {
    return jsonError(err?.message ?? "Server error", 500);
  }
}
