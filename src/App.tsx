import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { DebugConsole } from "@/components/DebugConsole";
import useAppStore from "@/stores/useAppStore";
import { useBackupStore } from "@/stores/useBackupStore";

// Lazy load route modules for code splitting
const NotesApp = lazy(() => import("@/apps/Notes").then((m) => ({ default: m.NotesApp })));
const ExpensesTracker = lazy(() => import("@/apps/Finances/expenses").then((m) => ({ default: m.ExpensesTracker })));
const IncomeTracker = lazy(() => import("@/apps/Finances/income").then((m) => ({ default: m.IncomeTracker })));
const MindMapApp = lazy(() => import("@/apps/MindMap").then((m) => ({ default: m.MindMapApp })));
const Settings = lazy(() => import("@/apps/Settings").then((m) => ({ default: m.Settings })));

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
							<Route path="brain" element={<Suspense fallback={<div>Loading...</div>}><NotesApp /></Suspense>} />
							<Route path="income" element={<Suspense fallback={<div>Loading...</div>}><IncomeTracker /></Suspense>} />
							<Route path="expenses" element={<Suspense fallback={<div>Loading...</div>}><ExpensesTracker /></Suspense>} />
							<Route path="mindmap" element={<Suspense fallback={<div>Loading...</div>}><MindMapApp /></Suspense>} />
							<Route path="settings" element={<Suspense fallback={<div>Loading...</div>}><Settings /></Suspense>} />
						</Route>
					</Routes>
				</BrowserRouter>
			)}

			{isDevEnv && <DebugConsole />}
		</>
	);
}

export default App;
