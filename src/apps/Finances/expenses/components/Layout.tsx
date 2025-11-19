import { Tag } from "lucide-react";
import { AnimatedToggle } from "@/components/AnimatedToggle";

interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all" | "upcoming";
	setCurrentView: (view: "monthly" | "all" | "upcoming") => void;
	onManageCategories: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
	children,
	currentView,
	setCurrentView,
	onManageCategories,
}) => {
	const viewOptions = [
		{ value: "upcoming" as const, label: "Upcoming", ariaLabel: "View Upcoming Expenses" },
		{ value: "monthly" as const, label: "Monthly", ariaLabel: "View Monthly Expenses" },
		{ value: "all" as const, label: "All", ariaLabel: "View All Expenses" },
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] rounded-lg p-1">
			<header className="animate-fadeIn p-3 sm:px-6">
				<div className="flex flex-col gap-4">
					{/* Title */}
					<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 sr-only">
						Expense Tracker
					</h1>

					{/* Controls */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
						{/* Animated View Toggle */}
						<div className="w-full lg:w-auto bg-white rounded-lg shadow p-1">
							<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
								<div className="flex flex-col md:flex-row lg:items-center lg:justify-between space-x-1 rounded-lg bg-gray-100">
									<AnimatedToggle
										options={viewOptions}
										value={currentView}
										onChange={setCurrentView}
										className="w-full sm:w-auto"
									/>
								</div>
							</div>
						</div>

						<button
							onClick={onManageCategories}
							className="px-4 py-2 bg-sky-500 text-white rounded-lg 
									hover:bg-sky-600/75 transition-colors duration-200 
									flex items-center justify-center gap-2 font-medium transform cursor-pointer shadow-sm shadow-gray-500/50 sm:w-auto"
							title="Manage Categories"
						>
							<Tag size={18} />
							<span>Categories</span>
						</button>
					</div>
				</div>
			</header>
			<main className="px-1 sm:px-0">{children}</main>
		</div>
	);
};
