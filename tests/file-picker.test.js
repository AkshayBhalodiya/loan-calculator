const assert = require('assert');

// 1. Test extension to icon mapping logic
function getFileIconClass(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf":
      return "fa-solid fa-file-pdf text-rose-500 text-2xl";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return "fa-solid fa-file-image text-emerald-500 text-2xl";
    case "doc":
    case "docx":
    case "txt":
      return "fa-solid fa-file-word text-blue-500 text-2xl";
    default:
      return "fa-solid fa-file text-slate-400 text-2xl";
  }
}

// 2. Test deduplication logic
function processIncomingFiles(existingFiles, incomingFiles) {
  const newFilesList = [];
  const skippedFiles = [];

  incomingFiles.forEach((file) => {
    // Deduplication check
    const isDuplicate = existingFiles.some(
      (f) => f.name === file.name && f.size === file.size
    ) || newFilesList.some(
      (f) => f.name === file.name && f.size === file.size
    );

    if (isDuplicate) {
      skippedFiles.push(file.name);
      return;
    }

    const iconClass = getFileIconClass(file.name);

    newFilesList.push({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      iconClass,
      fileObject: file,
      status: "pending",
    });
  });

  return { newFilesList, skippedFiles };
}

async function run() {
  // Test 1: Icon mapping classes
  assert.ok(getFileIconClass("report.pdf").includes("fa-file-pdf"));
  assert.ok(getFileIconClass("report.pdf").includes("text-rose-500"));

  assert.ok(getFileIconClass("photo.jpeg").includes("fa-file-image"));
  assert.ok(getFileIconClass("photo.jpeg").includes("text-emerald-500"));

  assert.ok(getFileIconClass("document.docx").includes("fa-file-word"));
  assert.ok(getFileIconClass("document.docx").includes("text-blue-500"));

  assert.ok(getFileIconClass("archive.zip").includes("fa-file"));
  assert.ok(getFileIconClass("archive.zip").includes("text-slate-400"));

  // Test 2: Deduplication
  const existing = [
    { name: "receipt1.pdf", size: 1024 },
    { name: "receipt2.png", size: 2048 }
  ];

  const incoming = [
    { name: "receipt1.pdf", size: 1024, type: "application/pdf" }, // Duplicate
    { name: "receipt3.jpg", size: 4096, type: "image/jpeg" },     // New
    { name: "receipt1.pdf", size: 2048, type: "application/pdf" }  // Same name, different size (allowed!)
  ];

  const result = processIncomingFiles(existing, incoming);

  assert.strictEqual(result.newFilesList.length, 2);
  assert.strictEqual(result.skippedFiles.length, 1);
  assert.strictEqual(result.skippedFiles[0], "receipt1.pdf");

  assert.strictEqual(result.newFilesList[0].name, "receipt3.jpg");
  assert.ok(result.newFilesList[0].iconClass.includes("fa-file-image"));

  assert.strictEqual(result.newFilesList[1].name, "receipt1.pdf");
  assert.ok(result.newFilesList[1].iconClass.includes("fa-file-pdf"));

  console.log('file picker deduplication and icon mapping tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
