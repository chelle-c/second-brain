import { Check, CheckCircle, Pencil, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface WeeklySummaryProps {
	weeklyTotal: number;
	selectedWeek: number;
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({
	weeklyTotal,
	selectedWeek,
}) => {
	const {
		incomeWeeklyTargets,
		addIncomeWeeklyTarget,
		updateIncomeWeeklyTarget,
	} = useIncomeStore();
	const { incomeCurrency, incomeDefaultWeeklyTarget } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);

	const [weeklyTarget, setWeeklyTarget] = useState({
		amount: incomeDefaultWeeklyTarget,
	});
	const [editingTarget, setEditingTarget] = useState(false);
	const [newTargetAmount, setNewTargetAmount] = useState(
		weeklyTarget.amount.toString(),
	);

	useEffect(() => {
		const savedTarget =
			incomeWeeklyTargets?.find(
				(target) => target.id === selectedWeek.toString(),
			)?.amount || incomeDefaultWeeklyTarget;
		setWeeklyTarget({ amount: savedTarget });
	}, [incomeWeeklyTargets, selectedWeek, incomeDefaultWeeklyTarget]);

	useEffect(() => {
		setNewTargetAmount(weeklyTarget.amount.toString());
	}, [weeklyTarget.amount]);

	const targetProgress = (weeklyTotal / weeklyTarget.amount) * 100;
	const remainingAmount = Math.max(0, weeklyTarget.amount - weeklyTotal);
	const isTargetReached = weeklyTotal >= weeklyTarget.amount;

	const savedWeeklyTarget =
		incomeWeeklyTargets?.find((target) => target.id === selectedWeek.toString())
			?.amount || incomeDefaultWeeklyTarget;

	const handleUpdateTarget = () => {
		const amount = parseFloat(newTargetAmount);
		if (!Number.isNaN(amount) && amount > 0) {
			setEditingTarget(false);
			const existingTarget = incomeWeeklyTargets
				? incomeWeeklyTargets.find(
						(target) => target.id === selectedWeek.toString(),
					)
				: undefined;
			existingTarget === undefined
				? addIncomeWeeklyTarget(selectedWeek.toString(), amount)
				: updateIncomeWeeklyTarget({ id: selectedWeek.toString(), amount });
			setWeeklyTarget({ amount });
		}
	};

	const startEditingTarget = () => {
		setNewTargetAmount(weeklyTarget.amount.toString());
		setEditingTarget(true);
	};

	const cancelEditingTarget = () => {
		setEditingTarget(false);
		setNewTargetAmount(weeklyTarget.amount.toString());
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleUpdateTarget();
		} else if (e.key === "Escape") {
			cancelEditingTarget();
		}
	};

	return (
		<div className="bg-card rounded-xl shadow-lg p-4 h-full flex flex-col items-stretch">
			<div className="pb-2">
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
						Weekly Target
					</span>
					{!editingTarget ? (
						<div className="flex items-center gap-1.5">
							<span className="text-lg font-bold text-primary">
								{currencySymbol}
								{savedWeeklyTarget.toFixed(0)}
							</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={startEditingTarget}
								title="Edit target"
							>
								<Pencil className="w-3.5 h-3.5" />
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<div className="flex items-center">
								<span className="text-muted-foreground text-sm mr-1">
									{currencySymbol}
								</span>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={newTargetAmount}
									onChange={(e) => setNewTargetAmount(e.target.value)}
									onKeyDown={handleKeyPress}
									className="w-20 h-8"
									autoFocus
								/>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleUpdateTarget}
							>
								<Check className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={cancelEditingTarget}
							>
								<X className="w-4 h-4" />
							</Button>
						</div>
					)}
				</div>
			</div>
			<div className="flex-1 flex flex-col justify-center">
				{/* Progress Bar */}
				<div className="flex justify-between text-sm font-medium text-muted-foreground mb-1.5">
					<span>
						{currencySymbol}
						{weeklyTotal.toFixed(0)} earned
					</span>
					<span>{Math.min(targetProgress, 100).toFixed(0)}%</span>
				</div>
				<div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-300 ${
							isTargetReached ? "bg-emerald-500" : "bg-primary"
						}`}
						style={{ width: `${Math.min(targetProgress, 100)}%` }}
					/>
				</div>

				{/* Status */}
				<div className="mt-3">
					{isTargetReached ? (
						<div className="flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-500/10 rounded-md py-2 px-3">
							<CheckCircle className="w-4 h-4" />
							<span className="text-md font-medium">Target reached!</span>
						</div>
					) : weeklyTotal > 0 ? (
						<div className="text-center text-xs text-muted-foreground bg-muted rounded-md py-2 px-3">
							<span className="font-medium text-primary">
								{currencySymbol}
								{remainingAmount.toFixed(0)}
							</span>{" "}
							remaining
						</div>
					) : (
						<div className="text-center text-xs text-muted-foreground bg-muted rounded-md py-2 px-3">
							No earnings yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default WeeklySummary;
