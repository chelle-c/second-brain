interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all";
	setCurrentView: (view: "monthly" | "all") => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setCurrentView }) => {
	return (
		<>
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

					{/* View Toggle */}
					<div className="flex gap-2 bg-gray-100 rounded-lg p-1">
						<button
							onClick={() => setCurrentView("monthly")}
							className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
								currentView === "monthly"
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							Monthly View
						</button>
						<button
							onClick={() => setCurrentView("all")}
							className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
								currentView === "all"
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							All Expenses
						</button>
					</div>
				</div>
			</header>
			<main>{children}</main>
		</>
	);
};
