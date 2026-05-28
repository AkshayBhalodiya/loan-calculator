"use client";

import { useState } from "react";

type CopyShareButtonProps = {
  url: string;
};

export default function CopyShareButton({ url }: CopyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      {copied ? "URL Copied" : "Copy Share URL"}
    </button>
  );
}
