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

interface IncomeChartProps {
	weeklyData: IncomeDayData[];
}

const SKY_500 = "#0EA5E9";

const IncomeChart: React.FC<IncomeChartProps> = ({ weeklyData }) => {
	const [isClient, setIsClient] = useState(false);
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);

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
						fill="#374151"
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
		<div className="bg-white rounded-xl shadow-lg p-4">
			<div className="pb-2">
				<h3 className="text-base font-semibold text-gray-800">Daily Income</h3>
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
									stroke="#E5E7EB"
									vertical={false}
								/>
								<XAxis
									dataKey="name"
									axisLine={false}
									tickLine={false}
									tick={{ fill: "#374151", fontSize: 13, fontWeight: 500 }}
									interval={0}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fill: "#6B7280", fontSize: 12 }}
									tickFormatter={(value) => `${currencySymbol}${value}`}
									width={45}
								/>
								<Tooltip
									formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Amount"]}
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
