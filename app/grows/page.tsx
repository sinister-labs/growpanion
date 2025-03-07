"use client"

import { useState } from "react"
import { useGrows } from "@/hooks/useGrows"
import { Montserrat } from "next/font/google"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Calendar, Plus, ArrowRight, Home, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Grow } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomDropdown, DropdownOption } from "@/components/ui/custom-dropdown"

const montserrat = Montserrat({ subsets: ["latin"] })

export default function GrowsPage() {
  const {
    grows,
    activeGrowId,
    isLoading,
    error,
    addGrow,
    updateGrow,
    removeGrow,
    setActiveGrow,
    isGrowActive,
    getActiveGrows
  } = useGrows();

  const [isNewGrowDialogOpen, setIsNewGrowDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [newGrow, setNewGrow] = useState<Partial<Grow>>({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    currentPhase: "Seedling",
    phaseHistory: [
      { phase: "Seedling", startDate: new Date().toISOString() }
    ]
  });

  // Filtern der Grows nach Status
  const activeGrows = grows.filter(isGrowActive);
  const completedGrows = grows.filter(grow => !isGrowActive(grow));

  const handleGrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGrow({
      ...newGrow,
      [e.target.name]: e.target.value
    });
  };

  const handlePhaseChange = (phase: string) => {
    setNewGrow({
      ...newGrow,
      currentPhase: phase
    });
  };

  const handleCreateGrow = async () => {
    if (!newGrow.name || !newGrow.startDate || !newGrow.currentPhase) {
      return;
    }

    try {
      await addGrow(newGrow as Omit<Grow, "id">);
      setIsNewGrowDialogOpen(false);
      setNewGrow({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        currentPhase: "Seedling",
        phaseHistory: [
          { phase: "Seedling", startDate: new Date().toISOString() }
        ]
      });
    } catch (error) {
      console.error("Error creating grow:", error);
    }
  };

  // Function to return the correct color for a specific phase
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "Seedling": return "bg-blue-600/30 text-blue-400";
      case "Vegetative": return "bg-green-600/30 text-green-400";
      case "Flowering": return "bg-purple-600/30 text-purple-400";
      case "Flushing": return "bg-yellow-600/30 text-yellow-400";
      case "Drying": return "bg-orange-600/30 text-orange-400";
      case "Curing": return "bg-amber-600/30 text-amber-400";
      case "Done": return "bg-gray-600/30 text-gray-400";
      default: return "bg-green-600/30 text-green-400";
    }
  };

  // Phase options for the dropdown in the creation dialog
  const phaseOptions: DropdownOption[] = [
    { id: "Seedling", label: "Seedling" },
    { id: "Vegetative", label: "Vegetative" },
    { id: "Flowering", label: "Flowering" },
    { id: "Flushing", label: "Flushing" },
    { id: "Drying", label: "Drying" },
    { id: "Curing", label: "Curing" },
    { id: "Done", label: "Done" }
  ];

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
                <h1 className="text-3xl font-bold text-white">Grows</h1>
              </div>
              <p className="text-gray-400">Verwalte deine Growing-Zyklen</p>
            </div>

            <Dialog open={isNewGrowDialogOpen} onOpenChange={setIsNewGrowDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Grow
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-green-400">Neuen Grow erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid w-full gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newGrow.name || ""}
                      onChange={handleGrowChange}
                      placeholder="z.B. Sommer Grow 2023"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div className="grid w-full gap-2">
                    <Label htmlFor="startDate">Startdatum</Label>
                    <div className="relative">
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={newGrow.startDate || ""}
                        onChange={handleGrowChange}
                        className="bg-gray-700 border-gray-600"
                      />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid w-full gap-2">
                    <Label htmlFor="phase">Aktuelle Phase</Label>
                    <CustomDropdown
                      options={phaseOptions}
                      value={newGrow.currentPhase || "Seedling"}
                      onChange={handlePhaseChange}
                      width="w-full"
                      buttonClassName="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={handleCreateGrow}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Grow erstellen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {grows.length === 0 ? (
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-lg text-gray-400 mb-4">
                Du hast noch keine Grows angelegt.
              </p>
              <Button
                onClick={() => setIsNewGrowDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ersten Grow erstellen
              </Button>
            </div>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 bg-gray-800">
                  <TabsTrigger
                    value="active"
                    className="data-[state=active]:bg-green-900 data-[state=active]:text-white"
                  >
                    Active Grows ({activeGrows.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="data-[state=active]:bg-gray-600 data-[state=active]:text-white"
                  >
                    Completed ({completedGrows.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                  {activeGrows.length === 0 ? (
                    <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                      <p className="text-lg text-gray-400 mb-4">
                        Du hast keine aktiven Grows.
                      </p>
                      <Button
                        onClick={() => setIsNewGrowDialogOpen(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Neuen Grow erstellen
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeGrows.map(grow => (
                        <Link key={grow.id} href={`/grows/${grow.id}`} className="block">
                          <Card
                            className={`bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${grow.id === activeGrowId ? 'border-green-500 ring-1 ring-green-500' : ''
                              }`}
                          >
                            <CardHeader>
                              <CardTitle className="text-base sm:text-lg font-medium text-green-400 flex justify-between">
                                {grow.name}
                                {grow.id === activeGrowId && (
                                  <Badge className="bg-green-600 text-xs">Aktiv</Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="text-gray-400">
                                Started on {new Date(grow.startDate).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Current Phase:</span>
                                <span className={`rounded px-2 py-1 text-xs ${getPhaseColor(grow.currentPhase)}`}>
                                  {grow.currentPhase}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-gray-400 text-sm">Duration:</span>
                                <span className="text-white text-sm">
                                  {Math.floor((new Date().getTime() - new Date(grow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                                </span>
                              </div>

                              <div className="mt-4 flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveGrow(grow.id);
                                  }}
                                  className={grow.id === activeGrowId
                                    ? "bg-green-900/20 text-green-400 hover:bg-green-900/30"
                                    : "text-gray-400 hover:text-white"
                                  }
                                >
                                  {grow.id === activeGrowId ? "Active Grow" : "Set as active"}
                                </Button>
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                  {completedGrows.length === 0 ? (
                    <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
                      <p className="text-lg text-gray-400 mb-4">
                        Du hast keine abgeschlossenen Grows.
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Grows werden als abgeschlossen markiert, wenn sie die Phase "Done" erreichen.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {completedGrows.map(grow => (
                        <Link key={grow.id} href={`/grows/${grow.id}`} className="block">
                          <Card
                            className="bg-gray-800/50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-gray-500 transition-all duration-300 transform hover:scale-105 cursor-pointer opacity-80"
                          >
                            <CardHeader>
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base sm:text-lg font-medium text-gray-300">
                                  {grow.name}
                                </CardTitle>
                                <Badge className="bg-gray-600 text-xs">Completed</Badge>
                              </div>
                              <CardDescription className="text-gray-500">
                                Started on {new Date(grow.startDate).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Status:</span>
                                <span className="bg-gray-600/30 text-gray-400 rounded px-2 py-1 text-xs flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> Completed
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-gray-500 text-sm">Total Duration:</span>
                                <span className="text-gray-300 text-sm">
                                  {Math.floor((new Date().getTime() - new Date(grow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                                </span>
                              </div>

                              <div className="mt-4 flex justify-end items-center">
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
    </main>
  );
}

