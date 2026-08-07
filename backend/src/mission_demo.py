"""
Mission Demo & Digital Twin Module
=================================
Advanced features for the Aerospace Digital Twin Dashboard:
1. Mission Demo Mode - 3-minute auto-animated replay
2. Live 3D Aircraft visualization
3. Live APEMS Digital Twin power flow
4. Why APEMS Made This Decision panel
5. Live Mathematical Calculations
6. Engineering Calculation Inspector
7. Mission Log
8. Live KPI Animations

Author: Aerospace Digital Twin Team
"""
import time
import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
from src.plotting import COLORS, apply_theme, gauge_plot
from src.physics import (
    lift_force, drag_force, dynamic_pressure, required_power, stall_speed,
    mach_number, reynolds_number, battery_power, soc_update, remaining_energy,
    engine_fuel_burn, total_endurance, remaining_range
)

# =============================================================================
# DEMO TIMELINE
# =============================================================================
DEMO_TOTAL = 180  # 3 minutes
DEMO_PHASES = [
    ('Takeoff', 0, 30),
    ('Climb', 30, 60),
    ('Cruise', 60, 120),
    ('Loiter', 120, 150),
    ('Descent', 150, 165),
    ('Landing', 165, 180),
]

# User-specified power splits for demo
DEMO_POWER = {
    'Takeoff': {'demand': 60.0, 'engine': 0.70, 'battery': 0.30, 'fc': 0.00,
                'reason': 'High thrust demand.', 'why': 'Battery assists engine for maximum acceleration.',
                'status': 'Maximum Takeoff Power'},
    'Climb': {'demand': 50.0, 'engine': 0.60, 'battery': 0.25, 'fc': 0.15,
              'reason': 'Balanced climb power.', 'why': 'Altitude increasing - balanced engine and battery.',
              'status': 'Sustained Climb Power'},
    'Cruise': {'demand': 25.0, 'engine': 0.40, 'battery': 0.10, 'fc': 0.50,
               'reason': 'Maximum fuel economy.', 'why': 'Fuel Cell activated - battery preserved.',
               'status': 'Maximum Fuel Economy'},
    'Loiter': {'demand': 18.0, 'engine': 0.30, 'battery': 0.10, 'fc': 0.60,
               'reason': 'Maximum endurance mode.', 'why': 'Lowest fuel consumption for extended loiter.',
               'status': 'Maximum Endurance'},
    'Descent': {'demand': 15.0, 'engine': 0.20, 'battery': 0.80, 'fc': 0.00,
                'reason': 'Reduced power mode.', 'why': 'Power demand reduced - battery support increased.',
                'status': 'Reduced Power'},
    'Landing': {'demand': 10.0, 'engine': 0.40, 'battery': 0.60, 'fc': 0.00,
                'reason': 'Smooth landing.', 'why': 'Stable power delivery for approach.',
                'status': 'Noise Reduction'},
}

MISSION_LOG = [
    (0, 'Engine Started'),
    (8, 'Battery Assisting'),
    (30, 'Takeoff Complete'),
    (55, 'Fuel Cell Activated'),
    (60, 'Cruise Mode'),
    (120, 'Maximum Endurance Mode'),
    (150, 'Descent Initiated'),
    (178, 'Landing Successful'),
    (180, 'Mission Completed'),
]

# =============================================================================
# DEMO STATE MANAGEMENT
# =============================================================================

def start_demo():
    """Initialize and start the live demo."""
    st.session_state.demo_active = True
    st.session_state.demo_time = 0.0


def stop_demo():
    """Stop the live demo."""
    st.session_state.demo_active = False


def is_demo_active():
    """Check if demo is running."""
    return st.session_state.get('demo_active', False)


def get_demo_phase(demo_time):
    """Get phase for a given demo time."""
    for phase, start, end in DEMO_PHASES:
        if start <= demo_time < end:
            return phase
    return 'Landing'


def get_demo_progress(demo_time):
    """Get phase progress 0-1."""
    phase = get_demo_phase(demo_time)
    for p, s, e in DEMO_PHASES:
        if p == phase:
            return min(1.0, (demo_time - s) / (e - s))
    return 1.0


def demo_to_sim_time(demo_time):
    """Map demo time (0-180s) to simulation time (0-3660s)."""
    return demo_time / DEMO_TOTAL * 3660.0


def advance_demo():
    """Advance demo time by one frame."""
    if not is_demo_active():
        return
    speed = st.session_state.get('demo_speed', 1.0)
    st.session_state.demo_time += 1.0 / 30.0 * 60.0 * speed  # 30fps, 60x speedup
    if st.session_state.demo_time >= DEMO_TOTAL:
        st.session_state.demo_time = DEMO_TOTAL
        stop_demo()
        st.session_state.demo_finished = True


# =============================================================================
# LIVE 3D AIRCRAFT
# =============================================================================

def render_3d_aircraft(phase, progress=0.5):
    """Create an animated 3D aircraft visualization."""
    fig = go.Figure()

    # Aircraft geometry (relative coords)
    # Fuselage
    fuselage_x = [-2, -1, 1, 2]
    fuselage_y = [0, 0, 0, 0]
    fuselage_z = [0, 0.5, 0.5, 0]
    # Wings
    wing_x = [0, 0, 0, 0]
    wing_y = [-3, -0.5, 0.5, 3]
    wing_z = [0.5, 0.5, 0.5, 0.5]
    # Tail
    tail_x = [-2.5, -2.5, -2]
    tail_y = [0, 0, 0]
    tail_z = [0, 1.5, 0.5]
    # Tail wings
    tailw_x = [-2.3, -2.3, -2.3, -2.3]
    tailw_y = [-1.2, -0.3, 0.3, 1.2]
    tailw_z = [1.0, 0.8, 0.8, 1.0]

    # Position by phase
    positions = {
        'Takeoff': (0, 0, 1 + progress * 3),
        'Climb': (2 + progress * 8, 0, 5 + progress * 20),
        'Cruise': (12 + progress * 15, 0, 25),
        'Loiter': (30 + np.cos(progress * 2 * np.pi) * 5, np.sin(progress * 2 * np.pi) * 5, 25),
        'Descent': (45 + progress * 10, 0, 25 - progress * 20),
        'Landing': (58 + progress * 4, 0, 5 - progress * 4),
    }
    px_, py_, pz = positions.get(phase, (0, 0, 0))

    c = COLORS
    color_map = {
        'Takeoff': c['danger'], 'Climb': c['accent_3'], 'Cruise': c['accent'],
        'Loiter': c['accent_2'], 'Descent': c['warning'], 'Landing': c['motor']
    }
    aircraft_color = color_map.get(phase, c['accent'])

    # Draw flight path
    t = np.linspace(0, DEMO_TOTAL, 200)
    path_x, path_y, path_z = [], [], []
    for tt in t:
        p = get_demo_phase(tt)
        pr = get_demo_progress(tt)
        pos = positions.get(p, (0, 0, 0))
        # Simple interpolation
        if p == 'Loiter':
            path_x.append(30 + np.cos(pr * 2 * np.pi) * 5)
            path_y.append(np.sin(pr * 2 * np.pi) * 5)
            path_z.append(25)
        elif p == 'Takeoff':
            path_x.append(0); path_y.append(0); path_z.append(1 + pr * 3)
        elif p == 'Climb':
            path_x.append(2 + pr * 8); path_y.append(0); path_z.append(5 + pr * 20)
        elif p == 'Cruise':
            path_x.append(12 + pr * 15); path_y.append(0); path_z.append(25)
        elif p == 'Descent':
            path_x.append(45 + pr * 10); path_y.append(0); path_z.append(25 - pr * 20)
        else:  # Landing
            path_x.append(58 + pr * 4); path_y.append(0); path_z.append(5 - pr * 4)

    fig.add_trace(go.Scatter3d(
        x=path_x, y=path_y, z=path_z,
        mode='lines', name='Flight Path',
        line=dict(color=c['accent'], width=3)
    ))

    # Ground plane
    gx = np.linspace(-2, 65, 30)
    gz = np.linspace(-5, 5, 30)
    GX, GZ = np.meshgrid(gx, gz)
    fig.add_trace(go.Surface(
        x=GX, y=np.zeros_like(GX) - 1, z=GZ,
        colorscale=[[0, '#0d1526'], [1, '#0d1526']],
        showscale=False, opacity=0.3, name='Ground'
    ))

    # Aircraft (simplified representation)
    ax = [px_ + fuselage_x[i] for i in range(len(fuselage_x))]
    ay = [py_ + fuselage_y[i] for i in range(len(fuselage_y))]
    az = [pz + fuselage_z[i] for i in range(len(fuselage_z))]

    fig.add_trace(go.Scatter3d(
        x=fuselage_x + ax, y=fuselage_y + ay, z=fuselage_z + az,
        mode='markers+lines', name='Aircraft Fuselage',
        marker=dict(size=4, color=aircraft_color),
        line=dict(color=aircraft_color, width=3)
    ))

    # Wings
    fig.add_trace(go.Scatter3d(
        x=wing_x, y=wing_y, z=wing_z,
        mode='lines', name='Wings',
        line=dict(color=aircraft_color, width=4)
    ))

    # Tail
    fig.add_trace(go.Scatter3d(
        x=tail_x, y=tail_y, z=tail_z,
        mode='lines', name='Tail',
        line=dict(color=aircraft_color, width=3)
    ))
    fig.add_trace(go.Scatter3d(
        x=tailw_x, y=tailw_y, z=tailw_z,
        mode='lines', name='Tail Wings',
        line=dict(color=aircraft_color, width=3)
    ))

    # Current position marker
    fig.add_trace(go.Scatter3d(
        x=[px_], y=[py_], z=[pz],
        mode='markers',
        marker=dict(size=12, color=aircraft_color, symbol='diamond',
                    line=dict(color='white', width=2)),
        name='Aircraft'
    ))

    fig.update_layout(
        title=f'3D Aircraft - {phase} Phase',
        scene=dict(
            xaxis_title='Distance (km)', yaxis_title='Lateral (km)', zaxis_title='Altitude (km)',
            bgcolor='rgba(10,14,23,0.95)',
            xaxis=dict(gridcolor='#1e293b', color=c['text']),
            yaxis=dict(gridcolor='#1e293b', color=c['text']),
            zaxis=dict(gridcolor='#1e293b', color=c['text']),
        ),
        height=600,
        showlegend=False,
        font=dict(color=c['text'], family='Consolas, monospace')
    )
    return apply_theme(fig)


# =============================================================================
# LIVE APEMS DIGITAL TWIN
# =============================================================================

def render_apems_twin(demo_time):
    """Render the live APEMS Digital Twin with animated power flow."""
    phase = get_demo_phase(demo_time)
    power = DEMO_POWER[phase]
    pr = get_demo_progress(demo_time)

    e_pow = power['demand'] * power['engine']
    b_pow = power['demand'] * power['battery']
    f_pow = power['demand'] * power['fc']

    # Component colors
    engine_color = COLORS['engine']
    battery_color = COLORS['battery']
    fc_color = COLORS['fuel_cell']
    bus_color = COLORS['bus']
    motor_color = COLORS['motor']
    prop_color = COLORS['propeller']

    # Arrow intensity based on power flow
    def arrow_css(power_kw, color, max_power=60):
        """Generate animated arrow CSS based on power."""
        intensity = min(1.0, max(0.1, power_kw / max_power))
        glow = int(60 * intensity + 40)
        return f"color: {color}; box-shadow: 0 0 {glow}px {color}80; animation: pulse {2 - intensity}s infinite; font-weight: {'bold' if intensity > 0.5 else 'normal'}"

    # Determine if sources are active
    engine_active = e_pow > 1
    battery_active = b_pow > 1
    fc_active = f_pow > 1

    # Supply icons
    eng_icon = '🟠' if engine_active else '⚫'
    batt_icon = '🟢' if battery_active else '⚫'
    fc_icon = '🔵' if fc_active else '⚫'

    html = f"""
    <style>
    @keyframes glowPulse {{
        0% {{ opacity: 0.5; }}
        50% {{ opacity: 1; }}
        100% {{ opacity: 0.5; }}
    }}
    .flow-arrow {{
        display: inline-block;
        padding: 4px 12px;
        border-radius: 8px;
        margin: 2px 0;
        font-family: 'Consolas', monospace;
        font-size: 13px;
    }}
    .apems-twin {{
        background: rgba(10, 14, 23, 0.9);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        padding: 20px;
        font-family: 'Consolas', monospace;
    }}
    .twin-component {{
        display: flex;
        align-items: center;
        padding: 8px 16px;
        border-radius: 8px;
        margin: 4px 0;
        background: rgba(17, 24, 39, 0.8);
        border-left: 4px solid {COLORS['accent']};
    }}
    .twin-label {{ font-size: 14px; font-weight: bold; color: {COLORS['text']}; min-width: 130px; }}
    .twin-metric {{ font-size: 12px; color: {COLORS['text_dim']}; margin-left: 12px; }}
    .twin-status {{
        font-size: 12px;
        margin-left: 8px;
        color: {COLORS['accent_2']};
    }}
    </style>

    <div class="apems-twin">
    <h3 style="color: {COLORS['accent']}; margin: 0 0 10px 0; text-align: center;">
    APEMS DIGITAL TWIN — {phase.upper()} PHASE
    </h3>
    <p style="color: {COLORS['accent_2']}; text-align: center; margin: 0 0 14px 0;">
    Power Demand: {power['demand']:.0f} kW | Engine {power['engine']*100:.0f}% | Battery {power['battery']*100:.0f}% | FC {power['fc']*100:.0f}%
    </p>

    <!-- Jet-A Tank -->
    <div class="twin-component" style="border-left-color: {engine_color};">
        <div class="twin-label">⛽ Jet-A Tank</div>
        <div class="twin-metric">Fuel: {50 + e_pow * 0.8:.1f} kg</div>
        <div class="twin-metric">Energy: {50 + e_pow * 0.8 * 43.2 / 3.6:.0f} kWh</div>
        <div class="twin-status">{'ACTIVE' if engine_active else 'STANDBY'}</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(e_pow, engine_color)}">
        ↓ {'▓' * int(3 + e_pow / 10)}↘ Engine {e_pow:.1f} kW
    </div>

    <!-- Engine -->
    <div class="twin-component" style="border-left-color: {engine_color};">
        <div class="twin-label">🛢️ PBS TS100</div>
        <div class="twin-metric">Power: {e_pow:.1f} kW</div>
        <div class="twin-metric">Efficiency: {35 + e_pow * 0.05:.1f}%</div>
        <div class="twin-metric">Temp: {80 + e_pow * 0.5:.1f}°C</div>
        <div class="twin-status">{'RUNNING' if engine_active else 'OFF'}</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(e_pow * 0.92, COLORS['generator'])}">
        ↓ {'▓' * int(3 + e_pow / 10)}↘ Generator {e_pow * 0.92:.1f} kW
    </div>

    <!-- Generator -->
    <div class="twin-component" style="border-left-color: {COLORS['generator']};">
        <div class="twin-label">⚙️ Generator</div>
        <div class="twin-metric">Output: {e_pow * 0.92:.1f} kW</div>
        <div class="twin-metric">Efficiency: 92%</div>
        <div class="twin-status">{'GENERATING' if engine_active else 'IDLE'}</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(e_pow * 0.92, COLORS['generator'])}">
        ↓ {'▓' * int(3 + e_pow / 10)}↘ 800V Bus
    </div>

    <!-- Bus -->
    <div class="twin-component" style="border-left-color: {bus_color};">
        <div class="twin-label">⚡ 800V DC Bus</div>
        <div class="twin-metric">Voltage: 800 V</div>
        <div class="twin-metric">Current: {(e_pow * 0.92 + b_pow + f_pow) * 1000 / 800:.1f} A</div>
        <div class="twin-status">ACTIVE</div>
    </div>

    <!-- Battery contribution -->
    <div class="flow-arrow" style="{arrow_css(b_pow, battery_color)}">
        {'↑' if battery_active else '·'} {'▓' * int(3 + b_pow / 10)}↗ Battery {b_pow:.1f} kW
    </div>
    <div class="twin-component" style="border-left-color: {battery_color};">
        <div class="twin-label">🔋 Li-ion Battery</div>
        <div class="twin-metric">Power: {b_pow:.1f} kW</div>
        <div class="twin-metric">SOC: {95 - demo_time * 0.3:.1f}%</div>
        <div class="twin-metric">Temp: {30 + b_pow * 0.3:.1f}°C</div>
        <div class="twin-status">{'DISCHARGING' if battery_active else 'IDLE'}</div>
    </div>

    <!-- FC contribution -->
    <div class="flow-arrow" style="{arrow_css(f_pow, fc_color)}">
        {'↑' if fc_active else '·'} {'▓' * int(3 + f_pow / 10)}↗ Fuel Cell {f_pow:.1f} kW
    </div>
    <div class="twin-component" style="border-left-color: {fc_color};">
        <div class="twin-label">🧪 PEM Fuel Cell</div>
        <div class="twin-metric">Power: {f_pow:.1f} kW</div>
        <div class="twin-metric">Efficiency: 55%</div>
        <div class="twin-metric">H2: {8 - demo_time * 0.02:.2f} kg</div>
        <div class="twin-status">{'ACTIVE' if fc_active else 'OFF'}</div>
    </div>

    <!-- APEMS -->
    <div class="twin-component" style="border-left-color: {COLORS['accent']}; background: rgba(0, 212, 255, 0.08);">
        <div class="twin-label">🧠 APEMS Controller</div>
        <div class="twin-metric">Engine {power['engine']*100:.0f}% | Battery {power['battery']*100:.0f}% | FC {power['fc']*100:.0f}%</div>
        <div class="twin-status" style="color: {COLORS['accent']};">{power['status']}</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(power['demand'], motor_color)}">
        ↓ {'▓' * int(5)}↘ Inverter {power['demand'] * 0.98:.1f} kW
    </div>

    <!-- Inverter -->
    <div class="twin-component" style="border-left-color: {motor_color};">
        <div class="twin-label">🔌 Inverter</div>
        <div class="twin-metric">Output: {power['demand'] * 0.98:.1f} kW</div>
        <div class="twin-metric">Efficiency: 98%</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(power['demand'] * 0.93, motor_color)}">
        ↓ {'▓' * int(5)}↘ PMSM Motor
    </div>

    <!-- Motor -->
    <div class="twin-component" style="border-left-color: {motor_color};">
        <div class="twin-label">🔄 PMSM Motor</div>
        <div class="twin-metric">Power: {power['demand'] * 0.93:.1f} kW</div>
        <div class="twin-metric">RPM: {2000 + power['demand'] * 15:.0f}</div>
        <div class="twin-metric">Efficiency: 95%</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(power['demand'] * 0.79, prop_color)}">
        ↓ {'▓' * int(5)}↘ Propeller
    </div>

    <!-- Propeller -->
    <div class="twin-component" style="border-left-color: {prop_color};">
        <div class="twin-label">🔄 Variable Pitch Prop</div>
        <div class="twin-metric">Power: {power['demand'] * 0.79:.1f} kW</div>
        <div class="twin-metric">RPM: {1500 + power['demand'] * 10:.0f}</div>
        <div class="twin-metric">Pitch: {'Auto' if pr > 0.5 else 'Cruise'}</div>
    </div>

    <div class="flow-arrow" style="{arrow_css(power['demand'] * 0.79, COLORS['accent_2'])}">
        ↓ {'▓' * int(5)}↘ AIRCRAFT
    </div>

    <div class="twin-component" style="border-left-color: {COLORS['accent_2']};">
        <div class="twin-label">✈️ Aircraft</div>
        <div class="twin-metric">Thrust: {power['demand'] * 13:.0f} N</div>
        <div class="twin-metric">Speed: {35 + power['demand'] * 0.7:.1f} m/s</div>
        <div class="twin-metric">Altitude: {get_demo_altitude(demo_time):.0f} m</div>
    </div>

    <div class="glass-card" style="margin-top: 14px; padding: 12px; text-align: center;">
        <p style="color: {COLORS['accent']}; margin: 0; font-size: 14px;">
        <b>APEMS DECISION:</b> {power['status']}
        </p>
        <p style="color: {COLORS['text_dim']}; margin: 4px 0 0 0; font-size: 12px;">
        {power['reason']} — {power['why']}
        </p>
    </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def get_demo_altitude(demo_time):
    """Get aircraft altitude based on demo time."""
    phase = get_demo_phase(demo_time)
    pr = get_demo_progress(demo_time)
    alt_map = {
        'Takeoff': 0 + pr * 50,
        'Climb': 50 + pr * 2950,
        'Cruise': 3000 + pr * 2000,
        'Loiter': 5000,
        'Descent': 5000 - pr * 4500,
        'Landing': 500 - pr * 480,
    }
    return alt_map.get(phase, 0)


# =============================================================================
# MISSION LOG
# =============================================================================

def render_mission_log(demo_time):
    """Render the live mission log."""
    st.markdown("### 📜 Mission Log")
    events = [e for e in MISSION_LOG if e[0] <= demo_time]
    if not events:
        st.markdown('<div class="glass-card" style="color:#8b98a9;">Waiting for mission start...</div>', unsafe_allow_html=True)
        return
    log_html = '<div class="glass-card" style="max-height:300px; overflow-y:auto; font-size:13px;">'
    icon = '✅' if demo_time >= 180 else '🔄'
    for ts, msg in events:
        color = COLORS['accent'] if ts <= demo_time else COLORS['text_dim']
        status = '✓' if ts < demo_time else '•'
        log_html += f'<div style="color:{COLORS["text"]}; padding:2px 0;"><span style="color:{COLORS["warning"]};">{ts:02d}:{0:02d}</span> <span style="color:{color};">{msg}</span></div>'
    if demo_time < 180:
        next_evt = next((e for e in MISSION_LOG if e[0] > demo_time), None)
        if next_evt:
            log_html += f'<div style="color:{COLORS["text_dim"]}; padding:2px 0; animation: pulse 1s infinite;">… {next_evt[0]-demo_time:.0f}s to next event</div>'
    log_html += '</div>'
    st.markdown(log_html, unsafe_allow_html=True)


# =============================================================================
# LIVE MATHEMATICAL CALCULATIONS
# =============================================================================

def render_live_calculations(demo_time, df):
    """Render live mathematical calculations."""
    sim_t = demo_to_sim_time(demo_time)
    idx = min(int(np.searchsorted(df['time'].values, sim_t)), len(df) - 1)
    r = df.iloc[idx]

    st.markdown("### 🧮 Live Engineering Calculations")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### 🌬️ Aerodynamics")
        rho = 1.225 * (1 - 0.0065 * r['altitude'] / 288.15) ** 4.256
        q = 0.5 * rho * r['velocity'] ** 2
        with st.expander("Dynamic Pressure — q = ½·ρ·V²", expanded=True):
            st.markdown(f"""```
ρ = {rho:.4f} kg/m³ (ISA at {r['altitude']:.0f} m)
V = {r['velocity']:.1f} m/s
q = ½ × {rho:.4f} × ({r['velocity']:.1f})²
q = ½ × {rho:.4f} × {r['velocity']**2:.1f}
q = {q:.1f} Pa
```""")
            st.info(f"Dynamic pressure available for lift generation.")

        with st.expander("Lift — L = ½·ρ·V²·S·C_L", expanded=True):
            lift = q * 12.5 * r['cl']
            st.markdown(f"""```
q = {q:.1f} Pa (computed above)
S = 12.5 m²
C_L = {r['cl']:.3f}
L = {q:.1f} × 12.5 × {r['cl']:.3f}
L = {lift/1000:.1f} kN
```""")
            st.info(f"Lift = {lift/1000:.1f} kN vs Weight = {r['mass']*9.81/1000:.1f} kN → {'Lift > Weight (Climbing)' if lift > r['mass']*9.81 else 'Lift ≈ Weight (Level)'}")

        with st.expander("Drag — D = ½·ρ·V²·S·C_D", expanded=True):
            cdi = r['cl'] ** 2 / (np.pi * 11.52 * 0.82)
            cdt = 0.025 + cdi
            drag = q * 12.5 * cdt
            st.markdown(f"""```
C_Di = C_L²/(π·A·e) = {r['cl']:.3f}²/(π × 11.52 × 0.82) = {cdi:.4f}
C_D = C_D0 + C_Di = 0.025 + {cdi:.4f} = {cdt:.4f}
D = {q:.1f} × 12.5 × {cdt:.4f}
D = {drag:.1f} N
```""")
            st.info(f"Thrust required: T = D = {drag:.1f} N")

        with st.expander("Power — P = T·V", expanded=True):
            pw = drag * r['velocity'] / 1000
            st.markdown(f"""```
P = {drag:.1f} × {r['velocity']:.1f} = {drag*r['velocity']:.0f} W
P = {pw:.1f} kW
```""")
            st.info(f"Required power: {pw:.1f} kW")

    with col2:
        st.markdown("#### 🔋 Battery")
        with st.expander("Battery Power — P = V·I", expanded=True):
            v = r['battery_voltage']
            i = r['battery_current']
            st.markdown(f"""```
V = {v:.1f} V
I = {i:.1f} A
P = {v:.1f} × {i:.1f}
P = {v*i/1000:.1f} kW
```""")
            st.info(f"Battery delivering {v*i/1000:.1f} kW")

        with st.expander("SOC Update — SOC_new = SOC_old − IΔt/Capacity", expanded=True):
            soc_new = r['soc'] - (i * 1.0) / (54.0 * 3600)
            st.markdown(f"""```
SOC_old = {r['soc']*100:.1f}%
I = {i:.1f} A
Δt = 1 s
Capacity = 54 Ah
ΔSOC = ({i:.1f} × 1) / (54 × 3600) = {(i*1.0)/(54*3600):.5f}
SOC_new = {r['soc']*100:.1f}% − {(i*1.0)/(54*3600)*100:.4f}%
SOC_new = {soc_new*100:.1f}%
```""")
            st.info(f"SOC: {r['soc']*100:.1f}% → {soc_new*100:.1f}%")

        st.markdown("#### ⛽ Fuel")
        with st.expander("Engine Fuel Burn — ṁ = P/(η·LHV)", expanded=True):
            mdot = (r['engine_power'] * 1000) / (0.35 * 43.2e6)
            st.markdown(f"""```
P = {r['engine_power']:.1f} kW = {r['engine_power']*1000:.0f} W
η = 35%
LHV = 43.2 MJ/kg
ṁ = {r['engine_power']*1000:.0f} / (0.35 × 43.2 × 10⁶)
ṁ = {mdot*1000:.2f} g/s = {mdot*3600:.2f} kg/hr
```""")
            st.info(f"Jet-A remaining: {r['jet_a_remaining']:.1f} kg")

        st.markdown("#### ⏱️ Endurance")
        with st.expander("Total Endurance — t = E/P", expanded=True):
            batt_end = r['battery_energy'] / max(0.1, r['battery_power'])
            fuel_end = r['jet_a_energy'] / max(0.1, r['engine_power'])
            fc_end = r['h2_energy'] / max(0.1, r['fc_power'])
            tot_end = batt_end + fuel_end + fc_end
            st.markdown(f"""```
t_batt = {r['battery_energy']:.1f} / {max(0.1, r['battery_power']):.1f} = {batt_end:.1f} h
t_fuel = {r['jet_a_energy']:.1f} / {max(0.1, r['engine_power']):.1f} = {fuel_end:.1f} h
t_FC = {r['h2_energy']:.1f} / {max(0.1, r['fc_power']):.1f} = {fc_end:.1f} h
t_total = {batt_end:.1f} + {fuel_end:.1f} + {fc_end:.1f} = {tot_end:.1f} h
t_total = {tot_end*60:.0f} minutes
```""")
            st.info(f"Range: {r['remaining_range']:.1f} km")

        st.markdown("#### ⚡ Power Balance")
        with st.expander("P_engine + P_battery + P_FC = P_motor + P_loss", expanded=True):
            p_in = r['engine_power'] + r['battery_power'] + r['fc_power']
            p_out = r['motor_power'] + r['engine_loss'] + r['generator_loss'] + r['inverter_loss'] + r['motor_loss'] + r['propeller_loss'] * 0.3
            st.markdown(f"""```
P_in = {r['engine_power']:.1f} + {r['battery_power']:.1f} + {r['fc_power']:.1f} = {p_in:.1f} kW
P_out = P_motor + Σ losses = {r['motor_power']:.1f} + {r['engine_loss'] + r['generator_loss'] + r['inverter_loss'] + r['motor_loss'] + r['propeller_loss']*0.3:.1f} = {p_out:.1f} kW
Balance: {'✓ SATISFIED' if abs(p_in - p_out) < p_in * 0.3 else '⚠ CHECK'}
```""")
            st.info(f"Input: {p_in:.1f} kW → Output + Losses: {p_out:.1f} kW")


# =============================================================================
# ENGINEERING CALCULATION INSPECTOR
# =============================================================================

def render_calculation_inspector(demo_time, df):
    """Render interactive calculation inspector."""
    sim_t = demo_to_sim_time(demo_time)
    idx = min(int(np.searchsorted(df['time'].values, sim_t)), len(df) - 1)
    r = df.iloc[idx]

    st.markdown("### 🔍 Engineering Calculation Inspector")
    st.markdown("Click any equation to expand the full calculation.")

    eqs = [
        ("Lift — L = ½·ρ·V²·S·C_L", "Aerodynamics", lambda: lift_force(r['velocity'], r['altitude'], 12.5, r['cl'])),
        ("Drag — D = ½·ρ·V²·S·C_D", "Aerodynamics", lambda: drag_force(r['velocity'], r['altitude'], 12.5, r['cl'], 0.025, 11.52, 0.82)),
        ("Dynamic Pressure — q = ½·ρ·V²", "Aerodynamics", lambda: dynamic_pressure(r['velocity'], r['altitude'])),
        ("Required Power — P = T·V", "Aerodynamics", lambda: required_power(r['thrust'], r['velocity'])),
        ("Stall Speed", "Aerodynamics", lambda: stall_speed(r['mass'], r['altitude'], 12.5, 1.5)),
        ("Mach Number — M = V/a", "Aerodynamics", lambda: mach_number(r['velocity'], r['altitude'])),
        ("Reynolds Number — Re = ρVc/μ", "Aerodynamics", lambda: reynolds_number(r['velocity'], r['altitude'], 12.5/12.0)),
        ("Battery Power — P = V·I", "Battery", lambda: battery_power(r['battery_voltage'], r['battery_current'])),
        ("SOC Update", "Battery", lambda: soc_update(r['soc'], r['battery_current'], 1.0, 54.0)),
        ("Remaining Energy", "Battery", lambda: remaining_energy(40.0, r['soc'])),
        ("Engine Fuel Burn — ṁ = P/(ηLHV)", "Fuel", lambda: engine_fuel_burn(r['engine_power'], 0.35, 43.2)),
        ("Total Endurance", "Endurance", lambda: total_endurance(r['battery_endurance'], r['fuel_endurance'], r['fc_endurance'])),
        ("Remaining Range — R = V·t", "Endurance", lambda: remaining_range(r['velocity'], r['total_endurance'])),
    ]

    for name, cat, func in eqs:
        with st.expander(f"[{cat}] {name}", expanded=False):
            try:
                eq = func()
                st.markdown(f"**Formula:** `{eq.formula}`")
                st.markdown("**Variables:**")
                for vn, vi in eq.variables.items():
                    st.markdown(f"- `{vn} = {vi['value']:.4g} {vi['unit']}` — {vi['desc']}")
                st.markdown("**Step-by-Step:**")
                for s in eq.steps:
                    st.markdown(f"```{s}```")
                st.markdown(f"**Answer:** `{eq.answer:.4g} {eq.unit}`")
                st.info(f"**Interpretation:** {eq.interpretation}")
            except Exception as e:
                st.error(f"Error: {e}")


# =============================================================================
# LIVE KPI ANIMATIONS
# =============================================================================

def render_live_kpis(demo_time, df):
    """Render live animated KPIs."""
    sim_t = demo_to_sim_time(demo_time)
    idx = min(int(np.searchsorted(df['time'].values, sim_t)), len(df) - 1)
    r = df.iloc[idx]
    phase = get_demo_phase(demo_time)
    power = DEMO_POWER[phase]

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.plotly_chart(gauge_plot(r['soc']*100, "Battery SOC", 0, 100, COLORS['battery'], "%"), use_container_width=True)
    with c2:
        st.plotly_chart(gauge_plot(r['jet_a_remaining'], "Jet-A Fuel", 0, 200, COLORS['engine'], "kg"), use_container_width=True)
    with c3:
        st.plotly_chart(gauge_plot(r['h2_remaining'], "Hydrogen", 0, 8, COLORS['fuel_cell'], "kg"), use_container_width=True)
    with c4:
        st.plotly_chart(gauge_plot(power['demand'], "Power Demand", 0, 80, COLORS['warning'], "kW"), use_container_width=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.plotly_chart(gauge_plot(r['altitude'], "Altitude", 0, 6000, COLORS['accent'], "m"), use_container_width=True)
    with c2:
        st.plotly_chart(gauge_plot(r['velocity']*3.6, "Speed", 0, 300, COLORS['accent_2'], "km/h"), use_container_width=True)
    with c3:
        st.plotly_chart(gauge_plot(r['distance']/1000, "Distance", 0, 250, COLORS['motor'], "km"), use_container_width=True)
    with c4:
        st.plotly_chart(gauge_plot(r['total_endurance']*60, "Endurance", 0, 120, COLORS['warning'], "min"), use_container_width=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.plotly_chart(gauge_plot(r['remaining_range'], "Range", 0, 400, COLORS['accent_2'], "km"), use_container_width=True)
    with c2:
        st.plotly_chart(gauge_plot(r['overall_efficiency']*100, "Efficiency", 0, 50, COLORS['accent'], "%"), use_container_width=True)
    with c3:
        st.plotly_chart(gauge_plot(r['rpm'], "Engine RPM", 0, 4000, COLORS['engine'], "RPM"), use_container_width=True)
    with c4:
        st.plotly_chart(gauge_plot(r['rpm']*0.6, "Prop RPM", 0, 3000, COLORS['propeller'], "RPM"), use_container_width=True)


# =============================================================================
# FULL LIVE DEMO PAGE
# =============================================================================

def render_live_demo(df):
    """Render the complete live demo page."""
    st.markdown("""
    <div class="dashboard-header">
        <div class="dashboard-title">▶️ Live Mission Demo Mode</div>
        <div class="dashboard-subtitle">3-Minute Automated Engineering Mission Replay</div>
    </div>
    """, unsafe_allow_html=True)

    # Demo controls
    c1, c2, c3, c4 = st.columns([1, 1, 1, 1])
    with c1:
        if not is_demo_active():
            if st.button("▶️ START LIVE DEMO", use_container_width=True):
                start_demo()
                st.rerun()
        else:
            if st.button("⏹ STOP DEMO", use_container_width=True):
                stop_demo()
                st.rerun()
    with c2:
        speed = st.select_slider("Demo Speed", options=[0.5, 1, 2, 4], value=st.session_state.get('demo_speed', 1.0), label_visibility="collapsed")
        st.session_state.demo_speed = speed
    with c3:
        if st.button("↺ RESET", use_container_width=True):
            st.session_state.demo_time = 0.0
            st.session_state.demo_finished = False
            st.rerun()
    with c4:
        st.markdown(f"<div style='color:{COLORS['warning']}; font-size:20px; text-align:center; font-weight:bold;'>⏱ {min(st.session_state.get('demo_time', 0), DEMO_TOTAL):.0f}s / {DEMO_TOTAL}s</div>", unsafe_allow_html=True)

    # Advance demo
    advance_demo()

    demo_time = min(st.session_state.get('demo_time', 0), DEMO_TOTAL)
    phase = get_demo_phase(demo_time)
    pr = get_demo_progress(demo_time)

    if not is_demo_active() and demo_time >= DEMO_TOTAL:
        st.markdown(f"""
        <div class="glass-card" style="text-align:center; border-color: {COLORS['accent_2']};">
            <h3 style="color: {COLORS['accent_2']};"> MISSION COMPLETED</h3>
            <p style="color: {COLORS['text']};">All systems nominal. Replay the mission or explore other pages.</p>
        </div>
        """, unsafe_allow_html=True)

    # Progress bar
    st.progress(min(1.0, demo_time / DEMO_TOTAL))
    st.markdown(f"""
    <div style="text-align:center; margin: 8px 0;">
        <span class="phase-indicator" style="background: {pc(phase)}20; color: {pc(phase)}; border: 1px solid {pc(phase)}40; padding: 6px 20px; border-radius: 20px; font-weight: bold;">
            {phase.upper()} — {pr*100:.0f}%
        </span>
    </div>
    <div style="text-align:center; color: {COLORS['text_dim']};">
        Power Demand: {DEMO_POWER[phase]['demand']:.0f} kW | Engine: {DEMO_POWER[phase]['engine']*100:.0f}% | Battery: {DEMO_POWER[phase]['battery']*100:.0f}% | FC: {DEMO_POWER[phase]['fc']*100:.0f}%
    </div>
    """, unsafe_allow_html=True)

    # Auto-rerun for animation
    if is_demo_active() and demo_time < DEMO_TOTAL:
        time.sleep(0.4 / max(st.session_state.get('demo_speed', 1.0), 0.5))
        st.rerun()

    # 3D Aircraft
    st.markdown("##  Live 3D Aircraft")
    st.plotly_chart(render_3d_aircraft(phase, pr), use_container_width=True)

    # APEMS Digital Twin
    st.markdown("## ⚡ Live APEMS Digital Twin")
    render_apems_twin(demo_time)

    # Why APEMS Made This Decision
    st.markdown("##  Why APEMS Made This Decision")
    pw = DEMO_POWER[phase]
    decision_html = f"""
    <div class="glass-card" style="border-color: {COLORS['accent']};">
        <h4 style="color: {COLORS['accent']};">{phase.upper()} PHASE DECISION</h4>
        <p style="color: {COLORS['accent_2']}; font-size: 16px;"><b>Decision:</b> {pw['status']}</p>
        <p style="color: {COLORS['text']};"><b>Why:</b> {pw['why']}</p>
        <p style="color: {COLORS['text']};"><b>Reason:</b> {pw['reason']}</p>
        <p style="color: {COLORS['text_dim']};">
            Engine: {pw['engine']*100:.0f}% | Battery: {pw['battery']*100:.0f}% | Fuel Cell: {pw['fc']*100:.0f}%
        </p>
    </div>
    """
    st.markdown(decision_html, unsafe_allow_html=True)

    # Live KPIs
    st.markdown("## 📊 Live KPI Animations")
    render_live_kpis(demo_time, df)

    # Live Calculations
    st.markdown("## 🧮 Live Mathematical Calculations")
    render_live_calculations(demo_time, df)

    # Calculation Inspector
    render_calculation_inspector(demo_time, df)

    # Mission Log
    render_mission_log(demo_time)

    # Power flow chart over demo time
    st.markdown("## 📈 Demo Power Distribution")
    t_demo = np.linspace(0, DEMO_TOTAL, 181)
    phases_demo = [get_demo_phase(t) for t in t_demo]
    eng_p = [DEMO_POWER[p]['demand'] * DEMO_POWER[p]['engine'] for p in phases_demo]
    batt_p = [DEMO_POWER[p]['demand'] * DEMO_POWER[p]['battery'] for p in phases_demo]
    fc_p = [DEMO_POWER[p]['demand'] * DEMO_POWER[p]['fc'] for p in phases_demo]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t_demo, y=eng_p, name='Engine', line=dict(color=COLORS['engine'], width=2), fill='tozeroy', stackgroup='one'))
    fig.add_trace(go.Scatter(x=t_demo, y=batt_p, name='Battery', line=dict(color=COLORS['battery'], width=2), fill='tonexty', stackgroup='one'))
    fig.add_trace(go.Scatter(x=t_demo, y=fc_p, name='Fuel Cell', line=dict(color=COLORS['fuel_cell'], width=2), fill='tonexty', stackgroup='one'))
    fig.update_layout(
        title='Demo Power Distribution Across Phases',
        xaxis_title='Demo Time (s)', yaxis_title='Power (kW)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    st.plotly_chart(apply_theme(fig), use_container_width=True)


def pc(phase):
    """Phase color helper."""
    m = {'Takeoff': COLORS['danger'], 'Climb': COLORS['accent_3'], 'Cruise': COLORS['accent'],
         'Loiter': COLORS['accent_2'], 'Descent': COLORS['warning'], 'Landing': COLORS['motor']}
    return m.get(phase, COLORS['text_dim'])