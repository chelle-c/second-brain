import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Text } from "@visx/text";
import { useEffect, useMemo, useState } from "react";

export interface BarChartData {
	label: string;
	value: number;
	[key: string]: string | number | boolean | Date | undefined;
}

interface BarChartProps {
	data: BarChartData[];
	barColor?: string;
	showLabels?: boolean;
	labelFormatter?: (value: number) => string;
	yAxisFormatter?: (value: number) => string;
	renderTooltip?: (datum: BarChartData) => React.ReactNode;
	theme?: {
		textColor: string;
		mutedTextColor: string;
		gridColor: string;
	};
	barSize?: number;
	margin?: { top: number; right: number; bottom: number; left: number };
}

const BarChartInner = ({
	data,
	barColor = "#0EA5E9",
	showLabels = true,
	labelFormatter = (v) => v.toString(),
	yAxisFormatter = (v) => v.toString(),
	renderTooltip,
	theme = {
		textColor: "#374151",
		mutedTextColor: "#6B7280",
		gridColor: "#E5E7EB",
	},
	barSize,
	margin = { top: 25, right: 20, bottom: 30, left: 50 },
	width,
	height,
}: BarChartProps & { width: number; height: number }) => {
	const [tooltip, setTooltip] = useState<{
		data: BarChartData;
		x: number;
		y: number;
	} | null>(null);
	const [animationProgress, setAnimationProgress] = useState(0);

	// Animate from 0 to 1 over 400ms
	useEffect(() => {
		setAnimationProgress(0);
		const startTime = performance.now();
		const duration = 400;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			// Ease-out cubic for smooth deceleration
			const eased = 1 - (1 - progress) ** 3;
			setAnimationProgress(eased);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		requestAnimationFrame(animate);
	}, [data]);

	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const xScale = useMemo(
		() =>
			scaleBand<string>({
				domain: data.map((d) => d.label),
				range: [0, innerWidth],
				padding: 0.3,
			}),
		[data, innerWidth],
	);

	const yScale = useMemo(() => {
		const maxValue = Math.max(...data.map((d) => d.value), 0);
		return scaleLinear<number>({
			domain: [0, maxValue * 1.1 || 1],
			range: [innerHeight, 0],
			nice: true,
		});
	}, [data, innerHeight]);

	const yTicks = yScale.ticks(5);
	const calculatedBarWidth = Math.min(
		barSize || xScale.bandwidth(),
		xScale.bandwidth(),
	);

	return (
		<div style={{ position: "relative", width, height }}>
			<svg width={width} height={height} aria-label="Bar chart">
				<title>Bar chart</title>
				<Group left={margin.left} top={margin.top}>
					<GridRows
						scale={yScale}
						width={innerWidth}
						stroke={theme.gridColor}
						strokeDasharray="3 3"
					/>

					{/* Y-axis labels */}
					{yTicks.map((tick) => (
						<Text
							key={`y-tick-${tick}`}
							x={-8}
							y={yScale(tick)}
							textAnchor="end"
							verticalAnchor="middle"
							fill={theme.mutedTextColor}
							fontSize={12}
						>
							{yAxisFormatter(tick)}
						</Text>
					))}

					{/* Bars */}
					{data.map((d) => {
						const fullBarHeight = Math.max(0, innerHeight - yScale(d.value));
						const animatedBarHeight = fullBarHeight * animationProgress;
						const barX =
							(xScale(d.label) || 0) +
							(xScale.bandwidth() - calculatedBarWidth) / 2;
						// Bar rises from bottom, so y starts at innerHeight and moves up
						const barY = innerHeight - animatedBarHeight;

						return (
							<Group key={`bar-${d.label}`}>
								{/* biome-ignore lint/a11y/noStaticElementInteractions: SVG rect needs mouse events for tooltip */}
								<rect
									aria-label={`${d.label}: ${d.value}`}
									x={barX}
									y={barY}
									width={calculatedBarWidth}
									height={animatedBarHeight}
									fill={barColor}
									rx={4}
									style={{ cursor: "pointer" }}
									onMouseMove={(event) => {
										setTooltip({
											data: d,
											x: event.clientX,
											y: event.clientY,
										});
									}}
									onMouseLeave={() => setTooltip(null)}
								/>

								{showLabels && d.value > 0 && (
									<Text
										x={barX + calculatedBarWidth / 2}
										y={barY - 8}
										textAnchor="middle"
										fill={theme.textColor}
										fontSize={13}
										fontWeight={600}
									>
										{labelFormatter(d.value)}
									</Text>
								)}
							</Group>
						);
					})}

					{/* X-axis labels */}
					{data.map((d) => {
						const x = (xScale(d.label) || 0) + xScale.bandwidth() / 2;
						return (
							<Group key={`x-label-${d.label}`}>
								<Text
									x={x}
									y={innerHeight + 16}
									textAnchor="middle"
									fill={theme.textColor}
									fontSize={13}
									fontWeight={500}
								>
									{d.label}
								</Text>
								{d.secondaryLabel && (
									<Text
										x={x}
										y={innerHeight + 30}
										textAnchor="middle"
										fill={theme.mutedTextColor}
										fontSize={11}
									>
										{String(d.secondaryLabel)}
									</Text>
								)}
							</Group>
						);
					})}
				</Group>
			</svg>

			{tooltip && renderTooltip && (
				<div
					style={{
						position: "fixed",
						left: tooltip.x + 12,
						top: tooltip.y + 12,
						backgroundColor: "var(--popover)",
						color: "var(--popover-foreground)",
						padding: "8px 12px",
						borderRadius: "6px",
						boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
						border: "1px solid var(--border)",
						fontSize: "12px",
						pointerEvents: "none",
						zIndex: 50,
					}}
				>
					{renderTooltip(tooltip.data)}
				</div>
			)}
		</div>
	);
};

export const BarChart = (props: BarChartProps) => {
	return (
		<ParentSize>
			{({ width, height }) => (
				<BarChartInner {...props} width={width} height={height} />
			)}
		</ParentSize>
	);
};
