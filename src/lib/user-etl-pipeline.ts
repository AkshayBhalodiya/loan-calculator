export interface BackfillSummary {
  applied: number;
  skipped: number;
  defaultValue: string;
  field: string;
}

export async function backfillUserLocale(userModel: any, defaultLocale = "en-US") {
  const query = {
    $or: [{ locale: { $exists: false } }, { locale: null }, { locale: "" }],
  };

  const affected = await userModel.countDocuments(query);
  if (affected === 0) {
    return {
      applied: 0,
      skipped: 0,
      defaultValue: defaultLocale,
      field: "locale",
    } satisfies BackfillSummary;
  }

  const result = await userModel.updateMany(query, {
    $set: { locale: defaultLocale },
  });

  return {
    applied: result?.modifiedCount ?? affected,
    skipped: Math.max(0, affected - (result?.modifiedCount ?? affected)),
    defaultValue: defaultLocale,
    field: "locale",
  } satisfies BackfillSummary;
}
