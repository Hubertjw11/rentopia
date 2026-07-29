"use client";

import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { toast } from "sonner";

/**
 * Fetches a protected file from the API and saves it to disk.
 * RTK Query is JSON-only, so binary responses need their own path.
 */
const downloadFile = async (path: string, fallbackName: string) => {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/${path}`,
    { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Download failed");
  }

  // Server sends the real filename; needs cors({ exposedHeaders }) to be readable.
  const disposition = response.headers.get("Content-Disposition") || "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export const useDownload = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (path: string, fallbackName: string) => {
    setDownloading(path);
    try {
      await downloadFile(path, fallbackName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return { download, downloading };
};