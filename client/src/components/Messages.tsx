"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  useGetAuthUserQuery,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useDeleteConversationMutation,
  useDeleteMessagesMutation,
  useSearchMessagesQuery,
  useEditMessageMutation,
} from "@/state/api";
import { Conversation, Message, MessageSearchHit } from "@/types/model";
import Loading from "./Loading";
import MessageBubble from "./MessageBubble";
import MessageSearchResults from "./MessageSearchResults";
import ImageViewer from "./ImageViewer";
import { formatDayLabel } from "@/lib/datetime";

const PAGE_SIZE = 30;
const MAX_MESSAGES = 300;
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const dayKey = (iso: string) => new Date(iso).toDateString();

const ComposerNotice = ({
  title,
  body,
  accent,
  onCancel,
  cancelLabel,
}: {
  title: string;
  body: string;
  accent: string;
  onCancel: () => void;
  cancelLabel: string;
}) => (
  <div className="flex items-start gap-2 border-t bg-primary-100 px-3 py-2">
    <div className={`min-w-0 flex-1 border-l-2 pl-2 ${accent}`}>
      <div className="text-[10px] font-semibold">{title}</div>
      <div className="truncate text-xs text-gray-600">{body}</div>
    </div>
    <button
      type="button"
      onClick={onCancel}
      aria-label={cancelLabel}
      className="shrink-0 text-gray-500 hover:text-primary-700"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

const Messages = ({ userType }: { userType: "manager" | "tenant" }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: authUser } = useGetAuthUserQuery();
  const me = authUser?.cognitoInfo?.userId;

  const { data: conversations, isLoading } = useGetConversationsQuery();
  const selectedId = Number(searchParams.get("c")) || null;
  const seekId = Number(searchParams.get("m")) || null;

  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: page, isFetching } = useGetMessagesQuery(
    { conversationId: selectedId as number, limit },
    { skip: !selectedId, pollingInterval: 10000 },
  );

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [deleteConversation, { isLoading: deletingThread }] =
    useDeleteConversationMutation();
  const [deleteMessages, { isLoading: deletingMessages }] =
    useDeleteMessagesMutation();
  const [editMessage, { isLoading: savingEdit }] = useEditMessageMutation();

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"thread" | "all">("thread");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchesFor, setMatchesFor] = useState("");
  const [draftFor, setDraftFor] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [stashedDraft, setStashedDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [viewing, setViewing] = useState<Message | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const [threadDeleteFor, setThreadDeleteFor] = useState<number | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jumpedRef = useRef(false);
  const lastIdRef = useRef<number | null>(null);
  const olderFromRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const autoJumpedRef = useRef("");
  const handledSeekRef = useRef<number | null>(null);

  const scrollToMessage = (id: number, flash = true) => {
    const target = document.getElementById(`msg-${id}`);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (flash) {
      target.classList.add("ring-2", "ring-secondary-500");
      window.setTimeout(
        () => target.classList.remove("ring-2", "ring-secondary-500"),
        1200,
      );
    }
    return true;
  };
  if (selectedId !== draftFor) {
    setDraftFor(selectedId);
    setQuery("");
    setDebouncedQuery("");
    setSearchScope("thread");
    setLimit(seekId !== null ? MAX_MESSAGES : PAGE_SIZE);
    setSelectedIds([]);
    setReplyingTo(null);
    setEditing(null);
    setAttachment(null);
    setViewing(null);
    setPendingDelete(null);
    setDraft(
      typeof window !== "undefined" && selectedId
        ? (window.localStorage.getItem(`rentopia:draft:${selectedId}`) ?? "")
        : "",
    );
  }

  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const inThreadSearch = isSearching && searchScope === "thread";
  const showThread = !isSearching || searchScope === "thread";

  if (debouncedQuery !== matchesFor) {
    setMatchesFor(debouncedQuery);
    setMatchIndex(0);
    if (debouncedQuery.length >= MIN_QUERY_LENGTH) setLimit(MAX_MESSAGES);
  }
  const { data: searchPage, isFetching: searchFetching } =
    useSearchMessagesQuery(
      {
        q: debouncedQuery,
        conversationId:
          searchScope === "thread" && selectedId ? selectedId : undefined,
      },
      { skip: !isSearching },
    );

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      setDebouncedQuery(value.trim());
    }, SEARCH_DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (debounceRef.current !== null)
        window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const updateDraft = (value: string) => {
    setDraft(value);
    if (typeof window === "undefined" || !selectedId) return;
    const key = `rentopia:draft:${selectedId}`;
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  };

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
    if (!inThreadSearch) return;
    const hits = searchPage?.results ?? [];
    if (!hits.length) return;

    const key = `${debouncedQuery}:${hits[0].id}`;
    if (autoJumpedRef.current === key) return;
    if (scrollToMessage(hits[0].id, false)) autoJumpedRef.current = key;
  });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (seekId !== null && handledSeekRef.current !== seekId) {
      olderFromRef.current = null;
      const found = scrollToMessage(seekId);
      if (found || !isFetching) handledSeekRef.current = seekId;
      if (found) return;
    }

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
  }, [page, seekId, isFetching]);

  const selected = conversations?.find(
    (c: Conversation) => c.id === selectedId,
  );

  const otherName =
    (userType === "manager" ? selected?.tenant.name : selected?.manager.name) ??
    "Them";

  const items = page?.messages ?? [];
  const hasMore = page?.hasMore ?? false;
  const loadingOlder = isFetching && items.length < limit;
  const selectionMode = selectedIds.length > 0;

  const canDeleteForEveryone = pendingDelete
    ? items.some((m: Message) => pendingDelete.includes(m.id) && !m.isDeleted)
    : false;

  const loadOlder = () => {
    olderFromRef.current = listRef.current?.scrollHeight ?? 0;
    setLimit((current) => Math.min(current + PAGE_SIZE, MAX_MESSAGES));
  };

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

  const toggleSelect = (id: number) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id],
    );

  const startSelection = (id: number) =>
    setSelectedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );

  const handleReply = (message: Message) => {
    if (editing) cancelEdit();
    setReplyingTo(message);
    composerRef.current?.focus();
  };

  const startEdit = (message: Message) => {
    setReplyingTo(null);
    setStashedDraft(draft);
    setEditing(message);
    setDraft(message.body);
    composerRef.current?.focus();
  };

  function cancelEdit() {
    setEditing(null);
    setDraft(stashedDraft);
    setStashedDraft("");
  }

  const jumpTo = (id: number) => {
    if (scrollToMessage(id)) return;
    router.push(`${pathname}?c=${selectedId}&m=${id}`, { scroll: false });
    setLimit(MAX_MESSAGES);
  };

  const threadMatches = inThreadSearch ? (searchPage?.results ?? []) : [];
  const safeMatchIndex = Math.min(
    matchIndex,
    Math.max(threadMatches.length - 1, 0),
  );
  const currentMatchId = threadMatches[safeMatchIndex]?.id ?? null;

  const goToMatch = (index: number) => {
    const hit = threadMatches[index];
    if (!hit) return;
    setMatchIndex(index);
    scrollToMessage(hit.id, false);
  };

  const openSearchHit = (hit: MessageSearchHit) => {
    setQuery("");
    setDebouncedQuery("");
    setLimit(MAX_MESSAGES);
    router.push(`${pathname}?c=${hit.conversationId}&m=${hit.id}`, {
      scroll: false,
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if ((!body && !attachment) || !selectedId) return;

    if (editing) {
      try {
        await editMessage({
          conversationId: selectedId,
          messageId: editing.id,
          body,
        }).unwrap();
        cancelEdit();
      } catch {}
      return;
    }

    const replyToId = replyingTo?.id;
    const file = attachment;
    setDraft("");
    updateDraft("");
    setReplyingTo(null);
    setAttachment(null);
    try {
      await sendMessage({
        conversationId: selectedId,
        body,
        replyToId,
        attachment: file ?? undefined,
      }).unwrap();
    } catch {
      updateDraft(body);
      setAttachment(file);
    }
  };

  const runDelete = async (scope: "me" | "everyone") => {
    if (!selectedId || !pendingDelete?.length) return;
    try {
      await deleteMessages({
        conversationId: selectedId,
        ids: pendingDelete,
        scope,
      }).unwrap();
      setSelectedIds([]);
    } catch {
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDeleteThread = async (conversationId: number) => {
    try {
      await deleteConversation(conversationId).unwrap();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`rentopia:draft:${conversationId}`);
      }
      if (conversationId === selectedId) {
        router.push(pathname, { scroll: false });
      }
    } catch {
    } finally {
      setThreadDeleteFor(null);
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
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex h-[80vh]">
      {/* Thread list */}
      <div
        className={`w-full md:w-72 shrink-0 border-r overflow-y-auto ${
          selectedId ? "hidden md:block" : "block"
        }`}
      >
        {conversations.map((c: Conversation) => (
          <div
            key={c.id}
            className={`group relative border-b ${
              c.id === selectedId ? "bg-primary-100" : ""
            }`}
          >
            <button
              onClick={() =>
                router.push(`${pathname}?c=${c.id}`, { scroll: false })
              }
              className="flex min-h-20 w-full flex-col justify-center px-4 py-3 pr-10 text-left hover:bg-primary-100"
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
                  {c.lastMessage.isDeleted
                    ? "This message was deleted"
                    : c.lastMessage.body || "Attachment"}
                </div>
              )}
            </button>

            <div className="absolute right-1 top-2">
              {threadDeleteFor === c.id ? (
                <div className="flex items-center gap-1 rounded-md bg-white px-2 py-1 shadow">
                  <span className="text-[10px] text-gray-500">
                    Delete both?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteThread(c.id)}
                    disabled={deletingThread}
                    className="text-[10px] font-semibold text-secondary-700 hover:underline disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setThreadDeleteFor(null)}
                    className="text-[10px] text-gray-500 hover:underline"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setThreadDeleteFor(c.id)}
                  aria-label="Delete conversation"
                  title="Delete conversation"
                  className="p-1 text-gray-400 hover:text-secondary-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Thread view */}
      <div
        className={`relative flex-1 min-w-0 flex-col ${
          selectedId ? "flex" : "hidden md:flex"
        }`}
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
            {selectionMode ? (
              <div className="min-h-20 px-5 py-3 border-b flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  aria-label="Cancel selection"
                  className="text-primary-600"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(selectedIds)}
                  aria-label="Delete selected"
                  className="ml-auto text-secondary-700 hover:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="min-h-20 px-5 py-3 border-b flex items-center gap-3">
                <button
                  onClick={() => router.push(pathname, { scroll: false })}
                  className="md:hidden text-primary-600 text-sm"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="font-semibold">{selected && otherName}</div>
                  <div className="text-xs text-gray-500">
                    {selected?.property.name}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search…"
                    className="w-28 md:w-40 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setDebouncedQuery("");
                      }}
                      aria-label="Clear search"
                      className="text-gray-400 hover:text-primary-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {inThreadSearch && (
              <div className="flex items-center gap-2 border-b bg-primary-100 px-5 py-1.5 text-[11px]">
                <span className="text-gray-600">
                  {searchFetching
                    ? "Searching…"
                    : threadMatches.length === 0
                      ? "No matches"
                      : `${safeMatchIndex + 1} of ${threadMatches.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => goToMatch(safeMatchIndex + 1)}
                  disabled={safeMatchIndex + 1 >= threadMatches.length}
                  aria-label="Older match"
                  className="text-primary-700 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToMatch(safeMatchIndex - 1)}
                  disabled={safeMatchIndex <= 0}
                  aria-label="Newer match"
                  className="text-primary-700 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchScope("all")}
                  className="ml-auto font-medium text-primary-700 hover:underline"
                >
                  Search all conversations
                </button>
              </div>
            )}

            {!showThread ? (
              <MessageSearchResults
                term={debouncedQuery}
                onBackToThread={() => setSearchScope("thread")}
                results={searchPage?.results ?? []}
                hasMore={searchPage?.hasMore ?? false}
                isSearching={searchFetching}
                me={me}
                userType={userType}
                onOpen={openSearchHit}
              />
            ) : (
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
                {items.map((m: Message, i: number) => {
                  const prev = i > 0 ? items[i - 1] : null;
                  const showDay =
                    !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                  return (
                    <React.Fragment key={m.id}>
                      {showDay && (
                        <div className="flex justify-center">
                          <span className="text-[10px] font-medium text-gray-500 bg-primary-100 rounded-full px-3 py-1">
                            {formatDayLabel(m.createdAt)}
                          </span>
                        </div>
                      )}

                      {i === firstUnreadIndex && (
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-secondary-700">
                          <span className="h-px flex-1 bg-secondary-700/40" />
                          {unreadAtOpen} unread{" "}
                          {unreadAtOpen === 1 ? "message" : "messages"}
                          <span className="h-px flex-1 bg-secondary-700/40" />
                        </div>
                      )}

                      <MessageBubble
                        message={m}
                        mine={m.senderCognitoId === me}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.includes(m.id)}
                        onToggleSelect={toggleSelect}
                        onStartSelection={startSelection}
                        onReply={handleReply}
                        onDelete={setPendingDelete}
                        onJumpTo={jumpTo}
                        onEdit={startEdit}
                        onOpenImage={setViewing}
                        me={me}
                        otherName={otherName}
                        searchTerm={inThreadSearch ? debouncedQuery : undefined}
                        isCurrentMatch={
                          inThreadSearch && m.id === currentMatchId
                        }
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}

            {editing && showThread && (
              <ComposerNotice
                title="Editing message"
                body={editing.body}
                accent="border-secondary-700 text-secondary-700"
                onCancel={cancelEdit}
                cancelLabel="Cancel edit"
              />
            )}

            {attachment && showThread && !editing && (
              <ComposerNotice
                title="Attachment"
                body={`${attachment.name} · ${(attachment.size / 1024 / 1024).toFixed(2)} MB`}
                accent="border-primary-400 text-primary-700"
                onCancel={() => setAttachment(null)}
                cancelLabel="Remove attachment"
              />
            )}

            {replyingTo && showThread && (
              <ComposerNotice
                title={`Replying to ${
                  replyingTo.senderCognitoId === me ? "yourself" : otherName
                }`}
                body={
                  replyingTo.isDeleted
                    ? "This message was deleted"
                    : replyingTo.body
                }
                accent="border-primary-400 text-primary-700"
                onCancel={() => setReplyingTo(null)}
                cancelLabel="Cancel reply"
              />
            )}

            {showThread && (
              <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    setAttachment(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!editing}
                  aria-label="Attach a file"
                  title={
                    editing ? "Cannot attach while editing" : "Attach a file"
                  }
                  className="shrink-0 self-center text-gray-500 hover:text-primary-700 disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={composerRef}
                  value={draft}
                  onChange={(e) =>
                    editing
                      ? setDraft(e.target.value)
                      : updateDraft(e.target.value)
                  }
                  placeholder={
                    editing ? "Edit your message…" : "Write a message…"
                  }
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <button
                  type="submit"
                  disabled={
                    sending || savingEdit || (!draft.trim() && !attachment)
                  }
                  className="bg-primary-700 text-white rounded-lg px-4 flex items-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {pendingDelete && (
              <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/20 p-4">
                <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
                  <p className="text-sm font-semibold text-primary-700">
                    Delete {pendingDelete.length}{" "}
                    {pendingDelete.length === 1 ? "message" : "messages"}?
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {canDeleteForEveryone && (
                      <button
                        type="button"
                        onClick={() => runDelete("everyone")}
                        disabled={deletingMessages}
                        className="rounded-lg bg-secondary-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Delete for everyone
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => runDelete("me")}
                      disabled={deletingMessages}
                      className="rounded-lg border px-3 py-2 text-sm font-medium text-primary-700 disabled:opacity-50"
                    >
                      Delete for me
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="px-3 py-2 text-sm text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && (
        <ImageViewer
          message={viewing}
          mine={viewing.senderCognitoId === me}
          senderName={otherName}
          onClose={() => setViewing(null)}
          onReply={handleReply}
          onEdit={startEdit}
          onDelete={setPendingDelete}
        />
      )}
    </div>
  );
};

export default Messages;
