import React, { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import type { IncomeDayData } from "@/types/income";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { useThemeStore } from "@/stores/useThemeStore";

interface IncomeChartProps {
	weeklyData: IncomeDayData[];
}

const SKY_500 = "#0EA5E9";

const IncomeChart: React.FC<IncomeChartProps> = ({ weeklyData }) => {
	const [isClient, setIsClient] = useState(false);
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);
	const { resolvedTheme } = useThemeStore();
	const isDark = resolvedTheme === "dark";

	// Theme-aware colors
	const textColor = isDark ? "#e2e8f0" : "#374151";
	const mutedTextColor = isDark ? "#94a3b8" : "#6B7280";
	const gridColor = isDark ? "#334155" : "#E5E7EB";
	const tooltipBg = isDark ? "#1e293b" : "#ffffff";
	const tooltipBorder = isDark ? "#475569" : "#E5E7EB";

	useEffect(() => {
		setIsClient(true);
	}, []);

	const CustomBar = (props: any) => {
		const { day } = props;
		return (
			<g>
				<rect
					x={props.x}
					y={props.y}
					width={props.width}
					height={props.height}
					fill={SKY_500}
					rx={4}
				/>
				{day.amount > 0 && (
					<text
						x={props.x + props.width / 2}
						y={props.y - 8}
						textAnchor="middle"
						fill={textColor}
						fontSize={13}
						fontWeight="600"
					>
						{currencySymbol}{day.amount.toFixed(0)}
					</text>
				)}
			</g>
		);
	};

	return (
		<div className="bg-card rounded-xl shadow-lg p-4">
			<div className="pb-2">
				<h3 className="text-base font-semibold text-card-foreground">Daily Income</h3>
			</div>
			<div>
				<div className="w-full" style={{ height: "320px" }}>
					{isClient && (
						<ResponsiveContainer
							width="100%"
							height="100%"
							initialDimension={{ width: 600, height: 320 }}
						>
							<BarChart
								data={weeklyData}
								margin={{ top: 25, right: 20, left: 10, bottom: 10 }}
								barSize={50}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke={gridColor}
									vertical={false}
								/>
								<XAxis
									dataKey="name"
									axisLine={false}
									tickLine={false}
									tick={{ fill: textColor, fontSize: 13, fontWeight: 500 }}
									interval={0}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fill: mutedTextColor, fontSize: 12 }}
									tickFormatter={(value) => `${currencySymbol}${value}`}
									width={45}
								/>
								<Tooltip
									formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Amount"]}
									labelFormatter={(label) => label}
									contentStyle={{
										borderRadius: "6px",
										border: `1px solid ${tooltipBorder}`,
										boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
										fontSize: "12px",
										backgroundColor: tooltipBg,
										color: textColor,
									}}
								/>
								<Bar
									dataKey="amount"
									shape={(props: any) => <CustomBar {...props} day={props.payload} />}
								>
									{weeklyData.map((_, index) => (
										<Cell key={`cell-${index}`} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					)}
				</div>
			</div>
		</div>
	);
};

export default IncomeChart;
