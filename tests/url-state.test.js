const assert = require('assert');

// Logic helpers matching page.tsx implementation
function encodeState(loan, strategy) {
  const payload = { loan, strategy };
  const jsonStr = JSON.stringify(payload);
  return Buffer.from(jsonStr, 'utf8').toString('base64');
}

function decodeState(base64String) {
  const jsonStr = Buffer.from(base64String, 'base64').toString('utf8');
  return JSON.parse(jsonStr);
}

async function run() {
  const sampleLoan = {
    loanAmount: 5000000,
    annualRate: 8.5,
    tenureYears: 20,
    startDate: "2026-06-01",
    loanType: "Home",
    manualEmi: null,
  };

  const sampleStrategy = {
    monthlyExtra: 5000,
    extraEmiEveryMonths: 6,
    yearlyLumpSum: 50000,
    useMonthlyExtra: true,
    usePeriodicExtraEmi: true,
    useYearlyLumpSum: true,
  };

  // 1. Verify encoding
  const encoded = encodeState(sampleLoan, sampleStrategy);
  assert.ok(typeof encoded === 'string');
  assert.ok(encoded.length > 20);

  // 2. Verify decoding
  const decoded = decodeState(encoded);
  assert.deepStrictEqual(decoded.loan, sampleLoan);
  assert.deepStrictEqual(decoded.strategy, sampleStrategy);

  // 3. Unicode safety check (e.g. testing special characters/emoji)
  const specialStrategy = {
    ...sampleStrategy,
    notes: "🚀 Test prepayment Strategy with UTF8 chars like ₹ and €!"
  };
  const specialEncoded = encodeState(sampleLoan, specialStrategy);
  const specialDecoded = decodeState(specialEncoded);
  assert.strictEqual(specialDecoded.strategy.notes, specialStrategy.notes);

  console.log('URL state serialization and decoding tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
