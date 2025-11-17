import { Tag } from "lucide-react";

interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all";
	setCurrentView: (view: "monthly" | "all") => void;
	onManageCategories: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
	children,
	currentView,
	setCurrentView,
	onManageCategories,
}) => {
	return (
		<div className="flex-1 overflow-y-scroll max-h-[98vh] bg-linear-to-br rounded-lg from-blue-50 via-white to-blue-100 p-1">
			<header className="mb-8 animate-fadeIn p-6">
				<div className="flex flex-col lg:flex-row items-center justify-between gap-4">
					<div className="text-center lg:text-left">
						<h1 className="text-4xl font-bold text-gray-800">
							<span className="bg-linear-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
								Expense Tracker
							</span>
						</h1>
						<p className="text-gray-600 mt-1">Manage your finances with ease</p>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={onManageCategories}
							className="px-4 py-2 bg-blue-500 text-white rounded-lg 
									hover:bg-blue-600/75 transition-colors duration-200 
									flex items-center gap-2 font-medium transform cursor-pointer shadow-sm shadow-gray-500/50"
							title="Manage Categories"
						>
							<Tag size={18} />
							<span className="hidden sm:inline">Categories</span>
						</button>

						{/* View Toggle */}
						<div className="flex gap-2 bg-gray-100 rounded-lg p-1">
							<button
								onClick={() => setCurrentView("monthly")}
								className={`px-6 py-2 rounded-md font-medium transition-all duration-200 cursor-pointer ${
									currentView === "monthly"
										? "bg-white text-blue-600 shadow-sm"
										: "text-gray-600 hover:text-gray-800"
								}`}
								title="View Monthly Expenses"
							>
								Monthly View
							</button>
							<button
								onClick={() => setCurrentView("all")}
								className={`px-6 py-2 rounded-md font-medium transition-all duration-200 cursor-pointer ${
									currentView === "all"
										? "bg-white text-blue-600 shadow-sm"
										: "text-gray-600 hover:text-gray-800"
								}`}
								title="View All Expenses"
							>
								All Expenses
							</button>
						</div>
					</div>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
};
