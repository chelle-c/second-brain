import { format } from "date-fns";
import type React from "react";
import { useMemo } from "react";
import { BarChart, type BarChartData } from "@/components/charts";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { IncomeDayData } from "@/types/income";

interface IncomeChartProps {
	weeklyData: IncomeDayData[];
}

const IncomeChart: React.FC<IncomeChartProps> = ({ weeklyData }) => {
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);
	const { resolvedTheme } = useThemeStore();
	const isDark = resolvedTheme === "dark";

	// Get theme-aware bar color from CSS variable
	const barColor = useMemo(() => {
		return getComputedStyle(document.documentElement)
			.getPropertyValue("--primary")
			.trim();
	}, []);

	// Theme-aware colors
	const textColor = isDark ? "#e2e8f0" : "#374151";
	const mutedTextColor = isDark ? "#94a3b8" : "#6B7280";
	const gridColor = isDark ? "#334155" : "#E5E7EB";

	const chartData: BarChartData[] = weeklyData.map((day) => ({
		label: day.name,
		secondaryLabel: format(day.date, "M/d"),
		value: day.amount,
		...day,
	}));

	const renderTooltip = (datum: BarChartData) => (
		<>
			<div className="font-medium">{datum.label}</div>
			<div>
				Amount: {currencySymbol}
				{datum.value.toFixed(2)}
			</div>
		</>
	);

	return (
		<div className="bg-card rounded-xl shadow-lg p-4">
			<div className="pb-2">
				<h3 className="text-base font-semibold text-card-foreground">
					Daily Income
				</h3>
			</div>
			<div>
				<div className="w-full" style={{ height: "320px" }}>
					<BarChart
						data={chartData}
						barColor={barColor}
						showLabels={true}
						labelFormatter={(v) => `${currencySymbol}${v.toFixed(0)}`}
						yAxisFormatter={(v) => `${currencySymbol}${v}`}
						renderTooltip={renderTooltip}
						theme={{ textColor, mutedTextColor, gridColor }}
						barSize={50}
						margin={{ top: 25, right: 20, bottom: 45, left: 50 }}
					/>
				</div>
			</div>
		</div>
	);
};

export default IncomeChart;
