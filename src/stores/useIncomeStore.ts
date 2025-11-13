import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import useAppStore from "./useAppStore";
import {
	IncomeEntry,
	IncomeWeeklyTargets,
	IncomeDayData,
	IncomeParsedEntry,
	IncomeWeekSelection,
	IncomeWeekInfo,
	IncomeMonthlyData,
	IncomeYearlyData,
	IncomeViewType,
} from "@/types/income";
import { AppToSave } from "@/types";

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
		setIncomeEntries: (entries: IncomeEntry[]) => set({ incomeEntries: entries }),
		setIncomeWeeklyTargets: (targets: IncomeWeeklyTargets[]) => set({ incomeWeeklyTargets: targets }),
		setIncomeViewType: (viewType: IncomeViewType) => set({ incomeViewType: viewType }),

		// Income actions
		addIncomeEntry: (paymentData) => {
			const entry: IncomeEntry = {
				...paymentData,
			};

			const existingEntry = get().incomeEntries.find((p) => p.date === entry.date);
			console.log("Existing entry:", existingEntry);
			if (existingEntry) {
				set((state) => ({
					...state,
					incomeEntries: state.incomeEntries.map((payment) =>
						payment.date === entry.date ? { ...payment, ...entry } : payment
					),
				}));
			} else {
				set((state) => ({
					...state,
					incomeEntries: [...state.incomeEntries, entry],
				}));
			}

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		updateIncomeEntry: (updates) => {
			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.map((payment) =>
					payment.date === updates.date ? { ...payment, ...updates } : payment
				),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		deleteIncomeEntry: (id) => {
			set((state) => ({
				...state,
				incomeEntries: state.incomeEntries.filter((payment) => payment.id !== id),
			}));

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
					? state.incomeWeeklyTargets
					: [];

				incomeWeeklyTargets.push(target);

				return {
					incomeWeeklyTargets: incomeWeeklyTargets,
				};
			});

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		updateIncomeWeeklyTarget: (updates) => {
			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.map((target) =>
					target.id === updates.id ? { ...target, ...updates } : target
				),
			}));

			if (useAppStore.getState().autoSaveEnabled) {
				useAppStore.getState().saveToFile(AppToSave.Income);
			}
		},

		deleteIncomeWeeklyTarget: (id) => {
			set((state) => ({
				incomeWeeklyTargets: state.incomeWeeklyTargets.filter((target) => target.id !== id),
			}));

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
	}))
);