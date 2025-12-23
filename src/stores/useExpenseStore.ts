import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import { useHistoryStore, HistoryAction } from "./useHistoryStore";
import { Expense, ExpenseFormData, OverviewMode } from "@/types/expense";
import {
	generateRecurringExpenses,
	DEFAULT_EXPENSE_CATEGORIES,
	DEFAULT_CATEGORY_COLORS,
} from "@/lib/expenseHelpers";
import { DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { AppToSave } from "@/types";
import { format, isSameDay, isSameMonth } from "date-fns";

type TimeUnit = "days" | "weeks" | "months" | "years";

interface ExpenseStore {
	// State
	expenses: Expense[];
	selectedMonth: Date | null;
	overviewMode: OverviewMode;
	categories: string[];
	categoryColors: Record<string, string>;
	paymentMethods: string[];

	// Shared UI State
	editingExpense: Expense | null;
	deleteModal: { isOpen: boolean; id: string; name: string };
	showPaidExpenses: boolean;
	upcomingTimeAmount: number;
	upcomingTimeUnit: TimeUnit;
	showMonthlyRelativeDates: boolean;
	showUpcomingRelativeDates: boolean;

	// Set state (with optional skipSave for loading)
	setExpenses: (expenses: Expense[]) => void;
	setSelectedMonth: (date: Date, skipSave?: boolean) => void;
	setOverviewMode: (mode: OverviewMode, skipSave?: boolean) => void;
	setCategories: (categories: string[], skipSave?: boolean) => void;
	setCategoryColors: (categoryColors: Record<string, string>, skipSave?: boolean) => void;
	setPaymentMethods: (paymentMethods: string[], skipSave?: boolean) => void;

	// Bulk setter for loading (never triggers save)
	setExpenseData: (data: {
		expenses: Expense[];
		selectedMonth: Date;
		overviewMode: OverviewMode;
		categories: string[];
		categoryColors: Record<string, string>;
		paymentMethods: string[];
	}) => void;

	// Shared UI State setters
	setEditingExpense: (expense: Expense | null) => void;
	setDeleteModal: (modal: { isOpen: boolean; id: string; name: string }) => void;
	setShowPaidExpenses: (show: boolean) => void;
	setUpcomingTimeAmount: (amount: number) => void;
	setUpcomingTimeUnit: (unit: TimeUnit) => void;
	setShowMonthlyRelativeDates: (show: boolean) => void;
	setShowUpcomingRelativeDates: (show: boolean) => void;

	// Actions
	addExpense: (expense: ExpenseFormData) => void;
	updateExpense: (id: string, expense: Partial<ExpenseFormData>, isGlobalEdit?: boolean) => void;
	updateExpenseGlobally: (id: string, expense: Partial<ExpenseFormData>) => void;
	deleteExpense: (id: string) => void;
	archiveExpense: (id: string) => void;
	unarchiveExpense: (id: string) => void;
	duplicateExpense: (id: string) => void;
	toggleExpensePaid: (id: string, paymentDate?: Date) => void;
	getMonthlyExpenses: (date: Date) => Expense[];
	getTotalByCategory: (date: Date, mode: OverviewMode) => Record<string, number>;
	getMonthlyTotal: (date: Date, mode: OverviewMode) => number;
	getTotalByCategoryFiltered: (
		date: Date,
		mode: OverviewMode,
		showPaid: boolean
	) => Record<string, number>;
	getMonthlyTotalFiltered: (date: Date, mode: OverviewMode, showPaid: boolean) => number;
	resetOccurrence: (id: string) => void;
	addCategory: (name: string, color: string) => void;
	updateCategory: (oldName: string, newName: string, newColor: string) => void;
	deleteCategory: (name: string) => void;
	addPaymentMethod: (name: string) => void;
	updatePaymentMethod: (oldName: string, newName: string) => void;
	deletePaymentMethod: (name: string) => void;

	// Undo/Redo
	undo: () => void;
	redo: () => void;
}

const getMonthKey = (date: Date): string => {
	return format(date, "yyyy-MM");
};

export const useExpenseStore = create<ExpenseStore>()(
	subscribeWithSelector((set, get) => ({
		expenses: [],
		selectedMonth: new Date(),
		overviewMode: "remaining",
		categories: DEFAULT_EXPENSE_CATEGORIES,
		categoryColors: DEFAULT_CATEGORY_COLORS,
		paymentMethods: DEFAULT_PAYMENT_METHODS,

		// Shared UI State defaults
		editingExpense: null,
		deleteModal: { isOpen: false, id: "", name: "" },
		showPaidExpenses: true,
		upcomingTimeAmount: 3,
		upcomingTimeUnit: "weeks",
		showMonthlyRelativeDates: true,
		showUpcomingRelativeDates: true,

		setExpenses: (expenses) => set({ expenses }),

		setSelectedMonth: (date, skipSave = false) => {
			set({ selectedMonth: date });

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setOverviewMode: (mode, skipSave = false) => {
			set({ overviewMode: mode });

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setCategories: (categories, skipSave = false) => {
			set({ categories });

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setCategoryColors: (categoryColors, skipSave = false) => {
			set({ categoryColors });

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setPaymentMethods: (paymentMethods, skipSave = false) => {
			set({ paymentMethods });

			if (!skipSave && useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		// Bulk setter that never triggers save - used during loading
		setExpenseData: (data) => {
			set({
				expenses: data.expenses,
				selectedMonth: data.selectedMonth,
				overviewMode: data.overviewMode,
				categories: data.categories,
				categoryColors: data.categoryColors,
				paymentMethods: data.paymentMethods,
			});
		},

		// Shared UI State setters
		setEditingExpense: (expense) => set({ editingExpense: expense }),
		setDeleteModal: (modal) => set({ deleteModal: modal }),
		setShowPaidExpenses: (show) => set({ showPaidExpenses: show }),
		setUpcomingTimeAmount: (amount) => set({ upcomingTimeAmount: amount }),
		setUpcomingTimeUnit: (unit) => set({ upcomingTimeUnit: unit }),
		setShowMonthlyRelativeDates: (show) => set({ showMonthlyRelativeDates: show }),
		setShowUpcomingRelativeDates: (show) => set({ showUpcomingRelativeDates: show }),

		addExpense: (expenseData) => {
			const parentId = crypto.randomUUID();

			const parentExpense: Expense = {
				...expenseData,
				id: parentId,
				paymentMethod: expenseData.paymentMethod || "None",
				isArchived: false,
				isPaid: false,
				paymentDate: null,
				type: expenseData.type,
				importance: expenseData.importance,
				createdAt: new Date(),
				updatedAt: new Date(),
				monthlyOverrides: {},
			};

			const newExpenses: Expense[] = [];

			if (expenseData.isRecurring && expenseData.recurrence && expenseData.dueDate) {
				const allOccurrences = generateRecurringExpenses(parentExpense, true);
				newExpenses.push(parentExpense, ...allOccurrences);
			} else {
				newExpenses.push(parentExpense);
			}

			set((state) => ({
				expenses: [...state.expenses, ...newExpenses],
			}));

			useHistoryStore.getState().pushAction({
				type: "CREATE_EXPENSE",
				data: {
					id: parentId,
					after: parentExpense,
					relatedExpenses: newExpenses.length > 1 ? newExpenses.slice(1) : undefined,
				},
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		resetOccurrence: (id) => {
			set((state) => ({
				expenses: state.expenses.map((expense) => {
					if (expense.id === id && expense.initialState) {
						return {
							...expense,
							amount: expense.initialState.amount,
							dueDate: expense.initialState.dueDate,
							paymentMethod: expense.initialState.paymentMethod || "None",
							isModified: false,
							updatedAt: new Date(),
						};
					}
					return expense;
				}),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		updateExpense: (id, expenseData, isGlobalEdit = false) => {
			const { expenses } = get();
			const existingExpense = expenses.find((e) => e.id === id);

			if (!existingExpense) return;

			const beforeExpense = { ...existingExpense };

			// Handle instance-specific edits
			if (existingExpense.parentExpenseId && !isGlobalEdit) {
				const updatedExpenses = expenses.map((expense) => {
					if (expense.id === id) {
						const newAmount =
							expenseData.amount !== undefined ? expenseData.amount : expense.amount;
						const newDueDate =
							expenseData.dueDate !== undefined
								? expenseData.dueDate
								: expense.dueDate;
						const newPaymentMethod =
							expenseData.paymentMethod !== undefined
								? expenseData.paymentMethod
								: expense.paymentMethod;

						const initialPaymentMethod = expense.initialState?.paymentMethod ?? "None";

						const isModified = expense.initialState
							? newAmount !== expense.initialState.amount ||
							  newDueDate?.getTime() !== expense.initialState.dueDate?.getTime() ||
							  newPaymentMethod !== initialPaymentMethod
							: expense.isModified || false;

						return {
							...expense,
							amount: newAmount,
							dueDate: newDueDate,
							paymentMethod: newPaymentMethod,
							isPaid:
								expenseData.isPaid !== undefined
									? expenseData.isPaid
									: expense.isPaid,
							paymentDate:
								expenseData.paymentDate !== undefined
									? expenseData.paymentDate
									: expense.paymentDate,
							isModified,
							updatedAt: new Date(),
						};
					}
					return expense;
				});

				set({ expenses: updatedExpenses });

				const afterExpense = updatedExpenses.find((e) => e.id === id);
				useHistoryStore.getState().pushAction({
					type: "UPDATE_EXPENSE",
					data: { id, before: beforeExpense, after: afterExpense },
				});

				if (useAppStore.getState().autoSaveEnabled) {
					useAppStore.getState().saveToFile(AppToSave.Expenses);
				}
				return;
			}

			// Handle parent recurring expense edits
			if (existingExpense.isRecurring && !existingExpense.parentExpenseId && isGlobalEdit) {
				const needsRegeneration =
					(expenseData.dueDate !== undefined &&
						expenseData.dueDate !== null &&
						(!existingExpense.dueDate ||
							!isSameDay(expenseData.dueDate, existingExpense.dueDate))) ||
					(expenseData.recurrence?.occurrences !== undefined &&
						expenseData.recurrence.occurrences !==
							existingExpense.recurrence?.occurrences) ||
					(expenseData.recurrence?.frequency !== undefined &&
						expenseData.recurrence.frequency !==
							existingExpense.recurrence?.frequency) ||
					(expenseData.recurrence?.interval !== undefined &&
						expenseData.recurrence.interval !== existingExpense.recurrence?.interval);

				if (needsRegeneration) {
					const updatedParent: Expense = {
						...existingExpense,
						...expenseData,
						updatedAt: new Date(),
					};

					const existingOccurrences = expenses.filter((e) => e.parentExpenseId === id);
					const modificationMap = new Map(
						existingOccurrences
							.filter((e) => e.isModified || e.isPaid)
							.map((e) => [e.dueDate?.getTime(), e])
					);

					const newOccurrences = generateRecurringExpenses(updatedParent, true);

					const mergedOccurrences = newOccurrences.map((newOcc) => {
						const dateKey = newOcc.dueDate?.getTime();
						const existingMod = dateKey ? modificationMap.get(dateKey) : null;

						if (existingMod) {
							return {
								...newOcc,
								amount: existingMod.amount,
								paymentMethod: existingMod.paymentMethod,
								isPaid: existingMod.isPaid,
								paymentDate: existingMod.paymentDate,
								isModified: existingMod.isModified,
								initialState: existingMod.initialState,
							};
						}
						return newOcc;
					});

					const updatedExpenses = expenses
						.filter((e) => e.id !== id && e.parentExpenseId !== id)
						.concat([updatedParent, ...mergedOccurrences]);

					set({ expenses: updatedExpenses });

					useHistoryStore.getState().pushAction({
						type: "UPDATE_EXPENSE",
						data: {
							id,
							before: beforeExpense,
							after: updatedParent,
							relatedExpenses: [...existingOccurrences],
						},
					});

					if (useAppStore.getState().autoSaveEnabled) {
						useAppStore.getState().saveToFile(AppToSave.Expenses);
					}
					return;
				}

				const relatedOccurrences = expenses.filter((e) => e.parentExpenseId === id);

				const updatedExpenses = expenses.map((expense) => {
					if (expense.id === id) {
						return {
							...expense,
							...expenseData,
							updatedAt: new Date(),
						};
					}

					// Update unmodified AND unpaid instances
					if (expense.parentExpenseId === id && !expense.isModified && !expense.isPaid) {
						return {
							...expense,
							name: expenseData.name !== undefined ? expenseData.name : expense.name,
							category:
								expenseData.category !== undefined
									? expenseData.category
									: expense.category,
							paymentMethod:
								expenseData.paymentMethod !== undefined
									? expenseData.paymentMethod
									: expense.paymentMethod,
							type: expenseData.type !== undefined ? expenseData.type : expense.type,
							importance:
								expenseData.importance !== undefined
									? expenseData.importance
									: expense.importance,
							amount:
								expenseData.amount !== undefined
									? expenseData.amount
									: expense.amount,
							isRecurring:
								expenseData.isRecurring !== undefined
									? expenseData.isRecurring
									: expense.isRecurring,
							recurrence:
								expenseData.recurrence !== undefined
									? expenseData.recurrence
									: expense.recurrence,
							initialState: expense.initialState
								? {
										...expense.initialState,
										amount:
											expenseData.amount !== undefined
												? expenseData.amount
												: expense.initialState.amount,
										paymentMethod:
											expenseData.paymentMethod !== undefined
												? expenseData.paymentMethod
												: expense.initialState.paymentMethod ?? "None",
								  }
								: undefined,
							updatedAt: new Date(),
						};
					}

					// Modified or paid - only update non-instance-specific fields
					if (expense.parentExpenseId === id && (expense.isModified || expense.isPaid)) {
						return {
							...expense,
							name: expenseData.name !== undefined ? expenseData.name : expense.name,
							category:
								expenseData.category !== undefined
									? expenseData.category
									: expense.category,
							type: expenseData.type !== undefined ? expenseData.type : expense.type,
							importance:
								expenseData.importance !== undefined
									? expenseData.importance
									: expense.importance,
							isRecurring:
								expenseData.isRecurring !== undefined
									? expenseData.isRecurring
									: expense.isRecurring,
							recurrence:
								expenseData.recurrence !== undefined
									? expenseData.recurrence
									: expense.recurrence,
							updatedAt: new Date(),
						};
					}

					return expense;
				});

				set({ expenses: updatedExpenses });

				const afterExpense = updatedExpenses.find((e) => e.id === id);
				useHistoryStore.getState().pushAction({
					type: "UPDATE_EXPENSE",
					data: {
						id,
						before: beforeExpense,
						after: afterExpense,
						relatedExpenses: relatedOccurrences,
					},
				});

				if (useAppStore.getState().autoSaveEnabled) {
					useAppStore.getState().saveToFile(AppToSave.Expenses);
				}
				return;
			}

			// Handle non-recurring expense updates
			const updatedExpenses = expenses.map((expense) =>
				expense.id === id
					? {
							...expense,
							...expenseData,
							paymentDate: expenseData.isPaid
								? expenseData.paymentDate || expense.paymentDate || new Date()
								: expense.isPaid
								? expense.paymentDate
								: null,
							updatedAt: new Date(),
					  }
					: expense
			);

			set({ expenses: updatedExpenses });

			const afterExpense = updatedExpenses.find((e) => e.id === id);
			useHistoryStore.getState().pushAction({
				type: "UPDATE_EXPENSE",
				data: { id, before: beforeExpense, after: afterExpense },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		updateExpenseGlobally: (id, expenseData) => {
			get().updateExpense(id, expenseData, true);

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		deleteExpense: (id) => {
			const { expenses } = get();
			const expense = expenses.find((e) => e.id === id);

			if (!expense) return;

			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.filter((e) => e.id !== id && e.parentExpenseId !== id),
				});

				useHistoryStore.getState().pushAction({
					type: "DELETE_EXPENSE",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				set({
					expenses: expenses.filter((e) => e.id !== id),
				});

				useHistoryStore.getState().pushAction({
					type: "DELETE_EXPENSE",
					data: { id, before: expense },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		archiveExpense: (id) => {
			const { expenses } = get();
			const expense = expenses.find((e) => e.id === id);

			if (!expense) return;

			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.map((e) =>
						e.id === id || e.parentExpenseId === id
							? { ...e, isArchived: true, updatedAt: new Date() }
							: e
					),
				});

				useHistoryStore.getState().pushAction({
					type: "ARCHIVE_EXPENSE",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				set({
					expenses: expenses.map((e) =>
						e.id === id ? { ...e, isArchived: true, updatedAt: new Date() } : e
					),
				});

				useHistoryStore.getState().pushAction({
					type: "ARCHIVE_EXPENSE",
					data: { id, before: expense },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		unarchiveExpense: (id) => {
			const { expenses } = get();
			const expense = expenses.find((e) => e.id === id);

			if (!expense) return;

			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.map((e) =>
						e.id === id || e.parentExpenseId === id
							? { ...e, isArchived: false, updatedAt: new Date() }
							: e
					),
				});

				useHistoryStore.getState().pushAction({
					type: "UNARCHIVE_EXPENSE",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				set({
					expenses: expenses.map((e) =>
						e.id === id ? { ...e, isArchived: false, updatedAt: new Date() } : e
					),
				});

				useHistoryStore.getState().pushAction({
					type: "UNARCHIVE_EXPENSE",
					data: { id, before: expense },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		duplicateExpense: (id) => {
			const { expenses } = get();
			const expense = expenses.find((e) => e.id === id);

			if (!expense) return;

			const newExpenses: Expense[] = [];
			const now = new Date();

			if (expense.isRecurring && !expense.parentExpenseId) {
				const newParentId = crypto.randomUUID();

				const duplicatedParent: Expense = {
					...expense,
					id: newParentId,
					isPaid: false,
					paymentDate: null,
					createdAt: now,
					updatedAt: now,
					monthlyOverrides: {},
				};
				newExpenses.push(duplicatedParent);

				const occurrences = expenses.filter((e) => e.parentExpenseId === id);
				occurrences.forEach((occurrence) => {
					const duplicatedOccurrence: Expense = {
						...occurrence,
						id: crypto.randomUUID(),
						parentExpenseId: newParentId,
						isPaid: false,
						paymentDate: null,
						isModified: false,
						createdAt: now,
						updatedAt: now,
						initialState: occurrence.initialState
							? {
									amount: occurrence.initialState.amount,
									dueDate: occurrence.initialState.dueDate,
									paymentMethod: occurrence.initialState.paymentMethod || "None",
							  }
							: undefined,
					};
					newExpenses.push(duplicatedOccurrence);
				});
			} else {
				const duplicatedExpense: Expense = {
					...expense,
					id: crypto.randomUUID(),
					isPaid: false,
					paymentDate: null,
					isModified: false,
					createdAt: now,
					updatedAt: now,
					parentExpenseId: undefined,
					isRecurring: false,
					recurrence: undefined,
					initialState: undefined,
				};
				newExpenses.push(duplicatedExpense);
			}

			set((state) => ({
				expenses: [...state.expenses, ...newExpenses],
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		toggleExpensePaid: (id, paymentDate) => {
			const { expenses } = get();
			const expense = expenses.find((e) => e.id === id);

			if (!expense) return;

			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				const newIsPaid = !expense.isPaid;
				set({
					expenses: expenses.map((e) => {
						if (e.id === id || e.parentExpenseId === id) {
							return {
								...e,
								isPaid: newIsPaid,
								paymentDate: newIsPaid ? paymentDate || new Date() : null,
								updatedAt: new Date(),
							};
						}
						return e;
					}),
				});

				useHistoryStore.getState().pushAction({
					type: "TOGGLE_EXPENSE_PAID",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				set({
					expenses: expenses.map((e) => {
						if (e.id === id) {
							const newIsPaid = !e.isPaid;
							return {
								...e,
								isPaid: newIsPaid,
								paymentDate: newIsPaid ? paymentDate || new Date() : null,
								updatedAt: new Date(),
							};
						}
						return e;
					}),
				});

				useHistoryStore.getState().pushAction({
					type: "TOGGLE_EXPENSE_PAID",
					data: { id, before: expense },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		getMonthlyExpenses: (date) => {
			const { expenses } = get();
			const currentDate = new Date();
			const targetMonth = date.getMonth();
			const targetYear = date.getFullYear();
			const monthKey = getMonthKey(date);

			return expenses.filter((expense) => {
				if (expense.isArchived) return false;
				if (expense.isRecurring && !expense.parentExpenseId) return false;

				if (expense.parentExpenseId) {
					const parentExpense = expenses.find((e) => e.id === expense.parentExpenseId);
					if (parentExpense?.monthlyOverrides?.[monthKey]) {
						Object.assign(expense, parentExpense.monthlyOverrides[monthKey]);
					}
				}

				if (!expense.dueDate) {
					const createdMonth = expense.createdAt.getMonth();
					const createdYear = expense.createdAt.getFullYear();
					const monthsDiff =
						(targetYear - createdYear) * 12 + (targetMonth - createdMonth);

					if (monthsDiff < 0) return false;

					if (expense.isPaid && expense.paymentDate) {
						const paidMonth = expense.paymentDate.getMonth();
						const paidYear = expense.paymentDate.getFullYear();
						const paidMonthsDiff =
							(targetYear - paidYear) * 12 + (targetMonth - paidMonth);
						return paidMonthsDiff <= 0;
					}

					return true;
				}

				if (expense.parentExpenseId) {
					const expenseMonth = expense.dueDate.getMonth();
					const expenseYear = expense.dueDate.getFullYear();
					return expenseMonth === targetMonth && expenseYear === targetYear;
				}

				const dueMonth = expense.dueDate.getMonth();
				const dueYear = expense.dueDate.getFullYear();
				const currentMonth = currentDate.getMonth();
				const currentYear = currentDate.getFullYear();

				const isAfterOrEqualCurrent =
					targetYear > currentYear ||
					(targetYear === currentYear && targetMonth >= currentMonth);

				const isBeforeOrEqualDue =
					targetYear < dueYear || (targetYear === dueYear && targetMonth <= dueMonth);

				return isAfterOrEqualCurrent && isBeforeOrEqualDue;
			});
		},

		getTotalByCategory: (date, mode) => {
			const monthlyExpenses = get().getMonthlyExpenses(date);

			return monthlyExpenses.reduce((acc, expense) => {
				let includeExpense = false;

				switch (mode) {
					case "remaining":
						includeExpense =
							!expense.isPaid && expense.type === "need"
								? isSameMonth(
										expense.dueDate || new Date(),
										get().selectedMonth || new Date()
								  )
								: false;
						break;
					case "required":
						includeExpense = expense.type === "need";
						break;
					case "all":
						includeExpense = true;
						break;
				}

				if (includeExpense) {
					acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
				}

				return acc;
			}, {} as Record<string, number>);
		},

		getMonthlyTotal: (date, mode) => {
			const categoryTotals = get().getTotalByCategory(date, mode);
			return Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
		},

		getTotalByCategoryFiltered: (date, mode, showPaid) => {
			const monthlyExpenses = get().getMonthlyExpenses(date);

			return monthlyExpenses.reduce((acc, expense) => {
				let includeExpense = false;

				switch (mode) {
					case "remaining":
						includeExpense =
							!expense.isPaid &&
							isSameMonth(
								expense.dueDate || new Date(),
								get().selectedMonth || new Date()
							);
						break;
					case "required":
						includeExpense =
							!expense.isPaid && expense.type === "need"
								? isSameMonth(
										expense.dueDate || new Date(),
										get().selectedMonth || new Date()
								  )
								: false;
						break;
					case "all":
						includeExpense = true;
						break;
				}

				if (includeExpense && mode !== "remaining") {
					if (!showPaid && expense.isPaid) {
						includeExpense = false;
					}
				}

				if (includeExpense) {
					acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
				}

				return acc;
			}, {} as Record<string, number>);
		},

		getMonthlyTotalFiltered: (date, mode, showPaid) => {
			const categoryTotals = get().getTotalByCategoryFiltered(date, mode, showPaid);
			return Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
		},

		addCategory: (name, color) => {
			const { categories, categoryColors } = get();
			if (!categories.includes(name)) {
				set({
					categories: [...categories, name].sort((a, b) =>
						a.toLowerCase().localeCompare(b.toLowerCase())
					),
					categoryColors: { ...categoryColors, [name]: color },
				});

				if (useAppStore.getState().autoSaveEnabled) {
					useAppStore.getState().saveToFile(AppToSave.Expenses);
				}
			}
		},

		updateCategory: (oldName, newName, newColor) => {
			const { categories, categoryColors, expenses } = get();

			const updatedCategories = categories
				.map((cat) => (cat === oldName ? newName : cat))
				.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

			const updatedColors = { ...categoryColors };
			if (oldName !== newName) {
				delete updatedColors[oldName];
			}
			updatedColors[newName] = newColor;

			const updatedExpenses = expenses.map((expense) =>
				expense.category === oldName
					? { ...expense, category: newName, updatedAt: new Date() }
					: expense
			);

			set({
				categories: updatedCategories,
				categoryColors: updatedColors,
				expenses: updatedExpenses,
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		deleteCategory: (name) => {
			const { categories, categoryColors, expenses } = get();

			const updatedCategories = categories.filter((cat) => cat !== name);

			const updatedColors = { ...categoryColors };
			delete updatedColors[name];

			const updatedExpenses = expenses.map((expense) =>
				expense.category === name
					? { ...expense, category: "Other", updatedAt: new Date() }
					: expense
			);

			set({
				categories: updatedCategories,
				categoryColors: updatedColors,
				expenses: updatedExpenses,
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		addPaymentMethod: (name) => {
			const { paymentMethods } = get();
			if (!paymentMethods.includes(name)) {
				set({
					paymentMethods: [...paymentMethods, name].sort((a, b) =>
						a.toLowerCase().localeCompare(b.toLowerCase())
					),
				});

				if (useAppStore.getState().autoSaveEnabled) {
					useAppStore.getState().saveToFile(AppToSave.Expenses);
				}
			}
		},

		updatePaymentMethod: (oldName, newName) => {
			const { paymentMethods, expenses } = get();

			const updatedMethods = paymentMethods
				.map((method) => (method === oldName ? newName : method))
				.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

			const updatedExpenses = expenses.map((expense) =>
				expense.paymentMethod === oldName
					? { ...expense, paymentMethod: newName, updatedAt: new Date() }
					: expense
			);

			set({
				paymentMethods: updatedMethods,
				expenses: updatedExpenses,
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		deletePaymentMethod: (name) => {
			const { paymentMethods, expenses } = get();

			const updatedMethods = paymentMethods.filter((method) => method !== name);

			const updatedExpenses = expenses.map((expense) =>
				expense.paymentMethod === name
					? { ...expense, paymentMethod: "None", updatedAt: new Date() }
					: expense
			);

			set({
				paymentMethods: updatedMethods,
				expenses: updatedExpenses,
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		// Undo/Redo - keeping these the same as before
		undo: () => {
			const action = useHistoryStore.getState().undo();
			if (!action) return;

			const { type, data }: Omit<HistoryAction, "timestamp"> = action;

			switch (type) {
				case "CREATE_EXPENSE":
					set((state) => ({
						expenses: state.expenses.filter(
							(e) => e.id !== data.id && e.parentExpenseId !== data.id
						),
					}));
					break;

				case "UPDATE_EXPENSE":
					if (data.before) {
						set((state) => {
							let updatedExpenses = state.expenses.map((e) =>
								e.id === data.id ? data.before : e
							);

							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								const relatedMap = new Map(
									data.relatedExpenses.map((re: Expense) => [re.id, re])
								);
								updatedExpenses = updatedExpenses.map((e) => {
									const related = relatedMap.get(e.id);
									return related ? related : e;
								});
							}

							return { expenses: updatedExpenses };
						});
					}
					break;

				case "DELETE_EXPENSE":
					if (data.before) {
						set((state) => {
							let newExpenses = [...state.expenses, data.before];

							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								newExpenses = [...newExpenses, ...data.relatedExpenses];
							}

							return { expenses: newExpenses };
						});
					}
					break;

				case "ARCHIVE_EXPENSE":
				case "UNARCHIVE_EXPENSE":
					if (data.before) {
						set((state) => {
							let updatedExpenses = state.expenses.map((e) =>
								e.id === data.id ? { ...e, isArchived: data.before.isArchived } : e
							);

							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								const relatedMap = new Map(
									data.relatedExpenses.map((re: Expense) => [
										re.id,
										re.isArchived,
									])
								);
								updatedExpenses = updatedExpenses.map((e) => {
									const wasArchived = relatedMap.get(e.id);
									return wasArchived !== undefined
										? { ...e, isArchived: wasArchived }
										: e;
								});
							}

							return { expenses: updatedExpenses };
						});
					}
					break;

				case "TOGGLE_EXPENSE_PAID":
					if (data.before) {
						set((state) => {
							let updatedExpenses = state.expenses.map((e) =>
								e.id === data.id
									? {
											...e,
											isPaid: data.before.isPaid,
											paymentDate: data.before.paymentDate,
									  }
									: e
							);

							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								const relatedMap = new Map(
									data.relatedExpenses.map((re: Expense) => [
										re.id,
										{ isPaid: re.isPaid, paymentDate: re.paymentDate },
									])
								);
								updatedExpenses = updatedExpenses.map((e) => {
									const paidState = relatedMap.get(e.id);
									return paidState
										? {
												...e,
												isPaid: paidState.isPaid,
												paymentDate: paidState.paymentDate,
										  }
										: e;
								});
							}

							return { expenses: updatedExpenses };
						});
					}
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		redo: () => {
			const action = useHistoryStore.getState().redo();
			if (!action) return;

			const { type, data } = action;

			switch (type) {
				case "CREATE_EXPENSE":
					if (data.after) {
						set((state) => {
							let newExpenses = [...state.expenses, data.after];

							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								newExpenses = [...newExpenses, ...data.relatedExpenses];
							}

							return { expenses: newExpenses };
						});
					}
					break;

				case "UPDATE_EXPENSE":
					if (data.after) {
						set((state) => ({
							expenses: state.expenses.map((e) =>
								e.id === data.id ? data.after : e
							),
						}));
					}
					break;

				case "DELETE_EXPENSE":
					set((state) => ({
						expenses: state.expenses.filter(
							(e) => e.id !== data.id && e.parentExpenseId !== data.id
						),
					}));
					break;

				case "ARCHIVE_EXPENSE":
					set((state) => {
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id ? { ...e, isArchived: true } : e
						);

						if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
							const relatedIds = new Set(
								data.relatedExpenses.map((re: Expense) => re.id)
							);
							updatedExpenses = updatedExpenses.map((e) =>
								relatedIds.has(e.id) ? { ...e, isArchived: true } : e
							);
						}

						return { expenses: updatedExpenses };
					});
					break;

				case "UNARCHIVE_EXPENSE":
					set((state) => {
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id ? { ...e, isArchived: false } : e
						);

						if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
							const relatedIds = new Set(
								data.relatedExpenses.map((re: Expense) => re.id)
							);
							updatedExpenses = updatedExpenses.map((e) =>
								relatedIds.has(e.id) ? { ...e, isArchived: false } : e
							);
						}

						return { expenses: updatedExpenses };
					});
					break;

				case "TOGGLE_EXPENSE_PAID":
					set((state) => {
						const expense = state.expenses.find((e) => e.id === data.id);
						if (!expense) return state;

						const newIsPaid = !data.before.isPaid;
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id
								? {
										...e,
										isPaid: newIsPaid,
										paymentDate: newIsPaid ? new Date() : null,
								  }
								: e
						);

						if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
							const relatedIds = new Set(
								data.relatedExpenses.map((re: Expense) => re.id)
							);
							updatedExpenses = updatedExpenses.map((e) =>
								relatedIds.has(e.id)
									? {
											...e,
											isPaid: newIsPaid,
											paymentDate: newIsPaid ? new Date() : null,
									  }
									: e
							);
						}

						return { expenses: updatedExpenses };
					});
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},
	}))
);
