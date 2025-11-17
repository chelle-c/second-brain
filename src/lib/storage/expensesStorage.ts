import { Expense } from "@/types/expense";
import { AppData } from "@/types/";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { DatabaseContext } from "./types";
import { deepEqual } from "./utils";

export class ExpensesStorage {
	private context: DatabaseContext;

	constructor(context: DatabaseContext) {
		this.context = context;
	}

	private normalizeExpenses(expenses: Expense[]): any[] {
		return expenses
			.map((expense) => ({
				...expense,
				dueDate:
					expense.dueDate instanceof Date
						? expense.dueDate.toISOString()
						: expense.dueDate,
				paymentDate:
					expense.paymentDate instanceof Date
						? expense.paymentDate.toISOString()
						: expense.paymentDate,
				createdAt:
					expense.createdAt instanceof Date
						? expense.createdAt.toISOString()
						: expense.createdAt,
				updatedAt:
					expense.updatedAt instanceof Date
						? expense.updatedAt.toISOString()
						: expense.updatedAt,
				recurrence: expense.recurrence || null,
				monthlyOverrides: expense.monthlyOverrides || {},
				initialState: expense.initialState || null,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	private normalizeExpensesData(expenses: AppData["expenses"]): any {
		return {
			expenses: this.normalizeExpenses(expenses.expenses),
			selectedMonth:
				expenses.selectedMonth instanceof Date
					? expenses.selectedMonth.toISOString()
					: expenses.selectedMonth,
			overviewMode: expenses.overviewMode,
			categories: [...expenses.categories].sort(),
			categoryColors: expenses.categoryColors,
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
			const expenses = await this.context.db.select<
				Array<{
					id: string;
					name: string;
					amount: number;
					category: string;
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
			>("SELECT * FROM expenses");

			const selectedMonthResult = await this.context.db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_selectedMonth'"
			);
			const overviewModeResult = await this.context.db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_overviewMode'"
			);
			const categoriesResult = await this.context.db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_categories'"
			);
			const categoryColorsResult = await this.context.db.select<Array<{ value: string }>>(
				"SELECT value FROM settings WHERE key = 'expense_categoryColors'"
			);

			const expensesData = {
				expenses: expenses.map((row) => ({
					id: row.id,
					name: row.name,
					amount: row.amount,
					category: row.category,
					dueDate: row.dueDate ? new Date(row.dueDate) : null,
					isRecurring: row.isRecurring === 1,
					recurrence: row.recurrence ? JSON.parse(row.recurrence) : undefined,
					isArchived: row.isArchived === 1,
					isPaid: row.isPaid === 1,
					paymentDate: row.paymentDate ? new Date(row.paymentDate) : null,
					type: row.type as any,
					importance: row.importance as any,
					createdAt: new Date(row.createdAt),
					updatedAt: new Date(row.updatedAt),
					parentExpenseId: row.parentExpenseId || undefined,
					monthlyOverrides: row.monthlyOverrides ? JSON.parse(row.monthlyOverrides) : {},
					isModified: row.isModified === 1,
					initialState: row.initialState ? JSON.parse(row.initialState) : undefined,
				})),
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

			// Determine what changed in expenses list
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

			// Check if only settings changed
			const oldData = this.context.cache.expenses;
			const settingsChanged =
				oldData &&
				(oldData.overviewMode !== expenses.overviewMode ||
					oldData.selectedMonth.toISOString() !== expenses.selectedMonth.toISOString() ||
					!deepEqual([...oldData.categories].sort(), [...expenses.categories].sort()) ||
					!deepEqual(oldData.categoryColors, expenses.categoryColors));

			await this.context.db.execute("DELETE FROM expenses");

			const seenIds = new Set<string>();

			for (const expense of expenses.expenses) {
				if (seenIds.has(expense.id)) {
					continue;
				}
				seenIds.add(expense.id);

				await this.context.db.execute(
					`INSERT INTO expenses (
						id, name, amount, category, dueDate, isRecurring, recurrence,
						isArchived, isPaid, paymentDate, type, importance, createdAt,
						updatedAt, parentExpenseId, monthlyOverrides, isModified, initialState
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						expense.id,
						expense.name,
						expense.amount,
						expense.category,
						expense.dueDate ? expense.dueDate.toISOString() : null,
						expense.isRecurring ? 1 : 0,
						expense.recurrence ? JSON.stringify(expense.recurrence) : null,
						expense.isArchived ? 1 : 0,
						expense.isPaid ? 1 : 0,
						expense.paymentDate ? expense.paymentDate.toISOString() : null,
						expense.type,
						expense.importance,
						expense.createdAt.toISOString(),
						expense.updatedAt.toISOString(),
						expense.parentExpenseId || null,
						expense.monthlyOverrides ? JSON.stringify(expense.monthlyOverrides) : null,
						expense.isModified ? 1 : 0,
						expense.initialState ? JSON.stringify(expense.initialState) : null,
					]
				);
			}

			await this.context.db.execute(
				`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_selectedMonth', ?)`,
				[expenses.selectedMonth.toISOString()]
			);
			await this.context.db.execute(
				`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_overviewMode', ?)`,
				[expenses.overviewMode]
			);
			await this.context.db.execute(
				`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_categories', ?)`,
				[JSON.stringify(expenses.categories)]
			);
			await this.context.db.execute(
				`INSERT OR REPLACE INTO settings (key, value) VALUES ('expense_categoryColors', ?)`,
				[JSON.stringify(expenses.categoryColors)]
			);

			this.context.cache.expenses = expenses;

			// Log specific changes
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
