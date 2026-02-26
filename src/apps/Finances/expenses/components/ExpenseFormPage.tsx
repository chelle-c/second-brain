import { invoke } from "@tauri-apps/api/core";
import {
	Bell,
	Calendar,
	CheckCircle,
	CreditCard,
	DollarSign,
	RefreshCw,
	Save,
	Tag,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { deriveNumericAmount } from "@/lib/amountUtils";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type {
	AmountRange,
	AmountType,
	Expense,
	ExpenseFormData,
	ImportanceLevel,
	RecurrenceFrequency,
	RecurrenceSettings,
} from "@/types/expense";
import { ConfirmRegenerationModal } from "@/components/ConfirmRegenerationModal";
import { format, isSameDay } from "date-fns";
import { cancelExpenseForm, submitExpenseForm } from "@/hooks/useExpenseFormBridge";

interface ExpenseFormPageProps {
	editingExpense?: Expense | null;
	isGlobalEdit?: boolean;
}

export const ExpenseFormPage: React.FC<ExpenseFormPageProps> = ({
	editingExpense,
	isGlobalEdit = false,
}) => {
	const expenses = useExpenseStore((s) => s.expenses);
	const categories = useExpenseStore((s) => s.categories);
	const categoryColors = useExpenseStore((s) => s.categoryColors);
	const paymentMethods = useExpenseStore((s) => s.paymentMethods);

	// ── Derive all initial values synchronously ──────────────────────────────

	const getInitialAmountType = (): AmountType => editingExpense?.amountData?.type ?? "exact";

	const getInitialExact = (): string => {
		const ad = editingExpense?.amountData;
		if (ad?.type === "exact") return (ad.exact ?? editingExpense?.amount ?? 0).toString();
		// If switching from another type, carry the base amount over
		return (editingExpense?.amount ?? 0).toString();
	};

	const getInitialRangeMin = (): string => {
		const ad = editingExpense?.amountData;
		if (ad?.type === "range") return (ad.rangeMin ?? 0).toString();
		// Default: use the base amount as min
		return (editingExpense?.amount ?? 0).toString();
	};

	const getInitialRangeMax = (): string => {
		const ad = editingExpense?.amountData;
		if (ad?.type === "range") return (ad.rangeMax ?? 0).toString();
		// Default: base amount + 1
		return ((editingExpense?.amount ?? 0) + 1).toString();
	};

	const getInitialEstimate = (): string => {
		const ad = editingExpense?.amountData;
		if (ad?.type === "estimate") return (ad.estimate ?? editingExpense?.amount ?? 0).toString();
		return (editingExpense?.amount ?? 0).toString();
	};

	const getInitialDueDate = (): Date => {
		if (editingExpense?.dueDate) return new Date(editingExpense.dueDate);
		// Default to today for new expenses
		return new Date();
	};

	const getInitialHasDueDate = (): boolean => {
		if (editingExpense) return editingExpense.dueDate !== null;
		return true;
	};

	const getInitialFormData = (): ExpenseFormData => {
		if (editingExpense) {
			return {
				name: editingExpense.name,
				amount: editingExpense.amount,
				amountData: editingExpense.amountData ?? {
					type: "exact",
					exact: editingExpense.amount,
				},
				category: editingExpense.category,
				paymentMethod: editingExpense.paymentMethod || "None",
				dueDate: editingExpense.dueDate ? new Date(editingExpense.dueDate) : null,
				isRecurring: editingExpense.isRecurring,
				recurrence: editingExpense.recurrence,
				isPaid: editingExpense.isPaid,
				paymentDate:
					editingExpense.paymentDate ? new Date(editingExpense.paymentDate) : null,
				type: editingExpense.type || "need",
				importance: editingExpense.importance || "none",
				notify: editingExpense.notify || false,
			};
		}
		return {
			name: "",
			amount: 0,
			amountData: { type: "exact", exact: 0 },
			category: categories[0] ?? "",
			paymentMethod: "None",
			dueDate: new Date(),
			isRecurring: false,
			recurrence: undefined,
			isPaid: false,
			paymentDate: null,
			type: "need",
			importance: "none",
			notify: false,
		};
	};

	const getInitialRecurrence = (): RecurrenceSettings =>
		editingExpense?.recurrence ?? {
			frequency: "monthly",
			interval: 1,
			occurrences: 12,
		};

	// ── State ────────────────────────────────────────────────────────────────

	const [formData, setFormData] = useState<ExpenseFormData>(getInitialFormData);
	const [amountType, setAmountType] = useState<AmountType>(getInitialAmountType);
	const [exactString, setExactString] = useState(getInitialExact);
	const [rangeMinString, setRangeMinString] = useState(getInitialRangeMin);
	const [rangeMaxString, setRangeMaxString] = useState(getInitialRangeMax);
	const [estimateString, setEstimateString] = useState(getInitialEstimate);
	const [hasDueDate, setHasDueDate] = useState(getInitialHasDueDate);
	const [tempDueDate, setTempDueDate] = useState<Date>(getInitialDueDate);
	const [recurrenceSettings, setRecurrenceSettings] =
		useState<RecurrenceSettings>(getInitialRecurrence);

	const [showRegenerationWarning, setShowRegenerationWarning] = useState(false);
	const [pendingFormData, setPendingFormData] = useState<ExpenseFormData | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Key to force remount of Select components when editing expense changes
	const [selectKey, setSelectKey] = useState(0);

	const initialisedForId = useRef<string | undefined>(editingExpense?.id);
	const isEditingInstance = !!editingExpense?.parentExpenseId;

	// ── Re-initialise if editingExpense identity changes ─────────────────────

	useEffect(() => {
		const incomingId = editingExpense?.id;
		if (incomingId === initialisedForId.current) return;
		initialisedForId.current = incomingId;

		if (!editingExpense) return;

		const ad = editingExpense.amountData;
		const type: AmountType = ad?.type ?? "exact";
		setAmountType(type);

		// Set all amount strings based on type, carrying the base amount to other fields
		const baseAmount = editingExpense.amount;
		setExactString(
			type === "exact" ? (ad?.exact ?? baseAmount).toString() : baseAmount.toString(),
		);
		setRangeMinString(
			ad?.type === "range" ? (ad.rangeMin ?? 0).toString() : baseAmount.toString(),
		);
		setRangeMaxString(
			ad?.type === "range" ? (ad.rangeMax ?? 0).toString() : (baseAmount + 1).toString(),
		);
		setEstimateString(
			ad?.type === "estimate" ?
				(ad.estimate ?? baseAmount).toString()
			:	baseAmount.toString(),
		);

		const dueDate = editingExpense.dueDate ? new Date(editingExpense.dueDate) : null;
		setHasDueDate(dueDate !== null);
		setTempDueDate(dueDate ?? new Date());

		if (editingExpense.recurrence) {
			setRecurrenceSettings(editingExpense.recurrence);
		}

		setFormData({
			name: editingExpense.name,
			amount: editingExpense.amount,
			amountData: ad ?? { type: "exact", exact: editingExpense.amount },
			category: editingExpense.category,
			paymentMethod: editingExpense.paymentMethod || "None",
			dueDate,
			isRecurring: editingExpense.isRecurring,
			recurrence: editingExpense.recurrence,
			isPaid: editingExpense.isPaid,
			paymentDate: editingExpense.paymentDate ? new Date(editingExpense.paymentDate) : null,
			type: editingExpense.type || "need",
			importance: editingExpense.importance || "none",
			notify: editingExpense.notify || false,
		});

		// Force Radix Select components to remount with correct values
		setSelectKey((prev) => prev + 1);
	}, [editingExpense]);

	// Set category for new expenses once categories load
	useEffect(() => {
		if (!editingExpense && categories.length > 0 && !formData.category) {
			setFormData((prev) => ({ ...prev, category: categories[0] }));
			setSelectKey((prev) => prev + 1);
		}
	}, [categories, editingExpense, formData.category]);

	// Sync recurrence into formData
	useEffect(() => {
		if (formData.isRecurring) {
			setFormData((prev) => ({ ...prev, recurrence: recurrenceSettings }));
			setHasDueDate(true);
			if (!editingExpense && !formData.dueDate) {
				const today = new Date();
				setTempDueDate(today);
				setFormData((prev) => ({ ...prev, dueDate: today }));
			}
		} else {
			setFormData((prev) => ({ ...prev, recurrence: undefined }));
		}
	}, [formData.isRecurring, recurrenceSettings, editingExpense, formData.dueDate]);

	// ── When switching amount type, carry current value to new fields ─────────

	const handleAmountTypeChange = (newType: AmountType) => {
		const oldType = amountType;
		if (newType === oldType) return;

		// Get the current numeric value from whichever field is active
		let currentValue = 0;
		switch (oldType) {
			case "exact":
				currentValue = parseFloat(exactString) || 0;
				break;
			case "range":
				currentValue = parseFloat(rangeMinString) || 0;
				break;
			case "estimate":
				currentValue = parseFloat(estimateString) || 0;
				break;
		}

		setAmountType(newType);

		switch (newType) {
			case "exact":
				setExactString(currentValue.toString());
				break;
			case "range":
				setRangeMinString(currentValue.toString());
				setRangeMaxString((currentValue + 1).toString());
				break;
			case "estimate":
				setEstimateString(currentValue.toString());
				break;
		}
	};

	// ── Amount helpers ───────────────────────────────────────────────────────

	const buildAmountRange = (): AmountRange => {
		switch (amountType) {
			case "exact":
				return { type: "exact", exact: parseFloat(exactString) || 0 };
			case "range":
				return {
					type: "range",
					rangeMin: parseFloat(rangeMinString) || 0,
					rangeMax: parseFloat(rangeMaxString) || 0,
				};
			case "estimate":
				return { type: "estimate", estimate: parseFloat(estimateString) || 0 };
		}
	};

	const validateAmounts = (): string | null => {
		switch (amountType) {
			case "exact": {
				const v = parseFloat(exactString);
				if (Number.isNaN(v) || v <= 0) return "Please enter a valid exact amount.";
				break;
			}
			case "range": {
				const min = parseFloat(rangeMinString);
				const max = parseFloat(rangeMaxString);
				if (Number.isNaN(min) || min <= 0) return "Please enter a valid minimum amount.";
				if (Number.isNaN(max) || max <= 0) return "Please enter a valid maximum amount.";
				if (min > max) return "Minimum amount cannot exceed maximum amount.";
				break;
			}
			case "estimate": {
				const v = parseFloat(estimateString);
				if (Number.isNaN(v) || v <= 0) return "Please enter a valid estimate amount.";
				break;
			}
		}
		return null;
	};

	// ── Event handlers ───────────────────────────────────────────────────────

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const selectedDate = new Date(`${dateValue}T12:00:00`);
			setTempDueDate(selectedDate);
			if (hasDueDate) {
				setFormData((prev) => ({ ...prev, dueDate: selectedDate }));
			}
		}
	};

	const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const selectedDate = new Date(`${dateValue}T12:00:00`);
			setFormData((prev) => ({ ...prev, paymentDate: selectedDate }));
		}
	};

	const handleDueDateToggle = (checked: boolean) => {
		setHasDueDate(checked);
		setFormData((prev) => ({
			...prev,
			dueDate: checked ? tempDueDate : null,
		}));
	};

	const willRegenerateOccurrences = (newData: ExpenseFormData): boolean => {
		if (!editingExpense?.isRecurring || editingExpense.parentExpenseId) return false;
		return (
			!!(
				newData.dueDate &&
				editingExpense.dueDate &&
				!isSameDay(newData.dueDate, editingExpense.dueDate)
			) ||
			(newData.recurrence?.occurrences !== undefined &&
				newData.recurrence.occurrences !== editingExpense.recurrence?.occurrences) ||
			(newData.recurrence?.frequency !== undefined &&
				newData.recurrence.frequency !== editingExpense.recurrence?.frequency) ||
			(newData.recurrence?.interval !== undefined &&
				newData.recurrence.interval !== editingExpense.recurrence?.interval)
		);
	};

	const getModifiedOccurrencesCount = (): number => {
		if (!editingExpense?.id) return 0;
		return expenses.filter((e) => e.parentExpenseId === editingExpense.id && e.isModified)
			.length;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		const amountError = validateAmounts();
		if (amountError) {
			alert(amountError);
			return;
		}

		if (formData.isRecurring && !formData.dueDate) {
			alert("Recurring expenses must have a due date");
			return;
		}

		const amountRange = buildAmountRange();
		const numericAmount = deriveNumericAmount(amountRange);

		const finalRecurrence =
			formData.isRecurring ?
				{
					...recurrenceSettings,
					occurrences:
						recurrenceSettings.occurrences && recurrenceSettings.occurrences > 0 ?
							recurrenceSettings.occurrences
						:	12,
				}
			:	undefined;

		const finalFormData: ExpenseFormData = {
			...formData,
			amount: numericAmount,
			amountData: amountRange,
			dueDate: hasDueDate ? (formData.dueDate ?? tempDueDate) : null,
			paymentDate: formData.isPaid ? formData.paymentDate || new Date() : null,
			isPaid: formData.isPaid,
			isRecurring: formData.isRecurring,
			recurrence: finalRecurrence,
		};

		if (willRegenerateOccurrences(finalFormData)) {
			setPendingFormData(finalFormData);
			setShowRegenerationWarning(true);
			return;
		}

		void processSubmit(finalFormData);
	};

	const processSubmit = async (finalFormData: ExpenseFormData) => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			await submitExpenseForm({
				formData: finalFormData,
				expenseId: editingExpense?.id,
				isGlobalEdit,
				isInstanceEdit: isEditingInstance,
			});

			await new Promise((resolve) => setTimeout(resolve, 150));
			await closeWindow();
		} catch (err) {
			console.error("Failed to submit expense form:", err);
			setIsSubmitting(false);
		}
	};

	const closeWindow = async () => {
		try {
			await invoke("close_expense_form_window");
		} catch (err) {
			console.error("close_expense_form_window failed:", err);
			try {
				window.close();
			} catch {
				// nothing
			}
		}
	};

	const handleCancel = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			await cancelExpenseForm();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await closeWindow();
		} catch (err) {
			console.error("Failed to cancel:", err);
			setIsSubmitting(false);
		}
	};

	const handleConfirmRegeneration = () => {
		if (pendingFormData) void processSubmit(pendingFormData);
		setShowRegenerationWarning(false);
		setPendingFormData(null);
	};

	const handleCancelRegeneration = () => {
		setShowRegenerationWarning(false);
		setPendingFormData(null);
	};

	const paymentMethodOptions = ["None", ...paymentMethods.filter((m) => m !== "None")];

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<>
			<div className="h-screen bg-background overflow-hidden">
				<div className="h-full overflow-y-auto p-4">
					<h2 className="text-lg font-bold text-foreground mb-4">
						{editingExpense ?
							isEditingInstance ?
								"Edit This Occurrence"
							:	"Edit Expense"
						:	"Add New Expense"}
					</h2>

					<form onSubmit={handleSubmit} className="space-y-4 pb-4">
						{/* Name */}
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
											setFormData((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										className="w-full px-4 py-2 pl-10 border border-border rounded-lg
											focus:ring-2 focus:ring-primary focus:border-transparent
											transition-all duration-200 placeholder:text-muted-foreground
											bg-background text-foreground"
										placeholder="Enter expense name"
									/>
									<Tag
										className="absolute left-3 top-2.5 text-muted-foreground"
										size={18}
									/>
								</div>
							</div>
						)}

						{/* Type & Importance */}
						{!isEditingInstance && (
							<div className="flex gap-4">
								<div className="flex-1">
									<label className="block text-sm font-medium text-foreground mb-2">
										Expense Type
									</label>
									<fieldset className="flex gap-2 bg-muted rounded-lg p-1">
										<button
											type="button"
											onClick={() =>
												setFormData((prev) => ({ ...prev, type: "need" }))
											}
											className={`flex-1 px-3 py-1 rounded-md font-medium transition-all duration-200 text-sm ${
												formData.type === "need" ?
													"bg-card text-purple-600 shadow-sm"
												:	"text-muted-foreground hover:text-foreground"
											}`}
										>
											Need
										</button>
										<button
											type="button"
											onClick={() =>
												setFormData((prev) => ({ ...prev, type: "want" }))
											}
											className={`flex-1 px-3 py-1 rounded-md font-medium transition-all duration-200 text-sm ${
												formData.type === "want" ?
													"bg-card text-foreground shadow-sm"
												:	"text-muted-foreground hover:text-foreground"
											}`}
										>
											Want
										</button>
									</fieldset>
								</div>
								<div className="flex-1">
									<label
										htmlFor="expense-importance"
										className="block text-sm font-medium text-foreground mb-2"
									>
										Importance
									</label>
									<Select
										key={`importance-${selectKey}`}
										value={formData.importance}
										onValueChange={(value) =>
											setFormData((prev) => ({
												...prev,
												importance: value as ImportanceLevel,
											}))
										}
									>
										<SelectTrigger id="expense-importance" className="w-full">
											<SelectValue placeholder="Select importance" />
										</SelectTrigger>
										<SelectContent
											position="popper"
											side="bottom"
											avoidCollisions={false}
										>
											<SelectGroup>
												<SelectItem value="none">None</SelectItem>
												<SelectItem value="medium">Medium (!)</SelectItem>
												<SelectItem value="high">High (!!)</SelectItem>
												<SelectItem value="critical">
													Critical (!!!)
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						{/* Amount */}
						<div className="space-y-3">
							<label className="block text-sm font-medium text-foreground">
								Amount
							</label>

							<fieldset className="flex gap-1 bg-muted rounded-lg p-1">
								{(["exact", "range", "estimate"] as AmountType[]).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => handleAmountTypeChange(t)}
										className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
											amountType === t ?
												"bg-card text-primary shadow-sm"
											:	"text-muted-foreground hover:text-foreground"
										}`}
									>
										{t}
									</button>
								))}
							</fieldset>

							{amountType === "exact" && (
								<div className="relative">
									<input
										type="number"
										required
										min="0.01"
										step="0.01"
										value={exactString}
										onChange={(e) => setExactString(e.target.value)}
										className="w-full px-4 py-2 pl-8 border border-border rounded-lg
											focus:ring-2 focus:ring-primary focus:border-transparent
											transition-all duration-200 bg-background text-foreground"
										placeholder="0.00"
									/>
									<DollarSign
										className="absolute left-2 top-2.5 text-muted-foreground"
										size={16}
									/>
								</div>
							)}

							{amountType === "range" && (
								<div className="flex items-center gap-2">
									<div className="relative flex-1">
										<input
											type="number"
											required
											min="0.01"
											step="0.01"
											value={rangeMinString}
											onChange={(e) => setRangeMinString(e.target.value)}
											className="w-full px-4 py-2 pl-8 border border-border rounded-lg
												focus:ring-2 focus:ring-primary focus:border-transparent
												transition-all duration-200 bg-background text-foreground"
											placeholder="Min"
										/>
										<DollarSign
											className="absolute left-2 top-2.5 text-muted-foreground"
											size={16}
										/>
									</div>
									<span className="text-muted-foreground font-medium shrink-0">
										–
									</span>
									<div className="relative flex-1">
										<input
											type="number"
											required
											min="0.01"
											step="0.01"
											value={rangeMaxString}
											onChange={(e) => setRangeMaxString(e.target.value)}
											className="w-full px-4 py-2 pl-8 border border-border rounded-lg
												focus:ring-2 focus:ring-primary focus:border-transparent
												transition-all duration-200 bg-background text-foreground"
											placeholder="Max"
										/>
										<DollarSign
											className="absolute left-2 top-2.5 text-muted-foreground"
											size={16}
										/>
									</div>
								</div>
							)}

							{amountType === "estimate" && (
								<div className="relative">
									<span className="absolute left-3 top-2 text-muted-foreground text-sm font-medium leading-6">
										~
									</span>
									<input
										type="number"
										required
										min="0.01"
										step="0.01"
										value={estimateString}
										onChange={(e) => setEstimateString(e.target.value)}
										className="w-full px-4 py-2 pl-8 border border-border rounded-lg
											focus:ring-2 focus:ring-primary focus:border-transparent
											transition-all duration-200 bg-background text-foreground"
										placeholder="0.00"
									/>
								</div>
							)}
						</div>

						{/* Category */}
						{!isEditingInstance && (
							<div>
								<label
									htmlFor="expense-category"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Category
								</label>
								<Select
									key={`category-${selectKey}`}
									value={formData.category}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, category: value }))
									}
								>
									<SelectTrigger id="expense-category" className="w-full">
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent
										position="popper"
										side="bottom"
										avoidCollisions={false}
									>
										<SelectGroup>
											{categories.map((category) => (
												<SelectItem key={category} value={category}>
													<div className="flex items-center gap-2">
														<span
															className="w-3 h-3 rounded-full shrink-0"
															style={{
																backgroundColor:
																	categoryColors[category] ||
																	"#6b7280",
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

						{/* Payment Method */}
						<div>
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
								key={`payment-${selectKey}`}
								value={formData.paymentMethod}
								onValueChange={(value) =>
									setFormData((prev) => ({ ...prev, paymentMethod: value }))
								}
							>
								<SelectTrigger id="payment-method" className="w-full">
									<SelectValue placeholder="Select payment method" />
								</SelectTrigger>
								<SelectContent
									position="popper"
									side="bottom"
									avoidCollisions={false}
								>
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

						{/* Recurrence */}
						{!isEditingInstance && (
							<div className="bg-primary/10 p-4 rounded-lg">
								<label className="flex items-center gap-3 cursor-pointer mb-3">
									<input
										type="checkbox"
										checked={formData.isRecurring}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												isRecurring: e.target.checked,
												recurrence:
													e.target.checked ?
														recurrenceSettings
													:	undefined,
											}))
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
											key={`frequency-${selectKey}`}
											value={recurrenceSettings.frequency}
											onValueChange={(value) =>
												setRecurrenceSettings((prev) => ({
													...prev,
													frequency: value as RecurrenceFrequency,
												}))
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select frequency" />
											</SelectTrigger>
											<SelectContent
												position="popper"
												side="bottom"
												avoidCollisions={false}
											>
												<SelectGroup>
													<SelectLabel>Frequency</SelectLabel>
													<SelectItem value="daily">Daily</SelectItem>
													<SelectItem value="weekly">Weekly</SelectItem>
													<SelectItem value="biweekly">
														Biweekly
													</SelectItem>
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
														setRecurrenceSettings((prev) => ({
															...prev,
															interval:
																parseInt(e.target.value, 10) || 1,
														}))
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
												value={recurrenceSettings.occurrences ?? 12}
												onChange={(e) =>
													setRecurrenceSettings((prev) => ({
														...prev,
														occurrences:
															parseInt(e.target.value, 10) || 1,
													}))
												}
												className="w-full px-3 py-1.5 text-sm border border-border rounded
													focus:ring-2 focus:ring-primary focus:border-transparent
													bg-background text-foreground"
											/>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Due Date Toggle */}
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

						{/* Due Date Input */}
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

						{/* Notification */}
						{(hasDueDate || formData.isRecurring) && (
							<div className="bg-blue-500/10 p-4 rounded-lg">
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={formData.notify}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												notify: e.target.checked,
											}))
										}
										className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-400"
									/>
									<span className="text-sm font-medium text-foreground flex items-center gap-2">
										<Bell size={16} />
										Notify Before Due Date
									</span>
								</label>
								<p className="text-xs text-muted-foreground mt-2 ml-8">
									Receive a desktop notification when this expense is due soon
								</p>
							</div>
						)}

						{/* Payment Status */}
						<div className="bg-green-500/10 p-4 rounded-lg space-y-3">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={formData.isPaid}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											isPaid: e.target.checked,
										}))
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
											formData.paymentDate ?
												format(formData.paymentDate, "yyyy-MM-dd")
											:	format(new Date(), "yyyy-MM-dd")
										}
										onChange={handlePaymentDateChange}
										className="w-full px-3 py-1.5 text-sm border border-border rounded
											focus:ring-2 focus:ring-green-400 focus:border-transparent
											bg-background text-foreground"
									/>
								</div>
							)}
						</div>

						{/* Actions */}
						<div className="flex gap-3 pt-4 pb-2">
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg
									hover:bg-primary/90 transition-colors duration-200
									flex items-center justify-center gap-2 font-medium
									hover:scale-105 active:scale-95 transform
									disabled:opacity-50 disabled:pointer-events-none"
							>
								<Save size={18} />
								{isSubmitting ?
									"Saving…"
								: editingExpense ?
									"Update Expense"
								:	"Add Expense"}
							</button>
							<button
								type="button"
								disabled={isSubmitting}
								onClick={() => void handleCancel()}
								className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg
									hover:bg-secondary/80 transition-colors duration-200 font-medium
									hover:scale-105 active:scale-95 transform
									disabled:opacity-50 disabled:pointer-events-none"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			</div>

			<ConfirmRegenerationModal
				isOpen={showRegenerationWarning}
				modifiedCount={getModifiedOccurrencesCount()}
				onConfirm={handleConfirmRegeneration}
				onCancel={handleCancelRegeneration}
			/>
		</>
	);
};
