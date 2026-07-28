# 🚜 How pindbazaar Turns 5 Simple Numbers into Complete Farm Intelligence

Have you ever wondered how a tiny GPS device on a tractor—that sends only 5 basic pieces of text—can power a real-time tracking website with speed, distance, field area covered, battery alerts, and smooth map animations?

This document explains everything in simple, plain English without any complicated symbols or math formulas.

---

## 1. The 5 Basic Numbers Sent by the Tractor

Every 1 to 2 seconds, the GPS hardware device mounted on the tractor sends a tiny message over the internet containing only these 5 items:

1. **Device_ID**: The tractor's unique name (for example: T_3).
2. **Timestamp**: The exact date and time the reading was taken (for example: 2026-07-27 19:18:16).
3. **Latitude**: How far North or South the tractor is on Earth (for example: 30.76642).
4. **Longitude**: How far East or West the tractor is on Earth (for example: 76.62745).
5. **BatteryVoltage**: The battery level of the GPS device (for example: 3 Volts).

---

## 2. How We Calculate Everything (Explained Simply)

Here is how our website takes those 5 basic items and calculates 11 smart metrics:

---

### 1. Friendly Tractor Name & Location
- **Raw Data**: T_3
- **How it Works**: Instead of showing a technical code like T_3 to the farmer, our system automatically translates T_3 into "Farm Machinery 3" assigned to the Mohali region.

---

### 2. Distance Traveled (Kilometers)
- **How it Works**: Think of placing two dots on Google Maps. 
- Every second, the system looks at where the tractor was 1 second ago versus where it is right now. 
- It measures the distance between those two points in meters and keeps adding them up over time to tell you: "This tractor has driven 14.2 km today."

---

### 3. Tractor Speed (km/h)
- **How it Works**: Speed is simply Distance divided by Time.
- If the tractor moved 10 meters in 2 seconds, the system calculates that the tractor is moving at 18 km/h.
- This is shown live on your dashboard speed gauge widget!

---

### 4. Steering Direction & Map Icon Rotation
- **How it Works**: How does the tractor icon on your screen know which way to turn?
- The system draws an imaginary line from the previous location to the new location. 
- It calculates the exact angle (from 0 to 360 degrees) and turns the 3D tractor icon on the map so it faces North, East, South, or West—matching the driver's steering wheel in real time!

---

### 5. Is the Tractor Working or Standing Still (Idle)?
- **How it Works**: 
  - If the tractor moves less than 2 meters in a minute, the system marks its status as "IDLE / STANDBY".
  - If the tractor moves more than 2 meters, the system marks its status as "WORKING / MOVING".

---

### 6. Active Working Hours vs. Idle Hours
- **How it Works**: The website runs two continuous timers:
  - **Working Timer**: Counts up every minute the tractor is moving across the field.
  - **Idle Timer**: Counts up every minute the tractor is parked with its engine running.

---

### 7. Fuel Waste & Idling Percentage (%)
- **How it Works**: 
  Idling Percentage = (Idle Time / Total Time) * 100
- If a tractor ran for 10 hours total, but stood still for 3 hours, the system alerts the owner: "30% Fuel Waste / Idling Rate Detected!"

---

### 8. Field Area Covered (Acres / Hectares)
- **How it Works**: 
  - Suppose the tractor is pulling a 3.5-meter wide plow (rotavator).
  - If the tractor drives 1,000 meters (1 km) across the field, it has plowed:
    1,000 meters * 3.5 meters = 3,500 square meters
  - The system automatically converts 3,500 square meters into 0.86 Acres or 0.35 Hectares and displays the field coverage live!

---

### 9. Smooth Map Movement (No Teleporting)
- **How it Works**: 
  - The GPS tracker only sends a location update once every second.
  - If we just moved the tractor icon once per second, it would look like it's "teleporting" or glitching across the map.
  - To fix this, our animation engine smoothly slides the tractor 60 times per second across your screen—making it glide like a vehicle in a modern video game!

---

### 10. Farm Boundary Alert (Geofence Popup)
- **How it Works**: 
  - You can draw a virtual fence around your farm on the map.
  - Whenever the GPS location enters or exits that virtual fence, a notification pops up on your screen:
    "Farm Machinery 3 (T_3) entered Sector 22 Field!"

---

### 11. Battery Health Warning
- **Raw Data**: BatteryVoltage: 3
- **How it Works**: The system checks the battery voltage. If it drops below 3.3V, a yellow warning icon appears on the dashboard letting the manager know: "GPS Device Battery Low — Please Recharge."

---

## 3. Quick Summary Table

| What the Tractor Sends | What the System Calculates | Why It Helps the Farmer / Manager |
| :--- | :--- | :--- |
| Device_ID: T_3 | Farm Machinery 3 | Friendly name identification |
| Latitude & Longitude | Live Map Location | Know where the tractor is right now |
| Location 1 vs Location 2 | Total KM & Speed | Track daily distance & driving speed |
| Movement Angle | 3D Icon Rotation | See exact direction the driver is facing |
| Stationary Time | Idle & Active Duration | Prevent diesel theft & wasted engine hours |
| Distance * Implement Width | Acres & Hectares Covered | Calculate how much field has been plowed |
| Geofence Boundary | Entry / Exit Alerts | Get notified when a machine leaves the field |
| BatteryVoltage | Battery Warning Badge | Ensure tracker never dies unannounced |

---

## 4. File Location

This easy-to-read guide is saved at:
[document.md](file:///c:/Users/91701/OneDrive/Desktop/car_web/document.md)
