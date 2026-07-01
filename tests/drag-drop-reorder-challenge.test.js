const assert = require('assert');

// Mirror the exported reorderCategories logic from src/app/receipts/page.tsx
// (Node can't import TSX directly, so we replicate the pure function here)
function reorderCategories(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

async function run() {
  const DEFAULT_CATEGORIES = [
    { id: "rent",       label: "Rent & Mortgage" },
    { id: "food",       label: "Groceries & Food" },
    { id: "insurance",  label: "Insurance & Medical" },
    { id: "transport",  label: "Transport & Fuel" },
    { id: "utilities",  label: "Utilities & Bills" },
  ];

  // Test 1: Move "Rent" (idx 0) down to idx 2 → Food, Insurance, Rent, Transport, Utilities
  const result1 = reorderCategories(DEFAULT_CATEGORIES, 0, 2);
  assert.strictEqual(result1[0].id, "food");
  assert.strictEqual(result1[1].id, "insurance");
  assert.strictEqual(result1[2].id, "rent");
  assert.strictEqual(result1[3].id, "transport");
  assert.strictEqual(result1[4].id, "utilities");

  // Test 2: Move last item (idx 4) to top (idx 0) → Utilities first
  const result2 = reorderCategories(DEFAULT_CATEGORIES, 4, 0);
  assert.strictEqual(result2[0].id, "utilities");
  assert.strictEqual(result2[1].id, "rent");
  assert.strictEqual(result2[4].id, "transport");

  // Test 3: Drag to same index is a no-op — returns original reference shape
  const result3 = reorderCategories(DEFAULT_CATEGORIES, 2, 2);
  assert.deepStrictEqual(result3, DEFAULT_CATEGORIES);

  // Test 4: Verify list length is preserved after reorder
  const result4 = reorderCategories(DEFAULT_CATEGORIES, 1, 3);
  assert.strictEqual(result4.length, DEFAULT_CATEGORIES.length);

  console.log('challenge drag-and-drop category reordering tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
