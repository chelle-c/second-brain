import React from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { getMonthlyData } from "@/lib/dateUtils";
import { getCurrencySymbol } from "@/lib/currencyUtils";
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
import { BarChart, type BarChartData } from "@/components/charts";

interface MonthlyViewProps {
	selectedYear: number;
	onYearChange: (year: number) => void;
	years: number[];
}

const SKY_500 = "#0EA5E9";

const MonthlyView: React.FC<MonthlyViewProps> = ({ selectedYear, onYearChange, years }) => {
	const { incomeEntries } = useIncomeStore();
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);
	const { resolvedTheme } = useThemeStore();
	const isDark = resolvedTheme === "dark";

	// Theme-aware colors
	const textColor = isDark ? "#e2e8f0" : "#374151";
	const mutedTextColor = isDark ? "#94a3b8" : "#6B7280";
	const gridColor = isDark ? "#334155" : "#E5E7EB";

	const monthlyData = getMonthlyData(incomeEntries, selectedYear);

	const chartData: BarChartData[] = monthlyData.map((month) => ({
		label: month.month.substring(0, 3),
		value: month.amount,
		hours: month.hours,
		month: month.month,
	}));

	const monthlyDataExists = monthlyData.filter((month) => month.amount > 0);
	const totalYearAmount = monthlyData.reduce((sum, m) => sum + m.amount, 0);
	const totalYearHours = monthlyData.reduce((sum, m) => sum + m.hours, 0);

	const renderTooltip = (datum: BarChartData) => (
		<>
			<div className="font-medium">{datum.month}</div>
			<div>Amount: {currencySymbol}{datum.value.toFixed(2)}</div>
			<div>Hours: {datum.hours?.toFixed(1)}h</div>
		</>
	);

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
								<BarChart
									data={chartData}
									barColor={SKY_500}
									showLabels={true}
									labelFormatter={(v) => `${currencySymbol}${v.toFixed(0)}`}
									yAxisFormatter={(v) => `${currencySymbol}${v}`}
									renderTooltip={renderTooltip}
									theme={{ textColor, mutedTextColor, gridColor }}
									barSize={24}
									margin={{ top: 20, right: 10, bottom: 30, left: 45 }}
								/>
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
