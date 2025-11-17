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

	// Sync local state when weeklyTarget prop changes
	useEffect(() => {
		setNewTargetAmount(weeklyTarget.amount.toString());
	}, [weeklyTarget.amount]);

	const targetProgress = (weeklyTotal / weeklyTarget.amount) * 100;
	const remainingAmount = Math.max(0, weeklyTarget.amount - weeklyTotal);

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
			setWeeklyTarget({
				amount: incomeWeeklyTargets.filter(
					(target) => target.id === selectedWeek.toString()
				)[0].amount,
			});
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
		<div className="w-full min-h-61 bg-white rounded-lg shadow p-6">
			{/* Header */}
			<div className="flex items-start justify-between mb-2">
				<div className="w-full text-right">
					<div className="w-full flex flex-row items-start justify-between mb-3">
						<h3 className="text-xl font-medium text-gray-800">Weekly Target</h3>
						{!editingTarget ? (
							<div className="flex items-center gap-2">
								<div className="text-xl font-bold text-emerald-700">
									${savedWeeklyTarget.toFixed(2)}
								</div>
								<button
									onClick={startEditingTarget}
									className="border border-transparent text-blue-600 hover:border-blue-600 p-1 rounded transition-colors cursor-pointer"
									title="Edit weekly target"
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
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
								</button>
							</div>
						) : (
							<div className="flex flex-col items-end justify-between">
								<div className="flex gap-2 items-center">
									<span className="relative left-1 text-gray-500 text-lg">$</span>
									<input
										type="number"
										step="0.01"
										min="0"
										value={newTargetAmount}
										onChange={(e) => setNewTargetAmount(e.target.value)}
										onKeyDown={handleKeyPress}
										className="w-36 px-3 py-2 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="Target amount"
										autoFocus
									/>
								</div>
								<div className="w-full flex justify-end my-1 gap-4">
									<button
										onClick={handleUpdateTarget}
										className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
									>
										Save
									</button>
									<button
										onClick={cancelEditingTarget}
										className="px-3 py-1 text-sm bg-gray-300 text-gray-700 hover:bg-gray-400 cursor-pointer"
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Weekly Target Section */}
			<div className="mb-2">
				{/* Progress Bar with Integrated Stats */}
				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<div className="text-sm text-gray-600">Earned</div>
						<div className="text-sm text-gray-600">Target</div>
					</div>

					<div className="w-full bg-zinc-300 rounded-full h-5 relative flex items-center justify-start">
						<div
							className="bg-emerald-500 h-5 rounded-full transition-width duration-300"
							style={{
								width: `${Math.min(targetProgress, 100)}%`,
								height: `${
									targetProgress < 5 ? `${targetProgress * 70}%` : "100%"
								}`,
							}}
						>
							&nbsp;
						</div>

						{/* Current amount indicator */}
						{weeklyTotal > 0 && (
							<div
								className="absolute top-0 h-5 flex items-center justify-center text-md font-medium text-gray-50"
								style={{
									left: `${Math.min(targetProgress, 100)}%`,
									transform: "translateX(-125%)",
								}}
							>
								${weeklyTotal.toFixed(0)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Target Status Message */}
			{weeklyTotal >= weeklyTarget.amount && weeklyTarget.amount > 0 && (
				<div className="mt-4 p-3 bg-emerald-100 border border-emerald-200 rounded-lg">
					<div className="flex items-center justify-center">
						<div className="text-center text-emerald-700">
							<div className="inline-flex items-center gap-2 font-medium text-lg">
								<svg
									className="w-5 h-5 text-emerald-600 mr-2"
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
								<span>Target reached!</span>
								<span>🎉</span>
							</div>
							<div className="mt-1 text-sm">
								{targetProgress.toFixed(1)}% Complete
							</div>
						</div>
					</div>
				</div>
			)}

			{weeklyTotal > 0 && weeklyTotal < weeklyTarget.amount && (
				<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<div className="text-center text-blue-700">
						<div className="font-semibold text-lg">
							{targetProgress.toFixed(1)}% Complete
						</div>
						<div className="text-sm mt-1">
							${remainingAmount.toFixed(2)} remaining to reach target
						</div>
					</div>
				</div>
			)}

			{weeklyTotal === 0 && (
				<div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
					<div className="text-center text-gray-700">
						<div className="font-semibold">No earnings yet this week</div>
						<div className="text-sm mt-1">
							Add income entries to track your progress
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default WeeklySummary;
