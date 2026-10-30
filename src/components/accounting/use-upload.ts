import { useState } from "react";
import type { useCommercialWrite } from "./use-commercial-write";

type Write = ReturnType<typeof useCommercialWrite>;

/** One file chosen in a dialog, uploaded once right before the JSON write; `wrap` folds the upload into the write's busy state. */
export function useUpload(uploader: (file: File) => Promise<{ id: string }>) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; id: string } | null>(null);
  async function ensure(): Promise<string | null> {
    if (!file) return null;
    if (uploaded && uploaded.name === file.name) return uploaded.id;
    setUploading(true);
    try {
      const row = await uploader(file);
      setUploaded({ name: file.name, id: row.id });
      return row.id;
    } finally { setUploading(false); }
  }
  const wrap = <T extends Pick<Write, "busy" | "locked">>(write: T): T => ({ ...write, busy: write.busy || uploading, locked: write.locked || uploading });
  return { file, setFile, uploading, ensure, wrap };
}
