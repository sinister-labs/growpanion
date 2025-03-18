"use client"

import { useState, useEffect } from "react"
import GrowEnvironment from "@/components/grow-environment"
import { PlantList } from "@/components/plant-list"
import { GrowInfo } from "@/components/grow-info"
import { Montserrat } from "next/font/google"
import Header from "@/components/header"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { useSensorData } from "@/hooks/useSensorData"
import { Loader2, ArrowRight, ChevronDown, Check, TreesIcon as Plant } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const montserrat = Montserrat({ subsets: ["latin"] })

export default function Home() {
  const { grows, activeGrowId, getActiveGrow, getActiveGrows, isGrowActive, isLoading, error, updateGrow, setActiveGrow } = useGrows();
  const { plants, isLoading: plantsLoading } = usePlants(activeGrowId);
  const activeGrow = getActiveGrow();
  const activeGrows = getActiveGrows();
  const [isGrowDropdownOpen, setIsGrowDropdownOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Callback für Phasenänderungen im aktiven Grow
  const handlePhaseChange = (newPhase: string) => {
    if (!activeGrow) return;

    const updatedGrow = {
      ...activeGrow,
      currentPhase: newPhase,
      phaseHistory: [...activeGrow.phaseHistory, { phase: newPhase, startDate: new Date().toISOString() }],
    };

    updateGrow(updatedGrow)
      .then(() => {
        toast({
          variant: "success",
          title: "Phase changed",
          description: `The phase was successfully changed to "${newPhase}".`,
        });

        // Wenn die Phase auf "Done" gesetzt wurde, informiere den Benutzer
        if (newPhase === "Done") {
          toast({
            variant: "default",
            title: "Grow completed",
            description: `The Grow "${updatedGrow.name}" was marked as completed and will no longer appear in the dashboard.`,
          });
        }
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "The phase could not be changed: " + error.message,
        });
      });
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }, [error, toast]);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-opacity-90">
      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-opacity-90">
      <div className="bg-red-900/30 text-red-300 p-8 rounded-lg max-w-md">
        <h2 className="text-xl font-semibold mb-4">Error</h2>
        <p>{error.message}</p>
      </div>
    </div>
  );

  return (
    <main
      className={`flex min-h-screen flex-col items-center p-4 sm:p-8 bg-black bg-opacity-90 ${montserrat.className}`}
    >
      <div className="w-full max-w-7xl relative z-10">
        <Header />
        <div className="space-y-8 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="font-semibold text-white">Dashboard</h1>
              {activeGrows.length > 0 ? (
                <div className="mt-2">
                  <CustomDropdown
                    options={activeGrows.map((grow) => ({
                      id: grow.id,
                      label: grow.name,
                      description: `${grow.currentPhase} • ${Math.floor((new Date().getTime() - new Date(grow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Tage`
                    }))}
                    value={activeGrowId || ""}
                    onChange={(value) => {
                      setActiveGrow(value);
                      toast({
                        title: "Grow switched",
                        description: `Active Grow: ${grows.find(g => g.id === value)?.name}`,
                      });
                    }}
                    placeholder="Grow select"
                    renderFooter={() => (
                      <Link href="/grows">
                        <DropdownMenuItem className="py-2 cursor-pointer text-gray-300 hover:text-white">
                          Manage all Grows
                          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </DropdownMenuItem>
                      </Link>
                    )}
                  />
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-400">
                  No active grows available. Create a new grow or check completed grows.
                </div>
              )}
            </div>
            <Link href="/grows">
              <Button className="bg-green-600 hover:bg-green-700">
                Manage Grows
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <GrowEnvironment grow={activeGrow || undefined} onPhaseChange={handlePhaseChange} />

          {activeGrow ? (
            <>
              <GrowInfo
                grow={{
                  ...activeGrow,
                  plants: plants
                }}
                onPhaseChange={handlePhaseChange}
              />

              <PlantList growId={activeGrowId} />
            </>
          ) : (
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center">
              <Plant className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2 text-white">No plants yet</h3>
              <p className="text-gray-400 mb-4">
                {grows.length === 0
                  ? "Create a grow first to add plants."
                  : "All your grows are completed. Create a new grow to get started."}
              </p>
              <Button
                onClick={() => router.push("/grows")}
                className="bg-green-600 hover:bg-green-700"
              >
                {grows.length > 0 ? "Create new grow" : "Select grow"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
    </main>
  )
}

