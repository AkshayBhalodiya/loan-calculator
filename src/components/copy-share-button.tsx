"use client";

import { useState } from "react";
import { UI } from "@/lib/ui-classes";

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
      className={UI.btnSecondary}
    >
      {copied ? "URL Copied" : "Copy Share URL"}
    </button>
  );
}
