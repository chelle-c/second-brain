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

const SKY_500 = "#0EA5E9";

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
						fill="#6B7280"
						fontSize={10}
						fontWeight="500"
					>
						${rest.payload.amount.toFixed(0)}
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
					<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-sm font-semibold text-gray-700">
									Yearly Overview
								</h2>
								<div className="flex gap-4 mt-1">
									<span className="text-xs text-gray-500">
										Total:{" "}
										<span className="font-medium text-sky-600">
											${totalAmount.toFixed(0)}
										</span>
									</span>
									<span className="text-xs text-gray-500">
										Hours:{" "}
										<span className="font-medium text-sky-600">
											{totalHours.toFixed(1)}h
										</span>
									</span>
								</div>
							</div>
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
										barSize={40}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="#E5E7EB"
											vertical={false}
										/>
										<XAxis
											dataKey="year"
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#6B7280", fontSize: 11 }}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#9CA3AF", fontSize: 10 }}
											tickFormatter={(value) => `$${value}`}
											width={45}
										/>
										<Tooltip
											formatter={(value: number, name: string) => {
												if (name === "amount")
													return [`$${value.toFixed(2)}`, "Amount"];
												if (name === "hours")
													return [`${value.toFixed(1)} hours`, "Hours"];
												return [value, name];
											}}
											labelFormatter={(label) => `Year: ${label}`}
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

					{/* Yearly Cards */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
						<h3 className="text-sm font-semibold text-gray-700 mb-3">
							Yearly Breakdown
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{yearlyData.map((year) => (
								<div
									key={year.year}
									className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
								>
									<div className="font-semibold text-gray-900 text-lg mb-2">
										{year.year}
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="bg-sky-50 rounded-md p-2 text-center">
											<div className="text-sm font-bold text-sky-700">
												${year.amount.toFixed(0)}
											</div>
											<div className="text-xs text-sky-600">Earned</div>
										</div>
										<div className="bg-emerald-50 rounded-md p-2 text-center">
											<div className="text-sm font-bold text-emerald-700">
												{year.hours.toFixed(1)}h
											</div>
											<div className="text-xs text-emerald-600">Hours</div>
										</div>
										<div className="bg-purple-50 rounded-md p-2 text-center">
											<div className="text-sm font-bold text-purple-700">
												$
												{year.hours > 0
													? (year.amount / year.hours).toFixed(0)
													: "0"}
												/h
											</div>
											<div className="text-xs text-purple-600">Rate</div>
										</div>
										<div className="bg-amber-50 rounded-md p-2 text-center">
											<div className="text-sm font-bold text-amber-700">
												${(year.amount / 12).toFixed(0)}
											</div>
											<div className="text-xs text-amber-600">
												Monthly Avg
											</div>
										</div>
									</div>
								</div>
							))}
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
					<p className="text-sm text-gray-500">No income entries found</p>
				</div>
			)}
		</div>
	);
};

export default YearlyView;
