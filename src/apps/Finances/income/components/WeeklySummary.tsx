import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil, CheckCircle } from "lucide-react";

interface WeeklySummaryProps {
	weeklyTotal: number;
	selectedWeek: number;
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({ weeklyTotal, selectedWeek }) => {
	const [weeklyTarget, setWeeklyTarget] = useState({ amount: 575 });
	const [editingTarget, setEditingTarget] = useState(false);
	const [newTargetAmount, setNewTargetAmount] = useState(weeklyTarget.amount.toString());

	const { incomeWeeklyTargets, addIncomeWeeklyTarget, updateIncomeWeeklyTarget } =
		useIncomeStore();
	const { incomeCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(incomeCurrency);

	useEffect(() => {
		const savedTarget =
			incomeWeeklyTargets?.find((target) => target.id === selectedWeek.toString())?.amount ||
			575;
		setWeeklyTarget({ amount: savedTarget });
	}, [incomeWeeklyTargets, selectedWeek]);

	useEffect(() => {
		setNewTargetAmount(weeklyTarget.amount.toString());
	}, [weeklyTarget.amount]);

	const targetProgress = (weeklyTotal / weeklyTarget.amount) * 100;
	const remainingAmount = Math.max(0, weeklyTarget.amount - weeklyTotal);
	const isTargetReached = weeklyTotal >= weeklyTarget.amount;

	const savedWeeklyTarget =
		incomeWeeklyTargets?.find((target) => target.id === selectedWeek.toString())?.amount || 575;

	const handleUpdateTarget = () => {
		const amount = parseFloat(newTargetAmount);
		if (!isNaN(amount) && amount > 0) {
			setEditingTarget(false);
			const existingTarget = incomeWeeklyTargets
				? incomeWeeklyTargets.find((target) => target.id === selectedWeek.toString())
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
		<div className="bg-white rounded-xl shadow-lg p-4 h-full flex flex-col items-stretch">
			<div className="pb-2">
				<div className="flex items-center justify-between">
					<span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
						Weekly Target
					</span>
					{!editingTarget ? (
						<div className="flex items-center gap-1.5">
							<span className="text-lg font-bold text-sky-600">
								{currencySymbol}{savedWeeklyTarget.toFixed(0)}
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
								<span className="text-gray-500 text-sm mr-1">{currencySymbol}</span>
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
							<Button variant="ghost" size="icon-sm" onClick={handleUpdateTarget}>
								<Check className="w-4 h-4" />
							</Button>
							<Button variant="ghost" size="icon-sm" onClick={cancelEditingTarget}>
								<X className="w-4 h-4" />
							</Button>
						</div>
					)}
				</div>
			</div>
			<div className="flex-1 flex flex-col justify-center">
				{/* Progress Bar */}
				<div className="flex justify-between text-sm font-medium text-gray-500 mb-1.5">
					<span>{currencySymbol}{weeklyTotal.toFixed(0)} earned</span>
					<span>{Math.min(targetProgress, 100).toFixed(0)}%</span>
				</div>
				<div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
					<div
						className={`h-full rounded-full transition-all duration-300 ${
							isTargetReached ? "bg-emerald-500" : "bg-sky-500"
						}`}
						style={{ width: `${Math.min(targetProgress, 100)}%` }}
					/>
				</div>

				{/* Status */}
				<div className="mt-3">
					{isTargetReached ? (
						<div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50 rounded-md py-2 px-3">
							<CheckCircle className="w-4 h-4" />
							<span className="text-md font-medium">Target reached!</span>
						</div>
					) : weeklyTotal > 0 ? (
						<div className="text-center text-xs text-gray-500 bg-gray-50 rounded-md py-2 px-3">
							<span className="font-medium text-sky-600">
								{currencySymbol}{remainingAmount.toFixed(0)}
							</span>{" "}
							remaining
						</div>
					) : (
						<div className="text-center text-xs text-gray-500 bg-gray-50 rounded-md py-2 px-3">
							No earnings yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default WeeklySummary;
