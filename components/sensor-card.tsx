import { Card } from '@/components/ui/card';
import { ThermometerSun, Droplets, AlertCircle, RefreshCw, Lightbulb, Fan, Filter, Gauge, ToggleLeft } from 'lucide-react';
import { ProcessedSensorData, SensorValue } from '@/hooks/useSensorData';
import { cn } from '@/lib/utils';
import { TuyaSensor } from '@/lib/db';
import { 
  getSensorIcon, 
  formatSensorValueName, 
  formatSensorValue, 
  getLastUpdatedText 
} from '@/lib/sensor-utils';

interface SensorCardProps {
  sensor: ProcessedSensorData;
  className?: string;
}

export function SensorCard({ sensor, className }: SensorCardProps) {
  /**
   * Ermittelt das passende Icon für einen Sensortyp oder Eigenschaftsnamen
   * @param type Sensortyp
   * @param size Größe des Icons
   * @param valueName Optional: Name der Sensoreigenschaft für Fallback
   * @returns React-Element mit passendem Icon
   */
  const getSensorIcon = (type?: TuyaSensor['type'], size: 'sm' | 'lg' = 'sm', valueName?: string) => {
    const iconSize = size === 'sm' ? "h-5 w-5" : "h-6 w-6";
    
    // Bestimme Icon basierend auf Sensortyp
    if (type) {
      switch (type) {
        case 'Temperature':
          return <ThermometerSun className={`${iconSize} text-amber-400`} />;
        case 'Humidity':
          return <Droplets className={`${iconSize} text-blue-400`} />;
        case 'Lamp':
          return <Lightbulb className={`${iconSize} text-yellow-400`} />;
        case 'Fan':
          return <Fan className={`${iconSize} text-sky-400`} />;
        case 'Carbon Filter':
          return <Filter className={`${iconSize} text-green-400`} />;
        case 'Boolean':
          return <ToggleLeft className={`${iconSize} text-indigo-400`} />;
        case 'Number':
          return <Gauge className={`${iconSize} text-purple-400`} />;
      }
    }
    
    // Fallback zu Wertenamen-basierter Icon-Auswahl
    if (valueName) {
      if (valueName.includes('temp')) {
        return <ThermometerSun className={`${iconSize} text-amber-400`} />;
      } else if (valueName.includes('humid')) {
        return <Droplets className={`${iconSize} text-blue-400`} />;
      } else if (valueName.includes('lamp') || valueName.includes('light')) {
        return <Lightbulb className={`${iconSize} text-yellow-400`} />;
      } else if (valueName.includes('fan')) {
        return <Fan className={`${iconSize} text-sky-400`} />;
      } else if (valueName.includes('filter')) {
        return <Filter className={`${iconSize} text-green-400`} />;
      } 
    }
    
    // Standardwert, wenn kein spezifisches Icon gefunden wurde
    return <Gauge className={`${iconSize} text-purple-400`} />;
  };

  /**
   * Formatiert den Namen einer Sensoreigenschaft für die Anzeige
   * @param valueName Name der Sensoreigenschaft
   * @returns Formatierter Name
   */
  const formatValueName = (valueName: string) => {
    return valueName
      .replace(/_/g, ' ')
      .replace('current', '')
      .replace('temp', 'Temperatur')
      .replace('humidity', 'Luftfeuchtigkeit')
      .replace('value', '')
      .trim();
  };

  /**
   * Formatiert einen Sensorwert für die Anzeige mit optionaler Einheit
   * @param value Sensorwert (Zahl oder String)
   * @param unit Optionale Einheit
   * @returns Formatierter Wert mit Einheit
   */
  const formatValue = (value: string | number, unit?: string) => {
    if (typeof value === 'number') {
      // Formatiere Zahlen auf 1 Dezimalstelle, wenn es ein Float ist
      return value % 1 !== 0 ? `${value.toFixed(1)}${unit || ''}` : `${value}${unit || ''}`;
    }
    return `${value}${unit || ''}`;
  };

  /**
   * Berechnet einen benutzerfreundlichen Text für den Zeitpunkt der letzten Aktualisierung
   * @returns Formatierter Zeittext
   */
  const getLastUpdatedText = () => {
    if (!sensor.lastUpdated) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - sensor.lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `vor ${diffSec} Sekunden`;
    if (diffSec < 3600) return `vor ${Math.floor(diffSec / 60)} Minuten`;
    return `vor ${Math.floor(diffSec / 3600)} Stunden`;
  };

  return (
    <Card className={cn(
      "p-4 bg-gray-800 border-gray-700 text-white shadow-xl",
      className
    )}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{sensor.name}</h3>
        {getSensorIcon(sensor.type, 'lg')}
      </div>

      {sensor.isLoading ? (
        <div className="flex items-center justify-center h-24">
          <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
        </div>
      ) : sensor.error ? (
        <div className="flex flex-col items-center justify-center h-24 gap-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-red-400">{sensor.error}</p>
        </div>
      ) : sensor.values.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-gray-400">
          <p>No data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sensor.values.map((value, index) => (
            <div key={index} className="flex items-center gap-3">
              {getSensorIcon(sensor.type, 'sm', value.name)}
              <div className="flex-1">
                <p className="text-sm text-gray-400">
                  {formatSensorValueName(value.name)}
                </p>
                <p className="text-xl font-medium">
                  {formatSensorValue(value.value, value.unit)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          Updated: {getLastUpdatedText(sensor.lastUpdated)}
        </p>
      </div>
    </Card>
  );
} 