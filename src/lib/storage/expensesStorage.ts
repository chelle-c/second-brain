import {
	DEFAULT_CATEGORY_COLORS,
	DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/expenseHelpers";
import type { AppData } from "@/types/";
import type {
	Expense,
	OccurrenceInitialState,
	OverviewMode,
	RecurrenceSettings,
} from "@/types/expense";
import {
	type DatabaseContext,
	DEFAULT_PAYMENT_METHODS,
} from "../../types/storage";
import { deepEqual } from "../utils";

// Normalized expense type for comparison (dates as strings)
interface NormalizedExpense {
	id: string;
	name: string;
	amount: number;
	category: string;
	paymentMethod: string;
	dueDate: string | null;
	isRecurring: boolean;
	recurrence: RecurrenceSettings | null;
	isArchived: boolean;
	isPaid: boolean;
	paymentDate: string | null;
	type: string;
	importance: string;
	createdAt: string;
	updatedAt: string;
	parentExpenseId?: string;
	monthlyOverrides: Record<string, Partial<Expense>>;
	isModified?: boolean;
	initialState: OccurrenceInitialState | null;
}

// Normalized expenses data structure for comparison
interface NormalizedExpensesData {
	expenses: NormalizedExpense[];
	selectedMonth: string;
	overviewMode: OverviewMode;
	categories: string[];
	categoryColors: Record<string, string>;
	paymentMethods: string[];
}

export class ExpensesStorage {
	private context: DatabaseContext;

	constructor(context: DatabaseContext) {
		this.context = context;
	}

	private normalizeExpenses(expenses: Expense[]): NormalizedExpense[] {
		return expenses
			.map((expense) => ({
				id: expense.id,
				name: expense.name,
				amount: expense.amount,
				category: expense.category,
				paymentMethod: expense.paymentMethod || "None",
				dueDate:
					expense.dueDate instanceof Date
						? expense.dueDate.toISOString()
						: expense.dueDate,
				isRecurring: expense.isRecurring,
				recurrence: expense.recurrence || null,
				isArchived: expense.isArchived,
				isPaid: expense.isPaid,
				paymentDate:
					expense.paymentDate instanceof Date
						? expense.paymentDate.toISOString()
						: (expense.paymentDate ?? null),
				type: expense.type,
				importance: expense.importance,
				createdAt:
					expense.createdAt instanceof Date
						? expense.createdAt.toISOString()
						: String(expense.createdAt),
				updatedAt:
					expense.updatedAt instanceof Date
						? expense.updatedAt.toISOString()
						: String(expense.updatedAt),
				parentExpenseId: expense.parentExpenseId,
				monthlyOverrides: expense.monthlyOverrides || {},
				isModified: expense.isModified,
				initialState: expense.initialState || null,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	private normalizeExpensesData(
		expenses: AppData["expenses"],
	): NormalizedExpensesData {
		return {
			expenses: this.normalizeExpenses(expenses.expenses),
			selectedMonth:
				expenses.selectedMonth instanceof Date
					? expenses.selectedMonth.toISOString()
					: expenses.selectedMonth,
			overviewMode: expenses.overviewMode,
			categories: [...expenses.categories].sort(),
			categoryColors: expenses.categoryColors,
			paymentMethods: [
				...(expenses.paymentMethods || DEFAULT_PAYMENT_METHODS),
			].sort(),
		};
	}

	hasExpensesChanged(newExpenses: AppData["expenses"]): boolean {
		if (!this.context.cache.expenses) return true;

		const normalized1 = this.normalizeExpensesData(this.context.cache.expenses);
		const normalized2 = this.normalizeExpensesData(newExpenses);

		return !deepEqual(normalized1, normalized2);
	}

	async loadExpenses(): Promise<AppData["expenses"]> {
		return this.context.queueOperation(async () => {
			// First, check what columns exist in the expenses table
			const tableInfo = await this.context.getDb().select<Array<{ name: string }>>(
				"PRAGMA table_info(expenses)",
			);
			const existingColumns = new Set(tableInfo.map((col) => col.name));
			const hasPaymentMethod = existingColumns.has("paymentMethod");

			// Build the SELECT query based on available columns
			const selectQuery = hasPaymentMethod
				? "SELECT * FROM expenses"
				: `SELECT id, name, amount, category, 'None' as paymentMethod, dueDate, isRecurring, 
				   recurrence, isArchived, isPaid, paymentDate, type, importance, createdAt, 
				   updatedAt, parentExpenseId, monthlyOverrides, isModified, initialState 
				   FROM expenses`;

			const expenses =
				await this.context.getDb().select<
					Array<{
						id: string;
						name: string;
						amount: number;
						category: string;
						paymentMethod: string | null;
						dueDate: string | null;
						isRecurring: number;
						recurrence: string | null;
						isArchived: number;
						isPaid: number;
						paymentDate: string | null;
						type: string;
						importance: string;
						createdAt: string;
						updatedAt: string;
						parentExpenseId: string | null;
						monthlyOverrides: string | null;
						isModified: number | null;
						initialState: string | null;
					}>
				>(selectQuery);

			const selectedMonthResult = await this.context.getDb().select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_selectedMonth'");
			const overviewModeResult = await this.context.getDb().select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_overviewMode'");
			const categoriesResult = await this.context.getDb().select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_categories'");
			const categoryColorsResult = await this.context.getDb().select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_categoryColors'");
			const paymentMethodsResult = await this.context.getDb().select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'expense_paymentMethods'");

			const expensesData = {
				expenses: expenses.map((row) => {
					// Parse initialState and ensure paymentMethod exists
					const initialState = row.initialState
						? JSON.parse(row.initialState)
						: undefined;
					if (initialState && !initialState.paymentMethod) {
						initialState.paymentMethod = "None";
					}

					return {
						id: row.id,
						name: row.name,
						amount: row.amount,
						category: row.category,
						paymentMethod: row.paymentMethod || "None",
						dueDate: row.dueDate ? new Date(row.dueDate) : null,
						isRecurring: row.isRecurring === 1,
						recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined,
						isArchived: row.isArchived === 1,
						isPaid: row.isPaid === 1,
						paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
						type: row.type as any,
						importance: row.importance as any,
						notify: (row as any).notify === 1,
						createdAt: new Date(row.createdAt),
						updatedAt: new Date(row.updatedAt),
						parentExpenseId: row.parentExpenseId || undefined,
						monthlyOverrides: row.monthlyOverrides
							? JSON.parse(row.monthlyOverrides)
							: {},
						isModified: row.isModified === 1,
						initialState,
					};
				}),
				selectedMonth:
					selectedMonthResult.length > 0
						? new Date(selectedMonthResult[0].value)
						: new Date(),
				overviewMode:
					overviewModeResult.length > 0
						? (overviewModeResult[0].value as any)
						: "remaining",
				categories:
					categoriesResult.length > 0
						? JSON.parse(categoriesResult[0].value)
						: DEFAULT_EXPENSE_CATEGORIES,
				categoryColors:
					categoryColorsResult.length > 0
						? JSON.parse(categoryColorsResult[0].value)
						: DEFAULT_CATEGORY_COLORS,
				paymentMethods:
					paymentMethodsResult.length > 0
						? JSON.parse(paymentMethodsResult[0].value)
						: DEFAULT_PAYMENT_METHODS,
			};

			this.context.cache.expenses = expensesData;
			return expensesData;
		});
	}

	async saveExpenses(expenses: AppData["expenses"]): Promise<void> {
		if (!this.hasExpensesChanged(expenses)) {
			return;
		}

		return this.context.queueOperation(async () => {
			const oldExpenses = this.context.cache.expenses?.expenses || [];
			const oldIds = new Set(oldExpenses.map((e) => e.id));
			const newIds = new Set(expenses.expenses.map((e) => e.id));

			const added = expenses.expenses.filter((e) => !oldIds.has(e.id));
			const deleted = oldExpenses.filter((e) => !newIds.has(e.id));
			const modified = expenses.expenses.filter((e) => {
				if (!oldIds.has(e.id)) return false;
				const old = oldExpenses.find((o) => o.id === e.id);
				if (!old) return false;
				const normalizedOld = this.normalizeExpenses([old])[0];
				const normalizedNew = this.normalizeExpenses([e])[0];
				return !deepEqual(normalizedOld, normalizedNew);
			});

			const oldData = this.context.cache.expenses;
			const settingsChanged =
				oldData &&
				(oldData.overviewMode !== expenses.overviewMode ||
					oldData.selectedMonth.toISOString() !==
						expenses.selectedMonth.toISOString() ||
					!deepEqual(
						[...oldData.categories].sort(),
						[...expenses.categories].sort(),
					) ||
					!deepEqual(oldData.categoryColors, expenses.categoryColors) ||
					!deepEqual(
						[...(oldData.paymentMethods || [])].sort(),
						[...(expenses.paymentMethods || [])].sort(),
					));

			const db = this.context.getDb();
			await db.execute("BEGIN TRANSACTION");
			try {
				// Delete all expenses and reinsert (simpler than tracking updates)
				await db.execute("DELETE FROM expenses");

				const seenIds = new Set<string>();

				for (const expense of expenses.expenses) {
					if (seenIds.has(expense.id)) {
						continue;
					}
					seenIds.add(expense.id);

					// Ensure initialState has paymentMethod
					let initialState = expense.initialState;
					if (initialState && !initialState.paymentMethod) {
						initialState = { ...initialState, paymentMethod: "None" };
					}

					await db.execute(
						`INSERT INTO expenses (
							id, name, amount, category, paymentMethod, dueDate, isRecurring, recurrence,
							isArchived, isPaid, paymentDate, type, importance, notify, createdAt,
							updatedAt, parentExpenseId, monthlyOverrides, isModified, initialState
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
						[
							expense.id,
							expense.name,
							expense.amount,
							expense.category,
							expense.paymentMethod || "None",
							expense.dueDate ? expense.dueDate.toISOString() : null,
							expense.isRecurring ? 1 : 0,
							expense.recurrence ? JSON.stringify(expense.recurrence) : null,
							expense.isArchived ? 1 : 0,
							expense.isPaid ? 1 : 0,
							expense.paymentDate ? expense.paymentDate.toISOString() : null,
							expense.type,
							expense.importance,
							expense.notify ? 1 : 0,
							expense.createdAt.toISOString(),
							expense.updatedAt.toISOString(),
							expense.parentExpenseId || null,
							expense.monthlyOverrides
								? JSON.stringify(expense.monthlyOverrides)
								: null,
							expense.isModified ? 1 : 0,
							initialState ? JSON.stringify(initialState) : null,
						],
					);
				}

				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_selectedMonth', ?)`,
					[expenses.selectedMonth.toISOString()],
				);
				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_overviewMode', ?)`,
					[expenses.overviewMode],
				);
				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_categories', ?)`,
					[JSON.stringify(expenses.categories)],
				);
				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_categoryColors', ?)`,
					[JSON.stringify(expenses.categoryColors)],
				);
				await db.execute(
					`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_paymentMethods', ?)`,
					[JSON.stringify(expenses.paymentMethods || DEFAULT_PAYMENT_METHODS)],
				);

				await db.execute("COMMIT");
			} catch (error) {
				await db.execute("ROLLBACK");
				throw error;
			}

			this.context.cache.expenses = expenses;

			if (added.length === 1) {
				console.log(`Expense created: "${added[0].name}"`);
			} else if (added.length > 1) {
				console.log(`${added.length} expenses created`);
			}
			if (deleted.length === 1) {
				console.log(`Expense deleted: "${deleted[0].name}"`);
			} else if (deleted.length > 1) {
				console.log(`${deleted.length} expenses deleted`);
			}
			if (modified.length === 1) {
				console.log(`Expense updated: "${modified[0].name}"`);
			} else if (modified.length > 1) {
				console.log(`${modified.length} expenses updated`);
			}
			if (
				settingsChanged &&
				added.length === 0 &&
				deleted.length === 0 &&
				modified.length === 0
			) {
				console.log("Expense settings updated");
			}
		});
	}
}
