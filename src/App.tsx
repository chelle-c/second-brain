import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotesApp } from "@/apps/Notes";
import { ExpensesTracker } from "@/apps/Finances/expenses";
import { IncomeTracker } from "@/apps/Finances/income";
import { MindMapApp } from "@/apps/MindMap";
import { Settings } from "@/apps/Settings";
import { DebugConsole } from "@/components/DebugConsole";
import useAppStore from "@/stores/useAppStore";
import { useBackupStore } from "@/stores/useBackupStore";

function App() {
	const [isDevEnv, setIsDevEnv] = useState(false);
	const loadFromFile = useAppStore((state: { loadFromFile: any }) => state.loadFromFile);
	const isLoading = useAppStore((state: { isLoading: any }) => state.isLoading);
	const initializeBackup = useBackupStore((state) => state.initialize);

	const initializeApp = async () => {
		try {
			setIsDevEnv(await invoke("is_dev"));
			await initializeBackup();
			await loadFromFile();
		} catch (error) {
			console.error("Failed to initialize app:", error);
		}
	};

	useEffect(() => {
		initializeApp();
	}, [loadFromFile]);

	return (
		<>
			{isLoading ? (
				<div>Loading...</div>
			) : (
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<AppLayout />}>
							<Route index element={<Navigate to="/brain" replace />} />
							<Route path="brain" element={<NotesApp />} />
							<Route path="income" element={<IncomeTracker />} />
							<Route path="expenses" element={<ExpensesTracker />} />
							<Route path="mindmap" element={<MindMapApp />} />
							<Route path="settings" element={<Settings />} />
						</Route>
					</Routes>
				</BrowserRouter>
			)}

			{isDevEnv && <DebugConsole />}
		</>
	);
}

export default App;
