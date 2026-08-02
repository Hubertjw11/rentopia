"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Camera, CheckCheck, FileText, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Message } from "@/types/model";
import Highlight from "./Highlight";

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const LONG_PRESS_MS = 500;

type MessageBubbleProps = {
  message: Message;
  mine: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onStartSelection: (id: number) => void;
  onReply: (message: Message) => void;
  onDelete: (ids: number[]) => void;
  onJumpTo: (id: number) => void;
  onEdit: (message: Message) => void;
  onOpenImage: (message: Message) => void;
  me?: string;
  otherName: string;
  searchTerm?: string;
  isCurrentMatch?: boolean;
};

const MessageBubble = ({
  message,
  mine,
  selectionMode,
  isSelected,
  onToggleSelect,
  onStartSelection,
  onReply,
  onDelete,
  onJumpTo,
  onEdit,
  onOpenImage,
  me,
  otherName,
  searchTerm,
  isCurrentMatch = false,
}: MessageBubbleProps) => {
  const pressTimer = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startPress = () => {
    if (!mine || selectionMode) return;
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      suppressClickRef.current = true;
      onStartSelection(message.id);
    }, LONG_PRESS_MS);
  };

  useEffect(() => cancelPress, []);

  const handleBubbleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (selectionMode && mine) onToggleSelect(message.id);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const bubbleClass = mine
    ? "bg-primary-700 text-white rounded-br-sm"
    : "bg-primary-100 text-primary-800 rounded-bl-sm";

  const menu = !selectionMode && (!message.isDeleted || mine) && (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="shrink-0 self-center rounded p-1 text-gray-400 opacity-100 hover:text-primary-700 focus:outline-none md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        aria-label="Message actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mine ? "end" : "start"}
        className="w-44 p-1 bg-white text-primary-700"
      >
        {!message.isDeleted && (
          <>
            <DropdownMenuItem
              onClick={() => onReply(message)}
              className="cursor-pointer text-sm"
            >
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopy}
              className="cursor-pointer text-sm"
            >
              Copy
            </DropdownMenuItem>
          </>
        )}
        {mine && (
          <>
            {!message.isDeleted && (
              <DropdownMenuItem
                onClick={() => onEdit(message)}
                className="cursor-pointer text-sm"
              >
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onStartSelection(message.id)}
              className="cursor-pointer text-sm"
            >
              Select
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete([message.id])}
              className="cursor-pointer text-sm text-secondary-700"
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      id={`msg-${message.id}`}
      className={`group flex items-start gap-2 rounded-2xl ${
        mine ? "justify-end" : "justify-start"
      } ${isSelected ? "bg-secondary-100" : ""} ${
        isCurrentMatch ? "ring-2 ring-secondary-500" : ""
      }`}
    >
      {selectionMode && mine && (
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          onClick={() => onToggleSelect(message.id)}
          className="mt-3 h-4 w-4 shrink-0 accent-secondary-700"
          aria-label="Select message"
        />
      )}

      {mine && menu}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${bubbleClass} ${
          selectionMode && mine ? "cursor-pointer" : ""
        }`}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerMove={cancelPress}
        onPointerCancel={cancelPress}
        onClick={handleBubbleClick}
      >
        {message.replyTo && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onJumpTo(message.replyTo!.id);
            }}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg border-l-2 px-2 py-1 text-left text-xs ${
              mine
                ? "border-primary-300 bg-primary-800/40 text-primary-200"
                : "border-primary-400 bg-white/60 text-gray-600"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {message.replyTo.senderCognitoId === me ? "You" : otherName}
              </span>
              <span className="flex items-center gap-1 truncate">
                {message.replyTo.attachment &&
                  (message.replyTo.attachment.type.startsWith("image/") ? (
                    <Camera className="h-3 w-3 shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 shrink-0" />
                  ))}
                {message.replyTo.isDeleted
                  ? "This message was deleted"
                  : message.replyTo.body ||
                    (message.replyTo.attachment?.type.startsWith("image/")
                      ? "Photo"
                      : message.replyTo.attachment
                        ? "Document"
                        : "")}
              </span>
            </span>
            {message.replyTo.attachment?.type.startsWith("image/") && (
              <Image
                src={message.replyTo.attachment.url}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded object-cover"
              />
            )}
          </button>
        )}

                {message.attachment &&
          (message.attachment.type.startsWith("image/") ? (
            <button
              type="button"
              // Images open the in-app viewer; only documents leave the app.
              onClick={(e) => {
                e.stopPropagation();
                onOpenImage(message);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="mb-1 block"
            >
              <Image
                src={message.attachment.url}
                alt={message.attachment.name}
                width={480}
                height={480}
                className="h-auto max-h-64 w-auto rounded-lg"
              />
            </button>
          ) : (
            <a
              href={message.attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline ${
                mine ? "bg-primary-800/40" : "bg-white/60"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{message.attachment.name}</span>
            </a>
          ))}

        {message.isDeleted ? (
          <div
            className={`text-sm italic ${mine ? "text-primary-300" : "text-gray-500"}`}
          >
            {mine ? "You deleted this message" : "This message was deleted"}
          </div>
        ) : (
          message.body && (
            <div className="text-sm whitespace-pre-wrap wrap-break-word">
              <Highlight text={message.body} term={searchTerm ?? ""} />
            </div>
          )
        )}

        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${
            mine ? "text-primary-300" : "text-gray-500"
          }`}
        >
          {timeLabel(message.createdAt)}
          {mine && message.readAt && !message.isDeleted && (
            <>
              <CheckCheck className="h-3 w-3" />
              <span>Seen</span>
            </>
          )}
        </div>
      </div>

      {!mine && menu}
    </div>
  );
};

export default MessageBubble;
