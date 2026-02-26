import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

const root = createRoot(rootElement);

// Determine which window we're in and render accordingly.
// We do this async because getCurrentWindow() comes from the Tauri API.
async function bootstrap() {
	try {
		const { getCurrentWindow } = await import("@tauri-apps/api/window");
		const win = getCurrentWindow();
		const label = win.label;

		if (label === "expense-form") {
			const { ExpenseFormWindowRoot } =
				await import("./apps/Finances/expenses/components/ExpenseFormWindowRoot");
			root.render(
				<StrictMode>
					<ExpenseFormWindowRoot />
				</StrictMode>,
			);
		} else {
			const { default: App } = await import("./App");
			root.render(
				<StrictMode>
					<App />
				</StrictMode>,
			);
		}
	} catch (err) {
		// If we can't determine the window (e.g., running in browser during dev),
		// fall back to the main App
		console.warn("Window detection failed, falling back to main App:", err);
		const { default: App } = await import("./App");
		root.render(
			<StrictMode>
				<App />
			</StrictMode>,
		);
	}
}

bootstrap();
