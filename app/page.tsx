"use client"

import { getRouteBoundaryKey, useRoutingProvider, RoutingContext } from '@/hooks/useRouting'
import { GrowsContext, useGrowsProvider } from '@/hooks/useGrows'
import Header from '@/components/header'
import DashboardContent from '@/app/dashboard-content'
import GrowOverview from '@/components/grow-overview'
import Settings from '@/components/settings'
import GrowDetailClient from '@/components/grow-detail-client'
import Statistics from '@/components/statistics'
import ToolsPage from '@/components/tools-page'
import { ErrorBoundary } from '@/components/error-boundary'
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Home() {
  const routingState = useRoutingProvider();
  const growsState = useGrowsProvider();
  const routeBoundaryKey = getRouteBoundaryKey(routingState.currentView, routingState.params);

  const renderView = () => {
    switch (routingState.currentView) {
      case 'dashboard':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <DashboardContent />
          </ErrorBoundary>
        );
      case 'grows':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <GrowOverview />
          </ErrorBoundary>
        );
      case 'growDetail':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <GrowDetailClient growId={routingState.params.id || ''} />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <Settings />
          </ErrorBoundary>
        );
      case 'statistics':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <Statistics />
          </ErrorBoundary>
        );
      case 'tools':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <ToolsPage />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <DashboardContent />
          </ErrorBoundary>
        );
    }
  }

  return (
    <RoutingContext.Provider value={routingState}>
      <GrowsContext.Provider value={growsState}>

        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>

        <div className="flex flex-col min-h-screen max-h-screen bg-transparent text-white overflow-hidden">
          <div className="z-50 w-full">
            <ErrorBoundary>
              <Header />
            </ErrorBoundary>
          </div>

          {/* Scrollbarer Content-Bereich mit ScrollArea */}
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-[calc(100vh-80px)]">
              <main className="container max-w-screen-xl mx-auto px-4 pb-8 pt-8 relative z-10">
                {renderView()}
              </main>
            </ScrollArea>
          </div>
        </div>
      </GrowsContext.Provider>
    </RoutingContext.Provider>
  )
}
