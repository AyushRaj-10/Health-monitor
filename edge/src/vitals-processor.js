/**
 * IoMT Edge Local Vitals Processor
 * 
 * Performs immediate bedside physiological analysis, local threshold checks,
 * microsecond processing latency benchmarking, and sliding-window aggregation.
 */

import { ThresholdEngine } from './threshold-engine.js';

export class LocalVitalsProcessor {
  constructor(options = {}) {
    this.deviceCode = options.deviceCode;
    this.patientId = options.patientId;
    this.windowSize = options.windowSize || 5;

    this.thresholdEngine = new ThresholdEngine(
      options.thresholdProfile || 'STANDARD_ADULT',
      options.customThresholds
    );

    // Sliding window buffer for normal telemetry summarization
    this.windowBuffer = [];
    this.windowStartTime = null;
  }

  setProfile(profileKey) {
    return this.thresholdEngine.setProfile(profileKey);
  }

  setCustomThresholds(thresholds) {
    this.thresholdEngine.setCustomThresholds(thresholds);
  }

  getThresholdEngine() {
    return this.thresholdEngine;
  }

  /**
   * Process a single vital telemetry sample locally at the edge.
   * Benchmarks exact local processing execution time.
   */
  process(rawReading) {
    const startTime = performance.now();

    // 1. Evaluate physiological state through threshold engine
    const evaluation = this.thresholdEngine.processReading(rawReading);

    const isAbnormal = evaluation.confirmedState !== 'NORMAL';
    const isCritical = evaluation.confirmedState === 'CRITICAL';

    let summaryPacket = null;
    let shouldTransmitSummary = false;

    // 2. Sliding Window Summarization Logic
    if (!isAbnormal) {
      if (this.windowBuffer.length === 0) {
        this.windowStartTime = rawReading.recordedAt || new Date().toISOString();
      }
      this.windowBuffer.push(rawReading);

      // Check if window is full
      if (this.windowBuffer.length >= this.windowSize) {
        summaryPacket = this.computeWindowSummary(this.windowBuffer, this.windowStartTime, rawReading.recordedAt);
        this.windowBuffer = [];
        this.windowStartTime = null;
        shouldTransmitSummary = true;
      }
    } else {
      // If abnormal or critical, flush any existing normal window buffer first
      if (this.windowBuffer.length > 0) {
        summaryPacket = this.computeWindowSummary(this.windowBuffer, this.windowStartTime, rawReading.recordedAt);
        this.windowBuffer = [];
        this.windowStartTime = null;
        shouldTransmitSummary = true;
      }
    }

    const endTime = performance.now();
    const processingLatencyMs = Number((endTime - startTime).toFixed(3));

    return {
      reading: rawReading,
      evaluation,
      isAbnormal,
      isCritical,
      shouldTransmitSummary,
      summaryPacket,
      alertToEmit: evaluation.alertPayload,
      processingLatencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Computes mathematical summary of normal window readings
   */
  computeWindowSummary(readings, startTime, endTime) {
    if (!readings || readings.length === 0) return null;

    const count = readings.length;
    let sumHR = 0, minHR = Infinity, maxHR = -Infinity;
    let sumSpo2 = 0, minSpo2 = Infinity, maxSpo2 = -Infinity;
    let sumSys = 0, sumDia = 0, sumTemp = 0;

    for (const r of readings) {
      sumHR += r.heartRate;
      minHR = Math.min(minHR, r.heartRate);
      maxHR = Math.max(maxHR, r.heartRate);

      sumSpo2 += r.spo2;
      minSpo2 = Math.min(minSpo2, r.spo2);
      maxSpo2 = Math.max(maxSpo2, r.spo2);

      sumSys += r.bloodPressureSys;
      sumDia += r.bloodPressureDia;
      sumTemp += r.temperature;
    }

    // Representative sample for backward-compatible ingest
    return {
      isWindowSummary: true,
      sampleCount: count,
      windowStartTime: startTime,
      windowEndTime: endTime || new Date().toISOString(),
      heartRate: Math.round(sumHR / count),
      minHeartRate: minHR,
      maxHeartRate: maxHR,
      spo2: Math.round(sumSpo2 / count),
      minSpo2,
      maxSpo2,
      bloodPressureSys: Math.round(sumSys / count),
      bloodPressureDia: Math.round(sumDia / count),
      temperature: Number((sumTemp / count).toFixed(1)),
      scenario: 'NORMAL_WINDOW_SUMMARY',
      isSimulated: true,
      recordedAt: endTime || new Date().toISOString(),
    };
  }
}
