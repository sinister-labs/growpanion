"use client"

import { ReactNode } from 'react'
import { useRoutingProvider, RoutingContext, AppView, useRouting } from '@/hooks/useRouting'
import Header from '@/components/header'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import GrowDetailClient from '@/components/grow-detail-client'

const DynamicDashboardContent = dynamic(() => import('@/app/dashboard-content'), {
    loading: () => <div className="p-8 text-center">Loading dashboard...</div>
})

const DynamicGrowsPage = dynamic(() => import('@/components/grow-overview'), {
    loading: () => <div className="p-8 text-center">Loading grows...</div>
})

const DynamicSettingsPage = dynamic(() => import('@/components/settings'), {
    loading: () => <div className="p-8 text-center">Loading settings...</div>
})

// Wrapper mit Provider-Funktionalität
export default function RoutingWrapper() {
    // Provider-Zustand
    const routingState = useRoutingProvider();

    return (
        <RoutingContext.Provider value={routingState}>
            <AppContent />
        </RoutingContext.Provider>
    )
}

// Hauptkomponente mit Layout
function AppContent() {
    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <Header />
            <main className="container max-w-screen-xl mx-auto px-4 pb-8">
                <Suspense fallback={<div className="p-8 text-center">Loading content...</div>}>
                    <ViewRenderer />
                </Suspense>
            </main>
        </div>
    )
}

// Komponente zum Rendern des aktuellen Views
function ViewRenderer() {
    const { currentView, params } = useRouting()

    switch (currentView) {
        case 'dashboard':
            return <DynamicDashboardContent />
        case 'grows':
            return <DynamicGrowsPage />
        case 'growDetail':
            return <GrowDetailClient growId={params.id || ''} />
        case 'settings':
            return <DynamicSettingsPage />
        default:
            return <DynamicDashboardContent />
    }
} 