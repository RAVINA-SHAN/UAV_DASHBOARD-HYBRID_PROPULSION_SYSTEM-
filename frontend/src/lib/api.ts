import type { CompareResponse, DesignVariables, OptimizationResult, AIPrediction } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getPhases: () => request('/api/phases'),
  simulate: (design: DesignVariables) =>
    request('/api/simulate', {
      method: 'POST',
      body: JSON.stringify(design),
    }),
  predict: (design: DesignVariables) =>
    request('/api/predict', {
      method: 'POST',
      body: JSON.stringify(design),
    }),
  compare: (design: DesignVariables) =>
    request<CompareResponse>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(design),
    }),
  optimize: (design: DesignVariables) =>
    request<OptimizationResult>('/api/optimize', {
      method: 'POST',
      body: JSON.stringify(design),
    }),
  aiPredict: (design: DesignVariables) =>
    request<AIPrediction>('/api/ai/predict', {
      method: 'POST',
      body: JSON.stringify(design),
    }),
  getTelemetryCurrent: () => request('/api/telemetry/current'),
  getTelemetryRows: (page = 1, limit = 50, search = '', phase = '') =>
    request(`/api/telemetry/rows?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&phase=${encodeURIComponent(phase)}`),
  getTelemetryRow: (id: number) => request(`/api/telemetry/row/${id}`),
  getTelemetryByTime: (timeStr: string) => request(`/api/telemetry/time/${encodeURIComponent(timeStr)}`),
  getTelemetryStatistics: () => request('/api/telemetry/statistics'),
};

export function connectWebSocket(onMessage: (data: any) => void): WebSocket {
  const ws = new WebSocket(`ws://localhost:8000/ws/telemetry`);
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };
  return ws;
}