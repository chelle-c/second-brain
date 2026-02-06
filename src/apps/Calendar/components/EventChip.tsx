/**
 * EventChip – a coloured pill for a single CalendarEvent.
 *
 * compact  = true  → single-line truncated pill (Month view)
 * compact  = false → multi-line card with source-specific detail (Day/Week)
 */

import { StickyNote, DollarSign, TrendingUp, Clock } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatCurrency } from "@/lib/date-utils/formatting";

interface EventChipProps {
	event: CalendarEvent;
	compact?: boolean;
	onSelect?: (event: CalendarEvent) => void;
}

const SOURCE_ICONS = {
	note: StickyNote,
	expense: DollarSign,
	income: TrendingUp,
} as const;

export function EventChip({ event, compact = false, onSelect }: EventChipProps) {
	const tags = useNotesStore((s) => s.tags);
	const currency = useSettingsStore((s) => s.expenseCurrency);
	const Icon = SOURCE_ICONS[event.source];

	const handleClick = () => onSelect?.(event);
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	// Semi-transparent background + left border in the event colour.
	// outline-color is set via a CSS custom property on the element so that
	// the browser's focus-visible ring picks it up without an invalid style key.
	const chipStyle: React.CSSProperties = {
		backgroundColor: `${event.color}18`,
		borderLeftColor: event.color,
		// Tailwind's focus-visible:outline-* reads --tw-ring-color / the
		// browser default; we override via this custom property which modern
		// browsers honour on the outline shorthand when Tailwind sets it.
		["--tw-ring-color" as string]: event.color,
	};

	// ── compact (Month view) ──────────────────────────────────────────────
	if (compact) {
		return (
			<button
				type="button"
				className="w-full text-left truncate text-xs px-1.5 py-0.5 rounded border-l-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
				style={chipStyle}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				aria-label={`${event.source}: ${event.title}`}
			>
				<span className="inline-flex items-center gap-1 truncate">
					<Icon
						className="w-3 h-3 shrink-0"
						style={{ color: event.color }}
						aria-hidden="true"
					/>
					<span className="truncate">{event.title}</span>
				</span>
			</button>
		);
	}

	// ── full (Day / Week) ─────────────────────────────────────────────────
	return (
		<button
			type="button"
			className="w-full text-left rounded border-l-2 text-xs transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring p-1.5"
			style={chipStyle}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			aria-label={`${event.source}: ${event.title}`}
		>
			{/* Header row */}
			<div className="flex items-center gap-1.5 mb-0.5">
				<Icon
					className="w-3.5 h-3.5 shrink-0"
					style={{ color: event.color }}
					aria-hidden="true"
				/>
				<span className="font-semibold truncate" style={{ color: event.color }}>
					{event.title}
				</span>
				{event.time && (
					<span className="ml-auto text-muted-foreground flex items-center gap-0.5 shrink-0 whitespace-nowrap">
						<Clock className="w-3 h-3" aria-hidden="true" />
						{event.time.toLocaleTimeString(undefined, {
							hour: "2-digit",
							minute: "2-digit",
							hour12: true,
						})}
					</span>
				)}
			</div>

			{/* Source detail */}
			{event.source === "note" && event.note && <NoteDetail note={event.note} tags={tags} />}
			{event.source === "expense" && event.expense && (
				<ExpenseDetail expense={event.expense} currency={currency} />
			)}
			{event.source === "income" && event.income && (
				<IncomeDetail entry={event.income} currency={currency} />
			)}
		</button>
	);
}

// ── sub-detail components ───────────────────────────────────────────────────

function NoteDetail({
	note,
	tags,
}: {
	note: NonNullable<CalendarEvent["note"]>;
	tags: Record<string, { name: string; color: string }>;
}) {
	const visibleTags = (note.tags || [])
		.map((id) => tags[id])
		.filter(Boolean)
		.slice(0, 3);

	return (
		<div className="flex flex-col gap-0.5 ml-5">
			{note.content && (
				<p className="text-muted-foreground truncate" style={{ maxWidth: 180 }}>
					{note.content.replace(/\n/g, " ").slice(0, 60)}
				</p>
			)}
			{visibleTags.length > 0 && (
				<div className="flex flex-wrap gap-0.5">
					{visibleTags.map((tag) => (
						<span
							key={tag.name}
							className="inline-block text-[10px] font-medium rounded-full px-1.5 py-0.5"
							style={{ backgroundColor: `${tag.color}25`, color: tag.color }}
						>
							{tag.name}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function ExpenseDetail({
	expense,
	currency,
}: {
	expense: NonNullable<CalendarEvent["expense"]>;
	currency: string;
}) {
	return (
		<div className="flex items-center gap-1.5 ml-5 flex-wrap">
			<span className="font-medium text-foreground">
				{formatCurrency(expense.amount, currency)}
			</span>
			{expense.isRecurring && (
				<span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-1.5 py-0.5">
					Recurring
				</span>
			)}
			{expense.isPaid && (
				<span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full px-1.5 py-0.5">
					Paid
				</span>
			)}
			<span className="text-muted-foreground text-[10px]">{expense.category}</span>
		</div>
	);
}

function IncomeDetail({
	entry,
	currency,
}: {
	entry: NonNullable<CalendarEvent["income"]>;
	currency: string;
}) {
	return (
		<div className="flex items-center gap-1.5 ml-5 flex-wrap">
			<span className="font-medium text-foreground">
				{formatCurrency(entry.amount, currency)}
			</span>
			{(entry.hours || entry.minutes) && (
				<span className="text-muted-foreground text-[10px]">
					{entry.hours || 0}h {entry.minutes || 0}m
				</span>
			)}
		</div>
	);
}
