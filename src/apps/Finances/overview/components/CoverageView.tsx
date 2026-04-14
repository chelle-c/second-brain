import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Lightbulb, Sparkles } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currencyUtils";
import { calculateIncomeRequirements, generateCoachingAdvice } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export const CoverageView: React.FC = () => {
	const { expenses } = useExpenseStore();
	const { incomeEntries } = useIncomeStore();
	const { expenseCurrency } = useSettingsStore();

	const [selectedMonth, setSelectedMonth] = useState(new Date());

	const req = useMemo(
		() => calculateIncomeRequirements(incomeEntries, expenses, selectedMonth),
		[incomeEntries, expenses, selectedMonth],
	);

	const coaching = useMemo(
		() =>
			generateCoachingAdvice(incomeEntries, expenses, selectedMonth, (n) =>
				formatCurrency(n, expenseCurrency),
			),
		[incomeEntries, expenses, selectedMonth, expenseCurrency],
	);

	const navigateMonth = (dir: 1 | -1) => {
		const d = new Date(selectedMonth);
		d.setMonth(d.getMonth() + dir);
		setSelectedMonth(d);
	};

	const total = req.allExpensesTotal;
	const needsMarkerPct = total > 0 ? Math.min(100, (req.needsTotal / total) * 100) : 0;
	const earnedPct = total > 0 ? Math.min(100, (req.actualIncome / total) * 100) : 100;
	const needsReached = req.actualIncome >= req.needsTotal;
	const allReached = req.actualIncome >= total && total > 0;
	const isCurrent = format(new Date(), "yyyy-MM") === format(selectedMonth, "yyyy-MM");
	const monthLabel = format(selectedMonth, "MMMM");

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Income Coverage</h2>
					<p className="text-sm text-muted-foreground">
						Track progress toward covering {isCurrent ? "this month" : monthLabel}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => navigateMonth(-1)}
						className="p-1.5 hover:bg-accent rounded-lg cursor-pointer"
						title="Previous month"
					>
						<ChevronLeft size={18} />
					</button>
					<div className="px-3 py-1 font-semibold text-foreground min-w-36 text-center">
						{format(selectedMonth, "MMMM yyyy")}
					</div>
					<button
						type="button"
						onClick={() => navigateMonth(1)}
						className="p-1.5 hover:bg-accent rounded-lg cursor-pointer"
						title="Next month"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* Encouragement headline */}
			<div className="bg-linear-to-br from-primary/10 via-card to-card rounded-xl shadow-lg border border-primary/20 p-6">
				<div className="flex items-start gap-3">
					<div className="shrink-0 rounded-lg bg-primary/15 text-primary p-2">
						<Sparkles size={22} />
					</div>
					<div className="flex-1">
						<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{isCurrent ? "This month" : monthLabel}
						</div>
						<div className="text-xl font-bold text-foreground mt-1">
							{coaching.headline}
						</div>
					</div>
				</div>
			</div>

			{/* Combined goal bar */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-6">
				<div className="flex items-baseline justify-between mb-2">
					<div className="text-sm font-semibold text-foreground">Monthly goal</div>
					<div className="text-sm text-muted-foreground">
						<strong className="text-foreground">
							{formatCurrency(req.actualIncome, expenseCurrency)}
						</strong>
						{" earned of "}
						<strong className="text-foreground">
							{formatCurrency(total, expenseCurrency)}
						</strong>
					</div>
				</div>

				<div className="relative h-5 rounded-full bg-muted overflow-hidden">
					<div
						className="absolute inset-y-0 bg-foreground/5"
						style={{ left: `${needsMarkerPct}%`, right: 0 }}
					/>
					<div
						className="absolute inset-y-0 left-0 bg-chart-2 transition-all duration-700 ease-out"
						style={{ width: `${earnedPct}%` }}
					/>
					{req.needsTotal > 0 && req.wantsTotal > 0 && (
						<div
							className="absolute inset-y-0 w-0.5 bg-foreground/60"
							style={{ left: `${needsMarkerPct}%` }}
						/>
					)}
				</div>

				<div className="relative mt-2 h-10 text-xs">
					{req.needsTotal > 0 && (
						<div
							className="absolute -translate-x-1/2 text-center"
							style={{ left: `${Math.min(Math.max(needsMarkerPct, 10), 90)}%` }}
						>
							<div
								className={`font-semibold ${needsReached ? "text-chart-2" : "text-foreground"}`}
							>
								Essentials {needsReached && "✓"}
							</div>
							<div className="text-muted-foreground">
								{formatCurrency(req.needsTotal, expenseCurrency)}
							</div>
						</div>
					)}
					<div className="absolute right-0 text-right">
						<div
							className={`font-semibold ${allReached ? "text-chart-2" : "text-foreground"}`}
						>
							Everything {allReached && "✓"}
						</div>
						<div className="text-muted-foreground">
							{formatCurrency(total, expenseCurrency)}
						</div>
					</div>
				</div>

				<div className="mt-4 text-sm text-muted-foreground">
					{allReached ?
						<span className="text-chart-2 font-medium">
							Goal reached — anything extra is yours to save. 🎉
						</span>
					: needsReached ?
						<>
							Essentials covered.{" "}
							<strong className="text-foreground">
								{formatCurrency(total - req.actualIncome, expenseCurrency)}
							</strong>{" "}
							to go for everything else.
						</>
					:	<>
							<strong className="text-foreground">
								{formatCurrency(req.needsTotal - req.actualIncome, expenseCurrency)}
							</strong>{" "}
							to go to cover essentials.
						</>
					}
				</div>
			</div>

			{/* Coaching tips */}
			{coaching.tips.length > 0 && (
				<div className="bg-card rounded-xl shadow-sm border border-border p-5">
					<div className="flex items-center gap-2 mb-3">
						<Lightbulb size={16} className="text-chart-4" />
						<h3 className="text-sm font-semibold text-foreground">
							Suggested next steps
						</h3>
					</div>
					<ul className="space-y-2">
						{coaching.tips.map((tip, i) => (
							<li
								key={`tip-${i}-${tip.slice(0, 20)}`}
								className="flex gap-2 text-sm text-foreground/90"
							>
								<span className="text-chart-4 mt-0.5">•</span>
								<span>{tip}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
