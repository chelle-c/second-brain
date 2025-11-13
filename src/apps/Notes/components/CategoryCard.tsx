export const CategoryCard = ({
	categories,
	getNoteCount,
	activeFolder,
	activeCategory,
	setActiveCategory,
}: any) => {
	return (
		<div className="w-full">
			<h3 className="font-semibold mb-3 text-gray-700">Categories</h3>
			<div className="flex flex-wrap gap-2 space-y-1">
				{Object.entries(categories).map(([key, category]: any) => {
					const Icon = category.icon;
					let count;
					if (activeFolder !== null) {
						count =
							activeFolder !== null && key === "all"
								? getNoteCount(activeFolder.id)
								: getNoteCount(activeFolder.id, key);
					}

					return (
						<button
							key={key}
							onClick={() => setActiveCategory(key)}
							className={`flex items-center justify-between px-2 py-1 gap-4 rounded-lg transition-colors cursor-pointer ${
								activeCategory === key
									? "bg-blue-100 font-semibold"
									: "bg-gray-100 hover:bg-gray-200"
							}`}
						>
							<div className="flex items-center gap-2">
								<Icon size={14} />
								<span className="text-xs">{category.name}</span>
							</div>
							<span className="text-xs font-semibold text-gray-500">{count}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
