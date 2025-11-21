import React, { useState, useEffect } from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";

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
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-full flex flex-col">
			{/* Header Row - Title and Target on same line */}
			<div className="flex items-center justify-between mb-4">
				<span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
					Weekly Target
				</span>
				{!editingTarget ? (
					<div className="flex items-center gap-1.5">
						<span className="text-lg font-bold text-sky-600">
							${savedWeeklyTarget.toFixed(0)}
						</span>
						<button
							onClick={startEditingTarget}
							className="p-1 text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
							title="Edit target"
						>
							<svg
								className="w-3.5 h-3.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<div className="flex items-center">
							<span className="text-gray-400 text-sm mr-1">$</span>
							<input
								type="number"
								step="0.01"
								min="0"
								value={newTargetAmount}
								onChange={(e) => setNewTargetAmount(e.target.value)}
								onKeyDown={handleKeyPress}
								className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
								autoFocus
							/>
						</div>
						<button
							onClick={handleUpdateTarget}
							className="p-1 text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</button>
						<button
							onClick={cancelEditingTarget}
							className="p-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				)}
			</div>

			{/* Progress Bar */}
			<div className="flex-1 flex flex-col justify-center">
				<div className="flex justify-between text-xs text-gray-500 mb-1.5">
					<span>${weeklyTotal.toFixed(0)} earned</span>
					<span>{Math.min(targetProgress, 100).toFixed(0)}%</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
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
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span className="text-sm font-medium">Target reached! 🎉</span>
						</div>
					) : weeklyTotal > 0 ? (
						<div className="text-center text-xs text-gray-500 bg-gray-50 rounded-md py-2 px-3">
							<span className="font-medium text-sky-600">
								${remainingAmount.toFixed(0)}
							</span>{" "}
							remaining
						</div>
					) : (
						<div className="text-center text-xs text-gray-400 bg-gray-50 rounded-md py-2 px-3">
							No earnings yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default WeeklySummary;
