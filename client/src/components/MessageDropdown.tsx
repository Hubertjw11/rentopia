"use client";

import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  useGetAuthUserQuery,
  useGetConversationsQuery,
  useGetUnreadMessageCountQuery,
} from "@/state/api";
import { Conversation } from "@/types/model";

const MessageDropdown = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: authUser } = useGetAuthUserQuery();

  const { data: unread } = useGetUnreadMessageCountQuery(undefined, {
    pollingInterval: 60000,
  });
  const {
    data: conversations,
    isLoading,
    refetch,
  } = useGetConversationsQuery();

  const count = unread?.count ?? 0;
  const isManager = authUser?.userRole?.toLowerCase() === "manager";
  const basePath = isManager ? "/managers/messages" : "/tenants/messages";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) refetch();
      }}
    >
      <DropdownMenuTrigger
        className="relative hidden md:block focus:outline-none"
        aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
      >
        <MessageCircle className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-secondary-700 text-white text-[10px] font-bold rounded-full    ">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 bg-white text-primary-700"
      >
        <div className="px-3 py-2 text-sm font-semibold">Messages</div>
        <DropdownMenuSeparator className="bg-primary-200 m-0" />

        <div className="max-h-80 overflow-y-auto p-1">
          {isLoading ? (
            <div className="px-2 py-6 text-center text-sm text-gray-500">
              Loading…
            </div>
          ) : !conversations?.length ? (
            <div className="px-2 py-6 text-center text-sm text-gray-500">
              No conversations yet
            </div>
          ) : (
            conversations.map((c: Conversation) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() =>
                  router.push(`${basePath}?c=${c.id}`, { scroll: false })
                }
                className={`flex flex-col items-start gap-0.5 px-2 py-2 cursor-pointer whitespace-normal ${
                  c.unreadCount > 0 ? "bg-primary-100" : ""
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">
                    {isManager ? c.tenant.name : c.manager.name}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 text-[10px] font-bold bg-secondary-700 text-white! rounded-full px-1.5">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{c.property.name}</span>
                {c.lastMessage && (
                  <span className="text-xs text-gray-600 line-clamp-1">
                    {c.lastMessage.body}
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="bg-primary-200 m-0" />
        <DropdownMenuItem
          onClick={() => router.push(basePath, { scroll: false })}
          className="px-2 py-2 cursor-pointer text-sm font-medium justify-center"
        >
          View all messages
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageDropdown;
