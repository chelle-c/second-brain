import React, { useState } from "react";
import ManualEntryForm from "./ManualEntryForm";
import PasteEntryForm from "./PasteEntryForm";
import { getAvailableDates } from "@/lib/dateUtils";
import { parsePasteText } from "@/lib/dateUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, parseISO, isSameDay } from "date-fns";
import type { IncomeEntry, IncomeWeekSelection } from "@/types/income";

interface IncomeEntriesListProps {
	selectedWeek: IncomeWeekSelection;
	currentWeekEntries: IncomeEntry[];
}

const IncomeEntriesList: React.FC<IncomeEntriesListProps> = ({
	selectedWeek,
	currentWeekEntries,
}) => {
	// Form states
	const [newEntry, setNewEntry] = useState<Omit<IncomeEntry, "id">>({
		date: new Date().toISOString().split("T")[0],
		amount: 0,
		hours: 0,
		minutes: 0,
	});
	const [pasteText, setPasteText] = useState("");
	const [parsedEntries, setParsedEntries] = useState<any[]>([]);
	const [parseError, setParseError] = useState("");
	const [showEntrySection, setShowEntrySection] = useState(false);
	const [entryMethod, setEntryMethod] = useState<"manual" | "paste">("paste");
	const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
	const [editEntryForm, setEditEntryForm] = useState<IncomeEntry | null>(null);

	const { incomeEntries, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry } =
		useIncomeStore();

	const availableDates = getAvailableDates(selectedWeek.startDate);

	const isLatestEntry = (entry: IncomeEntry) => {
		return (
			incomeEntries
				.filter((e) => isSameDay(parseISO(e.date), parseISO(entry.date)))
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.id ===
			entry.id
		);
	};

	const handleToggleEntrySection = () => {
		setShowEntrySection(!showEntrySection);
	};

	const handleCancelEntry = () => {
		setShowEntrySection(false);
		onResetForm();
	};

	const handleAddEntry = (e: React.FormEvent) => {
		onAddEntry(e);
		setShowEntrySection(false);
	};

	const handleAddParsedEntries = () => {
		onAddParsedEntries();
		setShowEntrySection(false);
	};

	// *********************************

	// Entry editing handlers
	const onStartEditing = (entry: IncomeEntry) => {
		setEditingEntryId(entry.id);
		setEditEntryForm({ ...entry });
	};

	const onCancelEditing = () => {
		setEditingEntryId(null);
		setEditEntryForm(null);
	};

	const onEditEntryChange = (field: keyof IncomeEntry, value: string | number) => {
		if (editEntryForm) {
			setEditEntryForm((prev) => (prev ? { ...prev, [field]: value } : null));
		}
	};

	const onSaveEditedEntry = () => {
		if (editEntryForm) {
			const updatedEntry = {
				...editEntryForm,
				amount: parseFloat(editEntryForm.amount.toFixed(2)),
			};

			updateIncomeEntry(updatedEntry);

			setEditingEntryId(null);
			setEditEntryForm(null);
		}
	};

	// Paste text handling
	const onPasteTextChange = (text: string) => {
		setPasteText(text);
		setParseError("");

		if (text.trim()) {
			try {
				const parsed = parsePasteText(text, selectedWeek.year);
				setParsedEntries(parsed);
			} catch (error) {
				setParseError("Error parsing text. Please check the format.");
			}
		} else {
			setParsedEntries([]);
		}
	};

	const onAddParsedEntries = () => {
		const newEntries: IncomeEntry[] = parsedEntries.map((parsed) => ({
			id: Date.now().toString() + Math.random(),
			date: parsed.date,
			amount: parsed.amount,
			hours: parsed.hours,
			minutes: parsed.minutes,
		}));

		newEntries.forEach((entry) => addIncomeEntry(entry));

		setPasteText("");
		setParsedEntries([]);
		setParseError("");
	};

	// Manual entry handlers
	const onAddEntry = (e: React.FormEvent) => {
		e.preventDefault();
		if (newEntry.amount <= 0) return;

		const entry: IncomeEntry = {
			...newEntry,
			id: Date.now().toString(),
			amount: parseFloat(newEntry.amount.toFixed(2)),
		};

		addIncomeEntry(entry);

		setNewEntry({
			date: new Date().toISOString().split("T")[0],
			amount: 0,
			hours: 0,
			minutes: 0,
		});
	};

	const onDeleteEntry = (id: string) => {
		deleteIncomeEntry(id);
	};

	const onResetForm = () => {
		setNewEntry({
			date: new Date().toISOString().split("T")[0],
			amount: 0,
			hours: 0,
			minutes: 0,
		});
		setPasteText("");
		setParsedEntries([]);
		setParseError("");
	};

	const onNewEntryChange = (field: keyof IncomeEntry, value: string | number) => {
		setNewEntry((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold text-gray-800">Income Entries</h2>
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-500">
						{currentWeekEntries.length} entries this week
					</span>
					<div className="relative group">
						<svg
							className="w-4 h-4 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
							New entries replace existing ones for the same date
						</div>
					</div>
				</div>
			</div>

			{/* Entry Methods Section */}
			{showEntrySection && (
				<div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800">Add Income</h3>
						<Button
							onClick={handleCancelEntry}
							className="border border-gray-600 px-6 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
						>
							Cancel
						</Button>
					</div>

					<div className="flex gap-2 mb-4">
						<Button
							onClick={() => setEntryMethod("manual")}
							className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
								entryMethod === "manual"
									? "px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
							}`}
						>
							Manual Entry
						</Button>
						<Button
							onClick={() => setEntryMethod("paste")}
							className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
								entryMethod === "paste"
									? "px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
							}`}
						>
							Paste Data
						</Button>
					</div>

					{entryMethod === "manual" ? (
						<ManualEntryForm
							newEntry={newEntry}
							availableDates={availableDates}
							onEntryChange={onNewEntryChange}
							onSubmit={handleAddEntry}
						/>
					) : (
						<PasteEntryForm
							pasteText={pasteText}
							parsedEntries={parsedEntries}
							parseError={parseError}
							selectedYear={selectedWeek.year}
							onPasteTextChange={onPasteTextChange}
							onAddParsedEntries={handleAddParsedEntries}
						/>
					)}
				</div>
			)}

			{currentWeekEntries.length === 0 && !showEntrySection ? (
				<div className={`text-center py-8`}>
					<svg
						className="w-12 h-12 text-gray-400 mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p className="text-gray-500 mb-4">No income entries for this week</p>
					<Button
						onClick={handleToggleEntrySection}
						className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
					>
						+ Add your first entry
					</Button>
				</div>
			) : (
				<>
					{/* Add Income Button */}
					{!showEntrySection && (
						<div className="mb-6">
							<Button
								onClick={handleToggleEntrySection}
								className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
							>
								+ Add Income Entry
							</Button>
						</div>
					)}
					<div className="space-y-3 max-h-96 overflow-y-auto">
						{currentWeekEntries
							.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
							.map((entry) => (
								<div
									key={entry.id}
									className={`flex items-center justify-between p-3 border rounded-lg ${
										isLatestEntry(entry)
											? "border-emerald-200 bg-emerald-50"
											: "border-gray-200 bg-gray-50 opacity-60"
									}`}
								>
									{editingEntryId === entry.id ? (
										<div className="flex-1 space-y-4">
											<div className="text-lg text-gray-600 font-semibold">
												{format(parseISO(entry.date), "EEEE, MMM d, yyyy")}
											</div>
											<div className="flex flex-col gap-4">
												<div>
													<Label className="block text-sm font-medium text-gray-700 mb-1">
														Amount ($)
													</Label>
													<Input
														type="number"
														step="0.01"
														min="0"
														value={editEntryForm?.amount || ""}
														onChange={(e) =>
															onEditEntryChange(
																"amount",
																parseFloat(e.target.value) || 0
															)
														}
														className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
														placeholder="0.00"
														required
													/>
												</div>

												<div className="grid grid-cols-2 gap-4">
													<div>
														<Label className="block text-sm font-medium text-gray-700 mb-1">
															Hours
														</Label>
														<Input
															type="number"
															step="0.1"
															min="0"
															max="24"
															value={editEntryForm?.hours || ""}
															onChange={(e) =>
																onEditEntryChange(
																	"hours",
																	parseFloat(e.target.value) || 0
																)
															}
															className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
															placeholder="0"
														/>
													</div>

													<div>
														<Label className="block text-sm font-medium text-gray-700 mb-1">
															Minutes
														</Label>
														<Input
															type="number"
															step="1"
															min="0"
															max="59"
															value={editEntryForm?.minutes || ""}
															onChange={(e) =>
																onEditEntryChange(
																	"minutes",
																	parseInt(e.target.value) || 0
																)
															}
															className="bg-white w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
															placeholder="0"
														/>
													</div>
												</div>

												<div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
													<p>
														💡 <strong>Tip:</strong> You can enter just
														hours or just minutes - both are optional.
													</p>
												</div>
											</div>
											<div className="flex justify-end gap-2">
												<Button
													onClick={onSaveEditedEntry}
													className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
												>
													Save
												</Button>
												<Button
													onClick={onCancelEditing}
													className="bg-gray-600 text-shadow-gray-800 py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<>
											<div className="flex-1">
												<div className="text-md font-medium text-gray-900">
													${entry.amount.toFixed(2)}{" "}
													{entry.hours &&
														` • ${entry.hours}h ${entry.minutes}m`}
													{!isLatestEntry(entry) && (
														<span className="ml-2 text-xs text-orange-600 bg-orange-100 px-1 py-0.5 rounded">
															Replaced
														</span>
													)}
												</div>
												<div className="text-sm text-gray-600">
													{format(parseISO(entry.date), "EEEE, MMM d")}
												</div>
											</div>
											<div className="flex gap-2">
												{isLatestEntry(entry) && (
													<button
														onClick={() => onStartEditing(entry)}
														className="border border-transparent text-blue-600 hover:border-blue-600 p-1 rounded transition-colors cursor-pointer"
														title="Edit entry"
													>
														<svg
															className="w-4 h-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
															/>
														</svg>
													</button>
												)}
												<button
													onClick={() => onDeleteEntry(entry.id)}
													className="border border-transparent text-red-600 hover:border-red-700 p-1 rounded transition-colors cursor-pointer"
													title="Delete entry"
												>
													<svg
														className="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											</div>
										</>
									)}
								</div>
							))}
					</div>
				</>
			)}
		</div>
	);
};

export default IncomeEntriesList;
