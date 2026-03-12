import type React from "react";
import { TIME_RANGE_OPTIONS, type TimeRange } from "@/types/overview";

interface TimeRangeSelectorProps {
	value: TimeRange;
	onChange: (value: TimeRange) => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
	return (
		<div
			className="inline-flex gap-0.5 p-0.5 bg-muted rounded-lg"
			role="radiogroup"
			aria-label="Select time range"
		>
			{TIME_RANGE_OPTIONS.map((option) => {
				const isActive = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={isActive}
						onClick={() => onChange(option.value)}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
							isActive ?
								"bg-primary text-primary-foreground shadow-sm"
							:	"text-muted-foreground hover:text-foreground hover:bg-accent"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
};
