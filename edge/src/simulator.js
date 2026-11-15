/**
 * IoMT Edge Device Simulator Server (Stage 4: Edge Computing & Anomaly Detection)
 * 
 * Standalone Node.js service that simulates multiple clinical IoMT monitoring devices,
 * generates realistic human physiological signals, executes local edge threshold checks,
 * summarizes normal telemetry, dispatches emergency anomaly alerts, and buffers offline data.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceAgent } from './device-agent.js';
import { SCENARIO_PRESETS } from './physiology-engine.js';
import { TRANSMISSION_POLICIES } from './transmission-engine.js';
import { EdgeMetricsCollector } from './metrics-collector.js';
import { MEDICAL_DISCLAIMER } from './threshold-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.EDGE_PORT || '5005', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001/api';
const CONFIG_PATH = path.resolve(__dirname, '../config/devices.json');
const PROFILES_PATH = path.resolve(__dirname, '../config/threshold-profiles.json');

class IoMTSimulator {
  constructor() {
    this.devices = new Map();
    this.startTime = Date.now();
    this.metricsCollector = new EdgeMetricsCollector();
    this.isNetworkOnline = true;
    this.activePolicy = 'TRANSMIT_ON_ANOMALY_OR_WINDOW';
    this.loadDevices();
  }

  loadDevices() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        const deviceConfigs = JSON.parse(raw);
        for (const cfg of deviceConfigs) {
          const agent = new DeviceAgent(
            {
              ...cfg,
              backendUrl: BACKEND_URL,
              transmissionPolicy: this.activePolicy,
            },
            this.metricsCollector
          );
          this.devices.set(agent.deviceCode, agent);
        }
        console.log(`[Simulator] Loaded ${this.devices.size} simulated IoMT devices with Edge computing pipeline.`);
      } else {
        console.warn(`[Simulator] Config file not found at ${CONFIG_PATH}`);
      }
    } catch (err) {
      console.error('[Simulator] Failed to load device configuration:', err.message);
    }
  }

  registerDevice(cfg) {
    if (!cfg.deviceCode || !cfg.apiKey || !cfg.patientId) {
      throw new Error('Device configuration requires deviceCode, apiKey, and patientId');
    }
    const agent = new DeviceAgent(
      {
        ...cfg,
        backendUrl: BACKEND_URL,
        transmissionPolicy: this.activePolicy,
      },
      this.metricsCollector
    );
    this.devices.set(agent.deviceCode, agent);
    return agent;
  }

  getDevice(code) {
    return this.devices.get(code);
  }

  startAll() {
    let count = 0;
    for (const agent of this.devices.values()) {
      agent.start();
      count++;
    }
    console.log(`[Simulator] Started all ${count} simulated devices.`);
    return count;
  }

  stopAll() {
    let count = 0;
    for (const agent of this.devices.values()) {
      agent.stop();
      count++;
    }
    console.log(`[Simulator] Stopped all ${count} simulated devices.`);
    return count;
  }

  setGlobalTransmissionPolicy(policyId) {
    if (!TRANSMISSION_POLICIES[policyId]) return false;
    this.activePolicy = policyId;
    for (const agent of this.devices.values()) {
      agent.setTransmissionPolicy(policyId);
    }
    console.log(`[Simulator] Global transmission policy switched to: ${policyId}`);
    return true;
  }

  async setNetworkConnectivity(isOnline) {
    this.isNetworkOnline = Boolean(isOnline);
    const syncResults = [];
    for (const agent of this.devices.values()) {
      const res = await agent.setNetworkConnectivity(this.isNetworkOnline);
      syncResults.push({ deviceCode: agent.deviceCode, ...res });
    }
    console.log(`[Simulator] Fleet network connectivity set to: ${this.isNetworkOnline ? 'ONLINE' : 'OFFLINE'}`);
    return syncResults;
  }

  async syncAllOfflineBuffers() {
    const results = [];
    for (const agent of this.devices.values()) {
      const res = await agent.synchronizeOfflineBuffer();
      results.push({ deviceCode: agent.deviceCode, ...res });
    }
    return results;
  }

  getStatus() {
    const deviceStatuses = [];
    for (const agent of this.devices.values()) {
      deviceStatuses.push(agent.getStatus());
    }

    const metrics = this.metricsCollector.getMetrics();

    return {
      online: true,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      backendUrl: BACKEND_URL,
      port: PORT,
      isNetworkOnline: this.isNetworkOnline,
      activeTransmissionPolicy: this.activePolicy,
      availablePolicies: Object.values(TRANSMISSION_POLICIES),
      totalDevices: this.devices.size,
      activeStreamingDevices: deviceStatuses.filter((d) => d.isRunning).length,
      metrics,
      devices: deviceStatuses,
      disclaimer: MEDICAL_DISCLAIMER,
      scenarios: Object.entries(SCENARIO_PRESETS).map(([key, s]) => ({
        id: key,
        name: s.name,
        description: s.description,
        target: s.target,
      })),
    };
  }
}

const simulator = new IoMTSimulator();

// Parse JSON request body helper
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Lightweight HTTP server for simulator control
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    // GET /api/status or /status
    if (req.method === 'GET' && (pathname === '/api/status' || pathname === '/status' || pathname === '/')) {
      return sendJson(200, {
        success: true,
        data: simulator.getStatus(),
      });
    }

    // GET /api/metrics
    if (req.method === 'GET' && pathname === '/api/metrics') {
      return sendJson(200, {
        success: true,
        data: simulator.metricsCollector.getMetrics(),
        disclaimer: MEDICAL_DISCLAIMER,
      });
    }

    // GET /api/threshold-profiles
    if (req.method === 'GET' && pathname === '/api/threshold-profiles') {
      let profiles = {};
      try {
        if (fs.existsSync(PROFILES_PATH)) {
          profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
        }
      } catch (e) {}
      return sendJson(200, {
        success: true,
        data: profiles,
        disclaimer: MEDICAL_DISCLAIMER,
      });
    }

    // POST /api/policy (Sets transmission policy globally or per device)
    if (req.method === 'POST' && pathname === '/api/policy') {
      const body = await parseBody(req);
      const policyId = body.policy;
      if (!policyId || !TRANSMISSION_POLICIES[policyId]) {
        return sendJson(400, {
          success: false,
          error: `Invalid transmission policy "${policyId}". Valid: ${Object.keys(TRANSMISSION_POLICIES).join(', ')}`,
        });
      }

      if (body.deviceCode) {
        const agent = simulator.getDevice(body.deviceCode);
        if (!agent) {
          return sendJson(404, { success: false, error: `Device ${body.deviceCode} not found.` });
        }
        agent.setTransmissionPolicy(policyId);
        return sendJson(200, {
          success: true,
          message: `Device ${body.deviceCode} policy set to ${policyId}.`,
          data: agent.getStatus(),
        });
      }

      simulator.setGlobalTransmissionPolicy(policyId);
      return sendJson(200, {
        success: true,
        message: `Global transmission policy set to ${policyId}.`,
        data: simulator.getStatus(),
      });
    }

    // POST /api/network-toggle (Simulates network outage / reconnect)
    if (req.method === 'POST' && pathname === '/api/network-toggle') {
      const body = await parseBody(req);
      const isOnline = body.isOnline !== undefined ? Boolean(body.isOnline) : !simulator.isNetworkOnline;

      if (body.deviceCode) {
        const agent = simulator.getDevice(body.deviceCode);
        if (!agent) {
          return sendJson(404, { success: false, error: `Device ${body.deviceCode} not found.` });
        }
        const resToggle = await agent.setNetworkConnectivity(isOnline);
        return sendJson(200, {
          success: true,
          message: `Device ${body.deviceCode} network status set to ${isOnline ? 'ONLINE' : 'OFFLINE'}.`,
          data: resToggle,
        });
      }

      const syncResults = await simulator.setNetworkConnectivity(isOnline);
      return sendJson(200, {
        success: true,
        message: `Simulator fleet network status set to ${isOnline ? 'ONLINE' : 'OFFLINE'}.`,
        data: {
          isNetworkOnline: isOnline,
          syncResults,
          metrics: simulator.metricsCollector.getMetrics(),
        },
      });
    }

    // POST /api/sync-offline
    if (req.method === 'POST' && pathname === '/api/sync-offline') {
      const results = await simulator.syncAllOfflineBuffers();
      return sendJson(200, {
        success: true,
        message: 'Synchronized all buffered offline telemetry.',
        data: results,
      });
    }

    // POST /api/thresholds
    if (req.method === 'POST' && pathname === '/api/thresholds') {
      const body = await parseBody(req);
      const { deviceCode, profileName, customThresholds } = body;

      if (!deviceCode) {
        return sendJson(400, { success: false, error: 'deviceCode is required.' });
      }
      const agent = simulator.getDevice(deviceCode);
      if (!agent) {
        return sendJson(404, { success: false, error: `Device ${deviceCode} not found.` });
      }

      if (profileName) {
        agent.setThresholdProfile(profileName);
      }
      if (customThresholds) {
        agent.setCustomThresholds(customThresholds);
      }

      return sendJson(200, {
        success: true,
        message: `Threshold configuration updated for ${deviceCode}.`,
        data: agent.getStatus(),
        disclaimer: MEDICAL_DISCLAIMER,
      });
    }

    // POST /api/start-all
    if (req.method === 'POST' && pathname === '/api/start-all') {
      const count = simulator.startAll();
      return sendJson(200, {
        success: true,
        message: `Started ${count} simulated devices.`,
        data: simulator.getStatus(),
      });
    }

    // POST /api/stop-all
    if (req.method === 'POST' && pathname === '/api/stop-all') {
      const count = simulator.stopAll();
      return sendJson(200, {
        success: true,
        message: `Stopped ${count} simulated devices.`,
        data: simulator.getStatus(),
      });
    }

    // POST /api/device/:code/start
    const matchStart = pathname.match(/^\/api\/device\/([A-Za-z0-9_-]+)\/start$/);
    if (req.method === 'POST' && matchStart) {
      const deviceCode = matchStart[1];
      const agent = simulator.getDevice(deviceCode);
      if (!agent) {
        return sendJson(404, { success: false, error: `Device ${deviceCode} not found in simulator.` });
      }
      agent.start();
      return sendJson(200, { success: true, message: `Device ${deviceCode} streaming started.`, data: agent.getStatus() });
    }

    // POST /api/device/:code/stop
    const matchStop = pathname.match(/^\/api\/device\/([A-Za-z0-9_-]+)\/stop$/);
    if (req.method === 'POST' && matchStop) {
      const deviceCode = matchStop[1];
      const agent = simulator.getDevice(deviceCode);
      if (!agent) {
        return sendJson(404, { success: false, error: `Device ${deviceCode} not found in simulator.` });
      }
      agent.stop();
      return sendJson(200, { success: true, message: `Device ${deviceCode} streaming stopped.`, data: agent.getStatus() });
    }

    // POST /api/device/:code/scenario
    const matchScenario = pathname.match(/^\/api\/device\/([A-Za-z0-9_-]+)\/scenario$/);
    if (req.method === 'POST' && matchScenario) {
      const deviceCode = matchScenario[1];
      const agent = simulator.getDevice(deviceCode);
      if (!agent) {
        return sendJson(404, { success: false, error: `Device ${deviceCode} not found in simulator.` });
      }
      const body = await parseBody(req);
      const scenario = body.scenario || 'NORMAL';
      const success = agent.setScenario(scenario);
      if (!success) {
        return sendJson(400, { success: false, error: `Invalid scenario preset "${scenario}".` });
      }
      if (body.autoStart && !agent.isRunning) {
        agent.start();
      }
      return sendJson(200, {
        success: true,
        message: `Device ${deviceCode} scenario switched to ${scenario}.`,
        data: agent.getStatus(),
      });
    }

    // POST /api/device/:code/interval
    const matchInterval = pathname.match(/^\/api\/device\/([A-Za-z0-9_-]+)\/interval$/);
    if (req.method === 'POST' && matchInterval) {
      const deviceCode = matchInterval[1];
      const agent = simulator.getDevice(deviceCode);
      if (!agent) {
        return sendJson(404, { success: false, error: `Device ${deviceCode} not found in simulator.` });
      }
      const body = await parseBody(req);
      const intervalMs = parseInt(body.intervalMs || '3000', 10);
      agent.setInterval(intervalMs);
      return sendJson(200, {
        success: true,
        message: `Device ${deviceCode} interval updated to ${intervalMs}ms.`,
        data: agent.getStatus(),
      });
    }

    sendJson(404, { success: false, error: 'Endpoint not found.' });
  } catch (error) {
    console.error('[Simulator Error]', error);
    sendJson(500, { success: false, error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏥 [IoMT Simulator] Standalone Edge Node Online`);
  console.log(`🧠 Edge Anomaly Engine: Deterministic Thresholds (<1ms)`);
  console.log(`📡 Ingestion Target:     ${BACKEND_URL}/vitals/ingest`);
  console.log(`🎛️  Control API:         http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  simulator.startAll();
});

process.on('SIGINT', () => {
  console.log('\n[IoMT Simulator] Shutting down simulated devices...');
  simulator.stopAll();
  server.close(() => {
    console.log('[IoMT Simulator] Offline.');
    process.exit(0);
  });
});
