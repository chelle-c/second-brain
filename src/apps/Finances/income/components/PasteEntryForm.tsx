import React from "react";
import type { IncomeParsedEntry } from "@/types/income";
import { format, parseISO } from "date-fns";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getCurrencySymbol } from "@/lib/currencyUtils";

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
			<div className="text-xs text-gray-500 bg-sky-50 rounded-md px-3 py-2">
				Dates will use <span className="font-medium">{selectedYear}</span> if year not
				specified
			</div>

			<div>
				<label htmlFor="entry_paste_text" className="text-sm text-gray-600 mb-1.5 block">
					Paste income data:
				</label>
				<textarea
					id="entry_paste_text"
					value={pasteText}
					onChange={(e) => onPasteTextChange(e.target.value)}
					placeholder="One value per line"
					rows={6}
					className="bg-white w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono text-sm text-gray-600 resize-none"
				/>
				{parseError && <p className="text-red-600 text-xs mt-1">{parseError}</p>}
			</div>

			{parsedEntries.length > 0 && (
				<div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
					<div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
						<span className="text-xs font-medium text-gray-700">
							Found {parsedEntries.length} entries
						</span>
					</div>
					<div className="max-h-40 overflow-y-auto">
						<table className="w-full">
							<tbody className="divide-y divide-gray-100">
								{parsedEntries.map((entry, index) => (
									<tr key={index} className="text-xs">
										<td className="px-3 py-1.5 font-medium text-gray-700">
											{format(parseISO(entry.date), "MMM d")}
										</td>
										<td className="px-3 py-1.5 text-right text-sky-600 font-medium">
											{currencySymbol}{entry.amount.toFixed(2)}
										</td>
										<td className="px-3 py-1.5 text-right text-gray-500">
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
				onClick={onAddParsedEntries}
				disabled={parsedEntries.length === 0}
				className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600/75 transition-colors duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer shadow-sm shadow-gray-500/50 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
