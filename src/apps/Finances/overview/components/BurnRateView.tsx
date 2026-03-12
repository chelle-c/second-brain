import { Calculator, Receipt, TrendingUp } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currencyUtils";
import { analyzeNeeds } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TimeRange } from "@/types/overview";
import { StatCard } from "./StatCard";
import { TimeRangeSelector } from "./TimeRangeSelector";

export const BurnRateView: React.FC = () => {
	const { expenses, categoryColors } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();

	const [timeRange, setTimeRange] = useState<TimeRange>(3);

	const analysis = useMemo(() => analyzeNeeds(expenses, timeRange), [expenses, timeRange]);

	const monthlyChartData = useMemo(
		() =>
			analysis.monthlyValues.map((m) => ({
				label: m.month,
				value: m.amount,
				monthDate: m.monthDate,
			})),
		[analysis.monthlyValues],
	);

	const categoryChartData = useMemo(
		() =>
			Object.entries(analysis.byCategory)
				.map(([name, value]) => ({ name, value }))
				.sort((a, b) => b.value - a.value),
		[analysis.byCategory],
	);

	// Adaptive label sizing: larger labels for fewer bars; hide entirely for
	// 9+ month windows where labels would overlap on similar-height bars.
	const labelFontSize =
		timeRange <= 1 ? 18
		: timeRange <= 3 ? 16
		: 14;
	const showBarLabels = timeRange <= 6;

	const hasData = analysis.monthsWithData > 0;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Burn Rate</h2>
					<p className="text-sm text-muted-foreground">
						How much you spend on essentials each month
					</p>
				</div>
				<TimeRangeSelector value={timeRange} onChange={setTimeRange} />
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<StatCard
					label="Average Monthly Needs"
					value={formatCurrency(analysis.averageMonthly, expenseCurrency)}
					icon={Calculator}
					tone="neutral"
					sublabel={`Over ${analysis.monthsAnalyzed} month${analysis.monthsAnalyzed !== 1 ? "s" : ""}`}
					trend={timeRange > 1 ? analysis.trend : undefined}
					trendIsGood={false}
				/>
				<StatCard
					label="Total Period Needs"
					value={formatCurrency(analysis.total, expenseCurrency)}
					icon={Receipt}
					tone="neutral"
					sublabel={`Across ${analysis.monthsWithData} active month${analysis.monthsWithData !== 1 ? "s" : ""}`}
				/>
				<StatCard
					label="Categories"
					value={categoryChartData.length.toString()}
					icon={TrendingUp}
					tone="neutral"
					sublabel={
						categoryChartData.length > 0 ?
							`Top: ${categoryChartData[0].name}`
						:	"No categories"
					}
				/>
			</div>

			{hasData ?
				<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
					{/* Needs by Month */}
					<div className="lg:col-span-3 bg-card rounded-xl shadow-lg border border-border p-6">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-foreground">
								Needs by Month
							</h3>
							<p className="text-sm text-muted-foreground">
								Track how your essential expenses change over time
							</p>
						</div>
						<div className="h-[280px]">
							<BarChart
								data={monthlyChartData}
								showLabels={showBarLabels}
								labelFontSize={labelFontSize}
								labelFormatter={(v) => formatCurrencyCompact(v, expenseCurrency)}
								yAxisFormatter={(v) => formatCurrencyCompact(v, expenseCurrency)}
								renderTooltip={(d) => (
									<div>
										<div className="font-semibold">{d.label}</div>
										<div>{formatCurrency(d.value, expenseCurrency)}</div>
									</div>
								)}
							/>
						</div>
					</div>

					{/* Needs by Category */}
					<div className="lg:col-span-2 bg-card rounded-xl shadow-lg border border-border p-6">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-foreground">
								Needs by Category
							</h3>
							<p className="text-sm text-muted-foreground">Average per month</p>
						</div>
						<div className="h-[200px] mb-3">
							<PieChart
								data={categoryChartData}
								colors={categoryColors}
								renderTooltip={(d, total) => (
									<div>
										<div className="font-semibold">{d.name}</div>
										<div>{formatCurrency(d.value, expenseCurrency)}/mo</div>
										<div className="text-xs opacity-80">
											{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
											of needs
										</div>
									</div>
								)}
							/>
						</div>
						{/* Category list — `pr-3` creates breathing room from the
						    scrollbar track when overflowing. */}
						<div className="space-y-1 max-h-[120px] overflow-y-auto pr-3">
							{categoryChartData.map((cat) => (
								<div
									key={cat.name}
									className="flex items-center justify-between text-sm py-1"
								>
									<div className="flex items-center gap-2 min-w-0">
										<div
											className="w-3 h-3 rounded-full shrink-0"
											style={{
												backgroundColor:
													categoryColors[cat.name] || "var(--chart-1)",
											}}
										/>
										<span className="truncate">{cat.name}</span>
									</div>
									<span className="font-medium text-muted-foreground shrink-0">
										{formatCurrencyCompact(cat.value, expenseCurrency)}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			:	<div className="bg-card rounded-xl border border-border p-12 text-center">
					<Receipt size={48} className="mx-auto text-muted-foreground mb-3" />
					<p className="text-muted-foreground">
						No "Need" type expenses found in the selected time range.
					</p>
				</div>
			}
		</div>
	);
};
