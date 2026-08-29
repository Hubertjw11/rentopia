"use client";

import React, { useState } from "react";
import { Plus, Trash2, Video, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateViewingSlotMutation,
  useDeleteViewingSlotMutation,
  useGetViewingSlotsQuery,
} from "@/state/api";
import { ViewingMode } from "@/types/model";
import { formatSlotTime } from "@/lib/datetime";

const DURATIONS = [15, 30, 45, 60, 90, 120];

const ManagerViewingSlots = ({ propertyId }: { propertyId: number }) => {
  const { data: slots, isLoading } = useGetViewingSlotsQuery(propertyId);
  const [createSlot, { isLoading: creating }] = useCreateViewingSlotMutation();
  const [deleteSlot, { isLoading: deleting }] = useDeleteViewingSlotMutation();

  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [mode, setMode] = useState<ViewingMode>("InPerson");
  const [meetingUrl, setMeetingUrl] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startsAt) return;

    const result = await createSlot({
      propertyId,
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes,
      mode,
      meetingUrl: mode === "Virtual" ? meetingUrl.trim() : undefined,
    });
    if ("error" in result) return;

    setStartsAt("");
    setMeetingUrl("");
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-1">Viewing Times</h2>
      <p className="text-sm text-gray-500 mb-4">
        Publish specific times you can show this property. Tenants book one
        each.
      </p>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Starts at</label>
          <Input
            type="datetime-local"
            value={startsAt}
            required
            onChange={(e) => setStartsAt(e.target.value)}
            className="border-gray-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Length</label>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ViewingMode)}
            className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
          >
            <option value="InPerson">In person</option>
            <option value="Virtual">Virtual</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={creating}
          className="bg-primary-700 text-white hover:bg-primary-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          {creating ? "Adding…" : "Add slot"}
        </Button>

        {mode === "Virtual" && (
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm font-medium">
              Meeting link
            </label>
            <Input
              type="url"
              required
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="border-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only you and the tenant who books this slot can see the link.
            </p>
          </div>
        )}
      </form>

      <hr className="mb-2" />

      {isLoading ? null : !slots?.length ? (
        <p className="py-3 text-sm text-gray-500">
          No upcoming viewing times published.
        </p>
      ) : (
        slots.map((slot) => (
          <div
            key={slot.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 py-3 last:border-b-0"
          >
            <div>
              <div className="font-medium">
                {formatSlotTime(slot.startsAt, slot.durationMinutes)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                {slot.mode === "Virtual" ? (
                  <>
                    <Video className="h-4 w-4" /> Virtual
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" /> In person
                  </>
                )}
                {slot.isBooked && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Booked
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => deleteSlot(slot.id)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {slot.isBooked ? "Cancel & remove" : "Remove"}
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

export default ManagerViewingSlots;