# GrowPanion

<div align="center">
  
  ![GrowPanion Logo](https://via.placeholder.com/150?text=🌿)
  
  **Smart monitoring and management for cannabis cultivation**

  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-13.0+-000000?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  
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

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A Tuya developer account (for sensor integration)

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

3. Create a `.env.local` file in the root directory with your Tuya API credentials:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000
   TUYA_CLIENT_ID=your_tuya_client_id
   TUYA_CLIENT_SECRET=your_tuya_client_secret
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## 🖥️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **State Management**: React Hooks
- **Data Storage**: Dexie.js (IndexedDB) for local-only data storage
- **API Integration**: Tuya Cloud API for sensor data
- **UI Components**: Shadcn/ui

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
├── public/               # Static assets
└── styles/               # Global styles
```


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

## 💖 Acknowledgements

- [Next.js](https://nextjs.org/) for the application framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com) for a beautiful ui
- [Dexie.js](https://dexie.org/) for IndexedDB wrapper
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tuya IoT Platform](https://developer.tuya.com/) for sensor connectivity

---

<div align="center">
    <b>Grow smarter with GrowPanion!</b></br>
    Made with 💚 by growers for growers
</div>
