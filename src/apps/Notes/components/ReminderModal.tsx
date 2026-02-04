/**
 * ReminderModal.tsx
 *
 * Accessible, validated form for setting / editing a note reminder.
 *
 * Layout:
 *   • Date picker   – native <input type="date">
 *   • Time picker   – native <input type="time">
 *   • Notification list – each entry is a (unit, value) row with a delete
 *     button; a "+" button appends a new row (defaults to 15 min).
 *   • Duplicate and out-of-range values are caught before the user can
 *     save.
 *
 * Props:
 *   isOpen        – controls visibility
 *   onClose       – called when the modal is dismissed (after confirming
 *                   unsaved-changes if dirty)
 *   initialReminder – existing NoteReminder | null
 *   onSave        – receives the validated NoteReminder on "Save"
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import type { NoteReminder, ReminderNotification } from "@/types/notes";

// ── constants ────────────────────────────────────────────────────────────────
const MINUTE_OPTIONS = [5, 10, 15, 30, 45];
const HOURS_MIN = 1;
const HOURS_MAX = 23;
const DAYS_MIN = 1;
const DAYS_MAX = 30;
const DEFAULT_NOTIFICATION: ReminderNotification = { unit: "minutes", value: 15 };

// ── helpers ──────────────────────────────────────────────────────────────────
/** Unique key for duplicate detection */
function notifKey(n: ReminderNotification): string {
	return `${n.unit}:${n.value}`;
}

/** Convert a Date to "YYYY-MM-DD" for the date input value */
function toDateInputValue(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

/** Convert a Date to "HH:MM" for the time input value */
function toTimeInputValue(d: Date): string {
	const h = String(d.getHours()).padStart(2, "0");
	const m = String(d.getMinutes()).padStart(2, "0");
	return `${h}:${m}`;
}

// ── validation ───────────────────────────────────────────────────────────────
interface ValidationResult {
	valid: boolean;
	errors: Record<string, string>;
}

function validate(
	dateStr: string,
	timeStr: string,
	notifications: ReminderNotification[],
): ValidationResult {
	const errors: Record<string, string> = {};

	if (!dateStr) {
		errors.date = "A reminder date is required.";
	}
	if (!timeStr) {
		errors.time = "A reminder time is required.";
	}
	if (dateStr && timeStr) {
		const combined = new Date(`${dateStr}T${timeStr}`);
		if (combined <= new Date()) {
			errors.dateTime = "The reminder date and time must be in the future.";
		}
	}
	if (notifications.length === 0) {
		errors.notifications = "At least one notification time is required.";
	}
	const seen = new Set<string>();
	notifications.forEach((n, i) => {
		const key = notifKey(n);
		if (seen.has(key)) {
			errors[`notif-${i}`] = "Duplicate notification – remove one.";
		}
		seen.add(key);
	});
	notifications.forEach((n, i) => {
		if (errors[`notif-${i}`]) return;
		if (n.unit === "minutes" && !MINUTE_OPTIONS.includes(n.value)) {
			errors[`notif-${i}`] = `Choose one of: ${MINUTE_OPTIONS.join(", ")} minutes.`;
		}
		if (n.unit === "hours" && (n.value < HOURS_MIN || n.value > HOURS_MAX)) {
			errors[`notif-${i}`] = `Hours must be between ${HOURS_MIN} and ${HOURS_MAX}.`;
		}
		if (n.unit === "days" && (n.value < DAYS_MIN || n.value > DAYS_MAX)) {
			errors[`notif-${i}`] = `Days must be between ${DAYS_MIN} and ${DAYS_MAX}.`;
		}
	});

	return { valid: Object.keys(errors).length === 0, errors };
}

// ── sub-components ───────────────────────────────────────────────────────────

const NotificationRow: React.FC<{
	index: number;
	notif: ReminderNotification;
	error?: string;
	onChange: (index: number, updated: ReminderNotification) => void;
	onRemove: (index: number) => void;
	canRemove: boolean;
}> = ({ index, notif, error, onChange, onRemove, canRemove }) => {
	const rowId = `notif-row-${index}`;

	const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const unit = e.target.value as ReminderNotification["unit"];
		let value: number;
		if (unit === "minutes") value = 15;
		else if (unit === "hours") value = 1;
		else value = 1;
		onChange(index, { unit, value });
	};

	const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
		const value = Number(e.target.value);
		if (!Number.isNaN(value)) {
			onChange(index, { ...notif, value });
		}
	};

	return (
		<div className="flex flex-col gap-1">
			<div
				className="flex items-center gap-2"
				role="group"
				aria-labelledby={`${rowId}-label`}
			>
				<span id={`${rowId}-label`} className="sr-only">
					Notification {index + 1}
				</span>

				<label htmlFor={`${rowId}-unit`} className="sr-only">
					Time unit
				</label>
				<select
					id={`${rowId}-unit`}
					value={notif.unit}
					onChange={handleUnitChange}
					className="flex-shrink-0 px-2 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="minutes">Minutes</option>
					<option value="hours">Hours</option>
					<option value="days">Days</option>
				</select>

				<label htmlFor={`${rowId}-value`} className="sr-only">
					{notif.unit === "minutes" ?
						"Minute amount"
					: notif.unit === "hours" ?
						"Hour amount"
					:	"Day amount"}
				</label>
				{notif.unit === "minutes" ?
					<select
						id={`${rowId}-value`}
						value={notif.value}
						onChange={handleValueChange}
						className="flex-1 px-2 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						aria-invalid={!!error}
					>
						{MINUTE_OPTIONS.map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>
				:	<input
						id={`${rowId}-value`}
						type="number"
						min={notif.unit === "hours" ? HOURS_MIN : DAYS_MIN}
						max={notif.unit === "hours" ? HOURS_MAX : DAYS_MAX}
						value={notif.value}
						onChange={handleValueChange}
						className="flex-1 px-2 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						aria-invalid={!!error}
					/>
				}

				<button
					type="button"
					onClick={() => onRemove(index)}
					disabled={!canRemove}
					aria-label={`Remove notification ${index + 1}`}
					className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<Trash2 size={16} />
				</button>
			</div>
			{error && (
				<p className="text-xs text-red-500 ml-0" role="alert" id={`${rowId}-error`}>
					{error}
				</p>
			)}
		</div>
	);
};

// ── main modal ───────────────────────────────────────────────────────────────
interface ReminderModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialReminder: NoteReminder | null;
	onSave: (reminder: NoteReminder) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
	isOpen,
	onClose,
	initialReminder,
	onSave,
}) => {
	const [dateStr, setDateStr] = useState("");
	const [timeStr, setTimeStr] = useState("");
	const [notifications, setNotifications] = useState<ReminderNotification[]>([
		DEFAULT_NOTIFICATION,
	]);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [showExitConfirm, setShowExitConfirm] = useState(false);

	const isDirtyRef = useRef(false);
	const initialValuesRef = useRef({
		dateStr: "",
		timeStr: "",
		notifications: [DEFAULT_NOTIFICATION],
	});

	// ── seed form when modal opens ──────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) return;

		if (initialReminder) {
			const dt = new Date(initialReminder.dateTime);
			const d = toDateInputValue(dt);
			const t = toTimeInputValue(dt);
			const n =
				initialReminder.notifications.length > 0 ?
					initialReminder.notifications
				:	[DEFAULT_NOTIFICATION];
			setDateStr(d);
			setTimeStr(t);
			setNotifications(n);
			initialValuesRef.current = { dateStr: d, timeStr: t, notifications: n };
		} else {
			// New reminder – default to today, current time rounded to next 15 min
			const now = new Date();
			const d = toDateInputValue(now);
			// Round time up to next 15-minute mark
			const minutes = now.getMinutes();
			const rounded = Math.ceil(minutes / 15) * 15;
			now.setMinutes(rounded, 0, 0);
			// If rounding pushed us to next hour, the Date object handles it
			const t = toTimeInputValue(now);
			const n = [DEFAULT_NOTIFICATION];
			setDateStr(d);
			setTimeStr(t);
			setNotifications(n);
			initialValuesRef.current = { dateStr: d, timeStr: t, notifications: n };
		}

		setErrors({});
		isDirtyRef.current = false;
	}, [isOpen, initialReminder]);

	// ── dirtiness check ──────────────────────────────────────────────────────
	const checkDirty = useCallback(() => {
		const init = initialValuesRef.current;
		if (dateStr !== init.dateStr || timeStr !== init.timeStr) {
			isDirtyRef.current = true;
			return;
		}
		if (notifications.length !== init.notifications.length) {
			isDirtyRef.current = true;
			return;
		}
		for (let i = 0; i < notifications.length; i++) {
			if (
				notifications[i].unit !== init.notifications[i].unit ||
				notifications[i].value !== init.notifications[i].value
			) {
				isDirtyRef.current = true;
				return;
			}
		}
		isDirtyRef.current = false;
	}, [dateStr, timeStr, notifications]);

	useEffect(() => {
		checkDirty();
	}, [checkDirty]);

	// ── handlers ────────────────────────────────────────────────────────────
	const handleClose = useCallback(() => {
		if (isDirtyRef.current) {
			setShowExitConfirm(true);
		} else {
			onClose();
		}
	}, [onClose]);

	const handleNotifChange = useCallback((index: number, updated: ReminderNotification) => {
		setNotifications((prev) => prev.map((n, i) => (i === index ? updated : n)));
	}, []);

	const handleNotifRemove = useCallback((index: number) => {
		setNotifications((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleNotifAdd = useCallback(() => {
		setNotifications((prev) => [...prev, { ...DEFAULT_NOTIFICATION }]);
	}, []);

	const handleSave = useCallback(() => {
		const result = validate(dateStr, timeStr, notifications);
		if (!result.valid) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		const reminder: NoteReminder = {
			dateTime: new Date(`${dateStr}T${timeStr}`).toISOString(),
			notifications: [...notifications],
		};

		onSave(reminder);
	}, [dateStr, timeStr, notifications, onSave]);

	return (
		<>
			<Modal
				isOpen={isOpen}
				onClose={handleClose}
				title={initialReminder ? "Edit Reminder" : "Set Reminder"}
				description="Choose when you want to be reminded about this note."
				className="sm:max-w-lg"
			>
				<form
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						handleSave();
					}}
					className="flex flex-col gap-4"
				>
					{/* ── date / time row ──────────────────────────────────────────── */}
					<div className="flex gap-3">
						<div className="flex-1 flex flex-col gap-1">
							<label
								htmlFor="reminder-date"
								className="text-sm font-medium text-foreground"
							>
								Date
							</label>
							<input
								id="reminder-date"
								type="date"
								value={dateStr}
								min={toDateInputValue(new Date())}
								onChange={(e) => {
									setDateStr(e.target.value);
									setErrors((prev) => {
										const next = { ...prev };
										delete next.date;
										delete next.dateTime;
										return next;
									});
								}}
								className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								aria-invalid={!!errors.date || !!errors.dateTime}
								aria-describedby={
									errors.date ? "reminder-date-error"
									: errors.dateTime ?
										"reminder-datetime-error"
									:	undefined
								}
							/>
							{errors.date && (
								<p
									id="reminder-date-error"
									className="text-xs text-red-500"
									role="alert"
								>
									{errors.date}
								</p>
							)}
						</div>

						<div className="flex-1 flex flex-col gap-1">
							<label
								htmlFor="reminder-time"
								className="text-sm font-medium text-foreground"
							>
								Time
							</label>
							<input
								id="reminder-time"
								type="time"
								value={timeStr}
								onChange={(e) => {
									setTimeStr(e.target.value);
									setErrors((prev) => {
										const next = { ...prev };
										delete next.time;
										delete next.dateTime;
										return next;
									});
								}}
								className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								aria-invalid={!!errors.time || !!errors.dateTime}
								aria-describedby={
									errors.time ? "reminder-time-error"
									: errors.dateTime ?
										"reminder-datetime-error"
									:	undefined
								}
							/>
							{errors.time && (
								<p
									id="reminder-time-error"
									className="text-xs text-red-500"
									role="alert"
								>
									{errors.time}
								</p>
							)}
						</div>
					</div>

					{errors.dateTime && (
						<p
							id="reminder-datetime-error"
							className="text-xs text-red-500 -mt-3"
							role="alert"
						>
							{errors.dateTime}
						</p>
					)}

					{/* ── notification times ───────────────────────────────────────── */}
					<fieldset>
						<legend className="text-sm font-medium text-foreground mb-2">
							Notify me before
						</legend>
						<div className="flex flex-col gap-2">
							{notifications.map((notif, i) => (
								<NotificationRow
									key={i}
									index={i}
									notif={notif}
									error={errors[`notif-${i}`]}
									onChange={handleNotifChange}
									onRemove={handleNotifRemove}
									canRemove={notifications.length > 1}
								/>
							))}

							{errors.notifications && (
								<p className="text-xs text-red-500" role="alert">
									{errors.notifications}
								</p>
							)}

							<button
								type="button"
								onClick={handleNotifAdd}
								className="mt-1 self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
								aria-label="Add another notification time"
							>
								<Plus size={16} />
								<span>Add notification</span>
							</button>
						</div>
					</fieldset>

					{/* ── actions ───────────────────────────────────────────────────── */}
					<div className="flex justify-end gap-2 pt-2 border-t border-border mt-1">
						<Button variant="outline" type="button" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit">Save Reminder</Button>
					</div>
				</form>
			</Modal>

			<ConfirmationModal
				isOpen={showExitConfirm}
				title="Discard Changes?"
				message="You have unsaved changes to this reminder. They will be lost if you close now."
				confirmLabel="Discard"
				cancelLabel="Keep Editing"
				variant="warning"
				onConfirm={() => {
					setShowExitConfirm(false);
					onClose();
				}}
				onCancel={() => setShowExitConfirm(false)}
			/>
		</>
	);
};