import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Text } from "@visx/text";
import { useEffect, useMemo, useState } from "react";

export interface GroupedBarChartData {
	label: string;
	values: Record<string, number>;
	[key: string]: unknown;
}

interface GroupedBarChartProps {
	data: GroupedBarChartData[];
	keys: string[];
	colors: Record<string, string>;
	seriesLabels?: Record<string, string>;
	yAxisFormatter?: (value: number) => string;
	renderTooltip?: (datum: GroupedBarChartData, key: string, value: number) => React.ReactNode;
	theme?: {
		textColor: string;
		mutedTextColor: string;
		gridColor: string;
	};
	margin?: { top: number; right: number; bottom: number; left: number };
	showLegend?: boolean;
}

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 50, left: 60 };
const LEGEND_HEIGHT = 28;

const getDefaultTheme = () => {
	const style = getComputedStyle(document.documentElement);
	return {
		textColor: style.getPropertyValue("--foreground").trim() || "#374151",
		mutedTextColor: style.getPropertyValue("--muted-foreground").trim() || "#6B7280",
		gridColor: style.getPropertyValue("--border").trim() || "#E5E7EB",
	};
};

const nn = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

const GroupedBarChartInner = ({
	data,
	keys,
	colors,
	seriesLabels,
	yAxisFormatter = (v) => v.toString(),
	renderTooltip,
	theme,
	margin = DEFAULT_MARGIN,
	showLegend = true,
	width,
	height,
}: GroupedBarChartProps & { width: number; height: number }) => {
	const defaults = useMemo(() => getDefaultTheme(), []);
	const resolvedTheme = theme ?? defaults;

	const [tooltip, setTooltip] = useState<{
		data: GroupedBarChartData;
		key: string;
		value: number;
		x: number;
		y: number;
	} | null>(null);

	const [animationProgress, setAnimationProgress] = useState(0);

	useEffect(() => {
		setAnimationProgress(0);
		const startTime = performance.now();
		const duration = 400;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.max(0, Math.min(elapsed / duration, 1));
			const eased = 1 - (1 - progress) ** 3;
			setAnimationProgress(eased);
			if (progress < 1) requestAnimationFrame(animate);
		};

		requestAnimationFrame(animate);
	}, [data]);

	const legendHeight = showLegend ? LEGEND_HEIGHT : 0;
	const innerWidth = nn(width - margin.left - margin.right);
	const innerHeight = nn(height - margin.top - margin.bottom - legendHeight);

	const x0Scale = useMemo(
		() =>
			scaleBand<string>({
				domain: data.map((d) => d.label),
				range: [0, innerWidth],
				paddingInner: 0.25,
				paddingOuter: 0.1,
			}),
		[data, innerWidth],
	);

	const x1Scale = useMemo(
		() =>
			scaleBand<string>({
				domain: keys,
				range: [0, x0Scale.bandwidth()],
				padding: 0.1,
			}),
		[keys, x0Scale],
	);

	const yScale = useMemo(() => {
		let maxValue = 0;
		for (const d of data) {
			for (const k of keys) {
				const v = d.values[k] ?? 0;
				if (v > maxValue) maxValue = v;
			}
		}
		return scaleLinear<number>({
			domain: [0, maxValue * 1.1 || 1],
			range: [innerHeight, 0],
			nice: true,
		});
	}, [data, keys, innerHeight]);

	const yTicks = yScale.ticks(5);
	const barWidth = nn(x1Scale.bandwidth());

	return (
		<div style={{ position: "relative", width, height }}>
			<svg width={width} height={height} aria-label="Grouped bar chart">
				<title>Grouped bar chart</title>
				<Group left={margin.left} top={margin.top}>
					{innerWidth > 0 && innerHeight > 0 && (
						<GridRows
							scale={yScale}
							width={innerWidth}
							stroke={resolvedTheme.gridColor}
							strokeDasharray="3 3"
						/>
					)}

					{yTicks.map((tick) => (
						<Text
							key={`y-tick-${tick}`}
							x={-8}
							y={yScale(tick)}
							textAnchor="end"
							verticalAnchor="middle"
							fill={resolvedTheme.mutedTextColor}
							fontSize={12}
						>
							{yAxisFormatter(tick)}
						</Text>
					))}

					{data.map((d) => {
						const groupX = x0Scale(d.label) || 0;
						return (
							<Group key={`group-${d.label}`} left={groupX}>
								{keys.map((key) => {
									const value = Math.max(0, d.values[key] ?? 0);
									const scaledY = Math.max(
										0,
										Math.min(innerHeight, yScale(value)),
									);
									const fullHeight = nn(innerHeight - scaledY);
									const animatedHeight = nn(fullHeight * animationProgress);
									const barX = x1Scale(key) || 0;
									const barY = innerHeight - animatedHeight;
									const fill = colors[key] || "var(--chart-1)";

									return (
										/* biome-ignore lint/a11y/noStaticElementInteractions: SVG rect needs mouse events for tooltip */
										<rect
											key={`bar-${d.label}-${key}`}
											aria-label={`${d.label} ${seriesLabels?.[key] ?? key}: ${value}`}
											x={barX}
											y={barY}
											width={barWidth}
											height={animatedHeight}
											fill={fill}
											rx={3}
											style={{ cursor: "pointer" }}
											onMouseMove={(event) => {
												setTooltip({
													data: d,
													key,
													value,
													x: event.clientX,
													y: event.clientY,
												});
											}}
											onMouseLeave={() => setTooltip(null)}
										/>
									);
								})}
							</Group>
						);
					})}

					{data.map((d) => {
						const x = (x0Scale(d.label) || 0) + x0Scale.bandwidth() / 2;
						return (
							<Text
								key={`x-label-${d.label}`}
								x={x}
								y={innerHeight + 16}
								textAnchor="middle"
								fill={resolvedTheme.textColor}
								fontSize={12}
								fontWeight={500}
							>
								{d.label}
							</Text>
						);
					})}
				</Group>

				{showLegend && innerWidth > 0 && (
					<Group left={margin.left} top={height - legendHeight + 4}>
						{keys.map((key, i) => {
							const label = seriesLabels?.[key] ?? key;
							const spacing = Math.min(innerWidth / keys.length, 140);
							const itemX = i * spacing;
							return (
								<Group key={`legend-${key}`} left={itemX}>
									<rect
										x={0}
										y={2}
										width={12}
										height={12}
										rx={2}
										fill={colors[key] || "var(--chart-1)"}
									/>
									<Text
										x={18}
										y={8}
										verticalAnchor="middle"
										fill={resolvedTheme.mutedTextColor}
										fontSize={12}
									>
										{label}
									</Text>
								</Group>
							);
						})}
					</Group>
				)}
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
					{renderTooltip(tooltip.data, tooltip.key, tooltip.value)}
				</div>
			)}
		</div>
	);
};

export const GroupedBarChart = (props: GroupedBarChartProps) => {
	const m = props.margin ?? DEFAULT_MARGIN;
	const legendH = (props.showLegend ?? true) ? LEGEND_HEIGHT : 0;
	const minW = m.left + m.right + 20;
	const minH = m.top + m.bottom + legendH + 20;

	return (
		<ParentSize>
			{({ width, height }) =>
				width > minW && height > minH ?
					<GroupedBarChartInner {...props} width={width} height={height} />
				:	null
			}
		</ParentSize>
	);
};
