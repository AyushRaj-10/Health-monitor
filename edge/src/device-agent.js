/**
 * Virtual IoMT Device Agent
 * 
 * Simulates a distinct physical/wearable edge device connected to a specific patient.
 * Periodically generates biometric telemetry via PhysiologyEngine and sends
 * authenticated payloads to the backend ingestion API.
 */

import { PhysiologyEngine } from './physiology-engine.js';

export class DeviceAgent {
  constructor(config) {
    this.id = config.id;
    this.deviceCode = config.deviceCode;
    this.name = config.name || `IoMT Monitor ${config.deviceCode}`;
    this.apiKey = config.apiKey;
    this.patientId = config.patientId;
    this.patientCode = config.patientCode || '';
    this.patientName = config.patientName || 'Assigned Patient';
    this.backendUrl = config.backendUrl || 'http://localhost:5001/api';
    this.intervalMs = Math.max(1000, config.intervalMs || 3000);
    this.batteryLevel = config.batteryLevel ?? 98;
    this.edgeNodeId = config.edgeNodeId || 'EDGE-GATEWAY-RPI4-01';

    this.physiology = new PhysiologyEngine(config.scenario || 'NORMAL');
    this.isRunning = false;
    this.timer = null;
    this.lastReading = null;
    this.lastSentAt = null;
    this.lastStatus = 'INITIALIZED';
    this.lastError = null;
    this.readingsCount = 0;
  }

  /**
   * Start telemetry streaming
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastStatus = 'STREAMING';
    console.log(`[DeviceAgent ${this.deviceCode}] Started streaming (interval: ${this.intervalMs}ms, scenario: ${this.physiology.getScenario()}).`);

    // Immediate first tick
    this.tickAndSend();

    this.timer = setInterval(() => {
      this.tickAndSend();
    }, this.intervalMs);
  }

  /**
   * Stop telemetry streaming
   */
  stop() {
    if (!this.isRunning) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.lastStatus = 'STOPPED';
    console.log(`[DeviceAgent ${this.deviceCode}] Stopped streaming.`);
  }

  /**
   * Set sampling interval in milliseconds
   */
  setInterval(ms) {
    const newInterval = Math.max(1000, Math.min(60000, Number(ms)));
    this.intervalMs = newInterval;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    console.log(`[DeviceAgent ${this.deviceCode}] Sampling interval updated to ${this.intervalMs}ms.`);
  }

  /**
   * Update clinical scenario
   */
  setScenario(scenarioKey) {
    const success = this.physiology.setScenario(scenarioKey);
    if (success) {
      console.log(`[DeviceAgent ${this.deviceCode}] Scenario transitioned to: ${scenarioKey}`);
    }
    return success;
  }

  /**
   * Generates reading and transmits to backend ingestion API
   */
  async tickAndSend() {
    try {
      const reading = this.physiology.tick();
      this.lastReading = reading;
      this.lastSentAt = new Date().toISOString();

      // Deplete battery very slowly (0.01% every 10 ticks)
      if (this.readingsCount % 10 === 0 && this.batteryLevel > 15) {
        this.batteryLevel = Math.max(15, this.batteryLevel - 0.05);
      }

      const payload = {
        deviceId: this.deviceCode, // Can pass deviceCode or DB id
        apiKey: this.apiKey,
        patientId: this.patientId, // Patient DB ID
        heartRate: reading.heartRate,
        spo2: reading.spo2,
        bloodPressureSys: reading.bloodPressureSys,
        bloodPressureDia: reading.bloodPressureDia,
        temperature: reading.temperature,
        respiratoryRate: reading.respiratoryRate,
        scenario: reading.scenario,
        isSimulated: true,
        recordedAt: reading.recordedAt,
      };

      const res = await fetch(`${this.backendUrl}/vitals/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `IoMT-EdgeDevice/${this.deviceCode}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        this.lastStatus = `ERROR: ${res.status}`;
        this.lastError = data.error?.message || `HTTP ${res.status}`;
        console.error(`[DeviceAgent ${this.deviceCode}] ❌ Ingestion failed (${res.status}):`, this.lastError);
      } else {
        this.lastStatus = 'STREAMING_OK';
        this.lastError = null;
        this.readingsCount++;
        const hrColor = reading.heartRate > 120 || reading.heartRate < 55 ? '⚠️' : '💚';
        console.log(
          `[DeviceAgent ${this.deviceCode} -> ${this.patientCode}] ${hrColor} HR: ${reading.heartRate} bpm | SpO2: ${reading.spo2}% | BP: ${reading.bloodPressureSys}/${reading.bloodPressureDia} mmHg | Temp: ${reading.temperature}°C [${reading.scenario}]`
        );
      }
    } catch (err) {
      this.lastStatus = 'NETWORK_ERROR';
      this.lastError = err.message;
      console.error(`[DeviceAgent ${this.deviceCode}] ❌ Network error transmitting vitals:`, err.message);
    }
  }

  /**
   * Heartbeat ping to backend
   */
  async sendHeartbeat() {
    try {
      await fetch(`${this.backendUrl}/devices/${this.id || this.deviceCode}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batteryLevel: Math.round(this.batteryLevel),
          status: this.isRunning ? 'ONLINE' : 'DEGRADED',
        }),
      });
    } catch (err) {
      // ignore background heartbeat errors
    }
  }

  getStatus() {
    return {
      id: this.id,
      deviceCode: this.deviceCode,
      name: this.name,
      patientId: this.patientId,
      patientCode: this.patientCode,
      patientName: this.patientName,
      intervalMs: this.intervalMs,
      scenario: this.physiology.getScenario(),
      isRunning: this.isRunning,
      batteryLevel: Math.round(this.batteryLevel),
      lastStatus: this.lastStatus,
      lastError: this.lastError,
      lastSentAt: this.lastSentAt,
      readingsCount: this.readingsCount,
      lastReading: this.lastReading,
    };
  }
}
