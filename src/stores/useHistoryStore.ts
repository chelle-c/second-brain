import { create } from "zustand";
import type { Expense } from "@/types/expense";
import type { Subfolder } from "@/types/notes";

export type HistoryActionType =
	// Notes actions
	| "CREATE_NOTE"
	| "UPDATE_NOTE"
	| "DELETE_NOTE"
	| "ARCHIVE_NOTE"
	| "UNARCHIVE_NOTE"
	| "MOVE_NOTE"
	| "CREATE_FOLDER"
	| "UPDATE_FOLDER"
	| "DELETE_FOLDER"
	| "CREATE_SUBFOLDER"
	| "UPDATE_SUBFOLDER"
	| "DELETE_SUBFOLDER"
	// Expense actions
	| "CREATE_EXPENSE"
	| "UPDATE_EXPENSE"
	| "DELETE_EXPENSE"
	| "ARCHIVE_EXPENSE"
	| "UNARCHIVE_EXPENSE"
	| "TOGGLE_EXPENSE_PAID"
	// Income actions
	| "CREATE_INCOME_ENTRY"
	| "UPDATE_INCOME_ENTRY"
	| "DELETE_INCOME_ENTRY"
	| "CREATE_WEEKLY_TARGET"
	| "UPDATE_WEEKLY_TARGET"
	| "DELETE_WEEKLY_TARGET";

export interface HistoryAction {
	type: HistoryActionType;
	timestamp: number;
	data: {
		id: string;
		// Using unknown for before/after since they can be various entity types
		// Consumers are responsible for type narrowing based on action type
		before?: unknown;
		after?: unknown;
		parentId?: string;
		affectedNotes?: { id: string; folder: string }[];
		affectedSubfolders?: Subfolder[];
		// For expenses with recurring occurrences
		relatedExpenses?: Expense[];
	};
}

interface HistoryState {
	past: HistoryAction[];
	future: HistoryAction[];
	canUndo: boolean;
	canRedo: boolean;
}

interface HistoryStore extends HistoryState {
	pushAction: (action: Omit<HistoryAction, "timestamp">) => void;
	undo: () => HistoryAction | null;
	redo: () => HistoryAction | null;
	clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 100;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
	past: [],
	future: [],
	canUndo: false,
	canRedo: false,

	pushAction: (action) => {
		const newAction: HistoryAction = {
			...action,
			timestamp: Date.now(),
		};

		set((state) => {
			const newPast = [...state.past, newAction].slice(-MAX_HISTORY_SIZE);
			return {
				past: newPast,
				future: [], // Clear future on new action
				canUndo: newPast.length > 0,
				canRedo: false,
			};
		});
	},

	undo: () => {
		const { past } = get();
		if (past.length === 0) return null;

		const action = past[past.length - 1];

		set((state) => {
			const newPast = state.past.slice(0, -1);
			const newFuture = [action, ...state.future];
			return {
				past: newPast,
				future: newFuture,
				canUndo: newPast.length > 0,
				canRedo: true,
			};
		});

		return action;
	},

	redo: () => {
		const { future } = get();
		if (future.length === 0) return null;

		const action = future[0];

		set((state) => {
			const newFuture = state.future.slice(1);
			const newPast = [...state.past, action];
			return {
				past: newPast,
				future: newFuture,
				canUndo: true,
				canRedo: newFuture.length > 0,
			};
		});

		return action;
	},

	clearHistory: () => {
		set({
			past: [],
			future: [],
			canUndo: false,
			canRedo: false,
		});
	},
}));
