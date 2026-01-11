import { getCurrentWindow } from "@tauri-apps/api/window";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loading, PageLoading } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/sonner";
import { sqlStorage } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";
import { useBackupStore } from "@/stores/useBackupStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
	const loadFromFile = useAppStore((state) => state.loadFromFile);
	const isLoading = useAppStore((state) => state.isLoading);
	const initializeBackup = useBackupStore((state) => state.initialize);
	const isSavingRef = useRef(false);

	const initializeApp = async () => {
		try {
			await initializeBackup();
			await loadFromFile();
			// Initialize desktop settings (sync autostart state with system)
			await useSettingsStore.getState().initializeDesktopSettings();
			// Check for expense notifications (once per day)
			await checkExpenseNotifications();
		} catch (error) {
			console.error("Failed to initialize app:", error);
		}
	};

	useEffect(() => {
		initializeApp();
	}, [loadFromFile]);

	// Handle window close - save data and either minimize to tray or close
	useEffect(() => {
		const appWindow = getCurrentWindow();

		const unlistenPromise = appWindow.onCloseRequested(async (event) => {
			// Prevent multiple simultaneous save attempts
			if (isSavingRef.current) {
				event.preventDefault();
				return;
			}

			const minimizeToTray = useSettingsStore.getState().minimizeToTray;

			// Prevent default close - we'll handle it manually
			event.preventDefault();
			isSavingRef.current = true;
			console.log("Window close requested - saving data...");

			try {
				// Force save all data before closing/hiding
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");

				if (minimizeToTray) {
					// Just hide the window - app stays in tray
					await appWindow.hide();
					console.log("Window hidden to tray");
				} else {
					// Actually close the app
					await sqlStorage.close();
					console.log("Database closed, destroying window");
					await appWindow.destroy();
				}
			} catch (error) {
				console.error("Error handling close:", error);
				// If something goes wrong, try to close anyway
				if (!minimizeToTray) {
					await appWindow.destroy();
				}
			} finally {
				isSavingRef.current = false;
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

			<Toaster position="bottom-right" closeButton />
		</>
	);
}

export default App;
