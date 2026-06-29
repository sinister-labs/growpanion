"use client"

import { useRef, useState, useEffect } from "react"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlantList } from "@/components/plant-list"
import { FertilizerMixesManager } from "@/components/fertilizer-mixes"
import { GrowInfo } from "@/components/grow-info"
import { GrowDiary } from "@/components/grow-diary"
import { ReminderList } from "@/components/notifications"
import LabModeTelemetry from "@/components/lab-mode-telemetry"
import GrowEnvironmentSources from "@/components/grow-environment-sources"
import PhenotypeComparison from "@/components/phenotype-comparison"
import { Loader2, ArrowLeft, Bell } from "lucide-react"
import { getGrowById } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { Grow } from "@/lib/db"
import { useRouting } from "@/hooks/useRouting"
import { createPhaseHistoryEntry } from "@/lib/growth-utils"

interface GrowDetailClientProps {
    growId: string;
    initialTab?: string;
}

export default function GrowDetailClient(props: GrowDetailClientProps) {
    const { growId, initialTab } = props;
    const { toast } = useToast();
    const { navigateTo } = useRouting();

    const { updateGrow } = useGrows();
    const { plants, isLoading: plantsLoading } = usePlants(growId);
    const [grow, setGrow] = useState<Grow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [activeTab, setActiveTab] = useState('plants');
    const loadRequestId = useRef(0);
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        const allowedTabs = new Set(['plants', 'diary', 'lab', 'compare', 'mixes', 'reminders']);
        if (initialTab && allowedTabs.has(initialTab)) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        const requestId = ++loadRequestId.current;
        setIsLoading(true);
        setError(null);
        setGrow(null);

        if (!growId) {
            setIsLoading(false);
            return;
        }

        const loadGrow = async () => {
            try {
                const grow = await getGrowById(growId);
                if (!isMounted.current || requestId !== loadRequestId.current) return;

                if (grow) {
                    setGrow(grow);
                }
            } catch (err) {
                if (!isMounted.current || requestId !== loadRequestId.current) return;

                console.error("Error loading grow:", err);
                setError(err instanceof Error ? err : new Error("Unknown error"));
            } finally {
                if (isMounted.current && requestId === loadRequestId.current) {
                    setIsLoading(false);
                }
            }
        };

        loadGrow();

        return () => {
            loadRequestId.current = requestId + 1;
        };
    }, [growId]);

    const handlePhaseChange = (newPhase: string) => {
        if (!grow) return;
        if (grow.currentPhase === newPhase) return;

        const updatedGrow = {
            ...grow,
            currentPhase: newPhase,
            phaseHistory: [...grow.phaseHistory, createPhaseHistoryEntry(newPhase, new Date().toISOString())],
        };

        updateGrow(updatedGrow)
            .then(() => {
                if (!isMounted.current) return;
                setGrow(updatedGrow);
                toast({
                    variant: "success",
                    title: "Phase changed",
                    description: `The phase was successfully changed to "${newPhase}".`,
                });
            })
            .catch((error) => {
                if (!isMounted.current) return;
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message,
                });
            });
    };

    if (isLoading || plantsLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md rounded-3xl border border-destructive/35 bg-destructive/10 p-8 text-destructive">
                <h2 className="mb-4 text-xl font-semibold">Error</h2>
                <p>{error.message}</p>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="border-destructive/45 text-destructive hover:bg-destructive/10"
                        onClick={() => navigateTo('grows')}
                    >
                        Back to overview
                    </Button>
                </div>
            </div>
        );
    }

    if (!grow) {
        return (
            <div className="max-w-md rounded-3xl border border-destructive/35 bg-destructive/10 p-8 text-destructive">
                <h2 className="mb-4 text-xl font-semibold">Grow Not Found</h2>
                <p>The requested grow could not be found.</p>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="border-destructive/45 text-destructive hover:bg-destructive/10"
                        onClick={() => navigateTo('grows')}
                    >
                        Back to overview
                    </Button>
                </div>
            </div>
        );
    }

    const safeGrow: Grow = grow;
    return (
        <div className="mt-1 space-y-3">
            <div className="flex justify-start">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-2xl"
                    onClick={() => navigateTo('grows')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to grows
                </Button>
            </div>

            <GrowInfo
                grow={{
                    id: safeGrow.id,
                    name: safeGrow.name,
                    startDate: safeGrow.startDate,
                    currentPhase: safeGrow.currentPhase,
                    phaseHistory: safeGrow.phaseHistory,
                    plants: plants
                }}
                onPhaseChange={handlePhaseChange}
            />

            <div className="relative">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
                        <TabsTrigger value="plants">
                            Plants
                        </TabsTrigger>
                        <TabsTrigger value="diary">
                            Diary
                        </TabsTrigger>
                        <TabsTrigger value="lab">
                            Lab
                        </TabsTrigger>
                        <TabsTrigger value="compare">
                            Compare
                        </TabsTrigger>
                        <TabsTrigger value="mixes">
                            Mixes
                        </TabsTrigger>
                        <TabsTrigger value="reminders">
                            <Bell className="h-4 w-4 mr-1" />
                            Reminders
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-3">
                        <TabsContent
                            value="plants"
                            className="w-full"
                        >
                            <PlantList
                                growId={growId}
                                onManageFertilizerMixes={() => setActiveTab('mixes')}
                            />
                        </TabsContent>
                        <TabsContent
                            value="diary"
                            className="w-full"
                        >
                            <GrowDiary grow={safeGrow} plants={plants} />
                        </TabsContent>
                        <TabsContent
                            value="lab"
                            className="w-full"
                        >
                            <div className="space-y-6">
                                <GrowEnvironmentSources growId={growId} />
                                <LabModeTelemetry growId={growId} />
                                <PhenotypeComparison growId={growId} plants={plants} />
                            </div>
                        </TabsContent>
                        <TabsContent
                            value="compare"
                            className="w-full"
                        >
                            <PhenotypeComparison growId={growId} plants={plants} />
                        </TabsContent>
                        <TabsContent
                            value="mixes"
                            className="w-full"
                        >
                            <FertilizerMixesManager growId={growId} />
                        </TabsContent>
                        <TabsContent
                            value="reminders"
                            className="w-full"
                        >
                            <ReminderList growId={growId} growName={safeGrow.name} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
