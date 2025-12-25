import { format, parseISO } from "date-fns";
import type React from "react";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { IncomeParsedEntry } from "@/types/income";

interface PasteEntryFormProps {
	pasteText: string;
	parsedEntries: IncomeParsedEntry[];
	parseError: string;
	selectedYear: number;
	onPasteTextChange: (text: string) => void;
	onAddParsedEntries: () => void;
}

const PasteEntryForm: React.FC<PasteEntryFormProps> = ({
	pasteText,
	parsedEntries,
	parseError,
	selectedYear,
	onPasteTextChange,
	onAddParsedEntries,
}) => {
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);
	const formatTime = (hours?: number, minutes?: number) => {
		const h = hours || 0;
		const m = minutes || 0;
		return `${h}h ${m.toString().padStart(2, "0")}m`;
	};

	return (
		<div className="space-y-4">
			<div className="text-xs text-muted-foreground bg-primary/10 rounded-md px-3 py-2">
				Dates will use <span className="font-medium">{selectedYear}</span> if
				year not specified
			</div>

			<div>
				<label
					htmlFor="entry_paste_text"
					className="text-sm text-muted-foreground mb-1.5 block"
				>
					Paste income data:
				</label>
				<textarea
					id="entry_paste_text"
					value={pasteText}
					onChange={(e) => onPasteTextChange(e.target.value)}
					placeholder="One value per line"
					rows={6}
					className="bg-background w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm text-foreground resize-none"
				/>
				{parseError && (
					<p className="text-red-500 text-xs mt-1">{parseError}</p>
				)}
			</div>

			{parsedEntries.length > 0 && (
				<div className="bg-muted border border-border rounded-lg overflow-hidden">
					<div className="px-3 py-2 bg-accent border-b border-border">
						<span className="text-xs font-medium text-foreground">
							Found {parsedEntries.length} entries
						</span>
					</div>
					<div className="max-h-40 overflow-y-auto">
						<table className="w-full">
							<tbody className="divide-y divide-border/50">
								{parsedEntries.map((entry) => (
									<tr
										key={`entry-${entry.date}-${entry.amount}`}
										className="text-xs"
									>
										<td className="px-3 py-1.5 font-medium text-foreground">
											{format(parseISO(entry.date), "MMM d")}
										</td>
										<td className="px-3 py-1.5 text-right text-primary font-medium">
											{currencySymbol}
											{entry.amount.toFixed(2)}
										</td>
										<td className="px-3 py-1.5 text-right text-muted-foreground">
											{formatTime(entry.hours, entry.minutes)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<button
				type="button"
				onClick={onAddParsedEntries}
				disabled={parsedEntries.length === 0}
				className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
			>
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<title>Add</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 4v16m8-8H4"
					/>
				</svg>
				<span>Add {parsedEntries.length} Entries</span>
			</button>
		</div>
	);
};

export default PasteEntryForm;
