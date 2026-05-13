import React from "react";
import { BaseDirectory, exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";

interface Props {
	/** Short identifier used in log filenames and the fallback UI (e.g. "Notes", "Expenses"). */
	appName: string;
	/** Optional custom fallback. Receives the error and a reset callback. */
	fallback?: (error: Error, reset: () => void) => React.ReactNode;
	/** Optional hook fired after a crash is caught (after logging). */
	onError?: (error: Error, info: React.ErrorInfo, logPath: string | null) => void;
	children: React.ReactNode;
}

interface State {
	error: Error | null;
	logPath: string | null;
}

/**
 * Generic error boundary used to wrap each micro app. Catches render-time
 * errors, writes a crash report to `<AppData>/logs/<appName>-crash-<ts>.log`,
 * and shows a localized fallback UI so a single bad component cannot blank
 * the whole window.
 */
export class ErrorBoundary extends React.Component<Props, State> {
	state: State = { error: null, logPath: null };

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { error };
	}

	async componentDidCatch(error: Error, info: React.ErrorInfo) {
		let logPath: string | null = null;
		try {
			if (!(await exists("logs", { baseDir: BaseDirectory.AppData }))) {
				await mkdir("logs", { baseDir: BaseDirectory.AppData, recursive: true });
			}
			const ts = new Date().toISOString().replace(/[:.]/g, "-");
			const safeName = this.props.appName.replace(/[^a-z0-9_-]/gi, "_");
			logPath = `logs/${safeName}-crash-${ts}.log`;

			const body = [
				`App:        ${this.props.appName}`,
				`Time:       ${new Date().toISOString()}`,
				`URL:        ${window.location.href}`,
				`UserAgent:  ${navigator.userAgent}`,
				``,
				`Error: ${error.name}: ${error.message}`,
				``,
				`Stack:`,
				error.stack ?? "(none)",
				``,
				`Component stack:`,
				info.componentStack ?? "(none)",
			].join("\n");

			await writeTextFile(logPath, body, { baseDir: BaseDirectory.AppData });
		} catch (logErr) {
			console.error("Failed to write crash log:", logErr);
		}

		this.setState({ logPath });
		this.props.onError?.(error, info, logPath);
	}

	private reset = () => this.setState({ error: null, logPath: null });

	render() {
		const { error, logPath } = this.state;
		if (!error) return this.props.children;

		if (this.props.fallback) return this.props.fallback(error, this.reset);

		return (
			<div className="h-full w-full overflow-auto p-6">
				<div className="max-w-xl mx-auto">
					<h2 className="text-xl font-semibold mb-2">
						Something went wrong in {this.props.appName}
					</h2>
					<p className="text-sm text-muted-foreground mb-4">
						The rest of the app is still running. A crash report has been saved to your
						app data folder
						{logPath && (
							<>
								{" "}
								at <code className="text-xs">{logPath}</code>
							</>
						)}
						. Please share it with the developer.
					</p>
					<pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64 mb-4">
						{error.name}: {error.message}
					</pre>
					<button
						type="button"
						onClick={this.reset}
						className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						Try again
					</button>
				</div>
			</div>
		);
	}
}
