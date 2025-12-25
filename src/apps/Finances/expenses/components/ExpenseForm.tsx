import { Modal } from "@/components/Modal";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type {
	Expense,
	ExpenseFormData,
	ImportanceLevel,
	RecurrenceFrequency,
	RecurrenceSettings,
} from "@/types/expense";
import { ConfirmRegenerationModal } from "@/components/ConfirmRegenerationModal";
import { format, isSameDay, startOfMonth } from "date-fns";
import {
	Calendar,
	CheckCircle,
	CreditCard,
	DollarSign,
	Plus,
	RefreshCw,
	Save,
	Tag,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ExpenseFormProps {
	editingExpense?: Expense | null;
	onClose?: () => void;
	isGlobalEdit?: boolean;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
	editingExpense,
	onClose,
	isGlobalEdit = false,
}) => {
	const {
		expenses,
		addExpense,
		updateExpense,
		categories,
		categoryColors,
		paymentMethods,
	} = useExpenseStore();
	const [isOpen, setIsOpen] = useState(false);

	const [formData, setFormData] = useState<ExpenseFormData>({
		name: "",
		amount: 0,
		category: "",
		paymentMethod: "None",
		dueDate: null,
		isRecurring: false,
		recurrence: undefined,
		isPaid: false,
		paymentDate: null,
		type: "need",
		importance: "none",
	});

	const [amountString, setAmountString] = useState("0");
	const [hasDueDate, setHasDueDate] = useState(true);
	const [tempDueDate, setTempDueDate] = useState(new Date());

	const [recurrenceSettings, setRecurrenceSettings] =
		useState<RecurrenceSettings>({
			frequency: "monthly",
			interval: 1,
			occurrences: 12,
		});

	const [showRegenerationWarning, setShowRegenerationWarning] = useState(false);
	const [pendingFormData, setPendingFormData] =
		useState<ExpenseFormData | null>(null);

	// Detect if we're editing a specific instance
	const isEditingInstance = !!editingExpense?.parentExpenseId;

	useEffect(() => {
		if (editingExpense) {
			setFormData({
				name: editingExpense.name,
				amount: editingExpense.amount,
				category: editingExpense.category,
				paymentMethod: editingExpense.paymentMethod || "None",
				dueDate: editingExpense.dueDate,
				isRecurring: editingExpense.isRecurring,
				recurrence: editingExpense.recurrence,
				isPaid: editingExpense.isPaid,
				paymentDate: editingExpense.paymentDate,
				type: editingExpense.type || "need",
				importance: editingExpense.importance || "none",
			});
			setAmountString(editingExpense.amount.toString());
			setHasDueDate(editingExpense.dueDate !== null);
			setTempDueDate(editingExpense.dueDate || new Date());
			if (editingExpense.recurrence) {
				setRecurrenceSettings(editingExpense.recurrence);
			}
			setIsOpen(true);
		}
	}, [editingExpense]);

	// Set initial category when form opens
	useEffect(() => {
		if (!editingExpense && categories.length > 0 && !formData.category) {
			setFormData((prev) => ({ ...prev, category: categories[0] }));
		}
	}, [categories, editingExpense, formData.category]);

	useEffect(() => {
		if (formData.isRecurring) {
			setFormData((prev) => ({ ...prev, recurrence: recurrenceSettings }));
			setHasDueDate(true);
			if (!editingExpense && !formData.dueDate) {
				const firstOfMonth = startOfMonth(new Date());
				setTempDueDate(firstOfMonth);
				setFormData((prev) => ({ ...prev, dueDate: firstOfMonth }));
			}
		} else {
			setFormData((prev) => ({ ...prev, recurrence: undefined }));
		}
	}, [
		formData.isRecurring,
		recurrenceSettings,
		editingExpense,
		formData.dueDate,
	]);

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setAmountString(value);

		const numValue = parseFloat(value);
		if (!Number.isNaN(numValue)) {
			setFormData({ ...formData, amount: numValue });
		}
	};

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const selectedDate = new Date(`${dateValue}T12:00:00`);
			setTempDueDate(selectedDate);
			if (hasDueDate) {
				setFormData({ ...formData, dueDate: selectedDate });
			}
		}
	};

	const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const selectedDate = new Date(`${dateValue}T12:00:00`);
			setFormData({ ...formData, paymentDate: selectedDate });
		}
	};

	const handleDueDateToggle = (checked: boolean) => {
		setHasDueDate(checked);
		if (checked) {
			setFormData({ ...formData, dueDate: tempDueDate });
		} else {
			setFormData({ ...formData, dueDate: null });
		}
	};

	const willRegenerateOccurrences = (newData: ExpenseFormData): boolean => {
		if (!editingExpense?.isRecurring || editingExpense.parentExpenseId) {
			return false;
		}

		const needsRegeneration =
			(newData.dueDate &&
				editingExpense.dueDate &&
				!isSameDay(newData.dueDate, editingExpense.dueDate)) ||
			(newData.recurrence?.occurrences !== undefined &&
				newData.recurrence.occurrences !==
					editingExpense.recurrence?.occurrences) ||
			(newData.recurrence?.frequency !== undefined &&
				newData.recurrence.frequency !==
					editingExpense.recurrence?.frequency) ||
			(newData.recurrence?.interval !== undefined &&
				newData.recurrence.interval !== editingExpense.recurrence?.interval);

		return needsRegeneration;
	};

	const getModifiedOccurrencesCount = (): number => {
		if (!editingExpense?.id) return 0;
		return expenses.filter(
			(e) => e.parentExpenseId === editingExpense.id && e.isModified,
		).length;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const amount = parseFloat(amountString);
		if (Number.isNaN(amount) || amount <= 0) {
			alert("Please enter a valid amount");
			return;
		}

		if (formData.isRecurring && !formData.dueDate) {
			alert("Recurring expenses must have a due date");
			return;
		}

		const finalFormData = {
			...formData,
			amount,
			dueDate: hasDueDate ? formData.dueDate : null,
			paymentDate: formData.isPaid ? formData.paymentDate || new Date() : null,
			isPaid: formData.isPaid,
		};

		if (willRegenerateOccurrences(finalFormData)) {
			setPendingFormData(finalFormData);
			setShowRegenerationWarning(true);
			return;
		}

		processUpdate(finalFormData);
	};

	const processUpdate = (finalFormData: ExpenseFormData) => {
		if (editingExpense) {
			if (isEditingInstance) {
				updateExpense(
					editingExpense.id,
					{
						amount: finalFormData.amount,
						dueDate: finalFormData.dueDate,
						paymentMethod: finalFormData.paymentMethod,
						isPaid: finalFormData.isPaid,
						paymentDate: finalFormData.paymentDate,
					},
					false,
				);
			} else {
				updateExpense(editingExpense.id, finalFormData, isGlobalEdit);
			}
		} else {
			addExpense(finalFormData);
		}

		handleReset();
	};

	const handleConfirmRegeneration = () => {
		if (pendingFormData) {
			processUpdate(pendingFormData);
		}
		setShowRegenerationWarning(false);
		setPendingFormData(null);
	};

	const handleCancelRegeneration = () => {
		setShowRegenerationWarning(false);
		setPendingFormData(null);
	};

	const handleReset = () => {
		setFormData({
			name: "",
			amount: 0,
			category: "",
			paymentMethod: "None",
			dueDate: null,
			isRecurring: false,
			recurrence: undefined,
			isPaid: false,
			paymentDate: null,
			type: "need",
			importance: "none",
		});
		setAmountString("0");
		setHasDueDate(true);
		setTempDueDate(new Date());
		setRecurrenceSettings({
			frequency: "monthly",
			interval: 1,
			occurrences: 12,
		});
		setIsOpen(false);
		if (onClose) onClose();
	};

	const handleOpen = () => {
		if (!editingExpense) {
			setIsOpen(true);
		}
	};

	// Build payment method options - always include "None" first
	const paymentMethodOptions = [
		"None",
		...paymentMethods.filter((m) => m !== "None"),
	];

	return (
		<>
			{!editingExpense && (
				<button
					type="button"
					onClick={handleOpen}
					className="fixed bottom-8 right-12 bg-primary text-primary-foreground p-4 rounded-full
					shadow-xl hover:bg-primary/90 hover:scale-110 transition-all duration-200
					active:scale-95 z-40 group"
				>
					<Plus size={24} />
					<span
						className="absolute right-full mr-3 top-1/2 -translate-y-1/2
						bg-popover text-popover-foreground px-3 py-1 rounded-lg text-sm
						opacity-0 group-hover:opacity-100 transition-opacity duration-200
						whitespace-nowrap shadow-lg border border-border"
					>
						Add Expense
					</span>
				</button>
			)}

			<Modal
				isOpen={isOpen && !showRegenerationWarning}
				onClose={handleReset}
				title={
					editingExpense
						? isEditingInstance
							? "Edit This Occurrence"
							: "Edit Expense"
						: "Add New Expense"
				}
				className="max-w-md max-h-[90vh] overflow-y-auto"
			>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Name - hide when editing occurrence */}
					{!isEditingInstance && (
						<div>
							<label
								htmlFor="expense-name"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Expense Name
							</label>
							<div className="relative">
								<input
									id="expense-name"
									type="text"
									required
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full px-4 py-2 pl-10 border border-border rounded-lg
												focus:ring-2 focus:ring-primary focus:border-transparent
												transition-all duration-200 placeholder:text-muted-foreground bg-background text-foreground"
									placeholder="Enter expense name"
								/>
								<Tag
									className="absolute left-3 top-2.5 text-muted-foreground"
									size={18}
								/>
							</div>
						</div>
					)}

					{/* Type and Importance - hide when editing occurrence */}
					{!isEditingInstance && (
						<div className="flex gap-4">
							{/* Expense Type */}
							<div className="flex-1 items-stretch">
								<label
									htmlFor="expense-type"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Expense Type
								</label>
								<fieldset
									id="expense-type"
									className="flex gap-2 bg-muted rounded-lg p-1"
								>
									<button
										type="button"
										onClick={() => setFormData({ ...formData, type: "need" })}
										className={`flex-1 px-3 py-1 rounded-md font-medium transition-all duration-200 text-sm ${
											formData.type === "need"
												? "bg-card text-purple-600 shadow-sm"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										Need
									</button>
									<button
										type="button"
										onClick={() => setFormData({ ...formData, type: "want" })}
										className={`flex-1 px-3 py-1 rounded-md font-medium transition-all duration-200 text-sm ${
											formData.type === "want"
												? "bg-card text-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										Want
									</button>
								</fieldset>
							</div>

							{/* Importance */}
							<div className="flex-1 items-stretch">
								<label
									htmlFor="expense-importance"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Importance
								</label>
								<Select
									value={formData.importance}
									onValueChange={(value) =>
										setFormData({
											...formData,
											importance: value as ImportanceLevel,
										})
									}
								>
									<SelectTrigger id="expense-importance" className="w-[180px]">
										<SelectValue placeholder="Select importance" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="none">None</SelectItem>
											<SelectItem value="medium">Medium (!)</SelectItem>
											<SelectItem value="high">High (!!)</SelectItem>
											<SelectItem value="critical">Critical (!!!)</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</div>
					)}

					{/* Amount */}
					<div className="flex flex-row gap-4">
						<div className="flex flex-col items-stretch">
							<label
								htmlFor="expense-amount"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Amount
							</label>
							<div className="relative">
								<input
									id="expense-amount"
									type="number"
									required
									min="0"
									step="0.01"
									value={amountString}
									onChange={handleAmountChange}
									className="w-full px-4 py-1 pl-8 border border-border rounded-lg
											focus:ring-2 focus:ring-primary focus:border-transparent
											transition-all duration-200 bg-background text-foreground"
									placeholder="0.00"
								/>
								<DollarSign
									className="absolute left-2 top-2.25 text-muted-foreground"
									size={16}
								/>
							</div>
						</div>
						{/* Category - hide when editing occurrence */}
						{!isEditingInstance && (
							<div className="flex flex-col items-start">
								<label
									htmlFor="expense-category"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Category
								</label>
								<Select
									value={formData.category}
									onValueChange={(value) =>
										setFormData({
											...formData,
											category: value,
										})
									}
								>
									<SelectTrigger id="expense-category" className="w-[180px]">
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{categories.map((category) => (
												<SelectItem key={category} value={category}>
													<div className="flex items-center gap-2">
														<span
															className="w-3 h-3 rounded-full shrink-0"
															style={{
																backgroundColor:
																	categoryColors[category] || "#6b7280",
															}}
														/>
														{category}
													</div>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Payment Method - always visible in editing mode */}
					<div className="flex flex-col items-start">
						<label
							htmlFor="payment-method"
							className="block text-sm font-medium text-foreground mb-2"
						>
							<span className="flex items-center gap-2">
								<CreditCard size={16} />
								Payment Method
							</span>
						</label>
						<Select
							value={formData.paymentMethod}
							onValueChange={(value) =>
								setFormData({
									...formData,
									paymentMethod: value,
								})
							}
						>
							<SelectTrigger id="payment-method" className="w-[220px]">
								<SelectValue placeholder="Select payment method" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Payment Methods</SelectLabel>
									{paymentMethodOptions.map((method) => (
										<SelectItem key={method} value={method}>
											{method}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					{/* Recurrence settings - hide when editing occurrence */}
					{!isEditingInstance && (
						<div className="bg-primary/10 p-4 rounded-lg">
							<label className="flex items-center gap-3 cursor-pointer mb-3">
								<input
									type="checkbox"
									checked={formData.isRecurring}
									onChange={(e) =>
										setFormData({
											...formData,
											isRecurring: e.target.checked,
										})
									}
									className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
								/>
								<span className="text-sm font-medium text-foreground flex items-center gap-2">
									<RefreshCw size={16} />
									Recurring Expense
								</span>
							</label>

							{formData.isRecurring && (
								<div className="space-y-3">
									<Select
										value={recurrenceSettings.frequency}
										onValueChange={(value) =>
											setRecurrenceSettings({
												...recurrenceSettings,
												frequency: value as RecurrenceFrequency,
											})
										}
									>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="Select frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Frequency</SelectLabel>
												<SelectItem value="daily">Daily</SelectItem>
												<SelectItem value="weekly">Weekly</SelectItem>
												<SelectItem value="biweekly">Biweekly</SelectItem>
												<SelectItem value="monthly">Monthly</SelectItem>
												<SelectItem value="custom-days">
													Every X Days
												</SelectItem>
												<SelectItem value="custom-months">
													Every X Months
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>

									{(recurrenceSettings.frequency === "custom-days" ||
										recurrenceSettings.frequency === "custom-months") && (
										<div>
											<label
												htmlFor="expense-interval"
												className="block text-xs font-medium text-muted-foreground mb-1"
											>
												Interval
											</label>
											<input
												id="expense-interval"
												type="number"
												min="1"
												value={recurrenceSettings.interval}
												onChange={(e) =>
													setRecurrenceSettings({
														...recurrenceSettings,
														interval: parseInt(e.target.value, 10) || 1,
													})
												}
												className="w-full px-3 py-1.5 text-sm border border-border bg-background text-foreground rounded focus:ring-2 focus:ring-primary focus:border-transparent"
											/>
										</div>
									)}

									<div>
										<label
											htmlFor="expense-occurrences"
											className="block text-xs font-medium text-muted-foreground mb-1"
										>
											Number of Occurrences
										</label>
										<input
											id="expense-occurrences"
											type="number"
											min="1"
											value={recurrenceSettings.occurrences}
											onChange={(e) =>
												setRecurrenceSettings({
													...recurrenceSettings,
													occurrences: parseInt(e.target.value, 10) || 1,
												})
											}
											className="w-full px-3 py-1.5 text-sm border border-border rounded
								focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
										/>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Due date toggle - hide when editing occurrence or when recurring */}
					{!formData.isRecurring && !isEditingInstance && (
						<div className="bg-muted p-4 rounded-lg">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={hasDueDate}
									onChange={(e) => handleDueDateToggle(e.target.checked)}
									className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
								/>
								<span className="text-sm font-medium text-foreground flex items-center gap-2">
									<Calendar size={16} />
									Has Due Date
								</span>
							</label>
						</div>
					)}

					{/* Due Date */}
					{(hasDueDate || formData.isRecurring || isEditingInstance) && (
						<div>
							<label
								htmlFor="expenses-due-date"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Due Date
								{formData.isRecurring && !isEditingInstance && (
									<span className="text-xs text-muted-foreground ml-2">
										(First occurrence)
									</span>
								)}
								{isEditingInstance && (
									<span className="text-xs text-muted-foreground ml-2">
										(This occurrence only)
									</span>
								)}
							</label>
							<div className="relative">
								<input
									id="expenses-due-date"
									type="date"
									required={hasDueDate || formData.isRecurring}
									value={tempDueDate ? format(tempDueDate, "yyyy-MM-dd") : ""}
									onChange={handleDateChange}
									className="w-full px-4 py-2 pl-10 border border-border rounded-lg
						focus:ring-2 focus:ring-primary focus:border-transparent
						transition-all duration-200 bg-background text-foreground"
								/>
								<Calendar
									className="absolute left-3 top-2.5 text-muted-foreground"
									size={18}
								/>
							</div>
						</div>
					)}

					{/* Payment status */}
					<div className="bg-green-500/10 p-4 rounded-lg space-y-3">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.isPaid}
								onChange={(e) =>
									setFormData({ ...formData, isPaid: e.target.checked })
								}
								className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-400"
							/>
							<span className="text-sm font-medium text-foreground flex items-center gap-2">
								<CheckCircle size={16} />
								Mark as Paid
							</span>
						</label>

						{formData.isPaid && (
							<div>
								<label
									htmlFor="expenses-payment-date"
									className="block text-xs font-medium text-muted-foreground mb-1"
								>
									Payment Date
								</label>
								<input
									id="expenses-payment-date"
									type="date"
									value={
										formData.paymentDate
											? format(formData.paymentDate, "yyyy-MM-dd")
											: format(new Date(), "yyyy-MM-dd")
									}
									onChange={handlePaymentDateChange}
									className="w-full px-3 py-1.5 text-sm border border-border rounded
						focus:ring-2 focus:ring-green-400 focus:border-transparent bg-background text-foreground"
								/>
							</div>
						)}
					</div>

					<div className="flex gap-3 pt-4">
						<button
							type="submit"
							className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg
				hover:bg-primary/90 transition-colors duration-200
				flex items-center justify-center gap-2 font-medium
				hover:scale-105 active:scale-95 transform"
						>
							<Save size={18} />
							{editingExpense ? "Update" : "Add"} Expense
						</button>
						<button
							type="button"
							onClick={handleReset}
							className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg
				hover:bg-secondary/80 transition-colors duration-200 font-medium
				hover:scale-105 active:scale-95 transform"
						>
							Cancel
						</button>
					</div>
				</form>
			</Modal>

			<ConfirmRegenerationModal
				isOpen={showRegenerationWarning}
				modifiedCount={getModifiedOccurrencesCount()}
				onConfirm={handleConfirmRegeneration}
				onCancel={handleCancelRegeneration}
			/>
		</>
	);
};
