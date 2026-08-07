"""
APEMS GCS — WebSocket Telemetry Streaming
==========================================
Provides real-time telemetry streaming to the frontend via WebSocket.
Broadcasts telemetry frames at 10 Hz from the master 38,400-second dataset.

Mission Duration: 10 Hours 40 Minutes = 640 Minutes = 38,400 Seconds.
Playback Speeds: 1×, 2×, 3×, 5×, 10×, 25×, 50×, 75×, 100×, 150×, 200×, 250×.
"""

import asyncio
import csv
import json
import math
import os
from typing import List, Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

TOTAL_MISSION_S = 38400.0        # 10 Hours 40 Minutes (38,400 s)
TOTAL_MISSION_MIN = 640.0        # 640 Minutes

# Mission phase definitions matching 640 min profile
PHASES = [
    {"id": "takeoff", "name": "Take-off", "duration_s": 120,   "color": "#dc2626", "icon": "🛫"},
    {"id": "climb",   "name": "Climb",   "duration_s": 1080,  "color": "#d97706", "icon": "📈"},
    {"id": "cruise",  "name": "Cruise",  "duration_s": 18000, "color": "#0d7ed6", "icon": "✈️"},
    {"id": "loiter",  "name": "Loiter",  "duration_s": 18300, "color": "#16a34a", "icon": "🔄"},
    {"id": "descent", "name": "Descent", "duration_s": 600,   "color": "#8b5cf6", "icon": "📉"},
    {"id": "landing", "name": "Landing", "duration_s": 300,   "color": "#0891b2", "icon": "🛬"},
]

def _get_phase_at_second(sec: int) -> tuple:
    """Return (phase, phase_start_s, phase_end_s) for a given elapsed second."""
    t = 0
    for phase in PHASES:
        end = t + phase["duration_s"]
        if sec < end:
            return phase, t, end
        t = end
    last = PHASES[-1]
    return last, t - last["duration_s"], t

def _get_apems_reason(phase_id: str) -> str:
    reasons = {
        "takeoff": "High thrust demand — engine + battery boost",
        "climb": "High thrust demand — engine + battery boost",
        "cruise": "FC at peak efficiency; battery reserved for transients",
        "loiter": "FC at peak efficiency; battery reserved for transients",
        "descent": "Balanced split for current phase",
        "landing": "Balanced split for current phase",
    }
    return reasons.get(phase_id, "Balanced split for current phase")

class TelemetryManager:
    """Manages WebSocket connections and streams telemetry from dataset."""

    def __init__(self):
        self.connections: List[WebSocket] = []
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._current_sec = 0.0  # elapsed seconds in dataset (0.0 to 38400.0)
        self._play_speed = 1.0
        self._is_playing = False
        self._dataset: List[Dict] = []
        self._load_dataset()

    def _load_dataset(self):
        """Load Master CSV Telemetry dataset into memory."""
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(backend_dir, "Mission_10h40m_Telemetry.csv")
        
        if os.path.exists(csv_path):
            print(f"TelemetryManager: Loading dataset from {csv_path}...")
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    self._dataset = list(reader)
                print(f"TelemetryManager: Loaded {len(self._dataset):,} rows.")
            except Exception as err:
                print(f"TelemetryManager Error loading CSV: {err}")
        else:
            print(f"TelemetryManager Warning: {csv_path} not found. Fallback mode active.")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        await websocket.send_json({
            "type": "status",
            "connected": True,
            "clients": len(self.connections),
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    def set_simulation_data(self, timeline: list, phases: list):
        pass

    def set_playback(self, is_playing: bool, speed: float):
        self._is_playing = is_playing
        self._play_speed = speed

    def set_mission_time(self, t_min: float):
        """Set current mission time in minutes."""
        self._current_sec = min(max(0.0, t_min * 60.0), TOTAL_MISSION_S - 1.0)

    def get_frame(self, sec: float) -> Dict:
        idx = int(math.floor(sec))
        idx = max(0, min(idx, len(self._dataset) - 1))

        if self._dataset:
            row = self._dataset[idx]
            elapsed_s = float(row.get("Elapsed Seconds", idx))
            phase_name = row.get("Mission Phase", "Cruise")
            phase_info, phase_start, phase_end = _get_phase_at_second(int(elapsed_s))

            alt_m = float(row.get("Altitude (m)", 0.0))
            vel_mps = float(row.get("Velocity (m/s)", 0.0))
            dist_km = float(row.get("Distance (km)", 0.0))

            eng_kw = float(row.get("Engine Contribution (kW)", 0.0))
            bat_kw = float(row.get("Battery Contribution (kW)", 0.0))
            fc_kw = float(row.get("Fuel Cell Contribution (kW)", 0.0))
            tot_gen_kw = float(row.get("Total Generated Power (kW)", eng_kw + bat_kw + fc_kw))

            p_req_W = tot_gen_kw * 1000.0
            p_eng_W = eng_kw * 1000.0
            p_bat_W = bat_kw * 1000.0
            p_fc_W = fc_kw * 1000.0

            soc = float(row.get("Battery SOC (%)", 100.0))
            soh = float(row.get("Battery SOH (%)", 100.0))
            jeta_kg = float(row.get("Fuel Remaining (kg)", 60.0))
            h2_kg = float(row.get("Hydrogen Remaining (kg)", 20.0))
            fuel_cons = float(row.get("Fuel Consumed (kg)", 0.0))
            h2_cons = float(row.get("Hydrogen Consumption (kg)", 0.0))

            mass_kg = max(1000.0, 1500.0 - fuel_cons - h2_cons)
            thrust_N = p_req_W / max(vel_mps, 1.0)

            return {
                "t_min": round(elapsed_s / 60.0, 4),
                "demo_s": round(elapsed_s, 2),
                "time_str": row.get("Time (hh:mm:ss)", "00:00:00"),
                "phase": phase_info["id"],
                "phase_name": phase_name,
                "phase_color": phase_info["color"],
                "phase_icon": phase_info["icon"],
                "phase_elapsed_s": round(elapsed_s - phase_start, 1),
                "phase_duration_s": phase_info["duration_s"],
                "alt_m": round(alt_m, 1),
                "vel_mps": round(vel_mps, 2),
                "dist_m": round(dist_km * 1000.0, 1),
                "mass_kg": round(mass_kg, 1),
                "soc": round(soc, 2),
                "h2_kg": round(h2_kg, 3),
                "jeta_kg": round(jeta_kg, 3),
                "h2_pct": round(h2_kg / 20.0 * 100.0, 2),
                "jeta_pct": round(jeta_kg / 60.0 * 100.0, 2),
                "p_req_W": round(p_req_W, 1),
                "p_bat_W": round(p_bat_W, 1),
                "p_fc_W": round(p_fc_W, 1),
                "p_eng_W": round(p_eng_W, 1),
                "p_gen_W": round(float(row.get("Generator Power (kW)", 0.0)) * 1000.0, 1),
                "p_motor_W": round(float(row.get("Motor Power (kW)", 0.0)) * 1000.0, 1),
                "bus_power_W": round(p_req_W, 1),
                "bus_loss_W": round(p_req_W * 0.02, 1),
                "bus_voltage": round(float(row.get("Generator Voltage (V)", 800.0)), 1),
                "bus_current": round(float(row.get("Generator Current (A)", 0.0)), 1),
                "bat_frac": round(bat_kw / max(tot_gen_kw, 0.1), 3),
                "fc_frac": round(fc_kw / max(tot_gen_kw, 0.1), 3),
                "eng_frac": round(eng_kw / max(tot_gen_kw, 0.1), 3),
                "prop_rpm": round(float(row.get("Propeller RPM", 1450.0)), 0),
                "pitch_deg": round(float(row.get("Pitch (deg)", 2.0)), 1),
                "thrust_N": round(thrust_N, 1),
                "drag_N": round(thrust_N * 0.85, 1),
                "lift_N": round(1500.0 * 9.80665, 1),
                "ld_ratio": round((1500.0 * 9.80665) / max(thrust_N * 0.85, 1.0), 2),
                "wing_loading": round((1500.0 * 9.80665) / 20.0, 1),
                "payload_kg": 200.0,
                "cg_pos": 0.25,
                "heading_deg": round((elapsed_s * 0.01) % 360.0, 1),
                "pitch_deg_att": round(float(row.get("Pitch (deg)", 2.0)), 1),
                "roll_deg": round(float(row.get("Roll (deg)", 0.0)), 1),
                "vertical_speed_mps": round(4.0 if phase_info["id"] == "climb" else (-3.0 if phase_info["id"] == "descent" else 0.0), 2),
                "range_km": round(dist_km, 2),
                "eng_rpm": round(float(row.get("Engine RPM", 3500.0)), 0),
                "gen_rpm": round(float(row.get("Engine RPM", 3500.0)), 0),
                "motor_rpm": round(float(row.get("Motor RPM", 2800.0)), 0),
                "torque_Nm": round(float(row.get("Motor Torque (Nm)", 100.0)), 1),
                "eng_bsfc": round(0.28, 3),
                "eng_eff": round(0.35, 3),
                "eng_egt_K": round(600.0 + 500.0 * (eng_kw / 40.0), 1),
                "fc_eff": round(float(row.get("Fuel Cell Efficiency (%)", 50.0)) / 100.0, 3),
                "fc_temp_K": round(float(row.get("Fuel Cell Stack Temperature (°C)", 30.0)) + 273.15, 1),
                "fc_temp": round(float(row.get("Fuel Cell Stack Temperature (°C)", 30.0)), 1),
                "motor_eff": round(float(row.get("Motor Efficiency (%)", 95.0)) / 100.0, 3),
                "gen_eff": round(float(row.get("Generator Efficiency (%)", 94.0)) / 100.0, 3),
                "eta_overall": round(0.885, 3),
                "fuel_flow_kg_s": round(float(row.get("Fuel Flow (kg/hr)", 0.0)) / 3600.0, 5),
                "fuel_flow_kg_hr": round(float(row.get("Fuel Flow (kg/hr)", 0.0)), 2),
                "h2_flow_kg_s": round((float(row.get("Fuel Cell Power (kW)", 0.0)) * 1000.0) / (0.52 * 120.0e6), 6),
                "h2_flow_kg_hr": round(((float(row.get("Fuel Cell Power (kW)", 0.0)) * 1000.0) / (0.52 * 120.0e6)) * 3600.0, 2),
                "bat_voltage_V": round(float(row.get("Battery Voltage (V)", 800.0)), 1),
                "bat_current_A": round(float(row.get("Battery Current (A)", 0.0)), 1),
                "bat_r_int": 0.05,
                "bat_temp_K": round(float(row.get("Battery Temperature (°C)", 25.0)) + 273.15, 1),
                "bat_temp": round(float(row.get("Battery Temperature (°C)", 25.0)), 1),
                "bat_loss_W": round((float(row.get("Battery Current (A)", 0.0)) ** 2) * 0.05, 1),
                "mission_progress_pct": round((elapsed_s / TOTAL_MISSION_S) * 100.0, 2),
                "endurance_remaining_min": round(float(row.get("Estimated Remaining Endurance (min)", 640.0)), 1),
                "system_health_pct": round(max(90.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 5.0), 1),
                "overall_efficiency_pct": 88.5,
                "apems_reason": _get_apems_reason(phase_info["id"]),
                "is_charging": False,
                "health": {
                    "battery": round(max(90.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 8.0), 1),
                    "fuel_cell": round(max(92.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 6.0), 1),
                    "engine": round(max(95.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 5.0), 1),
                    "generator": round(max(96.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 4.0), 1),
                    "motor": round(max(97.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 3.0), 1),
                    "inverter": round(max(98.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 2.0), 1),
                    "propeller": round(max(98.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 2.0), 1),
                    "cooling": round(max(97.0, 100.0 - (elapsed_s / TOTAL_MISSION_S) * 3.0), 1),
                    "apems": 100.0,
                },
            }
        else:
            # Fallback frame generator if CSV not yet created
            t_min = sec / 60.0
            return {
                "t_min": round(t_min, 4),
                "demo_s": round(sec, 2),
                "time_str": f"{int(sec//3600):02d}:{int((sec%3600)//60):02d}:{int(sec%60):02d}",
                "phase": "cruise",
                "phase_name": "Cruise",
                "phase_color": "#0d7ed6",
                "phase_icon": "✈️",
                "phase_elapsed_s": sec,
                "phase_duration_s": 18000,
                "alt_m": 8000.0,
                "vel_mps": 60.0,
                "dist_m": sec * 60.0,
                "mass_kg": 1450.0,
                "soc": max(10.0, 100.0 - (sec / 38400.0) * 80.0),
                "h2_kg": max(2.0, 20.0 - (sec / 38400.0) * 16.0),
                "jeta_kg": max(5.0, 60.0 - (sec / 38400.0) * 50.0),
                "h2_pct": 80.0,
                "jeta_pct": 80.0,
                "p_req_W": 28700.0,
                "p_bat_W": 5700.0,
                "p_fc_W": 11500.0,
                "p_eng_W": 11500.0,
                "p_gen_W": 11000.0,
                "p_motor_W": 28000.0,
                "bus_power_W": 28700.0,
                "bus_loss_W": 500.0,
                "bus_voltage": 800.0,
                "bus_current": 35.8,
                "bat_frac": 0.20,
                "fc_frac": 0.40,
                "eng_frac": 0.40,
                "prop_rpm": 1450.0,
                "pitch_deg": 2.0,
                "thrust_N": 500.0,
                "drag_N": 425.0,
                "lift_N": 14700.0,
                "ld_ratio": 15.0,
                "wing_loading": 735.0,
                "payload_kg": 200.0,
                "cg_pos": 0.25,
                "heading_deg": 90.0,
                "pitch_deg_att": 2.0,
                "roll_deg": 0.0,
                "vertical_speed_mps": 0.0,
                "range_km": sec * 0.06,
                "eng_rpm": 3500.0,
                "gen_rpm": 3500.0,
                "motor_rpm": 2800.0,
                "torque_Nm": 100.0,
                "eng_bsfc": 0.28,
                "eng_eff": 0.35,
                "eng_egt_K": 750.0,
                "fc_eff": 0.50,
                "fc_temp_K": 310.0,
                "fc_temp": 36.8,
                "motor_eff": 0.95,
                "gen_eff": 0.94,
                "eta_overall": 0.885,
                "fuel_flow_kg_s": 0.001,
                "fuel_flow_kg_hr": 3.6,
                "h2_flow_kg_s": 0.0002,
                "h2_flow_kg_hr": 0.72,
                "bat_voltage_V": 800.0,
                "bat_current_A": 7.1,
                "bat_r_int": 0.05,
                "bat_temp_K": 300.0,
                "bat_temp": 26.8,
                "bat_loss_W": 2.5,
                "mission_progress_pct": (sec / 38400.0) * 100.0,
                "endurance_remaining_min": max(0.0, 640.0 - t_min),
                "system_health_pct": 98.0,
                "overall_efficiency_pct": 88.5,
                "apems_reason": "FC at peak efficiency; battery reserved for transients",
                "is_charging": False,
                "health": {"battery": 95, "fuel_cell": 96, "engine": 97, "generator": 98, "motor": 98, "inverter": 99, "propeller": 99, "cooling": 98, "apems": 100},
            }

    async def broadcast_loop(self):
        """Broadcast telemetry frames at 10 Hz."""
        while True:
            if self._is_playing:
                # Advance telemetry dataset time at 10 Hz
                self._current_sec += self._play_speed / 10.0
                if self._current_sec >= TOTAL_MISSION_S:
                    self._current_sec = 0.0

            frame = self.get_frame(self._current_sec)
            actual_min = frame["t_min"]

            message = json.dumps({
                "type": "telemetry",
                "frame": frame,
                "time_min": actual_min,
                "demo_time_s": self._current_sec,
            })

            dead = []
            for ws in self.connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws)

            await asyncio.sleep(0.1)  # 10 Hz

    async def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self.broadcast_loop())

    async def stop(self):
        if self._task:
            self._task.cancel()
            self._task = None
        self._running = False

# Global telemetry manager instance
telemetry_manager = TelemetryManager()