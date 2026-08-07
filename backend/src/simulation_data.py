"""
Simulation Data Generator
=========================
Generates the `simulation_results.csv` file that the dashboard reads.
This module simulates the full mission profile of the Adaptive Multi-Source
Hybrid Electric Fixed Wing UAV, including all engineering parameters.

The simulation covers:
- Takeoff, Climb, Cruise, Loiter, Descent, Landing phases
- Engine, Generator, Battery, Fuel Cell, Motor, Propeller performance
- APEMS power split decisions
- Fuel consumption and energy management
- Full physics calculations at each timestep

Author: Aerospace Digital Twin Team
"""

import numpy as np
import pandas as pd
import os
from datetime import datetime

# =============================================================================
# AIRCRAFT & PROPULSION PARAMETERS
# =============================================================================

# Aircraft Geometry & Mass
MTOW = 1500.0          # kg - Maximum Takeoff Weight
WING_AREA = 12.5       # m² - Wing reference area
WING_SPAN = 12.0       # m - Wing span
ASPECT_RATIO = WING_SPAN**2 / WING_AREA  # ~11.52
OSWALD_EFF = 0.82      # Oswald efficiency factor
CD0 = 0.025            # Zero-lift drag coefficient
GRAVITY = 9.81         # m/s²

# Propulsion System
ENGINE_MAX_POWER = 120.0    # kW - PBS TS100 turboshaft
GENERATOR_EFF = 0.92        # Generator efficiency
MOTOR_MAX_POWER = 150.0     # kW - PMSM motor
MOTOR_EFF = 0.95            # Motor efficiency
PROPELLER_EFF = 0.85        # Variable pitch propeller efficiency
INVERTER_EFF = 0.98         # Inverter efficiency
BUS_VOLTAGE = 800.0         # V - DC bus voltage

# Battery System
BATTERY_CAPACITY = 40.0     # kWh - Li-ion battery
BATTERY_MAX_POWER = 80.0    # kW
BATTERY_EFF = 0.95          # Round-trip efficiency
BATTERY_INIT_SOC = 0.95     # Initial state of charge
BATTERY_MIN_SOC = 0.20      # Minimum SOC constraint

# Fuel Cell System
FC_MAX_POWER = 60.0         # kW - PEM fuel cell
FC_EFF = 0.55               # Fuel cell efficiency
H2_TANK_CAPACITY = 8.0      # kg - Hydrogen storage
H2_LHV = 120.0              # MJ/kg - Hydrogen lower heating value

# Fuel System
JET_A_CAPACITY = 200.0      # kg - Jet-A fuel
JET_A_LHV = 43.2            # MJ/kg - Jet-A lower heating value
SFC_ENGINE = 0.35           # kg/kWh - Specific fuel consumption

# Mission Profile
MISSION_PHASES = ['Takeoff', 'Climb', 'Cruise', 'Loiter', 'Descent', 'Landing']
PHASE_DURATIONS = [60, 300, 1800, 1200, 240, 60]  # seconds
PHASE_ALTITUDES = [0, 3000, 5000, 5000, 0, 0]     # meters
PHASE_SPEEDS = [35, 50, 69.4, 45, 40, 30]         # m/s
PHASE_POWER = [120, 100, 65, 45, 30, 20]          # kW required

# APEMS Split Ratios per Phase (Engine %, Battery %, Fuel Cell %)
APEMS_SPLITS = {
    'Takeoff': {'engine': 0.70, 'battery': 0.30, 'fuel_cell': 0.00,
                'reason': 'Maximum Takeoff Power - High thrust demand requires engine + battery boost'},
    'Climb':   {'engine': 0.60, 'battery': 0.20, 'fuel_cell': 0.20,
                'reason': 'Sustained climb power - balanced hybrid operation'},
    'Cruise':  {'engine': 0.40, 'battery': 0.10, 'fuel_cell': 0.50,
                'reason': 'Maximum Fuel Economy - fuel cell carries cruise load'},
    'Loiter':  {'engine': 0.30, 'battery': 0.10, 'fuel_cell': 0.60,
                'reason': 'Maximum Endurance - fuel cell dominates for long loiter'},
    'Descent': {'engine': 0.30, 'battery': 0.40, 'fuel_cell': 0.30,
                'reason': 'Reduced power - regenerative braking opportunity'},
    'Landing': {'engine': 0.40, 'battery': 0.60, 'fuel_cell': 0.00,
                'reason': 'Noise Reduction - electric-only approach for quiet landing'}
}

# =============================================================================
# ATMOSPHERE MODEL
# =============================================================================

def standard_atmosphere(altitude_m):
    """
    International Standard Atmosphere (ISA) model.
    
    Parameters:
    -----------
    altitude_m : float
        Altitude in meters
    
    Returns:
    --------
    dict : {'density', 'pressure', 'temperature', 'speed_of_sound'}
    """
    # Sea level conditions
    rho0 = 1.225       # kg/m³
    p0 = 101325.0      # Pa
    T0 = 288.15        # K
    g = 9.81           # m/s²
    R = 287.05         # J/(kg·K)
    L = 0.0065         # K/m - temperature lapse rate
    
    if altitude_m < 11000:  # Troposphere
        T = T0 - L * altitude_m
        p = p0 * (T / T0) ** (g / (R * L))
        rho = p / (R * T)
    else:  # Stratosphere (simplified)
        T = 216.65
        p = p0 * np.exp(-g * (altitude_m - 11000) / (R * T))
        rho = p / (R * T)
    
    a = np.sqrt(1.4 * R * T)  # Speed of sound
    
    return {'density': rho, 'pressure': p, 'temperature': T, 'speed_of_sound': a}


# =============================================================================
# AERODYNAMICS CALCULATIONS
# =============================================================================

def calculate_aerodynamics(velocity, altitude, mass, cl):
    """
    Calculate all aerodynamic parameters at given flight condition.
    
    Returns:
    --------
    dict with all aerodynamic quantities
    """
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    
    # Dynamic pressure: q = 0.5 * rho * V²
    q = 0.5 * rho * velocity**2
    
    # Lift: L = 0.5 * rho * V² * S * CL
    lift = q * WING_AREA * cl
    
    # Weight: W = m * g
    weight = mass * GRAVITY
    
    # Induced drag coefficient: CDi = CL² / (pi * A * e)
    cd_induced = cl**2 / (np.pi * ASPECT_RATIO * OSWALD_EFF)
    
    # Total drag coefficient: CD = CD0 + CDi
    cd_total = CD0 + cd_induced
    
    # Drag: D = 0.5 * rho * V² * S * CD
    drag = q * WING_AREA * cd_total
    
    # Required thrust: T = D (steady level flight)
    thrust = drag
    
    # Required power: P = T * V
    power_required = thrust * velocity / 1000.0  # kW
    
    # Lift-to-drag ratio
    ld_ratio = lift / drag if drag > 0 else 0
    
    # Stall speed: V_stall = sqrt(2*W / (rho * S * CL_max))
    cl_max = 1.5
    stall_speed = np.sqrt(2 * weight / (rho * WING_AREA * cl_max))
    
    # Mach number: M = V / a
    mach = velocity / atm['speed_of_sound']
    
    # Reynolds number: Re = rho * V * c / mu
    chord = WING_AREA / WING_SPAN  # Mean aerodynamic chord
    mu = 1.789e-5  # Dynamic viscosity at sea level (simplified)
    reynolds = rho * velocity * chord / mu
    
    # Power loading: P/W (kW/kg)
    power_loading = power_required / mass
    
    # Wing loading: W/S (N/m²)
    wing_loading = weight / WING_AREA
    
    return {
        'dynamic_pressure': q,
        'lift': lift,
        'drag': drag,
        'weight': weight,
        'thrust': thrust,
        'power_required': power_required,
        'ld_ratio': ld_ratio,
        'stall_speed': stall_speed,
        'mach': mach,
        'reynolds': reynolds,
        'power_loading': power_loading,
        'wing_loading': wing_loading,
        'cd_total': cd_total,
        'cd_induced': cd_induced,
        'cl': cl,
        'density': rho,
        'temperature': atm['temperature'],
        'speed_of_sound': atm['speed_of_sound']
    }


# =============================================================================
# PROPULSION CALCULATIONS
# =============================================================================

def calculate_propulsion(engine_power_kw, rpm, phase):
    """
    Calculate propulsion chain parameters.
    
    Engine -> Generator -> Bus -> Inverter -> Motor -> Propeller
    """
    # Angular velocity: omega = 2*pi*RPM/60
    omega = 2 * np.pi * rpm / 60.0
    
    # Engine mechanical power
    engine_mech_power = engine_power_kw
    
    # Generator output: P_out = P_in * eta_generator
    generator_power = engine_mech_power * GENERATOR_EFF
    
    # Electrical power on bus
    bus_power = generator_power
    
    # Inverter output
    inverter_power = bus_power * INVERTER_EFF
    
    # Motor mechanical power: P_mech = P_elec * eta_motor
    motor_mech_power = inverter_power * MOTOR_EFF
    
    # Propeller power: P_prop = P_mech * eta_prop
    propeller_power = motor_mech_power * PROPELLER_EFF
    
    # Torque: T = P / omega
    torque = (motor_mech_power * 1000) / omega if omega > 0 else 0
    
    # Losses at each stage
    engine_loss = engine_mech_power * (1 - 0.35)  # Engine thermal efficiency ~35%
    generator_loss = engine_mech_power * (1 - GENERATOR_EFF)
    inverter_loss = bus_power * (1 - INVERTER_EFF)
    motor_loss = inverter_power * (1 - MOTOR_EFF)
    propeller_loss = motor_mech_power * (1 - PROPELLER_EFF)
    
    # Overall efficiency: eta = eta_engine * eta_gen * eta_motor * eta_prop
    overall_efficiency = 0.35 * GENERATOR_EFF * MOTOR_EFF * PROPELLER_EFF
    
    return {
        'omega': omega,
        'engine_power': engine_mech_power,
        'generator_power': generator_power,
        'bus_power': bus_power,
        'inverter_power': inverter_power,
        'motor_power': motor_mech_power,
        'propeller_power': propeller_power,
        'torque': torque,
        'engine_loss': engine_loss,
        'generator_loss': generator_loss,
        'inverter_loss': inverter_loss,
        'motor_loss': motor_loss,
        'propeller_loss': propeller_loss,
        'overall_efficiency': overall_efficiency,
        'rpm': rpm
    }


# =============================================================================
# BATTERY PHYSICS
# =============================================================================

def calculate_battery(soc, power_kw, dt, temperature=25.0):
    """
    Calculate battery state and parameters.
    
    SOC_new = SOC_old - (I * dt) / Capacity
    """
    # Battery voltage (simplified OCV model)
    voltage = 3.7 * 200 * (0.5 + 0.5 * soc)  # 200 cells in series, ~740V nominal
    
    # Current: I = P / V
    current = (power_kw * 1000) / voltage if voltage > 0 else 0
    
    # Capacity in Ah
    capacity_ah = (BATTERY_CAPACITY * 1000) / 740.0  # ~54 Ah
    
    # SOC change: dSOC = -I*dt / Capacity
    soc_new = soc - (current * dt) / (capacity_ah * 3600)
    soc_new = np.clip(soc_new, 0.0, 1.0)
    
    # DOD
    dod = 1.0 - soc_new
    
    # Remaining energy
    remaining_energy = BATTERY_CAPACITY * soc_new
    
    # Internal resistance (increases with DOD and temperature)
    r_internal = 0.05 + 0.1 * dod + 0.01 * (temperature - 25) / 25
    
    # Power loss: P_loss = I² * R
    power_loss = (current**2 * r_internal) / 1000.0  # kW
    
    # Efficiency
    efficiency = BATTERY_EFF * (1 - 0.1 * (1 - soc_new))
    
    # Remaining flight time at current power
    remaining_time = (remaining_energy / power_kw * 3600) if power_kw > 0 else 9999
    
    return {
        'soc': soc_new,
        'dod': dod,
        'voltage': voltage,
        'current': current,
        'power': power_kw,
        'remaining_energy': remaining_energy,
        'temperature': temperature,
        'efficiency': efficiency,
        'r_internal': r_internal,
        'power_loss': power_loss,
        'remaining_time': remaining_time,
        'capacity_ah': capacity_ah
    }


# =============================================================================
# FUEL SYSTEM CALCULATIONS
# =============================================================================

def calculate_fuel_system(engine_power_kw, fc_power_kw, jet_a_remaining, h2_remaining, dt):
    """
    Calculate fuel consumption and remaining fuel.
    
    Fuel Energy = Mass * LHV
    Engine Fuel Burn = Power / (eta * LHV)
    """
    # Engine fuel burn rate: m_dot = P / (eta * LHV)
    engine_eta = 0.35
    jet_a_burn_rate = (engine_power_kw * 1000) / (engine_eta * JET_A_LHV * 1e6)  # kg/s
    jet_a_burned = jet_a_burn_rate * dt
    
    # Fuel cell hydrogen consumption: m_dot = P / (eta_FC * LHV)
    fc_h2_burn_rate = (fc_power_kw * 1000) / (FC_EFF * H2_LHV * 1e6)  # kg/s
    h2_burned = fc_h2_burn_rate * dt
    
    # Update remaining
    jet_a_new = max(0, jet_a_remaining - jet_a_burned)
    h2_new = max(0, h2_remaining - h2_burned)
    
    # Energy content
    jet_a_energy = jet_a_new * JET_A_LHV / 3.6  # kWh
    h2_energy = h2_new * H2_LHV / 3.6  # kWh
    
    # Specific fuel consumption
    sfc = SFC_ENGINE  # kg/kWh
    
    # Fuel flow rate
    fuel_flow = jet_a_burn_rate * 3600  # kg/hr
    
    return {
        'jet_a_remaining': jet_a_new,
        'h2_remaining': h2_new,
        'jet_a_burned': jet_a_burned,
        'h2_burned': h2_burned,
        'jet_a_burn_rate': jet_a_burn_rate,
        'h2_burn_rate': fc_h2_burn_rate,
        'sfc': sfc,
        'fuel_flow': fuel_flow,
        'jet_a_energy': jet_a_energy,
        'h2_energy': h2_energy
    }


# =============================================================================
# APEMS CONTROLLER
# =============================================================================

def apems_controller(phase, power_required, soc, jet_a_remaining, h2_remaining):
    """
    Adaptive Power & Energy Management System.
    Determines optimal power split based on mission phase and constraints.
    """
    split = APEMS_SPLITS[phase]
    
    # Apply constraints
    engine_power = power_required * split['engine']
    battery_power = power_required * split['battery']
    fc_power = power_required * split['fuel_cell']
    
    # Check battery SOC constraint
    if soc < BATTERY_MIN_SOC and battery_power > 0:
        # Reduce battery, increase engine
        reduction = battery_power * 0.5
        battery_power -= reduction
        engine_power += reduction
        split['reason'] += f" | SOC {soc:.0%} below {BATTERY_MIN_SOC:.0%} - battery reduced"
    
    # Check fuel constraints
    if jet_a_remaining < 5 and engine_power > 0:
        # Reduce engine, increase battery/fuel cell
        reduction = engine_power * 0.5
        engine_power -= reduction
        battery_power += reduction * 0.5
        fc_power += reduction * 0.5
        split['reason'] += " | Low Jet-A - engine reduced"
    
    if h2_remaining < 0.5 and fc_power > 0:
        # Reduce fuel cell, increase battery
        reduction = fc_power * 0.5
        fc_power -= reduction
        battery_power += reduction
        split['reason'] += " | Low H2 - fuel cell reduced"
    
    # Normalize
    total = engine_power + battery_power + fc_power
    if total > 0:
        engine_pct = engine_power / total * 100
        battery_pct = battery_power / total * 100
        fc_pct = fc_power / total * 100
    else:
        engine_pct = battery_pct = fc_pct = 0
    
    return {
        'engine_power': engine_power,
        'battery_power': battery_power,
        'fc_power': fc_power,
        'engine_pct': engine_pct,
        'battery_pct': battery_pct,
        'fc_pct': fc_pct,
        'reason': split['reason'],
        'phase': phase
    }


# =============================================================================
# MAIN SIMULATION
# =============================================================================

def run_simulation():
    """
    Run the full mission simulation and generate simulation_results.csv.
    """
    print("=" * 80)
    print("ADAPTIVE MULTI-SOURCE HYBRID ELECTRIC UAV - MISSION SIMULATION")
    print("=" * 80)
    
    # Initialize state
    time = 0.0
    dt = 1.0  # 1 second timestep
    mass = MTOW
    jet_a_remaining = JET_A_CAPACITY
    h2_remaining = H2_TANK_CAPACITY
    soc = BATTERY_INIT_SOC
    distance = 0.0
    battery_temp = 25.0
    
    # Track cumulative fuel per phase
    phase_fuel = {p: {'jet_a': 0.0, 'h2': 0.0} for p in MISSION_PHASES}
    
    # Results storage
    results = []
    
    # Mission timeline
    phase_start_times = []
    t_phase = 0
    for i, dur in enumerate(PHASE_DURATIONS):
        phase_start_times.append(t_phase)
        t_phase += dur
    
    total_mission_time = sum(PHASE_DURATIONS)
    
    # Simulation loop
    for phase_idx, phase in enumerate(MISSION_PHASES):
        phase_duration = PHASE_DURATIONS[phase_idx]
        altitude = PHASE_ALTITUDES[phase_idx]
        velocity = PHASE_SPEEDS[phase_idx]
        power_req = PHASE_POWER[phase_idx]
        
        print(f"\n--- {phase.upper()} PHASE ({phase_duration}s) ---")
        
        for step in range(phase_duration):
            # APEMS decision
            apems = apems_controller(phase, power_req, soc, jet_a_remaining, h2_remaining)
            
            # Aerodynamics
            cl = 2 * mass * GRAVITY / (standard_atmosphere(altitude)['density'] * velocity**2 * WING_AREA)
            cl = np.clip(cl, 0.1, 1.5)
            aero = calculate_aerodynamics(velocity, altitude, mass, cl)
            
            # Propulsion
            rpm = 2000 + (power_req / ENGINE_MAX_POWER) * 1000  # RPM scales with power
            prop = calculate_propulsion(apems['engine_power'], rpm, phase)
            
            # Battery
            batt = calculate_battery(soc, apems['battery_power'], dt, battery_temp)
            soc = batt['soc']
            battery_temp += 0.01 * (apems['battery_power'] / BATTERY_MAX_POWER)  # Thermal model
            
            # Fuel system
            fuel = calculate_fuel_system(apems['engine_power'], apems['fc_power'],
                                         jet_a_remaining, h2_remaining, dt)
            jet_a_remaining = fuel['jet_a_remaining']
            h2_remaining = fuel['h2_remaining']
            
            # Track phase fuel
            phase_fuel[phase]['jet_a'] += fuel['jet_a_burned']
            phase_fuel[phase]['h2'] += fuel['h2_burned']
            
            # Distance
            distance += velocity * dt
            
            # Endurance calculations
            battery_endurance = batt['remaining_time'] / 3600  # hours
            fuel_endurance = (jet_a_remaining * JET_A_LHV / 3.6) / (apems['engine_power'] + 1e-6)  # hours
            fc_endurance = (h2_remaining * H2_LHV / 3.6) / (apems['fc_power'] + 1e-6)  # hours
            total_endurance = battery_endurance + fuel_endurance + fc_endurance
            remaining_range = velocity * total_endurance * 3600 / 1000  # km
            
            # Mission progress
            progress = (time / total_mission_time) * 100
            
            # Store results
            results.append({
                'time': time,
                'phase': phase,
                'altitude': altitude,
                'velocity': velocity,
                'distance': distance,
                'mass': mass,
                'progress': progress,
                
                # APEMS
                'engine_power': apems['engine_power'],
                'battery_power': apems['battery_power'],
                'fc_power': apems['fc_power'],
                'engine_pct': apems['engine_pct'],
                'battery_pct': apems['battery_pct'],
                'fc_pct': apems['fc_pct'],
                'apems_reason': apems['reason'],
                
                # Aerodynamics
                'dynamic_pressure': aero['dynamic_pressure'],
                'lift': aero['lift'],
                'drag': aero['drag'],
                'weight': aero['weight'],
                'thrust': aero['thrust'],
                'power_required': aero['power_required'],
                'ld_ratio': aero['ld_ratio'],
                'stall_speed': aero['stall_speed'],
                'mach': aero['mach'],
                'reynolds': aero['reynolds'],
                'power_loading': aero['power_loading'],
                'wing_loading': aero['wing_loading'],
                'cd_total': aero['cd_total'],
                'cd_induced': aero['cd_induced'],
                'cl': aero['cl'],
                'density': aero['density'],
                'temperature': aero['temperature'],
                'speed_of_sound': aero['speed_of_sound'],
                
                # Propulsion
                'rpm': prop['rpm'],
                'omega': prop['omega'],
                'generator_power': prop['generator_power'],
                'bus_power': prop['bus_power'],
                'inverter_power': prop['inverter_power'],
                'motor_power': prop['motor_power'],
                'propeller_power': prop['propeller_power'],
                'torque': prop['torque'],
                'engine_loss': prop['engine_loss'],
                'generator_loss': prop['generator_loss'],
                'inverter_loss': prop['inverter_loss'],
                'motor_loss': prop['motor_loss'],
                'propeller_loss': prop['propeller_loss'],
                'overall_efficiency': prop['overall_efficiency'],
                
                # Battery
                'soc': soc,
                'dod': batt['dod'],
                'battery_voltage': batt['voltage'],
                'battery_current': batt['current'],
                'battery_energy': batt['remaining_energy'],
                'battery_temp': battery_temp,
                'battery_efficiency': batt['efficiency'],
                'battery_r_internal': batt['r_internal'],
                'battery_power_loss': batt['power_loss'],
                
                # Fuel
                'jet_a_remaining': jet_a_remaining,
                'h2_remaining': h2_remaining,
                'jet_a_burn_rate': fuel['jet_a_burn_rate'],
                'h2_burn_rate': fuel['h2_burn_rate'],
                'sfc': fuel['sfc'],
                'fuel_flow': fuel['fuel_flow'],
                'jet_a_energy': fuel['jet_a_energy'],
                'h2_energy': fuel['h2_energy'],
                
                # Endurance
                'battery_endurance': battery_endurance,
                'fuel_endurance': fuel_endurance,
                'fc_endurance': fc_endurance,
                'total_endurance': total_endurance,
                'remaining_range': remaining_range,
                
                # Phase fuel tracking
                'phase_jet_a_takeoff': phase_fuel['Takeoff']['jet_a'],
                'phase_jet_a_climb': phase_fuel['Climb']['jet_a'],
                'phase_jet_a_cruise': phase_fuel['Cruise']['jet_a'],
                'phase_jet_a_loiter': phase_fuel['Loiter']['jet_a'],
                'phase_jet_a_descent': phase_fuel['Descent']['jet_a'],
                'phase_jet_a_landing': phase_fuel['Landing']['jet_a'],
                'phase_h2_takeoff': phase_fuel['Takeoff']['h2'],
                'phase_h2_climb': phase_fuel['Climb']['h2'],
                'phase_h2_cruise': phase_fuel['Cruise']['h2'],
                'phase_h2_loiter': phase_fuel['Loiter']['h2'],
                'phase_h2_descent': phase_fuel['Descent']['h2'],
                'phase_h2_landing': phase_fuel['Landing']['h2'],
            })
            
            time += dt
        
        # Update mass (fuel burned)
        mass = MTOW - (JET_A_CAPACITY - jet_a_remaining) - (H2_TANK_CAPACITY - h2_remaining)
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Save to CSV
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'simulation_results.csv')
    df.to_csv(output_path, index=False)
    
    print(f"\n{'=' * 80}")
    print(f"SIMULATION COMPLETE")
    print(f"Total time: {total_mission_time}s ({total_mission_time/60:.1f} min)")
    print(f"Total distance: {df['distance'].iloc[-1]/1000:.1f} km")
    print(f"Final Jet-A: {jet_a_remaining:.1f} kg")
    print(f"Final H2: {h2_remaining:.2f} kg")
    print(f"Final SOC: {soc:.1%}")
    print(f"Data saved to: {output_path}")
    print(f"{'=' * 80}")
    
    return df


if __name__ == '__main__':
    df = run_simulation()
    print(f"\nDataFrame shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")