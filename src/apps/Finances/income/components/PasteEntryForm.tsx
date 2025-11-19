import React from "react";

import { format, parseISO } from "date-fns";
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
	return (
		<div className="space-y-4">
			<div className="text-sm text-gray-600 mb-2">
				<p className="text-md text-gray-600 font-bold">
					Parsed dates will use the selected year ({selectedYear}) if not specified.
				</p>
			</div>
			<div>
				<label
					htmlFor="entry_paste_text"
					className="block text-sm font-medium text-gray-700 mb-2"
				>
					Paste your income data:
				</label>
				<textarea
					id="entry_paste_text"
					value={pasteText}
					onChange={(e) => onPasteTextChange(e.target.value)}
					placeholder={`One value per line`}
					rows={8}
					className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm text-gray-500"
				/>
				{parseError && <p className="text-red-600 text-sm mt-1">{parseError}</p>}
			</div>

			{parsedEntries.length > 0 && (
				<div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
					<h3 className="text-md font-semibold text-gray-900 mb-2">
						Found {parsedEntries.length} entries:
					</h3>
					<div className="space-y-2 max-h-40 overflow-y-auto">
						{parsedEntries.map((entry, index) => (
							<div
								key={index}
								className="flex justify-between items-center text-sm mx-2 p-2 bg-white rounded"
							>
								<div className="text-md">
									<span className="font-bold">
										{format(parseISO(entry.date), "MMM d")}
									</span>{" "}
									-
									<span className="font-medium text-emerald-700">
										{" "}
										${entry.amount.toFixed(2)}
									</span>
									<span>
										{entry.hours &&
											` (${entry.hours}h ${entry.minutes || 0}min)`}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<button
				onClick={onAddParsedEntries}
				disabled={parsedEntries.length === 0}
				className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				Add {parsedEntries.length} Entries
			</button>
		</div>
	);
};

export default PasteEntryForm;
