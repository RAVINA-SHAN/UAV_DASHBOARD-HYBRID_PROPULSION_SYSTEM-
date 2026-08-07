"""
Adaptive Power & Energy Management System (APEMS)
==================================================
The APEMS is the intelligent controller that determines the optimal
power split between the engine, battery, and fuel cell at every
moment of the mission.

This module implements the decision logic, constraint checking,
and optimization of the power distribution.

Author: Aerospace Digital Twin Team
"""

import numpy as np
from typing import Dict, List, Any

# =============================================================================
# APEMS CONSTANTS
# =============================================================================

# System limits
ENGINE_MAX_POWER = 120.0    # kW
BATTERY_MAX_POWER = 80.0    # kW
FC_MAX_POWER = 60.0         # kW
MOTOR_MAX_POWER = 150.0     # kW
GENERATOR_MAX_POWER = 110.0 # kW

# Constraints
MIN_SOC = 0.20              # Minimum battery state of charge
MIN_JET_A = 5.0             # kg - minimum fuel reserve
MIN_H2 = 0.5                # kg - minimum hydrogen reserve
MAX_BATTERY_TEMP = 60.0     # °C

# =============================================================================
# APEMS DECISION STRATEGIES
# =============================================================================

# Mission phase strategies with power split ratios and reasoning
PHASE_STRATEGIES = {
    'Takeoff': {
        'engine': 0.70, 'battery': 0.30, 'fuel_cell': 0.00,
        'strategy': 'MAX_POWER',
        'reason': 'Maximum Takeoff Power - High thrust demand requires engine + battery boost',
        'priority': 'Power'
    },
    'Climb': {
        'engine': 0.60, 'battery': 0.20, 'fuel_cell': 0.20,
        'strategy': 'BALANCED',
        'reason': 'Sustained climb power - balanced hybrid operation for optimal efficiency',
        'priority': 'Power + Efficiency'
    },
    'Cruise': {
        'engine': 0.40, 'battery': 0.10, 'fuel_cell': 0.50,
        'strategy': 'MAX_FUEL_ECONOMY',
        'reason': 'Maximum Fuel Economy - fuel cell carries cruise load, engine at optimal SFC',
        'priority': 'Efficiency'
    },
    'Loiter': {
        'engine': 0.30, 'battery': 0.10, 'fuel_cell': 0.60,
        'strategy': 'MAX_ENDURANCE',
        'reason': 'Maximum Endurance - fuel cell dominates for extended loiter capability',
        'priority': 'Endurance'
    },
    'Descent': {
        'engine': 0.30, 'battery': 0.40, 'fuel_cell': 0.30,
        'strategy': 'REDUCED_POWER',
        'reason': 'Reduced power requirement - regenerative braking opportunity for battery',
        'priority': 'Energy Recovery'
    },
    'Landing': {
        'engine': 0.40, 'battery': 0.60, 'fuel_cell': 0.00,
        'strategy': 'NOISE_REDUCTION',
        'reason': 'Noise Reduction - electric-only approach for quiet landing operation',
        'priority': 'Noise + Safety'
    }
}


class APEMSController:
    """
    Adaptive Power & Energy Management System Controller.
    
    This class implements the intelligent power distribution logic
    that optimizes the hybrid propulsion system operation.
    """
    
    def __init__(self):
        """Initialize the APEMS controller with default state."""
        self.current_phase = 'Takeoff'
        self.soc = 0.95
        self.jet_a_remaining = 200.0
        self.h2_remaining = 8.0
        self.battery_temp = 25.0
        self.power_required = 0.0
        
        # Decision history
        self.decision_history: List[Dict[str, Any]] = []
        
    def update_state(self, phase: str, power_required: float, soc: float,
                     jet_a: float, h2: float, battery_temp: float = 25.0):
        """
        Update the current system state before making a decision.
        
        Parameters:
        -----------
        phase : str
            Current mission phase
        power_required : float
            Total power required in kW
        soc : float
            Battery state of charge (0-1)
        jet_a : float
            Remaining Jet-A fuel in kg
        h2 : float
            Remaining hydrogen in kg
        battery_temp : float
            Battery temperature in °C
        """
        self.current_phase = phase
        self.power_required = power_required
        self.soc = soc
        self.jet_a_remaining = jet_a
        self.h2_remaining = h2
        self.battery_temp = battery_temp
    
    def _check_constraints(self, engine_p, battery_p, fc_p) -> Dict[str, Any]:
        """
        Check all system constraints and apply corrections.
        
        Returns:
        --------
        dict with corrected powers and constraint messages
        """
        messages = []
        
        # Battery SOC constraint
        if self.soc < MIN_SOC and battery_p > 0:
            reduction = battery_p * 0.5
            battery_p -= reduction
            engine_p += reduction * 0.7
            fc_p += reduction * 0.3
            messages.append(f"SOC {self.soc:.0%} below {MIN_SOC:.0%} limit - battery reduced")
        
        # Battery temperature constraint
        if self.battery_temp > MAX_BATTERY_TEMP and battery_p > 0:
            reduction = battery_p * 0.3
            battery_p -= reduction
            engine_p += reduction
            messages.append(f"Battery temp {self.battery_temp:.0f}°C above {MAX_BATTERY_TEMP:.0f}°C - thermal derating")
        
        # Engine power limit
        if engine_p > ENGINE_MAX_POWER:
            excess = engine_p - ENGINE_MAX_POWER
            engine_p = ENGINE_MAX_POWER
            battery_p += excess * 0.6
            fc_p += excess * 0.4
            messages.append(f"Engine at {ENGINE_MAX_POWER:.0f} kW limit - excess to battery/FC")
        
        # Battery power limit
        if battery_p > BATTERY_MAX_POWER:
            excess = battery_p - BATTERY_MAX_POWER
            battery_p = BATTERY_MAX_POWER
            engine_p += excess
            messages.append(f"Battery at {BATTERY_MAX_POWER:.0f} kW limit - excess to engine")
        
        # Fuel cell power limit
        if fc_p > FC_MAX_POWER:
            excess = fc_p - FC_MAX_POWER
            fc_p = FC_MAX_POWER
            engine_p += excess * 0.5
            battery_p += excess * 0.5
            messages.append(f"Fuel cell at {FC_MAX_POWER:.0f} kW limit - excess to engine/battery")
        
        # Fuel constraints
        if self.jet_a_remaining < MIN_JET_A and engine_p > 0:
            reduction = engine_p * 0.5
            engine_p -= reduction
            battery_p += reduction * 0.5
            fc_p += reduction * 0.5
            messages.append(f"Jet-A below {MIN_JET_A:.0f} kg reserve - engine reduced")
        
        if self.h2_remaining < MIN_H2 and fc_p > 0:
            reduction = fc_p * 0.5
            fc_p -= reduction
            battery_p += reduction
            messages.append(f"H2 below {MIN_H2:.1f} kg reserve - fuel cell reduced")
        
        # Power balance check
        total = engine_p + battery_p + fc_p
        if total < self.power_required * 0.95:
            # Not enough power - increase engine
            deficit = self.power_required - total
            engine_p += deficit
            messages.append(f"Power deficit {deficit:.1f} kW - engine increased")
        
        return {
            'engine_power': max(0, engine_p),
            'battery_power': max(0, battery_p),
            'fc_power': max(0, fc_p),
            'messages': messages
        }
    
    def decide(self) -> Dict[str, Any]:
        """
        Make the APEMS power split decision.
        
        Returns:
        --------
        dict with power split, percentages, and reasoning
        """
        strategy = PHASE_STRATEGIES.get(self.current_phase, PHASE_STRATEGIES['Cruise'])
        
        # Base power split from strategy
        engine_p = self.power_required * strategy['engine']
        battery_p = self.power_required * strategy['battery']
        fc_p = self.power_required * strategy['fuel_cell']
        
        # Apply constraints
        result = self._check_constraints(engine_p, battery_p, fc_p)
        engine_p = result['engine_power']
        battery_p = result['battery_power']
        fc_p = result['fc_power']
        constraint_msgs = result['messages']
        
        # Calculate percentages
        total = engine_p + battery_p + fc_p
        if total > 0:
            engine_pct = engine_p / total * 100
            battery_pct = battery_p / total * 100
            fc_pct = fc_p / total * 100
        else:
            engine_pct = battery_pct = fc_pct = 0
        
        # Build decision record
        decision = {
            'phase': self.current_phase,
            'strategy': strategy['strategy'],
            'priority': strategy['priority'],
            'power_required': self.power_required,
            'engine_power': engine_p,
            'battery_power': battery_p,
            'fc_power': fc_p,
            'engine_pct': engine_pct,
            'battery_pct': battery_pct,
            'fc_pct': fc_pct,
            'reason': strategy['reason'],
            'constraints': constraint_msgs,
            'soc': self.soc,
            'jet_a': self.jet_a_remaining,
            'h2': self.h2_remaining,
            'battery_temp': self.battery_temp
        }
        
        # Record decision
        self.decision_history.append(decision)
        
        return decision
    
    def get_decision_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the current APEMS decision for display.
        """
        decision = self.decide()
        
        # Determine dominant source
        sources = {
            'Engine': decision['engine_pct'],
            'Battery': decision['battery_pct'],
            'Fuel Cell': decision['fc_pct']
        }
        dominant = max(sources, key=sources.get)
        
        return {
            **decision,
            'dominant_source': dominant,
            'status': 'OPTIMAL' if not decision['constraints'] else 'CONSTRAINED',
            'efficiency_estimate': self._estimate_efficiency(decision)
        }
    
    def _estimate_efficiency(self, decision: Dict[str, Any]) -> float:
        """
        Estimate the overall system efficiency for the current decision.
        """
        # Component efficiencies
        engine_eff = 0.35
        gen_eff = 0.92
        battery_eff = 0.95
        fc_eff = 0.55
        motor_eff = 0.95
        prop_eff = 0.85
        
        # Weighted efficiency based on power split
        engine_share = decision['engine_pct'] / 100
        battery_share = decision['battery_pct'] / 100
        fc_share = decision['fc_pct'] / 100
        
        # Engine path: fuel -> engine -> gen -> motor -> prop
        engine_path_eff = engine_eff * gen_eff * motor_eff * prop_eff
        
        # Battery path: battery -> motor -> prop
        battery_path_eff = battery_eff * motor_eff * prop_eff
        
        # FC path: H2 -> FC -> motor -> prop
        fc_path_eff = fc_eff * motor_eff * prop_eff
        
        # Weighted average
        total_eff = (engine_share * engine_path_eff +
                     battery_share * battery_path_eff +
                     fc_share * fc_path_eff)
        
        return total_eff
    
    def get_phase_strategies(self) -> Dict[str, Dict[str, Any]]:
        """Return all phase strategies for display."""
        return PHASE_STRATEGIES


# =============================================================================
# POWER FLOW VISUALIZATION DATA
# =============================================================================

def get_power_flow_data(decision: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate power flow data for the animated Sankey/power flow diagram.
    
    Returns:
    --------
    list of flow segments with source, target, and power values
    """
    flows = []
    
    # Jet-A -> Engine
    flows.append({
        'source': 'Jet-A Tank',
        'target': 'Engine',
        'power': decision['engine_power'],
        'efficiency': 0.35,
        'loss': decision['engine_power'] * 0.65
    })
    
    # Engine -> Generator
    flows.append({
        'source': 'Engine',
        'target': 'Generator',
        'power': decision['engine_power'] * 0.35,
        'efficiency': 0.92,
        'loss': decision['engine_power'] * 0.35 * 0.08
    })
    
    # H2 -> Fuel Cell
    flows.append({
        'source': 'H2 Tank',
        'target': 'Fuel Cell',
        'power': decision['fc_power'],
        'efficiency': 0.55,
        'loss': decision['fc_power'] * 0.45
    })
    
    # Battery -> Bus
    flows.append({
        'source': 'Battery',
        'target': '800V Bus',
        'power': decision['battery_power'],
        'efficiency': 0.95,
        'loss': decision['battery_power'] * 0.05
    })
    
    # Generator -> Bus
    flows.append({
        'source': 'Generator',
        'target': '800V Bus',
        'power': decision['engine_power'] * 0.35 * 0.92,
        'efficiency': 1.0,
        'loss': 0
    })
    
    # Fuel Cell -> Bus
    flows.append({
        'source': 'Fuel Cell',
        'target': '800V Bus',
        'power': decision['fc_power'] * 0.55,
        'efficiency': 1.0,
        'loss': 0
    })
    
    # Bus -> Inverter
    bus_total = (decision['engine_power'] * 0.35 * 0.92 +
                 decision['fc_power'] * 0.55 +
                 decision['battery_power'] * 0.95)
    flows.append({
        'source': '800V Bus',
        'target': 'Inverter',
        'power': bus_total,
        'efficiency': 0.98,
        'loss': bus_total * 0.02
    })
    
    # Inverter -> Motor
    flows.append({
        'source': 'Inverter',
        'target': 'Motor',
        'power': bus_total * 0.98,
        'efficiency': 0.95,
        'loss': bus_total * 0.98 * 0.05
    })
    
    # Motor -> Propeller
    flows.append({
        'source': 'Motor',
        'target': 'Propeller',
        'power': bus_total * 0.98 * 0.95,
        'efficiency': 0.85,
        'loss': bus_total * 0.98 * 0.95 * 0.15
    })
    
    # Propeller -> Aircraft
    flows.append({
        'source': 'Propeller',
        'target': 'Aircraft',
        'power': bus_total * 0.98 * 0.95 * 0.85,
        'efficiency': 1.0,
        'loss': 0
    })
    
    return flows


def get_sankey_data(decision: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Sankey diagram data for power flow visualization.
    
    Returns:
    --------
    dict with nodes and links for Plotly Sankey diagram
    """
    # Node labels
    labels = [
        'Jet-A Tank', 'H2 Tank', 'Battery',
        'Engine', 'Fuel Cell', 'Generator',
        '800V Bus', 'Inverter', 'Motor',
        'Propeller', 'Aircraft', 'Losses'
    ]
    
    # Calculate powers
    engine_p = decision['engine_power']
    fc_p = decision['fc_power']
    batt_p = decision['battery_power']
    
    gen_out = engine_p * 0.35 * 0.92
    fc_out = fc_p * 0.55
    batt_out = batt_p * 0.95
    bus_total = gen_out + fc_out + batt_out
    inv_out = bus_total * 0.98
    motor_out = inv_out * 0.95
    prop_out = motor_out * 0.85
    
    # Links: [source, target, value]
    links = {
        'source': [],
        'target': [],
        'value': []
    }
    
    # Jet-A -> Engine
    links['source'].append(0); links['target'].append(3); links['value'].append(engine_p)
    # H2 -> Fuel Cell
    links['source'].append(1); links['target'].append(4); links['value'].append(fc_p)
    # Battery -> Bus
    links['source'].append(2); links['target'].append(6); links['value'].append(batt_out)
    # Engine -> Generator
    links['source'].append(3); links['target'].append(5); links['value'].append(gen_out)
    # Engine -> Losses
    links['source'].append(3); links['target'].append(11); links['value'].append(engine_p - gen_out)
    # Fuel Cell -> Bus
    links['source'].append(4); links['target'].append(6); links['value'].append(fc_out)
    # Fuel Cell -> Losses
    links['source'].append(4); links['target'].append(11); links['value'].append(fc_p - fc_out)
    # Generator -> Bus
    links['source'].append(5); links['target'].append(6); links['value'].append(gen_out)
    # Bus -> Inverter
    links['source'].append(6); links['target'].append(7); links['value'].append(inv_out)
    # Bus -> Losses
    links['source'].append(6); links['target'].append(11); links['value'].append(bus_total - inv_out)
    # Inverter -> Motor
    links['source'].append(7); links['target'].append(8); links['value'].append(motor_out)
    # Inverter -> Losses
    links['source'].append(7); links['target'].append(11); links['value'].append(inv_out - motor_out)
    # Motor -> Propeller
    links['source'].append(8); links['target'].append(9); links['value'].append(prop_out)
    # Motor -> Losses
    links['source'].append(8); links['target'].append(11); links['value'].append(motor_out - prop_out)
    # Propeller -> Aircraft
    links['source'].append(9); links['target'].append(10); links['value'].append(prop_out)
    # Propeller -> Losses
    links['source'].append(9); links['target'].append(11); links['value'].append(prop_out * 0.15)
    
    return {
        'labels': labels,
        'links': links
    }