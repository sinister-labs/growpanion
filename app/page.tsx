"use client"

import { getRouteBoundaryKey, useRoutingProvider, RoutingContext } from '@/hooks/useRouting'
import { GrowsContext, useGrowsProvider } from '@/hooks/useGrows'
import DashboardContent from '@/app/dashboard-content'
import GrowOverview from '@/components/grow-overview'
import Settings from '@/components/settings'
import GrowDetailClient from '@/components/grow-detail-client'
import Statistics from '@/components/statistics'
import ToolsPage from '@/components/tools-page'
import DeviceLayerPage from '@/components/device-layer-page'
import GeneticsRegistryPage from '@/components/genetics-registry-page'
import { ErrorBoundary } from '@/components/error-boundary'
import { InfotainmentShell } from '@/components/infotainment-shell'
import { AcInfinityPollingProvider } from '@/components/ac-infinity-polling-provider'

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
            <GrowDetailClient growId={routingState.params.id || ''} initialTab={routingState.params.tab} />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <Settings initialTab={routingState.params.tab} />
          </ErrorBoundary>
        );
      case 'devices':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <DeviceLayerPage />
          </ErrorBoundary>
        );
      case 'genetics':
        return (
          <ErrorBoundary key={routeBoundaryKey}>
            <GeneticsRegistryPage />
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
        <AcInfinityPollingProvider>
          <ErrorBoundary>
            <InfotainmentShell>{renderView()}</InfotainmentShell>
          </ErrorBoundary>
        </AcInfinityPollingProvider>
      </GrowsContext.Provider>
    </RoutingContext.Provider>
  )
}
