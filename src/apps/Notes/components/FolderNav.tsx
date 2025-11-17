import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { NotesFolder } from "@/types/notes";
import { Inbox, ChevronRight, ChevronDown, Folder, FolderPlus } from "lucide-react";

export const FolderNav = ({
	allFolders,
	activeFolder,
	getCurrentFolder,
	setActiveFolder,
	setActiveCategory,
	getNoteCount,
}: any) => {
	const [expandedFolders, setExpandedFolders] = useState(new Set<string>());
	const toggleFolder = (folderKey: string) => {
		const newExpanded = new Set(expandedFolders);
		if (newExpanded.has(folderKey)) {
			newExpanded.delete(folderKey);
		} else {
			newExpanded.add(folderKey);
		}
		setExpandedFolders(newExpanded);
	};

	return (
		<Card className="animate-slideUp">
			<CardContent className="px-4">
				<div className="flex justify-between items-center mb-4">
					<h3 className="font-semibold text-gray-700">Folders</h3>
					<button
						type="button"
						onClick={() => {}}
						className="flex items-center px-2 py-1 text-sm bg-gray-100 text-sky-700 rounded-lg hover:bg-sky-600 transition-colors cursor-pointer hover:text-white"
					>
						<FolderPlus size={20} className="" />
					</button>
				</div>
				<div className="space-y-1">
					{/* Inbox */}
					<button
						onClick={() => {
							const inboxFolder = allFolders["inbox"];
							setActiveFolder(inboxFolder);
							setActiveCategory("all");
						}}
						className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
							activeFolder && activeFolder.id === "inbox"
								? "bg-blue-50"
								: "hover:bg-gray-100"
						}`}
					>
						<div className="flex items-center gap-2">
							<Inbox size={18} />
							<span className="text-sm font-medium">Inbox</span>
						</div>
						<span className="text-sm text-gray-500">{getNoteCount("inbox")}</span>
					</button>

					{/* Main folders */}
					{Object.entries(allFolders).map(([key, folder]: [string, unknown]) => {
						if (key === "inbox") return null;
						const folderType = folder as NotesFolder;
						const Icon = folderType.name === "Inbox" ? Inbox : Folder;
						const hasSubfolders = folderType.children && folderType.children.length > 0;
						const isExpanded = expandedFolders.has(key);

						return (
							<div key={key}>
								<div
									className={`flex items-center rounded-lg transition-colors ${
										activeFolder && activeFolder.id === key
											? "bg-blue-50"
											: "hover:bg-gray-100"
									}`}
								>
									{hasSubfolders && (
										<button
											onClick={() => toggleFolder(key)}
											className="p-1 hover:bg-gray-200 rounded"
										>
											{isExpanded ? (
												<ChevronDown size={14} />
											) : (
												<ChevronRight size={14} />
											)}
										</button>
									)}
									<div
										onClick={() => {
											setActiveFolder(getCurrentFolder(key));
											setActiveCategory("all");
										}}
										className="flex-1 flex items-center justify-between px-3 py-2 cursor-pointer"
									>
										<div className="flex items-center gap-2">
											<Icon size={18} />
											<span className="text-sm font-medium">
												{folderType.name}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="text-sm text-gray-500">
												{getNoteCount(key)}
											</span>
										</div>
									</div>
								</div>

								{/* Subfolders */}
								{isExpanded &&
									folderType.children &&
									folderType.children.length > 0 &&
									folderType.children.map((subfolder) => (
										<div
											key={subfolder.id}
											className={`ml-8 flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
												activeFolder === subfolder
													? "bg-blue-50"
													: "hover:bg-gray-100"
											}`}
										>
											<button
												onClick={() => {
													setActiveFolder(subfolder);
													setActiveCategory("all");
												}}
												className="flex-1 flex items-center justify-between"
											>
												<div className="flex items-center gap-2">
													<Folder size={16} />
													<span className="text-sm">
														{subfolder.name}
													</span>
												</div>
												<span className="text-xs text-gray-500">
													{getNoteCount(subfolder.id)}
												</span>
											</button>
										</div>
									))}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
};
