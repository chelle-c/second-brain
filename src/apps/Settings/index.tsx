import { AppearanceSettings } from "./components/AppearanceSettings";
import { BackupSettings } from "./components/BackupSettings";
import { CalendarSettings } from "./components/CalendarSettings";
import { ExpenseSettings } from "./components/ExpenseSettings";
import { GeneralSettings } from "./components/GeneralSettings";
import { IncomeSettings } from "./components/IncomeSettings";
import { Layout } from "./components/Layout";
import { NotesSettings } from "./components/NotesSettings";

export const Settings = () => {
	return (
		<Layout>
			<GeneralSettings />
			<AppearanceSettings />
			<NotesSettings />
			<ExpenseSettings />
			<IncomeSettings />
			<CalendarSettings />
			<div id="backup" className="scroll-mt-6 space-y-6">
				<BackupSettings />
			</div>
		</Layout>
	);
};
