"use client";

import { useEffect, useMemo, useState } from 'react';
import { BatteryCharging, Gauge, Lightbulb, PlugZap, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import {
  calculatePowerCost,
  clampPowerNumber,
  createPowerConsumerInputFromDevice,
  createPowerConsumerInputFromRuntimeTelemetry,
  createPowerConsumerInputFromRecord,
  createPowerConsumerRecord,
  createPowerCostProfileRecord,
  POWER_CONSUMER_TEMPLATES,
  type PowerConsumerInput,
} from '@/lib/power-cost-utils';
import {
  getDevicesForGrow,
  getPowerConsumersForGrow,
  getPowerCostProfilesForGrow,
  getTelemetryForGrow,
  savePowerConsumer,
  savePowerCostProfile,
  type PowerCostProfile,
} from '@/lib/db';
import { useGrows } from '@/hooks/useGrows';
import { useToast } from '@/hooks/use-toast';

const phaseOptions: Array<{ id: NonNullable<PowerConsumerInput['phase']>; label: string }> = [
  { id: 'both', label: 'Beide' },
  { id: 'growth', label: 'Wachstum' },
  { id: 'flower', label: 'Blüte' },
];

const parseNumber = (value: string, min: number, max: number, fallback: number): number => {
  if (value.trim() === '') return fallback;
  return clampPowerNumber(Number(value), min, max, fallback);
};

export default function PowerCostCalculator() {
  const { getActiveGrow } = useGrows();
  const activeGrow = getActiveGrow();
  const { toast } = useToast();
  const [profileName, setProfileName] = useState('Default grow estimate');
  const [profiles, setProfiles] = useState<PowerCostProfile[]>([]);
  const [vegDays, setVegDays] = useState(35);
  const [flowerDays, setFlowerDays] = useState(63);
  const [vegLightWatts, setVegLightWatts] = useState(300);
  const [flowerLightWatts, setFlowerLightWatts] = useState(480);
  const [vegLightHours, setVegLightHours] = useState(18);
  const [flowerLightHours, setFlowerLightHours] = useState(12);
  const [ballastMultiplier, setBallastMultiplier] = useState(1.05);
  const [centPerKwh, setCentPerKwh] = useState(32);
  const [plantCount, setPlantCount] = useState(4);
  const [harvestGrams, setHarvestGrams] = useState(0);
  const [consumers, setConsumers] = useState(POWER_CONSUMER_TEMPLATES);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPowerProfiles() {
      try {
        const [storedProfiles, storedConsumers] = await Promise.all([
          getPowerCostProfilesForGrow(activeGrow?.id),
          getPowerConsumersForGrow(activeGrow?.id),
        ]);

        if (cancelled) return;
        setProfiles(storedProfiles);
        if (storedProfiles[0]) {
          const profile = storedProfiles[0];
          setProfileName(profile.name);
          setCentPerKwh(profile.centPerKwh);
          setVegDays(profile.vegDays);
          setFlowerDays(profile.flowerDays);
          setPlantCount(profile.plantCount ?? 4);
          setHarvestGrams(profile.harvestGrams ?? 0);
        }
        if (storedConsumers.length > 0) {
          setConsumers(storedConsumers.map(createPowerConsumerInputFromRecord));
        }
        setSaveError(null);
      } catch (error) {
        if (!cancelled) {
          setSaveError(error instanceof Error ? error.message : 'Power profiles could not be loaded.');
        }
      }
    }

    void loadPowerProfiles();
    return () => {
      cancelled = true;
    };
  }, [activeGrow?.id]);

  const result = useMemo(() => calculatePowerCost({
    vegDays,
    flowerDays,
    vegLightWatts,
    flowerLightWatts,
    vegLightHours,
    flowerLightHours,
    ballastMultiplier,
    centPerKwh,
    plantCount,
    harvestGrams,
    additionalConsumers: consumers,
  }), [
    vegDays,
    flowerDays,
    vegLightWatts,
    flowerLightWatts,
    vegLightHours,
    flowerLightHours,
    ballastMultiplier,
    centPerKwh,
    plantCount,
    harvestGrams,
    consumers,
  ]);

  const updateConsumer = (id: string, field: 'watts' | 'hoursPerDay', value: number) => {
    setConsumers(prev => prev.map(consumer => consumer.id === id ? { ...consumer, [field]: value } : consumer));
  };

  const updateConsumerPhase = (id: string, phase: NonNullable<PowerConsumerInput['phase']>) => {
    setConsumers(prev => prev.map(consumer => consumer.id === id ? { ...consumer, phase } : consumer));
  };

  const handleSaveProfile = async () => {
    try {
      const timestamp = new Date().toISOString();
      const profile = createPowerCostProfileRecord({
        id: profiles[0]?.id,
        growId: activeGrow?.id,
        name: profileName,
        centPerKwh,
        vegDays,
        flowerDays,
        plantCount,
        harvestGrams,
        timestamp,
      });

      await savePowerCostProfile(profile);
      await Promise.all(consumers.map(consumer => savePowerConsumer(createPowerConsumerRecord({
        id: consumer.id,
        growId: activeGrow?.id,
        label: consumer.label,
        watts: consumer.watts,
        hoursPerDay: consumer.hoursPerDay,
        phase: consumer.phase,
        timestamp,
      }))));

      setProfiles([profile]);
      setSaveError(null);
      toast({ variant: 'success', title: 'Power profile saved', description: 'Power cost profile and consumers were persisted.' });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save power profile.');
    }
  };

  const handleImportDevices = async () => {
    if (!activeGrow) return;

    try {
      const devices = await getDevicesForGrow(activeGrow.id);
      const deviceConsumers = devices.map(createPowerConsumerInputFromDevice);
      const existingIds = new Set(consumers.map(consumer => consumer.id));
      setConsumers(current => [...current, ...deviceConsumers.filter(consumer => !existingIds.has(consumer.id))]);
      toast({ variant: 'success', title: 'Devices imported', description: `${deviceConsumers.length} device consumers are ready for review.` });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to import device consumers.');
    }
  };

  const handleImportRuntimeTelemetry = async () => {
    if (!activeGrow) return;

    try {
      const [devices, telemetry] = await Promise.all([
        getDevicesForGrow(activeGrow.id),
        getTelemetryForGrow(activeGrow.id),
      ]);
      const runtimeConsumers = devices
        .map(device => createPowerConsumerInputFromRuntimeTelemetry(device, telemetry))
        .filter((consumer): consumer is PowerConsumerInput => Boolean(consumer));
      const existingIds = new Set(consumers.map(consumer => consumer.id));
      setConsumers(current => [...current, ...runtimeConsumers.filter(consumer => !existingIds.has(consumer.id))]);
      toast({ variant: 'success', title: 'Runtime imported', description: `${runtimeConsumers.length} telemetry-based consumers are ready for review.` });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to import runtime telemetry.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#00DF81]/16 p-2">
            <PlugZap className="h-5 w-5 text-[#00DF81]" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Power Cost Calculator</CardTitle>
            <p className="text-sm text-muted-foreground">Phase-based electricity estimates for lights, ventilation, climate and pumps</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Profile name</Label>
            <Input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSaveProfile}>
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </Button>
          <Button variant="outline" onClick={handleImportDevices} disabled={!activeGrow}>
            Import Devices
          </Button>
          <Button variant="outline" onClick={handleImportRuntimeTelemetry} disabled={!activeGrow}>
            Import Runtime
          </Button>
        </div>
        {saveError && <p className="text-sm text-[#AACBC4]">{saveError}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <NumberField label="Growth days" value={vegDays} min={0} max={365} onChange={setVegDays} />
          <NumberField label="Flower days" value={flowerDays} min={0} max={365} onChange={setFlowerDays} />
          <NumberField label="Cent per kWh" value={centPerKwh} min={0} max={200} step={0.1} onChange={setCentPerKwh} />
          <NumberField label="ELB factor" value={ballastMultiplier} min={1} max={1.5} step={0.01} onChange={setBallastMultiplier} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Lightbulb className="h-4 w-4 text-[#00DF81]" />
                Lighting
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField label="Growth watts" value={vegLightWatts} min={0} max={5000} onChange={setVegLightWatts} />
              <NumberField label="Growth h/day" value={vegLightHours} min={0} max={24} step={0.5} onChange={setVegLightHours} />
              <NumberField label="Flower watts" value={flowerLightWatts} min={0} max={5000} onChange={setFlowerLightWatts} />
              <NumberField label="Flower h/day" value={flowerLightHours} min={0} max={24} step={0.5} onChange={setFlowerLightHours} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Gauge className="h-4 w-4 text-primary" />
                Output
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Metric label="kWh / day" value={result.dailyKwhAverage} />
              <Metric label="kWh / week" value={result.weeklyKwhAverage} />
              <Metric label="Cost / day" value={`€${result.dailyCostAverage}`} />
              <Metric label="Cost / week" value={`€${result.weeklyCostAverage}`} />
              <Metric label="Grow total" value={`€${result.totalCost}`} highlight />
              <Metric label="Total kWh" value={result.totalKwh} highlight />
              <Metric label="Per plant" value={result.costPerPlant === null ? '-' : `€${result.costPerPlant}`} />
              <Metric label="Per gram" value={result.costPerGram === null ? '-' : `€${result.costPerGram}`} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <BatteryCharging className="h-4 w-4 text-primary" />
              Additional consumers
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {consumers.map(consumer => (
              <div key={consumer.id} className="grid grid-cols-1 items-end gap-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 sm:grid-cols-[1fr_96px_96px_116px]">
                <div>
                  <div className="text-sm font-semibold text-foreground">{consumer.label}</div>
                  <div className="text-xs text-muted-foreground">{consumer.id.startsWith('runtime-') ? 'Estimated from Device Layer telemetry' : 'Phase-scoped consumer'}</div>
                </div>
                <NumberField
                  label="Watts"
                  value={consumer.watts}
                  min={0}
                  max={10000}
                  onChange={(value) => updateConsumer(consumer.id, 'watts', value)}
                />
                <NumberField
                  label="h/day"
                  value={consumer.hoursPerDay}
                  min={0}
                  max={24}
                  step={0.5}
                  onChange={(value) => updateConsumer(consumer.id, 'hoursPerDay', value)}
                />
                <div>
                  <Label className="text-xs text-muted-foreground">Phase</Label>
                  <CustomDropdown
                    options={phaseOptions}
                    value={consumer.phase ?? 'both'}
                    onChange={(value) => updateConsumerPhase(consumer.id, value as NonNullable<PowerConsumerInput['phase']>)}
                    placeholder="Phase"
                    width="w-full"
                    buttonClassName="mt-1"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NumberField label="Plant count" value={plantCount} min={0} max={1000} onChange={setPlantCount} />
          <NumberField label="Harvest grams optional" value={harvestGrams} min={0} max={100000} step={1} onChange={setHarvestGrams} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {result.phases.map(phase => (
            <div key={phase.name} className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
              <div className="font-semibold text-foreground">{phase.name}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>{phase.days} days</div>
                <div>{phase.kwhPerDay} kWh/day</div>
                <div>{phase.kwhTotal} kWh total</div>
                <div className="font-semibold text-primary">€{phase.costTotal}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(parseNumber(event.target.value, min, max, min))}
        className="mt-1"
      />
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-[1rem] border p-3 ${highlight ? 'border-primary/35 bg-primary/10' : 'border-white/10 bg-white/[0.045]'}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
