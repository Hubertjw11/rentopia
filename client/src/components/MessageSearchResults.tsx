"use client";

import React from "react";
import { MessageSearchHit } from "@/types/model";
import Highlight from "./Highlight";

const hitLabel = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type MessageSearchResultsProps = {
  term: string;
  onBackToThread: () => void;
  results: MessageSearchHit[];
  hasMore: boolean;
  isSearching: boolean;
  me?: string;
  userType: "manager" | "tenant";
  onOpen: (hit: MessageSearchHit) => void;
};

const MessageSearchResults = ({
  term,
  onBackToThread,
  results,
  hasMore,
  isSearching,
  me,
  userType,
  onOpen,
}: MessageSearchResultsProps) => (
  <div className="flex-1 overflow-y-auto px-5 py-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        All conversations
      </span>
      <button
        type="button"
        onClick={onBackToThread}
        className="text-xs font-medium text-primary-700 hover:underline"
      >
        Only this conversation
      </button>
    </div>

    {isSearching && (
      <p className="py-6 text-center text-sm text-gray-500">Searching…</p>
    )}

    {!isSearching && results.length === 0 && (
      <p className="py-6 text-center text-sm text-gray-500">
        No messages match “{term}”
      </p>
    )}

    <div className="space-y-2">
      {results.map((hit) => (
        <button
          key={hit.id}
          type="button"
          onClick={() => onOpen(hit)}
          className="block w-full rounded-lg border px-3 py-2 text-left hover:bg-primary-100"
        >
                    <div className="truncate text-xs font-semibold text-primary-700">
              {userType === "manager"
                ? hit.conversation.tenantName
                : hit.conversation.managerName}
              <span className="font-normal text-gray-500">
                {" · "}
                {hit.conversation.propertyName}
              </span>
          </div>
          <div className="line-clamp-2 text-sm text-gray-700">
            {hit.senderCognitoId === me && (
              <span className="text-gray-400">You: </span>
            )}
            <Highlight text={hit.body} term={term} />
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400">
            {hitLabel(hit.createdAt)}
          </div>
        </button>
      ))}
    </div>

    {hasMore && (
      <p className="pt-3 text-center text-[10px] text-gray-400">
        Showing the first {results.length} matches — narrow the search to see
        more.
      </p>
    )}
  </div>
);

export default MessageSearchResults;
