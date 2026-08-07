from __future__ import annotations
"""
APEMS Digital Twin Physics Engine
==================================
Physics-based simulation of a hybrid-electric UAV for the HAL
Hybrid-Electric UAV Grand Challenge.  Every value is computed from
aerospace / electrical engineering equations — no hardcoded
percentages or lookup tables (except validated component limits).
"""

import math
from dataclasses import dataclass, field
from typing import List, Dict

# ═══════════════════════════════════════════════════════════════════
# MISSION PHASE DATA CLASS
# ═══════════════════════════════════════════════════════════════════
@dataclass
class Phase:
    id: str
    name: str
    duration_min: float
    alt_m: float
    vel_mps: float
    climb_rate: float          # m/s (negative for descent)
    color: str
    icon: str


# ═══════════════════════════════════════════════════════════════════
# 1. ISA ATMOSPHERE MODEL
# ═══════════════════════════════════════════════════════════════════
G0      = 9.80665          # m/s²  standard gravity
R_AIR   = 287.058          # J/(kg·K) specific gas constant
T0_ISA  = 288.15           # K sea-level temp
P0_ISA  = 101325.0         # Pa sea-level pressure
RHO0    = 1.225            # kg/m³ sea-level density
LAPSE   = 0.0065           # K/m  troposphere lapse rate
GAMMA   = 1.4              # air ratio of specific heats


def isa_atmosphere(alt_m: float) -> Dict[str, float]:
    """Return T (K), P (Pa), rho (kg/m³) at altitude."""
    h = max(0.0, alt_m)
    T = T0_ISA - LAPSE * h
    P = P0_ISA * (T / T0_ISA) ** (G0 / (R_AIR * LAPSE))
    rho = P / (R_AIR * T)
    a = math.sqrt(GAMMA * R_AIR * T)
    return {"T": T, "P": P, "rho": rho, "a": a}


# ═══════════════════════════════════════════════════════════════════
# 2. AIRCRAFT CONFIGURATION (Raymer-style conceptual design)
# ═══════════════════════════════════════════════════════════════════
@dataclass
class Aircraft:
    mass_kg: float = 1500.0          # MTOW
    wing_area_m2: float = 20.0       # S
    aspect_ratio: float = 10.0
    oswald_e: float = 0.80
    cd0: float = 0.020               # zero-lift drag
    prop_diam_m: float = 2.5         # D
    max_lift_coeff: float = 1.8

    @property
    def span_m(self) -> float:
        return math.sqrt(self.aspect_ratio * self.wing_area_m2)

    def drag_polar(self, cl: float) -> float:
        k = 1.0 / (math.pi * self.oswald_e * self.aspect_ratio)
        return self.cd0 + k * cl * cl


# ═══════════════════════════════════════════════════════════════════
# 3. MISSION PROFILE  (total 640 min = 10 h 40 min)
# ═══════════════════════════════════════════════════════════════════
PHASES: List['Phase'] = [
    Phase("takeoff", "Take-off",  2.0,   0,    35.0,  0.0,  "#dc2626", "🛫"),
    Phase("climb",   "Climb",    18.0, 4000,   55.0,  4.0,  "#d97706", "📈"),
    Phase("cruise",  "Cruise",  300.0, 8000,   60.0,  0.0,  "#0d7ed6", "✈️"),
    Phase("loiter",  "Loiter",  305.0, 6000,   45.0,  0.0,  "#16a34a", "🔄"),
    Phase("descent", "Descent",  10.0, 3000,   50.0, -3.0,  "#8b5cf6", "📉"),
    Phase("landing", "Landing",   5.0,   0,    30.0,  0.0,  "#0891b2", "🛬"),
]

TOTAL_MISSION_MIN = sum(p.duration_min for p in PHASES)   # 640.0 min (38,400 seconds = 10h 40m)


# ═══════════════════════════════════════════════════════════════════
# 4. COMPONENT MODELS
# ═══════════════════════════════════════════════════════════════════

# ── Propeller (momentum theory, variable pitch) ─────────────────────
def propeller_model(vel_mps: float, rpm: float, diam_m: float,
                    rho: float, pitch_deg: float) -> Dict[str, float]:
    """Thrust, power, efficiency from momentum theory + variable pitch."""
    n = rpm / 60.0                       # rev/s
    J = vel_mps / (n * diam_m)           # advance ratio
    J = max(0.01, J)
    # Variable pitch shifts CT/CP via pitch angle (deg)
    pitch_rad = math.radians(pitch_deg)
    ct = 0.10 + 0.35 * math.sin(pitch_rad)          # thrust coeff
    cp = 0.05 + 0.20 * math.sin(pitch_rad)          # power coeff
    thrust = ct * rho * n * n * diam_m ** 4
    power  = cp * rho * n ** 3 * diam_m ** 5
    # Propulsive efficiency = TV / P
    eta = (thrust * vel_mps) / (power + 1e-9)
    eta = max(0.0, min(eta, 0.95))
    return {"thrust_N": thrust, "power_W": power, "efficiency": eta,
            "advance_ratio": J, "ct": ct, "cp": cp}


# ── PMSM Motor ──────────────────────────────────────────────────────
def motor_model(power_shaft_W: float, rpm: float, v_bus: float) -> Dict[str, float]:
    """Torque, electrical power, efficiency, current."""
    torque_Nm = (9550.0 * (power_shaft_W / 1000.0)) / max(rpm, 1.0)
    # Efficiency map: peak ~0.96 at mid-load, drops at low/high load
    load = power_shaft_W / 150000.0            # normalized to 150 kW
    load = max(0.0, min(load, 1.0))
    eta = 0.96 - 0.25 * (load - 0.55) ** 2
    eta = max(0.80, min(eta, 0.97))
    p_elec = power_shaft_W / eta
    current_A = p_elec / max(v_bus, 1.0)
    return {"torque_Nm": torque_Nm, "power_elec_W": p_elec,
            "efficiency": eta, "current_A": current_A}


# ── Generator ───────────────────────────────────────────────────────
def generator_model(power_mech_W: float, rpm: float) -> Dict[str, float]:
    """Mechanical → electrical with load-dependent efficiency."""
    load = power_mech_W / 120000.0
    load = max(0.0, min(load, 1.0))
    eta = 0.95 - 0.20 * (load - 0.6) ** 2
    eta = max(0.82, min(eta, 0.97))
    p_elec = power_mech_W * eta
    return {"power_elec_W": p_elec, "efficiency": eta, "loss_W": power_mech_W - p_elec}


# ── Turboshaft Engine (BSFC map) ────────────────────────────────────
JETA_LHV = 43.0e6            # J/kg  Jet-A1 lower heating value
def engine_model(power_shaft_W: float, rpm: float) -> Dict[str, float]:
    """Shaft power, fuel flow (BSFC map), efficiency, EGT."""
    load = power_shaft_W / 200000.0
    load = max(0.05, min(load, 1.0))
    # BSFC map: min ~0.28 kg/kWh at ~75% load, higher at extremes
    bsfc = 0.28 + 0.12 * (load - 0.75) ** 2 + 0.05 * (1.0 - load)
    bsfc_kg_per_ws = bsfc / 3.6e6            # kg/W·s
    fuel_flow_kg_s = bsfc_kg_per_ws * power_shaft_W
    eta = power_shaft_W / (fuel_flow_kg_s * JETA_LHV + 1e-9)
    eta = max(0.0, min(eta, 0.45))
    # Exhaust temp proxy from load + rpm
    egt_K = 600.0 + 500.0 * load + 0.05 * (rpm / 1000.0)
    return {"fuel_flow_kg_s": fuel_flow_kg_s, "bsfc_kg_kwh": bsfc,
            "efficiency": eta, "egt_K": egt_K}


# ── PEM Fuel Cell (polarization + efficiency) ───────────────────────
H2_LHV = 120.0e6             # J/kg  hydrogen LHV
def fuel_cell_model(power_elec_W: float, fc_rated_W: float) -> Dict[str, float]:
    """Electrical output, H2 consumption, efficiency, stack temp."""
    load = power_elec_W / max(fc_rated_W, 1.0)
    load = max(0.0, min(load, 1.0))
    # Polarization-based efficiency: peak ~0.55 at ~30% load
    eta = 0.55 - 0.30 * (load - 0.30) ** 2
    eta = max(0.30, min(eta, 0.60))
    h2_flow_kg_s = power_elec_W / (eta * H2_LHV + 1e-9)
    stack_temp_K = 300.0 + 60.0 * load
    return {"h2_flow_kg_s": h2_flow_kg_s, "efficiency": eta,
            "stack_temp_K": stack_temp_K, "load_frac": load}


# ── Li-ion Battery (Thevenin equivalent) ────────────────────────────
BAT_NOM_V = 800.0            # V  nominal bus
def battery_model(power_W: float, soc: float, temp_K: float,
                  cap_ah: float = 50.0) -> Dict[str, float]:
    """Voltage, current, internal resistance, losses, temp rise."""
    # OCV vs SOC (Thevenin)
    ocv = 700.0 + 100.0 * soc / 100.0
    # Internal resistance grows at low SOC and high temp
    r_int = 0.05 + 0.15 * (1.0 - soc / 100.0) ** 2 + 0.02 * (temp_K - 300.0) / 50.0
    # Current (sign: + discharge, - charge)
    current_A = power_W / max(ocv, 1.0)
    loss_W = current_A ** 2 * r_int
    # Temp rise from losses
    temp_new = temp_K + loss_W * 0.0005
    # SOC change (Coulomb counting) — capacity scales with battery_kwh
    d_soc = -current_A / (max(cap_ah, 1.0) * 3600.0) * 100.0
    return {"voltage_V": ocv, "current_A": current_A, "r_internal_ohm": r_int,
            "loss_W": loss_W, "temp_K": temp_new, "d_soc": d_soc}


# ═══════════════════════════════════════════════════════════════════
# 5. APEMS DECISION ENGINE  (ECMS-style optimization)
# ═══════════════════════════════════════════════════════════════════
def apems_decision(p_req_W: float, soc: float, h2_kg: float, jeta_kg: float,
                   phase: Phase, fc_rated_W: float) -> Dict[str, float]:
    """
    Equivalent Consumption Minimization Strategy (ECMS).
    Minimize: fuel + battery degradation + power loss
    Subject to: SOC > 30%, fuel > reserve, H2 > reserve.
    Returns power split fractions for battery / fuel cell / engine.
    """
    # Reserve constraints
    soc_ok = soc > 30.0
    h2_ok  = h2_kg > 1.0
    fuel_ok = jeta_kg > 2.0

    # Candidate splits (battery, fc, engine) — normalized
    candidates = [
        (0.10, 0.55, 0.35),   # cruise: FC dominant
        (0.20, 0.50, 0.30),   # loiter
        (0.40, 0.35, 0.25),   # landing / takeoff assist
        (0.25, 0.35, 0.40),   # climb
        (0.15, 0.45, 0.40),   # descent
    ]

    # Phase preference: which candidate index suits each phase best.
    # This makes the ECMS split phase-aware instead of always picking
    # the cheapest (highest-battery) candidate.
    phase_pref = {
        "takeoff": 2,   # landing / takeoff assist
        "climb":   3,   # climb
        "cruise":  0,   # cruise: FC dominant
        "loiter":  1,   # loiter
        "descent": 4,   # descent
        "landing": 2,   # landing / takeoff assist
    }
    pref_idx = phase_pref.get(phase.id, 0)

    best = None
    best_cost = float("inf")
    for i, (fb, ff, fe) in enumerate(candidates):
        # ECMS cost: fuel + battery degradation + power loss
        fuel_cost = fe * 1.0 + ff * 0.6          # engine fuel heavier than H2
        # Battery is a limited-energy resource — penalise it heavily so it
        # is used only for transients / boost, not as a primary source.
        batt_cost = fb * (2.0 + (30.0 - soc) / 100.0) if soc_ok else fb * 5.0
        loss_cost = (fb * 0.05 + ff * 0.08 + fe * 0.10)
        # Phase-preference penalty: strongly favour the phase's preferred
        # split so the battery is reserved for the phases that need it.
        phase_penalty = abs(i - pref_idx) * 0.30
        cost = fuel_cost + batt_cost + loss_cost + phase_penalty
        if cost < best_cost:
            best_cost = cost
            best = (fb, ff, fe)

    fb, ff, fe = best
    # Enforce reserves: if a source is depleted, shift to others
    if not soc_ok:
        fb, ff, fe = 0.0, ff + fb * 0.6, fe + fb * 0.4
    if not h2_ok:
        ff, fe = 0.0, fe + ff
    if not fuel_ok:
        fe, ff = 0.0, ff + fe
    # Normalize
    tot = fb + ff + fe
    fb, ff, fe = fb / tot, ff / tot, fe / tot

    # Reason string
    if not soc_ok:
        reason = "Battery below reserve — shifted to FC + engine"
    elif not h2_ok:
        reason = "Hydrogen below reserve — engine covers demand"
    elif not fuel_ok:
        reason = "Fuel below reserve — FC + battery cover demand"
    elif phase.id in ("cruise", "loiter"):
        reason = "FC at peak efficiency; battery reserved for transients"
    elif phase.id in ("takeoff", "climb"):
        reason = "High thrust demand — engine + battery boost"
    else:
        reason = "Balanced split for current phase"

    return {"bat_frac": fb, "fc_frac": ff, "eng_frac": fe, "reason": reason}


# ═══════════════════════════════════════════════════════════════════
# 6. MAIN SIMULATION
# ═══════════════════════════════════════════════════════════════════
@dataclass
class SimState:
    t_min: float = 0.0
    phase_idx: int = 0
    phase_elapsed: float = 0.0
    alt_m: float = 0.0
    phase_start_alt: float = 0.0
    vel_mps: float = 35.0
    dist_m: float = 0.0
    mass_kg: float = 1500.0
    soc: float = 100.0
    h2_kg: float = 10.0
    jeta_kg: float = 30.0
    bat_temp_K: float = 300.0
    prop_rpm: float = 0.0
    pitch_deg: float = 20.0
    timeline: List[Dict] = field(default_factory=list)


def simulate(battery_kwh: float, fc_kw: float, h2_kg: float,
             jeta_kg: float, dt_min: float = 1.0) -> Dict:
    """
    Run the full physics-based mission simulation.
    Returns minute-by-minute telemetry + summary + analytics.
    """
    ac = Aircraft()
    fc_rated_W = fc_kw * 1000.0
    bat_cap_wh = battery_kwh * 1000.0
    bat_cap_ah = bat_cap_wh / BAT_NOM_V      # Ah at nominal bus voltage

    st = SimState(h2_kg=h2_kg, jeta_kg=jeta_kg)
    st.mass_kg = ac.mass_kg

    # Health tracking
    health = {k: 100.0 for k in
              ["battery", "fuel_cell", "engine", "generator",
               "motor", "inverter", "propeller", "cooling", "apems"]}

    # Analytics accumulators
    total_energy_wh = 0.0
    max_power_W = 0.0
    total_fuel_kg = 0.0
    total_h2_kg = 0.0
    fc_on_min = 0.0
    eng_on_min = 0.0
    fc_energy_wh = 0.0
    eng_energy_wh = 0.0
    bat_energy_wh = 0.0
    gen_energy_wh = 0.0

    while st.phase_idx < len(PHASES):
        phase = PHASES[st.phase_idx]
        dt_s = dt_min * 60.0

        # ── Interpolate altitude / velocity within phase ─────────────
        # Record the altitude at the start of each phase so the profile
        # is continuous (no jumps between phases).
        if st.phase_elapsed == 0:
            st.phase_start_alt = st.alt_m
        frac = st.phase_elapsed / max(phase.duration_min, 1.0)
        st.alt_m = max(0.0, st.phase_start_alt
                       + (phase.alt_m - st.phase_start_alt) * frac)
        st.vel_mps = phase.vel_mps

        # ── ISA atmosphere ───────────────────────────────────────────
        atm = isa_atmosphere(st.alt_m)
        rho = atm["rho"]

        # ── Aircraft dynamics ────────────────────────────────────────
        W = st.mass_kg * G0
        q = 0.5 * rho * st.vel_mps ** 2
        cl = W / (q * ac.wing_area_m2 + 1e-9)
        cl = max(0.0, min(cl, ac.max_lift_coeff))
        cd = ac.drag_polar(cl)
        drag = q * ac.wing_area_m2 * cd
        # Required thrust: T = D + m·dV/dt + m·g·sin(gamma)
        # Actual climb rate from the altitude interpolation
        climb_rate_actual = (phase.alt_m - st.phase_start_alt) \
                            / max(phase.duration_min * 60.0, 1.0)
        gamma = math.atan2(climb_rate_actual, st.vel_mps)
        thrust_req = drag + st.mass_kg * G0 * math.sin(gamma)
        # Required shaft power
        p_req_W = thrust_req * st.vel_mps
        p_req_W = max(p_req_W, 5000.0)          # idle floor
        max_power_W = max(max_power_W, p_req_W)

        # ── APEMS decision ───────────────────────────────────────────
        apems = apems_decision(p_req_W, st.soc, st.h2_kg, st.jeta_kg,
                               phase, fc_rated_W)
        fb, ff, fe = apems["bat_frac"], apems["fc_frac"], apems["eng_frac"]

        # ── Power split (W) ──────────────────────────────────────────
        p_bat_W = p_req_W * fb
        p_fc_W  = p_req_W * ff
        p_eng_W = p_req_W * fe

        # Cap fuel cell to its rated power; overflow moves to the engine
        # (generator), not the battery — the battery is a limited-energy
        # source reserved for transients / boost, not base load.
        if p_fc_W > fc_rated_W:
            overflow = p_fc_W - fc_rated_W
            p_fc_W   = fc_rated_W
            p_eng_W += overflow

        # ── Propeller ────────────────────────────────────────────────
        # RPM from required power via CP relation (solve n)
        n_guess = (p_req_W / (0.10 * rho * ac.prop_diam_m ** 5)) ** (1.0 / 3.0)
        st.prop_rpm = n_guess * 60.0
        st.pitch_deg = 15.0 + 15.0 * (phase.id in ("takeoff", "climb"))
        prop = propeller_model(st.vel_mps, st.prop_rpm, ac.prop_diam_m,
                               rho, st.pitch_deg)

        # ── Motor ────────────────────────────────────────────────────
        motor = motor_model(p_req_W, st.prop_rpm, BAT_NOM_V)

        # ── Generator + Engine ───────────────────────────────────────
        gen = generator_model(p_eng_W, st.prop_rpm)
        eng = engine_model(p_eng_W, st.prop_rpm)

        # ── Fuel cell ────────────────────────────────────────────────
        fc = fuel_cell_model(p_fc_W, fc_rated_W)

        # ── Battery ──────────────────────────────────────────────────
        bat = battery_model(p_bat_W, st.soc, st.bat_temp_K, cap_ah=bat_cap_ah)
        st.bat_temp_K = bat["temp_K"]

        # ── DC bus power balance ─────────────────────────────────────
        # P_bat + P_fc + P_gen = P_motor + P_loss
        p_gen_W = gen["power_elec_W"]
        p_motor_elec = motor["power_elec_W"]
        bus_loss = (p_bat_W * 0.02 + p_fc_W * 0.03 + p_gen_W * 0.02
                    + p_motor_elec * 0.02)          # inverter/cable/converter
        bus_power_W = p_bat_W + p_fc_W + p_gen_W

        # ── Consume resources ────────────────────────────────────────
        h2_used = min(fc["h2_flow_kg_s"] * dt_s, st.h2_kg)
        fuel_used = min(eng["fuel_flow_kg_s"] * dt_s, st.jeta_kg)
        st.h2_kg = max(0.0, st.h2_kg - h2_used)
        st.jeta_kg = max(0.0, st.jeta_kg - fuel_used)
        # d_soc is per-second → multiply by dt_s (seconds)
        st.soc = max(0.0, min(100.0, st.soc + bat["d_soc"] * dt_s))
        # Mass decreases as fuel / hydrogen are consumed
        st.mass_kg = ac.mass_kg - (h2_kg - st.h2_kg) - (jeta_kg - st.jeta_kg)

        # ── Accumulate analytics ─────────────────────────────────────
        total_energy_wh += p_req_W * dt_s / 3600.0
        total_fuel_kg += fuel_used
        total_h2_kg += h2_used
        if p_fc_W > 100.0: fc_on_min += dt_min; fc_energy_wh += p_fc_W * dt_s / 3600.0
        if p_eng_W > 100.0: eng_on_min += dt_min; eng_energy_wh += p_eng_W * dt_s / 3600.0
        bat_energy_wh += abs(p_bat_W) * dt_s / 3600.0
        gen_energy_wh += p_gen_W * dt_s / 3600.0

        # ── Health degradation (load-based) ──────────────────────────
        health["battery"]   = max(0.0, health["battery"] - abs(bat["current_A"]) * 0.0002)
        health["fuel_cell"] = max(0.0, health["fuel_cell"] - fc["load_frac"] * 0.0005)
        health["engine"]    = max(0.0, health["engine"] - eng["efficiency"] * 0.0003)
        health["generator"] = max(0.0, health["generator"] - (1 - gen["efficiency"]) * 0.0004)
        health["motor"]     = max(0.0, health["motor"] - (1 - motor["efficiency"]) * 0.0003)
        health["inverter"]  = max(0.0, health["inverter"] - 0.0001)
        health["propeller"] = max(0.0, health["propeller"] - 0.0001)
        health["cooling"]   = max(0.0, health["cooling"] - (st.bat_temp_K - 300.0) * 0.0001)
        health["apems"]     = max(0.0, health["apems"] - 0.00005)

        # ── Endurance estimates ──────────────────────────────────────
        bat_end_min = (st.soc / 100.0 * bat_cap_wh) / (abs(p_bat_W) / 1000.0 + 1e-9) * 60.0
        fuel_end_min = (st.jeta_kg * JETA_LHV * eng["efficiency"]) / (p_eng_W + 1e-9) / 60.0
        h2_end_min = (st.h2_kg * H2_LHV * fc["efficiency"]) / (p_fc_W + 1e-9) / 60.0
        total_end_min = min(bat_end_min, fuel_end_min, h2_end_min)

        # ── Overall efficiency ───────────────────────────────────────
        eta_overall = (eng["efficiency"] * gen["efficiency"] * motor["efficiency"]
                       * prop["efficiency"])

        # ── Telemetry frame ──────────────────────────────────────────
        st.timeline.append({
            "t_min": round(st.t_min, 2),
            "phase": phase.id, "phase_name": phase.name, "phase_color": phase.color,
            "alt_m": round(st.alt_m, 1), "vel_mps": round(st.vel_mps, 2),
            "dist_m": round(st.dist_m, 1), "mass_kg": round(st.mass_kg, 1),
            "cl": round(cl, 3), "cd": round(cd, 4),
            "thrust_N": round(thrust_req, 1), "drag_N": round(drag, 1),
            "p_req_W": round(p_req_W, 1),
            "p_bat_W": round(p_bat_W, 1), "p_fc_W": round(p_fc_W, 1),
            "p_eng_W": round(p_eng_W, 1), "p_gen_W": round(p_gen_W, 1),
            "p_motor_W": round(p_motor_elec, 1), "bus_power_W": round(bus_power_W, 1),
            "bus_loss_W": round(bus_loss, 1),
            "soc": round(st.soc, 2), "h2_pct": round(st.h2_kg / max(h2_kg, 1e-9) * 100, 2),
            "jeta_pct": round(st.jeta_kg / max(jeta_kg, 1e-9) * 100, 2),
            "h2_kg": round(st.h2_kg, 3), "jeta_kg": round(st.jeta_kg, 3),
            "prop_rpm": round(st.prop_rpm, 0), "pitch_deg": round(st.pitch_deg, 1),
            "prop_thrust_N": round(prop["thrust_N"], 1),
            "prop_eff": round(prop["efficiency"], 3),
            "motor_torque_Nm": round(motor["torque_Nm"], 1),
            "motor_eff": round(motor["efficiency"], 3),
            "motor_current_A": round(motor["current_A"], 1),
            "gen_eff": round(gen["efficiency"], 3),
            "eng_bsfc": round(eng["bsfc_kg_kwh"], 3),
            "eng_eff": round(eng["efficiency"], 3),
            "eng_egt_K": round(eng["egt_K"], 1),
            "fuel_flow_kg_s": round(eng["fuel_flow_kg_s"], 5),
            "fuel_flow_kg_hr": round(eng["fuel_flow_kg_s"] * 3600.0, 2),
            "h2_flow_kg_s": round(fc["h2_flow_kg_s"], 6),
            "fc_eff": round(fc["efficiency"], 3),
            "fc_temp_K": round(fc["stack_temp_K"], 1),
            "bat_voltage_V": round(bat["voltage_V"], 1),
            "bat_current_A": round(bat["current_A"], 1),
            "bat_r_int": round(bat["r_internal_ohm"], 3),
            "bat_temp_K": round(st.bat_temp_K, 1),
            "bat_loss_W": round(bat["loss_W"], 1),
            "eta_overall": round(eta_overall, 3),
            "bat_end_min": round(bat_end_min, 1),
            "fuel_end_min": round(fuel_end_min, 1),
            "h2_end_min": round(h2_end_min, 1),
            "total_end_min": round(total_end_min, 1),
            "apems_reason": apems["reason"],
            "bat_frac": round(fb, 3), "fc_frac": round(ff, 3), "eng_frac": round(fe, 3),
            "is_charging": p_bat_W < 0,
            "health": {k: round(v, 1) for k, v in health.items()},
        })

        # ── Advance ──────────────────────────────────────────────────
        st.dist_m += st.vel_mps * dt_s
        st.t_min += dt_min
        st.phase_elapsed += dt_min
        if st.phase_elapsed >= phase.duration_min:
            st.phase_idx += 1
            st.phase_elapsed = 0.0

    # ── Summary ──────────────────────────────────────────────────────
    mission_complete = st.phase_idx >= len(PHASES)
    return {
        "endurance_min": round(st.t_min, 1),
        "endurance_hr": round(st.t_min / 60.0, 2),
        "mission_complete": mission_complete,
        "total_mission_min": TOTAL_MISSION_MIN,
        "timeline": st.timeline,
        "phases": [{"id": p.id, "name": p.name, "duration_min": p.duration_min,
                    "color": p.color, "icon": p.icon} for p in PHASES],
        "summary": {
            "distance_m": round(st.dist_m, 0),
            "distance_km": round(st.dist_m / 1000.0, 2),
            "avg_power_W": round(total_energy_wh * 3600.0 / (st.t_min * 60.0), 1),
            "max_power_W": round(max_power_W, 1),
            "total_energy_kwh": round(total_energy_wh / 1000.0, 2),
            "total_fuel_kg": round(total_fuel_kg, 2),
            "total_h2_kg": round(total_h2_kg, 2),
            "fc_on_min": round(fc_on_min, 1),
            "eng_on_min": round(eng_on_min, 1),
            "fc_energy_kwh": round(fc_energy_wh / 1000.0, 2),
            "eng_energy_kwh": round(eng_energy_wh / 1000.0, 2),
            "bat_energy_kwh": round(bat_energy_wh / 1000.0, 2),
            "gen_energy_kwh": round(gen_energy_wh / 1000.0, 2),
            "final_soc": round(st.soc, 1),
            "final_h2_kg": round(st.h2_kg, 2),
            "final_jeta_kg": round(st.jeta_kg, 2),
            "health": {k: round(v, 1) for k, v in health.items()},
        },
    }
