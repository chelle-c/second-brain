import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { getYearlyData } from "@/lib/dateUtils";
import { getCurrencySymbol } from "@/lib/currencyUtils";
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
import { FileText } from "lucide-react";

const SKY_500 = "#0EA5E9";

const YearlyView: React.FC<{}> = () => {
	const [isClient, setIsClient] = useState(false);

	const { incomeEntries } = useIncomeStore();
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

	const yearlyData = getYearlyData(incomeEntries);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const chartData = yearlyData.map((year) => ({
		...year,
		hoursFormatted: `${year.hours.toFixed(1)}h`,
		amountFormatted: `${currencySymbol}${year.amount.toFixed(2)}`,
	}));

	const totalAmount = yearlyData.reduce((sum, y) => sum + y.amount, 0);
	const totalHours = yearlyData.reduce((sum, y) => sum + y.hours, 0);

	const CustomBar = (props: any) => {
		const { fill, ...rest } = props;
		return (
			<g>
				<rect
					x={rest.x}
					y={rest.y}
					width={rest.width}
					height={rest.height}
					fill={SKY_500}
					rx={3}
				/>
				{rest.payload.amount > 0 && (
					<text
						x={rest.x + rest.width / 2}
						y={rest.y - 4}
						textAnchor="middle"
						fill={textColor}
						fontSize={10}
						fontWeight="500"
					>
						{currencySymbol}
						{rest.payload.amount.toFixed(0)}
					</text>
				)}
			</g>
		);
	};

	return (
		<div className="space-y-4">
			{yearlyData.length > 0 ? (
				<>
					{/* Chart Section */}
					<div className="bg-card rounded-xl shadow-lg p-4">
						<div className="pb-2">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-semibold text-card-foreground">
										Yearly Overview
									</h3>
									<div className="flex gap-4 mt-1">
										<span className="text-xs text-muted-foreground">
											Total:{" "}
											<span className="font-medium text-primary">
												{currencySymbol}
												{totalAmount.toFixed(0)}
											</span>
										</span>
										<span className="text-xs text-muted-foreground">
											Hours:{" "}
											<span className="font-medium text-primary">
												{totalHours.toFixed(1)}h
											</span>
										</span>
									</div>
								</div>
							</div>
						</div>
						<div>
							<div className="w-full" style={{ height: "280px" }}>
								{isClient && (
									<ResponsiveContainer
										width="100%"
										height="100%"
										initialDimension={{ width: 600, height: 280 }}
									>
										<BarChart
											data={chartData}
											margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
											barSize={40}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke={gridColor}
												vertical={false}
											/>
											<XAxis
												dataKey="year"
												axisLine={false}
												tickLine={false}
												tick={{ fill: textColor, fontSize: 11 }}
											/>
											<YAxis
												axisLine={false}
												tickLine={false}
												tick={{ fill: mutedTextColor, fontSize: 10 }}
												tickFormatter={(value) =>
													`${currencySymbol}${value}`
												}
												width={45}
											/>
											<Tooltip
												formatter={(value: number, name: string) => {
													if (name === "amount")
														return [
															`${currencySymbol}${value.toFixed(2)}`,
															"Amount",
														];
													if (name === "hours")
														return [
															`${value.toFixed(1)} hours`,
															"Hours",
														];
													return [value, name];
												}}
												labelFormatter={(label) => `Year: ${label}`}
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
												shape={(props: any) => <CustomBar {...props} />}
											>
												{chartData.map((_, index) => (
													<Cell key={`cell-${index}`} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								)}
							</div>
						</div>
					</div>

					{/* Yearly Cards */}
					<div className="bg-card rounded-xl shadow-lg p-4">
						<div className="pb-2">
							<h3 className="text-sm font-semibold text-card-foreground">
								Yearly Breakdown
							</h3>
						</div>
						<div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{yearlyData.map((year) => (
									<div
										key={year.year}
										className="border border-border rounded-lg p-3 hover:bg-accent transition-colors"
									>
										<div className="font-semibold text-card-foreground text-lg mb-2">
											{year.year}
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div className="bg-primary/10 rounded-md p-2 text-center">
												<div className="text-sm font-bold text-primary">
													{currencySymbol}
													{year.amount.toFixed(0)}
												</div>
												<div className="text-xs text-primary/80">
													Earned
												</div>
											</div>
											<div className="bg-emerald-500/10 rounded-md p-2 text-center">
												<div className="text-sm font-bold text-emerald-500">
													{year.hours.toFixed(1)}h
												</div>
												<div className="text-xs text-emerald-500/80">
													Hours
												</div>
											</div>
											<div className="bg-purple-500/10 rounded-md p-2 text-center">
												<div className="text-sm font-bold text-purple-500">
													{currencySymbol}
													{year.hours > 0
														? (year.amount / year.hours).toFixed(0)
														: "0"}
													/h
												</div>
												<div className="text-xs text-purple-500/80">
													Rate
												</div>
											</div>
											<div className="bg-amber-500/10 rounded-md p-2 text-center">
												<div className="text-sm font-bold text-amber-500">
													{currencySymbol}
													{(year.amount / 12).toFixed(0)}
												</div>
												<div className="text-xs text-amber-500/80">
													Monthly Avg
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</>
			) : (
				<div className="bg-card rounded-xl shadow-lg p-4">
					<div className="p-8 flex flex-col items-center">
						<FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm text-muted-foreground">No income entries found</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default YearlyView;
