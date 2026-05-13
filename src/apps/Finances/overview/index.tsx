import type React from "react";
import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { OverviewViewType } from "@/types/overview";
import { BurnRateView } from "./components/BurnRateView";
import { CashFlowView } from "./components/CashFlowView";
import { CoverageView } from "./components/CoverageView";
import { Layout } from "./components/Layout";
import { SubscriptionsView } from "./components/SubscriptionsView";
import { WishlistView } from "./components/WishlistView";

export const FinancialOverview: React.FC = () => {
	const [currentView, setCurrentView] = useState<OverviewViewType>("cashflow");

	return (
		<ErrorBoundary appName="CashFlow">
			<Layout currentView={currentView} setCurrentView={setCurrentView}>
				<div className="animate-fadeIn">
					{currentView === "cashflow" ?
						<CashFlowView />
					: currentView === "burnrate" ?
						<BurnRateView />
					: currentView === "coverage" ?
						<CoverageView />
					: currentView === "wishlist" ?
						<WishlistView />
					:	<SubscriptionsView />}
				</div>
			</Layout>
		</ErrorBoundary>
	);
};
