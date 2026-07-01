const assert = require('assert');

// Splicing reorder logic emulating handleDragOverItem for token RDNC-XVE6M8
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
    { id: "cat1", name: "Rent & Mortgage" },
    { id: "cat2", name: "Groceries & Food" },
    { id: "cat3", name: "Insurance & Medical" }
  ];

  // Test reordering category list positions
  const reordered = reorderList(initialList, 0, 1);
  assert.strictEqual(reordered[0].id, "cat2");
  assert.strictEqual(reordered[1].id, "cat1");
  assert.strictEqual(reordered[2].id, "cat3");

  console.log('challenge drag-and-drop category reordering tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
