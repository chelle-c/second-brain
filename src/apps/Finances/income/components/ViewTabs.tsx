import React from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { AnimatedToggle } from "@/components/AnimatedToggle";

const viewModeOptions = [
	{ value: "weekly" as const, label: "Weekly", ariaLabel: "Show Weekly Income Summary" },
	{ value: "monthly" as const, label: "Monthly", ariaLabel: "Show Monthly Income Summary" },
	{ value: "yearly" as const, label: "Yearly", ariaLabel: "Show Yearly Income Summary" },
];

const ViewTabs: React.FC = () => {
	const { incomeViewType, updateIncomeViewType } = useIncomeStore();

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1.5 inline-flex">
			<AnimatedToggle
				options={viewModeOptions}
				value={incomeViewType}
				onChange={updateIncomeViewType}
				className="w-auto"
			/>
		</div>
	);
};

export default ViewTabs;
