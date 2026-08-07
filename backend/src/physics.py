"""
Physics & Engineering Calculation Module
=========================================
Provides all engineering equations with step-by-step numerical substitution,
variable definitions, units, and engineering interpretation.

This module is the mathematical heart of the digital twin, exposing
every calculation used throughout the dashboard.

Author: Aerospace Digital Twin Team
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Any

# =============================================================================
# CONSTANTS
# =============================================================================
GRAVITY = 9.81          # m/s²
R_GAS = 287.05          # J/(kg·K) - specific gas constant for air
GAMMA = 1.4             # Ratio of specific heats
RHO_SEA_LEVEL = 1.225   # kg/m³
T_SEA_LEVEL = 288.15    # K
P_SEA_LEVEL = 101325.0  # Pa
LAPSE_RATE = 0.0065     # K/m
MU_SEA_LEVEL = 1.789e-5 # Pa·s - dynamic viscosity

# =============================================================================
# EQUATION RESULT DATA CLASS
# =============================================================================

@dataclass
class EquationResult:
    """
    Container for a complete equation calculation with all steps.
    
    Attributes:
        name: Equation name
        formula: Mathematical formula in LaTeX-like notation
        variables: Dictionary of variable name -> (value, unit, description)
        steps: List of step-by-step calculation strings
        answer: Final numerical answer
        unit: Unit of the answer
        interpretation: Engineering interpretation of the result
    """
    name: str
    formula: str
    variables: Dict[str, Dict[str, Any]]
    steps: List[str]
    answer: float
    unit: str
    interpretation: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for display."""
        return {
            'name': self.name,
            'formula': self.formula,
            'variables': self.variables,
            'steps': self.steps,
            'answer': self.answer,
            'unit': self.unit,
            'interpretation': self.interpretation
        }


# =============================================================================
# ATMOSPHERE MODEL
# =============================================================================

def standard_atmosphere(altitude_m: float) -> Dict[str, float]:
    """
    International Standard Atmosphere (ISA) model.
    
    Equation: T = T0 - L*h (troposphere)
              p = p0 * (T/T0)^(g/(R*L))
              rho = p / (R*T)
    
    Parameters:
    -----------
    altitude_m : float
        Altitude in meters
    
    Returns:
    --------
    dict with density, pressure, temperature, speed_of_sound
    """
    if altitude_m < 11000:  # Troposphere
        T = T_SEA_LEVEL - LAPSE_RATE * altitude_m
        p = P_SEA_LEVEL * (T / T_SEA_LEVEL) ** (GRAVITY / (R_GAS * LAPSE_RATE))
        rho = p / (R_GAS * T)
    else:  # Stratosphere
        T = 216.65
        p = P_SEA_LEVEL * np.exp(-GRAVITY * (altitude_m - 11000) / (R_GAS * T))
        rho = p / (R_GAS * T)
    
    a = np.sqrt(GAMMA * R_GAS * T)  # Speed of sound
    
    return {
        'density': rho,
        'pressure': p,
        'temperature': T,
        'speed_of_sound': a
    }


# =============================================================================
# AERODYNAMICS EQUATIONS
# =============================================================================

def dynamic_pressure(velocity: float, altitude: float) -> EquationResult:
    """
    Dynamic Pressure: q = 0.5 * rho * V²
    
    The dynamic pressure represents the kinetic energy per unit volume
    of the airflow. It is fundamental to all aerodynamic force calculations.
    """
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    q = 0.5 * rho * velocity**2
    
    return EquationResult(
        name="Dynamic Pressure",
        formula="q = ½·ρ·V²",
        variables={
            'ρ (rho)': {'value': rho, 'unit': 'kg/m³', 'desc': 'Air density at altitude'},
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'},
            'h': {'value': altitude, 'unit': 'm', 'desc': 'Altitude'}
        },
        steps=[
            f"Step 1: Calculate air density at h={altitude:.0f} m",
            f"  ρ = ρ₀·(T/T₀)^(g/(R·L)) = {rho:.4f} kg/m³",
            f"Step 2: Substitute into q = ½·ρ·V²",
            f"  q = ½ × {rho:.4f} × ({velocity:.1f})²",
            f"  q = ½ × {rho:.4f} × {velocity**2:.1f}",
            f"Step 3: Final calculation",
            f"  q = {q:.1f} Pa"
        ],
        answer=q,
        unit="Pa (Pascal)",
        interpretation=f"Dynamic pressure of {q:.1f} Pa indicates the airflow energy available for lift generation. Higher q means more lift per unit CL."
    )


def lift_force(velocity: float, altitude: float, wing_area: float, cl: float) -> EquationResult:
    """
    Lift: L = 0.5 * rho * V² * S * CL
    
    Lift is the aerodynamic force perpendicular to the flight path.
    In steady level flight, Lift = Weight.
    """
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    q = 0.5 * rho * velocity**2
    lift = q * wing_area * cl
    
    return EquationResult(
        name="Lift Force",
        formula="L = ½·ρ·V²·S·C_L",
        variables={
            'ρ (rho)': {'value': rho, 'unit': 'kg/m³', 'desc': 'Air density'},
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'},
            'S': {'value': wing_area, 'unit': 'm²', 'desc': 'Wing reference area'},
            'C_L': {'value': cl, 'unit': '-', 'desc': 'Lift coefficient'}
        },
        steps=[
            f"Step 1: Calculate dynamic pressure q = ½·ρ·V²",
            f"  q = ½ × {rho:.4f} × ({velocity:.1f})² = {q:.1f} Pa",
            f"Step 2: Substitute into L = q·S·C_L",
            f"  L = {q:.1f} × {wing_area:.1f} × {cl:.3f}",
            f"Step 3: Final calculation",
            f"  L = {lift:.1f} N"
        ],
        answer=lift,
        unit="N (Newton)",
        interpretation=f"Lift of {lift/1000:.1f} kN. For steady flight, this must equal aircraft weight. L/W ratio: {lift/(1500*GRAVITY):.3f}"
    )


def drag_force(velocity: float, altitude: float, wing_area: float, cl: float,
               cd0: float, aspect_ratio: float, oswald: float) -> EquationResult:
    """
    Drag: D = 0.5 * rho * V² * S * CD
    where CD = CD0 + CL²/(π·A·e)
    
    Total drag includes parasitic (CD0) and induced components.
    """
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    q = 0.5 * rho * velocity**2
    
    # Induced drag coefficient
    cd_induced = cl**2 / (np.pi * aspect_ratio * oswald)
    cd_total = cd0 + cd_induced
    drag = q * wing_area * cd_total
    
    return EquationResult(
        name="Drag Force",
        formula="D = ½·ρ·V²·S·C_D,  C_D = C_D0 + C_L²/(π·A·e)",
        variables={
            'ρ (rho)': {'value': rho, 'unit': 'kg/m³', 'desc': 'Air density'},
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'},
            'S': {'value': wing_area, 'unit': 'm²', 'desc': 'Wing area'},
            'C_D0': {'value': cd0, 'unit': '-', 'desc': 'Zero-lift drag coefficient'},
            'C_L': {'value': cl, 'unit': '-', 'desc': 'Lift coefficient'},
            'A': {'value': aspect_ratio, 'unit': '-', 'desc': 'Aspect ratio'},
            'e': {'value': oswald, 'unit': '-', 'desc': 'Oswald efficiency factor'}
        },
        steps=[
            f"Step 1: Calculate induced drag coefficient",
            f"  C_Di = C_L²/(π·A·e) = {cl:.3f}²/(π × {aspect_ratio:.1f} × {oswald:.2f})",
            f"  C_Di = {cd_induced:.4f}",
            f"Step 2: Total drag coefficient",
            f"  C_D = {cd0:.3f} + {cd_induced:.4f} = {cd_total:.4f}",
            f"Step 3: Calculate dynamic pressure",
            f"  q = ½ × {rho:.4f} × ({velocity:.1f})² = {q:.1f} Pa",
            f"Step 4: Calculate drag",
            f"  D = {q:.1f} × {wing_area:.1f} × {cd_total:.4f} = {drag:.1f} N"
        ],
        answer=drag,
        unit="N (Newton)",
        interpretation=f"Total drag of {drag:.1f} N. In steady flight, thrust must equal drag. L/D ratio: {lift_force(velocity, altitude, wing_area, cl).answer/drag:.2f}"
    )


def weight_force(mass: float) -> EquationResult:
    """Weight: W = m·g"""
    weight = mass * GRAVITY
    
    return EquationResult(
        name="Weight Force",
        formula="W = m·g",
        variables={
            'm': {'value': mass, 'unit': 'kg', 'desc': 'Aircraft mass'},
            'g': {'value': GRAVITY, 'unit': 'm/s²', 'desc': 'Gravitational acceleration'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  W = {mass:.1f} × {GRAVITY}",
            f"Step 2: Calculate",
            f"  W = {weight:.1f} N"
        ],
        answer=weight,
        unit="N (Newton)",
        interpretation=f"Aircraft weight of {weight/1000:.1f} kN. This must be balanced by lift in steady flight."
    )


def required_thrust(drag: float) -> EquationResult:
    """Thrust: T = D (steady level flight)"""
    return EquationResult(
        name="Required Thrust",
        formula="T = D",
        variables={
            'D': {'value': drag, 'unit': 'N', 'desc': 'Total drag force'}
        },
        steps=[
            f"Step 1: In steady level flight, thrust equals drag",
            f"  T = {drag:.1f} N"
        ],
        answer=drag,
        unit="N (Newton)",
        interpretation=f"Required thrust of {drag:.1f} N to maintain steady level flight. The propulsion system must provide at least this thrust."
    )


def required_power(thrust: float, velocity: float) -> EquationResult:
    """Required Power: P = T·V"""
    power = thrust * velocity / 1000.0  # kW
    
    return EquationResult(
        name="Required Power",
        formula="P = T·V",
        variables={
            'T': {'value': thrust, 'unit': 'N', 'desc': 'Thrust force'},
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  P = {thrust:.1f} × {velocity:.1f}",
            f"Step 2: Convert to kW",
            f"  P = {thrust*velocity:.1f} W = {power:.1f} kW"
        ],
        answer=power,
        unit="kW (Kilowatt)",
        interpretation=f"Required power of {power:.1f} kW. The hybrid propulsion system must deliver this power to the propeller."
    )


def stall_speed(mass: float, altitude: float, wing_area: float, cl_max: float) -> EquationResult:
    """Stall Speed: V_stall = sqrt(2·W/(ρ·S·C_Lmax))"""
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    weight = mass * GRAVITY
    v_stall = np.sqrt(2 * weight / (rho * wing_area * cl_max))
    
    return EquationResult(
        name="Stall Speed",
        formula="V_stall = √(2·W/(ρ·S·C_Lmax))",
        variables={
            'W': {'value': weight, 'unit': 'N', 'desc': 'Aircraft weight'},
            'ρ (rho)': {'value': rho, 'unit': 'kg/m³', 'desc': 'Air density'},
            'S': {'value': wing_area, 'unit': 'm²', 'desc': 'Wing area'},
            'C_Lmax': {'value': cl_max, 'unit': '-', 'desc': 'Maximum lift coefficient'}
        },
        steps=[
            f"Step 1: Calculate weight",
            f"  W = {mass:.1f} × {GRAVITY} = {weight:.1f} N",
            f"Step 2: Substitute into stall speed formula",
            f"  V_stall = √(2 × {weight:.1f} / ({rho:.4f} × {wing_area:.1f} × {cl_max:.1f}))",
            f"  V_stall = √({2*weight:.1f} / {rho*wing_area*cl_max:.2f})",
            f"Step 3: Calculate",
            f"  V_stall = {v_stall:.1f} m/s"
        ],
        answer=v_stall,
        unit="m/s",
        interpretation=f"Stall speed of {v_stall:.1f} m/s ({v_stall*3.6:.1f} km/h). Aircraft must maintain speed above this to avoid stall."
    )


def mach_number(velocity: float, altitude: float) -> EquationResult:
    """Mach Number: M = V/a"""
    atm = standard_atmosphere(altitude)
    a = atm['speed_of_sound']
    mach = velocity / a
    
    return EquationResult(
        name="Mach Number",
        formula="M = V/a",
        variables={
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'},
            'a': {'value': a, 'unit': 'm/s', 'desc': 'Speed of sound at altitude'}
        },
        steps=[
            f"Step 1: Calculate speed of sound",
            f"  a = √(γ·R·T) = √(1.4 × 287.05 × {atm['temperature']:.1f}) = {a:.1f} m/s",
            f"Step 2: Calculate Mach number",
            f"  M = {velocity:.1f} / {a:.1f} = {mach:.3f}"
        ],
        answer=mach,
        unit="- (dimensionless)",
        interpretation=f"Mach number of {mach:.3f}. Aircraft operates in the subsonic regime (M < 0.8), which is efficient for this UAV class."
    )


def reynolds_number(velocity: float, altitude: float, chord: float) -> EquationResult:
    """Reynolds Number: Re = ρ·V·c/μ"""
    atm = standard_atmosphere(altitude)
    rho = atm['density']
    re = rho * velocity * chord / MU_SEA_LEVEL
    
    return EquationResult(
        name="Reynolds Number",
        formula="Re = ρ·V·c/μ",
        variables={
            'ρ (rho)': {'value': rho, 'unit': 'kg/m³', 'desc': 'Air density'},
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'True airspeed'},
            'c': {'value': chord, 'unit': 'm', 'desc': 'Mean aerodynamic chord'},
            'μ (mu)': {'value': MU_SEA_LEVEL, 'unit': 'Pa·s', 'desc': 'Dynamic viscosity'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  Re = {rho:.4f} × {velocity:.1f} × {chord:.2f} / {MU_SEA_LEVEL:.2e}",
            f"Step 2: Calculate",
            f"  Re = {re:.2e}"
        ],
        answer=re,
        unit="- (dimensionless)",
        interpretation=f"Reynolds number of {re:.2e}. This indicates turbulent flow regime, which affects boundary layer behavior and drag characteristics."
    )


def lift_to_drag_ratio(lift: float, drag: float) -> EquationResult:
    """Lift-to-Drag Ratio: L/D"""
    ld = lift / drag if drag > 0 else 0
    
    return EquationResult(
        name="Lift-to-Drag Ratio",
        formula="L/D",
        variables={
            'L': {'value': lift, 'unit': 'N', 'desc': 'Lift force'},
            'D': {'value': drag, 'unit': 'N', 'desc': 'Drag force'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  L/D = {lift:.1f} / {drag:.1f}",
            f"Step 2: Calculate",
            f"  L/D = {ld:.2f}"
        ],
        answer=ld,
        unit="- (dimensionless)",
        interpretation=f"L/D ratio of {ld:.2f}. Higher L/D means better aerodynamic efficiency. This directly impacts range and endurance."
    )


def power_loading(power_kw: float, mass: float) -> EquationResult:
    """Power Loading: P/W"""
    pl = power_kw / mass
    
    return EquationResult(
        name="Power Loading",
        formula="P/W",
        variables={
            'P': {'value': power_kw, 'unit': 'kW', 'desc': 'Power'},
            'W': {'value': mass, 'unit': 'kg', 'desc': 'Aircraft mass'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  P/W = {power_kw:.1f} / {mass:.1f}",
            f"Step 2: Calculate",
            f"  P/W = {pl:.3f} kW/kg"
        ],
        answer=pl,
        unit="kW/kg",
        interpretation=f"Power loading of {pl:.3f} kW/kg. This determines climb rate and acceleration capability."
    )


def wing_loading(mass: float, wing_area: float) -> EquationResult:
    """Wing Loading: W/S"""
    weight = mass * GRAVITY
    wl = weight / wing_area
    
    return EquationResult(
        name="Wing Loading",
        formula="W/S",
        variables={
            'W': {'value': weight, 'unit': 'N', 'desc': 'Aircraft weight'},
            'S': {'value': wing_area, 'unit': 'm²', 'desc': 'Wing area'}
        },
        steps=[
            f"Step 1: Calculate weight",
            f"  W = {mass:.1f} × {GRAVITY} = {weight:.1f} N",
            f"Step 2: Calculate wing loading",
            f"  W/S = {weight:.1f} / {wing_area:.1f} = {wl:.1f} N/m²"
        ],
        answer=wl,
        unit="N/m²",
        interpretation=f"Wing loading of {wl:.1f} N/m². Lower wing loading gives better maneuverability and lower stall speed."
    )


# =============================================================================
# PROPULSION EQUATIONS
# =============================================================================

def angular_velocity(rpm: float) -> EquationResult:
    """Angular Velocity: ω = 2π·RPM/60"""
    omega = 2 * np.pi * rpm / 60.0
    
    return EquationResult(
        name="Angular Velocity",
        formula="ω = 2π·RPM/60",
        variables={
            'RPM': {'value': rpm, 'unit': 'rev/min', 'desc': 'Rotational speed'}
        },
        steps=[
            f"Step 1: Substitute RPM = {rpm:.0f}",
            f"  ω = 2π × {rpm:.0f} / 60",
            f"Step 2: Calculate",
            f"  ω = {omega:.1f} rad/s"
        ],
        answer=omega,
        unit="rad/s",
        interpretation=f"Angular velocity of {omega:.1f} rad/s. This determines the mechanical power output for a given torque."
    )


def mechanical_power(torque: float, omega: float) -> EquationResult:
    """Mechanical Power: P = T·ω"""
    power = torque * omega / 1000.0  # kW
    
    return EquationResult(
        name="Mechanical Power",
        formula="P = T·ω",
        variables={
            'T': {'value': torque, 'unit': 'N·m', 'desc': 'Torque'},
            'ω (omega)': {'value': omega, 'unit': 'rad/s', 'desc': 'Angular velocity'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  P = {torque:.1f} × {omega:.1f}",
            f"Step 2: Convert to kW",
            f"  P = {torque*omega:.1f} W = {power:.1f} kW"
        ],
        answer=power,
        unit="kW (Kilowatt)",
        interpretation=f"Mechanical power of {power:.1f} kW delivered by the motor shaft."
    )


def generator_output(power_in: float, efficiency: float) -> EquationResult:
    """Generator Output: P_out = P_in × η_generator"""
    p_out = power_in * efficiency
    
    return EquationResult(
        name="Generator Output",
        formula="P_out = P_in × η_gen",
        variables={
            'P_in': {'value': power_in, 'unit': 'kW', 'desc': 'Input mechanical power'},
            'η_gen': {'value': efficiency, 'unit': '-', 'desc': 'Generator efficiency'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  P_out = {power_in:.1f} × {efficiency:.2f}",
            f"Step 2: Calculate",
            f"  P_out = {p_out:.1f} kW"
        ],
        answer=p_out,
        unit="kW (Kilowatt)",
        interpretation=f"Generator produces {p_out:.1f} kW of electrical power from {power_in:.1f} kW mechanical input."
    )


def motor_efficiency(mech_power: float, elec_power: float) -> EquationResult:
    """Motor Efficiency: η = P_mech/P_elec"""
    eta = mech_power / elec_power if elec_power > 0 else 0
    
    return EquationResult(
        name="Motor Efficiency",
        formula="η_motor = P_mech/P_elec",
        variables={
            'P_mech': {'value': mech_power, 'unit': 'kW', 'desc': 'Mechanical output power'},
            'P_elec': {'value': elec_power, 'unit': 'kW', 'desc': 'Electrical input power'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  η = {mech_power:.1f} / {elec_power:.1f}",
            f"Step 2: Calculate",
            f"  η = {eta:.3f} = {eta*100:.1f}%"
        ],
        answer=eta,
        unit="- (dimensionless)",
        interpretation=f"Motor efficiency of {eta*100:.1f}%. This represents the conversion efficiency from electrical to mechanical power."
    )


def overall_hybrid_efficiency(eta_engine, eta_gen, eta_battery, eta_motor, eta_prop) -> EquationResult:
    """Overall Hybrid Efficiency: η = η_engine × η_gen × η_battery × η_motor × η_prop"""
    eta_total = eta_engine * eta_gen * eta_battery * eta_motor * eta_prop
    
    return EquationResult(
        name="Overall Hybrid Efficiency",
        formula="η_total = η_eng × η_gen × η_batt × η_motor × η_prop",
        variables={
            'η_eng': {'value': eta_engine, 'unit': '-', 'desc': 'Engine efficiency'},
            'η_gen': {'value': eta_gen, 'unit': '-', 'desc': 'Generator efficiency'},
            'η_batt': {'value': eta_battery, 'unit': '-', 'desc': 'Battery efficiency'},
            'η_motor': {'value': eta_motor, 'unit': '-', 'desc': 'Motor efficiency'},
            'η_prop': {'value': eta_prop, 'unit': '-', 'desc': 'Propeller efficiency'}
        },
        steps=[
            f"Step 1: Substitute all efficiencies",
            f"  η = {eta_engine:.2f} × {eta_gen:.2f} × {eta_battery:.2f} × {eta_motor:.2f} × {eta_prop:.2f}",
            f"Step 2: Calculate",
            f"  η = {eta_total:.4f} = {eta_total*100:.1f}%"
        ],
        answer=eta_total,
        unit="- (dimensionless)",
        interpretation=f"Overall hybrid propulsion efficiency of {eta_total*100:.1f}%. This represents the end-to-end efficiency from fuel to thrust."
    )


# =============================================================================
# BATTERY EQUATIONS
# =============================================================================

def battery_power(voltage: float, current: float) -> EquationResult:
    """Battery Power: P = V·I"""
    power = voltage * current / 1000.0  # kW
    
    return EquationResult(
        name="Battery Power",
        formula="P = V·I",
        variables={
            'V': {'value': voltage, 'unit': 'V', 'desc': 'Battery voltage'},
            'I': {'value': current, 'unit': 'A', 'desc': 'Battery current'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  P = {voltage:.1f} × {current:.1f}",
            f"Step 2: Convert to kW",
            f"  P = {voltage*current:.1f} W = {power:.1f} kW"
        ],
        answer=power,
        unit="kW (Kilowatt)",
        interpretation=f"Battery delivering {power:.1f} kW of electrical power."
    )


def battery_energy(voltage: float, capacity_ah: float) -> EquationResult:
    """Battery Energy: E = V·Ah"""
    energy = voltage * capacity_ah / 1000.0  # kWh
    
    return EquationResult(
        name="Battery Energy",
        formula="E = V·Ah",
        variables={
            'V': {'value': voltage, 'unit': 'V', 'desc': 'Battery voltage'},
            'Ah': {'value': capacity_ah, 'unit': 'Ah', 'desc': 'Battery capacity in amp-hours'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  E = {voltage:.1f} × {capacity_ah:.1f}",
            f"Step 2: Convert to kWh",
            f"  E = {voltage*capacity_ah:.1f} Wh = {energy:.1f} kWh"
        ],
        answer=energy,
        unit="kWh (Kilowatt-hour)",
        interpretation=f"Battery stores {energy:.1f} kWh of electrical energy."
    )


def soc_update(soc_old: float, current: float, dt: float, capacity_ah: float) -> EquationResult:
    """SOC Update: SOC_new = SOC_old - (I·Δt)/Capacity"""
    soc_new = soc_old - (current * dt) / (capacity_ah * 3600)
    soc_new = np.clip(soc_new, 0, 1)
    
    return EquationResult(
        name="State of Charge Update",
        formula="SOC_new = SOC_old - (I·Δt)/Capacity",
        variables={
            'SOC_old': {'value': soc_old, 'unit': '-', 'desc': 'Previous state of charge'},
            'I': {'value': current, 'unit': 'A', 'desc': 'Battery current'},
            'Δt': {'value': dt, 'unit': 's', 'desc': 'Time step'},
            'Capacity': {'value': capacity_ah, 'unit': 'Ah', 'desc': 'Battery capacity'}
        },
        steps=[
            f"Step 1: Calculate charge removed",
            f"  ΔSOC = ({current:.1f} × {dt:.0f}) / ({capacity_ah:.1f} × 3600)",
            f"  ΔSOC = {current*dt:.1f} / {capacity_ah*3600:.0f} = {(current*dt)/(capacity_ah*3600):.4f}",
            f"Step 2: Update SOC",
            f"  SOC_new = {soc_old:.3f} - {(current*dt)/(capacity_ah*3600):.4f}",
            f"  SOC_new = {soc_new:.3f} = {soc_new*100:.1f}%"
        ],
        answer=soc_new,
        unit="- (dimensionless)",
        interpretation=f"Battery SOC updated to {soc_new*100:.1f}%. This tracks the energy depletion rate during discharge."
    )


def remaining_energy(capacity_kwh: float, soc: float) -> EquationResult:
    """Remaining Energy: E_remaining = Capacity × SOC"""
    energy = capacity_kwh * soc
    
    return EquationResult(
        name="Remaining Energy",
        formula="E_rem = Capacity × SOC",
        variables={
            'Capacity': {'value': capacity_kwh, 'unit': 'kWh', 'desc': 'Battery capacity'},
            'SOC': {'value': soc, 'unit': '-', 'desc': 'State of charge'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  E_rem = {capacity_kwh:.1f} × {soc:.3f}",
            f"Step 2: Calculate",
            f"  E_rem = {energy:.1f} kWh"
        ],
        answer=energy,
        unit="kWh (Kilowatt-hour)",
        interpretation=f"Battery has {energy:.1f} kWh of usable energy remaining."
    )


def remaining_flight_time(energy_kwh: float, power_kw: float) -> EquationResult:
    """Remaining Flight Time: t = E/P"""
    time_hours = energy_kwh / power_kw if power_kw > 0 else 0
    
    return EquationResult(
        name="Remaining Flight Time",
        formula="t = E/P",
        variables={
            'E': {'value': energy_kwh, 'unit': 'kWh', 'desc': 'Remaining energy'},
            'P': {'value': power_kw, 'unit': 'kW', 'desc': 'Power consumption'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  t = {energy_kwh:.1f} / {power_kw:.1f}",
            f"Step 2: Calculate",
            f"  t = {time_hours:.2f} hours = {time_hours*60:.1f} minutes"
        ],
        answer=time_hours,
        unit="hours",
        interpretation=f"Battery can sustain current power draw for {time_hours*60:.1f} minutes."
    )


# =============================================================================
# FUEL SYSTEM EQUATIONS
# =============================================================================

def fuel_energy(mass_kg: float, lhv_mj_kg: float) -> EquationResult:
    """Fuel Energy: E = m × LHV"""
    energy_mj = mass_kg * lhv_mj_kg
    energy_kwh = energy_mj / 3.6
    
    return EquationResult(
        name="Fuel Energy",
        formula="E = m × LHV",
        variables={
            'm': {'value': mass_kg, 'unit': 'kg', 'desc': 'Fuel mass'},
            'LHV': {'value': lhv_mj_kg, 'unit': 'MJ/kg', 'desc': 'Lower heating value'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  E = {mass_kg:.1f} × {lhv_mj_kg:.1f}",
            f"  E = {energy_mj:.1f} MJ",
            f"Step 2: Convert to kWh",
            f"  E = {energy_mj:.1f} / 3.6 = {energy_kwh:.1f} kWh"
        ],
        answer=energy_kwh,
        unit="kWh (Kilowatt-hour)",
        interpretation=f"Fuel contains {energy_kwh:.1f} kWh of chemical energy available for propulsion."
    )


def engine_fuel_burn(power_kw: float, efficiency: float, lhv_mj_kg: float) -> EquationResult:
    """Engine Fuel Burn: m_dot = P/(η·LHV)"""
    m_dot = (power_kw * 1000) / (efficiency * lhv_mj_kg * 1e6)  # kg/s
    
    return EquationResult(
        name="Engine Fuel Burn Rate",
        formula="ṁ = P/(η·LHV)",
        variables={
            'P': {'value': power_kw, 'unit': 'kW', 'desc': 'Engine power'},
            'η': {'value': efficiency, 'unit': '-', 'desc': 'Engine efficiency'},
            'LHV': {'value': lhv_mj_kg, 'unit': 'MJ/kg', 'desc': 'Fuel lower heating value'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  ṁ = ({power_kw:.1f} × 1000) / ({efficiency:.2f} × {lhv_mj_kg:.1f} × 10⁶)",
            f"  ṁ = {power_kw*1000:.0f} / {efficiency*lhv_mj_kg*1e6:.2e}",
            f"Step 2: Calculate",
            f"  ṁ = {m_dot*1000:.2f} g/s = {m_dot*3600:.2f} kg/hr"
        ],
        answer=m_dot,
        unit="kg/s",
        interpretation=f"Engine consumes {m_dot*1000:.1f} g/s of Jet-A fuel at current power setting."
    )


def fuel_flow_rate(mass_kg: float, time_s: float) -> EquationResult:
    """Fuel Flow: ṁ = m/t"""
    flow = mass_kg / time_s if time_s > 0 else 0
    
    return EquationResult(
        name="Fuel Flow Rate",
        formula="ṁ = m/t",
        variables={
            'm': {'value': mass_kg, 'unit': 'kg', 'desc': 'Fuel mass'},
            't': {'value': time_s, 'unit': 's', 'desc': 'Time period'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  ṁ = {mass_kg:.3f} / {time_s:.0f}",
            f"Step 2: Calculate",
            f"  ṁ = {flow*1000:.2f} g/s = {flow*3600:.2f} kg/hr"
        ],
        answer=flow,
        unit="kg/s",
        interpretation=f"Fuel flow rate of {flow*3600:.2f} kg/hr. This determines the fuel consumption over the mission."
    )


def hydrogen_consumption(power_kw: float, fc_efficiency: float, lhv_mj_kg: float) -> EquationResult:
    """Hydrogen Consumption: m_dot = P/(η_FC·LHV)"""
    m_dot = (power_kw * 1000) / (fc_efficiency * lhv_mj_kg * 1e6)  # kg/s
    
    return EquationResult(
        name="Hydrogen Consumption",
        formula="ṁ_H2 = P/(η_FC·LHV_H2)",
        variables={
            'P': {'value': power_kw, 'unit': 'kW', 'desc': 'Fuel cell power'},
            'η_FC': {'value': fc_efficiency, 'unit': '-', 'desc': 'Fuel cell efficiency'},
            'LHV_H2': {'value': lhv_mj_kg, 'unit': 'MJ/kg', 'desc': 'Hydrogen LHV'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  ṁ = ({power_kw:.1f} × 1000) / ({fc_efficiency:.2f} × {lhv_mj_kg:.1f} × 10⁶)",
            f"Step 2: Calculate",
            f"  ṁ = {m_dot*1000:.2f} g/s = {m_dot*3600:.2f} kg/hr"
        ],
        answer=m_dot,
        unit="kg/s",
        interpretation=f"Fuel cell consumes {m_dot*1000:.1f} g/s of hydrogen at current power output."
    )


def fuel_remaining(initial: float, used: float) -> EquationResult:
    """Fuel Remaining: m_rem = m_initial - m_used"""
    remaining = max(0, initial - used)
    
    return EquationResult(
        name="Fuel Remaining",
        formula="m_rem = m_initial - m_used",
        variables={
            'm_initial': {'value': initial, 'unit': 'kg', 'desc': 'Initial fuel mass'},
            'm_used': {'value': used, 'unit': 'kg', 'desc': 'Fuel consumed'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  m_rem = {initial:.1f} - {used:.1f}",
            f"Step 2: Calculate",
            f"  m_rem = {remaining:.1f} kg"
        ],
        answer=remaining,
        unit="kg",
        interpretation=f"{remaining:.1f} kg of fuel remaining. This determines the remaining range and endurance."
    )


# =============================================================================
# ENDURANCE EQUATIONS
# =============================================================================

def battery_endurance(energy_kwh: float, power_kw: float) -> EquationResult:
    """Battery Endurance: t = E/P"""
    endurance = energy_kwh / power_kw if power_kw > 0 else 0
    
    return EquationResult(
        name="Battery Endurance",
        formula="t_batt = E_batt/P_batt",
        variables={
            'E_batt': {'value': energy_kwh, 'unit': 'kWh', 'desc': 'Battery energy'},
            'P_batt': {'value': power_kw, 'unit': 'kW', 'desc': 'Battery power draw'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  t = {energy_kwh:.1f} / {power_kw:.1f}",
            f"Step 2: Calculate",
            f"  t = {endurance:.2f} hours = {endurance*60:.1f} minutes"
        ],
        answer=endurance,
        unit="hours",
        interpretation=f"Battery provides {endurance*60:.1f} minutes of endurance at current power draw."
    )


def fuel_endurance(energy_kwh: float, power_kw: float) -> EquationResult:
    """Fuel Endurance: t = E_fuel/P_engine"""
    endurance = energy_kwh / power_kw if power_kw > 0 else 0
    
    return EquationResult(
        name="Fuel Endurance",
        formula="t_fuel = E_fuel/P_engine",
        variables={
            'E_fuel': {'value': energy_kwh, 'unit': 'kWh', 'desc': 'Fuel energy'},
            'P_engine': {'value': power_kw, 'unit': 'kW', 'desc': 'Engine power'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  t = {energy_kwh:.1f} / {power_kw:.1f}",
            f"Step 2: Calculate",
            f"  t = {endurance:.2f} hours = {endurance*60:.1f} minutes"
        ],
        answer=endurance,
        unit="hours",
        interpretation=f"Jet-A fuel provides {endurance*60:.1f} minutes of endurance at current engine power."
    )


def fuel_cell_endurance(energy_kwh: float, power_kw: float) -> EquationResult:
    """Fuel Cell Endurance: t = E_H2/P_FC"""
    endurance = energy_kwh / power_kw if power_kw > 0 else 0
    
    return EquationResult(
        name="Fuel Cell Endurance",
        formula="t_FC = E_H2/P_FC",
        variables={
            'E_H2': {'value': energy_kwh, 'unit': 'kWh', 'desc': 'Hydrogen energy'},
            'P_FC': {'value': power_kw, 'unit': 'kW', 'desc': 'Fuel cell power'}
        },
        steps=[
            f"Step 1: Substitute values",
            f"  t = {energy_kwh:.1f} / {power_kw:.1f}",
            f"Step 2: Calculate",
            f"  t = {endurance:.2f} hours = {endurance*60:.1f} minutes"
        ],
        answer=endurance,
        unit="hours",
        interpretation=f"Hydrogen provides {endurance*60:.1f} minutes of endurance at current fuel cell power."
    )


def total_endurance(batt_t: float, fuel_t: float, fc_t: float) -> EquationResult:
    """Total Endurance: t_total = t_batt + t_fuel + t_FC"""
    total = batt_t + fuel_t + fc_t
    
    return EquationResult(
        name="Total Endurance",
        formula="t_total = t_batt + t_fuel + t_FC",
        variables={
            't_batt': {'value': batt_t, 'unit': 'h', 'desc': 'Battery endurance'},
            't_fuel': {'value': fuel_t, 'unit': 'h', 'desc': 'Fuel endurance'},
            't_FC': {'value': fc_t, 'unit': 'h', 'desc': 'Fuel cell endurance'}
        },
        steps=[
            f"Step 1: Sum all endurance contributions",
            f"  t = {batt_t:.2f} + {fuel_t:.2f} + {fc_t:.2f}",
            f"Step 2: Calculate",
            f"  t = {total:.2f} hours = {total*60:.1f} minutes"
        ],
        answer=total,
        unit="hours",
        interpretation=f"Total hybrid endurance of {total*60:.1f} minutes. This is the key advantage of the multi-source hybrid architecture."
    )


def remaining_range(velocity: float, endurance_hours: float) -> EquationResult:
    """Remaining Range: R = V × t"""
    range_km = velocity * endurance_hours * 3.6
    
    return EquationResult(
        name="Remaining Range",
        formula="R = V × t",
        variables={
            'V': {'value': velocity, 'unit': 'm/s', 'desc': 'Cruise speed'},
            't': {'value': endurance_hours, 'unit': 'h', 'desc': 'Remaining endurance'}
        },
        steps=[
            f"Step 1: Convert speed to km/h",
            f"  V = {velocity:.1f} × 3.6 = {velocity*3.6:.1f} km/h",
            f"Step 2: Calculate range",
            f"  R = {velocity*3.6:.1f} × {endurance_hours:.2f}",
            f"  R = {range_km:.1f} km"
        ],
        answer=range_km,
        unit="km",
        interpretation=f"Aircraft can fly {range_km:.1f} km with remaining energy at current speed."
    )


# =============================================================================
# ALL EQUATIONS REGISTRY
# =============================================================================

def get_all_equations() -> Dict[str, Dict[str, Any]]:
    """
    Returns a registry of all available equations for the inspector page.
    Each equation is a callable that takes current state and returns EquationResult.
    """
    return {
        'Dynamic Pressure': {
            'function': dynamic_pressure,
            'description': 'Kinetic energy per unit volume of airflow',
            'category': 'Aerodynamics'
        },
        'Lift Force': {
            'function': lift_force,
            'description': 'Aerodynamic force perpendicular to flight path',
            'category': 'Aerodynamics'
        },
        'Drag Force': {
            'function': drag_force,
            'description': 'Aerodynamic resistance along flight path',
            'category': 'Aerodynamics'
        },
        'Weight Force': {
            'function': weight_force,
            'description': 'Gravitational force on aircraft',
            'category': 'Aerodynamics'
        },
        'Required Thrust': {
            'function': required_thrust,
            'description': 'Thrust needed for steady level flight',
            'category': 'Aerodynamics'
        },
        'Required Power': {
            'function': required_power,
            'description': 'Power needed to overcome drag',
            'category': 'Aerodynamics'
        },
        'Stall Speed': {
            'function': stall_speed,
            'description': 'Minimum speed to maintain lift',
            'category': 'Aerodynamics'
        },
        'Mach Number': {
            'function': mach_number,
            'description': 'Ratio of aircraft speed to speed of sound',
            'category': 'Aerodynamics'
        },
        'Reynolds Number': {
            'function': reynolds_number,
            'description': 'Ratio of inertial to viscous forces',
            'category': 'Aerodynamics'
        },
        'Lift-to-Drag Ratio': {
            'function': lift_to_drag_ratio,
            'description': 'Aerodynamic efficiency metric',
            'category': 'Aerodynamics'
        },
        'Power Loading': {
            'function': power_loading,
            'description': 'Power per unit mass',
            'category': 'Aerodynamics'
        },
        'Wing Loading': {
            'function': wing_loading,
            'description': 'Weight per unit wing area',
            'category': 'Aerodynamics'
        },
        'Angular Velocity': {
            'function': angular_velocity,
            'description': 'Rotational speed in radians per second',
            'category': 'Propulsion'
        },
        'Mechanical Power': {
            'function': mechanical_power,
            'description': 'Power from torque and angular velocity',
            'category': 'Propulsion'
        },
        'Generator Output': {
            'function': generator_output,
            'description': 'Electrical power from mechanical input',
            'category': 'Propulsion'
        },
        'Motor Efficiency': {
            'function': motor_efficiency,
            'description': 'Electrical to mechanical conversion efficiency',
            'category': 'Propulsion'
        },
        'Overall Hybrid Efficiency': {
            'function': overall_hybrid_efficiency,
            'description': 'End-to-end propulsion chain efficiency',
            'category': 'Propulsion'
        },
        'Battery Power': {
            'function': battery_power,
            'description': 'Electrical power from voltage and current',
            'category': 'Battery'
        },
        'Battery Energy': {
            'function': battery_energy,
            'description': 'Stored energy in battery',
            'category': 'Battery'
        },
        'SOC Update': {
            'function': soc_update,
            'description': 'State of charge evolution',
            'category': 'Battery'
        },
        'Remaining Energy': {
            'function': remaining_energy,
            'description': 'Usable energy remaining in battery',
            'category': 'Battery'
        },
        'Remaining Flight Time': {
            'function': remaining_flight_time,
            'description': 'Time battery can sustain current load',
            'category': 'Battery'
        },
        'Fuel Energy': {
            'function': fuel_energy,
            'description': 'Chemical energy in fuel',
            'category': 'Fuel'
        },
        'Engine Fuel Burn': {
            'function': engine_fuel_burn,
            'description': 'Fuel consumption rate of engine',
            'category': 'Fuel'
        },
        'Fuel Flow Rate': {
            'function': fuel_flow_rate,
            'description': 'Mass flow rate of fuel',
            'category': 'Fuel'
        },
        'Hydrogen Consumption': {
            'function': hydrogen_consumption,
            'description': 'Hydrogen usage by fuel cell',
            'category': 'Fuel'
        },
        'Fuel Remaining': {
            'function': fuel_remaining,
            'description': 'Fuel left after consumption',
            'category': 'Fuel'
        },
        'Battery Endurance': {
            'function': battery_endurance,
            'description': 'Endurance from battery alone',
            'category': 'Endurance'
        },
        'Fuel Endurance': {
            'function': fuel_endurance,
            'description': 'Endurance from Jet-A fuel',
            'category': 'Endurance'
        },
        'Fuel Cell Endurance': {
            'function': fuel_cell_endurance,
            'description': 'Endurance from hydrogen',
            'category': 'Endurance'
        },
        'Total Endurance': {
            'function': total_endurance,
            'description': 'Combined hybrid endurance',
            'category': 'Endurance'
        },
        'Remaining Range': {
            'function': remaining_range,
            'description': 'Distance aircraft can still fly',
            'category': 'Endurance'
        }
    }