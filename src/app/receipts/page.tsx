"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { UI } from "@/lib/ui-classes";
import { useNotificationStore } from "@/hooks/use-notification-store";

interface SelectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  iconClass: string;
  fileObject: File;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
}

function getFileIconClass(filename: string) {
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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function ReceiptsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addNotification } = useNotificationStore();

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/receipts");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="lw-auth-loading">
        <div className="lw-auth-spinner" />
      </div>
    );
  }

  if (!session) return null;

  function processFiles(incomingFiles: FileList | File[]) {
    const newFilesList: SelectedFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
      // 1. Deduplication (check name and size)
      const isDuplicate = selectedFiles.some(
        (f) => f.name === file.name && f.size === file.size
      ) || newFilesList.some(
        (f) => f.name === file.name && f.size === file.size
      );

      if (isDuplicate) {
        addNotification(`Skipped duplicate file: ${file.name}`, "info");
        return;
      }

      // 2. Extension-icon mapping
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

    if (newFilesList.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFilesList]);
      addNotification(`Added ${newFilesList.length} files to queue.`, "success");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }

  function removeFile(id: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDragStartItem(e: React.DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOverItem(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...selectedFiles];
    const draggedItem = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSelectedFiles(reordered);
  }

  function handleDragEndItem() {
    setDraggedIndex(null);
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    
    // Upload files sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const fileItem = selectedFiles[i];
      if (fileItem.status === "success") continue;

      setSelectedFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: "uploading" } : f))
      );

      const formData = new FormData();
      formData.append("receipt", fileItem.fileObject);

      try {
        const res = await fetch("/api/expenses/receipt", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, status: "success" } : f))
          );
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (err: any) {
        const errMsg = err.message || "Upload failed";
        setSelectedFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: "error", errorMsg: errMsg } : f))
        );
        addNotification(`Failed to upload ${fileItem.name}: ${errMsg}`, "error");
      }
    }

    setUploading(false);
    addNotification("Upload processing complete.", "info");
  }

  const pendingCount = selectedFiles.filter((f) => f.status === "pending").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-8">
      <section className={UI.hero}>
        <h1 className={UI.titleHero}>Receipt Documents</h1>
        <p className={UI.subtitle}>Upload and scan your expense or payment receipts.</p>
      </section>

      {/* Drag & Drop File Picker Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
            : "border-[var(--lw-border)] bg-[var(--lw-surface)] hover:bg-[var(--lw-surface-muted)]"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".png,.jpg,.jpeg,.pdf"
        />

        {/* FontAwesome active highlight icon */}
        <div className="mb-4">
          {isDragging ? (
            <i className="fa-solid fa-file-arrow-up text-5xl text-indigo-500 animate-bounce"></i>
          ) : (
            <i className="fa-solid fa-cloud-arrow-up text-5xl text-[var(--lw-text-muted)]"></i>
          )}
        </div>

        <p className="font-semibold text-sm mb-1 text-[var(--lw-text)]">
          {isDragging ? "Drop your files here!" : "Click to select or drag & drop files here"}
        </p>
        <p className="text-xs text-[var(--lw-text-muted)]">
          Supports PDF, PNG, JPG and JPEG files (Max 2MB per file)
        </p>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <section className={`${UI.card} p-5 space-y-4`}>
          <div className="flex items-center justify-between border-b border-[var(--lw-border)] pb-3">
            <h2 className={`font-semibold ${UI.titleSm}`}>Upload Queue ({selectedFiles.length})</h2>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
            >
              Clear Queue
            </button>
          </div>

          <div className="divide-y divide-[var(--lw-border)] max-h-80 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div 
                key={file.id} 
                draggable
                onDragStart={(e) => handleDragStartItem(e, idx)}
                onDragOver={(e) => handleDragOverItem(e, idx)}
                onDragEnd={handleDragEndItem}
                className={`flex items-center justify-between py-3 transition-colors duration-150 ${
                  draggedIndex === idx
                    ? "bg-[var(--lw-surface-accent-b)] opacity-60"
                    : "hover:bg-[var(--lw-surface-muted)]"
                }`}
              >
                <div className="flex items-center gap-3 pl-2">
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 p-1 flex items-center justify-center" title="Drag to reorder">
                    <i className="fa-solid fa-grip-vertical text-sm"></i>
                  </div>
                  <i className={file.iconClass}></i>
                  <div>
                    <p className="text-xs font-bold text-[var(--lw-text)] max-w-md truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[var(--lw-text-muted)]">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pr-2">
                  {file.status === "pending" && (
                    <span className="text-[10px] font-semibold text-amber-500">
                      Pending
                    </span>
                  )}
                  {file.status === "uploading" && (
                    <span className="text-[10px] font-semibold text-indigo-500 animate-pulse">
                      Uploading...
                    </span>
                  )}
                  {file.status === "success" && (
                    <span className="text-[10px] font-semibold text-emerald-500">
                      <i className="fa-solid fa-circle-check mr-1"></i> Success
                    </span>
                  )}
                  {file.status === "error" && (
                    <span className="text-[10px] font-semibold text-rose-500" title={file.errorMsg}>
                      <i className="fa-solid fa-triangle-exclamation mr-1"></i> Error
                    </span>
                  )}

                  {file.status !== "uploading" && file.status !== "success" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                      title="Remove file"
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={uploadFiles}
              disabled={uploading || pendingCount === 0}
              className={`${UI.btnPrimary} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {uploading ? "Uploading..." : `Upload ${pendingCount} File(s)`}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
