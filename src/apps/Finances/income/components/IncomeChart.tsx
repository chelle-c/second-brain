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

interface IncomeChartProps {
	weeklyData: IncomeDayData[];
}

const IncomeChart: React.FC<IncomeChartProps> = ({ weeklyData }) => {
	const [isClient, setIsClient] = useState(false);

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
					fill={"#3B82F6"}
					rx={4}
				/>
				{day.amount > 0 && (
					<text
						x={props.x + props.width / 2}
						y={props.y - 5}
						textAnchor="middle"
						fill="#6B7280"
						fontSize={12}
						fontWeight="500"
					>
						${day.amount.toFixed(2)}
					</text>
				)}
			</g>
		);
	};

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Income</h3>
			<div className="w-full">
				{isClient && (
					<ResponsiveContainer
						initialDimension={{ width: 320, height: 200 }}
						minWidth={320}
						minHeight={200}
					>
						<BarChart
							data={weeklyData}
							margin={{ top: 30, right: 20, left: 20, bottom: 20 }}
							barSize={35}
						>
							<CartesianGrid strokeDasharray="3 2" stroke="#d1d1d1" />
							<XAxis
								dataKey="name"
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#6B7280", fontSize: 14 }}
								interval={0}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#6B7280", fontSize: 14 }}
								tickFormatter={(value) => `$${value}`}
								width={40}
							/>
							<Tooltip
								formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
								labelFormatter={(label) => `Day: ${label}`}
								contentStyle={{
									borderRadius: "8px",
									border: "none",
									boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
	);
};

export default IncomeChart;
