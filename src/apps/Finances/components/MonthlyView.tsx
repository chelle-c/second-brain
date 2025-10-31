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
import type { IncomeMonthlyData } from "../../../types/finance";

interface MonthlyViewProps {
	monthlyData: IncomeMonthlyData[];
	selectedYear: number;
	onYearChange: (year: number) => void;
	years: number[];
}

const MonthlyView: React.FC<MonthlyViewProps> = ({
	monthlyData,
	selectedYear,
	onYearChange,
	years,
}) => {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const chartData = monthlyData.map((month) => ({
		...month,
		hoursFormatted: `${month.hours.toFixed(1)}h`,
		amountFormatted: `$${month.amount.toFixed(2)}`,
	}));

	const monthlyDataExists = monthlyData.filter((month) => month.amount > 0);

	const CustomBar = (props: any) => {
		const { fill, ...rest } = props;
		return (
			<g>
				<rect
					x={rest.x}
					y={rest.y}
					width={rest.width}
					height={rest.height}
					fill="#3B82F6"
					rx={4}
				/>
				{rest.payload.amount > 0 && (
					<text
						x={rest.x + rest.width / 2}
						y={rest.y - 5}
						textAnchor="middle"
						fill="#6B7280"
						fontSize={12}
						fontWeight="500"
					>
						${rest.payload.amount.toFixed(0)}
					</text>
				)}
			</g>
		);
	};

	return (
		<div className="space-y-6">
			{monthlyDataExists.length > 0 ? (
				<>
					<div className="bg-white rounded-lg shadow p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold text-gray-800">
								Monthly Overview - {selectedYear}
							</h2>
							<select
								value={selectedYear}
								onChange={(e) => onYearChange(parseInt(e.target.value))}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{years.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</div>

						<div className="h-80 w-full" style={{ minHeight: "320px" }}>
							{isClient && (
								<ResponsiveContainer
									width="100%"
									height="100%"
									initialDimension={{ width: 320, height: 200 }}
								>
									<BarChart
										data={chartData}
										margin={{ top: 30, right: 20, left: 20, bottom: 20 }}
										barSize={30}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
										<XAxis
											dataKey="month"
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#6B7280", fontSize: 12 }}
											interval={0}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#6B7280", fontSize: 12 }}
											tickFormatter={(value) => `$${value}`}
											width={40}
										/>
										<Tooltip
											formatter={(value: number, name: string) => {
												if (name === "amount")
													return [`$${value.toFixed(2)}`, "Amount"];
												if (name === "hours")
													return [
														`${value.toFixed(1)} hours`,
														"Hours Worked",
													];
												return [value, name];
											}}
											labelFormatter={(label) => `Month: ${label}`}
											contentStyle={{
												borderRadius: "8px",
												border: "none",
												boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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

					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-xl font-semibold text-gray-800 mb-4">
							Monthly Breakdown
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2 rounded-lg bg-gray-100">
							{monthlyData.map(
								(month) =>
									(month.amount > 0 || month.hours > 0) && (
										<div
											key={month.month}
											className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 bg-white transition-colors"
										>
											<div className="text-lg font-semibold text-gray-900">
												{month.month}
											</div>
											<div className="mt-2 space-y-1">
												<div className="flex justify-between text-sm">
													<span className="text-gray-600">Earnings:</span>
													<span className="font-medium text-emerald-600">
														${month.amount.toFixed(2)}
													</span>
												</div>
												<div className="flex justify-between text-sm">
													<span className="text-gray-600">Hours:</span>
													<span className="font-medium text-blue-600">
														{month.hours.toFixed(1)}h
													</span>
												</div>
												<div className="flex justify-between text-sm">
													<span className="text-gray-600">
														Hourly Rate:
													</span>
													<span className="font-medium text-purple-600">
														$
														{month.hours > 0
															? (month.amount / month.hours).toFixed(
																	2
															  )
															: "0.00"}
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
				<div className="bg-white rounded-lg shadow p-12 flex flex-col items-center">
					<svg
						className="w-12 h-12 text-gray-400 mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p className="text-gray-500">No income entries found</p>
				</div>
			)}
		</div>
	);
};

export default MonthlyView;
