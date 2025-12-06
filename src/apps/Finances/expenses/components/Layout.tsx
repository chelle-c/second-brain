import { AnimatedToggle } from "@/components/AnimatedToggle";

interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all" | "upcoming";
	setCurrentView: (view: "monthly" | "all" | "upcoming") => void;
}

export const Layout: React.FC<LayoutProps> = ({
	children,
	currentView,
	setCurrentView,
}) => {

	const viewOptions = [
		{ value: "upcoming" as const, label: "Upcoming", ariaLabel: "View Upcoming Expenses" },
		{ value: "monthly" as const, label: "Monthly", ariaLabel: "View Monthly Expenses" },
		{ value: "all" as const, label: "All", ariaLabel: "View All Expenses" },
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] rounded-lg p-1">
			<header className="animate-fadeIn">
				<div className="flex flex-col gap-4">
					{/* Title */}
					<h1 className="sr-only">
						Expense Tracker
					</h1>

					{/* Controls */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
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
					</div>
				</div>
			</header>
			<main className="px-1 sm:px-0">{children}</main>
			
		</div>
	);
};
