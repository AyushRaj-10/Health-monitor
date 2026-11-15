/**
 * Virtual IoMT Device Agent (Stage 4: Edge Computing & Anomaly Detection)
 * 
 * Embeds full edge computing pipeline:
 * - Deterministic physiological generation
 * - Local bedside threshold anomaly detection (<1ms)
 * - Sliding window summarization for bandwidth conservation (~80% reduction)
 * - Transmission policy decision engine
 * - Offline FIFO queue with automatic replay upon reconnection
 */

import { PhysiologyEngine } from './physiology-engine.js';
import { LocalVitalsProcessor } from './vitals-processor.js';
import { TransmissionEngine } from './transmission-engine.js';
import { OfflineQueue } from './offline-queue.js';
import { BackendClient } from './backend-client.js';

export class DeviceAgent {
  constructor(config, metricsCollector) {
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

    this.metricsCollector = metricsCollector;

    // Edge components
    this.physiology = new PhysiologyEngine(config.scenario || 'NORMAL');
    this.localProcessor = new LocalVitalsProcessor({
      deviceCode: this.deviceCode,
      patientId: this.patientId,
      thresholdProfile: config.thresholdProfile || 'STANDARD_ADULT',
      customThresholds: config.customThresholds,
      windowSize: config.windowSize || 5,
    });
    this.transmissionEngine = new TransmissionEngine(config.transmissionPolicy || 'TRANSMIT_ON_ANOMALY_OR_WINDOW');
    this.offlineQueue = new OfflineQueue(2000);
    this.backendClient = new BackendClient(this.backendUrl);

    this.isRunning = false;
    this.timer = null;
    this.lastReading = null;
    this.lastSentAt = null;
    this.lastStatus = 'INITIALIZED';
    this.lastError = null;
    this.readingsCount = 0;
    this.localAlertsCount = 0;
  }

  /**
   * Start telemetry streaming & local processing
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastStatus = 'STREAMING';
    console.log(`[DeviceAgent ${this.deviceCode}] Started streaming (interval: ${this.intervalMs}ms, scenario: ${this.physiology.getScenario()}, policy: ${this.transmissionEngine.policy}).`);

    // Immediate first tick
    this.tickAndProcess();

    this.timer = setInterval(() => {
      this.tickAndProcess();
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

  setInterval(ms) {
    const newInterval = Math.max(1000, Math.min(60000, Number(ms)));
    this.intervalMs = newInterval;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  setScenario(scenarioKey) {
    return this.physiology.setScenario(scenarioKey);
  }

  setTransmissionPolicy(policyId) {
    return this.transmissionEngine.setPolicy(policyId);
  }

  setThresholdProfile(profileKey) {
    return this.localProcessor.setProfile(profileKey);
  }

  setCustomThresholds(thresholds) {
    this.localProcessor.setCustomThresholds(thresholds);
  }

  /**
   * Toggle simulated network connectivity (for offline buffering demonstration)
   */
  async setNetworkConnectivity(isOnline) {
    const res = this.offlineQueue.setOnlineStatus(isOnline);
    this.metricsCollector.setOfflineBufferedCount(this.offlineQueue.size());

    console.log(`[DeviceAgent ${this.deviceCode}] Simulated Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    if (res.justReconnected && this.offlineQueue.size() > 0) {
      console.log(`[DeviceAgent ${this.deviceCode}] Network restored! Replaying ${this.offlineQueue.size()} buffered readings...`);
      await this.synchronizeOfflineBuffer();
    }

    return res;
  }

  /**
   * Synchronizes buffered offline telemetry to central backend
   */
  async synchronizeOfflineBuffer() {
    const bufferedItems = this.offlineQueue.drainAll();
    this.metricsCollector.setOfflineBufferedCount(0);

    if (bufferedItems.length === 0) return { synchronized: 0 };

    console.log(`[DeviceAgent ${this.deviceCode}] Synchronizing batch of ${bufferedItems.length} readings to PostgreSQL...`);

    const payload = {
      deviceId: this.deviceCode,
      apiKey: this.apiKey,
      patientId: this.patientId,
      readings: bufferedItems.map((item) => ({
        heartRate: item.heartRate,
        spo2: item.spo2,
        bloodPressureSys: item.bloodPressureSys,
        bloodPressureDia: item.bloodPressureDia,
        temperature: item.temperature,
        respiratoryRate: item.respiratoryRate,
        scenario: item.scenario || 'OFFLINE_REPLAY',
        isSimulated: true,
        recordedAt: item.recordedAt,
      })),
    };

    const res = await this.backendClient.ingestVitals(payload);

    if (res.success) {
      this.metricsCollector.recordTransmission(res.rttMs);
      console.log(`[DeviceAgent ${this.deviceCode}] ✅ Successfully synchronized ${bufferedItems.length} buffered readings to central DB.`);
    } else {
      console.error(`[DeviceAgent ${this.deviceCode}] ❌ Offline sync failed. Re-buffering readings.`);
      for (const item of bufferedItems) {
        this.offlineQueue.enqueue(item);
      }
      this.metricsCollector.setOfflineBufferedCount(this.offlineQueue.size());
    }

    return { synchronized: bufferedItems.length, success: res.success };
  }

  /**
   * Master execution tick:
   * 1. Generates physiological reading
   * 2. Executes local edge analysis & threshold checks (<1ms)
   * 3. Dispatches local alerts immediately upon anomaly
   * 4. Applies transmission decision engine (summary vs. immediate)
   * 5. Buffers into offline queue if connectivity is down
   */
  async tickAndProcess() {
    try {
      // 1. Generate physiological telemetry
      const rawReading = this.physiology.tick();
      this.lastReading = rawReading;
      this.readingsCount++;
      this.metricsCollector.recordGenerated(1);

      // Deplete battery very slowly
      if (this.readingsCount % 10 === 0 && this.batteryLevel > 15) {
        this.batteryLevel = Math.max(15, this.batteryLevel - 0.05);
      }

      // 2. Local Edge Vitals Processing & Threshold Anomaly Detection
      const processed = this.localProcessor.process(rawReading);

      // Record local processing latency
      this.metricsCollector.recordLocalProcessing(
        processed.processingLatencyMs,
        processed.evaluation.confirmedState === 'NORMAL' && this.transmissionEngine.policy !== 'SEND_ALL'
      );

      // 3. Local Alert Generator: Dispatch Immediate Alert
      if (processed.alertToEmit) {
        this.localAlertsCount++;
        this.metricsCollector.recordAlert();

        const alertPayload = {
          patientId: this.patientId,
          deviceId: this.id || this.deviceCode,
          vitalType: processed.alertToEmit.vitalType,
          severity: processed.alertToEmit.severity,
          message: processed.alertToEmit.message,
          currentValue: processed.alertToEmit.currentValue,
          thresholdValue: processed.alertToEmit.thresholdValue,
          createdAt: processed.alertToEmit.detectedAt,
        };

        console.log(`[DeviceAgent ${this.deviceCode}] 🚨 LOCAL ALERT [${alertPayload.severity}]: ${alertPayload.message} (Detection latency: ${processed.processingLatencyMs}ms)`);

        // If online, report to backend alerts endpoint immediately
        if (this.offlineQueue.isOnline) {
          this.backendClient.reportAlert(alertPayload).catch((e) => {
            console.error('[DeviceAgent] Alert report failed:', e.message);
          });
        }
      }

      // 4. Transmission Decision Engine
      const decision = this.transmissionEngine.evaluate(processed);

      if (!decision.shouldTransmit) {
        // Telemetry was summarized / bandwidth saved at the edge!
        this.lastStatus = 'SUMMARIZED_AT_EDGE';
        return;
      }

      // 5. Transmission / Buffering
      const itemToTransmit = {
        deviceId: this.deviceCode,
        apiKey: this.apiKey,
        patientId: this.patientId,
        heartRate: decision.payload.heartRate,
        spo2: decision.payload.spo2,
        bloodPressureSys: decision.payload.bloodPressureSys,
        bloodPressureDia: decision.payload.bloodPressureDia,
        temperature: decision.payload.temperature,
        respiratoryRate: decision.payload.respiratoryRate,
        scenario: decision.payload.scenario || rawReading.scenario,
        isSimulated: true,
        recordedAt: decision.payload.recordedAt || rawReading.recordedAt,
      };

      // Check if network is simulated offline
      if (!this.offlineQueue.isOnline) {
        this.offlineQueue.enqueue(itemToTransmit);
        this.metricsCollector.setOfflineBufferedCount(this.offlineQueue.size());
        this.lastStatus = `OFFLINE_BUFFERED (${this.offlineQueue.size()})`;
        console.log(`[DeviceAgent ${this.deviceCode}] 📦 [Offline Mode] Buffered reading. Queue depth: ${this.offlineQueue.size()}`);
        return;
      }

      // Transmit to central backend
      const res = await this.backendClient.ingestVitals(itemToTransmit);

      if (res.isNetworkError) {
        // Physical network connection failure -> auto fallback to offline queue
        this.offlineQueue.enqueue(itemToTransmit);
        this.metricsCollector.setOfflineBufferedCount(this.offlineQueue.size());
        this.lastStatus = `OFFLINE_NETWORK_DROPPED (${this.offlineQueue.size()})`;
        console.warn(`[DeviceAgent ${this.deviceCode}] Connection lost. Falling back to offline queue (${this.offlineQueue.size()} items).`);
      } else if (!res.success) {
        this.lastStatus = `ERROR: ${res.status}`;
        this.lastError = res.error;
      } else {
        this.lastStatus = 'STREAMING_OK';
        this.lastError = null;
        this.lastSentAt = new Date().toISOString();
        this.metricsCollector.recordTransmission(res.rttMs);

        const badge = processed.isCritical ? '🚨 CRITICAL' : processed.isAbnormal ? '⚠️ WARNING' : '💚 NORMAL';
        console.log(
          `[DeviceAgent ${this.deviceCode}] ${badge} HR: ${itemToTransmit.heartRate} | SpO2: ${itemToTransmit.spo2}% | BP: ${itemToTransmit.bloodPressureSys}/${itemToTransmit.bloodPressureDia} [${decision.reason}] RTT: ${res.rttMs}ms`
        );
      }
    } catch (err) {
      this.lastStatus = 'PROCESSING_ERROR';
      this.lastError = err.message;
      console.error(`[DeviceAgent ${this.deviceCode}] Error in edge pipeline:`, err);
    }
  }

  getStatus() {
    const queueStats = this.offlineQueue.getStats();
    return {
      id: this.id,
      deviceCode: this.deviceCode,
      name: this.name,
      patientId: this.patientId,
      patientCode: this.patientCode,
      patientName: this.patientName,
      intervalMs: this.intervalMs,
      scenario: this.physiology.getScenario(),
      transmissionPolicy: this.transmissionEngine.policy,
      thresholdProfile: this.localProcessor.thresholdEngine.profileName,
      thresholds: this.localProcessor.thresholdEngine.thresholds,
      isRunning: this.isRunning,
      isOnline: this.offlineQueue.isOnline,
      offlineBufferSize: queueStats.currentBufferSize,
      batteryLevel: Math.round(this.batteryLevel),
      lastStatus: this.lastStatus,
      lastError: this.lastError,
      lastSentAt: this.lastSentAt,
      readingsCount: this.readingsCount,
      localAlertsCount: this.localAlertsCount,
      lastReading: this.lastReading,
    };
  }
}
