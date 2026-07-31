"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import {
  useGetNotificationHistoryQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/state/api";
import { AppNotification } from "@/types/model";
import { timeAgo } from "@/lib/utils";
import Loading from "./Loading";

const PAGE_SIZE = 20;
const MAX_NOTIFICATIONS = 200;

const Notifications = () => {
  const router = useRouter();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching } = useGetNotificationHistoryQuery(limit);
  const { data: unread } = useGetUnreadNotificationCountQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const items = data?.notifications ?? [];
  const hasMore = data?.hasMore ?? false;
  const loadingOlder = isFetching && items.length < limit;
  const count = unread?.count ?? 0;

  const handleOpen = async (n: AppNotification) => {
    if (!n.isRead) await markRead(n.id);
    if (n.link) router.push(n.link, { scroll: false });
  };

  if (isLoading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <span className="text-sm font-semibold text-primary-700">
          {count > 0 ? `${count} unread` : "All caught up"}
        </span>
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

      {!items.length ? (
        <div className="px-5 py-16 text-center">
          <Bell className="w-10 h-10 text-primary-300 mx-auto mb-3" />
          <p className="font-semibold text-primary-700">No notifications yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Applications, approvals and new messages all show up here.
          </p>
        </div>
      ) : (
        <ul>
          {items.map((n: AppNotification) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleOpen(n)}
                className={`w-full text-left px-5 py-4 border-b hover:bg-primary-200 ${
                  n.isRead ? "" : "bg-primary-100"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-secondary-700" />
                  )}
                  <div className={n.isRead ? "pl-3.5" : ""}>
                    <div
                      className={`text-sm ${
                        n.isRead ? "font-medium" : "font-semibold"
                      }`}
                    >
                      {n.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{n.body}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore && limit < MAX_NOTIFICATIONS && (
        <div className="p-3 text-center">
          <button
            type="button"
            onClick={() =>
              setLimit((current) =>
                Math.min(current + PAGE_SIZE, MAX_NOTIFICATIONS),
              )
            }
            disabled={loadingOlder}
            className="text-xs font-medium text-primary-700 hover:underline disabled:opacity-50"
          >
            {loadingOlder ? "Loading…" : "Load older notifications"}
          </button>
        </div>
      )}

      {hasMore && limit >= MAX_NOTIFICATIONS && (
        <p className="p-3 text-center text-[10px] text-gray-400">
          Showing the most recent {MAX_NOTIFICATIONS} notifications.
        </p>
      )}
    </div>
  );
};

export default Notifications;