/**
 * NavigationBar – prev / Today / next + heading.
 * The view-type switcher lives in the parent (AnimatedToggle).
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import type { CalendarViewType } from "@/types/calendar";

interface NavigationBarProps {
	view: CalendarViewType;
	currentDate: Date;
	onDateChange: (date: Date) => void;
}

export function headingText(view: CalendarViewType, date: Date): string {
	switch (view) {
		case "day":
			return format(date, "EEEE, MMMM d, yyyy");
		case "week": {
			const end = addDays(date, 6);
			return date.getMonth() === end.getMonth() ?
					`${format(date, "MMMM d")} – ${format(end, "d, yyyy")}`
				:	`${format(date, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
		}
		case "month":
			return format(date, "MMMM yyyy");
	}
}

export function NavigationBar({ view, currentDate, onDateChange }: NavigationBarProps) {
	const goToday = () => {
		const now = new Date();
		switch (view) {
			case "day": {
				const d = new Date(now);
				d.setHours(0, 0, 0, 0);
				onDateChange(d);
				break;
			}
			case "week": {
				// Monday of this week
				const dow = now.getDay();
				const off = dow === 0 ? 6 : dow - 1;
				const mon = new Date(now);
				mon.setDate(now.getDate() - off);
				mon.setHours(0, 0, 0, 0);
				onDateChange(mon);
				break;
			}
			case "month":
				onDateChange(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
				break;
		}
	};

	const navigate = (dir: -1 | 1) => {
		switch (view) {
			case "day":
				onDateChange(addDays(currentDate, dir));
				break;
			case "week":
				onDateChange(addWeeks(currentDate, dir));
				break;
			case "month":
				onDateChange(addMonths(currentDate, dir));
				break;
		}
	};

	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="p-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
				aria-label="Previous"
			>
				<ChevronLeft className="w-5 h-5" />
			</button>

			<button
				type="button"
				onClick={goToday}
				className="px-3 py-1 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
			>
				Today
			</button>

			<button
				type="button"
				onClick={() => navigate(1)}
				className="p-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1"
				aria-label="Next"
			>
				<ChevronRight className="w-5 h-5" />
			</button>

			<h2 className="ml-3 text-base font-semibold text-foreground">
				{headingText(view, currentDate)}
			</h2>
		</div>
	);
}
