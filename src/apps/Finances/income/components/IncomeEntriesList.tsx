import React, { useState } from "react";
import ManualEntryForm from "./ManualEntryForm";
import PasteEntryForm from "./PasteEntryForm";
import { getAvailableDates } from "@/lib/dateUtils";
import { parsePasteText } from "@/lib/dateUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { format, parseISO, isSameDay } from "date-fns";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
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
	currencySymbol: string;
}> = ({ isOpen, onClose, entry, onSave, currencySymbol }) => {
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
					<Label className="text-sm text-muted-foreground mb-1">Amount ({currencySymbol})</Label>
					<Input
						type="number"
						step="0.01"
						min="0"
						value={editForm.amount || ""}
						onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
						className="bg-background h-10"
						placeholder="0.00"
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label className="text-sm text-muted-foreground mb-1">Hours</Label>
						<Input
							type="number"
							step="0.1"
							min="0"
							max="24"
							value={editForm.hours || ""}
							onChange={(e) => handleChange("hours", parseFloat(e.target.value) || 0)}
							className="bg-background h-10"
							placeholder="0"
						/>
					</div>
					<div>
						<Label className="text-sm text-muted-foreground mb-1">Minutes</Label>
						<Input
							type="number"
							step="1"
							min="0"
							max="59"
							value={editForm.minutes || ""}
							onChange={(e) => handleChange("minutes", parseInt(e.target.value) || 0)}
							className="bg-background h-10"
							placeholder="0"
						/>
					</div>
				</div>
				<div className="flex gap-2 pt-2">
					<Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/80">
						Save Changes
					</Button>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</div>
		</Modal>
	);
};

const IncomeEntriesList: React.FC<IncomeEntriesListProps> = ({
	selectedWeek,
	currentWeekEntries,
}) => {
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);

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
		<div className="bg-card rounded-xl shadow-lg p-4 h-full">
			<div className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-card-foreground">Income Entries</h3>
						<span className="text-xs text-muted-foreground mt-0.5 block">
							{currentWeekEntries.length}{" "}
							{currentWeekEntries.length === 1 ? "entry" : "entries"}
						</span>
					</div>
					<Button
						onClick={() => setShowAddModal(true)}
						size="sm"
						title="Add Income Entry"
						className="bg-primary hover:bg-primary/90"
					>
						<Plus className="w-3.5 h-3.5 mr-1.5" />
						Add Entry
					</Button>
				</div>
			</div>
			<div>
				{currentWeekEntries.length === 0 ? (
					<div className="text-center py-8">
						<FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
						<p className="text-sm text-muted-foreground">No entries this week</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-2">
										Date
									</th>
									<th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-2">
										Amount
									</th>
									<th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-2">
										Time
									</th>
									<th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-2 w-16">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50">
								{sortedEntries.map((entry) => {
									const isLatest = isLatestEntry(entry);
									return (
										<tr
											key={entry.id}
											className={`${
												isLatest
													? "bg-card hover:bg-accent"
													: "bg-muted/50 opacity-50"
											} transition-colors`}
										>
											<td className="py-2 px-2">
												<div className="flex flex-col gap-0.5">
													<span className="text-xs font-medium text-foreground">
														{format(parseISO(entry.date), "EEE, MMM d")}
													</span>
													{!isLatest && (
														<span className="text-xs text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded w-fit">
															Replaced
														</span>
													)}
												</div>
											</td>
											<td className="py-2 px-2 text-right">
												<span className="text-xs font-semibold text-primary">
													{currencySymbol}{entry.amount.toFixed(2)}
												</span>
											</td>
											<td className="py-2 px-2 text-right">
												<span className="text-xs text-muted-foreground">
													{formatTime(entry.hours, entry.minutes)}
												</span>
											</td>
											<td className="py-2 px-2">
												<div className="flex justify-end gap-0.5">
													{isLatest && (
														<Button
															variant="ghost"
															size="icon-sm"
															onClick={() => setEditingEntry(entry)}
															title="Edit"
														>
															<Pencil className="w-3.5 h-3.5" />
														</Button>
													)}
													<Button
														variant="ghost"
														size="icon-sm"
														onClick={() => deleteIncomeEntry(entry.id)}
														className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
														title="Delete"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</Button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

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
									? "bg-primary text-primary-foreground shadow-sm"
									: "bg-muted text-muted-foreground hover:bg-accent"
							}`}
						>
							Manual Entry
						</button>
						<button
							onClick={() => setEntryMethod("paste")}
							className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
								entryMethod === "paste"
									? "bg-primary text-primary-foreground shadow-sm"
									: "bg-muted text-muted-foreground hover:bg-accent"
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
				currencySymbol={currencySymbol}
			/>
		</div>
	);
};

export default IncomeEntriesList;
