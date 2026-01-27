"use client"

import { useState } from "react"
import { useGrows } from "@/hooks/useGrows"
import { Montserrat } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Home, Plus } from "lucide-react"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { useRouting } from "@/hooks/useRouting"
import { NewGrowDialog } from "@/components/grow/new-grow-dialog"
import { GrowCard } from "@/components/grow/grow-card"

const montserrat = Montserrat({ subsets: ["latin"] })

export default function GrowOverview() {
    const {
        grows,
        activeGrowId,
        isLoading,
        error,
        addGrow,
        setActiveGrow,
        isGrowActive
    } = useGrows();

    const { navigateTo } = useRouting();

    const [isNewGrowDialogOpen, setIsNewGrowDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("active");

    // Filter the grows by status
    const activeGrows = grows.filter(isGrowActive);
    const completedGrows = grows.filter(grow => !isGrowActive(grow));

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black bg-opacity-90">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black bg-opacity-90">
                <div className="bg-red-900/30 text-red-300 p-8 rounded-lg max-w-md">
                    <h2 className="text-xl font-semibold mb-4">Error</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex min-h-screen flex-col items-center space-y-8 ${montserrat.className}`}>
            <div className="w-full">
                <div className="space-y-8 mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Button
                                    variant="link"
                                    className="text-gray-400 hover:text-white p-0 h-auto flex items-center gap-1"
                                    onClick={() => navigateTo('dashboard')}
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Button>
                                <span className="text-gray-600">/</span>
                                <h1 className="font-semibold text-white">Grows</h1>
                            </div>
                            <p className="text-gray-400">Manage your growing cycles</p>
                        </div>

                        <Button
                            onClick={() => setIsNewGrowDialogOpen(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Grow
                        </Button>
                    </div>

                    <NewGrowDialog
                        isOpen={isNewGrowDialogOpen}
                        onClose={() => setIsNewGrowDialogOpen(false)}
                        onCreateGrow={addGrow}
                    />

                    {grows.length === 0 ? (
                        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                            <p className="text-lg text-gray-400 mb-4">
                                You have no grows yet.
                            </p>
                            <Button
                                onClick={() => setIsNewGrowDialogOpen(true)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create your first Grow
                            </Button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid grid-cols-2 bg-gray-800 rounded-full">
                                    <TabsTrigger
                                        value="active"
                                        className="data-[state=active]:bg-green-500 rounded-full data-[state=active]:text-white"
                                    >
                                        Active Grows ({activeGrows.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="completed"
                                        className="data-[state=active]:bg-gray-600 rounded-full data-[state=active]:text-white"
                                    >
                                        Completed ({completedGrows.length})
                                    </TabsTrigger>
                                </TabsList>

                                <div className="relative min-h-[400px] mt-4">
                                    <TabsContent
                                        value="active"
                                        className="absolute top-0 left-0 w-full transition-opacity duration-300 opacity-100"
                                    >
                                        {activeGrows.length === 0 ? (
                                            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                                                <p className="text-lg text-gray-400 mb-4">
                                                    You have no active grows.
                                                </p>
                                                <Button
                                                    onClick={() => setIsNewGrowDialogOpen(true)}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create new Grow
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {activeGrows.map(grow => (
                                                    <div
                                                        key={grow.id}
                                                        className="cursor-pointer"
                                                        onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                    >
                                                        <GrowCard
                                                            grow={grow}
                                                            isActive={grow.id === activeGrowId}
                                                            onSetActive={() => setActiveGrow(grow.id)}
                                                            onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="completed"
                                        className="absolute top-0 left-0 w-full transition-opacity duration-300 opacity-100"
                                    >
                                        {completedGrows.length === 0 ? (
                                            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                                                <p className="text-lg text-gray-400 mb-4">
                                                    You have no completed grows.
                                                </p>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    Grows are marked as completed when they reach the &quot;Done&quot; phase.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {completedGrows.map(grow => (
                                                    <div
                                                        key={grow.id}
                                                        className="cursor-pointer"
                                                        onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                    >
                                                        <GrowCard
                                                            grow={grow}
                                                            isActive={false}
                                                            onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

