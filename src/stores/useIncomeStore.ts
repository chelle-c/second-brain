import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { AppToSave } from "@/types";
import type {
	IncomeDayData,
	IncomeEntry,
	IncomeMonthlyData,
	IncomeParsedEntry,
	IncomeViewType,
	IncomeWeekInfo,
	IncomeWeeklyTargets,
	IncomeWeekSelection,
	IncomeYearlyData,
} from "@/types/income";
import useAppStore from "./useAppStore";
import { type HistoryAction, useHistoryStore } from "./useHistoryStore";

interface IncomeStore {
	//State
	incomeEntries: IncomeEntry[];
	incomeWeeklyTargets: IncomeWeeklyTargets[];
	incomeDayData: IncomeDayData[];
	incomeParsedEntries: IncomeParsedEntry[];
	incomeWeekSelection: IncomeWeekSelection;
	incomeWeekInfo: IncomeWeekInfo[];
	incomeMonthlyData: IncomeMonthlyData[];
	incomeYearlyData: IncomeYearlyData[];
	incomeViewType: IncomeViewType;

	// Set state
	setIncomeEntries: (entries: IncomeEntry[]) => void;
	setIncomeWeeklyTargets: (targets: IncomeWeeklyTargets[]) => void;
	setIncomeViewType: (viewType: IncomeViewType) => void;

	// Actions
	addIncomeEntry: (entry: IncomeEntry) => void;
	updateIncomeEntry: (updates: IncomeEntry) => void;
	deleteIncomeEntry: (id: string) => void;
	addIncomeWeeklyTarget: (id: string, amount: number) => void;
	updateIncomeWeeklyTarget: (updates: IncomeWeeklyTargets) => void;
	deleteIncomeWeeklyTarget: (id: string) => void;
	updateIncomeViewType: (viewType: IncomeViewType) => void;

	// Undo/Redo
	undo: () => void;
	redo: () => void;
}

export const useIncomeStore = create<IncomeStore>()(
	subscribeWithSelector((set, get) => ({
		incomeEntries: [],
		incomeWeeklyTargets: [],
		incomeDayData: [],
		incomeParsedEntries: [],
		incomeWeekSelection: {
			year: 0,
			week: 0,
			startDate: new Date(),
			endDate: new Date(),
		},
		incomeWeekInfo: [],
		incomeMonthlyData: [],
		incomeYearlyData: [],
		incomeViewType: "monthly",

		// Set state
		setIncomeEntries: (entries: IncomeEntry[]) =>
			set({ incomeEntries: entries }),
		setIncomeWeeklyTargets: (targets: IncomeWeeklyTargets[]) =>
			set({ incomeWeeklyTargets: targets }),
		setIncomeViewType: (viewType: IncomeViewType) =>
			set({ incomeViewType: viewType }),

		// Income actions
		addIncomeEntry: (paymentData) => {
			const entry: IncomeEntry = {
				...paymentData,
			};

			const existingEntry = get().incomeEntries.find(
				(p) => p.date === entry.date,
			);
			if (existingEntry) {
				// Store before state for history (this is an update to existing entry)
				const beforeEntry = { ...existingEntry };

				set((state) => ({
					...state,
					incomeEntries: state.incomeEntries.map((payment) =>
						payment.date === entry.date ? { ...payment, ...entry } : payment,
					),
				}));

				// Record as update since we're modifying existing entry
				useHistoryStore.getState().pushAction({
					type: "UPDATE_INCOME_ENTRY",
					data: { id: existingEntry.id, before: beforeEntry, after: entry },
				});
			} else {
				set((state) => ({
					...state,
					incomeEntries: [...state.incomeEntries, entry],
				}));

				// Record as create
				useHistoryStore.getState().pushAction({
					type: "CREATE_INCOME_ENTRY",
					data: { id: entry.id, after: entry },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		updateIncomeEntry: (updates) => {
			const existingEntry = get().incomeEntries.find(
				(p) => p.date === updates.date,
			);
			const beforeEntry = existingEntry ? { ...existingEntry } : null;

			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.map((payment) =>
					payment.date === updates.date ? { ...payment, ...updates } : payment,
				),
			}));

			// Record history
			if (beforeEntry) {
				useHistoryStore.getState().pushAction({
					type: "UPDATE_INCOME_ENTRY",
					data: { id: updates.id, before: beforeEntry, after: updates },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		deleteIncomeEntry: (id) => {
			const deletedEntry = get().incomeEntries.find((p) => p.id === id);

			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.filter(
					(payment) => payment.id !== id,
				),
			}));

			// Record history
			if (deletedEntry) {
				useHistoryStore.getState().pushAction({
					type: "DELETE_INCOME_ENTRY",
					data: { id, before: deletedEntry },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		addIncomeWeeklyTarget: (id: string, amount: number) => {
			const target: IncomeWeeklyTargets = {
				id: id,
				amount: amount,
			};

			set((state) => {
				const incomeWeeklyTargets = Array.isArray(state.incomeWeeklyTargets)
					? [...state.incomeWeeklyTargets]
					: [];

				incomeWeeklyTargets.push(target);

				return {
					incomeWeeklyTargets: incomeWeeklyTargets,
				};
			});

			// Record history
			useHistoryStore.getState().pushAction({
				type: "CREATE_WEEKLY_TARGET",
				data: { id, after: target },
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		updateIncomeWeeklyTarget: (updates) => {
			const existingTarget = get().incomeWeeklyTargets.find(
				(t) => t.id === updates.id,
			);
			const beforeTarget = existingTarget ? { ...existingTarget } : null;

			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.map((target) =>
					target.id === updates.id ? { ...target, ...updates } : target,
				),
			}));

			// Record history
			if (beforeTarget) {
				useHistoryStore.getState().pushAction({
					type: "UPDATE_WEEKLY_TARGET",
					data: { id: updates.id, before: beforeTarget, after: updates },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		deleteIncomeWeeklyTarget: (id) => {
			const deletedTarget = get().incomeWeeklyTargets.find((t) => t.id === id);

			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.filter(
					(target) => target.id !== id,
				),
			}));

			// Record history
			if (deletedTarget) {
				useHistoryStore.getState().pushAction({
					type: "DELETE_WEEKLY_TARGET",
					data: { id, before: deletedTarget },
				});
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		updateIncomeViewType: (viewType) => {
			set((_) => ({
				incomeViewType: viewType,
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		// Undo/Redo
		undo: () => {
			const action = useHistoryStore.getState().undo();
			if (!action) return;

			const { type, data }: Omit<HistoryAction, "timestamp"> = action;

			switch (type) {
				case "CREATE_INCOME_ENTRY":
					// Undo create = delete
					set((state) => ({
						incomeEntries: state.incomeEntries.filter((e) => e.id !== data.id),
					}));
					break;

				case "UPDATE_INCOME_ENTRY":
					// Undo update = restore previous state
					if (data.before) {
						const beforeEntry = data.before as IncomeEntry;
						set((state) => ({
							incomeEntries: state.incomeEntries.map((e) =>
								e.id === data.id ? beforeEntry : e,
							),
						}));
					}
					break;

				case "DELETE_INCOME_ENTRY":
					// Undo delete = restore
					if (data.before) {
						const beforeEntry = data.before as IncomeEntry;
						set((state) => ({
							incomeEntries: [...state.incomeEntries, beforeEntry],
						}));
					}
					break;

				case "CREATE_WEEKLY_TARGET":
					// Undo create = delete
					set((state) => ({
						incomeWeeklyTargets: state.incomeWeeklyTargets.filter(
							(t) => t.id !== data.id,
						),
					}));
					break;

				case "UPDATE_WEEKLY_TARGET":
					// Undo update = restore previous state
					if (data.before) {
						const beforeTarget = data.before as IncomeWeeklyTargets;
						set((state) => ({
							incomeWeeklyTargets: state.incomeWeeklyTargets.map((t) =>
								t.id === data.id ? beforeTarget : t,
							),
						}));
					}
					break;

				case "DELETE_WEEKLY_TARGET":
					// Undo delete = restore
					if (data.before) {
						const beforeTarget = data.before as IncomeWeeklyTargets;
						set((state) => ({
							incomeWeeklyTargets: [...state.incomeWeeklyTargets, beforeTarget],
						}));
					}
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		redo: () => {
			const action = useHistoryStore.getState().redo();
			if (!action) return;

			const { type, data } = action;

			switch (type) {
				case "CREATE_INCOME_ENTRY":
					// Redo create = add back
					if (data.after) {
						const afterEntry = data.after as IncomeEntry;
						set((state) => ({
							incomeEntries: [...state.incomeEntries, afterEntry],
						}));
					}
					break;

				case "UPDATE_INCOME_ENTRY":
					// Redo update = apply new state
					if (data.after) {
						const afterEntry = data.after as IncomeEntry;
						set((state) => ({
							incomeEntries: state.incomeEntries.map((e) =>
								e.id === data.id ? afterEntry : e,
							),
						}));
					}
					break;

				case "DELETE_INCOME_ENTRY":
					// Redo delete = remove
					set((state) => ({
						incomeEntries: state.incomeEntries.filter((e) => e.id !== data.id),
					}));
					break;

				case "CREATE_WEEKLY_TARGET":
					// Redo create = add back
					if (data.after) {
						const afterTarget = data.after as IncomeWeeklyTargets;
						set((state) => ({
							incomeWeeklyTargets: [...state.incomeWeeklyTargets, afterTarget],
						}));
					}
					break;

				case "UPDATE_WEEKLY_TARGET":
					// Redo update = apply new state
					if (data.after) {
						const afterTarget = data.after as IncomeWeeklyTargets;
						set((state) => ({
							incomeWeeklyTargets: state.incomeWeeklyTargets.map((t) =>
								t.id === data.id ? afterTarget : t,
							),
						}));
					}
					break;

				case "DELETE_WEEKLY_TARGET":
					// Redo delete = remove
					set((state) => ({
						incomeWeeklyTargets: state.incomeWeeklyTargets.filter(
							(t) => t.id !== data.id,
						),
					}));
					break;
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},
	})),
);
