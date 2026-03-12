import { format } from "date-fns";
import { CalendarDays, Gift, PiggyBank, Repeat, ShoppingBag } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currencyUtils";
import { analyzeSavingsNeeds } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TimeRange } from "@/types/overview";
import { StatCard } from "./StatCard";
import { TimeRangeSelector } from "./TimeRangeSelector";

const LOOK_AHEAD_MONTHS = 6;

export const SavingsPlannerView: React.FC = () => {
	const { expenses, categoryColors } = useExpenseStore();
	const { incomeEntries } = useIncomeStore();
	const { expenseCurrency } = useSettingsStore();

	// Window for computing historical surplus (income − needs average).
	// This is purely contextual — the view shows all wants regardless.
	const [surplusWindow, setSurplusWindow] = useState<TimeRange>(3);

	const analysis = useMemo(
		() => analyzeSavingsNeeds(expenses, incomeEntries, surplusWindow, LOOK_AHEAD_MONTHS),
		[expenses, incomeEntries, surplusWindow],
	);

	const chartData = useMemo(
		() =>
			analysis.monthlyObligations.map((m) => ({
				label: format(m.monthDate, "MMM"),
				values: {
					recurring: m.recurringTotal,
					oneoff: m.oneOffTotal,
				},
				fullLabel: m.month,
				oneOffItems: m.oneOffItems,
				total: m.total,
			})),
		[analysis.monthlyObligations],
	);

	const chartColors = useMemo(() => {
		const style = getComputedStyle(document.documentElement);
		return {
			recurring: style.getPropertyValue("--chart-3").trim() || "#8b5cf6",
			oneoff: style.getPropertyValue("--chart-4").trim() || "#f59e0b",
		};
	}, []);

	const hasRecurring = analysis.recurringSeries.length > 0;
	const hasOneOffs = analysis.oneOffWants.length > 0;
	const hasAnyWants = hasRecurring || hasOneOffs;

	const surplusCoversRecurring = analysis.discretionaryAfterRecurring >= 0;

	return (
		<div className="space-y-4">
			{/* ─── Header ──────────────────────────────────────────────── */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Savings Planner</h2>
					<p className="text-sm text-muted-foreground">
						How much you need to set aside each month for your wants
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">Surplus window:</span>
					<TimeRangeSelector value={surplusWindow} onChange={setSurplusWindow} />
				</div>
			</div>

			{/* ─── Summary ─────────────────────────────────────────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Recurring Wants"
					value={formatCurrency(analysis.totalRecurringPerMonth, expenseCurrency)}
					icon={Repeat}
					tone="neutral"
					sublabel={`${analysis.recurringSeries.length} series /mo`}
				/>
				<StatCard
					label="One-Off Wishlist"
					value={formatCurrency(analysis.totalOneOff, expenseCurrency)}
					icon={ShoppingBag}
					tone="neutral"
					sublabel={`${analysis.oneOffWants.length} item${analysis.oneOffWants.length !== 1 ? "s" : ""}`}
				/>
				<StatCard
					label="Available Surplus"
					value={formatCurrency(analysis.averageSurplus, expenseCurrency)}
					icon={PiggyBank}
					tone={analysis.averageSurplus > 0 ? "positive" : "negative"}
					sublabel={`Income − Needs (${surplusWindow}mo avg)`}
				/>
				<StatCard
					label="After Recurring Wants"
					value={formatCurrency(analysis.discretionaryAfterRecurring, expenseCurrency)}
					icon={Gift}
					tone={surplusCoversRecurring ? "positive" : "negative"}
					sublabel={
						surplusCoversRecurring ? "Left for one-offs" : "Shortfall on recurring"
					}
				/>
			</div>

			{!hasAnyWants ?
				<div className="bg-card rounded-xl border border-border p-12 text-center">
					<Gift size={48} className="mx-auto text-muted-foreground mb-3" />
					<p className="text-muted-foreground">No "Want" type expenses found.</p>
					<p className="text-sm text-muted-foreground mt-1">
						Add some wishlist items in the Expenses tracker.
					</p>
				</div>
			:	<>
					{/* ─── Monthly Obligation Timeline ─────────────────── */}
					<div className="bg-card rounded-xl shadow-lg border border-border p-6">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-foreground">
								Required Savings by Month
							</h3>
							<p className="text-sm text-muted-foreground">
								Total want expenses due in each of the next {LOOK_AHEAD_MONTHS}{" "}
								months
							</p>
						</div>
						<div className="h-[280px]">
							<GroupedBarChart
								data={chartData}
								keys={["recurring", "oneoff"]}
								colors={chartColors}
								seriesLabels={{
									recurring: "Recurring",
									oneoff: "One-off",
								}}
								yAxisFormatter={(v) => formatCurrencyCompact(v, expenseCurrency)}
								renderTooltip={(d, key, value) => (
									<div>
										<div className="font-semibold mb-1">
											{d.fullLabel as string}
										</div>
										<div>
											{key === "recurring" ? "Recurring" : "One-off"}:{" "}
											<strong>
												{formatCurrency(value, expenseCurrency)}
											</strong>
										</div>
										<div className="text-xs opacity-80 mt-0.5">
											Total required:{" "}
											{formatCurrency(d.total as number, expenseCurrency)}
										</div>
										{key === "oneoff" &&
											(d.oneOffItems as string[]).length > 0 && (
												<div className="text-xs opacity-70 mt-1 max-w-[200px]">
													{(d.oneOffItems as string[]).join(", ")}
												</div>
											)}
									</div>
								)}
							/>
						</div>
					</div>

					{/* ─── Side-by-side breakdown ──────────────────────── */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Recurring Series */}
						<div className="bg-card rounded-xl shadow-lg border border-border p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-base font-semibold text-foreground">
									Recurring Wants
								</h3>
								<span className="text-sm font-semibold text-muted-foreground">
									{formatCurrency(
										analysis.totalRecurringPerMonth,
										expenseCurrency,
									)}
									/mo
								</span>
							</div>

							{hasRecurring ?
								<div className="space-y-2 max-h-[280px] overflow-y-auto pr-3">
									{analysis.recurringSeries.map((series) => {
										const color =
											categoryColors[series.category] || "var(--chart-1)";
										return (
											<div
												key={series.id}
												className="flex items-center gap-3 p-2.5 rounded-lg border border-border"
											>
												<div
													className="shrink-0 w-1 h-8 rounded-full"
													style={{ backgroundColor: color }}
												/>
												<div className="flex-1 min-w-0">
													<div className="font-medium text-foreground truncate">
														{series.name}
													</div>
													<div className="text-xs text-muted-foreground truncate">
														{series.category}
														{series.frequency !== "monthly" && (
															<> · {series.frequency}</>
														)}
													</div>
												</div>
												<div className="text-right shrink-0">
													<div className="font-semibold text-foreground">
														{formatCurrency(
															series.monthlyAmount,
															expenseCurrency,
														)}
													</div>
													<div className="text-xs text-muted-foreground">
														per month
													</div>
												</div>
											</div>
										);
									})}
								</div>
							:	<div className="py-8 text-center text-sm text-muted-foreground">
									No recurring want subscriptions.
								</div>
							}
						</div>

						{/* One-Off Wishlist */}
						<div className="bg-card rounded-xl shadow-lg border border-border p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-base font-semibold text-foreground">
									One-Off Wishlist
								</h3>
								<span className="text-sm font-semibold text-muted-foreground">
									{formatCurrency(analysis.totalOneOff, expenseCurrency)} total
								</span>
							</div>

							{hasOneOffs ?
								<div className="space-y-2 max-h-[280px] overflow-y-auto pr-3">
									{analysis.oneOffWants.map((want) => {
										const color =
											categoryColors[want.category] || "var(--chart-1)";
										return (
											<div
												key={want.id}
												className="flex items-center gap-3 p-2.5 rounded-lg border border-border"
											>
												<div
													className="shrink-0 w-1 h-8 rounded-full"
													style={{ backgroundColor: color }}
												/>
												<div className="flex-1 min-w-0">
													<div className="font-medium text-foreground truncate">
														{want.name}
													</div>
													<div className="text-xs text-muted-foreground truncate flex items-center gap-1">
														{want.dueDate ?
															<>
																<CalendarDays size={11} />
																{format(
																	want.dueDate,
																	"MMM d, yyyy",
																)}
															</>
														:	"No target date"}
													</div>
												</div>
												<div className="text-right shrink-0">
													<div className="font-semibold text-foreground">
														{formatCurrency(
															want.amount,
															expenseCurrency,
														)}
													</div>
													<div className="text-xs text-muted-foreground">
														{want.category}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							:	<div className="py-8 text-center text-sm text-muted-foreground">
									No one-time wishlist items.
								</div>
							}
						</div>
					</div>
				</>
			}
		</div>
	);
};
