"use client"

import { useRoutingProvider, RoutingContext } from '@/hooks/useRouting'
import Header from '@/components/header'
import DashboardContent from '@/app/dashboard-content'
import GrowOverview from '@/components/grow-overview'
import Settings from '@/components/settings'
import GrowDetailClient from '@/components/grow-detail-client'
import Statistics from '@/components/statistics'
import { ErrorBoundary } from '@/components/error-boundary'
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Home() {
  const routingState = useRoutingProvider();

  const renderView = () => {
    switch (routingState.currentView) {
      case 'dashboard':
        return (
          <ErrorBoundary>
            <DashboardContent />
          </ErrorBoundary>
        );
      case 'grows':
        return (
          <ErrorBoundary>
            <GrowOverview />
          </ErrorBoundary>
        );
      case 'growDetail':
        return (
          <ErrorBoundary>
            <GrowDetailClient growId={routingState.params.id || ''} />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary>
            <Settings />
          </ErrorBoundary>
        );
      case 'statistics':
        return (
          <ErrorBoundary>
            <Statistics />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <DashboardContent />
          </ErrorBoundary>
        );
    }
  }

  return (
    <RoutingContext.Provider value={routingState}>

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
    </RoutingContext.Provider>
  )
}

