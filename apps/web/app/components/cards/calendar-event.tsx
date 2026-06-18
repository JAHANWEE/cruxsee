"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";

interface CalendarEventProps {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: string[];
  location?: string;
  onConfirm: (data: { summary: string; startDateTime: string; endDateTime: string; attendees?: string[]; location?: string }) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CalendarEventCard({ summary, startDateTime, endDateTime, attendees, location, onConfirm, onCancel, disabled }: CalendarEventProps) {
  const [event, setEvent] = useState({ summary, startDateTime, endDateTime, attendees: attendees || [], location: location || "" });

  return (
    <div className="w-full max-w-[500px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1a1a1d] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">New Event</span>
        </div>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Event details */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <input
          type="text"
          value={event.summary}
          onChange={(e) => setEvent((ev) => ({ ...ev, summary: e.target.value }))}
          disabled={disabled}
          className="w-full text-base font-medium bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          placeholder="Event title"
        />

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatDateTime(event.startDateTime)} — {formatDateTime(event.endDateTime)}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              value={event.location}
              onChange={(e) => setEvent((ev) => ({ ...ev, location: e.target.value }))}
              disabled={disabled}
              className="flex-1 bg-transparent outline-none"
              placeholder="Add location"
            />
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {event.attendees.map((email, i) => (
                <span key={i} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs">
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(event)}
          disabled={disabled || !event.summary.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
        >
          <Calendar className="w-3.5 h-3.5" />
          Create Event
        </button>
      </div>
    </div>
  );
}

/** Created confirmation */
export function CalendarEventCreatedCard({ summary, startDateTime }: { summary: string; startDateTime: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 max-w-[500px]">
      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{summary}</p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">{formatDateTime(startDateTime)}</p>
      </div>
    </div>
  );
}
