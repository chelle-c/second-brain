// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router";
import { BrainCircuit, DollarSign, Folder, Network, Save } from "lucide-react";
import useAppStore from "../../stores/useAppStore";
import { fileStorage } from "../../lib/fileStorage";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export function Sidebar() {
	const { lastSaved, autoSaveEnabled, toggleAutoSave, saveToFile } = useAppStore();

	return (
		<div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
			<div className="p-4">
				<h1 className="text-xl font-bold">My Desktop App</h1>
			</div>

			<nav className="flex-1 px-2">
				<NavLink
					to="/brain"
					className={({ isActive }) =>
						`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
							isActive ? "bg-blue-600" : "hover:bg-gray-800"
						}`
					}
				>
					<BrainCircuit size={20} />
					Second Brain
				</NavLink>

				<NavLink
					to="/budget"
					className={({ isActive }) =>
						`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
							isActive ? "bg-blue-600" : "hover:bg-gray-800"
						}`
					}
				>
					<DollarSign size={20} />
					Budget
				</NavLink>

				<NavLink
					to="/mindmap"
					className={({ isActive }) =>
						`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
							isActive ? "bg-blue-600" : "hover:bg-gray-800"
						}`
					}
				>
					<Network size={20} />
					Mind Map
				</NavLink>
			</nav>

			<Separator />

			<div className="p-4 flex flex-col gap-1">
				<div className="text-xs text-gray-400 mb-3">
					{lastSaved && `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`}
				</div>

				<div className="mb-2 flex justify-between items-center gap-2">
					<Label htmlFor="auto-save">Auto-save</Label>
					<Switch
						id="auto-save"
						defaultChecked
						checked={autoSaveEnabled}
						onCheckedChange={() => toggleAutoSave()}
						className="mr-2 shrink-0"
					/>
				</div>

				<Button
					onClick={() => saveToFile()}
					className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 rounded hover:bg-green-700 mb-2"
				>
					<Save size={16} />
					Save Now
				</Button>

				<button
					onClick={async () => {
						try {
							await fileStorage.openDataFolder();
						} catch (error) {
							console.error("Failed to open data folder:", error);
						}
					}}
					className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 mb-2 text-sm"
				>
					<Folder size={16} />
					Open Data Folder
				</button>

				{/* <label className="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="checkbox"
						checked={autoSaveEnabled}
						onChange={toggleAutoSave}
						className="rounded"
					/>
					Auto-save
				</label> */}
			</div>
		</div>
	);
}
