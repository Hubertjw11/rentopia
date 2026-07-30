"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import {
  useGetAuthUserQuery,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
} from "@/state/api";
import { Conversation, Message } from "@/types/model";
import Loading from "./Loading";

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Messages = ({ userType }: { userType: "manager" | "tenant" }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: authUser } = useGetAuthUserQuery();
  const me = authUser?.cognitoInfo?.userId;

  const { data: conversations, isLoading } = useGetConversationsQuery();
  const selectedId = Number(searchParams.get("c")) || null;

  const { data: messages } = useGetMessagesQuery(selectedId as number, {
    skip: !selectedId,
    pollingInterval: 10000,
  });

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const jumpedRef = useRef(false);

  useEffect(() => {
    jumpedRef.current = false;
  }, [selectedId]);

  useEffect(() => {
    if (!messages?.length) return;
    endRef.current?.scrollIntoView({
      behavior: jumpedRef.current ? "smooth" : "auto",
    });
    jumpedRef.current = true;
  }, [messages]);
  
  const selected = conversations?.find(
    (c: Conversation) => c.id === selectedId,
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    setDraft("");
    try {
      await sendMessage({ conversationId: selectedId, body }).unwrap();
    } catch {
      setDraft(body);
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
                <span className="shrink-0 text-[10px] font-bold bg-secondary-700 text-white rounded-full px-1.5">
                  {c.unreadCount}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {c.property.name}
            </div>
            {c.lastMessage && (
              <div className="text-xs text-gray-600 truncate mt-0.5">
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
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages?.map((m: Message) => {
                const mine = m.senderCognitoId === me;
                return (
                  <div
                    key={m.id}
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
                        className={`text-[10px] mt-1 ${
                          mine ? "text-primary-300" : "text-gray-500"
                        }`}
                      >
                        {timeLabel(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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
