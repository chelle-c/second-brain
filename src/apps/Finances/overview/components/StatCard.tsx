import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type React from "react";

type StatCardTone = "neutral" | "positive" | "negative" | "warning";

interface StatCardProps {
	label: string;
	value: string;
	icon?: LucideIcon;
	tone?: StatCardTone;
	sublabel?: string;
	trend?: number; // Percentage; renders an up/down indicator
	trendIsGood?: boolean; // If trend > 0 is desirable (e.g. income) set true; for expenses set false
}

const toneClasses: Record<StatCardTone, { bg: string; fg: string; iconBg: string }> = {
	neutral: {
		bg: "bg-card",
		fg: "text-foreground",
		iconBg: "bg-accent text-accent-foreground",
	},
	positive: {
		bg: "bg-card",
		fg: "text-foreground",
		iconBg: "bg-[var(--chart-2)]/20 text-[var(--chart-2)]",
	},
	negative: {
		bg: "bg-card",
		fg: "text-foreground",
		iconBg: "bg-destructive/15 text-destructive",
	},
	warning: {
		bg: "bg-card",
		fg: "text-foreground",
		iconBg: "bg-[var(--chart-4)]/20 text-[var(--chart-4)]",
	},
};

export const StatCard: React.FC<StatCardProps> = ({
	label,
	value,
	icon: Icon,
	tone = "neutral",
	sublabel,
	trend,
	trendIsGood = true,
}) => {
	const classes = toneClasses[tone];

	// Determine trend color based on direction and desirability
	const showTrend = trend !== undefined && Math.abs(trend) >= 0.1;
	let trendColor = "text-muted-foreground";
	if (showTrend) {
		const isIncreasing = trend > 0;
		const isGood = trendIsGood ? isIncreasing : !isIncreasing;
		trendColor = isGood ? "text-[var(--chart-2)]" : "text-destructive";
	}

	return (
		<div
			className={`${classes.bg} rounded-xl border border-border p-4 flex items-start gap-3 transition-shadow hover:shadow-md`}
		>
			{Icon && (
				<div className={`${classes.iconBg} rounded-lg p-2 shrink-0`}>
					<Icon size={20} />
				</div>
			)}
			<div className="flex-1 min-w-0">
				<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{label}
				</div>
				<div className={`text-2xl font-bold ${classes.fg} mt-0.5 truncate`}>{value}</div>
				<div className="flex items-center gap-2 mt-1 min-h-[1rem]">
					{sublabel && (
						<span className="text-xs text-muted-foreground truncate">{sublabel}</span>
					)}
					{showTrend && (
						<span
							className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`}
						>
							{trend > 0 ?
								<TrendingUp size={12} />
							:	<TrendingDown size={12} />}
							{Math.abs(trend).toFixed(1)}%
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
