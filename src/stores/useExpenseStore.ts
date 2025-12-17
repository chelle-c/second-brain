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

	// Shared UI State
	editingExpense: Expense | null;
	deleteModal: { isOpen: boolean; id: string; name: string };
	showPaidExpenses: boolean;
	upcomingTimeAmount: number;
	upcomingTimeUnit: TimeUnit;
	showMonthlyRelativeDates: boolean;
	showUpcomingRelativeDates: boolean;

	// Set state
	setExpenses: (expenses: Expense[]) => void;
	setSelectedMonth: (date: Date) => void;
	setOverviewMode: (mode: OverviewMode) => void;
	setCategories: (categories: string[]) => void;
	setCategoryColors: (categoryColors: Record<string, string>) => void;

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

		// Shared UI State defaults
		editingExpense: null,
		deleteModal: { isOpen: false, id: "", name: "" },
		showPaidExpenses: true,
		upcomingTimeAmount: 3,
		upcomingTimeUnit: "weeks",
		showMonthlyRelativeDates: true,
		showUpcomingRelativeDates: true,

		setExpenses: (expenses) => set({ expenses }),

		setSelectedMonth: (date) => {
			set({ selectedMonth: date });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setOverviewMode: (mode) => {
			set({ overviewMode: mode });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setCategories: (categories) => {
			set({ categories });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
		},

		setCategoryColors: (categoryColors) => {
			set({ categoryColors });

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Expenses);
			}
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

			// Create parent expense (metadata only, not shown in monthly view)
			const parentExpense: Expense = {
				...expenseData,
				id: parentId,
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
				// Generate all occurrences including the first one
				const allOccurrences = generateRecurringExpenses(parentExpense, true);
				newExpenses.push(parentExpense, ...allOccurrences);
			} else {
				// Non-recurring expense
				newExpenses.push(parentExpense);
			}

			set((state) => ({
				expenses: [...state.expenses, ...newExpenses],
			}));

			// Record history
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

			// Store before state for history
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

						// Only check amount and dueDate for modifications (not isPaid/paymentDate)
						const isModified = expense.initialState
							? newAmount !== expense.initialState.amount ||
							  newDueDate?.getTime() !== expense.initialState.dueDate?.getTime()
							: expense.isModified || false;

						return {
							...expense,
							amount: newAmount,
							dueDate: newDueDate,
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

				// Record history
				const afterExpense = updatedExpenses.find((e) => e.id === id);
				useHistoryStore.getState().pushAction({
					type: "UPDATE_EXPENSE",
					data: { id, before: beforeExpense, after: afterExpense },
				});
				return;
			}

			// Handle parent recurring expense edits (from All Expenses view)
			if (existingExpense.isRecurring && !existingExpense.parentExpenseId && isGlobalEdit) {
				// Check if we need to regenerate occurrences
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
					// Update parent with new data
					const updatedParent: Expense = {
						...existingExpense,
						...expenseData,
						updatedAt: new Date(),
					};

					// Get existing occurrences and preserve their modifications
					const existingOccurrences = expenses.filter((e) => e.parentExpenseId === id);
					const modificationMap = new Map(
						existingOccurrences
							.filter((e) => e.isModified)
							.map((e) => [e.dueDate?.getTime(), e])
					);

					// Generate new occurrences
					const newOccurrences = generateRecurringExpenses(updatedParent, true);

					// Apply preserved modifications to matching dates
					const mergedOccurrences = newOccurrences.map((newOcc) => {
						const dateKey = newOcc.dueDate?.getTime();
						const existingMod = dateKey ? modificationMap.get(dateKey) : null;

						if (existingMod) {
							// Preserve modifications from existing occurrence
							return {
								...newOcc,
								amount: existingMod.amount,
								isPaid: existingMod.isPaid,
								paymentDate: existingMod.paymentDate,
								isModified: true,
							};
						}
						return newOcc;
					});

					// Remove old occurrences and add updated parent + new occurrences
					const updatedExpenses = expenses
						.filter((e) => e.id !== id && e.parentExpenseId !== id)
						.concat([updatedParent, ...mergedOccurrences]);

					set({ expenses: updatedExpenses });

					// Record history with all related expenses
					useHistoryStore.getState().pushAction({
						type: "UPDATE_EXPENSE",
						data: {
							id,
							before: beforeExpense,
							after: updatedParent,
							relatedExpenses: [...existingOccurrences],
						},
					});
					return;
				}

				// No regeneration needed, just update fields
				// Capture all related expenses for history
				const relatedOccurrences = expenses.filter((e) => e.parentExpenseId === id);

				const updatedExpenses = expenses.map((expense) => {
					// Update the parent
					if (expense.id === id) {
						return {
							...expense,
							...expenseData,
							updatedAt: new Date(),
						};
					}

					// Update all unmodified instances
					if (expense.parentExpenseId === id && !expense.isModified) {
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
							updatedAt: new Date(),
						};
					}

					// Update modified instances with non-occurrence-specific fields only
					if (expense.parentExpenseId === id && expense.isModified) {
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
							// Don't update amount or dueDate for modified occurrences
							updatedAt: new Date(),
						};
					}

					return expense;
				});

				set({ expenses: updatedExpenses });

				// Record history
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

			// Record history
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

			// If deleting a parent recurring expense, delete all instances
			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.filter((e) => e.id !== id && e.parentExpenseId !== id),
				});

				// Record history with related expenses
				useHistoryStore.getState().pushAction({
					type: "DELETE_EXPENSE",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				set({
					expenses: expenses.filter((e) => e.id !== id),
				});

				// Record history
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

			// If archiving a parent recurring expense, archive all instances
			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.map((e) =>
						e.id === id || e.parentExpenseId === id
							? { ...e, isArchived: true, updatedAt: new Date() }
							: e
					),
				});

				// Record history
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

				// Record history
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

			// If unarchiving a parent recurring expense, unarchive all instances
			if (expense.isRecurring && !expense.parentExpenseId) {
				const relatedExpenses = expenses.filter((e) => e.parentExpenseId === id);
				set({
					expenses: expenses.map((e) =>
						e.id === id || e.parentExpenseId === id
							? { ...e, isArchived: false, updatedAt: new Date() }
							: e
					),
				});

				// Record history
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

				// Record history
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

			// If duplicating a parent recurring expense, duplicate it and all its occurrences
			if (expense.isRecurring && !expense.parentExpenseId) {
				const newParentId = crypto.randomUUID();

				// Duplicate the parent
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

				// Duplicate all occurrences
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
							  }
							: undefined,
					};
					newExpenses.push(duplicatedOccurrence);
				});
			} else {
				// Duplicating a single expense or an occurrence
				const duplicatedExpense: Expense = {
					...expense,
					id: crypto.randomUUID(),
					isPaid: false,
					paymentDate: null,
					isModified: false,
					createdAt: now,
					updatedAt: now,
					// Remove parent reference if duplicating an occurrence (makes it standalone)
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

			// If toggling a parent recurring expense, toggle all instances
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
								// Don't mark as modified when toggling paid state
								updatedAt: new Date(),
							};
						}
						return e;
					}),
				});

				// Record history
				useHistoryStore.getState().pushAction({
					type: "TOGGLE_EXPENSE_PAID",
					data: { id, before: expense, relatedExpenses },
				});
			} else {
				// Toggle single expense
				set({
					expenses: expenses.map((e) => {
						if (e.id === id) {
							const newIsPaid = !e.isPaid;
							return {
								...e,
								isPaid: newIsPaid,
								paymentDate: newIsPaid ? paymentDate || new Date() : null,
								// Don't mark as modified when toggling paid state
								updatedAt: new Date(),
							};
						}
						return e;
					}),
				});

				// Record history
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
				// Skip archived expenses and parent metadata
				if (expense.isArchived) return false;
				if (expense.isRecurring && !expense.parentExpenseId) return false;

				// Apply monthly overrides if they exist
				if (expense.parentExpenseId) {
					const parentExpense = expenses.find((e) => e.id === expense.parentExpenseId);
					if (parentExpense?.monthlyOverrides?.[monthKey]) {
						Object.assign(expense, parentExpense.monthlyOverrides[monthKey]);
					}
				}

				// Handle expenses without due date
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

				// Handle recurring instances
				if (expense.parentExpenseId) {
					const expenseMonth = expense.dueDate.getMonth();
					const expenseYear = expense.dueDate.getFullYear();
					return expenseMonth === targetMonth && expenseYear === targetYear;
				}

				// Handle one-time expenses with due dates
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
						// Show only "Need" type expenses (paid or unpaid)
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

				// First, apply the mode filter
				switch (mode) {
					case "remaining":
						// Include both needs and wants for remaining (unpaid only)
						includeExpense =
							!expense.isPaid &&
							isSameMonth(
								expense.dueDate || new Date(),
								get().selectedMonth || new Date()
							);
						break;
					case "required":
						// Show only "Need" type expenses
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

				// Then, apply the showPaid filter (except for "remaining" which is always unpaid)
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
					categories: [...categories, name].sort(),
					categoryColors: { ...categoryColors, [name]: color },
				});

				if (useAppStore.getState().autoSaveEnabled) {
					useAppStore.getState().saveToFile(AppToSave.Expenses);
				}
			}
		},

		updateCategory: (oldName, newName, newColor) => {
			const { categories, categoryColors, expenses } = get();

			// Update category name in the list
			const updatedCategories = categories.map((cat) => (cat === oldName ? newName : cat));

			// Update category color
			const updatedColors = { ...categoryColors };
			if (oldName !== newName) {
				delete updatedColors[oldName];
			}
			updatedColors[newName] = newColor;

			// Update all expenses that use this category
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

			// Remove category from the list
			const updatedCategories = categories.filter((cat) => cat !== name);

			// Remove category color
			const updatedColors = { ...categoryColors };
			delete updatedColors[name];

			// Move all expenses in this category to "Other"
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

		// Undo/Redo
		undo: () => {
			const action = useHistoryStore.getState().undo();
			if (!action) return;

			const { type, data }: Omit<HistoryAction, "timestamp"> = action;

			switch (type) {
				case "CREATE_EXPENSE":
					// Undo create = delete expense and all related occurrences
					set((state) => ({
						expenses: state.expenses.filter(
							(e) => e.id !== data.id && e.parentExpenseId !== data.id
						),
					}));
					break;

				case "UPDATE_EXPENSE":
					// Undo update = restore previous state
					if (data.before) {
						set((state) => {
							// Restore the main expense
							let updatedExpenses = state.expenses.map((e) =>
								e.id === data.id ? data.before : e
							);

							// If there were related expenses (for recurring), restore them too
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
					// Undo delete = restore expense and all related occurrences
					if (data.before) {
						set((state) => {
							let newExpenses = [...state.expenses, data.before];

							// Restore related expenses (for recurring)
							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								newExpenses = [...newExpenses, ...data.relatedExpenses];
							}

							return { expenses: newExpenses };
						});
					}
					break;

				case "ARCHIVE_EXPENSE":
				case "UNARCHIVE_EXPENSE":
					// Undo archive/unarchive = toggle back isArchived state
					if (data.before) {
						set((state) => {
							let updatedExpenses = state.expenses.map((e) =>
								e.id === data.id
									? { ...e, isArchived: data.before.isArchived }
									: e
							);

							// Handle related expenses (for recurring)
							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								const relatedMap = new Map(
									data.relatedExpenses.map((re: Expense) => [re.id, re.isArchived])
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
					// Undo toggle paid = restore previous paid state
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

							// Handle related expenses (for recurring)
							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								const relatedMap = new Map(
									data.relatedExpenses.map((re: Expense) => [
										re.id,
										{ isPaid: re.isPaid, paymentDate: re.paymentDate },
									])
								);
								updatedExpenses = updatedExpenses.map((e) => {
									const state = relatedMap.get(e.id);
									return state
										? { ...e, isPaid: state.isPaid, paymentDate: state.paymentDate }
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
					// Redo create = add expense and all related occurrences back
					if (data.after) {
						set((state) => {
							let newExpenses = [...state.expenses, data.after];

							// Add related expenses (for recurring)
							if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
								newExpenses = [...newExpenses, ...data.relatedExpenses];
							}

							return { expenses: newExpenses };
						});
					}
					break;

				case "UPDATE_EXPENSE":
					// Redo update = apply new state
					if (data.after) {
						set((state) => ({
							expenses: state.expenses.map((e) =>
								e.id === data.id ? data.after : e
							),
						}));
					}
					break;

				case "DELETE_EXPENSE":
					// Redo delete = remove expense and all related occurrences
					set((state) => ({
						expenses: state.expenses.filter(
							(e) => e.id !== data.id && e.parentExpenseId !== data.id
						),
					}));
					break;

				case "ARCHIVE_EXPENSE":
					// Redo archive = set isArchived to true
					set((state) => {
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id ? { ...e, isArchived: true } : e
						);

						// Handle related expenses (for recurring)
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
					// Redo unarchive = set isArchived to false
					set((state) => {
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id ? { ...e, isArchived: false } : e
						);

						// Handle related expenses (for recurring)
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
					// Redo toggle paid = toggle paid state again
					set((state) => {
						const expense = state.expenses.find((e) => e.id === data.id);
						if (!expense) return state;

						const newIsPaid = !data.before.isPaid;
						let updatedExpenses = state.expenses.map((e) =>
							e.id === data.id
								? { ...e, isPaid: newIsPaid, paymentDate: newIsPaid ? new Date() : null }
								: e
						);

						// Handle related expenses (for recurring)
						if (data.relatedExpenses && Array.isArray(data.relatedExpenses)) {
							const relatedIds = new Set(
								data.relatedExpenses.map((re: Expense) => re.id)
							);
							updatedExpenses = updatedExpenses.map((e) =>
								relatedIds.has(e.id)
									? { ...e, isPaid: newIsPaid, paymentDate: newIsPaid ? new Date() : null }
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
