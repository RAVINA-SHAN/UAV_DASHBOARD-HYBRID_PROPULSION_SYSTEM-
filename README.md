# 🚁 APEMS GCS – Hybrid Electric UAV Propulsion System

## Adaptive Power and Energy Management System for Hybrid-Electric UAV

APEMS GCS is a Hybrid-Electric UAV Ground Control Station designed to simulate, monitor, and manage the energy flow of a fixed-wing UAV using multiple energy sources.

The system integrates a gas turbine engine, generator, battery, PEM fuel cell, PMSM motor, propeller, aircraft electrical loads, telemetry, engineering calculations, and an Adaptive Power and Energy Management System (APEMS).

---

## 🎯 Project Objective

The main objective of this project is to develop a hybrid-electric propulsion and energy-management system for a fixed-wing UAV.

The system manages power from three primary energy sources:

- Gas Turbine Engine + Generator
- Battery
- PEM Fuel Cell

The APEMS controller distributes the available power according to the aircraft's power demand and mission phase.

The project focuses on:

- Hybrid propulsion
- Energy management
- Mission endurance
- Power distribution
- Battery management
- Fuel-cell management
- Engine-generator operation
- Real-time telemetry
- Engineering calculations
- UAV ground control visualization

---

# ✈️ UAV Mission Profile

The UAV mission is divided into six phases:

```text
Take-off
   ↓
Climb
   ↓
Cruise
   ↓
Loiter
   ↓
Descent
   ↓
Landing


Target Mission Duration

10 Hours 40 Minutes

Equivalent to:

10 hours 40 minutes
640 minutes
38,400 seconds

The telemetry system uses a one-second sampling interval for the complete mission.

⚡ Hybrid Propulsion Architecture
                    Jet-A1 Fuel
                         │
                         ▼
                ┌─────────────────┐
                │ Gas Turbine     │
                │ Engine          │
                └────────┬────────┘
                         │
                  Mechanical Power
                         │
                         ▼
                ┌─────────────────┐
                │   Generator     │
                └────────┬────────┘
                         │
                  Electrical Power
                         │
                         ▼
                  ┌────────────┐
                  │   DC Bus   │
                  └─────┬──────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
       Battery       PEM Fuel      Auxiliary
                      Cell          Loads
          │             │
          └──────┬──────┘
                 │
                 ▼
        ┌──────────────────┐
        │      APEMS       │
        │ Energy Manager   │
        └────────┬─────────┘
                 │
                 ▼
              Inverter
                 │
                 ▼
            PMSM Motor
                 │
                 ▼
          Propeller System
                 │
                 ▼
                UAV
🔋 Energy Sources
1. Gas Turbine Engine

The gas turbine engine produces mechanical power.

The engine drives the generator, which converts mechanical power into electrical power.

The basic brake-power relationship is:

P_brake = Torque × Angular Velocity
2. Generator

The generator converts engine mechanical power into electrical power.

Generator efficiency:

η_generator = P_out / P_mech × 100

Where:

P_out = Electrical output power
P_mech = Mechanical input power
3. Battery

The battery provides electrical energy and high-power support during high-demand mission phases.

The battery is monitored using:

State of Charge (SOC)
State of Health (SOH)
Voltage
Current
Power
Temperature
Energy remaining

Battery power:

P_battery = V × I
4. PEM Fuel Cell

The PEM fuel cell provides electrical power using hydrogen.

The fuel cell is primarily used for continuous and steady power demand.

Fuel-cell power:

P_fuel_cell = V × I

The system monitors:

Fuel-cell voltage
Fuel-cell current
Fuel-cell power
Fuel-cell efficiency
Hydrogen consumption
Hydrogen remaining
Stack temperature
⚙️ PMSM Propulsion Motor

The PMSM motor converts electrical power into mechanical propulsion power.

Motor power is calculated using:

P_motor = Torque × Angular Velocity

The motor drives the UAV propeller.

🧠 APEMS
Adaptive Power and Energy Management System

APEMS is the central energy-management controller of the hybrid propulsion system.

It determines how the available power should be distributed between:

Engine + Generator
Battery
PEM Fuel Cell

The controller monitors parameters including:

Mission phase
Aircraft power demand
Battery SOC
Battery SOH
Fuel remaining
Hydrogen remaining
Engine RPM
Generator output
Motor power
Temperature
Aircraft electrical loads

The objective is to satisfy the aircraft's power demand while efficiently managing the available energy sources.

🔄 Power Allocation

The system uses different power-sharing strategies for different mission phases.

Take-off
Engine       = 30.5 kW
Fuel Cell    = 8.0 kW
Battery      = 55.0 kW

Total        = 93.5 kW

The battery provides high-power support during take-off.

Climb
Engine       = 30.1 kW
Fuel Cell    = 15.0 kW
Battery      = 30.0 kW

Total        = 75.1 kW
Cruise
Engine       = 11.5 kW
Fuel Cell    = 11.5 kW
Battery      = 5.7 kW

Total        = 28.7 kW

The engine and fuel cell provide a larger share of the continuous cruise power demand.

Loiter
Engine       = 7.1 kW
Fuel Cell    = 14.1 kW
Battery      = 2.3 kW

Total        = 23.5 kW
Descent
Engine       = 9.4 kW
Fuel Cell    = 4.3 kW
Battery      = 0.7 kW

Total        = 14.4 kW
Landing
Engine       = 7.4 kW
Fuel Cell    = 1.9 kW
Battery      = 9.4 kW

Total        = 18.7 kW

The battery provides additional power flexibility during landing.

🔌 Aircraft Electrical Loads

The aircraft electrical system includes more than the propulsion motor.

The dashboard monitors:

PMSM Motor
Avionics
Flight Control
Payload
Communication
Cooling
Engine ECU
Sensors
Auxiliary electronics

The total aircraft load is calculated as:

P_total =
P_motor
+ P_avionics
+ P_flight_control
+ P_payload
+ P_cooling
+ P_communication
+ P_ECU
+ P_auxiliary
📊 Ground Control Station

The APEMS GCS provides real-time visualization of the UAV propulsion and energy-management system.

Mission Monitoring
Mission Time
Remaining Time
Mission Phase
Mission Progress
Estimated Endurance
Distance Covered
Aircraft Monitoring
Altitude
Airspeed
Distance
Pitch
Roll
Yaw
Heading
Engine Monitoring
Engine RPM
Torque
Brake Power
Fuel Flow
Fuel Remaining
Engine Status
Generator Monitoring
Voltage
Current
Generator Power
Generator Efficiency
Battery Monitoring
SOC
SOH
Voltage
Current
Power
Temperature
Energy Remaining
Fuel Cell Monitoring
Voltage
Current
Power
Efficiency
Hydrogen Remaining
Temperature
Motor Monitoring
RPM
Torque
Power
Efficiency
Temperature
📡 Telemetry System

The system supports second-by-second mission telemetry.

Telemetry Configuration
Mission Duration : 10 Hours 40 Minutes
Sampling Rate    : 1 Hz
Total Duration   : 38,400 Seconds
Total Records    : 38,400

The telemetry dataset contains parameters such as:

Mission Time
Elapsed Seconds
Mission Phase
Altitude
Velocity
Distance
Pitch
Roll
Yaw
Throttle Position
Engine RPM
Engine Torque
Brake Power
Fuel Flow
Fuel Remaining
Generator Voltage
Generator Current
Generator Power
Generator Efficiency
Battery Voltage
Battery Current
Battery Power
Battery SOC
Battery SOH
Battery Temperature
Battery Energy Remaining
Fuel Cell Voltage
Fuel Cell Current
Fuel Cell Power
Fuel Cell Efficiency
Hydrogen Remaining
Fuel Cell Temperature
Motor RPM
Motor Torque
Motor Power
Motor Efficiency
Propeller RPM
Avionics Power
Flight Control Power
Payload Power
Cooling Power
Communication Power
Engine ECU Power
Total Aircraft Load
Engine Contribution
Battery Contribution
Fuel Cell Contribution
Total Generated Power
Estimated Remaining Endurance
📁 Telemetry Dataset

The master telemetry dataset is:

Mission_10h40m_Telemetry.xlsx

The Excel workbook can contain:

Mission_Telemetry
Mission_Summary
Power_Allocation
Battery_Analysis
Fuel_Cell_Analysis
Engine_Analysis

The dataset is used for:

Mission replay
Telemetry visualization
Engineering analysis
Power analysis
Battery analysis
Fuel-cell analysis
Engine analysis
Mission reporting
⏱️ Mission Playback

The Ground Control Station supports accelerated mission playback.

Available playback speeds:

1×
2×
3×
5×
10×
25×
50×
75×
100×
150×
200×
250×

The original mission remains:

10 Hours 40 Minutes

Playback speed only changes how quickly the telemetry is displayed.

For example:

1×    → 10 h 40 min
2×    → 5 h 20 min
5×    → 2 h 08 min
10×   → 1 h 04 min
25×   → 25 min 36 sec
50×   → 12 min 48 sec
75×   → 8 min 32 sec
100×  → 6 min 24 sec
150×  → 4 min 16 sec
200×  → 3 min 12 sec
250×  → approximately 2 min 34 sec
📐 Engineering Calculations
Brake Power
P_brake = τ × ω

Where:

τ = Torque
ω = Angular velocity
Generator Efficiency
η_generator = P_out / P_mech × 100
Battery Power
P_battery = V × I
Fuel Cell Power
P_fuel_cell = V × I
Motor Power
P_motor = τ × ω
Specific Fuel Consumption
SFC = Fuel Mass Flow / Brake Power
Total Energy

For continuous power:

E = ∫ P(t) dt

For discrete telemetry:

E ≈ Σ Pᵢ × Δt
📈 Dashboard Graphs

The GCS provides real-time graphs for:

Altitude vs Time
Airspeed vs Time
Battery SOC vs Time
Fuel Remaining vs Time
Hydrogen Remaining vs Time
Engine Power vs Time
Battery Power vs Time
Fuel Cell Power vs Time
Generator Power vs Time
Motor Power vs Time
Aircraft Load vs Time
🔬 Power Flow
Jet-A1
   │
   ▼
Gas Turbine Engine
   │
   ▼
Generator
   │
   ▼
DC Bus
   │
   ├──────────────► Avionics
   │
   ├──────────────► Flight Control
   │
   ├──────────────► Sensors
   │
   ├──────────────► Communication
   │
   ├──────────────► Payload
   │
   ├──────────────► Cooling
   │
   └──────────────► Inverter
                       │
                       ▼
                   PMSM Motor
                       │
                       ▼
                   Propeller
                       │
                       ▼
                      UAV

Battery ───────────────► DC Bus

PEM Fuel Cell ─────────► DC Bus
🖥️ Software Architecture
                    React Frontend
                          │
                 HTTP / WebSocket
                          │
                          ▼
                   FastAPI Backend
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     Telemetry        Physics           APEMS
      Manager         Engine           Controller
          │               │                │
          └───────────────┼────────────────┘
                          │
                          ▼
                 Engineering Models
                          │
                          ▼
                  Telemetry Dataset
💻 Technologies Used
Frontend
React
Vite
TypeScript / JavaScript
HTML
CSS
Backend
Python
FastAPI
WebSocket
REST APIs
Data Processing
NumPy
Pandas
Scikit-learn
Excel datasets
Engineering Simulation
MATLAB
Simulink
Physics-based engineering calculations
🤖 Machine Learning

The project backend contains trained machine-learning model files:

backend/model.pkl
backend/classifier.pkl
backend/scaler.pkl

These models are separate from the rule-based APEMS controller.

The ML components can be used for prediction and classification functions, while APEMS is responsible for power-management decisions.

📂 Project Structure
UAV_DASHBOARD-HYBRID_PROPULSION_SYSTEM/
│
├── backend/
│   ├── app.py
│   ├── physics_engine.py
│   ├── ml_model.py
│   ├── websocket.py
│   ├── model.pkl
│   ├── classifier.pkl
│   ├── scaler.pkl
│   ├── training_data.csv
│   ├── requirements.txt
│   └── src/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
🚀 Installation
Clone the Repository
git clone https://github.com/RAVINA-SHAN/UAV_DASHBOARD-HYBRID_PROPULSION_SYSTEM.git
cd UAV_DASHBOARD-HYBRID_PROPULSION_SYSTEM
Backend Setup

Create a virtual environment:

python -m venv .venv

Activate the environment:

.\.venv\Scripts\Activate.ps1

Install the backend dependencies:

cd backend
pip install -r requirements.txt

Start the backend:

python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000

Backend server:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs
Frontend Setup

Open a second terminal.

Go to the frontend:

cd frontend

Install dependencies:

npm install

Start the frontend:

npm run dev

Open the URL displayed by Vite.

🔌 API Architecture

The FastAPI backend provides REST and WebSocket communication between the simulation system and the Ground Control Station.

Example API functions include:

Telemetry
Mission status
Mission statistics
Power distribution
Battery status
Fuel-cell status
Engine status
Motor status
Engineering calculations

WebSocket communication is used for continuous telemetry streaming.

📊 Mission Summary

The system provides mission-level statistics including:

Mission Duration
Mission Phase
Average Speed
Maximum Speed
Average Altitude
Maximum Altitude
Fuel Used
Fuel Remaining
Hydrogen Used
Hydrogen Remaining
Battery Energy Used
Battery Energy Remaining
Average Engine Power
Average Fuel Cell Power
Average Battery Power
Average Motor Power
Average Aircraft Load
Maximum Power
Estimated Endurance
🛠️ Development Versions
Version 1.0 – Engineering Prototype

The initial version is based on MATLAB / MATLAB App Designer.

Main features:

Mission simulation
Six mission phases
Hybrid propulsion model
Engine model
Generator model
Battery model
PEM fuel-cell model
PMSM motor model
Engineering calculations
Rule-based APEMS
Mission graphs
Power-flow visualization
Version 2.0 – APEMS Ground Control Station

The advanced version uses a web-based architecture.

Main features:

React frontend
FastAPI backend
REST APIs
WebSocket telemetry
Real-time dashboard
Mission playback
Second-by-second telemetry
Excel telemetry dataset
Engineering calculations
Battery monitoring
Fuel-cell monitoring
Engine monitoring
Motor monitoring
ML model integration
Data export
Mission reporting
🎯 Key Features

✅ Hybrid-electric UAV propulsion

✅ Gas turbine engine + generator

✅ Battery energy storage

✅ PEM fuel cell

✅ PMSM propulsion motor

✅ Propeller system

✅ Adaptive Power and Energy Management System

✅ Six-phase UAV mission

✅ 10 h 40 min target mission timeline

✅ 38,400-second telemetry dataset

✅ Real-time telemetry visualization

✅ WebSocket communication

✅ REST API backend

✅ Engineering calculations

✅ Battery monitoring

✅ Fuel-cell monitoring

✅ Engine monitoring

✅ Generator monitoring

✅ Motor monitoring

✅ Aircraft electrical-load monitoring

✅ Mission playback

✅ 1× to 250× playback speeds

✅ Excel telemetry dataset

✅ CSV / Excel / PDF reporting

✅ Machine-learning model integration

🔬 Engineering Significance

The project demonstrates a hybrid propulsion architecture where multiple energy sources cooperate to meet changing aircraft power requirements.

Instead of relying on only one energy source, the system combines:

Engine + Generator
        +
Battery
        +
PEM Fuel Cell

The APEMS controller determines the contribution of each source according to the mission phase and power demand.

This approach provides a platform for studying:

Energy distribution
Power management
Hybrid propulsion
Battery utilization
Fuel-cell utilization
Engine operating conditions
Mission endurance
Aircraft electrical loads
⚠️ Project Status

This project is an engineering and simulation prototype for research, development, visualization and evaluation of hybrid-electric UAV propulsion concepts.

The simulated mission duration, power values, energy values and endurance results are model-based results and should be validated against manufacturer specifications, experimental measurements and detailed aircraft-level models before being considered for real aircraft operation.

👩‍💻 Author
RAVINA S.

Hybrid-Electric UAV
APEMS Ground Control Station Project

📜 License

All rights reserved.

This repository is intended for academic, research and demonstration purposes.


**Important:** after pasting this into `README.md`, commit and push it:

```powershell
git add README.md
git commit -m "Add project README"
git push
