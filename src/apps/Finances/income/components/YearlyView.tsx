import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { getYearlyData } from "@/lib/dateUtils";
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

const YearlyView: React.FC<{}> = () => {
	const [isClient, setIsClient] = useState(false);

	const { incomeEntries } = useIncomeStore();

	const yearlyData = getYearlyData(incomeEntries);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const chartData = yearlyData.map((year) => ({
		...year,
		hoursFormatted: `${year.hours.toFixed(1)}h`,
		amountFormatted: `$${year.amount.toFixed(2)}`,
	}));

	const CustomBar = (props: any) => {
		const { fill, ...rest } = props;
		return (
			<g>
				<rect
					x={rest.x}
					y={rest.y}
					width={rest.width}
					height={rest.height}
					fill="#10B981"
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
			{yearlyData.length > 0 ? (
				<>
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-6">
							Yearly Overview
						</h2>
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
										barSize={40}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
										<XAxis
											dataKey="year"
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#6B7280", fontSize: 12 }}
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
											labelFormatter={(label) => `Year: ${label}`}
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
						<h3 className="text-lg font-semibold text-gray-800 mb-4">
							Yearly Breakdown
						</h3>
						<div className="grid grid-cols-1 :grid-cols-2 xl:grid-cols-3 gap-4">
							{yearlyData.map((year) => (
								<div
									key={year.year}
									className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
								>
									<div className="font-semibold text-gray-900 text-lg">
										{year.year}
									</div>
									<div className="mt-3 space-y-2">
										<div className="grid grid-cols-2 gap-4 text-center">
											<div className="bg-blue-50 rounded-lg p-3">
												<div className="text-lg font-bold text-blue-700">
													${year.amount.toFixed(2)}
												</div>
												<div className="text-md text-blue-700">
													Total Earned
												</div>
											</div>
											<div className="bg-green-50 rounded-lg p-3">
												<div className="text-lg font-bold text-green-700">
													{year.amount.toFixed(1)}h
												</div>
												<div className="text-md text-green-700">
													Total Hours
												</div>
											</div>
											<div className="bg-purple-50 rounded-lg p-3">
												<div className="text-lg font-bold text-purple-700">
													$
													{year.hours > 0
														? (year.amount / year.hours).toFixed(2)
														: "0.00"}
													/h
												</div>
												<div className="text-md text-purple-700">
													Avg Hourly Rate
												</div>
											</div>
											<div className="bg-orange-50 rounded-lg p-3">
												<div className="text-lg font-bold text-orange-700">
													${(year.amount / 12).toFixed(2)}
												</div>
												<div className="text-md text-orange-700">
													Monthly Avg
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
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

export default YearlyView;
