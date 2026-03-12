import { format, isAfter, startOfMonth } from "date-fns";
import {
	ArrowDownCircle,
	ArrowUpCircle,
	ChevronLeft,
	ChevronRight,
	Eye,
	EyeOff,
	MinusCircle,
	Wallet,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currencyUtils";
import { years } from "@/lib/date-utils/constants";
import { getTrailingCashFlow, getYearlyCashFlow } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { CASH_FLOW_RANGE_OPTIONS, type CashFlowRange } from "@/types/overview";
import { StatCard } from "./StatCard";

export const CashFlowView: React.FC = () => {
	const { expenses } = useExpenseStore();
	const { incomeEntries } = useIncomeStore();
	const { expenseCurrency } = useSettingsStore();

	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [displayRange, setDisplayRange] = useState<CashFlowRange>(6);
	const [hideFutureMonths, setHideFutureMonths] = useState(true);

	const today = useMemo(() => new Date(), []);
	const isViewingCurrentYear = selectedYear === today.getFullYear();
	const isFullYearMode = displayRange === "all";

	const rawCashFlow = useMemo(() => {
		if (isFullYearMode) {
			return getYearlyCashFlow(incomeEntries, expenses, selectedYear);
		}
		return getTrailingCashFlow(incomeEntries, expenses, displayRange, today);
	}, [incomeEntries, expenses, selectedYear, displayRange, isFullYearMode, today]);

	const cashFlow = useMemo(() => {
		if (!isFullYearMode) return rawCashFlow;
		if (!hideFutureMonths) return rawCashFlow;
		if (!isViewingCurrentYear) return rawCashFlow;

		const currentMonthStart = startOfMonth(today);
		return rawCashFlow.filter((m) => !isAfter(startOfMonth(m.monthDate), currentMonthStart));
	}, [rawCashFlow, isFullYearMode, hideFutureMonths, isViewingCurrentYear, today]);

	const stats = useMemo(() => {
		if (cashFlow.length === 0) {
			return {
				totalIncome: 0,
				totalExpenses: 0,
				totalNet: 0,
				avgIncome: 0,
				avgExpenses: 0,
				monthsWithData: 0,
				bestMonth: null as (typeof cashFlow)[number] | null,
			};
		}

		const totalIncome = cashFlow.reduce((s, m) => s + m.income, 0);
		const totalExpenses = cashFlow.reduce((s, m) => s + m.expenses, 0);
		const totalNet = totalIncome - totalExpenses;

		const monthsWithData = cashFlow.filter((m) => m.income > 0 || m.expenses > 0).length;
		const avgIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
		const avgExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;

		const bestMonth = cashFlow.reduce((best, m) => (m.net > best.net ? m : best), cashFlow[0]);

		return {
			totalIncome,
			totalExpenses,
			totalNet,
			avgIncome,
			avgExpenses,
			monthsWithData,
			bestMonth,
		};
	}, [cashFlow]);

	const chartData = useMemo(
		() =>
			cashFlow.map((m) => ({
				label: m.month,
				values: { income: m.income, expenses: m.expenses },
				monthDate: m.monthDate,
				net: m.net,
			})),
		[cashFlow],
	);

	const chartColors = useMemo(() => {
		const style = getComputedStyle(document.documentElement);
		return {
			income: style.getPropertyValue("--chart-2").trim() || "#10b981",
			expenses: style.getPropertyValue("--chart-1").trim() || "#0ea5e9",
		};
	}, []);

	const navigateYear = (direction: 1 | -1) => {
		const newYear = selectedYear + direction;
		if (years.includes(newYear)) setSelectedYear(newYear);
	};

	return (
		<div className="space-y-4">
			{/* ─── Header ──────────────────────────────────────────────── */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<h2 className="text-lg font-semibold text-foreground">Monthly Cash Flow</h2>

				{/* Controls container — fixed structure prevents jump */}
				<div className="flex items-center gap-3">
					{/* Full-year controls: always rendered as a fixed-width block when
					    in Full Year mode, so toggling years doesn't shift the range
					    selector. Hidden entirely in trailing mode (single layout change). */}
					{isFullYearMode && (
						<div className="flex items-center gap-3">
							{/* Future toggle — disabled (not hidden) for past years */}
							<button
								type="button"
								onClick={() => setHideFutureMonths((v) => !v)}
								disabled={!isViewingCurrentYear}
								className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted disabled:hover:text-muted-foreground min-w-[130px] justify-center"
								title={
									!isViewingCurrentYear ? "Only applies to current year"
									: hideFutureMonths ?
										"Show future months"
									:	"Hide future months"
								}
							>
								{hideFutureMonths ?
									<EyeOff size={14} />
								:	<Eye size={14} />}
								{hideFutureMonths ? "Future hidden" : "Showing all"}
							</button>

							{/* Year navigation */}
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => navigateYear(-1)}
									disabled={!years.includes(selectedYear - 1)}
									className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
									title="Previous year"
								>
									<ChevronLeft size={18} />
								</button>
								<div className="px-2 font-semibold text-foreground w-[52px] text-center">
									{selectedYear}
								</div>
								<button
									type="button"
									onClick={() => navigateYear(1)}
									disabled={!years.includes(selectedYear + 1)}
									className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
									title="Next year"
								>
									<ChevronRight size={18} />
								</button>
							</div>
						</div>
					)}

					{/* Range selector — always present, anchors the right edge */}
					<div
						className="inline-flex gap-0.5 p-0.5 bg-muted rounded-lg"
						role="radiogroup"
						aria-label="Select display range"
					>
						{CASH_FLOW_RANGE_OPTIONS.map((opt) => {
							const active = displayRange === opt.value;
							return (
								<button
									key={opt.label}
									type="button"
									role="radio"
									aria-checked={active}
									onClick={() => setDisplayRange(opt.value)}
									className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
										active ?
											"bg-primary text-primary-foreground shadow-sm"
										:	"text-muted-foreground hover:text-foreground hover:bg-accent"
									}`}
								>
									{opt.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* ─── Summary Stats ───────────────────────────────────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Total Income"
					value={formatCurrency(stats.totalIncome, expenseCurrency)}
					icon={ArrowUpCircle}
					tone="positive"
					sublabel={`Avg ${formatCurrencyCompact(stats.avgIncome, expenseCurrency)}/mo`}
				/>
				<StatCard
					label="Total Expenses"
					value={formatCurrency(stats.totalExpenses, expenseCurrency)}
					icon={ArrowDownCircle}
					tone="warning"
					sublabel={`Avg ${formatCurrencyCompact(stats.avgExpenses, expenseCurrency)}/mo`}
				/>
				<StatCard
					label="Net Cash Flow"
					value={formatCurrency(stats.totalNet, expenseCurrency)}
					icon={Wallet}
					tone={stats.totalNet >= 0 ? "positive" : "negative"}
					sublabel={stats.totalNet >= 0 ? "Surplus" : "Deficit"}
				/>
				<StatCard
					label="Best Month"
					value={
						stats.bestMonth ? formatCurrency(stats.bestMonth.net, expenseCurrency) : "—"
					}
					icon={MinusCircle}
					tone="neutral"
					sublabel={
						stats.bestMonth ? format(stats.bestMonth.monthDate, "MMMM yyyy") : undefined
					}
				/>
			</div>

			{/* ─── Comparison Chart ────────────────────────────────────── */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-6">
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">Income vs Expenses</h3>
					<p className="text-sm text-muted-foreground">
						{isFullYearMode ?
							`Month-by-month for ${selectedYear}`
						:	`Last ${displayRange} months`}
					</p>
				</div>
				{chartData.length > 0 ?
					<div className="h-[340px]">
						<GroupedBarChart
							data={chartData}
							keys={["income", "expenses"]}
							colors={chartColors}
							seriesLabels={{ income: "Income", expenses: "Expenses" }}
							yAxisFormatter={(v) => formatCurrencyCompact(v, expenseCurrency)}
							renderTooltip={(d, key, value) => (
								<div>
									<div className="font-semibold mb-1">
										{format(d.monthDate as Date, "MMMM yyyy")}
									</div>
									<div>
										{key === "income" ? "Income" : "Expenses"}:{" "}
										<strong>{formatCurrency(value, expenseCurrency)}</strong>
									</div>
									<div className="text-xs opacity-80 mt-0.5">
										Net: {formatCurrency(d.net as number, expenseCurrency)}
									</div>
								</div>
							)}
						/>
					</div>
				:	<div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
						No data in the selected range.
					</div>
				}
			</div>

			{/* ─── Monthly Net Breakdown ───────────────────────────────── */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-6">
				<h3 className="text-base font-semibold text-foreground mb-3">Monthly Net</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
					{cashFlow.map((m) => {
						const hasData = m.income > 0 || m.expenses > 0;
						const isPositive = m.net >= 0;
						return (
							<div
								key={`${m.month}-${m.monthDate.getTime()}`}
								className={`rounded-lg border p-2.5 text-center ${
									!hasData ? "border-border bg-muted/30 opacity-50"
									: isPositive ?
										"border-[var(--chart-2)]/40 bg-[var(--chart-2)]/10"
									:	"border-destructive/40 bg-destructive/10"
								}`}
							>
								<div className="text-xs font-medium text-muted-foreground">
									{m.month}
								</div>
								<div
									className={`text-sm font-bold mt-0.5 ${
										!hasData ? "text-muted-foreground"
										: isPositive ? "text-[var(--chart-2)]"
										: "text-destructive"
									}`}
								>
									{hasData ? formatCurrencyCompact(m.net, expenseCurrency) : "—"}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
