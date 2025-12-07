import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { getMonthlyData } from "@/lib/dateUtils";
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";

interface MonthlyViewProps {
	selectedYear: number;
	onYearChange: (year: number) => void;
	years: number[];
}

const SKY_500 = "#0EA5E9";

const MonthlyView: React.FC<MonthlyViewProps> = ({ selectedYear, onYearChange, years }) => {
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

	const monthlyData = getMonthlyData(incomeEntries, selectedYear);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const chartData = monthlyData.map((month) => ({
		...month,
		shortMonth: month.month.substring(0, 3),
		hoursFormatted: `${month.hours.toFixed(1)}h`,
		amountFormatted: `${currencySymbol}${month.amount.toFixed(2)}`,
	}));

	const monthlyDataExists = monthlyData.filter((month) => month.amount > 0);
	const totalYearAmount = monthlyData.reduce((sum, m) => sum + m.amount, 0);
	const totalYearHours = monthlyData.reduce((sum, m) => sum + m.hours, 0);

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
			{monthlyDataExists.length > 0 ? (
				<>
					{/* Chart Section */}
					<div className="bg-card rounded-xl shadow-lg p-4">
						<div className="pb-2">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-semibold text-card-foreground">
										Monthly Overview
									</h3>
									<div className="flex gap-4 mt-1">
										<span className="text-xs text-muted-foreground">
											Total:{" "}
											<span className="font-medium text-primary">
												{currencySymbol}
												{totalYearAmount.toFixed(0)}
											</span>
										</span>
										<span className="text-xs text-muted-foreground">
											Hours:{" "}
											<span className="font-medium text-primary">
												{totalYearHours.toFixed(1)}h
											</span>
										</span>
									</div>
								</div>
								<Select
									value={selectedYear.toString()}
									onValueChange={(value) => onYearChange(parseInt(value))}
								>
									<SelectTrigger className="w-24 h-8 text-sm">
										<SelectValue placeholder="Year" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>Year</SelectLabel>
											{years.map((year) => (
												<SelectItem key={year} value={year.toString()}>
													{year}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
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
											barSize={24}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke={gridColor}
												vertical={false}
											/>
											<XAxis
												dataKey="shortMonth"
												axisLine={false}
												tickLine={false}
												tick={{ fill: textColor, fontSize: 10 }}
												interval={0}
											/>
											<YAxis
												axisLine={false}
												tickLine={false}
												tick={{ fill: mutedTextColor, fontSize: 10 }}
												tickFormatter={(value) =>
													`${currencySymbol}${value}`
												}
												width={40}
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

					{/* Monthly Cards */}
					<div className="bg-card rounded-xl shadow-lg p-4">
						<div className="pb-2">
							<h3 className="text-sm font-semibold text-card-foreground">
								Monthly Breakdown
							</h3>
						</div>
						<div>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
								{monthlyData.map(
									(month) =>
										(month.amount > 0 || month.hours > 0) && (
											<div
												key={month.month}
												className="border border-border rounded-lg p-3 hover:bg-accent transition-colors"
											>
												<div className="text-sm font-semibold text-card-foreground mb-2">
													{month.month.substring(0, 3)}
												</div>
												<div className="space-y-1">
													<div className="flex justify-between text-xs">
														<span className="text-muted-foreground">
															Earned
														</span>
														<span className="font-medium text-primary">
															{currencySymbol}
															{month.amount.toFixed(0)}
														</span>
													</div>
													<div className="flex justify-between text-xs">
														<span className="text-muted-foreground">
															Hours
														</span>
														<span className="font-medium text-foreground">
															{month.hours.toFixed(1)}h
														</span>
													</div>
													<div className="flex justify-between text-xs">
														<span className="text-muted-foreground">
															Rate
														</span>
														<span className="font-medium text-emerald-500">
															{currencySymbol}
															{month.hours > 0
																? (
																		month.amount / month.hours
																  ).toFixed(0)
																: "0"}
															/h
														</span>
													</div>
												</div>
											</div>
										)
								)}
							</div>
						</div>
					</div>
				</>
			) : (
				<div className="bg-card rounded-xl shadow-lg p-4">
					<div className="p-8 flex flex-col items-center">
						<FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm text-muted-foreground">
							No income entries for {selectedYear}
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default MonthlyView;
