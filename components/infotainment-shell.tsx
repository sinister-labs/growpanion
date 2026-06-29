"use client"

import Image from "next/image"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  BarChart3,
  Beaker,
  Bluetooth,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Droplets,
  Home,
  Leaf,
  Router,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Sprout,
  Thermometer,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGrows } from "@/hooks/useGrows"
import { useSensorData } from "@/hooks/useSensorData"
import { AppView, useRouting } from "@/hooks/useRouting"
import { calculateDuration } from "@/lib/utils"
import { getDashboardActiveGrow } from "@/lib/growth-utils"
import { getTelemetryForGrow, type TelemetryReading } from "@/lib/db"
import { cn } from "@/lib/utils"

type ShellModule = {
  view: AppView
  label: string
  shortLabel: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const modules: ShellModule[] = [
  { view: "dashboard", label: "Home", shortLabel: "Home", description: "Operating surface", icon: Home },
  { view: "grows", label: "Plants", shortLabel: "Plants", description: "Grow planning and plants", icon: Sprout },
  { view: "devices", label: "Environment", shortLabel: "Env", description: "Sensors and integrations", icon: Activity },
  { view: "genetics", label: "Data", shortLabel: "Data", description: "Strains and lineage", icon: Database },
  { view: "statistics", label: "Insights", shortLabel: "Stats", description: "Yield and performance", icon: BarChart3 },
  { view: "tools", label: "Tools", shortLabel: "Tools", description: "Calculators and utilities", icon: Beaker },
]

const moduleByView: Partial<Record<AppView, ShellModule>> = Object.fromEntries(
  modules.map((module) => [module.view, module]),
) as Partial<Record<AppView, ShellModule>>

const settingsModule: ShellModule = {
  view: "settings",
  label: "Settings",
  shortLabel: "Settings",
  description: "Integrations, backup, notifications",
  icon: Settings,
}

const getCurrentModule = (view: AppView): ShellModule => {
  if (view === "settings") return settingsModule
  if (view === "growDetail") {
    return { ...modules[1], label: "Grow Detail", description: "Selected grow workspace" }
  }
  return moduleByView[view] ?? modules[0]
}

const latestMetric = (readings: TelemetryReading[], metric: TelemetryReading["metric"]) => {
  return readings
    .filter((reading) => reading.metric === metric)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]
}

const formatReading = (reading: TelemetryReading | undefined, fallback: string) => {
  if (!reading) return fallback
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(reading.value)}${reading.unit}`
}

export function InfotainmentShell({ children }: { children: React.ReactNode }) {
  const { currentView, navigateTo } = useRouting()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { grows, activeGrowId, isLoading } = useGrows()
  const { sensorData } = useSensorData(60000)
  const [now, setNow] = useState<Date | null>(null)
  const [telemetryReadings, setTelemetryReadings] = useState<TelemetryReading[]>([])
  const activeGrow = getDashboardActiveGrow(grows, activeGrowId)
  const currentModule = getCurrentModule(currentView)

  const activeGrowText = activeGrow
    ? `${activeGrow.currentPhase} · ${calculateDuration(activeGrow.startDate)} days`
    : "No active grow"

  const actionItems = [
    {
      label: activeGrow ? "Open active grow" : "Create or select grow",
      description: activeGrow ? activeGrow.name : "Start from the grow workspace",
      view: activeGrow ? ("growDetail" as const) : ("grows" as const),
      params: activeGrow ? { id: activeGrow.id } : undefined,
      icon: Sprout,
    },
    {
      label: "Open tools",
      description: "DLI, harvest and power calculators",
      view: "tools" as const,
      icon: Beaker,
    },
    {
      label: "Review devices",
      description: "Sensors, integrations and telemetry sources",
      view: "devices" as const,
      icon: Router,
    },
  ]
  const showPrimaryGrowAction = currentView === "dashboard" || currentView === "growDetail"

  const topbarStatus = useMemo(() => {
    const hasTelemetry = telemetryReadings.length > 0 || sensorData.some((sensor) => sensor.values.length > 0 && !sensor.error)
    const hasErrors = sensorData.some((sensor) => sensor.error)
    if (hasErrors) return { label: "Sensor Check", value: "Attention", className: "text-amber-300" }
    if (hasTelemetry) return { label: "All Systems", value: "Optimal", className: "text-emerald-300" }
    return { label: "Device Layer", value: "Manual ready", className: "text-emerald-300" }
  }, [sensorData, telemetryReadings.length])

  const topbarDate = now
    ? new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(now).toUpperCase()
    : ""
  const topbarTime = now
    ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(now)
    : "--:--"
  const temperature = formatReading(latestMetric(telemetryReadings, "temperature"), "--.-°C")
  const humidity = formatReading(latestMetric(telemetryReadings, "humidity"), "--%")

  useEffect(() => {
    const updateClock = () => setNow(new Date())
    updateClock()
    const timer = window.setInterval(updateClock, 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTelemetry() {
      if (!activeGrow) {
        setTelemetryReadings([])
        return
      }

      try {
        const readings = await getTelemetryForGrow(activeGrow.id)
        if (!cancelled) setTelemetryReadings(readings)
      } catch {
        if (!cancelled) setTelemetryReadings([])
      }
    }

    loadTelemetry()
    return () => {
      cancelled = true
    }
  }, [activeGrow])

  useEffect(() => {
    const viewport = contentScrollRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]")
    viewport?.scrollTo({ top: 0, left: 0 })
  }, [currentView])

  return (
    <div className="relative h-screen max-h-screen min-h-screen overflow-hidden bg-[#060b0f] p-2 text-slate-100 sm:p-3 lg:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(50,255,152,0.13),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(69,120,255,0.10),transparent_30%),linear-gradient(180deg,#090f14_0%,#04080b_100%)]" />
      <div className="relative mx-auto grid h-full max-w-[1840px] grid-cols-1 overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0a1117]/94 shadow-[0_34px_110px_rgba(0,0,0,0.56)] backdrop-blur-2xl lg:grid-cols-[8.25rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-black/30 px-3 py-5 lg:flex lg:flex-col lg:items-center lg:gap-6">
   
          <nav className="flex flex-1 flex-col items-center justify-center gap-3" aria-label="Primary modules">
            {modules.map((module) => {
              const Icon = module.icon
              const active = currentView === module.view || (currentView === "growDetail" && module.view === "grows")
              return (
                <button
                  key={module.view}
                  className={cn(
                    "group relative flex w-[5.7rem] flex-col items-center justify-center gap-2 rounded-[1.1rem] border px-2 py-3 text-[0.68rem] font-medium uppercase tracking-normal transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                    active
                      ? "border-emerald-300/[0.24] bg-emerald-300/[0.12] text-emerald-300 shadow-[0_0_32px_rgba(52,255,154,0.18)]"
                      : "border-transparent bg-transparent text-slate-400 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-slate-100",
                  )}
                  onClick={() => navigateTo(module.view)}
                  aria-label={module.label}
                  title={module.label}
                >
                  {active && <span className="absolute -left-3 top-5 h-11 w-1 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,255,154,0.85)]" />}
                  <span className={cn(
                    "grid h-11 w-11 place-items-center rounded-full border transition-colors",
                    active ? "border-emerald-300/[0.25] bg-emerald-300/[0.14]" : "border-white/10 bg-black/[0.18]",
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{module.label}</span>
                </button>
              )
            })}
          </nav>


        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-white/10 bg-white/[0.035] backdrop-blur-2xl">
            <div className="flex min-h-[4.8rem] items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
              <button
                className="flex min-w-0 items-center gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => navigateTo("dashboard")}
                aria-label="GrowPanion Home"
              >
                <Image src="/logo-light.svg" alt="GrowPanion" width={42} height={42} className="h-10 w-auto p-1" />
                <span className="hidden text-sm font-semibold text-foreground sm:inline lg:hidden">GrowPanion</span>
              </button>

              <div className="hidden items-center gap-4 xl:flex">
                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.14] bg-black/[0.22] px-5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <Activity className="h-4 w-4 text-emerald-300" />
                  <span className="font-medium text-slate-100">{topbarStatus.label}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,255,154,0.8)]" />
                  <span className={cn("font-medium", topbarStatus.className)}>{topbarStatus.value}</span>
                </div>
                <div className="flex items-center gap-5 text-slate-300">
                  <Bluetooth className="h-4 w-4" />
                  <Signal className="h-4 w-4" />
                  <ShieldCheck className="h-4 w-4" />
                  <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                    <Thermometer className="h-4 w-4" />
                    {temperature}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                    <Droplets className="h-4 w-4" />
                    {humidity}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden border-l border-white/[0.12] pl-5 text-right sm:block">
                  <p className="text-lg font-medium leading-none tabular-nums text-white">{topbarTime}</p>
                  <p className="mt-1 text-[0.67rem] font-medium uppercase tracking-normal text-slate-400">{topbarDate}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 border border-white/[0.12] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  onClick={() => navigateTo("settings")}
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <div className="module-command-band h-fit border-b border-white/10 bg-white/[0.025] py-2 px-3">
            <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
              <div className="current-module-panel relative z-10 flex min-h-[5.25rem] items-center gap-4 overflow-visible px-4 sm:px-5">
                <button
                  className="hidden h-12 w-12 place-items-center rounded-xl border border-emerald-300/[0.20] bg-emerald-300/10 text-emerald-200 shadow-[0_0_24px_rgba(52,255,154,0.12)] transition-colors hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 lg:grid"
                  onClick={() => navigateTo("dashboard")}
                  aria-label="Back to dashboard"
                  title="Back to dashboard"
                >
                  {currentView === "dashboard" ? <Home className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Current module</p>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="truncate text-xl font-semibold text-white">{currentModule.label}</p>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>

              <button
                className="workspace-dropdown relative z-20 flex min-h-[4.35rem] items-center justify-between gap-4 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#151d25]/90 px-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_16px_38px_rgba(0,0,0,0.22)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-white/[0.16] hover:bg-[#19232d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => navigateTo(activeGrow ? "growDetail" : "grows", activeGrow ? { id: activeGrow.id } : undefined)}
              >
                <span className="min-w-0">
                  <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</span>
                  <span className="mt-1 block truncate text-base font-semibold text-white">
                    {isLoading ? "Loading" : activeGrow?.name ?? "GrowPanion"}
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white transition-transform duration-200" />
              </button>
            </div>
          </div>

          <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            {currentView !== "dashboard" && (
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/[0.18] bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
                    <Activity className="h-3.5 w-3.5" />
                    {activeGrowText}
                  </div>
                  <h1 className="truncate text-4xl font-light tracking-normal text-white md:text-5xl">
                    {currentModule.label}
                  </h1>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  {activeGrow ? `Your grow is in ${activeGrow.currentPhase} stage. Systems nominal.` : currentModule.description}
                </p>
              </div>
              {showPrimaryGrowAction && (
                <Button
                  className="h-12 rounded-full border border-emerald-200/20 bg-emerald-500 px-7 text-base font-semibold text-white shadow-[0_0_32px_rgba(16,185,129,0.34)] hover:bg-emerald-400"
                  onClick={() => navigateTo(activeGrow ? "growDetail" : "grows", activeGrow ? { id: activeGrow.id } : undefined)}
                >
                  {activeGrow ? "Open Grow" : "Manage Grows"}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
            )}

            {currentView !== "dashboard" && (
            <details className="group border-b border-white/10 bg-white/[0.025] lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Assistant
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
                {actionItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition-colors hover:border-emerald-300/[0.25] hover:bg-emerald-300/10"
                      onClick={() => navigateTo(item.view, item.params)}
                    >
                      <span className="rounded-xl bg-emerald-300/[0.12] p-2 text-emerald-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </details>
            )}

            <ScrollArea ref={contentScrollRef} className="min-h-0 min-w-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden">
              <div className="min-w-0 max-w-full overflow-x-hidden p-3 pb-28 sm:p-4 lg:p-5 lg:pb-5">{children}</div>
            </ScrollArea>

          </section>
        </div>

        <nav className="z-40 mx-3 mb-3 grid grid-cols-6 rounded-[1.25rem] border border-white/[0.12] bg-[#0d151b]/92 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:hidden">
          {modules.map((module) => {
            const Icon = module.icon
            const active = currentView === module.view || (currentView === "growDetail" && module.view === "grows")
            return (
              <button
                key={module.view}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-[0.95rem] text-[0.68rem] font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                  active ? "bg-emerald-400/[0.16] text-emerald-200 shadow-[0_0_22px_rgba(52,255,154,0.15)]" : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                )}
                onClick={() => navigateTo(module.view)}
                aria-label={module.label}
              >
                <Icon className="h-4 w-4" />
                <span className="max-[360px]:sr-only">{module.shortLabel}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
