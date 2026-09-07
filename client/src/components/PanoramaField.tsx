"use client";

import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { X } from "lucide-react";

const MAX_WIDTH = 4096;

const downscale = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const ratio = bitmap.width / bitmap.height;
  const width = Math.min(bitmap.width, MAX_WIDTH);
  const height = Math.round(width / ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("Could not process this image");

  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
    }),
    width,
    height,
    ratio,
    originalBytes: file.size,
  };
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

type PanoramaFieldProps = {
  existingPanorama?: string | null;
  onRemoveExisting?: () => void;
};

const PanoramaField = ({
  existingPanorama,
  onRemoveExisting,
}: PanoramaFieldProps) => {
  const { setValue } = useFormContext();
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setWarning(null);
    setInfo(null);
    try {
      const result = await downscale(file);
      setValue("panorama", result.file, { shouldDirty: true });
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(result.file);
      });
      setInfo(
        `${result.width}×${result.height} · ${mb(result.file.size)} (from ${mb(result.originalBytes)})`,
      );
      if (Math.abs(result.ratio - 2) > 0.05) {
        setWarning(
          `This image is ${result.ratio.toFixed(2)}:1. Equirectangular panoramas are 2:1, so this one will look stretched in the viewer.`,
        );
      }
    } catch (error) {
      setWarning(
        error instanceof Error ? error.message : "Could not read that image",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearSelection = () => {
    setValue("panorama", undefined, { shouldDirty: true });
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setInfo(null);
    setWarning(null);
  };

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium">360° tour (optional)</h3>
      <p className="mb-3 text-xs text-gray-500">
        An equirectangular photo — the Google Street View app calls these
        photospheres. Large files are resized here before uploading.
      </p>

      {existingPanorama && !preview && (
        <div className="relative mb-3 w-full overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={existingPanorama}
            alt="Current 360° tour"
            className="h-32 w-full object-cover"
          />
          {onRemoveExisting && (
            <button
              type="button"
              onClick={onRemoveExisting}
              aria-label="Remove the current 360° tour"
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {preview && (
        <div className="relative mb-3 w-full overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selected 360° tour"
            className="h-32 w-full object-cover"
          />
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Remove the selected 360° tour"
            className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-50 disabled:opacity-50"
      />

      {busy && <p className="mt-2 text-xs text-gray-500">Processing…</p>}
      {info && <p className="mt-2 text-xs text-gray-500">{info}</p>}
      {warning && <p className="mt-2 text-xs text-amber-600">{warning}</p>}
    </div>
  );
};

export default PanoramaField;