import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleOrdinal } from "@visx/scale";
import { Pie } from "@visx/shape";
import { Fragment, useEffect, useState } from "react";

export interface PieChartData {
	name: string;
	value: number;
}

interface PieChartProps {
	data: PieChartData[];
	colors: Record<string, string>;
	defaultColor?: string;
	opacity?: number;
	renderTooltip?: (datum: PieChartData, total: number) => React.ReactNode;
}

const PieChartInner = ({
	data,
	colors,
	defaultColor = "#93C5FD",
	opacity = 1,
	renderTooltip,
	width,
	height,
}: PieChartProps & { width: number; height: number }) => {
	const [tooltip, setTooltip] = useState<{
		data: PieChartData;
		x: number;
		y: number;
	} | null>(null);
	const [animationProgress, setAnimationProgress] = useState(0);

	// Divider color: white in dark mode, black in light mode
	const dividerColor = "#ffffff";

	// Animate from 0 to 1 over 500ms
	useEffect(() => {
		setAnimationProgress(0);
		const startTime = performance.now();
		const duration = 500;

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

	const total = data.reduce((sum, d) => sum + d.value, 0);

	const radius = Math.min(width, height) / 2;
	const centerX = width / 2;
	const centerY = height / 2;

	const colorScale = scaleOrdinal({
		domain: data.map((d) => d.name),
		range: data.map((d) => colors[d.name] || defaultColor),
	});

	// Calculate the current end angle based on animation progress
	const fullCircle = Math.PI * 2;
	const currentEndAngle = -Math.PI + fullCircle * animationProgress;

	return (
		<div style={{ position: "relative", width, height }}>
			<svg width={width} height={height} aria-label="Pie chart">
				<title>Pie chart</title>
				<Group
					top={centerY}
					left={centerX}
					className="drop-shadow-md drop-shadow-accent-foreground/30"
				>
					<Pie
						data={data}
						pieValue={(d) => d.value}
						outerRadius={radius * 0.8}
						innerRadius={0}
						startAngle={-Math.PI}
						endAngle={currentEndAngle}
						padAngle={0}
					>
						{(pie) => (
							<>
								{pie.arcs.map((arc) => (
									<Fragment key={`arc-${arc.data.name}`}>
										{/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path needs mouse events for tooltip */}
										<path
											aria-label={`${arc.data.name}: ${arc.data.value}`}
											d={pie.path(arc) || ""}
											fill={colorScale(arc.data.name)}
											opacity={opacity}
											style={{ cursor: "pointer" }}
											onMouseMove={(event) => {
												setTooltip({
													data: arc.data,
													x: event.clientX,
													y: event.clientY,
												});
											}}
											onMouseLeave={() => setTooltip(null)}
										/>
										<path
											d={pie.path(arc) || ""}
											fill="none"
											stroke={dividerColor}
											strokeWidth={2}
											pointerEvents="none"
											shapeRendering="auto"
										/>
									</Fragment>
								))}
								{/* Draw divider lines from center to edge at each arc boundary */}
								{data.length > 1 &&
									pie.arcs.map((arc) => {
										const outerRadius = radius * 0.8;
										// Line from center to outer edge at start angle
										const x =
											Math.cos(arc.startAngle - Math.PI / 2) * outerRadius;
										const y =
											Math.sin(arc.startAngle - Math.PI / 2) * outerRadius;
										return (
											<line
												key={`divider-${arc.data.name}`}
												x1={0}
												y1={0}
												x2={x}
												y2={y}
												stroke={dividerColor}
												strokeWidth={2}
												pointerEvents="none"
												shapeRendering="auto"
											/>
										);
									})}
							</>
						)}
					</Pie>
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
						padding: "12px",
						borderRadius: "8px",
						boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
						border: "1px solid var(--border)",
						pointerEvents: "none",
						zIndex: 50,
					}}
				>
					{renderTooltip(tooltip.data, total)}
				</div>
			)}
		</div>
	);
};

export const PieChart = (props: PieChartProps) => {
	return (
		<ParentSize>
			{({ width, height }) => (
				<PieChartInner {...props} width={width} height={height} />
			)}
		</ParentSize>
	);
};
