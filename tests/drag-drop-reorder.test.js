const assert = require('assert');

// Splicing reorder logic emulating handleDragOverItem
function reorderList(list, draggedIndex, targetIndex) {
  if (draggedIndex === null || draggedIndex === targetIndex) return list;
  
  const reordered = [...list];
  const draggedItem = reordered[draggedIndex];
  reordered.splice(draggedIndex, 1);
  reordered.splice(targetIndex, 0, draggedItem);
  return reordered;
}

async function run() {
  const initialList = [
    { id: "1", name: "receipt_A.pdf" },
    { id: "2", name: "receipt_B.png" },
    { id: "3", name: "receipt_C.jpg" }
  ];

  // Test 1: Drag item from index 0 to index 2
  // Expect: [B, C, A]
  const reordered1 = reorderList(initialList, 0, 2);
  assert.strictEqual(reordered1[0].id, "2");
  assert.strictEqual(reordered1[1].id, "3");
  assert.strictEqual(reordered1[2].id, "1");

  // Test 2: Drag item from index 2 to index 0
  // Expect: [C, A, B]
  const reordered2 = reorderList(initialList, 2, 0);
  assert.strictEqual(reordered2[0].id, "3");
  assert.strictEqual(reordered2[1].id, "1");
  assert.strictEqual(reordered2[2].id, "2");

  // Test 3: Drag item to its own index (no-op)
  const reordered3 = reorderList(initialList, 1, 1);
  assert.deepStrictEqual(reordered3, initialList);

  console.log('list drag-and-drop reordering tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
