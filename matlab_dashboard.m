function app_hybrid_graph()
    % --- 1. MAIN WINDOW SETUP (Advanced GCS Dashboard) ---
    fig = uifigure('Name', 'HAL APEMS Dashboard - Comprehensive 6-Phase GCS', ...
                   'Position', [20, 20, 1500, 950], 'Color', [0.08, 0.08, 0.1]);

    % Main Grid Layout (10 Rows, 4 Columns)
    mainGrid = uigridlayout(fig, [10, 4]);
    mainGrid.RowHeight = {50, 90, 80, '1.2x', '1.2x', '1.2x', '1.2x', 50, 50, 45};
    mainGrid.ColumnWidth = {'1x', '1x', '1x', '1x'};
    mainGrid.BackgroundColor = [0.08, 0.08, 0.1];

    % --- ROW 1: EXPANDED HEADER & METRICS ---
    pnlH1 = uipanel(mainGrid, 'Title', 'PHASE & TYPE', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlH1.Layout.Row = 1; pnlH1.Layout.Column = 1;
    lblPhase = uilabel(pnlH1, 'Text', 'TAKEOFF | Reconnaissance', 'FontColor', 'g', 'FontSize', 12, 'FontWeight', 'bold', 'Position', [5, 5, 300, 20]);

    pnlH2 = uipanel(mainGrid, 'Title', 'POWER & DEMAND', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlH2.Layout.Row = 1; pnlH2.Layout.Column = 2;
    lblDemand = uilabel(pnlH2, 'Text', 'Demand: 60 kW | 0% Complete', 'FontColor', 'c', 'FontSize', 12, 'FontWeight', 'bold', 'Position', [5, 5, 300, 20]);

    pnlH3 = uipanel(mainGrid, 'Title', 'ENDURANCE & TIMER', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlH3.Layout.Row = 1; pnlH3.Layout.Column = 3;
    lblTimer = uilabel(pnlH3, 'Text', 'T+ 00:00:00 | Rem: 3.0 min', 'FontColor', 'y', 'FontSize', 12, 'FontWeight', 'bold', 'Position', [5, 5, 300, 20]);

    pnlH4 = uipanel(mainGrid, 'Title', 'WEATHER (ISA)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlH4.Layout.Row = 1; pnlH4.Layout.Column = 4;
    uilabel(pnlH4, 'Text', 'Wind: 12 km/h (240°) | Dens: 0.81 | -5°C', 'FontColor', [0.8 0.8 0.8], 'FontSize', 11, 'Position', [5, 5, 330, 20]);

    % --- ROW 2: DETAILED APEMS DECISION ENGINE PANEL ---
    pnlAPEMS = uipanel(mainGrid, 'Title', 'APEMS MULTI-CRITERIA DECISION ENGINE', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlAPEMS.Layout.Row = 2; pnlAPEMS.Layout.Column = [1, 4];
    lblAPEMSDecision = uilabel(pnlAPEMS, 'Text', 'Decision: Engine 20% | Fuel Cell 0% | Battery 80%', 'FontColor', 'y', 'FontSize', 13, 'FontWeight', 'bold', 'Position', [10, 35, 1200, 22]);
    lblAPEMSReason = uilabel(pnlAPEMS, 'Text', 'Reason: Fuel cell operating near peak efficiency; Battery reserved for transient spikes.', 'FontColor', [0.7, 0.7, 0.7], 'FontSize', 11, 'Position', [10, 10, 1200, 20]);

    % --- ROW 3: MISSION INFO, WEATHER & HEALTH SUMMARY ---
    pnlInfo = uipanel(mainGrid, 'Title', 'MISSION INFO', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlInfo.Layout.Row = 3; pnlInfo.Layout.Column = 1;
    uilabel(pnlInfo, 'Text', 'Name: HAL UAV Demo | Payload: 200 kg | MTOW: 998 kg', 'FontColor', 'w', 'FontSize', 10, 'Position', [5, 10, 330, 25]);

    pnlOpt = uipanel(mainGrid, 'Title', 'OPTIMIZATION PANEL (Max Endurance)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlOpt.Layout.Row = 3; pnlOpt.Layout.Column = 2;
    uilabel(pnlOpt, 'Text', 'Fuel Saved: 22% | Batt Life: +32% | Eff: 92% [Converged]', 'FontColor', 'g', 'FontSize', 10, 'Position', [5, 10, 330, 25]);

    pnlHealth = uipanel(mainGrid, 'Title', 'SYSTEM HEALTH (%)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlHealth.Layout.Row = 3; pnlHealth.Layout.Column = 3;
    uilabel(pnlHealth, 'Text', 'Eng:99% | Batt:98% | FC:97% | Gen:100% | Mot:99%', 'FontColor', 'c', 'FontSize', 10, 'Position', [5, 10, 330, 25]);

    pnlAlerts = uipanel(mainGrid, 'Title', 'FAULT MONITORING', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlAlerts.Layout.Row = 3; pnlAlerts.Layout.Column = 4;
    lblAlertState = uilabel(pnlAlerts, 'Text', 'STATUS: ALL SUBSYSTEMS NORMAL', 'FontColor', 'g', 'FontSize', 11, 'FontWeight', 'bold', 'Position', [5, 10, 330, 25]);

    % --- ROWS 4 & 5: PLOTS AND DYNAMICS ---
    axPitch = uiaxes(mainGrid);
    axPitch.Layout.Row = [4, 5]; axPitch.Layout.Column = [1, 2];
    title(axPitch, 'Flight Dynamics (Pitch Angle)', 'Color', 'w');
    axPitch.XColor = 'w'; axPitch.YColor = 'w'; axPitch.Color = [0.04 0.04 0.05]; grid(axPitch, 'on');

    axPower = uiaxes(mainGrid);
    axPower.Layout.Row = [4, 5]; axPower.Layout.Column = [3, 4];
    title(axPower, 'Live Power Distribution Stack (kW)', 'Color', 'w');
    axPower.XColor = 'w'; axPower.YColor = 'w'; axPower.Color = [0.04 0.04 0.05]; grid(axPower, 'on');

    % --- ROWS 6 & 7: HARDWARE SUBSYSTEM PANELS ---
    pnlBat = uipanel(mainGrid, 'Title', 'BATTERY USAGE SHARE (%)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlBat.Layout.Row = [6, 7]; pnlBat.Layout.Column = 1;
    gBat = uigridlayout(pnlBat, [1,1]); gBat.Padding = [2 2 2 2];
    gaugeSOC = uigauge(gBat, 'circular', 'Limits', [0 100], 'Value', 80);
    lblBatDetails = uilabel(pnlBat, 'Text', 'Share: 80% | Volt: 805V | Curr: 60A', 'FontColor', 'c', 'FontSize', 9, 'Position', [5, 2, 330, 20]);

    pnlFC = uipanel(mainGrid, 'Title', 'FUEL CELL USAGE SHARE (%)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlFC.Layout.Row = [6, 7]; pnlFC.Layout.Column = 2;
    gFC = uigridlayout(pnlFC, [1,1]); gFC.Padding = [2 2 2 2];
    gaugeH2 = uigauge(gFC, 'semicircular', 'Limits', [0 100], 'Value', 0);
    lblFCDetails = uilabel(pnlFC, 'Text', 'Share: 0% | Press: 350 bar | Eff: 0%', 'FontColor', 'c', 'FontSize', 9, 'Position', [5, 2, 330, 20]);

    pnlEng = uipanel(mainGrid, 'Title', 'ENGINE USAGE SHARE (%)', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlEng.Layout.Row = [6, 7]; pnlEng.Layout.Column = 3;
    gEng = uigridlayout(pnlEng, [1,1]); gEng.Padding = [2 2 2 2];
    gaugeRPM = uigauge(gEng, 'semicircular', 'Limits', [0 100], 'Value', 20);
    lblEngDetails = uilabel(pnlEng, 'Text', 'Share: 20% | RPM: 6000 | Tq: 96Nm', 'FontColor', 'c', 'FontSize', 9, 'Position', [5, 2, 330, 20]);

    pnlMotor = uipanel(mainGrid, 'Title', 'PMSM MOTOR & PROPELLER', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlMotor.Layout.Row = [6, 7]; pnlMotor.Layout.Column = 4;
    gMot = uigridlayout(pnlMotor, [1,1]); gMot.Padding = [2 2 2 2];
    gaugeProp = uigauge(gMot, 'circular', 'Limits', [0 3000], 'Value', 2300);
    lblMotDetails = uilabel(pnlMotor, 'Text', 'RPM: 5200 | Tq: 110Nm | Eff: 94%', 'FontColor', 'c', 'FontSize', 9, 'Position', [5, 2, 330, 20]);

    % --- ROW 8: ANIMATED ENERGY FLOW SCHEMATIC PANEL ---
    pnlFlow = uipanel(mainGrid, 'Title', 'Animated Multi-Source Energy Flow Routing', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlFlow.Layout.Row = 8; pnlFlow.Layout.Column = [1, 4];
    txtFlow = uilabel(pnlFlow, 'Text', '[ENG 12kW] ──► [GEN] ──► [800V BUS] ──► [BATT 48kW] ──► [MOTOR]', ...
         'FontColor', 'g', 'FontSize', 12, 'FontWeight', 'bold', 'HorizontalAlignment', 'center', ...
         'Position', [150, 15, 1000, 22]);

    % --- ROW 9: PERFORMANCE SUMMARY BAR ---
    pnlPerf = uipanel(mainGrid, 'Title', 'MISSION PERFORMANCE METRICS', 'BackgroundColor', [0.12, 0.12, 0.15], 'ForegroundColor', 'w');
    pnlPerf.Layout.Row = 9; pnlPerf.Layout.Column = [1, 4];
    uilabel(pnlPerf, 'Text', 'Total Mission: 3.0 min | Distance: 2320 km | Fuel Consumed: 72 kg | Status: SUCCESS', 'FontColor', 'g', 'FontSize', 11, 'Position', [10, 5, 1200, 20]);

    % --- ROW 10: ADVANCED CONTROL BUTTONS ---
    btnGrid = uigridlayout(mainGrid, [1, 7]);
    btnGrid.Layout.Row = 10; btnGrid.Layout.Column = [1, 4];
    btnGrid.BackgroundColor = [0.08, 0.08, 0.1];

    btnStart = uibutton(btnGrid, 'Text', '▶ START MISSION', 'BackgroundColor', [0 0.5 0], 'FontColor', 'w', 'FontWeight', 'bold', 'ButtonPushedFcn', @(btn,event) runFullMission());
    uibutton(btnGrid, 'Text', '⏸ PAUSE', 'BackgroundColor', [0.8 0.5 0], 'FontColor', 'w', 'FontWeight', 'bold');
    uibutton(btnGrid, 'Text', '■ STOP', 'BackgroundColor', [0.6 0 0], 'FontColor', 'w', 'FontWeight', 'bold');
    uibutton(btnGrid, 'Text', '↻ RESET', 'BackgroundColor', [0.3 0.3 0.3], 'FontColor', 'w', 'FontWeight', 'bold');
    uibutton(btnGrid, 'Text', '⚙ SETTINGS', 'BackgroundColor', [0.2 0.4 0.6], 'FontColor', 'w', 'FontWeight', 'bold', 'ButtonPushedFcn', @(b,e) uialert(fig, 'Mission Settings Active', 'Settings'));
    uibutton(btnGrid, 'Text', '💾 EXPORT', 'BackgroundColor', [0.2 0.2 0.6], 'FontColor', 'w', 'FontWeight', 'bold', 'ButtonPushedFcn', @(b,e) uialert(fig, 'Data exported successfully!', 'Export'));
    uibutton(btnGrid, 'Text', '📄 REPORT.PDF', 'BackgroundColor', [0.2 0.2 0.6], 'FontColor', 'w', 'FontWeight', 'bold', 'ButtonPushedFcn', @(b,e) uialert(fig, 'Mission Report generated!', 'PDF'));


    % =========================================================================
    % BACK-END: CORRELATED REAL-TIME SIMULATION ENGINE WITH SAFETY GUARDS
    % =========================================================================
    function runFullMission()
        if ~isvalid(fig) || ~isvalid(btnStart)
            return;
        end
        
        btnStart.Text = 'RUNNING...'; 
        btnStart.Enable = 'off';
        drawnow;
        
        phases = {
            'TAKEOFF',  20, 90,   150,  48, 0,  12, 10, 6000, 2300, 80, 0,  20, 805, 60, 28, 15, 350;
            'CLIMB',    30, 180,  2500, 25, 10, 15, 12, 5600, 2100, 50, 20, 30, 802, 31, 32, 12, 346;
            'CRUISE',   50, 248,  5200, 5,  15, 5,  2,  4200, 1800, 20, 60, 20, 798, 6,  35, 6,  275;
            'LOITER',   40, 180,  5200, 5,  12, 1,  0,  3800, 1500, 10, 70, 20, 795, 6,  36, 5.5, 180;
            'DESCENT',  25, 170,  2500, 2,  22, 11, -4, 4000, 1600, 35, 15, 50, 796, 1,  34, 6,  175;
            'LANDING',  15, 100,  150,  10, 20, 20, -6, 4300, 1700, 50, 10, 40, 797, 13, 33, 8,  170
        };
        
        total_steps = sum(cell2mat(phases(:,2))); 
        t_vec = linspace(0, 180, total_steps);
        
        pitch_arr = zeros(1, total_steps);
        pwr_bat_arr = zeros(1, total_steps);
        pwr_fc_arr  = zeros(1, total_steps);
        pwr_eng_arr = zeros(1, total_steps);
        
        current_idx = 1;
        
        for p = 1:size(phases,1)
            if ~isvalid(fig)
                return; 
            end
            
            p_name     = phases{p,1};
            p_steps    = phases{p,2};
            p_spd      = phases{p,3};
            p_alt      = phases{p,4};
            p_bat      = phases{p,5};
            p_fc       = phases{p,6};
            p_eng      = phases{p,7};
            p_pitch    = phases{p,8};
            p_engrpm   = phases{p,9};
            p_proprpm  = phases{p,10};
            p_batshare = phases{p,11};
            p_fcshare  = phases{p,12};
            p_engshare = phases{p,13};
            p_volt     = phases{p,14};
            p_curr     = phases{p,15};
            p_temp     = phases{p,16};
            p_flow     = phases{p,17};
            p_press    = phases{p,18};
            
            lblPhase.Text = sprintf('%s | Reconnaissance', p_name);
            
            switch p_name
                case 'TAKEOFF'
                    lblAPEMSDecision.Text = 'Decision: Engine 20% | Fuel Cell 0% | Battery 80% (60 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: High battery assist for maximum takeoff thrust and safe lift-off.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [BATT %dkW] ──► [MOTOR]', p_eng, p_bat);
                case 'CLIMB'
                    lblAPEMSDecision.Text = 'Decision: Engine 30% | Fuel Cell 20% | Battery 50% (50 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: Engine and fuel cell actively support battery during sustained climb.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [BATT %dkW / FC %dkW] ──► [MOTOR]', p_eng, p_bat, p_fc);
                case 'CRUISE'
                    lblAPEMSDecision.Text = 'Decision: Engine 20% | Fuel Cell 60% | Battery 20% (25 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: Fuel cell supplies base load near peak efficiency; battery conserved.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [FC %dkW] ──► [MOTOR]', p_eng, p_fc);
                case 'LOITER'
                    lblAPEMSDecision.Text = 'Decision: Engine 20% | Fuel Cell 70% | Battery 10% (18 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: Fuel cell is primary power source; long-endurance loiter mode engaged.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [FC %dkW] ──► [MOTOR]', p_eng, p_fc);
                case 'DESCENT'
                    lblAPEMSDecision.Text = 'Decision: Engine 50% | Fuel Cell 15% | Battery 35% (15 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: Engine powers avionics and recharges battery during controlled descent.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [BATT RECHARGE] ──► [MOTOR]', p_eng);
                case 'LANDING'
                    lblAPEMSDecision.Text = 'Decision: Engine 40% | Fuel Cell 10% | Battery 50% (20 kW Demand)';
                    lblAPEMSReason.Text = 'Reason: Battery provides fast transient response for final approach stabilization.';
                    txtFlow.Text = sprintf('[ENG %dkW] ──► [GEN] ──► [800V BUS] ──► [BATT %dkW] ──► [MOTOR]', p_eng, p_bat);
            end
            
            for s = 1:p_steps
                if ~isvalid(fig)
                    return;
                end
                
                idx = current_idx;
                pitch_arr(idx) = p_pitch + (rand()*0.2 - 0.1);
                pwr_bat_arr(idx) = p_bat;
                pwr_fc_arr(idx)  = p_fc;
                pwr_eng_arr(idx) = p_eng;
                
                % Update Gauges to strictly match Decision Engine Percentage Shares
                gaugeSOC.Value = p_batshare;
                gaugeH2.Value = p_fcshare;
                gaugeRPM.Value = p_engshare;
                gaugeProp.Value = p_proprpm;
                
                % Update Subsystem Details
                lblBatDetails.Text = sprintf('Share: %d%% | Volt: %dV | Curr: %dA', p_batshare, p_volt, p_curr);
                lblFCDetails.Text  = sprintf('Share: %d%% | Press: %d bar | Eff: 58%%', p_fcshare, p_press);
                lblEngDetails.Text = sprintf('Share: %d%% | RPM: %d | Flow: %.1f kg/hr', p_engshare, p_engrpm, p_flow);
                lblMotDetails.Text = sprintf('RPM: %d | Power: %d kW | Status: NOMINAL', p_proprpm, p_bat+p_fc+p_eng);
                
                pct_complete = round((idx / total_steps) * 100);
                lblDemand.Text = sprintf('Demand: %d kW | %d%% Complete', p_bat+p_fc+p_eng, pct_complete);
                
                current_time_sec = t_vec(idx);
                mins = floor(current_time_sec / 60);
                secs = floor(mod(current_time_sec, 60));
                lblTimer.Text = sprintf('T+ 00:%02d:%02d | Rem: %.1f min', mins, secs, max(0, 3.0 - (current_time_sec/60)));
                
                % Render Plots
                plot(axPitch, t_vec(1:idx), pitch_arr(1:idx), 'c', 'LineWidth', 2);
                area(axPower, t_vec(1:idx), [pwr_bat_arr(1:idx)', pwr_fc_arr(1:idx)', pwr_eng_arr(1:idx)']);
                colororder(axPower, [0 0.8 0; 0 0.4 1; 1 0.4 0]);
                legend(axPower, {'Battery', 'Fuel Cell', 'Engine'}, 'TextColor', 'w', 'Color', 'none', 'Location', 'northwest');
                
                drawnow;
                pause(1.0); 
                
                current_idx = current_idx + 1;
            end
        end
        
        if isvalid(btnStart)
            btnStart.Text = '✔ MISSION SUCCESS';
            btnStart.BackgroundColor = [0 0.5 0];
            btnStart.Enable = 'on';
            lblAlertState.Text = 'STATUS: ALL SUBSYSTEMS NOMINAL [SUCCESS]';
        end
    end
end