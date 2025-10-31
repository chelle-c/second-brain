import useAppStore from "../../stores/useAppStore";
import { IncomeTracker } from "./components/IncomeTracker";

// Work in progress

/*
** TODO #1: Update income tracker UI
** Add ability to set a different target each week
** Make target optional
*/

/*
** TODO #2: Add expense tracker UI
** This UI should allow the user to add, edit and delete expenses, set recurring expenses, and display total needed for expenses at the end of each month
** The expenses should be separated into Needs, Wants, and Savings (50/30/20 rule)
** Each expense should have a category, amount, due date, and whether it is recurring
** The recurring expenses should be a default number set by the user that recurs every month, and the user should be able to edit this number
** The data display should contain a chart of how much was spent in each category, and the total expenses at the end of each month
** The UI should display expenses by month; The default view should be the current month, and should include the ability to view past and future months by year, as well as a quick way to return to the current month
*/

/*
** TODO #3: Separate Income tracker and Expense tracker views using tabs
** Make the Expenses tracker the default view
*/

/*
** TODO #4: Save expense data to file(s)
** Make adjustments to fileStorage.ts to support saving Finances app data
** Save the open month of the expenses tracker so the app opens to the last open month when the user returns
** Save which Finances tab is open so the app opens to the last open tab when the user returns
*/

export function FinancesApp() {

	return <IncomeTracker />;
}
