import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { CALENDAR_DAY_START_OPTIONS } from "@/types/settings";
import type { CalendarViewType } from "@/types/calendar";

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
	{ value: "month", label: "Month" },
];

export const CalendarSettings = () => {
	const startHour = useSettingsStore((s) => s.calendarDayStartHour);
	const defaultView = useSettingsStore((s) => s.calendarDefaultView);
	const setStartHour = useSettingsStore((s) => s.setCalendarDayStartHour);
	const setDefaultView = useSettingsStore((s) => s.setCalendarDefaultView);

	return (
		<Card id="calendar" className="scroll-mt-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CalendarDays className="w-5 h-5" />
					Calendar
				</CardTitle>
				<CardDescription>Preferences for the Calendar module</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Default view */}
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="cal-default-view" className="text-base font-medium">
							Default View
						</Label>
						<p className="text-sm text-muted-foreground">
							Which view opens when you navigate to the Calendar
						</p>
					</div>

					<Select
						value={defaultView}
						onValueChange={(v) => setDefaultView(v as CalendarViewType)}
					>
						<SelectTrigger id="cal-default-view" className="w-36">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VIEW_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Separator />

				{/* Day start hour – all 24 hours */}
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="cal-start-hour" className="text-base font-medium">
							Day View Start Time
						</Label>
						<p className="text-sm text-muted-foreground">
							The earliest hour shown in Day and Week time grids
						</p>
					</div>

					<Select
						value={String(startHour)}
						onValueChange={(v) => setStartHour(Number(v))}
					>
						<SelectTrigger id="cal-start-hour" className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CALENDAR_DAY_START_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={String(o.value)}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	);
};
