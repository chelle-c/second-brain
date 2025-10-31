import React from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import type { IncomeEntry } from "../../../types/finance";

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
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<Label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</Label>
				<select
					value={newEntry.date}
					onChange={(e) => onEntryChange("date", e.target.value)}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{availableDates.map((date) => (
						<option key={date.value} value={date.value}>
							{date.label}
						</option>
					))}
				</select>
			</div>

			<div>
				<Label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</Label>
				<Input
					type="number"
					step="0.01"
					min="0"
					value={newEntry.amount || ""}
					onChange={(e) => onEntryChange("amount", parseFloat(e.target.value) || 0)}
					className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="0.00"
					required
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label className="block text-sm font-medium text-gray-700 mb-1">Hours</Label>
					<Input
						type="number"
						step="0.1"
						min="0"
						max="24"
						value={newEntry.hours || ""}
						onChange={(e) => onEntryChange("hours", parseFloat(e.target.value) || 0)}
						className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="0"
					/>
				</div>

				<div>
					<Label className="block text-sm font-medium text-gray-700 mb-1">Minutes</Label>
					<Input
						type="number"
						step="1"
						min="0"
						max="59"
						value={newEntry.minutes || ""}
						onChange={(e) => onEntryChange("minutes", parseInt(e.target.value) || 0)}
						className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="0"
					/>
				</div>
			</div>

			<div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
				<p>
					💡 <strong>Tip:</strong> You can enter just hours or just minutes - both are
					optional.
				</p>
			</div>

			<Button
				type="submit"
				className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
			>
				Add Income Entry
			</Button>
		</form>
	);
};

export default ManualEntryForm;
