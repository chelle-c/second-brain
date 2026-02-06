import { StickyNote, DollarSign, TrendingUp, EyeOff } from "lucide-react";
import type { CalendarFilters } from "@/types/calendar";

interface FilterBarProps {
	filters: CalendarFilters;
	onFilterChange: (filters: CalendarFilters) => void;
}

const FILTER_CHIPS = [
	{ key: "showNotes" as const, label: "Notes", Icon: StickyNote, color: "#0ea5e9" },
	{ key: "showExpenses" as const, label: "Expenses", Icon: DollarSign, color: "#ef4444" },
	{ key: "showIncome" as const, label: "Income", Icon: TrendingUp, color: "#10b981" },
];

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
	const toggle = (key: "showNotes" | "showExpenses" | "showIncome") => {
		onFilterChange({ ...filters, [key]: !filters[key] });
	};

	return (
		<div
			className="flex flex-wrap items-center gap-2"
			role="group"
			aria-label="Calendar filters"
		>
			{FILTER_CHIPS.map(({ key, label, Icon, color }) => {
				const active = filters[key];
				return (
					<button
						type="button"
						key={key}
						onClick={() => toggle(key)}
						aria-pressed={active}
						className={[
							"inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1 transition-all border",
							"focus-visible:outline-2 focus-visible:outline-offset-2",
							active ? "shadow-sm" : "opacity-50 border-muted bg-muted/30",
						].join(" ")}
						style={
							active ?
								{
									backgroundColor: `${color}18`,
									borderColor: color,
									color,
									outlineColor: color,
								}
							:	{}
						}
					>
						<Icon className="w-3.5 h-3.5" aria-hidden="true" />
						{label}
					</button>
				);
			})}

			{/* separator */}
			<div className="w-px h-5 bg-border mx-1" aria-hidden="true" />

			{/* hide-completed toggle */}
			<button
				type="button"
				onClick={() =>
					onFilterChange({ ...filters, hideCompleted: !filters.hideCompleted })
				}
				aria-pressed={filters.hideCompleted}
				className={[
					"inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1 transition-all border",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					filters.hideCompleted ?
						"bg-secondary border-border text-secondary-foreground"
					:	"opacity-50 border-muted bg-muted/30 text-muted-foreground",
				].join(" ")}
			>
				<EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
				Hide completed
			</button>
		</div>
	);
}
