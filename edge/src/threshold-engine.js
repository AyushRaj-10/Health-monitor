/**
 * IoMT Edge Threshold & Anomaly Detection Engine
 * 
 * Executes local, deterministic, multi-tier anomaly detection on physiological telemetry.
 * 
 * DISCLAIMER:
 * Thresholds are for academic demonstration and system evaluation only.
 * They must not be represented as clinically validated diagnostic rules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILES_PATH = path.resolve(__dirname, '../config/threshold-profiles.json');

export const MEDICAL_DISCLAIMER =
  'Notice: Thresholds are for demonstration and system evaluation only. They must not be represented as clinically validated diagnostic rules.';

export class ThresholdEngine {
  constructor(profileName = 'STANDARD_ADULT', customThresholds = null) {
    this.profiles = this.loadProfiles();
    this.profileName = this.profiles[profileName] ? profileName : 'STANDARD_ADULT';
    this.thresholds = customThresholds || { ...this.profiles[this.profileName] };

    // State tracking for persistence/hysteresis and deduplication
    this.consecutiveState = {
      state: 'NORMAL',
      count: 0,
      candidateState: 'NORMAL',
      candidateParameter: null,
    };

    this.activeAlertState = {
      state: 'NORMAL',
      severity: 'NORMAL',
      vitalType: null,
      message: null,
      lastAlertTimestamp: 0,
    };
  }

  loadProfiles() {
    try {
      if (fs.existsSync(PROFILES_PATH)) {
        const raw = fs.readFileSync(PROFILES_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed.profiles || {};
      }
    } catch (e) {
      console.warn('[ThresholdEngine] Using fallback default profiles.');
    }
    return {
      STANDARD_ADULT: {
        heartRate: { normalMin: 60, normalMax: 100, warningMin: 50, warningMax: 125, criticalMin: 45, criticalMax: 135 },
        spo2: { normalMin: 95, warningMin: 90, criticalMin: 88 },
        bloodPressureSys: { normalMin: 90, normalMax: 125, warningMin: 80, warningMax: 155, criticalMin: 75, criticalMax: 170 },
        bloodPressureDia: { normalMin: 60, normalMax: 82, warningMin: 50, warningMax: 96, criticalMin: 45, criticalMax: 105 },
        temperature: { normalMin: 36.5, normalMax: 37.5, warningMin: 35.5, warningMax: 38.4, criticalMin: 35.0, criticalMax: 38.8 },
        persistenceSamples: 2,
      },
    };
  }

  setProfile(profileKey) {
    if (this.profiles[profileKey]) {
      this.profileName = profileKey;
      this.thresholds = { ...this.profiles[profileKey] };
      return true;
    }
    return false;
  }

  setCustomThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds() {
    return {
      profileName: this.profileName,
      thresholds: this.thresholds,
      disclaimer: MEDICAL_DISCLAIMER,
    };
  }

  /**
   * Evaluates instantaneous vital reading against thresholds
   * Returns: { state: 'NORMAL'|'WARNING'|'CRITICAL', anomalies: [] }
   */
  evaluateInstantaneous(vitals) {
    const t = this.thresholds;
    const anomalies = [];

    // 1. Heart Rate Evaluation
    if (vitals.heartRate !== undefined) {
      const hr = vitals.heartRate;
      if (hr <= t.heartRate.criticalMin || hr >= t.heartRate.criticalMax) {
        anomalies.push({
          vitalType: 'Heart Rate',
          severity: 'CRITICAL',
          currentValue: hr,
          thresholdValue: hr >= t.heartRate.criticalMax ? `>${t.heartRate.criticalMax}` : `<${t.heartRate.criticalMin}`,
          message: hr >= t.heartRate.criticalMax
            ? `Critical Tachycardia: Heart rate at ${hr} bpm exceeds critical limit (${t.heartRate.criticalMax} bpm)`
            : `Critical Bradycardia: Heart rate at ${hr} bpm is below critical floor (${t.heartRate.criticalMin} bpm)`,
        });
      } else if (hr < t.heartRate.normalMin || hr > t.heartRate.normalMax) {
        anomalies.push({
          vitalType: 'Heart Rate',
          severity: 'WARNING',
          currentValue: hr,
          thresholdValue: hr > t.heartRate.normalMax ? `>${t.heartRate.normalMax}` : `<${t.heartRate.normalMin}`,
          message: hr > t.heartRate.normalMax
            ? `Elevated Heart Rate: ${hr} bpm exceeds normal resting bound (${t.heartRate.normalMax} bpm)`
            : `Low Heart Rate: ${hr} bpm is below normal bound (${t.heartRate.normalMin} bpm)`,
        });
      }
    }

    // 2. SpO2 Evaluation
    if (vitals.spo2 !== undefined) {
      const spo2 = vitals.spo2;
      if (spo2 <= t.spo2.criticalMin) {
        anomalies.push({
          vitalType: 'SpO2',
          severity: 'CRITICAL',
          currentValue: spo2,
          thresholdValue: `<${t.spo2.criticalMin}%`,
          message: `Acute Hypoxemic Desaturation: SpO2 at ${spo2}% is critically below ${t.spo2.criticalMin}%`,
        });
      } else if (spo2 < t.spo2.normalMin) {
        anomalies.push({
          vitalType: 'SpO2',
          severity: 'WARNING',
          currentValue: spo2,
          thresholdValue: `<${t.spo2.normalMin}%`,
          message: `Mild Oxygen Desaturation: SpO2 at ${spo2}% is below optimal ${t.spo2.normalMin}%`,
        });
      }
    }

    // 3. Blood Pressure Systolic & Diastolic
    if (vitals.bloodPressureSys !== undefined) {
      const sys = vitals.bloodPressureSys;
      if (sys >= t.bloodPressureSys.criticalMax || sys <= t.bloodPressureSys.criticalMin) {
        anomalies.push({
          vitalType: 'Blood Pressure',
          severity: 'CRITICAL',
          currentValue: `${sys}/${vitals.bloodPressureDia || '--'}`,
          thresholdValue: sys >= t.bloodPressureSys.criticalMax ? `Sys >= ${t.bloodPressureSys.criticalMax}` : `Sys <= ${t.bloodPressureSys.criticalMin}`,
          message: sys >= t.bloodPressureSys.criticalMax
            ? `Hypertensive Crisis: Systolic pressure at ${sys} mmHg requires emergent management`
            : `Hypotensive Shock: Systolic pressure at ${sys} mmHg is critically low`,
        });
      } else if (sys > t.bloodPressureSys.normalMax || sys < t.bloodPressureSys.normalMin) {
        anomalies.push({
          vitalType: 'Blood Pressure',
          severity: 'WARNING',
          currentValue: `${sys}/${vitals.bloodPressureDia || '--'}`,
          thresholdValue: sys > t.bloodPressureSys.normalMax ? `Sys > ${t.bloodPressureSys.normalMax}` : `Sys < ${t.bloodPressureSys.normalMin}`,
          message: sys > t.bloodPressureSys.normalMax
            ? `Stage 1/2 Hypertension: Systolic pressure at ${sys} mmHg elevated above ${t.bloodPressureSys.normalMax}`
            : `Low Systolic Pressure: ${sys} mmHg is below normal bound`,
        });
      }
    }

    // 4. Body Temperature
    if (vitals.temperature !== undefined) {
      const temp = vitals.temperature;
      if (temp >= t.temperature.criticalMax || temp <= t.temperature.criticalMin) {
        anomalies.push({
          vitalType: 'Body Temperature',
          severity: 'CRITICAL',
          currentValue: `${temp}°C`,
          thresholdValue: temp >= t.temperature.criticalMax ? `>=${t.temperature.criticalMax}°C` : `<=${t.temperature.criticalMin}°C`,
          message: temp >= t.temperature.criticalMax
            ? `High Pyrexia / Systemic Fever: Core temp at ${temp}°C exceeds critical threshold`
            : `Severe Hypothermia: Core temp at ${temp}°C is dangerously low`,
        });
      } else if (temp > t.temperature.normalMax || temp < t.temperature.normalMin) {
        anomalies.push({
          vitalType: 'Body Temperature',
          severity: 'WARNING',
          currentValue: `${temp}°C`,
          thresholdValue: temp > t.temperature.normalMax ? `>${t.temperature.normalMax}°C` : `<${t.temperature.normalMin}°C`,
          message: temp > t.temperature.normalMax
            ? `Febrile Elevation: Core temp at ${temp}°C elevated`
            : `Subnormal Temperature: Core temp at ${temp}°C`,
        });
      }
    }

    // Determine highest severity
    let highestSeverity = 'NORMAL';
    if (anomalies.some((a) => a.severity === 'CRITICAL')) {
      highestSeverity = 'CRITICAL';
    } else if (anomalies.some((a) => a.severity === 'WARNING')) {
      highestSeverity = 'WARNING';
    }

    return {
      state: highestSeverity,
      anomalies,
    };
  }

  /**
   * Applies persistence, hysteresis, and alert deduplication
   * Returns: {
   *   confirmedState: 'NORMAL'|'WARNING'|'CRITICAL',
   *   shouldGenerateAlert: boolean,
   *   alertPayload: object|null,
   *   stateTransition: 'NONE'|'ESCALATED'|'DE_ESCALATED'|'RECOVERED'
   * }
   */
  processReading(vitals) {
    const rawResult = this.evaluateInstantaneous(vitals);
    const persistenceRequired = this.thresholds.persistenceSamples || 2;

    // Critical anomalies bypass persistence requirement for immediate life-safety dispatch
    const isImmediateCritical = rawResult.state === 'CRITICAL';

    if (rawResult.state === this.consecutiveState.candidateState) {
      this.consecutiveState.count++;
    } else {
      this.consecutiveState.candidateState = rawResult.state;
      this.consecutiveState.count = 1;
      this.consecutiveState.candidateParameter = rawResult.anomalies[0]?.vitalType || null;
    }

    const isConfirmed = isImmediateCritical || this.consecutiveState.count >= persistenceRequired;
    const confirmedState = isConfirmed ? rawResult.state : this.activeAlertState.state;

    let stateTransition = 'NONE';
    let shouldGenerateAlert = false;
    let alertPayload = null;

    // Check transition against currently active state
    if (confirmedState !== this.activeAlertState.state) {
      if (confirmedState === 'CRITICAL') {
        stateTransition = 'ESCALATED';
        shouldGenerateAlert = true;
      } else if (confirmedState === 'WARNING' && this.activeAlertState.state === 'NORMAL') {
        stateTransition = 'ESCALATED';
        shouldGenerateAlert = true;
      } else if (confirmedState === 'NORMAL') {
        stateTransition = 'RECOVERED';
        // Can generate an info recovery notification if desired
      } else if (confirmedState === 'WARNING' && this.activeAlertState.state === 'CRITICAL') {
        stateTransition = 'DE_ESCALATED';
      }

      this.activeAlertState.state = confirmedState;
    }

    // Deduplication check: if alert is required, assemble highest-priority anomaly payload
    if (shouldGenerateAlert && rawResult.anomalies.length > 0) {
      const topAnomaly = rawResult.anomalies.find((a) => a.severity === confirmedState) || rawResult.anomalies[0];
      alertPayload = {
        vitalType: topAnomaly.vitalType,
        severity: topAnomaly.severity,
        message: topAnomaly.message,
        currentValue: topAnomaly.currentValue,
        thresholdValue: topAnomaly.thresholdValue,
        detectedAt: new Date().toISOString(),
        isLocalEdgeAlert: true,
      };
      this.activeAlertState.lastAlertTimestamp = Date.now();
    }

    return {
      rawState: rawResult.state,
      confirmedState,
      shouldGenerateAlert,
      alertPayload,
      stateTransition,
      anomalies: rawResult.anomalies,
      consecutiveCount: this.consecutiveState.count,
    };
  }
}
