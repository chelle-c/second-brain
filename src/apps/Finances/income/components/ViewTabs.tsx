import React from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { AnimatedToggle } from "@/components/AnimatedToggle";

const viewModeOptions = [
	{ value: "weekly" as const, label: "Weekly View", ariaLabel: "Show Weekly Income Summary" },
	{ value: "monthly" as const, label: "Monthly View", ariaLabel: "Show Monthly Income Summary" },
	{ value: "yearly" as const, label: "Yearly View", ariaLabel: "Show Yearly Income Summary" },
];

const ViewTabs: React.FC = () => {
	const { incomeViewType, updateIncomeViewType } = useIncomeStore();

	return (
		<div className="w-full lg:w-auto bg-white rounded-lg shadow p-1">
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-col md:flex-row lg:items-center lg:justify-between rounded-lg bg-gray-100">
					<AnimatedToggle
						options={viewModeOptions}
						value={incomeViewType}
						onChange={updateIncomeViewType}
						className="w-full sm:w-auto"
					/>
				</div>
			</div>
		</div>
	);
};

export default ViewTabs;
