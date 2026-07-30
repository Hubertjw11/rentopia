"use client";

import React, { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { AppNotification } from "@/types/model";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/state/api";

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const NotificationBell = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Poll the count only — it's a single integer, unlike the full list.
  const { data: unread } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: 60000,
  });
  const {
    data: notifications,
    isLoading,
    refetch,
  } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const count = unread?.count ?? 0;

  const handleSelect = async (
    id: number,
    isRead: boolean,
    link?: string | null,
  ) => {
    if (!isRead) await markRead(id);
    if (link) router.push(link, { scroll: false });
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(isOpen: boolean) => {
        setOpen(isOpen);
        // The count polls but the list doesn't — resync it on open.
        if (isOpen) refetch();
      }}
    >
      <DropdownMenuTrigger
        className="relative hidden md:block focus:outline-none"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
      >
        <Bell className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-secondary-700 text-white text-[10px] font-bold rounded-full">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 bg-white text-primary-700"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-primary-200" />

        {isLoading ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            Loading…
          </div>
        ) : !notifications?.length ? (
          <div className="px-2 py-6 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map((n: AppNotification) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleSelect(n.id, n.isRead, n.link)}
              className={`flex flex-col items-start gap-0.5 px-2 py-2 cursor-pointer whitespace-normal ${
                n.isRead ? "" : "bg-primary-100"
              }`}
            >
              <div className="flex w-full items-start gap-2">
                {!n.isRead && (
                  <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-secondary-700" />
                )}
                <span
                  className={`text-sm ${n.isRead ? "font-medium" : "font-semibold"}`}
                >
                  {n.title}
                </span>
              </div>
              <span className="text-xs text-gray-600 pl-3.5">{n.body}</span>
              <span className="text-[10px] text-gray-400 pl-3.5">
                {timeAgo(n.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
