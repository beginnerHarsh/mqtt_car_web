# AutoTrack Pro - Live GPS Vehicle Tracking System

A production-quality, high-performance web application for real-time GPS vehicle tracking built with **React**, **TypeScript**, **Vite**, **Leaflet**, **MQTT over WebSockets (WSS)**, and **TailwindCSS**.

Designed for high-frequency telemetry, the application smoothly interpolates vehicle movement and rotation at 60 FPS using `requestAnimationFrame`, offering a continuous Google Maps-like navigation experience without marker jumps, flickering, or page reloads.

---

## 🌟 Features

- 🏎️ **60 FPS Smooth Movement Interpolation**: Calculates linear coordinate lerps (`lat`, `lng`) and shortest-path angular heading lerps (`0° - 359°`) to eliminate marker jumping and boundary wrap artifacts.
- 📡 **AWS IoT Core over Secure WebSockets (WSS)**: Direct reactive connection to AWS IoT Core MQTT streams using `MQTT.js`.
- 🛰️ **Continuous GPS Route Simulator Mode**: Built-in mock telemetry generator that emits realistic GPS packets along a closed-circuit route around Chandigarh (`30.733320, 76.779400`) when AWS credentials or physical hardware are unavailable (`VITE_SIMULATOR=true`).
- 🗺️ **Interactive Dark-Mode Map**: Leaflet map powered by CartoDB Dark Matter tiles, auto-follow camera mode, and historical breadcrumb path lines.
- 🚘 **Rotated Custom Vehicle Marker**: High-definition SVG sports car marker with real-time heading rotation, speed badge, and glowing radar pulse aura.
- 📊 **Real-Time Telemetry Dashboard**:
  - **StatusBar**: Live metrics for speed (km/h), heading compass, latitude/longitude, packet counters, and connection health pills.
  - **Sidebar**: Detailed telemetry gauges, raw MQTT JSON payload inspector, multi-vehicle fleet list, and simulator controls.
- 🔔 **Toast Notification System**: Real-time alerts for MQTT disconnections, reconnection attempts, and malformed payload warnings.
- 🚀 **Multi-Vehicle Ready Architecture**: Built on a `Map<deviceId, VehicleState>` data structure to effortlessly scale from single-vehicle tracking to managing massive fleets.

---

## 🛠️ Tech Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Mapping**: Leaflet, OpenStreetMap, CartoDB Dark Matter Tiles
- **Messaging**: MQTT.js (MQTT over WSS)
- **Styling**: TailwindCSS v4, Lucide React Icons
- **Math & Geospatial**: Haversine distance, shortest-angle lerp rotation, adaptive interval duration calculations

---

## 📁 Project Architecture

```
c:/Users/91701/OneDrive/Desktop/car_web/
├── .env                  # Environment variables
├── .env.example          # Environment variables template
├── index.html            # Application entry HTML
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration & path aliases
├── src/
│   ├── main.tsx          # React DOM root initialization
│   ├── App.tsx           # App entry component
│   ├── index.css         # TailwindCSS & dark Leaflet map styles
│   ├── types/
│   │   └── vehicle.ts    # Telemetry, VehicleState & MQTT interfaces
│   ├── constants/
│   │   └── config.ts     # App configs, Leaflet defaults & thresholds
│   ├── utils/
│   │   ├── animation.ts  # Lerp, lerpAngle, easeInOutCubic math functions
│   │   └── geo.ts        # Haversine distance, bearing & formatters
│   ├── services/
│   │   ├── mqttService.ts      # AWS IoT Core MQTT client & event handler
│   │   └── simulatorService.ts # Waypoint route generator for offline testing
│   ├── hooks/
│   │   ├── useMQTT.ts    # Reactive MQTT connection & payload state hook
│   │   └── useVehicle.ts # Multi-vehicle state & 60 FPS interpolation hook
│   ├── components/
│   │   ├── MapView.tsx       # Leaflet map container & path breadcrumbs
│   │   ├── VehicleMarker.tsx # Custom rotated SVG car icon component
│   │   ├── StatusBar.tsx     # Top floating dashboard header bar
│   │   ├── Sidebar.tsx       # Left telemetry inspector & simulator control
│   │   └── ToastContainer.tsx # Notification alerts stack
│   └── pages/
│       └── Dashboard.tsx     # Main application view container
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn

### Installation

1. **Clone or Navigate to Project Directory**:
   ```bash
   cd c:\Users\91701\OneDrive\Desktop\car_web
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` or update `.env`:
   ```ini
   VITE_MQTT_ENDPOINT=wss://a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com/mqtt
   VITE_MQTT_TOPIC=car/+/location
   VITE_REGION=us-east-1
   VITE_SIMULATOR=true
   ```

4. **Launch Local Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## 📡 MQTT Payload Specification

The application expects JSON payloads published to `VITE_MQTT_TOPIC` (e.g. `car/001/location`):

```json
{
  "deviceId": "CAR001",
  "lat": 30.733320,
  "lng": 76.779400,
  "speed": 42,
  "heading": 135,
  "timestamp": 1753000000
}
```

### Field Definitions
- `deviceId` *(string, required)*: Unique identifier of the vehicle (e.g. `"CAR001"`).
- `lat` *(number, required)*: WGS84 latitude coordinate.
- `lng` *(number, required)*: WGS84 longitude coordinate.
- `speed` *(number, optional)*: Speed in km/h.
- `heading` *(number, optional)*: Bearing in degrees (`0°` = North, `90°` = East, `180°` = South, `270°` = West).
- `timestamp` *(number, optional)*: UNIX timestamp of telemetry reading in seconds.

---

## 🔐 AWS IoT Core & Cognito Integration

Connecting directly from a browser web application to AWS IoT Core over WebSockets (WSS) requires authenticated credentials.

### Authentication Strategies Supported by Architecture

1. **Unauthenticated WSS (Development / Custom Proxy)**:
   Connect directly to a WebSocket MQTT proxy or public broker by setting `VITE_MQTT_ENDPOINT`.

2. **AWS Cognito Identity Pool (Production AWS IoT Core)**:
   To sign WebSocket requests with AWS IAM credentials generated via AWS Cognito:
   - Request temporary IAM credentials from your Cognito Identity Pool.
   - Use standard SigV4 signing (`aws-signature-v4`) to generate a signed WebSocket URL.
   - Pass the signed URL to `mqttService.connect(signedWssUrl)`.

---

## 🏎️ Smooth Interpolation Math

To achieve 60 FPS fluid movement without marker jumping:
1. **Dynamic Interval Calculation**: Interpolation duration `$T$` automatically adjusts to match the delta between incoming GPS packet timestamps.
2. **Shortest Angular Rotation**: Heading angles are interpolated using:
   $$\Delta = ((\text{targetHeading} - \text{prevHeading} + 540) \pmod{360}) - 180$$
   This prevents complete 360-degree spin artifacts when crossing 0° / 360° boundaries.
3. **Throttled React Renders**: Marker coordinates update inside a lightweight `requestAnimationFrame` loop, bypassing standard React state re-render overhead.

---

## 🧪 Testing with Simulator Mode

If an active AWS IoT Core physical device is unavailable, toggle Simulator Mode ON:
- Set `VITE_SIMULATOR=true` in `.env`, or
- Toggle the **Simulator Mode** switch inside the **Controls** tab of the Sidebar UI.

The simulator generates real-time telemetry along a closed-loop waypoint circuit around Chandigarh, complete with realistic acceleration, speed noise, and smooth cornering!

---

## 📜 License

MIT License. Designed and engineered for production GPS fleet management applications.
