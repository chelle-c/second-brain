import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
						fill="#6B7280"
						fontSize={10}
						fontWeight="500"
					>
						{currencySymbol}{rest.payload.amount.toFixed(0)}
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
					<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-sm font-semibold text-gray-700">
									Monthly Overview
								</h2>
								<div className="flex gap-4 mt-1">
									<span className="text-xs text-gray-500">
										Total:{" "}
										<span className="font-medium text-sky-600">
											{currencySymbol}{totalYearAmount.toFixed(0)}
										</span>
									</span>
									<span className="text-xs text-gray-500">
										Hours:{" "}
										<span className="font-medium text-sky-600">
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
											stroke="#E5E7EB"
											vertical={false}
										/>
										<XAxis
											dataKey="shortMonth"
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#6B7280", fontSize: 10 }}
											interval={0}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#9CA3AF", fontSize: 10 }}
											tickFormatter={(value) => `${currencySymbol}${value}`}
											width={40}
										/>
										<Tooltip
											formatter={(value: number, name: string) => {
												if (name === "amount")
													return [`${currencySymbol}${value.toFixed(2)}`, "Amount"];
												if (name === "hours")
													return [`${value.toFixed(1)} hours`, "Hours"];
												return [value, name];
											}}
											labelFormatter={(label) => label}
											contentStyle={{
												borderRadius: "6px",
												border: "1px solid #E5E7EB",
												boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
												fontSize: "12px",
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

					{/* Monthly Cards */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
						<h3 className="text-sm font-semibold text-gray-700 mb-3">
							Monthly Breakdown
						</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
							{monthlyData.map(
								(month) =>
									(month.amount > 0 || month.hours > 0) && (
										<div
											key={month.month}
											className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
										>
											<div className="text-sm font-semibold text-gray-900 mb-2">
												{month.month.substring(0, 3)}
											</div>
											<div className="space-y-1">
												<div className="flex justify-between text-xs">
													<span className="text-gray-500">Earned</span>
													<span className="font-medium text-sky-600">
														{currencySymbol}{month.amount.toFixed(0)}
													</span>
												</div>
												<div className="flex justify-between text-xs">
													<span className="text-gray-500">Hours</span>
													<span className="font-medium text-gray-700">
														{month.hours.toFixed(1)}h
													</span>
												</div>
												<div className="flex justify-between text-xs">
													<span className="text-gray-500">Rate</span>
													<span className="font-medium text-emerald-600">
														{currencySymbol}
														{month.hours > 0
															? (month.amount / month.hours).toFixed(
																	0
															  )
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
				</>
			) : (
				<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 flex flex-col items-center">
					<svg
						className="w-10 h-10 text-gray-300 mb-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p className="text-sm text-gray-500">No income entries for {selectedYear}</p>
				</div>
			)}
		</div>
	);
};

export default MonthlyView;
