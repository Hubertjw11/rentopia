"use client";

import React from "react";
import { CalendarClock, Check, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBookViewingSlotMutation,
  useCancelViewingBookingMutation,
  useGetAuthUserQuery,
  useGetViewingSlotsQuery,
} from "@/state/api";
import { ViewingSlot } from "@/types/model";
import { useRouter } from "next/navigation";
import { formatSlotTime } from "@/lib/datetime";

const SlotRow = ({
  slot,
  canBook,
  isSignedIn,
  onBook,
  onCancel,
  busy,
}: {
  slot: ViewingSlot;
  canBook: boolean;
  isSignedIn: boolean;
  onBook: () => void;
  onCancel: () => void;
  busy: boolean;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 py-3 last:border-b-0">
    <div className="min-w-0">
      <div className="font-medium text-primary-800">
        {formatSlotTime(slot.startsAt, slot.durationMinutes)}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
        {slot.mode === "Virtual" ? (
          <>
            <Video className="h-4 w-4 shrink-0" />
            Virtual viewing
          </>
        ) : (
          <>
            <CalendarClock className="h-4 w-4 shrink-0" />
            In person
          </>
        )}
      </div>
      {slot.isMine && slot.meetingUrl && (
        <a
          href={slot.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Join the call
        </a>
      )}
    </div>

    {slot.isMine ? (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-medium text-green-700">
          <Check className="h-4 w-4" />
          Your booking
        </span>
        <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    ) : slot.isBooked ? (
      <span className="text-sm text-gray-400">Taken</span>
    ) : canBook ? (
      <Button
        size="sm"
        disabled={busy}
        onClick={onBook}
        className="bg-primary-700 text-white hover:bg-primary-600"
      >
        Book
      </Button>
    ) : isSignedIn ? (
      <span className="text-sm text-gray-500">Available</span>
    ) : (
      <Button variant="outline" size="sm" onClick={onBook}>
        Sign in to book
      </Button>
    )}
  </div>
);

const PropertyViewings = ({ propertyId }: { propertyId: number }) => {
  const router = useRouter();
  const { data: authUser } = useGetAuthUserQuery();
  const { data: slots, isLoading } = useGetViewingSlotsQuery(propertyId);
  const [book, { isLoading: booking }] = useBookViewingSlotMutation();
  const [cancel, { isLoading: cancelling }] = useCancelViewingBookingMutation();

  const isTenant = authUser?.userRole?.toLowerCase() === "tenant";
  const busy = booking || cancelling;

  if (isLoading) return null;
  if (!slots?.length) return null;

  const mine = slots.find((slot) => slot.isMine);

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold my-3">Book a viewing</h2>
      <p className="mb-3 text-sm text-gray-500">
        {mine
          ? "You have a viewing booked. Cancel it to choose a different time."
          : "Pick a time that suits you. One booking per property."}
      </p>

      <div className="rounded-xl border border-primary-200 px-5">
        {slots.map((slot) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            isSignedIn={!!authUser}
            canBook={isTenant && !slot.isBooked && !mine}
            busy={busy}
            onBook={() => {
              if (!authUser) {
                router.push("/signin");
                return;
              }
              book(slot.id);
            }}
            onCancel={() => cancel(slot.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyViewings;