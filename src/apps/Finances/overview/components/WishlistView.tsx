import { format } from "date-fns";
import { CalendarDays, Check, Pencil, PiggyBank, ShoppingBag } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currencyUtils";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useOverviewStore } from "@/stores/useOverviewStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export const WishlistView: React.FC = () => {
	const { expenses, categoryColors, toggleExpensePaid, archiveExpense } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const { wishlistSavings, setWishlistSavings } = useOverviewStore();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(wishlistSavings.toString());

	const items = useMemo(() => {
		return expenses
			.filter(
				(e) =>
					!e.isArchived &&
					!e.isRecurring &&
					!e.parentExpenseId &&
					e.type === "want" &&
					e.category !== "Subscriptions" &&
					!e.isPaid,
			)
			.sort((a, b) => {
				if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
				if (a.dueDate) return -1;
				if (b.dueDate) return 1;
				return a.amount - b.amount;
			});
	}, [expenses]);

	const total = useMemo(() => items.reduce((s, e) => s + e.amount, 0), [items]);
	const coveragePct = total > 0 ? Math.min(100, (wishlistSavings / total) * 100) : 100;

	const coverageFlags = useMemo(() => {
		let remaining = wishlistSavings;
		return items.map((item) => {
			if (remaining >= item.amount) {
				remaining -= item.amount;
				return true;
			}
			return false;
		});
	}, [items, wishlistSavings]);

	const commitSavings = () => {
		const parsed = parseFloat(draft);
		setWishlistSavings(Number.isFinite(parsed) ? parsed : 0);
		setEditing(false);
	};

	const markPurchased = (id: string, amount: number) => {
		toggleExpensePaid(id, new Date());
		archiveExpense(id);
		if (wishlistSavings > 0) {
			setWishlistSavings(Math.max(0, wishlistSavings - amount));
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold text-foreground">Wishlist</h2>
				<p className="text-sm text-muted-foreground">
					One-off things you'd like to buy someday
				</p>
			</div>

			{/* ─── Savings card ───────────────────────────────── */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-5">
				<div className="flex items-center gap-3">
					<div className="shrink-0 rounded-lg bg-(--chart-2)/15 text-chart-2 p-2">
						<PiggyBank size={22} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Savings set aside
						</div>

						{/* Totals row: "Out of …" on the left, saved amount on the right */}
						<div className="flex items-baseline justify-between gap-3 mt-0.5 flex-wrap">
							<div className="text-sm text-muted-foreground">
								Out of{" "}
								<strong className="text-foreground">
									{formatCurrency(total, expenseCurrency)}
								</strong>{" "}
								for {items.length} wishlisted item
								{items.length !== 1 ? "s" : ""}
							</div>

							{editing ?
								<div className="flex items-center gap-2">
									<input
										type="number"
										min={0}
										step="0.01"
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && commitSavings()}
										className="w-36 px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-lg font-semibold text-right"
										autoFocus
									/>
									<button
										type="button"
										onClick={commitSavings}
										className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground cursor-pointer"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => {
											setDraft(wishlistSavings.toString());
											setEditing(false);
										}}
										className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent cursor-pointer"
									>
										Cancel
									</button>
								</div>
							:	<div className="flex items-baseline gap-2">
									<div className="text-2xl font-bold text-foreground">
										{formatCurrency(wishlistSavings, expenseCurrency)}
									</div>
									<button
										type="button"
										onClick={() => {
											setDraft(wishlistSavings.toString());
											setEditing(true);
										}}
										className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
										title="Edit savings"
									>
										<Pencil size={14} />
									</button>
								</div>
							}
						</div>

						{total > 0 && (
							<div className="mt-3">
								<div className="relative h-2 rounded-full bg-muted overflow-hidden">
									<div
										className="absolute inset-y-0 left-0 bg-chart-2 transition-all duration-500"
										style={{ width: `${coveragePct}%` }}
									/>
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									{coveragePct >= 100 ?
										"You've saved enough for everything on your list!"
									:	`${Math.round(coveragePct)}% of your wishlist is covered`}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ─── Wishlist items ─────────────────────────────── */}
			<div className="bg-card rounded-xl shadow-sm border border-border p-5">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-base font-semibold text-foreground">Wishlist items</h3>
					<span className="text-sm font-semibold text-muted-foreground">
						{formatCurrency(total, expenseCurrency)} total
					</span>
				</div>

				{items.length === 0 ?
					<div className="py-12 text-center">
						<ShoppingBag size={40} className="mx-auto text-muted-foreground mb-2" />
						<p className="text-sm text-muted-foreground">No wishlist items yet.</p>
						<p className="text-xs text-muted-foreground mt-1">
							Add non-recurring "want" expenses to see them here.
						</p>
					</div>
				:	<div className="space-y-2">
						{items.map((item, idx) => {
							const color = categoryColors[item.category] || "var(--chart-1)";
							const covered = coverageFlags[idx];
							return (
								<div
									key={item.id}
									className={`flex items-center gap-3 p-3 rounded-lg border ${
										covered ?
											"border-(--chart-2)/40 bg-(--chart-2)/5"
										:	"border-border"
									}`}
								>
									<div
										className="shrink-0 w-1 h-8 rounded-full"
										style={{ backgroundColor: color }}
									/>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-foreground truncate flex items-center gap-2">
											{item.name}
											{covered && (
												<span className="inline-flex items-center gap-0.5 text-xs text-chart-2 font-semibold">
													<Check size={12} /> covered
												</span>
											)}
										</div>
										<div className="text-xs text-muted-foreground truncate flex items-center gap-1">
											<span>{item.category}</span>
											{item.dueDate && (
												<>
													<span>·</span>
													<CalendarDays size={11} />
													<span>
														{format(item.dueDate, "MMM d, yyyy")}
													</span>
												</>
											)}
										</div>
									</div>
									<div className="flex items-center gap-3 shrink-0">
										<div className="text-right font-semibold text-foreground">
											{formatCurrency(item.amount, expenseCurrency)}
										</div>
										<button
											type="button"
											onClick={() => markPurchased(item.id, item.amount)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-(--chart-2)/40 bg-card text-chart-2 shadow-sm hover:bg-(--chart-2)/15 hover:shadow active:bg-(--chart-2)/25 transition-all cursor-pointer"
											title="Mark as purchased and archive"
										>
											<Check size={13} /> Mark purchased
										</button>
									</div>
								</div>
							);
						})}
					</div>
				}
			</div>
		</div>
	);
};
