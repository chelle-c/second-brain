import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BurnRateCustomView } from "@/types/overview";

interface OverviewStore {
	// ─── Burn Rate custom views ───────────────────────────────────────
	burnRateViews: BurnRateCustomView[];
	activeBurnRateViewId: string; // "single" is reserved for the default

	addBurnRateView: (view: Omit<BurnRateCustomView, "id">) => string;
	updateBurnRateView: (id: string, patch: Partial<Omit<BurnRateCustomView, "id">>) => void;
	deleteBurnRateView: (id: string) => void;
	setActiveBurnRateView: (id: string) => void;

	// ─── Wishlist savings ─────────────────────────────────────────────
	wishlistSavings: number;
	setWishlistSavings: (amount: number) => void;
}

const DEFAULT_VIEWS: BurnRateCustomView[] = [
	{ id: "quarter", name: "±1 Month", monthsBefore: 1, monthsAfter: 1 },
	{ id: "half-year", name: "±3 Months", monthsBefore: 3, monthsAfter: 3 },
];

export const useOverviewStore = create<OverviewStore>()(
	persist(
		(set) => ({
			burnRateViews: DEFAULT_VIEWS,
			activeBurnRateViewId: "single",

			addBurnRateView: (view) => {
				const id = crypto.randomUUID();
				set((state) => ({
					burnRateViews: [...state.burnRateViews, { ...view, id }],
					activeBurnRateViewId: id,
				}));
				return id;
			},

			updateBurnRateView: (id, patch) =>
				set((state) => ({
					burnRateViews: state.burnRateViews.map((v) =>
						v.id === id ? { ...v, ...patch } : v,
					),
				})),

			deleteBurnRateView: (id) =>
				set((state) => ({
					burnRateViews: state.burnRateViews.filter((v) => v.id !== id),
					activeBurnRateViewId:
						state.activeBurnRateViewId === id ? "single" : state.activeBurnRateViewId,
				})),

			setActiveBurnRateView: (id) => set({ activeBurnRateViewId: id }),

			wishlistSavings: 0,
			setWishlistSavings: (amount) => set({ wishlistSavings: Math.max(0, amount) }),
		}),
		{ name: "finance-overview-store" },
	),
);
