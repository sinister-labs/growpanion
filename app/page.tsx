"use client"

import { useState, useCallback } from 'react'
import { useRoutingProvider, RoutingContext } from '@/hooks/useRouting'
import Header from '@/components/header'
import DashboardContent from '@/app/dashboard-content'
import GrowsPage from '@/app/grows/page'
import GrowViewClient from '@/app/grows/view/grow-view-client'
import SettingsPage from '@/app/settings/page'

export default function Home() {
  // Routing Provider-Zustand nutzen
  const routingState = useRoutingProvider();

  // View basierend auf dem aktuellen State rendern
  const renderView = () => {
    switch (routingState.currentView) {
      case 'dashboard':
        return <DashboardContent />
      case 'grows':
        return <GrowsPage />
      case 'growDetail':
        return <GrowViewClient growId={routingState.params.id || ''} />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardContent />
    }
  }

  return (
    <RoutingContext.Provider value={routingState}>
      <div className="min-h-screen bg-neutral-950 text-white">
        <Header />
        <main className="container max-w-screen-xl mx-auto px-4 pb-8 relative z-10 pt-8">
          {renderView()}
        </main>
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
      </div>
    </RoutingContext.Provider>
  )
}

