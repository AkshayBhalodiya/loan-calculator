const assert = require('assert');

async function run() {
  const { parseReceiptText } = await import('../src/lib/receipt-parser.ts');

  const sample = [
    'Receipt',
    'Date: 2026-06-30',
    'Coffee 2 x 3.50',
    'Sandwich 1 x 8.25',
    'Total: 15.25',
  ].join('\n');

  const result = parseReceiptText(sample);

  assert.strictEqual(result.date, '2026-06-30');
  assert.strictEqual(result.total, 15.25);
  assert.deepStrictEqual(result.lineItems, [
    { description: 'Coffee', quantity: 2, unitPrice: 3.5 },
    { description: 'Sandwich', quantity: 1, unitPrice: 8.25 },
  ]);

  console.log('receipt parser tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
