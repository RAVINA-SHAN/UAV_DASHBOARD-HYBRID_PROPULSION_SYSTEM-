"""
Plotting Functions Module
==========================
All Plotly visualization functions for the Aerospace Digital Twin Dashboard.
Separated from the main app for modularity and reusability.

Author: Aerospace Digital Twin Team
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from typing import Dict, List, Any, Optional

# =============================================================================
# THEME COLORS
# =============================================================================

# Aerospace dark theme colors
COLORS = {
    'background': '#0a0e17',
    'panel': '#111827',
    'panel_light': '#1a2332',
    'accent': '#00d4ff',
    'accent_2': '#00ff88',
    'accent_3': '#ff6b35',
    'warning': '#ffd700',
    'danger': '#ff4444',
    'text': '#e0e6ed',
    'text_dim': '#8b98a9',
    'grid': '#1e293b',
    
    # Power source colors
    'engine': '#ff6b35',
    'battery': '#00d4ff',
    'fuel_cell': '#00ff88',
    'generator': '#ffd700',
    'motor': '#a78bfa',
    'propeller': '#f472b6',
    'bus': '#94a3b8',
    'loss': '#ef4444'
}

# Plotly template
PLOTLY_TEMPLATE = {
    'layout': {
        'paper_bgcolor': 'rgba(0,0,0,0)',
        'plot_bgcolor': 'rgba(0,0,0,0)',
        'font': {'color': COLORS['text'], 'family': 'Consolas, monospace'},
        'xaxis': {'gridcolor': COLORS['grid'], 'zerolinecolor': COLORS['grid']},
        'yaxis': {'gridcolor': COLORS['grid'], 'zerolinecolor': COLORS['grid']},
        'margin': {'l': 50, 'r': 20, 't': 40, 'b': 40}
    }
}


def apply_theme(fig: go.Figure) -> go.Figure:
    """Apply the aerospace dark theme to a plotly figure."""
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font={'color': COLORS['text'], 'family': 'Consolas, monospace'},
        xaxis={'gridcolor': COLORS['grid'], 'zerolinecolor': COLORS['grid']},
        yaxis={'gridcolor': COLORS['grid'], 'zerolinecolor': COLORS['grid']},
        margin={'l': 50, 'r': 20, 't': 40, 'b': 40}
    )
    return fig


# =============================================================================
# MISSION OVERVIEW PLOTS
# =============================================================================

def mission_profile_plot(df: pd.DataFrame) -> go.Figure:
    """Create the mission altitude/speed profile plot."""
    fig = make_subplots(specs=[[{'secondary_y': True}]])
    
    # Altitude profile
    fig.add_trace(
        go.Scatter(
            x=df['time']/60, y=df['altitude'],
            name='Altitude',
            line=dict(color=COLORS['accent'], width=2),
            fill='tozeroy',
            fillcolor='rgba(0,212,255,0.1)'
        ),
        secondary_y=False
    )
    
    # Speed profile
    fig.add_trace(
        go.Scatter(
            x=df['time']/60, y=df['velocity']*3.6,
            name='Speed (km/h)',
            line=dict(color=COLORS['accent_2'], width=2, dash='dash')
        ),
        secondary_y=True
    )
    
    # Phase boundaries
    phase_changes = df[df['phase'] != df['phase'].shift()].index
    for idx in phase_changes:
        fig.add_vline(x=df['time'].iloc[idx]/60, line_dash='dot',
                      line_color=COLORS['text_dim'], opacity=0.3)
    
    fig.update_layout(
        title='Mission Profile - Altitude & Speed',
        xaxis_title='Time (min)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    fig.update_yaxes(title_text='Altitude (m)', secondary_y=False)
    fig.update_yaxes(title_text='Speed (km/h)', secondary_y=True)
    
    return apply_theme(fig)


def mission_phase_timeline(df: pd.DataFrame) -> go.Figure:
    """Create the mission phase timeline visualization."""
    phases = df['phase'].unique()
    phase_colors = {
        'Takeoff': COLORS['danger'],
        'Climb': COLORS['accent_3'],
        'Cruise': COLORS['accent'],
        'Loiter': COLORS['accent_2'],
        'Descent': COLORS['warning'],
        'Landing': COLORS['motor']
    }
    
    fig = go.Figure()
    
    for phase in phases:
        phase_df = df[df['phase'] == phase]
        if len(phase_df) > 0:
            fig.add_trace(go.Bar(
                x=[phase_df['time'].iloc[-1]/60 - phase_df['time'].iloc[0]/60],
                y=[phase],
                orientation='h',
                name=phase,
                marker_color=phase_colors.get(phase, COLORS['text_dim']),
                text=f"{phase_df['time'].iloc[-1]/60 - phase_df['time'].iloc[0]/60:.1f} min",
                textposition='inside',
                hovertemplate=f"<b>{phase}</b><br>Duration: {(phase_df['time'].iloc[-1]-phase_df['time'].iloc[0])/60:.1f} min<br>Start: {phase_df['time'].iloc[0]/60:.1f} min<extra></extra>"
            ))
    
    fig.update_layout(
        title='Mission Phase Timeline',
        xaxis_title='Duration (min)',
        barmode='stack',
        showlegend=False,
        height=300
    )
    
    return apply_theme(fig)


def aircraft_position_plot(df: pd.DataFrame, current_idx: int) -> go.Figure:
    """Create the animated aircraft position plot."""
    # Create a 2D flight path visualization
    fig = go.Figure()
    
    # Flight path
    fig.add_trace(go.Scatter(
        x=df['distance']/1000, y=df['altitude'],
        mode='lines',
        name='Flight Path',
        line=dict(color=COLORS['accent'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,212,255,0.05)'
    ))
    
    # Current position
    if current_idx < len(df):
        fig.add_trace(go.Scatter(
            x=[df['distance'].iloc[current_idx]/1000],
            y=[df['altitude'].iloc[current_idx]],
            mode='markers+text',
            name='Aircraft',
            marker=dict(
                symbol='triangle-up',
                size=20,
                color=COLORS['accent_2'],
                line=dict(color='white', width=2)
            ),
            text=['✈'],
            textposition='top center',
            textfont=dict(size=20, color='white')
        ))
    
    # Phase markers
    phase_changes = df[df['phase'] != df['phase'].shift()].index
    for idx in phase_changes:
        fig.add_annotation(
            x=df['distance'].iloc[idx]/1000,
            y=df['altitude'].iloc[idx],
            text=df['phase'].iloc[idx],
            showarrow=False,
            font=dict(size=10, color=COLORS['text_dim'])
        )
    
    fig.update_layout(
        title='Aircraft Position - Flight Path',
        xaxis_title='Distance (km)',
        yaxis_title='Altitude (m)',
        height=400,
        showlegend=False
    )
    
    return apply_theme(fig)


# =============================================================================
# APEMS PLOTS
# =============================================================================

def power_split_plot(df: pd.DataFrame) -> go.Figure:
    """Create the power split area chart."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['engine_pct'],
        name='Engine %',
        line=dict(color=COLORS['engine'], width=2),
        fill='tozeroy',
        stackgroup='one'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['battery_pct'],
        name='Battery %',
        line=dict(color=COLORS['battery'], width=2),
        fill='tonexty',
        stackgroup='one'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['fc_pct'],
        name='Fuel Cell %',
        line=dict(color=COLORS['fuel_cell'], width=2),
        fill='tonexty',
        stackgroup='one'
    ))
    
    fig.update_layout(
        title='APEMS Power Split Distribution',
        xaxis_title='Time (min)',
        yaxis_title='Power Share (%)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def power_flow_sankey(decision: Dict[str, Any]) -> go.Figure:
    """Create the Sankey diagram for power flow."""
    from src.apems import get_sankey_data
    
    data = get_sankey_data(decision)
    
    # Node colors
    node_colors = [
        COLORS['engine'],      # Jet-A Tank
        COLORS['fuel_cell'],   # H2 Tank
        COLORS['battery'],     # Battery
        COLORS['engine'],      # Engine
        COLORS['fuel_cell'],   # Fuel Cell
        COLORS['generator'],   # Generator
        COLORS['bus'],         # 800V Bus
        COLORS['motor'],       # Inverter
        COLORS['motor'],       # Motor
        COLORS['propeller'],   # Propeller
        COLORS['accent_2'],    # Aircraft
        COLORS['loss']         # Losses
    ]
    
    fig = go.Figure(data=[go.Sankey(
        node=dict(
            pad=15,
            thickness=20,
            line=dict(color='rgba(255,255,255,0.3)', width=0.5),
            label=data['labels'],
            color=node_colors
        ),
        link=dict(
            source=data['links']['source'],
            target=data['links']['target'],
            value=data['links']['value'],
            color='rgba(0,212,255,0.3)'
        )
    )])
    
    fig.update_layout(
        title='Power Flow Diagram - APEMS',
        height=500,
        font=dict(size=12)
    )
    
    return apply_theme(fig)


def power_flow_animation(df: pd.DataFrame, current_idx: int) -> go.Figure:
    """Create the animated power flow visualization."""
    fig = go.Figure()
    
    # Power traces for each source
    fig.add_trace(go.Scatter(
        x=df['time'][:current_idx+1]/60,
        y=df['engine_power'][:current_idx+1],
        name='Engine Power',
        line=dict(color=COLORS['engine'], width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time'][:current_idx+1]/60,
        y=df['battery_power'][:current_idx+1],
        name='Battery Power',
        line=dict(color=COLORS['battery'], width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time'][:current_idx+1]/60,
        y=df['fc_power'][:current_idx+1],
        name='Fuel Cell Power',
        line=dict(color=COLORS['fuel_cell'], width=2)
    ))
    
    # Current point markers
    if current_idx < len(df):
        fig.add_trace(go.Scatter(
            x=[df['time'].iloc[current_idx]/60],
            y=[df['engine_power'].iloc[current_idx]],
            mode='markers',
            marker=dict(size=10, color=COLORS['engine']),
            showlegend=False
        ))
        fig.add_trace(go.Scatter(
            x=[df['time'].iloc[current_idx]/60],
            y=[df['battery_power'].iloc[current_idx]],
            mode='markers',
            marker=dict(size=10, color=COLORS['battery']),
            showlegend=False
        ))
        fig.add_trace(go.Scatter(
            x=[df['time'].iloc[current_idx]/60],
            y=[df['fc_power'].iloc[current_idx]],
            mode='markers',
            marker=dict(size=10, color=COLORS['fuel_cell']),
            showlegend=False
        ))
    
    fig.update_layout(
        title='Power Flow Animation',
        xaxis_title='Time (min)',
        yaxis_title='Power (kW)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


# =============================================================================
# PHYSICS PLOTS
# =============================================================================

def aerodynamics_plot(df: pd.DataFrame) -> go.Figure:
    """Create the aerodynamics parameters plot."""
    fig = make_subplots(rows=2, cols=2, subplot_titles=(
        'Lift & Drag Forces', 'Lift-to-Drag Ratio',
        'Dynamic Pressure', 'Mach Number'
    ))
    
    # Lift & Drag
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['lift']/1000,
        name='Lift (kN)',
        line=dict(color=COLORS['accent'], width=2)
    ), row=1, col=1)
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['drag']/1000,
        name='Drag (kN)',
        line=dict(color=COLORS['danger'], width=2)
    ), row=1, col=1)
    
    # L/D ratio
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['ld_ratio'],
        name='L/D',
        line=dict(color=COLORS['accent_2'], width=2)
    ), row=1, col=2)
    
    # Dynamic pressure
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['dynamic_pressure'],
        name='q (Pa)',
        line=dict(color=COLORS['warning'], width=2)
    ), row=2, col=1)
    
    # Mach number
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['mach'],
        name='Mach',
        line=dict(color=COLORS['motor'], width=2)
    ), row=2, col=2)
    
    fig.update_layout(
        title='Aerodynamic Parameters',
        height=600,
        showlegend=True,
        hovermode='x unified'
    )
    
    return apply_theme(fig)


def propulsion_plot(df: pd.DataFrame) -> go.Figure:
    """Create the propulsion chain power plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['engine_power'],
        name='Engine',
        line=dict(color=COLORS['engine'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['generator_power'],
        name='Generator',
        line=dict(color=COLORS['generator'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['motor_power'],
        name='Motor',
        line=dict(color=COLORS['motor'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['propeller_power'],
        name='Propeller',
        line=dict(color=COLORS['propeller'], width=2)
    ))
    
    fig.update_layout(
        title='Propulsion Chain Power',
        xaxis_title='Time (min)',
        yaxis_title='Power (kW)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def efficiency_plot(df: pd.DataFrame) -> go.Figure:
    """Create the efficiency plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['overall_efficiency']*100,
        name='Overall Efficiency',
        line=dict(color=COLORS['accent_2'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,255,136,0.1)'
    ))
    
    fig.update_layout(
        title='Overall Hybrid Propulsion Efficiency',
        xaxis_title='Time (min)',
        yaxis_title='Efficiency (%)',
        hovermode='x unified'
    )
    
    return apply_theme(fig)


# =============================================================================
# BATTERY PLOTS
# =============================================================================

def battery_plot(df: pd.DataFrame) -> go.Figure:
    """Create the battery parameters plot."""
    fig = make_subplots(rows=2, cols=2, subplot_titles=(
        'State of Charge', 'Battery Voltage',
        'Battery Current', 'Battery Temperature'
    ))
    
    # SOC
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['soc']*100,
        name='SOC (%)',
        line=dict(color=COLORS['battery'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,212,255,0.1)'
    ), row=1, col=1)
    
    # Voltage
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['battery_voltage'],
        name='Voltage (V)',
        line=dict(color=COLORS['accent'], width=2)
    ), row=1, col=2)
    
    # Current
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['battery_current'],
        name='Current (A)',
        line=dict(color=COLORS['warning'], width=2)
    ), row=2, col=1)
    
    # Temperature
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['battery_temp'],
        name='Temp (°C)',
        line=dict(color=COLORS['danger'], width=2)
    ), row=2, col=2)
    
    fig.update_layout(
        title='Battery System Parameters',
        height=600,
        showlegend=True,
        hovermode='x unified'
    )
    
    return apply_theme(fig)


# =============================================================================
# FUEL PLOTS
# =============================================================================

def fuel_remaining_plot(df: pd.DataFrame) -> go.Figure:
    """Create the fuel remaining plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['jet_a_remaining'],
        name='Jet-A (kg)',
        line=dict(color=COLORS['engine'], width=2),
        fill='tozeroy',
        fillcolor='rgba(255,107,53,0.1)'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['h2_remaining'],
        name='H2 (kg)',
        line=dict(color=COLORS['fuel_cell'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,255,136,0.1)'
    ))
    
    fig.update_layout(
        title='Fuel Remaining',
        xaxis_title='Time (min)',
        yaxis_title='Mass (kg)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def fuel_burn_rate_plot(df: pd.DataFrame) -> go.Figure:
    """Create the fuel burn rate plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['jet_a_burn_rate']*3600,
        name='Jet-A (kg/hr)',
        line=dict(color=COLORS['engine'], width=2)
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['h2_burn_rate']*3600,
        name='H2 (kg/hr)',
        line=dict(color=COLORS['fuel_cell'], width=2)
    ))
    
    fig.update_layout(
        title='Instantaneous Fuel Burn Rate',
        xaxis_title='Time (min)',
        yaxis_title='Burn Rate (kg/hr)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def cumulative_fuel_plot(df: pd.DataFrame) -> go.Figure:
    """Create the cumulative fuel consumption plot."""
    # Calculate cumulative fuel
    jet_a_cum = 200.0 - df['jet_a_remaining']
    h2_cum = 8.0 - df['h2_remaining']
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=jet_a_cum,
        name='Jet-A Consumed (kg)',
        line=dict(color=COLORS['engine'], width=2),
        fill='tozeroy',
        fillcolor='rgba(255,107,53,0.1)'
    ))
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=h2_cum,
        name='H2 Consumed (kg)',
        line=dict(color=COLORS['fuel_cell'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,255,136,0.1)'
    ))
    
    fig.update_layout(
        title='Cumulative Fuel Consumption',
        xaxis_title='Time (min)',
        yaxis_title='Fuel Consumed (kg)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def phase_fuel_bar_plot(df: pd.DataFrame) -> go.Figure:
    """Create the phase-wise fuel consumption bar chart."""
    phases = ['Takeoff', 'Climb', 'Cruise', 'Loiter', 'Descent', 'Landing']
    
    jet_a_phase = []
    h2_phase = []
    
    for phase in phases:
        phase_df = df[df['phase'] == phase]
        if len(phase_df) > 0:
            jet_a_phase.append(phase_df[f'phase_jet_a_{phase.lower()}'].iloc[-1])
            h2_phase.append(phase_df[f'phase_h2_{phase.lower()}'].iloc[-1])
        else:
            jet_a_phase.append(0)
            h2_phase.append(0)
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=phases, y=jet_a_phase,
        name='Jet-A (kg)',
        marker_color=COLORS['engine']
    ))
    
    fig.add_trace(go.Bar(
        x=phases, y=h2_phase,
        name='H2 (kg)',
        marker_color=COLORS['fuel_cell']
    ))
    
    fig.update_layout(
        title='Fuel Consumption by Mission Phase',
        xaxis_title='Phase',
        yaxis_title='Fuel Consumed (kg)',
        barmode='group',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


# =============================================================================
# ENDURANCE PLOTS
# =============================================================================

def endurance_plot(df: pd.DataFrame) -> go.Figure:
    """Create the endurance breakdown plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['battery_endurance'],
        name='Battery (h)',
        line=dict(color=COLORS['battery'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['fuel_endurance'],
        name='Fuel (h)',
        line=dict(color=COLORS['engine'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['fc_endurance'],
        name='Fuel Cell (h)',
        line=dict(color=COLORS['fuel_cell'], width=2)
    ))
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['total_endurance'],
        name='Total (h)',
        line=dict(color=COLORS['accent'], width=3)
    ))
    
    fig.update_layout(
        title='Endurance Breakdown',
        xaxis_title='Time (min)',
        yaxis_title='Endurance (hours)',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def remaining_range_plot(df: pd.DataFrame) -> go.Figure:
    """Create the remaining range plot."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['remaining_range'],
        name='Remaining Range (km)',
        line=dict(color=COLORS['accent_2'], width=2),
        fill='tozeroy',
        fillcolor='rgba(0,255,136,0.1)'
    ))
    
    fig.update_layout(
        title='Remaining Range',
        xaxis_title='Time (min)',
        yaxis_title='Range (km)',
        hovermode='x unified'
    )
    
    return apply_theme(fig)


# =============================================================================
# OPTIMIZATION PLOTS
# =============================================================================

def optimization_comparison_plot(results: Dict[str, Any]) -> go.Figure:
    """Create the baseline vs optimized comparison plot."""
    baseline = results['baseline']
    optimized = results['optimized']
    metrics = results['metrics']
    
    # Parameters to compare
    params = ['engine_power', 'battery_capacity', 'fc_power', 'h2_capacity',
              'jet_a_capacity', 'motor_power', 'propeller_diameter']
    labels = ['Engine (kW)', 'Battery (kWh)', 'FC (kW)', 'H2 (kg)',
              'Jet-A (kg)', 'Motor (kW)', 'Prop Dia (m)']
    
    base_vals = [baseline[p] for p in params]
    opt_vals = [optimized[p] for p in params]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=labels, y=base_vals,
        name='Baseline',
        marker_color='rgba(139,152,169,0.5)'
    ))
    
    fig.add_trace(go.Bar(
        x=labels, y=opt_vals,
        name='Optimized',
        marker_color=COLORS['accent_2']
    ))
    
    fig.update_layout(
        title='Design Parameter Comparison - Baseline vs Optimized',
        xaxis_title='Parameter',
        yaxis_title='Value',
        barmode='group',
        legend=dict(orientation='h', yanchor='bottom', y=1.02)
    )
    
    return apply_theme(fig)


def improvement_radar_plot(results: Dict[str, Any]) -> go.Figure:
    """Create the improvement radar chart."""
    metrics = results['metrics']
    
    categories = ['Fuel Saved', 'Battery Saved', 'Efficiency Gain', 'Endurance Gain', 'Range Gain']
    values = [
        max(0, metrics['fuel_saved_pct']),
        max(0, metrics['battery_saved_pct']),
        max(0, metrics['efficiency_gain_pct']),
        max(0, metrics['endurance_gain_pct']),
        max(0, metrics['range_gain_pct'])
    ]
    
    # Close the radar
    categories.append(categories[0])
    values.append(values[0])
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=categories,
        fill='toself',
        name='Improvement',
        line=dict(color=COLORS['accent_2'], width=2),
        fillcolor='rgba(0,255,136,0.2)'
    ))
    
    fig.update_layout(
        title='Optimization Improvement Radar',
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, max(100, max(values))]
            )
        ),
        showlegend=False,
        height=500
    )
    
    return apply_theme(fig)


# =============================================================================
# GAUGE PLOTS
# =============================================================================

def gauge_plot(value: float, title: str, min_val: float = 0, max_val: float = 100,
               color: str = None, unit: str = '') -> go.Figure:
    """Create an animated gauge chart."""
    if color is None:
        color = COLORS['accent']
    
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=value,
        title={'text': f"<b>{title}</b><br><span style='font-size:12px'>{unit}</span>"},
        delta={'reference': max_val},
        gauge={
            'axis': {'range': [min_val, max_val], 'tickcolor': COLORS['text']},
            'bar': {'color': color},
            'bgcolor': 'rgba(0,0,0,0)',
            'borderwidth': 2,
            'bordercolor': COLORS['grid'],
            'steps': [
                {'range': [min_val, max_val*0.6], 'color': 'rgba(0,212,255,0.1)'},
                {'range': [max_val*0.6, max_val*0.8], 'color': 'rgba(255,215,0,0.1)'},
                {'range': [max_val*0.8, max_val], 'color': 'rgba(255,68,68,0.1)'}
            ],
            'threshold': {
                'line': {'color': COLORS['danger'], 'width': 2},
                'thickness': 0.75,
                'value': max_val * 0.9
            }
        }
    ))
    
    fig.update_layout(
        height=250,
        margin=dict(l=30, r=30, t=50, b=30)
    )
    
    return apply_theme(fig)


def multi_gauge_plot(gauges: List[Dict[str, Any]]) -> go.Figure:
    """Create multiple gauges in a single figure."""
    fig = make_subplots(
        rows=1, cols=len(gauges),
        subplot_titles=[g['title'] for g in gauges]
    )
    
    for i, g in enumerate(gauges):
        fig.add_trace(go.Indicator(
            mode="gauge+number",
            value=g['value'],
            title={'text': g['title']},
            gauge={
                'axis': {'range': [g.get('min', 0), g.get('max', 100)]},
                'bar': {'color': g.get('color', COLORS['accent'])},
                'bgcolor': 'rgba(0,0,0,0)',
                'borderwidth': 2,
                'bordercolor': COLORS['grid']
            }
        ), row=1, col=i+1)
    
    fig.update_layout(
        height=250,
        showlegend=False
    )
    
    return apply_theme(fig)


# =============================================================================
# MISSION SUMMARY PLOTS
# =============================================================================

def mission_summary_plot(df: pd.DataFrame) -> go.Figure:
    """Create the mission summary dashboard plot."""
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('Power Distribution', 'Energy Sources',
                       'Altitude Profile', 'Speed Profile'),
        specs=[[{'type': 'domain'}, {'type': 'xy'}],
               [{'type': 'xy'}, {'type': 'xy'}]]
    )
    
    # Power distribution pie
    avg_engine = df['engine_power'].mean()
    avg_battery = df['battery_power'].mean()
    avg_fc = df['fc_power'].mean()
    
    fig.add_trace(go.Pie(
        labels=['Engine', 'Battery', 'Fuel Cell'],
        values=[avg_engine, avg_battery, avg_fc],
        marker=dict(colors=[COLORS['engine'], COLORS['battery'], COLORS['fuel_cell']]),
        hole=0.4
    ), row=1, col=1)
    
    # Energy sources
    total_jet_a = 200.0 - df['jet_a_remaining'].iloc[-1]
    total_h2 = 8.0 - df['h2_remaining'].iloc[-1]
    total_batt = 40.0 * (1 - df['soc'].iloc[-1])
    
    fig.add_trace(go.Bar(
        x=['Jet-A', 'H2', 'Battery'],
        y=[total_jet_a, total_h2, total_batt],
        marker_color=[COLORS['engine'], COLORS['fuel_cell'], COLORS['battery']]
    ), row=1, col=2)
    
    # Altitude
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['altitude'],
        line=dict(color=COLORS['accent'], width=2)
    ), row=2, col=1)
    
    # Speed
    fig.add_trace(go.Scatter(
        x=df['time']/60, y=df['velocity']*3.6,
        line=dict(color=COLORS['accent_2'], width=2)
    ), row=2, col=2)
    
    fig.update_layout(
        title='Mission Summary',
        height=700,
        showlegend=False
    )
    
    return apply_theme(fig)