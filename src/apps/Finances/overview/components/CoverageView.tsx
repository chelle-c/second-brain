import { format } from "date-fns";
import {
	AlertCircle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Target,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currencyUtils";
import { calculateIncomeRequirements } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { StatCard } from "./StatCard";

export const CoverageView: React.FC = () => {
	const { expenses } = useExpenseStore();
	const { incomeEntries } = useIncomeStore();
	const { expenseCurrency } = useSettingsStore();

	const [selectedMonth, setSelectedMonth] = useState(new Date());

	const requirements = useMemo(
		() => calculateIncomeRequirements(incomeEntries, expenses, selectedMonth),
		[incomeEntries, expenses, selectedMonth],
	);

	const navigateMonth = (direction: 1 | -1) => {
		const newDate = new Date(selectedMonth);
		newDate.setMonth(newDate.getMonth() + direction);
		setSelectedMonth(newDate);
	};

	const needsMet = requirements.needsGap >= 0;
	const fullyFunded = requirements.fullGap >= 0;

	return (
		<div className="space-y-4">
			{/* Header + Month Navigation */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Income Coverage</h2>
					<p className="text-sm text-muted-foreground">
						How well your income covers your expenses
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => navigateMonth(-1)}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						title="Previous month"
					>
						<ChevronLeft size={18} />
					</button>
					<div className="px-3 py-1 font-semibold text-foreground min-w-[140px] text-center">
						{format(selectedMonth, "MMMM yyyy")}
					</div>
					<button
						type="button"
						onClick={() => navigateMonth(1)}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						title="Next month"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Income This Month"
					value={formatCurrency(requirements.actualIncome, expenseCurrency)}
					icon={DollarSign}
					tone="positive"
				/>
				<StatCard
					label="Needs Required"
					value={formatCurrency(requirements.needsTotal, expenseCurrency)}
					icon={Target}
					tone="neutral"
					sublabel="Essential expenses"
				/>
				<StatCard
					label="Total Required"
					value={formatCurrency(requirements.allExpensesTotal, expenseCurrency)}
					icon={Target}
					tone="warning"
					sublabel="Needs + Wants"
				/>
				<StatCard
					label="After Everything"
					value={formatCurrency(requirements.fullGap, expenseCurrency)}
					icon={fullyFunded ? CheckCircle2 : AlertCircle}
					tone={fullyFunded ? "positive" : "negative"}
					sublabel={fullyFunded ? "Surplus" : "Shortfall"}
				/>
			</div>

			{/* Coverage Visualization */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-6">
				<h3 className="text-base font-semibold text-foreground mb-4">Coverage Breakdown</h3>

				<div className="space-y-5">
					{/* Needs Coverage */}
					<CoverageBar
						label="Essential Needs"
						required={requirements.needsTotal}
						actual={requirements.actualIncome}
						gap={requirements.needsGap}
						coverage={requirements.needsCoverage}
						currency={expenseCurrency}
						isMet={needsMet}
					/>

					{/* Full Coverage (Needs + Wants) */}
					<CoverageBar
						label="All Expenses (Needs + Wants)"
						required={requirements.allExpensesTotal}
						actual={requirements.actualIncome}
						gap={requirements.fullGap}
						coverage={requirements.fullCoverage}
						currency={expenseCurrency}
						isMet={fullyFunded}
					/>
				</div>
			</div>

			{/* Breakdown Table */}
			<div className="bg-card rounded-xl shadow-lg border border-border p-6">
				<h3 className="text-base font-semibold text-foreground mb-4">
					Requirement Summary
				</h3>
				<div className="space-y-3">
					<SummaryRow
						label="Income recorded"
						value={formatCurrency(requirements.actualIncome, expenseCurrency)}
						emphasis
					/>
					<div className="border-t border-border" />
					<SummaryRow
						label="Less: Essential needs"
						value={`− ${formatCurrency(requirements.needsTotal, expenseCurrency)}`}
					/>
					<SummaryRow
						label="Discretionary after needs"
						value={formatCurrency(requirements.needsGap, expenseCurrency)}
						tone={needsMet ? "positive" : "negative"}
						emphasis
					/>
					<div className="border-t border-border" />
					<SummaryRow
						label="Less: Wants"
						value={`− ${formatCurrency(requirements.wantsTotal, expenseCurrency)}`}
					/>
					<SummaryRow
						label="Remaining after everything"
						value={formatCurrency(requirements.fullGap, expenseCurrency)}
						tone={fullyFunded ? "positive" : "negative"}
						emphasis
					/>
				</div>
			</div>
		</div>
	);
};

// ============================================
// Sub-components
// ============================================

interface CoverageBarProps {
	label: string;
	required: number;
	actual: number;
	gap: number;
	coverage: number;
	currency: string;
	isMet: boolean;
}

const CoverageBar: React.FC<CoverageBarProps> = ({
	label,
	required,
	actual,
	gap,
	coverage,
	currency,
	isMet,
}) => {
	// Clamp display bar to 100%, but surface the real number
	const barWidth = Math.min(coverage, 100);

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium text-foreground">{label}</span>
				<span
					className={`text-sm font-semibold ${
						isMet ? "text-[var(--chart-2)]" : "text-destructive"
					}`}
				>
					{coverage.toFixed(0)}% covered
				</span>
			</div>

			<div className="relative h-8 bg-muted rounded-lg overflow-hidden">
				<div
					className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
						isMet ? "bg-[var(--chart-2)]" : "bg-destructive"
					}`}
					style={{ width: `${barWidth}%` }}
				/>
				{/* Target line at 100% */}
				{coverage > 100 && (
					<div className="absolute inset-y-0 right-0 w-[2px] bg-foreground/40" />
				)}
			</div>

			<div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
				<span>Required: {formatCurrency(required, currency)}</span>
				<span>
					{isMet ? "Surplus" : "Shortfall"}:{" "}
					<strong className={isMet ? "text-[var(--chart-2)]" : "text-destructive"}>
						{formatCurrency(Math.abs(gap), currency)}
					</strong>
				</span>
				<span>Earned: {formatCurrency(actual, currency)}</span>
			</div>
		</div>
	);
};

interface SummaryRowProps {
	label: string;
	value: string;
	tone?: "positive" | "negative";
	emphasis?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, tone, emphasis = false }) => {
	const valueColor =
		tone === "positive" ? "text-[var(--chart-2)]"
		: tone === "negative" ? "text-destructive"
		: "text-foreground";

	return (
		<div className="flex items-center justify-between">
			<span
				className={`text-sm ${emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label}
			</span>
			<span className={`text-sm ${emphasis ? "font-bold" : "font-medium"} ${valueColor}`}>
				{value}
			</span>
		</div>
	);
};
