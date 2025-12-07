import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IncomeEntry } from "@/types/income";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ManualEntryFormProps {
	newEntry: Omit<IncomeEntry, "id">;
	availableDates: Array<{ value: string; label: string }>;
	onEntryChange: (field: keyof IncomeEntry, value: string | number) => void;
	onSubmit: (e: React.FormEvent) => void;
}

const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
	newEntry,
	availableDates,
	onEntryChange,
	onSubmit,
}) => {
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<Label className="text-sm text-muted-foreground mb-1.5 block">Day</Label>
				<Select onValueChange={(value) => onEntryChange("date", value)}>
					<SelectTrigger className="w-full h-10">
						<SelectValue placeholder="Select a day" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Day of Week</SelectLabel>
							{availableDates.map((date) => (
								<SelectItem key={date.value} value={date.value}>
									{date.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label className="text-sm text-muted-foreground mb-1.5 block">Amount ({currencySymbol})</Label>
				<Input
					type="number"
					step="0.01"
					min="0"
					value={newEntry.amount || ""}
					onChange={(e) => onEntryChange("amount", parseFloat(e.target.value) || 0)}
					className="bg-background h-10"
					placeholder="0.00"
					required
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label className="text-sm text-muted-foreground mb-1.5 block">Hours</Label>
					<Input
						type="number"
						step="0.1"
						min="0"
						max="24"
						value={newEntry.hours || ""}
						onChange={(e) => onEntryChange("hours", parseFloat(e.target.value) || 0)}
						className="bg-background h-10"
						placeholder="0"
					/>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground mb-1.5 block">Minutes</Label>
					<Input
						type="number"
						step="1"
						min="0"
						max="59"
						value={newEntry.minutes || ""}
						onChange={(e) => onEntryChange("minutes", parseInt(e.target.value) || 0)}
						className="bg-background h-10"
						placeholder="0"
					/>
				</div>
			</div>

			<div className="text-xs text-muted-foreground bg-primary/10 rounded-md px-3 py-2">
				💡 Hours and minutes are optional
			</div>

			<button
				type="submit"
				className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer shadow-sm"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 4v16m8-8H4"
					/>
				</svg>
				<span>Add Entry</span>
			</button>
		</form>
	);
};

export default ManualEntryForm;
