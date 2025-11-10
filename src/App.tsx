import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotesApp } from "@/apps/Notes";
import { IncomeTracker } from "@/apps/Finances/income/IncomeTracker";
import { MindMapApp } from "@/apps/MindMap";
import { DebugConsole } from "@/components/DebugConsole";
import useAppStore from "@/stores/useAppStore";
import { fileStorage } from "@/lib/fileStorage";
import { ExpensesTracker } from "@/apps/Finances/expenses/ExpensesTracker";

function App() {
	const loadFromFile = useAppStore((state: { loadFromFile: any }) => state.loadFromFile);
	const isLoading = useAppStore((state: { isLoading: any }) => state.isLoading);

	const initializeApp = async () => {
		try {
			await fileStorage.initialize();
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
						</Route>
					</Routes>
				</BrowserRouter>
			)}
			<DebugConsole />
		</>
	);
}

export default App;
