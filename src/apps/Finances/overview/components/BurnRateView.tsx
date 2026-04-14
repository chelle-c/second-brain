import { addMonths, format, isBefore, isSameMonth, startOfDay, subMonths } from "date-fns";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currencyUtils";
import { getExpensesForMonth } from "@/lib/financeOverview";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useOverviewStore } from "@/stores/useOverviewStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Expense } from "@/types/expense";
import type { BurnRateCustomView } from "@/types/overview";

const MAX_OFFSET = 6;

type ExpenseStatus = "paid" | "overdue" | "upcoming";

const getExpenseStatus = (e: Expense): ExpenseStatus => {
	if (e.isPaid) return "paid";
	if (e.dueDate && isBefore(startOfDay(e.dueDate), startOfDay(new Date()))) return "overdue";
	return "upcoming";
};

const STATUS_STYLES: Record<
	ExpenseStatus,
	{
		icon: React.ComponentType<{ size?: number; className?: string }>;
		row: string;
		text: string;
		label: string;
	}
> = {
	paid: {
		icon: CheckCircle2,
		row: "bg-(--chart-2)/5 border-(--chart-2)/30",
		text: "text-chart-2",
		label: "Paid",
	},
	upcoming: {
		icon: Clock,
		row: "bg-card border-border",
		text: "text-muted-foreground",
		label: "Upcoming",
	},
	overdue: {
		icon: AlertTriangle,
		row: "bg-(--chart-4)/10 border-(--chart-4)/40",
		text: "text-chart-4",
		label: "Overdue",
	},
};

export const BurnRateView: React.FC = () => {
	const { expenses, categoryColors, toggleExpensePaid } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const {
		burnRateViews,
		activeBurnRateViewId,
		setActiveBurnRateView,
		addBurnRateView,
		updateBurnRateView,
		deleteBurnRateView,
	} = useOverviewStore();

	const [anchor, setAnchor] = useState<Date>(new Date());
	const [showEditor, setShowEditor] = useState(false);
	const [editingView, setEditingView] = useState<BurnRateCustomView | null>(null);

	const activeView = useMemo<BurnRateCustomView>(() => {
		if (activeBurnRateViewId === "single") {
			return { id: "single", name: "Current Month", monthsBefore: 0, monthsAfter: 0 };
		}
		return (
			burnRateViews.find((v) => v.id === activeBurnRateViewId) ?? {
				id: "single",
				name: "Current Month",
				monthsBefore: 0,
				monthsAfter: 0,
			}
		);
	}, [activeBurnRateViewId, burnRateViews]);

	const months = useMemo(() => {
		const arr: Date[] = [];
		for (let i = activeView.monthsBefore; i > 0; i--) arr.push(subMonths(anchor, i));
		arr.push(anchor);
		for (let i = 1; i <= activeView.monthsAfter; i++) arr.push(addMonths(anchor, i));
		return arr;
	}, [anchor, activeView]);

	const monthlyData = useMemo(() => {
		return months.map((m) => {
			const needs = getExpensesForMonth(expenses, m).filter((e) => e.type === "need");
			const total = needs.reduce((sum, e) => sum + e.amount, 0);
			const remaining = needs.filter((e) => !e.isPaid).reduce((sum, e) => sum + e.amount, 0);
			return {
				date: m,
				key: format(m, "yyyy-MM"),
				label: format(m, "MMMM yyyy"),
				needs: [...needs].sort((a, b) => b.amount - a.amount),
				total,
				remaining,
				isCurrent: isSameMonth(m, new Date()),
				isAnchor: isSameMonth(m, anchor),
			};
		});
	}, [months, expenses, anchor]);

	// Auto-expand the anchor month whenever the anchor or view changes.
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
	useEffect(() => {
		setExpandedKeys(new Set([format(anchor, "yyyy-MM")]));
	}, [anchor, activeView.id]);

	const toggle = (key: string) =>
		setExpandedKeys((prev) => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});

	const navigate = (dir: 1 | -1) =>
		setAnchor((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));

	return (
		<div className="space-y-4">
			{/* ─── Header ──────────────────────────────────────────── */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Burn Rate</h2>
					<p className="text-sm text-muted-foreground">
						Essential expenses, month by month
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						title="Previous month"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						type="button"
						onClick={() => setAnchor(new Date())}
						className="px-3 py-1 font-semibold text-foreground min-w-36 text-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
						title="Jump to current month"
					>
						{format(anchor, "MMMM yyyy")}
					</button>
					<button
						type="button"
						onClick={() => navigate(1)}
						className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						title="Next month"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>

			{/* ─── View selector ──────────────────────────────────── */}
			<div className="flex items-center gap-2 flex-wrap">
				<ViewChip
					label="Current Month"
					active={activeBurnRateViewId === "single"}
					onClick={() => setActiveBurnRateView("single")}
				/>
				{burnRateViews.map((v) => (
					<ViewChip
						key={v.id}
						label={`${v.name} (${v.monthsBefore + v.monthsAfter + 1}mo)`}
						active={activeBurnRateViewId === v.id}
						onClick={() => setActiveBurnRateView(v.id)}
						onEdit={() => {
							setEditingView(v);
							setShowEditor(true);
						}}
					/>
				))}
				<button
					type="button"
					onClick={() => {
						setEditingView(null);
						setShowEditor(true);
					}}
					className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-solid hover:bg-accent transition-colors cursor-pointer"
				>
					<Plus size={12} /> New view
				</button>
			</div>

			{showEditor && (
				<ViewEditor
					initial={editingView}
					onCancel={() => setShowEditor(false)}
					onDelete={
						editingView ?
							() => {
								deleteBurnRateView(editingView.id);
								setShowEditor(false);
							}
						:	undefined
					}
					onSave={(data) => {
						if (editingView) updateBurnRateView(editingView.id, data);
						else addBurnRateView(data);
						setShowEditor(false);
					}}
				/>
			)}

			{/* ─── Month cards ────────────────────────────────────── */}
			<div className="grid grid-cols-1 gap-3">
				{monthlyData.map((m) => {
					const expanded = expandedKeys.has(m.key);
					const allPaid = m.remaining === 0 && m.total > 0;
					return (
						<div
							key={m.key}
							className={`bg-card rounded-xl shadow-sm border transition-all ${
								m.isAnchor ? "border-primary/60 shadow-md" : "border-border"
							}`}
						>
							{/* Full-width clickable header */}
							<button
								type="button"
								onClick={() => toggle(m.key)}
								aria-expanded={expanded}
								className="w-full flex items-center justify-between gap-3 p-5 cursor-pointer text-left rounded-xl hover:bg-accent/20 transition-colors"
							>
								<div className="flex items-center gap-3 min-w-0">
									<div
										className={`text-sm font-semibold truncate ${
											m.isCurrent ? "text-primary" : "text-foreground"
										}`}
									>
										{m.label}
										{m.isCurrent && (
											<span className="ml-2 text-xs font-normal text-primary/80">
												(current)
											</span>
										)}
									</div>
									<span className="text-xs text-muted-foreground shrink-0">
										{m.needs.length} essential
										{m.needs.length !== 1 ? "s" : ""}
									</span>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									{/* Total + remaining */}
									<div className="text-right">
										<div className="text-lg font-bold text-foreground leading-tight">
											{formatCurrency(m.total, expenseCurrency)}
										</div>
										<div
											className={`text-xs leading-tight ${
												allPaid ? "text-chart-2" : "text-muted-foreground"
											}`}
										>
											{allPaid ?
												"All paid"
											:	`${formatCurrency(m.remaining, expenseCurrency)} remaining`
											}
										</div>
									</div>
									<ChevronDown
										size={18}
										className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
									/>
								</div>
							</button>

							{/* Animated collapsible body — grid-rows trick lets height
							    animate without measuring content. */}
							<div
								className="grid transition-[grid-template-rows] duration-300 ease-out"
								style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
							>
								<div className="overflow-hidden">
									<div className="px-5 pb-5 space-y-1.5 border-t border-border pt-3">
										{m.needs.length === 0 ?
											<div className="py-4 text-center text-sm text-muted-foreground">
												No essential expenses for this month.
											</div>
										:	m.needs.map((expense) => {
												const status = getExpenseStatus(expense);
												const style = STATUS_STYLES[status];
												const StatusIcon = style.icon;
												const color =
													categoryColors[expense.category] ||
													"var(--chart-1)";
												return (
													<div
														key={expense.id}
														className={`flex items-center gap-3 py-2 px-2.5 rounded-md border transition-colors ${style.row}`}
													>
														<div
															className="shrink-0 w-1 h-8 rounded-full"
															style={{ backgroundColor: color }}
														/>
														<StatusIcon
															size={16}
															className={`shrink-0 ${style.text}`}
														/>
														<div className="flex-1 min-w-0">
															<div className="font-medium text-foreground truncate">
																{expense.name}
															</div>
															<div className="text-xs text-muted-foreground truncate">
																{expense.category}
																{expense.dueDate && (
																	<>
																		{" · due "}
																		{format(
																			expense.dueDate,
																			"MMM d",
																		)}
																	</>
																)}
																<span
																	className={`ml-2 ${style.text}`}
																>
																	{style.label}
																</span>
															</div>
														</div>
														<div className="text-right shrink-0 font-semibold text-foreground">
															{formatCurrency(
																expense.amount,
																expenseCurrency,
															)}
														</div>
														{!expense.isPaid && (
															<button
																type="button"
																onClick={() =>
																	toggleExpensePaid(
																		expense.id,
																		new Date(),
																	)
																}
																className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-(--chart-2)/40 bg-card text-chart-2 hover:bg-(--chart-2)/15 active:bg-(--chart-2)/25 transition-colors cursor-pointer"
																title="Mark as paid"
															>
																<Check size={12} /> Mark paid
															</button>
														)}
													</div>
												);
											})
										}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{months.length > 1 && (
				<div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						Total across {months.length} month{months.length !== 1 ? "s" : ""}
					</span>
					<span className="text-lg font-bold text-foreground">
						{formatCurrencyCompact(
							monthlyData.reduce((s, m) => s + m.total, 0),
							expenseCurrency,
						)}
					</span>
				</div>
			)}
		</div>
	);
};

// ============================================
// Sub-components
// ============================================

interface ViewChipProps {
	label: string;
	active: boolean;
	onClick: () => void;
	onEdit?: () => void;
}

const ViewChip: React.FC<ViewChipProps> = ({ label, active, onClick, onEdit }) => (
	<div
		className={`inline-flex items-center rounded-md text-xs font-medium transition-colors ${
			active ?
				"bg-primary text-primary-foreground shadow-sm"
			:	"bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
		}`}
	>
		<button type="button" onClick={onClick} className="px-2.5 py-1 cursor-pointer">
			{label}
		</button>
		{onEdit && (
			<button
				type="button"
				onClick={onEdit}
				className="pr-1.5 pl-0.5 cursor-pointer opacity-70 hover:opacity-100"
				title="Edit view"
			>
				<Pencil size={10} />
			</button>
		)}
	</div>
);

interface ViewEditorProps {
	initial: BurnRateCustomView | null;
	onCancel: () => void;
	onSave: (data: Omit<BurnRateCustomView, "id">) => void;
	onDelete?: () => void;
}

const ViewEditor: React.FC<ViewEditorProps> = ({ initial, onCancel, onSave, onDelete }) => {
	const [name, setName] = useState(initial?.name ?? "Custom");
	const [before, setBefore] = useState(initial?.monthsBefore ?? 1);
	const [after, setAfter] = useState(initial?.monthsAfter ?? 1);

	const clamp = (n: number) => Math.max(0, Math.min(MAX_OFFSET, Math.floor(n)));

	return (
		<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
			<div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
				<h3 className="text-base font-semibold text-foreground mb-4">
					{initial ? "Edit view" : "New custom view"}
				</h3>
				<div className="space-y-4">
					<label className="block">
						<span className="text-xs font-medium text-muted-foreground">Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
							maxLength={30}
						/>
					</label>
					<div className="grid grid-cols-2 gap-3">
						<label className="block">
							<span className="text-xs font-medium text-muted-foreground">
								Months before (0–{MAX_OFFSET})
							</span>
							<input
								type="number"
								min={0}
								max={MAX_OFFSET}
								value={before}
								onChange={(e) => setBefore(clamp(Number(e.target.value)))}
								className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-muted-foreground">
								Months after (0–{MAX_OFFSET})
							</span>
							<input
								type="number"
								min={0}
								max={MAX_OFFSET}
								value={after}
								onChange={(e) => setAfter(clamp(Number(e.target.value)))}
								className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
							/>
						</label>
					</div>
					<div className="text-xs text-muted-foreground">
						Total span: {before + after + 1} month{before + after + 1 !== 1 ? "s" : ""}
					</div>
				</div>

				<div className="mt-6 flex items-center justify-between gap-2">
					{onDelete ?
						<button
							type="button"
							onClick={onDelete}
							className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 cursor-pointer"
						>
							<Trash2 size={12} /> Delete
						</button>
					:	<div />}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onCancel}
							className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() =>
								onSave({
									name: name.trim() || "Custom",
									monthsBefore: clamp(before),
									monthsAfter: clamp(after),
								})
							}
							className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
