import React from "react";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { Button } from "@/components/ui/button";

type ViewTabsProps = {};

const ViewTabs: React.FC<ViewTabsProps> = () => {
	const { incomeViewType, updateIncomeViewType } = useIncomeStore();

	return (
		<div className="w-full lg:w-auto bg-white rounded-lg shadow p-6">
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-col md:flex-row lg:items-center lg:justify-between space-x-1 rounded-lg bg-gray-100 p-1">
					<Button
						onClick={() => updateIncomeViewType("weekly")}
						className={`flex-1 whitespace-nowrap py-2 px-4 rounded-md font-medium transition-colors ${
							incomeViewType === "weekly"
								? "bg-white text-blue-500 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
								: "px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
						}`}
					>
						Weekly View
					</Button>
					<Button
						onClick={() => updateIncomeViewType("monthly")}
						className={`flex-1 whitespace-nowrap py-2 px-4 rounded-md font-medium transition-colors ${
							incomeViewType === "monthly"
								? "bg-white text-blue-500 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
								: "px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
						}`}
					>
						Monthly View
					</Button>
					<Button
						onClick={() => updateIncomeViewType("yearly")}
						className={`flex-1 whitespace-nowrap py-2 px-4 rounded-md font-medium transition-colors ${
							incomeViewType === "yearly"
								? "bg-white text-blue-500 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
								: "px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
						}`}
					>
						Yearly View
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ViewTabs;
