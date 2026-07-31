"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCheck, MessageSquare, Send } from "lucide-react";
import {
  useGetAuthUserQuery,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
} from "@/state/api";
import { Conversation, Message } from "@/types/model";
import Loading from "./Loading";

const PAGE_SIZE = 30;
const MAX_MESSAGES = 300;

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const dayKey = (iso: string) => new Date(iso).toDateString();

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === today.toDateString()) return "Today";
  if (dayKey(iso) === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Messages = ({ userType }: { userType: "manager" | "tenant" }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: authUser } = useGetAuthUserQuery();
  const me = authUser?.cognitoInfo?.userId;

  const { data: conversations, isLoading } = useGetConversationsQuery();
  const selectedId = Number(searchParams.get("c")) || null;

  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: page, isFetching } = useGetMessagesQuery(
    { conversationId: selectedId as number, limit },
    { skip: !selectedId, pollingInterval: 10000 },
  );

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [draftFor, setDraftFor] = useState<number | null>(null);

  if (selectedId !== draftFor) {
    setDraftFor(selectedId);
    setQuery("");
    setLimit(PAGE_SIZE);
    setDraft(
      typeof window !== "undefined" && selectedId
        ? (window.localStorage.getItem(`rentopia:draft:${selectedId}`) ?? "")
        : "",
    );
  }

  const updateDraft = (value: string) => {
    setDraft(value);
    if (typeof window === "undefined" || !selectedId) return;
    const key = `rentopia:draft:${selectedId}`;
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const jumpedRef = useRef(false);
  const lastIdRef = useRef<number | null>(null);
  const olderFromRef = useRef<number | null>(null);

  const [snapshotFor, setSnapshotFor] = useState<number | null>(null);
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
  if (conversations && selectedId !== snapshotFor) {
    setSnapshotFor(selectedId);
    setUnreadAtOpen(
      conversations.find((c: Conversation) => c.id === selectedId)
        ?.unreadCount ?? 0,
    );
  }

  useEffect(() => {
    jumpedRef.current = false;
    lastIdRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    if (olderFromRef.current !== null) {
      list.scrollTop += list.scrollHeight - olderFromRef.current;
      olderFromRef.current = null;
      return;
    }

    const loaded = page?.messages ?? [];
    const newestId = loaded.length ? loaded[loaded.length - 1].id : null;
    if (newestId === null || newestId === lastIdRef.current) return;

    lastIdRef.current = newestId;
    endRef.current?.scrollIntoView({
      behavior: jumpedRef.current ? "smooth" : "auto",
    });
    jumpedRef.current = true;
  }, [page]);

  const selected = conversations?.find(
    (c: Conversation) => c.id === selectedId,
  );

  const items = page?.messages ?? [];
  const hasMore = page?.hasMore ?? false;
  const loadingOlder = isFetching && items.length < limit;

  const loadOlder = () => {
    olderFromRef.current = listRef.current?.scrollHeight ?? 0;
    setLimit((current) => Math.min(current + PAGE_SIZE, MAX_MESSAGES));
  };

  const trimmedQuery = query.trim().toLowerCase();
  const visible = trimmedQuery
    ? items.filter((m: Message) => m.body.toLowerCase().includes(trimmedQuery))
    : items;

  const firstUnreadIndex = (() => {
    if (unreadAtOpen <= 0) return -1;
    let remaining = unreadAtOpen;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].senderCognitoId !== me) {
        remaining -= 1;
        if (remaining === 0) return i;
      }
    }
    return items.length ? 0 : -1;
  })();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    setDraft("");
    updateDraft("");
    try {
      await sendMessage({ conversationId: selectedId, body }).unwrap();
    } catch {
      updateDraft(body);
    }
  };

  if (isLoading) return <Loading />;

  if (!conversations?.length) {
    return (
      <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-500">
        No conversations yet.
        {userType === "tenant"
          ? " Open a listing and use Message manager to start one."
          : " Tenants who message you about a property will appear here."}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex h-128">
      {/* Thread list */}
      <div
        className={`w-full md:w-72 shrink-0 border-r overflow-y-auto ${
          selectedId ? "hidden md:block" : "block"
        }`}
      >
        {conversations.map((c: Conversation) => (
          <button
            key={c.id}
            onClick={() =>
              router.push(`${pathname}?c=${c.id}`, { scroll: false })
            }
            className={`w-full text-left px-4 py-3 border-b hover:bg-primary-100 ${
              c.id === selectedId ? "bg-primary-100" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm truncate">
                {userType === "manager" ? c.tenant.name : c.manager.name}
              </span>
              {c.unreadCount > 0 && (
                <span className="shrink-0 text-[10px] font-bold bg-secondary-700 text-white! rounded-full px-1.5">
                  {c.unreadCount}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {c.property.name}
            </div>
            {c.lastMessage && (
              <div className="text-xs text-gray-600 truncate mt-0.5">
                {c.lastMessage.senderCognitoId === me && (
                  <span className="text-gray-400">You: </span>
                )}
                {c.lastMessage.body}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Thread view */}
      <div
        className={`flex-1 min-w-0 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}
      >
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageSquare className="w-12 h-12 text-primary-300 mb-3" />
            <p className="font-semibold text-primary-700">
              Select a conversation
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Choose a thread on the left to read and reply.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b flex items-center gap-3">
              <button
                onClick={() => router.push(pathname, { scroll: false })}
                className="md:hidden text-primary-600 text-sm"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="font-semibold">
                  {selected &&
                    (userType === "manager"
                      ? selected.tenant.name
                      : selected.manager.name)}
                </div>
                <div className="text-xs text-gray-500">
                  {selected?.property.name}
                </div>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="ml-auto w-32 md:w-40 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
            >
              {hasMore && limit < MAX_MESSAGES && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="text-xs font-medium text-primary-700 hover:underline disabled:opacity-50"
                  >
                    {loadingOlder ? "Loading…" : "Load older messages"}
                  </button>
                </div>
              )}
              {hasMore && limit >= MAX_MESSAGES && (
                <p className="text-center text-[10px] text-gray-400">
                  Showing the most recent {MAX_MESSAGES} messages.
                </p>
              )}
              {trimmedQuery && visible.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-6">
                  No messages match “{query}”
                </p>
              )}
              {visible.map((m: Message, i: number) => {
                const mine = m.senderCognitoId === me;
                const prev = i > 0 ? visible[i - 1] : null;
                const showDay =
                  !trimmedQuery &&
                  (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt));
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div className="flex justify-center">
                        <span className="text-[10px] font-medium text-gray-500 bg-primary-100 rounded-full px-3 py-1">
                          {dayLabel(m.createdAt)}
                        </span>
                      </div>
                    )}

                    {!trimmedQuery && i === firstUnreadIndex && (
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-secondary-700">
                        <span className="h-px flex-1 bg-secondary-700/40" />
                        {unreadAtOpen} unread{" "}
                        {unreadAtOpen === 1 ? "message" : "messages"}
                        <span className="h-px flex-1 bg-secondary-700/40" />
                      </div>
                    )}

                    <div
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          mine
                            ? "bg-primary-700 text-white rounded-br-sm"
                            : "bg-primary-100 text-primary-800 rounded-bl-sm"
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap wrap-break-word">
                          {m.body}
                        </div>
                        <div
                          className={`text-[10px] mt-1 flex items-center gap-1 ${
                            mine ? "text-primary-300" : "text-gray-500"
                          }`}
                        >
                          {timeLabel(m.createdAt)}
                          {mine && m.readAt && (
                            <>
                              <CheckCheck className="w-3 h-3" />
                              <span>Seen</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => updateDraft(e.target.value)}
                placeholder="Write a message…"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="bg-primary-700 text-white rounded-lg px-4 flex items-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
