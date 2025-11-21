import React, { useState } from "react";
import ManualEntryForm from "./ManualEntryForm";
import PasteEntryForm from "./PasteEntryForm";
import { getAvailableDates } from "@/lib/dateUtils";
import { parsePasteText } from "@/lib/dateUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { format, parseISO, isSameDay } from "date-fns";
import type { IncomeEntry, IncomeWeekSelection } from "@/types/income";

interface IncomeEntriesListProps {
	selectedWeek: IncomeWeekSelection;
	currentWeekEntries: IncomeEntry[];
}

// Edit Modal Component
const EditModal: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	entry: IncomeEntry | null;
	onSave: (entry: IncomeEntry) => void;
}> = ({ isOpen, onClose, entry, onSave }) => {
	const [editForm, setEditForm] = useState<IncomeEntry | null>(null);

	React.useEffect(() => {
		if (entry) {
			setEditForm({ ...entry });
		}
	}, [entry]);

	if (!isOpen || !editForm) return null;

	const handleChange = (field: keyof IncomeEntry, value: string | number) => {
		setEditForm((prev) => (prev ? { ...prev, [field]: value } : null));
	};

	const handleSave = () => {
		if (editForm) {
			onSave({
				...editForm,
				amount: parseFloat(editForm.amount.toFixed(2)),
			});
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={`Edit Entry - ${format(parseISO(editForm.date), "EEE, MMM d")}`}
		>
			<div className="space-y-4">
				<div>
					<Label className="text-sm text-gray-600 mb-1">Amount ($)</Label>
					<Input
						type="number"
						step="0.01"
						min="0"
						value={editForm.amount || ""}
						onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
						className="bg-white h-10"
						placeholder="0.00"
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label className="text-sm text-gray-600 mb-1">Hours</Label>
						<Input
							type="number"
							step="0.1"
							min="0"
							max="24"
							value={editForm.hours || ""}
							onChange={(e) => handleChange("hours", parseFloat(e.target.value) || 0)}
							className="bg-white h-10"
							placeholder="0"
						/>
					</div>
					<div>
						<Label className="text-sm text-gray-600 mb-1">Minutes</Label>
						<Input
							type="number"
							step="1"
							min="0"
							max="59"
							value={editForm.minutes || ""}
							onChange={(e) => handleChange("minutes", parseInt(e.target.value) || 0)}
							className="bg-white h-10"
							placeholder="0"
						/>
					</div>
				</div>
				<div className="flex gap-2 pt-2">
					<button
						onClick={handleSave}
						className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600/75 transition-colors duration-200 font-medium cursor-pointer shadow-sm shadow-gray-500/50"
					>
						Save Changes
					</button>
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
					>
						Cancel
					</button>
				</div>
			</div>
		</Modal>
	);
};

const IncomeEntriesList: React.FC<IncomeEntriesListProps> = ({
	selectedWeek,
	currentWeekEntries,
}) => {
	const [newEntry, setNewEntry] = useState<Omit<IncomeEntry, "id">>({
		date: new Date().toISOString().split("T")[0],
		amount: 0,
		hours: 0,
		minutes: 0,
	});
	const [pasteText, setPasteText] = useState("");
	const [parsedEntries, setParsedEntries] = useState<any[]>([]);
	const [parseError, setParseError] = useState("");
	const [showAddModal, setShowAddModal] = useState(false);
	const [entryMethod, setEntryMethod] = useState<"manual" | "paste">("paste");
	const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);

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

	const handleAddEntry = (e: React.FormEvent) => {
		e.preventDefault();
		if (newEntry.amount <= 0) return;

		const entry: IncomeEntry = {
			...newEntry,
			id: Date.now().toString(),
			amount: parseFloat(newEntry.amount.toFixed(2)),
		};

		addIncomeEntry(entry);
		setShowAddModal(false);
		onResetForm();
	};

	const handleAddParsedEntries = () => {
		const newEntries: IncomeEntry[] = parsedEntries.map((parsed) => ({
			id: Date.now().toString() + Math.random(),
			date: parsed.date,
			amount: parsed.amount,
			hours: parsed.hours,
			minutes: parsed.minutes,
		}));

		newEntries.forEach((entry) => addIncomeEntry(entry));
		setShowAddModal(false);
		onResetForm();
	};

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

	const handleSaveEdit = (entry: IncomeEntry) => {
		updateIncomeEntry(entry);
		setEditingEntry(null);
	};

	const formatTime = (hours?: number, minutes?: number) => {
		const h = hours || 0;
		const m = minutes || 0;
		return `${h}h ${m.toString().padStart(2, "0")}m`;
	};

	const sortedEntries = [...currentWeekEntries].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-full">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h2 className="text-sm font-semibold text-gray-700">Income Entries</h2>
					<span className="text-xs text-gray-500 mt-0.5 block">
						{currentWeekEntries.length}{" "}
						{currentWeekEntries.length === 1 ? "entry" : "entries"}
					</span>
				</div>
				<button
					onClick={() => setShowAddModal(true)}
					className="px-3 py-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600/75 transition-colors duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm shadow-gray-500/50"
					title="Add Income Entry"
				>
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
					<span>Add Entry</span>
				</button>
			</div>

			{currentWeekEntries.length === 0 ? (
				<div className="text-center py-8">
					<svg
						className="w-10 h-10 text-gray-300 mx-auto mb-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p className="text-sm text-gray-500">No entries this week</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-gray-200">
								<th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">
									Date
								</th>
								<th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">
									Amount
								</th>
								<th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">
									Time
								</th>
								<th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2 w-16">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{sortedEntries.map((entry) => {
								const isLatest = isLatestEntry(entry);
								return (
									<tr
										key={entry.id}
										className={`${
											isLatest
												? "bg-white hover:bg-gray-50"
												: "bg-gray-50/50 opacity-50"
										} transition-colors`}
									>
										<td className="py-2 px-2">
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-medium text-gray-900">
													{format(parseISO(entry.date), "EEE, MMM d")}
												</span>
												{!isLatest && (
													<span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded w-fit">
														Replaced
													</span>
												)}
											</div>
										</td>
										<td className="py-2 px-2 text-right">
											<span className="text-xs font-semibold text-sky-600">
												${entry.amount.toFixed(2)}
											</span>
										</td>
										<td className="py-2 px-2 text-right">
											<span className="text-xs text-gray-600">
												{formatTime(entry.hours, entry.minutes)}
											</span>
										</td>
										<td className="py-2 px-2">
											<div className="flex justify-end gap-0.5">
												{isLatest && (
													<button
														onClick={() => setEditingEntry(entry)}
														className="p-1 text-sky-600 hover:bg-sky-100 rounded transition-colors cursor-pointer"
														title="Edit"
													>
														<svg
															className="w-3.5 h-3.5"
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
													onClick={() => deleteIncomeEntry(entry.id)}
													className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors cursor-pointer"
													title="Delete"
												>
													<svg
														className="w-3.5 h-3.5"
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
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Add Entry Modal */}
			<Modal
				isOpen={showAddModal}
				onClose={() => {
					setShowAddModal(false);
					onResetForm();
				}}
				title="Add Income Entry"
			>
				<div className="space-y-4">
					<div className="flex gap-2">
						<button
							onClick={() => setEntryMethod("manual")}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
								entryMethod === "manual"
									? "bg-sky-500 text-white shadow-sm"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
						>
							Manual Entry
						</button>
						<button
							onClick={() => setEntryMethod("paste")}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
								entryMethod === "paste"
									? "bg-sky-500 text-white shadow-sm"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200"
							}`}
						>
							Paste Data
						</button>
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
			</Modal>

			{/* Edit Entry Modal */}
			<EditModal
				isOpen={editingEntry !== null}
				onClose={() => setEditingEntry(null)}
				entry={editingEntry}
				onSave={handleSaveEdit}
			/>
		</div>
	);
};

export default IncomeEntriesList;
