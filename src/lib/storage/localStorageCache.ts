import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
import type { AppData } from "@/types";
import type { Expense, OccurrenceInitialState } from "@/types/expense";
import type { Folder, Note, Tag } from "@/types/notes";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { DEFAULT_THEME_SETTINGS } from "@/types/theme";
import type { LucideIcon } from "lucide-react";

/**
 * localStorage keys — split across several keys to avoid quota issues
 */
const KEYS = {
	notes: "sb_cache_notes",
	folders: "sb_cache_folders",
	tags: "sb_cache_tags",
	expenses: "sb_cache_expenses",
	income: "sb_cache_income",
	settings: "sb_cache_settings",
	theme: "sb_cache_theme",
	meta: "sb_cache_meta",
} as const;

const VERSION_KEY = "sb_cache_version";
const CACHE_VERSION = "1";

// ── Serialization helpers ────────────────────────────────────────────────────

function tryStringify(value: unknown): string | null {
	try {
		return JSON.stringify(value);
	} catch {
		return null;
	}
}

function tryParse<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function lsSet(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		try {
			localStorage.removeItem(key);
			localStorage.setItem(key, value);
		} catch {
			console.warn(`localStorage quota exceeded for key "${key}"`);
		}
	}
}

// ── Date revival ────────────────────────────────────────────────────────────

function reviveDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

// Raw types from localStorage (before revival)
interface RawNote {
	id: string;
	title: string;
	content: string;
	tags: string[];
	folder: string;
	reminder?: string | null;
	createdAt: string;
	updatedAt: string;
	archived?: boolean;
}

interface RawFolder {
	id: string;
	name: string;
	parentId: string | null;
	icon?: string | null;
	archived?: boolean;
	order?: number;
	createdAt: string;
	updatedAt: string;
}

interface RawExpense {
	id: string;
	name: string;
	amount: number;
	amountData?: unknown;
	category: string;
	paymentMethod?: string;
	dueDate?: string | null;
	paymentDate?: string | null;
	createdAt: string;
	updatedAt: string;
	isRecurring: boolean;
	recurrence?: unknown;
	isArchived: boolean;
	isPaid: boolean;
	type: string;
	importance: string;
	notify?: boolean;
	parentExpenseId?: string;
	monthlyOverrides?: Record<string, unknown>;
	isModified?: boolean;
	initialState?: {
		amount: number;
		dueDate?: string | null;
		paymentMethod?: string;
	};
	subscriptionStatus?: string;
}

interface RawExpensesData {
	expenses?: RawExpense[];
	selectedMonth?: string;
	overviewMode?: string;
	categories?: string[];
	categoryColors?: Record<string, string>;
	paymentMethods?: string[];
}

interface RawTag {
	id: string;
	name: string;
	color: string;
	icon?: string;
}

function reviveNote(raw: RawNote): Note {
	return {
		id: raw.id,
		title: raw.title,
		content: raw.content,
		tags: raw.tags || [],
		folder: raw.folder || "inbox",
		reminder: raw.reminder ? JSON.parse(raw.reminder) : null,
		createdAt: reviveDate(raw.createdAt) ?? new Date(),
		updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
		archived: raw.archived ?? false,
	};
}

function reviveFolder(raw: RawFolder): Folder {
	return {
		id: raw.id,
		name: raw.name,
		parentId: raw.parentId,
		icon: undefined, // Icons are resolved by NotesStorage from icon names
		archived: raw.archived ?? false,
		order: raw.order ?? 0,
		createdAt: reviveDate(raw.createdAt) ?? new Date(),
		updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
	};
}

function reviveExpense(raw: RawExpense): Expense {
	const initialState: OccurrenceInitialState | undefined =
		raw.initialState ?
			{
				amount: raw.initialState.amount,
				dueDate: reviveDate(raw.initialState.dueDate),
				paymentMethod: raw.initialState.paymentMethod || "None",
			}
		:	undefined;

	return {
		id: raw.id,
		name: raw.name,
		amount: raw.amount,
		amountData: raw.amountData as Expense["amountData"],
		category: raw.category,
		paymentMethod: raw.paymentMethod || "None",
		dueDate: reviveDate(raw.dueDate),
		paymentDate: reviveDate(raw.paymentDate),
		createdAt: reviveDate(raw.createdAt) ?? new Date(),
		updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
		isRecurring: raw.isRecurring,
		recurrence: raw.recurrence as Expense["recurrence"],
		isArchived: raw.isArchived,
		isPaid: raw.isPaid,
		type: raw.type as Expense["type"],
		importance: raw.importance as Expense["importance"],
		notify: raw.notify ?? false,
		parentExpenseId: raw.parentExpenseId,
		monthlyOverrides: (raw.monthlyOverrides ?? {}) as Expense["monthlyOverrides"],
		isModified: raw.isModified ?? false,
		initialState,
		subscriptionStatus: raw.subscriptionStatus as Expense["subscriptionStatus"],
	};
}

// ── Public API ───────────────────────────────────────────────────────────────

export const localStorageCache = {
	/**
	 * Persist a full AppData snapshot to localStorage.
	 */
	save(data: AppData): void {
		try {
			lsSet(VERSION_KEY, CACHE_VERSION);

			const notesJson = tryStringify(
				data.notes.map((n) => ({
					...n,
					reminder: n.reminder ? JSON.stringify(n.reminder) : null,
					createdAt:
						n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
					updatedAt:
						n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
				})),
			);
			if (notesJson) lsSet(KEYS.notes, notesJson);

			const foldersJson = tryStringify(
				data.folders.map((f) => ({
					...f,
					icon:
						f.icon ?
							((f.icon as unknown as { displayName?: string; name?: string })
								.displayName ??
							(f.icon as unknown as { name?: string }).name ??
							null)
						:	null,
					createdAt:
						f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
					updatedAt:
						f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
				})),
			);
			if (foldersJson) lsSet(KEYS.folders, foldersJson);

			const tagsJson = tryStringify(
				Object.fromEntries(
					Object.entries(data.tags).map(([id, tag]) => [
						id,
						{
							...tag,
							icon:
								tag.icon ?
									((
										tag.icon as unknown as {
											displayName?: string;
											name?: string;
										}
									).displayName ??
									(tag.icon as unknown as { name?: string }).name ??
									"Tag")
								:	"Tag",
						},
					]),
				),
			);
			if (tagsJson) lsSet(KEYS.tags, tagsJson);

			const expensesJson = tryStringify({
				...data.expenses,
				selectedMonth:
					data.expenses.selectedMonth instanceof Date ?
						data.expenses.selectedMonth.toISOString()
					:	data.expenses.selectedMonth,
				expenses: data.expenses.expenses.map((e) => ({
					...e,
					dueDate: e.dueDate instanceof Date ? e.dueDate.toISOString() : e.dueDate,
					paymentDate:
						e.paymentDate instanceof Date ? e.paymentDate.toISOString() : e.paymentDate,
					createdAt:
						e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
					updatedAt:
						e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
					initialState:
						e.initialState ?
							{
								amount: e.initialState.amount,
								dueDate:
									e.initialState.dueDate instanceof Date ?
										e.initialState.dueDate.toISOString()
									:	e.initialState.dueDate,
								paymentMethod: e.initialState.paymentMethod || "None",
							}
						:	undefined,
				})),
			});
			if (expensesJson) lsSet(KEYS.expenses, expensesJson);

			const incomeJson = tryStringify(data.income);
			if (incomeJson) lsSet(KEYS.income, incomeJson);

			const settingsJson = tryStringify(data.settings);
			if (settingsJson) lsSet(KEYS.settings, settingsJson);

			const themeJson = tryStringify(data.theme);
			if (themeJson) lsSet(KEYS.theme, themeJson);

			const metaJson = tryStringify({
				lastSaved:
					data.lastSaved instanceof Date ? data.lastSaved.toISOString() : data.lastSaved,
			});
			if (metaJson) lsSet(KEYS.meta, metaJson);
		} catch (error) {
			console.warn("localStorageCache.save failed:", error);
		}
	},

	/**
	 * Rehydrate a full AppData from localStorage.
	 * Returns null if the cache is absent, corrupted, or a different version.
	 */
	load(): AppData | null {
		try {
			const version = localStorage.getItem(VERSION_KEY);
			if (version !== CACHE_VERSION) return null;

			const rawNotes = tryParse<RawNote[]>(localStorage.getItem(KEYS.notes));
			const rawFolders = tryParse<RawFolder[]>(localStorage.getItem(KEYS.folders));
			const rawTags = tryParse<Record<string, RawTag>>(localStorage.getItem(KEYS.tags));
			const rawExpenses = tryParse<RawExpensesData>(localStorage.getItem(KEYS.expenses));
			const rawIncome = tryParse<AppData["income"]>(localStorage.getItem(KEYS.income));
			const rawSettings = tryParse<AppData["settings"]>(localStorage.getItem(KEYS.settings));
			const rawTheme = tryParse<AppData["theme"]>(localStorage.getItem(KEYS.theme));
			const rawMeta = tryParse<{ lastSaved: string }>(localStorage.getItem(KEYS.meta));

			// Require at minimum settings + theme to be present
			if (!rawSettings || !rawTheme) return null;

			const notes: Note[] = (rawNotes ?? []).map(reviveNote);
			const folders: Folder[] = (rawFolders ?? []).map(reviveFolder);

			// Tags: icon is stored as a string name — we store it as undefined
			// and let the NotesStorage ICON_MAP resolve it when loading from DB.
			// For localStorage, we just pass through without the icon component.
			const tags: Record<string, Tag> = Object.fromEntries(
				Object.entries(rawTags ?? {}).map(([id, tag]) => [
					id,
					{
						id: tag.id,
						name: tag.name,
						color: tag.color,
						// Cast to LucideIcon to satisfy the type - the actual icon
						// will be resolved by NotesStorage when syncing with DB
						icon: undefined as unknown as LucideIcon,
					},
				]),
			);

			const rawExpenseList = (rawExpenses?.expenses ?? []).map(reviveExpense);

			const expenses: AppData["expenses"] = {
				expenses: rawExpenseList,
				selectedMonth: reviveDate(rawExpenses?.selectedMonth) ?? new Date(),
				overviewMode:
					(rawExpenses?.overviewMode as AppData["expenses"]["overviewMode"]) ??
					"remaining",
				categories: rawExpenses?.categories ?? DEFAULT_EXPENSE_CATEGORIES,
				categoryColors: rawExpenses?.categoryColors ?? DEFAULT_CATEGORY_COLORS,
				paymentMethods: rawExpenses?.paymentMethods ?? DEFAULT_PAYMENT_METHODS,
			};

			const income: AppData["income"] = rawIncome ?? {
				entries: [],
				weeklyTargets: [],
				viewType: "weekly",
			};

			const settings = { ...DEFAULT_SETTINGS, ...(rawSettings ?? {}) };
			const theme = { ...DEFAULT_THEME_SETTINGS, ...(rawTheme ?? {}) };
			const lastSaved = reviveDate(rawMeta?.lastSaved ?? null) ?? new Date();

			return {
				notes,
				folders,
				tags,
				expenses,
				income,
				settings,
				theme,
				isLoading: false,
				lastSaved,
				autoSaveEnabled: settings.autoSaveEnabled,
			};
		} catch (error) {
			console.warn("localStorageCache.load failed:", error);
			return null;
		}
	},

	/** Invalidate all cache keys. */
	clear(): void {
		try {
			for (const key of Object.values(KEYS)) {
				localStorage.removeItem(key);
			}
			localStorage.removeItem(VERSION_KEY);
		} catch {
			// Silently ignore
		}
	},

	/** True if there is a valid cache entry. */
	hasCache(): boolean {
		return localStorage.getItem(VERSION_KEY) === CACHE_VERSION;
	},
};
