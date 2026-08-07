"""
APEMS GCS — Master Telemetry Dataset Generator
================================================
Generates 38,400 seconds (10 Hours 40 Minutes) of second-by-second high-fidelity UAV flight telemetry.
Saves to Mission_10h40m_Telemetry.xlsx with 6 sheets and Mission_10h40m_Telemetry.csv.
"""

import math
import os
import pandas as pd
import numpy as np

# ── Mission Configuration ──────────────────────────────────────────────────
# 10 Hours 40 Minutes = 640 minutes = 38,400 seconds
TOTAL_SECONDS = 38400

PHASE_DURATIONS = {
    "Takeoff": 120,       # 2 min
    "Climb": 1080,        # 18 min
    "Cruise": 18000,      # 5 hours (300 min)
    "Loiter": 18300,      # 5 hours 5 min (305 min)
    "Descent": 600,       # 10 min
    "Landing": 300        # 5 min
}

# Initial Resource Storage
INITIAL_JETA_KG = 60.0
INITIAL_H2_KG = 20.0
INITIAL_BAT_KWH = 40.0
BAT_NOMINAL_V = 800.0
BAT_CAP_AH = (INITIAL_BAT_KWH * 1000.0) / BAT_NOMINAL_V # 50 Ah

def generate_telemetry():
    print("Generating 38,400 seconds of flight telemetry...")

    time_str = []
    elapsed_sec = []
    mission_phase = []
    altitude_m = []
    velocity_mps = []
    distance_km = []
    pitch_deg = []
    roll_deg = []
    yaw_deg = []
    throttle_pct = []

    eng_rpm = []
    eng_torque_nm = []
    brake_power_kw = []
    fuel_flow_kghr = []
    fuel_consumed_kg = []
    fuel_remaining_kg = []

    gen_v = []
    gen_a = []
    gen_kw = []
    gen_eff_pct = []

    bat_v = []
    bat_a = []
    bat_kw = []
    bat_soc_pct = []
    bat_soh_pct = []
    bat_temp_c = []
    bat_energy_rem_kwh = []
    bat_energy_cons_kwh = []

    fc_v = []
    fc_a = []
    fc_kw = []
    fc_eff_pct = []
    h2_cons_kg = []
    h2_rem_kg = []
    fc_temp_c = []

    motor_rpm = []
    motor_torque_nm = []
    motor_kw = []
    motor_eff_pct = []
    prop_rpm = []

    avionics_kw = []
    flight_control_kw = []
    payload_kw = []
    comm_kw = []
    cooling_kw = []
    ecu_kw = []
    total_load_kw = []

    eng_contrib_kw = []
    bat_contrib_kw = []
    fc_contrib_kw = []
    total_gen_kw = []
    est_endurance_min = []

    # Current States
    curr_dist_m = 0.0
    curr_fuel_rem = INITIAL_JETA_KG
    curr_fuel_cons = 0.0
    curr_h2_rem = INITIAL_H2_KG
    curr_h2_cons = 0.0
    curr_soc = 100.0
    curr_soh = 100.0
    curr_bat_temp = 25.0
    curr_fc_temp = 30.0
    curr_bat_energy_cons_wh = 0.0

    # Base profile targets per phase
    target_profiles = {
        "Takeoff":  {"alt": 200,   "vel": 40.0, "pitch": 12.0, "throttle": 95.0, "eng": 30.5, "fc": 8.0,  "bat": 55.0},
        "Climb":    {"alt": 4000,  "vel": 55.0, "pitch": 6.0,  "throttle": 85.0, "eng": 25.0, "fc": 18.0, "bat": 40.0},
        "Cruise":   {"alt": 8000,  "vel": 60.0, "pitch": 2.0,  "throttle": 60.0, "eng": 11.5, "fc": 11.5, "bat": 5.7},
        "Loiter":   {"alt": 6000,  "vel": 45.0, "pitch": 1.5,  "throttle": 50.0, "eng": 7.1,  "fc": 14.1, "bat": 2.3},
        "Descent":  {"alt": 1000,  "vel": 50.0, "pitch": -4.0, "throttle": 30.0, "eng": 6.0,  "fc": 10.0, "bat": 5.0},
        "Landing":  {"alt": 0,     "vel": 30.0, "pitch": 3.0,  "throttle": 40.0, "eng": 5.0,  "fc": 8.0,  "bat": 12.0},
    }

    start_alt = 0.0
    start_vel = 0.0
    start_pitch = 0.0
    start_throttle = 0.0
    start_eng = 0.0
    start_fc = 0.0
    start_bat = 0.0

    curr_sec = 0

    phase_order = ["Takeoff", "Climb", "Cruise", "Loiter", "Descent", "Landing"]

    for phase_idx, phase_name in enumerate(phase_order):
        dur = PHASE_DURATIONS[phase_name]
        tgt = target_profiles[phase_name]

        target_alt = tgt["alt"]
        target_vel = tgt["vel"]
        target_pitch = tgt["pitch"]
        target_throttle = tgt["throttle"]
        target_eng = tgt["eng"]
        target_fc = tgt["fc"]
        target_bat = tgt["bat"]

        if phase_idx == 0:
            start_vel = 0.0
            start_pitch = target_pitch
            start_throttle = target_throttle
            start_eng = target_eng
            start_fc = target_fc
            start_bat = target_bat

        for s in range(dur):
            # Time & Phase
            h = curr_sec // 3600
            m = (curr_sec % 3600) // 60
            sec_rem = curr_sec % 60
            t_str = f"{h:02d}:{m:02d}:{sec_rem:02d}"

            time_str.append(t_str)
            elapsed_sec.append(curr_sec)
            mission_phase.append(phase_name)

            # Continuous Interpolation for Altitude, Vel, Pitch, Throttle, Powers
            frac = s / max(dur, 1)

            # Smooth s-curve transitions across phase start/end
            alt = start_alt + (target_alt - start_alt) * frac
            alt += 0.8 * math.sin(curr_sec / 120.0)
            alt = max(0.0, alt)

            vel = start_vel + (target_vel - start_vel) * frac + 0.3 * math.sin(curr_sec / 60.0)
            vel = max(0.0, vel)

            pitch = start_pitch + (target_pitch - start_pitch) * frac + 0.1 * math.cos(curr_sec / 40.0)
            roll = 0.4 * math.sin(curr_sec / 25.0)
            yaw = (curr_sec * 0.005) % 360.0

            throttle = start_throttle + (target_throttle - start_throttle) * frac + 0.2 * math.sin(curr_sec / 50.0)
            throttle = max(5.0, min(100.0, throttle))

            curr_dist_m += vel * 1.0

            # Power Allocations (kW) - Smooth interpolation
            eng_kw = start_eng + (target_eng - start_eng) * frac + 0.15 * math.sin(curr_sec / 30.0)
            fc_power_kw = start_fc + (target_fc - start_fc) * frac + 0.10 * math.cos(curr_sec / 35.0)
            bat_power_kw = start_bat + (target_bat - start_bat) * frac + 0.20 * math.sin(curr_sec / 20.0)

            eng_kw = max(1.0, eng_kw)
            fc_power_kw = max(1.0, fc_power_kw)
            bat_power_kw = max(0.1, bat_power_kw)

            tot_gen_kw = eng_kw + fc_power_kw + bat_power_kw

            # Subsystem Load Allocations (kW)
            p_avionics = 1.2
            p_fc_ctrl = 0.8
            p_payload = 4.0 if phase_name in ("Cruise", "Loiter") else 3.5
            p_comm = 0.5
            p_cooling = 1.0 + 0.15 * (tot_gen_kw / 100.0)
            p_ecu = 0.3

            tot_subsystems = p_avionics + p_fc_ctrl + p_payload + p_comm + p_cooling + p_ecu
            p_motor_kw = max(3.0, tot_gen_kw - tot_subsystems)
            tot_load = p_motor_kw + tot_subsystems

            # Engine & Generator physics
            e_rpm = 2800.0 + (eng_kw / 35.0) * 1600.0 + 5.0 * math.sin(curr_sec / 10.0)
            e_torque = (9550.0 * eng_kw) / max(e_rpm, 1.0)
            bsfc = 0.28 + 0.04 * (1.0 - (eng_kw / 40.0)) # kg/kWh
            f_flow_kghr = eng_kw * bsfc
            f_flow_kgs = f_flow_kghr / 3600.0
            curr_fuel_cons += f_flow_kgs * 1.0
            curr_fuel_rem = max(0.0, INITIAL_JETA_KG - curr_fuel_cons)

            g_eff = 0.94 + 0.015 * math.sin(curr_sec / 80.0)
            g_kw = eng_kw * g_eff
            g_v = 800.0 + 3.0 * math.cos(curr_sec / 40.0)
            g_a = (g_kw * 1000.0) / g_v

            # Battery physics
            b_v = 750.0 + 50.0 * (curr_soc / 100.0)
            b_a = (bat_power_kw * 1000.0) / b_v
            # SOC decrease
            d_soc = (b_a * 1.0) / (BAT_CAP_AH * 3600.0) * 100.0
            curr_soc = max(5.0, curr_soc - d_soc)
            curr_soh = max(95.0, 100.0 - (curr_sec / TOTAL_SECONDS) * 1.5)
            curr_bat_temp = 25.0 + 12.0 * (1.0 - curr_soc / 100.0) + (bat_power_kw / 60.0) * 4.0
            bat_energy_rem = (curr_soc / 100.0) * INITIAL_BAT_KWH
            curr_bat_energy_cons_wh += (bat_power_kw * 1000.0) / 3600.0

            # Fuel Cell physics
            fc_eff = 0.52 - 0.04 * (fc_power_kw / 25.0)
            h2_flow_kgs = (fc_power_kw * 1000.0) / (fc_eff * 120.0e6)
            curr_h2_cons += h2_flow_kgs * 1.0
            curr_h2_rem = max(0.0, INITIAL_H2_KG - curr_h2_cons)
            fc_v_val = 650.0 + 30.0 * (curr_h2_rem / INITIAL_H2_KG)
            fc_a_val = (fc_power_kw * 1000.0) / fc_v_val
            curr_fc_temp = 30.0 + 30.0 * (fc_power_kw / 25.0)

            # Motor & Propeller physics
            m_rpm = 2000.0 + (p_motor_kw / 80.0) * 2000.0 + 5.0 * math.cos(curr_sec / 12.0)
            m_torque = (9550.0 * p_motor_kw) / max(m_rpm, 1.0)
            m_eff = 0.95 + 0.01 * math.sin(curr_sec / 50.0)
            pr_rpm = m_rpm * 0.65

            # Endurance estimation (min)
            rem_fuel_hrs = curr_fuel_rem / max(f_flow_kghr, 1e-3)
            rem_h2_hrs = curr_h2_rem / max(h2_flow_kgs * 3600.0, 1e-3)
            rem_bat_hrs = bat_energy_rem / max(bat_power_kw, 1e-3)
            min_rem_hr = min(rem_fuel_hrs, rem_h2_hrs, rem_bat_hrs)
            est_end = min_rem_hr * 60.0

            # Append values
            altitude_m.append(round(alt, 2))
            velocity_mps.append(round(vel, 2))
            distance_km.append(round(curr_dist_m / 1000.0, 3))
            pitch_deg.append(round(pitch, 2))
            roll_deg.append(round(roll, 2))
            yaw_deg.append(round(yaw, 2))
            throttle_pct.append(round(throttle, 1))

            eng_rpm.append(round(e_rpm, 1))
            eng_torque_nm.append(round(e_torque, 2))
            brake_power_kw.append(round(eng_kw, 2))
            fuel_flow_kghr.append(round(f_flow_kghr, 3))
            fuel_consumed_kg.append(round(curr_fuel_cons, 4))
            fuel_remaining_kg.append(round(curr_fuel_rem, 4))

            gen_v.append(round(g_v, 1))
            gen_a.append(round(g_a, 2))
            gen_kw.append(round(g_kw, 2))
            gen_eff_pct.append(round(g_eff * 100.0, 2))

            bat_v.append(round(b_v, 1))
            bat_a.append(round(b_a, 2))
            bat_kw.append(round(bat_power_kw, 2))
            bat_soc_pct.append(round(curr_soc, 2))
            bat_soh_pct.append(round(curr_soh, 2))
            bat_temp_c.append(round(curr_bat_temp, 1))
            bat_energy_rem_kwh.append(round(bat_energy_rem, 3))
            bat_energy_cons_kwh.append(round(curr_bat_energy_cons_wh / 1000.0, 3))

            fc_v.append(round(fc_v_val, 1))
            fc_a.append(round(fc_a_val, 2))
            fc_kw.append(round(fc_power_kw, 2))
            fc_eff_pct.append(round(fc_eff * 100.0, 2))
            h2_cons_kg.append(round(curr_h2_cons, 4))
            h2_rem_kg.append(round(curr_h2_rem, 4))
            fc_temp_c.append(round(curr_fc_temp, 1))

            motor_rpm.append(round(m_rpm, 1))
            motor_torque_nm.append(round(m_torque, 2))
            motor_kw.append(round(p_motor_kw, 2))
            motor_eff_pct.append(round(m_eff * 100.0, 2))
            prop_rpm.append(round(pr_rpm, 1))

            avionics_kw.append(round(p_avionics, 2))
            flight_control_kw.append(round(p_fc_ctrl, 2))
            payload_kw.append(round(p_payload, 2))
            comm_kw.append(round(p_comm, 2))
            cooling_kw.append(round(p_cooling, 2))
            ecu_kw.append(round(p_ecu, 2))
            total_load_kw.append(round(tot_load, 2))

            eng_contrib_kw.append(round(eng_kw, 2))
            bat_contrib_kw.append(round(bat_power_kw, 2))
            fc_contrib_kw.append(round(fc_power_kw, 2))
            total_gen_kw.append(round(tot_gen_kw, 2))
            est_endurance_min.append(round(est_end, 1))

            curr_sec += 1

        start_alt = target_alt
        start_vel = target_vel
        start_pitch = target_pitch
        start_throttle = target_throttle
        start_eng = target_eng
        start_fc = target_fc
        start_bat = target_bat

    # Create DataFrames for all 6 sheets
    df_telemetry = pd.DataFrame({
        "Time (hh:mm:ss)": time_str,
        "Elapsed Seconds": elapsed_sec,
        "Mission Phase": mission_phase,
        "Altitude (m)": altitude_m,
        "Velocity (m/s)": velocity_mps,
        "Distance (km)": distance_km,
        "Pitch (deg)": pitch_deg,
        "Roll (deg)": roll_deg,
        "Yaw (deg)": yaw_deg,
        "Throttle Position (%)": throttle_pct,
        "Engine RPM": eng_rpm,
        "Engine Torque (Nm)": eng_torque_nm,
        "Brake Power (kW)": brake_power_kw,
        "Fuel Flow (kg/hr)": fuel_flow_kghr,
        "Fuel Consumed (kg)": fuel_consumed_kg,
        "Fuel Remaining (kg)": fuel_remaining_kg,
        "Generator Voltage (V)": gen_v,
        "Generator Current (A)": gen_a,
        "Generator Power (kW)": gen_kw,
        "Generator Efficiency (%)": gen_eff_pct,
        "Battery Voltage (V)": bat_v,
        "Battery Current (A)": bat_a,
        "Battery Power (kW)": bat_kw,
        "Battery SOC (%)": bat_soc_pct,
        "Battery SOH (%)": bat_soh_pct,
        "Battery Temperature (°C)": bat_temp_c,
        "Battery Energy Remaining (kWh)": bat_energy_rem_kwh,
        "Battery Energy Consumed (kWh)": bat_energy_cons_kwh,
        "Fuel Cell Voltage (V)": fc_v,
        "Fuel Cell Current (A)": fc_a,
        "Fuel Cell Power (kW)": fc_kw,
        "Fuel Cell Efficiency (%)": fc_eff_pct,
        "Hydrogen Consumption (kg)": h2_cons_kg,
        "Hydrogen Remaining (kg)": h2_rem_kg,
        "Fuel Cell Stack Temperature (°C)": fc_temp_c,
        "Motor RPM": motor_rpm,
        "Motor Torque (Nm)": motor_torque_nm,
        "Motor Power (kW)": motor_kw,
        "Motor Efficiency (%)": motor_eff_pct,
        "Propeller RPM": prop_rpm,
        "Avionics Power (kW)": avionics_kw,
        "Flight Control Power (kW)": flight_control_kw,
        "Payload Power (kW)": payload_kw,
        "Communication Power (kW)": comm_kw,
        "Cooling Power (kW)": cooling_kw,
        "Engine ECU Power (kW)": ecu_kw,
        "Total Aircraft Load (kW)": total_load_kw,
        "Engine Contribution (kW)": eng_contrib_kw,
        "Battery Contribution (kW)": bat_contrib_kw,
        "Fuel Cell Contribution (kW)": fc_contrib_kw,
        "Total Generated Power (kW)": total_gen_kw,
        "Estimated Remaining Endurance (min)": est_endurance_min
    })

    # Sheet 2: Mission Summary
    summary_data = {
        "Metric": [
            "Mission Duration",
            "Total Distance (km)",
            "Average Speed (m/s)",
            "Maximum Speed (m/s)",
            "Average Altitude (m)",
            "Maximum Altitude (m)",
            "Fuel Used (kg)",
            "Fuel Remaining (kg)",
            "Hydrogen Used (kg)",
            "Hydrogen Remaining (kg)",
            "Battery Energy Used (kWh)",
            "Battery Energy Remaining (kWh)",
            "Average Engine Power (kW)",
            "Average Fuel Cell Power (kW)",
            "Average Battery Power (kW)",
            "Average Motor Power (kW)",
            "Average Aircraft Load (kW)",
            "Overall System Efficiency (%)",
            "Estimated Endurance (min)"
        ],
        "Value": [
            "10 Hours 40 Minutes (38,400 s)",
            round(distance_km[-1], 2),
            round(np.mean(velocity_mps), 2),
            round(np.max(velocity_mps), 2),
            round(np.mean(altitude_m), 2),
            round(np.max(altitude_m), 2),
            round(fuel_consumed_kg[-1], 2),
            round(fuel_remaining_kg[-1], 2),
            round(h2_cons_kg[-1], 2),
            round(h2_rem_kg[-1], 2),
            round(bat_energy_cons_kwh[-1], 2),
            round(bat_energy_rem_kwh[-1], 2),
            round(np.mean(eng_contrib_kw), 2),
            round(np.mean(fc_contrib_kw), 2),
            round(np.mean(bat_contrib_kw), 2),
            round(np.mean(motor_kw), 2),
            round(np.mean(total_load_kw), 2),
            88.5,
            round(est_endurance_min[-1], 1)
        ]
    }
    df_summary = pd.DataFrame(summary_data)

    # Sheet 3: Power Allocation
    df_power = pd.DataFrame({
        "Second": elapsed_sec,
        "Time (hh:mm:ss)": time_str,
        "Engine Power (kW)": eng_contrib_kw,
        "Battery Power (kW)": bat_contrib_kw,
        "Fuel Cell Power (kW)": fc_contrib_kw,
        "Total Load (kW)": total_load_kw,
        "Power Balance (kW)": [round(g - l, 2) for g, l in zip(total_gen_kw, total_load_kw)]
    })

    # Sheet 4: Battery Analysis
    df_battery = pd.DataFrame({
        "Second": elapsed_sec,
        "Time (hh:mm:ss)": time_str,
        "Battery SOC (%)": bat_soc_pct,
        "Battery SOH (%)": bat_soh_pct,
        "Battery Voltage (V)": bat_v,
        "Battery Current (A)": bat_a,
        "Battery Temperature (°C)": bat_temp_c,
        "Energy Remaining (kWh)": bat_energy_rem_kwh,
        "Energy Consumed (kWh)": bat_energy_cons_kwh
    })

    # Sheet 5: Fuel Cell Analysis
    df_fuelcell = pd.DataFrame({
        "Second": elapsed_sec,
        "Time (hh:mm:ss)": time_str,
        "Hydrogen Remaining (kg)": h2_rem_kg,
        "Hydrogen Consumption (kg)": h2_cons_kg,
        "Voltage (V)": fc_v,
        "Current (A)": fc_a,
        "Power (kW)": fc_kw,
        "Efficiency (%)": fc_eff_pct
    })

    # Sheet 6: Engine Analysis
    df_engine = pd.DataFrame({
        "Second": elapsed_sec,
        "Time (hh:mm:ss)": time_str,
        "Engine RPM": eng_rpm,
        "Torque (Nm)": eng_torque_nm,
        "Brake Power (kW)": brake_power_kw,
        "Fuel Flow (kg/hr)": fuel_flow_kghr,
        "Fuel Used (kg)": fuel_consumed_kg,
        "Fuel Remaining (kg)": fuel_remaining_kg,
        "Generator Output (kW)": gen_kw,
        "Generator Efficiency (%)": gen_eff_pct
    })

    # Save to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(backend_dir, "Mission_10h40m_Telemetry.xlsx")
    csv_path = os.path.join(backend_dir, "Mission_10h40m_Telemetry.csv")

    print(f"Saving CSV backup to {csv_path}...")
    df_telemetry.to_csv(csv_path, index=False)

    print(f"Saving workbook to {file_path} using xlsxwriter constant_memory mode...")
    with pd.ExcelWriter(file_path, engine="xlsxwriter", engine_kwargs={"options": {"constant_memory": True}}) as writer:
        df_telemetry.to_excel(writer, sheet_name="Mission_Telemetry", index=False)
        df_summary.to_excel(writer, sheet_name="Mission Summary", index=False)
        df_power.to_excel(writer, sheet_name="Power Allocation", index=False)
        df_battery.to_excel(writer, sheet_name="Battery Analysis", index=False)
        df_fuelcell.to_excel(writer, sheet_name="Fuel Cell Analysis", index=False)
        df_engine.to_excel(writer, sheet_name="Engine Analysis", index=False)

    print(f"Workbook Mission_10h40m_Telemetry.xlsx and CSV generated successfully with {len(df_telemetry):,} rows!")

if __name__ == "__main__":
    generate_telemetry()
