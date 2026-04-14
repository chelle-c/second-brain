import { format } from "date-fns";
import {
	Archive,
	CircleDot,
	CircleSlash,
	Heart,
	Repeat,
	RotateCcw,
	Scissors,
	Star,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currencyUtils";
import { getSubscriptions } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { SubscriptionRow, SubscriptionStatus } from "@/types/overview";
import { StatCard } from "./StatCard";

// "cancel" status uses chart-3 (purple-ish by default) so it's visually
// distinct from the destructive-red Cancel/Archive action button.
const STATUS_CONFIG: Record<
	SubscriptionStatus,
	{ label: string; icon: React.ComponentType<{ size?: number }>; activeClass: string }
> = {
	important: {
		label: "Important",
		icon: Star,
		activeClass: "bg-(--chart-2)/15 text-chart-2",
	},
	wanted: {
		label: "Wanted",
		icon: Heart,
		activeClass: "bg-(--chart-4)/15 text-chart-4",
	},
	cancel: {
		label: "Consider cancelling",
		icon: CircleSlash,
		activeClass: "bg-(--chart-3)/15 text-chart-3",
	},
};

const STATUS_ORDER: SubscriptionStatus[] = ["important", "wanted", "cancel"];

const effectiveStatus = (s: SubscriptionStatus | undefined): SubscriptionStatus => s ?? "wanted";

export const SubscriptionsView: React.FC = () => {
	const { expenses, archiveExpense, unarchiveExpense, setSubscriptionStatus } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();

	const subs = useMemo(() => getSubscriptions(expenses), [expenses]);
	const active = subs.filter((s) => s.isActive);
	const inactive = subs.filter((s) => !s.isActive);

	const activeMonthlyTotal = active.reduce((s, x) => s + x.monthlyCost, 0);

	const byStatus = useMemo(() => {
		const result = { important: 0, wanted: 0, cancel: 0 };
		for (const s of active) result[effectiveStatus(s.status)] += s.monthlyCost;
		return result;
	}, [active]);

	const handleCancel = (id: string) => {
		setSubscriptionStatus(id, "cancel");
		archiveExpense(id);
	};

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold text-foreground">Subscriptions</h2>
				<p className="text-sm text-muted-foreground">
					Manage recurring services and their ongoing cost
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Active subscriptions"
					value={active.length.toString()}
					icon={Repeat}
					tone="neutral"
					sublabel={`${formatCurrencyCompact(activeMonthlyTotal, expenseCurrency)}/mo`}
				/>
				<StatCard
					label="Important"
					value={formatCurrency(byStatus.important, expenseCurrency)}
					icon={Star}
					tone="positive"
					sublabel="keep"
				/>
				<StatCard
					label="Wanted"
					value={formatCurrency(byStatus.wanted, expenseCurrency)}
					icon={Heart}
					tone="warning"
					sublabel="nice to have"
				/>
				<StatCard
					label="To reconsider"
					value={formatCurrency(byStatus.cancel, expenseCurrency)}
					icon={Scissors}
					tone="neutral"
					sublabel="potential savings"
				/>
			</div>

			{/* ─── Active list ────────────────────────────────── */}
			<div className="bg-card rounded-xl shadow-sm border border-border p-5">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-base font-semibold text-foreground">Active</h3>
					<span className="text-sm text-muted-foreground">
						{formatCurrency(activeMonthlyTotal, expenseCurrency)}/mo
					</span>
				</div>

				{active.length === 0 ?
					<EmptyState
						primary="No active subscriptions."
						secondary='Add recurring expenses under the "Subscriptions" category.'
					/>
				:	<div className="space-y-2">
						{active.map((row) => (
							<SubscriptionRowItem
								key={row.expense.id}
								row={row}
								currency={expenseCurrency}
								onSetStatus={(status) =>
									setSubscriptionStatus(row.expense.id, status)
								}
								onCancel={() => handleCancel(row.expense.id)}
							/>
						))}
					</div>
				}
			</div>

			{/* ─── Inactive list ──────────────────────────────── */}
			{inactive.length > 0 && (
				<div className="bg-card rounded-xl shadow-sm border border-border p-5 opacity-90">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
							<Archive size={14} /> Inactive / Cancelled
						</h3>
						<span className="text-sm text-muted-foreground">
							{inactive.length} item{inactive.length !== 1 ? "s" : ""}
						</span>
					</div>
					<div className="space-y-2">
						{inactive.map((row) => (
							<div
								key={row.expense.id}
								className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
							>
								<CircleDot size={14} className="text-muted-foreground shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="font-medium text-foreground/70 truncate line-through">
										{row.expense.name}
									</div>
									<div className="text-xs text-muted-foreground truncate">
										{row.expense.category}
										{" · "}
										{formatCurrency(row.monthlyCost, expenseCurrency)}/mo
										{" · archived "}
										{format(row.expense.updatedAt, "MMM d, yyyy")}
									</div>
								</div>
								<button
									type="button"
									onClick={() => unarchiveExpense(row.expense.id)}
									className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-primary hover:bg-primary/10 cursor-pointer"
								>
									<RotateCcw size={12} /> Reactivate
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

// ============================================
// Sub-components
// ============================================

interface SubscriptionRowItemProps {
	row: SubscriptionRow;
	currency: string;
	onSetStatus: (status: SubscriptionStatus) => void;
	onCancel: () => void;
}

const SubscriptionRowItem: React.FC<SubscriptionRowItemProps> = ({
	row,
	currency,
	onSetStatus,
	onCancel,
}) => {
	const { expense, monthlyCost } = row;
	const status = effectiveStatus(row.status);
	const cfg = STATUS_CONFIG[status];
	const BadgeIcon = cfg.icon;

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg border border-border flex-wrap">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-medium text-foreground truncate">{expense.name}</span>
					<span
						className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${cfg.activeClass}`}
					>
						<BadgeIcon size={10} />
						{cfg.label}
					</span>
				</div>
				<div className="text-xs text-muted-foreground truncate">
					{formatCurrency(monthlyCost, currency)}/mo
					{expense.recurrence?.frequency &&
						expense.recurrence.frequency !== "monthly" && (
							<> · {expense.recurrence.frequency}</>
						)}
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div
					className="inline-flex rounded-lg border border-border overflow-hidden bg-muted/40"
					role="radiogroup"
					aria-label="Subscription status"
				>
					{STATUS_ORDER.map((s, i) => {
						const opt = STATUS_CONFIG[s];
						const Icon = opt.icon;
						const isActive = status === s;
						return (
							<button
								key={s}
								type="button"
								role="radio"
								aria-checked={isActive}
								onClick={() => onSetStatus(s)}
								className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
									i > 0 ? "border-l border-border" : ""
								} ${
									isActive ?
										opt.activeClass
									:	"text-muted-foreground hover:text-foreground hover:bg-accent"
								}`}
							>
								<Icon size={12} />
								{opt.label}
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onCancel}
					className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer"
					title="Archive this subscription as cancelled"
				>
					<Archive size={12} /> Cancel
				</button>
			</div>
		</div>
	);
};

const EmptyState: React.FC<{ primary: string; secondary?: string }> = ({ primary, secondary }) => (
	<div className="py-10 text-center">
		<Repeat size={36} className="mx-auto text-muted-foreground mb-2" />
		<p className="text-sm text-muted-foreground">{primary}</p>
		{secondary && <p className="text-xs text-muted-foreground mt-1">{secondary}</p>}
	</div>
);
