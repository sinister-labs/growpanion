"use client"

import { useState, useEffect } from "react"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { Montserrat } from "next/font/google"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import { PlantList } from "@/components/plant-list"
import { FertilizerMixesManager } from "@/components/fertilizer-mixes"
import { GrowInfo } from "@/components/grow-info"
import { Loader2, Home, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getGrowById } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Grow } from "@/lib/db"

const montserrat = Montserrat({ subsets: ["latin"] })

export default function GrowDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string>(tabParam || 'plants');
  const { grows, updateGrow } = useGrows();
  const { plants, isLoading: plantsLoading } = usePlants(id);
  const [grow, setGrow] = useState<Grow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAddPlantDialogOpen, setIsAddPlantDialogOpen] = useState(false);

  // Lade den spezifischen Grow
  useEffect(() => {
    const loadGrow = async () => {
      try {
        const grow = await getGrowById(id);
        if (grow) {
          setGrow(grow);
        }
      } catch (err) {
        console.error("Error loading grow:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    loadGrow();
  }, [id]);

  // Behandle Phasenänderungen
  const handlePhaseChange = (newPhase: string) => {
    if (!grow) return;

    const updatedGrow = {
      ...grow,
      currentPhase: newPhase,
      phaseHistory: [...grow.phaseHistory, { phase: newPhase, startDate: new Date().toISOString() }],
    };

    updateGrow(updatedGrow)
      .then(() => {
        setGrow(updatedGrow);
        toast({
          variant: "success",
          title: "Phase changed",
          description: `The phase was successfully changed to "${newPhase}".`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      });
  };

  if (isLoading || plantsLoading) {
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
          <div className="mt-4">
            <Link href="/grows">
              <Button variant="outline" className="border-red-500 text-red-400 hover:bg-red-900/20">
                Back to overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 sm:p-8 bg-black bg-opacity-90 ${montserrat.className}`}>
      <div className="w-full max-w-7xl relative z-10">
        <Header />

        <div className="space-y-8 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <span className="text-gray-600">/</span>
                <Link href="/grows" className="text-gray-400 hover:text-white">
                  Grows
                </Link>
                <span className="text-gray-600">/</span>
                <h1 className="font-semibold text-white">{grow.name}</h1>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <span className="bg-green-600/30 text-green-400 rounded px-2 py-1 text-xs">
                  {grow.currentPhase}
                </span>
                <span className="text-gray-400 text-sm">
                  Duration: {Math.floor((new Date().getTime() - new Date(grow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                </span>
              </div>
            </div>

            <Link href="/grows">
              <Button variant="outline" className="border-gray-700 text-gray-400 hover:text-white rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to overview
              </Button>
            </Link>
          </div>

          <GrowInfo
            grow={{
              ...grow,
              plants: plants
            }}
            onPhaseChange={handlePhaseChange}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full ">
            <TabsList className="grid grid-cols-2 bg-gray-800 rounded-full">
              <TabsTrigger value="plants" className="data-[state=active]:bg-green-500 shadow-3xl shadow-green-500 data-[state=active]:text-gray-800 rounded-full">
                Plants
              </TabsTrigger>
              <TabsTrigger value="mixes" className="data-[state=active]:bg-green-500 shadow-3xl shadow-green-500 data-[state=active]:text-gray-800  rounded-full">
                Fertilizer mixes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="plants" className="mt-4">
              <PlantList growId={id} />
            </TabsContent>
            <TabsContent value="mixes" className="mt-4">
              <FertilizerMixesManager growId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
    </main >
  );
}

