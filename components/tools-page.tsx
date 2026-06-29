"use client";

import { useState } from 'react';
import { Beaker, ChevronRight, PlugZap, Scale, SunMedium } from 'lucide-react';
import { DLICalculator } from '@/components/dli-calculator';
import HarvestCalculator from '@/components/harvest-calculator/HarvestCalculator';
import { PowerCostCalculator } from '@/components/power-cost-calculator';

type ToolId = 'dli' | 'harvest' | 'power';

const tools: Array<{
    id: ToolId;
    name: string;
    shortName: string;
    label: string;
    description: string;
    metric: string;
    icon: typeof Beaker;
}> = [
    {
        id: 'dli',
        name: 'DLI Calculator',
        shortName: 'DLI',
        label: 'Light planning',
        description: 'Tune PPFD and photoperiod for the active growth phase.',
        metric: 'mol/m²/day',
        icon: SunMedium,
    },
    {
        id: 'harvest',
        name: 'Harvest Yield',
        shortName: 'Yield',
        label: 'Yield model',
        description: 'Estimate output from plant count, medium, light and experience.',
        metric: 'g / grow',
        icon: Scale,
    },
    {
        id: 'power',
        name: 'Power Cost',
        shortName: 'Power',
        label: 'Runtime cost',
        description: 'Model electricity spend across lights, climate and pumps.',
        metric: 'kWh / cycle',
        icon: PlugZap,
    },
];

export default function ToolsPage() {
    const [activeTool, setActiveTool] = useState<ToolId>('dli');
    const selectedTool = tools.find(tool => tool.id === activeTool) ?? tools[0];

    return (
        <div className="mt-3 space-y-3">
            <section className="infotainment-panel min-w-0 overflow-hidden p-3 sm:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <div className="os-section-title">
                            <Beaker className="h-4 w-4" />
                            Tool console
                        </div>
                        <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">Calculators</h2>
                        <p className="mt-1 line-clamp-1 max-w-md text-sm text-muted-foreground">
                            Choose one tool, tune inputs, read the output.
                        </p>
                    </div>

                    <div className="min-w-0 flex-1 xl:max-w-xl">
                        <div className="max-w-full overflow-x-auto pb-1">
                            <div className="flex min-w-max gap-2">
                            {tools.map(tool => {
                                const Icon = tool.icon;
                                const isActive = tool.id === activeTool;
                                return (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => setActiveTool(tool.id)}
                                    className={`group flex min-h-[64px] w-[178px] items-center gap-3 rounded-[1rem] border p-3 text-left transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                            isActive
                                                ? 'border-emerald-300/[0.28] bg-emerald-400/[0.24] text-emerald-100 shadow-[0_0_28px_rgba(52,255,154,0.20),inset_0_1px_0_rgba(255,255,255,0.12)]'
                                                : 'border-white/[0.12] bg-white/[0.045] text-slate-200 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10'
                                        }`}
                                    >
                                        <span className={`shrink-0 rounded-2xl p-2 ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                                            <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold leading-tight">{tool.shortName}</span>
                                            <span className={`mt-1 block truncate text-xs ${isActive ? 'text-primary-foreground/82' : 'text-muted-foreground'}`}>
                                                {tool.label}
                                            </span>
                                        </span>
                                        <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                    </button>
                                );
                            })}
                            </div>
                        </div>
                    </div>

                    <div className="grid shrink-0 gap-2 sm:grid-cols-3 xl:min-w-[410px]">
                        <ToolStat label="Active tool" value={selectedTool.name} />
                        <ToolStat label="Primary output" value={selectedTool.metric} />
                        <ToolStat label="Mode" value={selectedTool.label} />
                    </div>
                </div>
            </section>

            <section className="min-w-0">
                {activeTool === 'dli' && <DLICalculator />}
                {activeTool === 'harvest' && <HarvestCalculator />}
                {activeTool === 'power' && <PowerCostCalculator />}
            </section>
        </div>
    );
}

function ToolStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="os-stat-card p-2.5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">{value}</div>
        </div>
    );
}
