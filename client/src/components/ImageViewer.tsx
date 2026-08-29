"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, CornerUpLeft, Pencil, Trash2 } from "lucide-react";
import { Message } from "@/types/model";
import { formatDateTime } from "@/lib/datetime";

type ImageViewerProps = {
  message: Message;
  mine: boolean;
  senderName: string;
  onClose: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (ids: number[]) => void;
};

const ImageViewer = ({
  message,
  mine,
  senderName,
  onClose,
  onReply,
  onEdit,
  onDelete,
}: ImageViewerProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!message.attachment) return null;

  const act = (run: () => void) => () => {
    run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <button type="button" onClick={onClose} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {mine ? "You" : senderName}
          </div>
          <div className="text-[10px] text-white/60">
            {formatDateTime(message.createdAt)}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-5">
          <button
            type="button"
            onClick={act(() => onReply(message))}
            aria-label="Reply"
          >
            <CornerUpLeft className="h-5 w-5" />
          </button>
          {mine && (
            <button
              type="button"
              onClick={act(() => onEdit(message))}
              aria-label="Edit caption"
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}
          {mine && (
            <button
              type="button"
              onClick={act(() => onDelete([message.id]))}
              aria-label="Delete"
              className="text-secondary-500"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <div className="relative flex-1">
        <Image
          src={message.attachment.url}
          alt={message.attachment.name}
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>

      {message.body && (
        <div className="px-6 pb-8 pt-4 text-center text-sm text-white">
          {message.body}
        </div>
      )}
    </div>
  );
};

export default ImageViewer;