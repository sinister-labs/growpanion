<div align="center">
  
  <img src="https://raw.githubusercontent.com/sinister-labs/growpanion/e43457c1f4cd8654b701d293a88501101d4a304a/public/logo-light.svg" alt="GrowPanion Logo" width="350"> 
  
  **Smart monitoring and management for cannabis cultivation**

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-13.0+-000000?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=white)](https://tauri.app/)
  
</div>

## 🌿 Overview

GrowPanion is a comprehensive solution for monitoring and managing cannabis cultivation. Whether you're a home grower or commercial cultivator, GrowPanion provides powerful tools to track environmental conditions, manage growing cycles, and maintain detailed records of your plants for optimal yields and quality.

<div align="center">
  <img src="https://i.epvpimg.com/a68lcab.jpg" alt="GrowPanion Dashboard" width="80%"/>
</div>

## ✨ Features

### 🌱 Complete Cannabis Grow Management
- Track multiple grows simultaneously
- Monitor plant lifecycle phases (Clone/Seedling, Vegetative, Flowering, Flushing, Drying, Curing)
- Document full cannabis lifecycle from germination to harvest and post-processing

### 🌡️ Critical Environmental Monitoring
- Real-time temperature and humidity tracking
- VPD (Vapor Pressure Deficit) calculation with optimal range indicators for cannabis
- Integration with smart sensors and devices via Tuya API
- Phase-specific environmental recommendations

### 🌿 Detailed Strain Tracking
- Comprehensive strain profiles with genetics and growth characteristics
- Training technique records (LST, HST, SCROG, etc.)
- Activity history for each plant (watering, defoliation, training)
- Note-taking and photo documentation for phenotype selection

### 💧 Advanced Nutrient Management
- Create and save custom nutrient and fertilizer mixes
- Record feeding schedules and EC/PPM concentrations
- Monitor plant responses to different nutrient regimens
- Flushing scheduling and tracking

### 🖥️ Cross-Platform
- Available as a web application
- Desktop application via Tauri (Windows, macOS, Linux)
- Consistent experience across all platforms

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A Tuya developer account (for sensor integration)
- Rust toolchain (for Tauri development)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/sinister-labs/growpanion
   cd growpanion
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory based on the example file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Building for Different Platforms

#### Web Application
```bash
npm run build:web
# or
yarn build:web
```

#### Desktop Application (Tauri)
```bash
npm run build:tauri
npm run tauri build
# or
yarn build:tauri
yarn tauri build
```

## 🖥️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **State Management**: React Hooks
- **Data Storage**: Dexie.js (IndexedDB) for local-only data storage
- **API Integration**: Tuya Cloud API for sensor data
- **UI Components**: Shadcn/ui
- **Desktop App**: Tauri (Rust-based desktop application framework)

## 📊 Project Structure

```
growpanion/
├── app/                  # Next.js app router pages
├── components/           # React components
│   ├── ui/               # Base UI components
│   ├── plant-modal/      # Plant management components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── db.ts             # Database configuration
│   ├── tuya-api.ts       # Tuya API integration
│   ├── vpd-utils.ts      # VPD calculation utilities
│   ├── growth-utils.ts   # Growth phase utilities
│   ├── plant-utils.ts    # Plant management utilities
│   ├── sensor-utils.ts   # Sensor data handling
│   ├── grows.ts          # Grow management utilities
├── public/               # Static assets
├── styles/               # Global styles
├── .env.local.example    # Example environment variables
├── .env.tauri            # Tauri-specific environment variables
└── next.config.mjs       # Next.js configuration with conditional export mode
```

## 🔄 Deployment Modes

GrowPanion supports two deployment modes:

### Web Mode
- Uses Next.js dynamic routing
- Server-side rendering capabilities
- Perfect for online access

### Tauri Mode
- Static export for desktop application
- Uses pre-rendered pages
- All data stored locally
- No internet connection required after installation

To switch between modes:
- For web mode: Use `NEXT_PUBLIC_DEPLOYMENT_MODE=web` in your `.env.local`
- For Tauri mode: The build script automatically uses `.env.tauri` which sets `NEXT_PUBLIC_DEPLOYMENT_MODE=tauri`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

This project uses ESLint and Prettier for code formatting. Please ensure your code adheres to the existing style by running:

```bash
npm run lint
# or
yarn lint
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Roadmap

- [ ] Creation of a complete **grow diary** with images, measurements & notes exportable as PDF
- [ ] Long-term data analysis for temperature, humidity and VPD
- [ ] Comparison of current values with previous grows
- [ ] AI-based chatbot for growing assistance & troubleshooting
- [ ] Pest analysis using image recognition
- [ ] Automated strain-specific grow schedule recommendations
- [ ] Integration with more smart grow equipment (LED, climate controllers)
- [ ] Harvest yield calculator and optimization tools
- [ ] Mobile application support

## 💖 Acknowledgements

- [Next.js](https://nextjs.org/) for the application framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com) for a beautiful ui
- [Dexie.js](https://dexie.org/) for IndexedDB wrapper
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tuya IoT Platform](https://developer.tuya.com/) for sensor connectivity
- [Tauri](https://tauri.app/) for desktop application framework

---

<div align="center">
    <b>Grow smarter with GrowPanion!</b></br>
    Made with 💚 by growers for growers
</div>
