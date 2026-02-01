import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loading, PageLoading } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/sonner";
import { checkExpenseNotifications } from "@/lib/notifications";
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

	// Handle tray quit - save data and close database before exiting
	useEffect(() => {
		const unlistenPromise = listen("tray-quit-requested", async () => {
			// Prevent multiple simultaneous save attempts
			if (isSavingRef.current) {
				return;
			}

			isSavingRef.current = true;
			console.log("Tray quit requested - saving data...");

			try {
				// Force save all data before quitting
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");

				// Close the database properly
				await sqlStorage.close();
				console.log("Database closed");

				// Verify connection is closed before quitting
				if (sqlStorage.isOpen()) {
					console.warn("Database connection still open, waiting...");
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				// Now actually quit the app
				await invoke("quit_app");
			} catch (error) {
				console.error("Error handling tray quit:", error);
				// Try to quit anyway
				await invoke("quit_app");
			} finally {
				isSavingRef.current = false;
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);

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
					// Checkpoint the database to ensure data is persisted (no-op with on-demand connections)
					await sqlStorage.checkpoint();
					// Just hide the window - app stays in tray
					await appWindow.hide();
					console.log("Window hidden to tray");
				} else {
					// Actually close the app
					await sqlStorage.close();
					console.log("Database closed, destroying window");

					// Verify connection is closed before destroying window
					if (sqlStorage.isOpen()) {
						console.warn("Database connection still open, waiting...");
						await new Promise((resolve) => setTimeout(resolve, 100));
					}

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
