import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { DebugConsole } from "@/components/DebugConsole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loading, PageLoading } from "@/components/ui/loading";
import { sqlStorage } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";
import { useBackupStore } from "@/stores/useBackupStore";
import { AppToSave } from "@/types";

// Lazy load route modules for code splitting
const NotesApp = lazy(() =>
	import("@/apps/Notes").then((m) => ({ default: m.NotesApp })),
);
const ExpensesTracker = lazy(() =>
	import("@/apps/Finances/expenses").then((m) => ({
		default: m.ExpensesTracker,
	})),
);
const IncomeTracker = lazy(() =>
	import("@/apps/Finances/income").then((m) => ({ default: m.IncomeTracker })),
);
const MindMapApp = lazy(() =>
	import("@/apps/MindMap").then((m) => ({ default: m.MindMapApp })),
);
const Settings = lazy(() =>
	import("@/apps/Settings").then((m) => ({ default: m.Settings })),
);

function App() {
	const [isDevEnv, setIsDevEnv] = useState(false);
	const loadFromFile = useAppStore((state) => state.loadFromFile);
	const isLoading = useAppStore((state) => state.isLoading);
	const initializeBackup = useBackupStore((state) => state.initialize);
	const isSavingRef = useRef(false);

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

	// Handle window close - save all data before closing
	useEffect(() => {
		const appWindow = getCurrentWindow();

		const unlistenPromise = appWindow.onCloseRequested(async (event) => {
			// Prevent multiple simultaneous save attempts
			if (isSavingRef.current) {
				event.preventDefault();
				return;
			}

			// Prevent default close - we'll close manually after saving
			event.preventDefault();
			isSavingRef.current = true;
			console.log("Window close requested - saving data...");

			try {
				// Force save all data before closing
				await useAppStore.getState().saveToFile(AppToSave.All);
				// Ensure database is properly closed
				await sqlStorage.close();
				console.log("Data saved successfully before close");
			} catch (error) {
				console.error("Error saving data on close:", error);
			} finally {
				isSavingRef.current = false;
				// Now close the window
				await appWindow.destroy();
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);

	return (
		<>
			{isLoading ? (
				<Loading fullScreen size="lg" />
			) : (
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<AppLayout />}>
							<Route index element={<Navigate to="/brain" replace />} />
							<Route
								path="brain"
								element={
									<Suspense fallback={<PageLoading />}>
										<NotesApp />
									</Suspense>
								}
							/>
							<Route
								path="income"
								element={
									<Suspense fallback={<PageLoading />}>
										<IncomeTracker />
									</Suspense>
								}
							/>
							<Route
								path="expenses"
								element={
									<Suspense fallback={<PageLoading />}>
										<ExpensesTracker />
									</Suspense>
								}
							/>
							<Route
								path="mindmap"
								element={
									<Suspense fallback={<PageLoading />}>
										<MindMapApp />
									</Suspense>
								}
							/>
							<Route
								path="settings"
								element={
									<Suspense fallback={<PageLoading />}>
										<Settings />
									</Suspense>
								}
							/>
						</Route>
					</Routes>
				</BrowserRouter>
			)}

			{isDevEnv && <DebugConsole />}
		</>
	);
}

export default App;
