/**
 * IoMT Edge Device Simulator Server
 * 
 * Standalone Node.js service that simulates multiple clinical IoMT monitoring devices,
 * generates realistic human physiological signals with gradual transitions,
 * transmits telemetry via backend HTTP APIs, and provides a control interface
 * for runtime simulation adjustments.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeviceAgent } from './device-agent.js';
import { SCENARIO_PRESETS } from './physiology-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.EDGE_PORT || '5005', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001/api';
const CONFIG_PATH = path.resolve(__dirname, '../config/devices.json');

class IoMTSimulator {
  constructor() {
    this.devices = new Map();
    this.startTime = Date.now();
    this.loadDevices();
  }

  loadDevices() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        const deviceConfigs = JSON.parse(raw);
        for (const cfg of deviceConfigs) {
          const agent = new DeviceAgent({
            ...cfg,
            backendUrl: BACKEND_URL,
          });
          this.devices.set(agent.deviceCode, agent);
        }
        console.log(`[Simulator] Loaded ${this.devices.size} simulated IoMT devices from configuration.`);
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
    const agent = new DeviceAgent({
      ...cfg,
      backendUrl: BACKEND_URL,
    });
    this.devices.set(agent.deviceCode, agent);
    return agent;
  }

  getDevice(code) {
    return this.devices.get(code);
  }

  startAll() {
    let count = 0;
    for (const [code, agent] of this.devices.entries()) {
      agent.start();
      count++;
    }
    console.log(`[Simulator] Started all ${count} simulated devices.`);
    return count;
  }

  stopAll() {
    let count = 0;
    for (const [code, agent] of this.devices.entries()) {
      agent.stop();
      count++;
    }
    console.log(`[Simulator] Stopped all ${count} simulated devices.`);
    return count;
  }

  getStatus() {
    const deviceStatuses = [];
    for (const agent of this.devices.values()) {
      deviceStatuses.push(agent.getStatus());
    }

    return {
      online: true,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      backendUrl: BACKEND_URL,
      port: PORT,
      totalDevices: this.devices.size,
      activeStreamingDevices: deviceStatuses.filter((d) => d.isRunning).length,
      devices: deviceStatuses,
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

  // JSON responder
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
      // If stopped, optionally start it so the user sees results immediately
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

    // POST /api/device/register
    if (req.method === 'POST' && pathname === '/api/device/register') {
      const body = await parseBody(req);
      const agent = simulator.registerDevice(body);
      if (body.autoStart) {
        agent.start();
      }
      return sendJson(201, {
        success: true,
        message: `Device ${agent.deviceCode} registered in simulator.`,
        data: agent.getStatus(),
      });
    }

    sendJson(404, { success: false, error: 'Endpoint not found.' });
  } catch (error) {
    console.error('[Simulator Error]', error);
    sendJson(500, { success: false, error: error.message });
  }
});

// Update edge/package.json main or script
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏥 [IoMT Simulator] Standalone Edge Node Online`);
  console.log(`📡 Ingestion Target: ${BACKEND_URL}/vitals/ingest`);
  console.log(`🎛️  Control API:     http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Start all devices by default so readings stream continuously as required by acceptance criteria
  simulator.startAll();
});

// Graceful termination
process.on('SIGINT', () => {
  console.log('\n[IoMT Simulator] Shutting down simulated devices...');
  simulator.stopAll();
  server.close(() => {
    console.log('[IoMT Simulator] Offline.');
    process.exit(0);
  });
});
