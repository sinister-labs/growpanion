import { Thermometer, Droplets, Wind, Filter, Fan, Sun } from "lucide-react"

const iconMap = {
  temperature: Thermometer,
  humidity: Droplets,
  vpd: Wind,
  filter: Filter,
  fan: Fan,
  light: Sun,
}

export function EnvironmentIcon({ icon, className }) {
  const IconComponent = iconMap[icon] || Sun

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 blur-sm"></div>
      <IconComponent className="relative z-10" />
    </div>
  )
}

