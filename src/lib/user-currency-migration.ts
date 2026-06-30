export async function backfillUserCurrencies(userModel: any, defaultCurrency = "USD") {
  const query = {
    $or: [
      { currency: { $exists: false } },
      { currency: null },
      { currency: "" },
    ],
  };

  const missing = await userModel.countDocuments(query);
  if (missing === 0) {
    return { applied: 0, defaultCurrency, skipped: true };
  }

  const result = await userModel.updateMany(query, {
    $set: { currency: defaultCurrency },
  });

  return {
    applied: result?.modifiedCount ?? 0,
    defaultCurrency,
    skipped: false,
  };
}
