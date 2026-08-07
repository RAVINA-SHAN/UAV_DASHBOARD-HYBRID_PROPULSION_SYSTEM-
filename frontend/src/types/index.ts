export interface TelemetryFrame {
  t_min: number;
  demo_s: number;
  phase: string;
  phase_name: string;
  phase_color: string;
  phase_icon: string;
  phase_elapsed_s: number;
  phase_duration_s: number;
  alt_m: number;
  vel_mps: number;
  dist_m: number;
  mass_kg: number;
  soc: number;
  h2_kg: number;
  jeta_kg: number;
  h2_pct: number;
  jeta_pct: number;
  p_req_W: number;
  p_bat_W: number;
  p_fc_W: number;
  p_eng_W: number;
  p_gen_W: number;
  p_motor_W: number;
  bus_power_W: number;
  bus_loss_W: number;
  bus_voltage: number;
  bus_current: number;
  bat_frac: number;
  fc_frac: number;
  eng_frac: number;
  prop_rpm: number;
  pitch_deg: number;
  thrust_N: number;
  drag_N: number;
  lift_N: number;
  ld_ratio: number;
  wing_loading: number;
  payload_kg: number;
  cg_pos: number;
  heading_deg: number;
  pitch_deg_att: number;
  roll_deg: number;
  vertical_speed_mps: number;
  range_km: number;
  eng_rpm: number;
  gen_rpm: number;
  motor_rpm: number;
  torque_Nm: number;
  eng_bsfc: number;
  eng_eff: number;
  eng_egt_K: number;
  fc_eff: number;
  fc_temp_K: number;
  fc_temp: number;
  motor_eff: number;
  gen_eff: number;
  eta_overall: number;
  fuel_flow_kg_s: number;
  fuel_flow_kg_hr: number;
  h2_flow_kg_s: number;
  h2_flow_kg_hr: number;
  bat_voltage_V: number;
  bat_current_A: number;
  bat_r_int: number;
  bat_temp_K: number;
  bat_temp: number;
  bat_loss_W: number;
  mission_progress_pct: number;
  endurance_remaining_min: number;
  system_health_pct: number;
  overall_efficiency_pct: number;
  apems_reason: string;
  is_charging: boolean;
  health: Record<string, number>;
}

export interface MissionPhase {
  name: string;
  duration_min: number;
  color: string;
  bat_split: number;
  fc_split: number;
  eng_split: number;
  peak_power_kw: number;
}

export interface PhysicsResult {
  endurance_min: number;
  endurance_hr: number;
  mission_complete: boolean;
  timeline: TelemetryFrame[];
  phases: MissionPhase[];
  total_mission_min: number;
  summary: Record<string, number>;
}

export interface MLPrediction {
  predicted_endurance_min: number;
  predicted_endurance_hr: number;
  sigma_min: number;
  limiting_resource: string;
  resource_confidence_pct: number;
  ood_warning: boolean;
}

export interface CompareResponse {
  physics: PhysicsResult;
  ml: MLPrediction;
  delta_min: number;
  delta_hr: number;
}

export interface DesignVariables {
  battery_kwh: number;
  fc_kw: number;
  h2_kg: number;
  jeta_kg: number;
}

export interface OptimizationResult {
  battery_kwh: number;
  fc_kw: number;
  h2_kg: number;
  jeta_kg: number;
  endurance_min: number;
  fuel_used_kg: number;
  h2_used_kg: number;
  efficiency_pct: number;
  score: number;
}

export interface AIPrediction {
  soc_prediction: number[];
  fuel_prediction: number[];
  h2_prediction: number[];
  endurance_prediction: number;
  motor_health: number;
  engine_health: number;
  fc_health: number;
  battery_health: number;
  rul_motor_hr: number;
  rul_engine_hr: number;
  rul_fc_hr: number;
  rul_battery_hr: number;
  ood_warning: boolean;
}

export interface DiagnosticItem {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  system: string;
}

export interface MissionEvent {
  time_min: number;
  phase: string;
  event: string;
  type: 'info' | 'warning' | 'critical';
}

export interface APEMSDecision {
  phase: string;
  required_power_kw: number;
  battery_power_kw: number;
  fc_power_kw: number;
  engine_power_kw: number;
  battery_priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMUM';
  fc_priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMUM';
  engine_priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMUM';
  reason: string;
  timestamp: number;
}