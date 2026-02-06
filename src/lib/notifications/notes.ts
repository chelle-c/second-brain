/**
 * notes.ts – note-reminder notification provider.
 *
 * Each note with a reminder produces one PendingNotification per configured
 * "notify N before" offset.  Dedupe keys include the reminder dateTime so
 * that editing a reminder's time automatically allows re-firing.
 */

import { useNotesStore } from "@/stores/useNotesStore";
import type { Note, ReminderNotification } from "@/types/notes";
import type { PendingNotification } from "./service";

const GRACE_MS = 30_000; // must match the poll interval in service.ts

// ── offset math ─────────────────────────────────────────────────────────────

function toMinutes(n: ReminderNotification): number {
	switch (n.unit) {
		case "minutes":
			return n.value;
		case "hours":
			return n.value * 60;
		case "days":
			return n.value * 60 * 24;
	}
}

function formatCountdown(n: ReminderNotification): string {
	if (n.value === 0) return "now";
	const pl = n.value === 1 ? "" : "s";
	switch (n.unit) {
		case "minutes":
			return `in ${n.value} minute${pl}`;
		case "hours":
			return `in ${n.value} hour${pl}`;
		case "days":
			return `in ${n.value} day${pl}`;
	}
}

// ── folder path ─────────────────────────────────────────────────────────────

function folderPath(folderId: string): string {
	const folders = useNotesStore.getState().folders;
	const walk = (id: string): string[] => {
		const f = folders.find((x) => x.id === id);
		if (!f) return [id];
		return f.parentId ? [...walk(f.parentId), f.name] : [f.name];
	};
	return walk(folderId).join(" › ");
}

// ── body builder ────────────────────────────────────────────────────────────

function buildBody(note: Note, offset: ReminderNotification): string {
	const dt = new Date(note.reminder!.dateTime);
	return [
		`⏰ ${formatCountdown(offset)}`,
		`📂 ${folderPath(note.folder)}`,
		`📅 ${dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
		`🕐 ${dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })}`,
	].join("\n");
}

// ── provider ────────────────────────────────────────────────────────────────

export function noteProvider(now: number): PendingNotification[] {
	const notes = useNotesStore.getState().notes;
	const pending: PendingNotification[] = [];

	for (const note of notes) {
		if (!note.reminder) continue;

		const dtStr = note.reminder.dateTime;
		const dtMs = new Date(dtStr).getTime();
		if (Number.isNaN(dtMs)) continue;

		for (const offset of note.reminder.notifications) {
			const fireAt = dtMs - toMinutes(offset) * 60_000;

			if (fireAt < now - GRACE_MS || fireAt > now + GRACE_MS) continue;
			if (fireAt < now - GRACE_MS * 2) continue; // stale

			pending.push({
				dedupeKey: `note-${note.id}-${dtStr}-${toMinutes(offset)}`,
				title: note.title || "Untitled",
				body: buildBody(note, offset),
				fireAt,
			});
		}
	}

	return pending;
}
