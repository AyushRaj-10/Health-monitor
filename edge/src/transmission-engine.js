/**
 * IoMT Edge Transmission Decision Engine
 * 
 * Implements configurable policies for privacy-aware, bandwidth-optimized telemetry transmission.
 */

export const TRANSMISSION_POLICIES = {
  SEND_ALL: {
    id: 'SEND_ALL',
    name: 'Centralized Streaming Baseline (Send All)',
    description: 'Transmits every raw biometric reading directly to central cloud without local edge filtering.',
  },
  TRANSMIT_ON_ANOMALY_OR_WINDOW: {
    id: 'TRANSMIT_ON_ANOMALY_OR_WINDOW',
    name: 'Edge-Optimized (Window Summaries & Immediate Anomaly Dispatch)',
    description: 'Summarizes normal readings into sliding windows (~80% bandwidth reduction), transmits abnormal and critical readings immediately.',
  },
  IMMEDIATE_ANOMALIES_ONLY: {
    id: 'IMMEDIATE_ANOMALIES_ONLY',
    name: 'Emergency Anomaly Only (Maximum Bandwidth Conservation)',
    description: 'Suppresses normal telemetry transmissions, transmitting only when abnormal or critical thresholds are crossed.',
  },
};

export class TransmissionEngine {
  constructor(initialPolicy = 'TRANSMIT_ON_ANOMALY_OR_WINDOW') {
    this.policy = TRANSMISSION_POLICIES[initialPolicy] ? initialPolicy : 'TRANSMIT_ON_ANOMALY_OR_WINDOW';
  }

  setPolicy(policyId) {
    if (TRANSMISSION_POLICIES[policyId]) {
      this.policy = policyId;
      console.log(`[TransmissionEngine] Policy updated to: ${this.policy}`);
      return true;
    }
    return false;
  }

  getPolicy() {
    return {
      currentPolicy: this.policy,
      details: TRANSMISSION_POLICIES[this.policy],
      availablePolicies: Object.values(TRANSMISSION_POLICIES),
    };
  }

  /**
   * Evaluates processed vitals package against active transmission policy
   * Returns: {
   *   shouldTransmit: boolean,
   *   payload: object|null,
   *   reason: string,
   *   isSummarized: boolean
   * }
   */
  evaluate(processedResult) {
    const { reading, isAbnormal, shouldTransmitSummary, summaryPacket } = processedResult;

    // Policy 1: Centralized Baseline (Send All)
    if (this.policy === 'SEND_ALL') {
      return {
        shouldTransmit: true,
        payload: reading,
        reason: 'SEND_ALL_POLICY_CONTINUOUS',
        isSummarized: false,
      };
    }

    // Immediate dispatch for Abnormal or Critical events across all edge policies
    if (isAbnormal) {
      return {
        shouldTransmit: true,
        payload: reading,
        reason: 'PRIORITY_ANOMALY_IMMEDIATE',
        isSummarized: false,
      };
    }

    // Policy 2: Edge-Optimized Window Summaries
    if (this.policy === 'TRANSMIT_ON_ANOMALY_OR_WINDOW') {
      if (shouldTransmitSummary && summaryPacket) {
        return {
          shouldTransmit: true,
          payload: summaryPacket,
          reason: 'WINDOW_SUMMARY_TRANSMIT',
          isSummarized: true,
        };
      }
      return {
        shouldTransmit: false,
        payload: null,
        reason: 'SUMMARIZED_AT_EDGE_SKIPPED_RAW',
        isSummarized: true,
      };
    }

    // Policy 3: Immediate Anomalies Only (maximum bandwidth suppression)
    if (this.policy === 'IMMEDIATE_ANOMALIES_ONLY') {
      return {
        shouldTransmit: false,
        payload: null,
        reason: 'NORMAL_TELEMETRY_SUPPRESSED_AT_EDGE',
        isSummarized: true,
      };
    }

    return {
      shouldTransmit: true,
      payload: reading,
      reason: 'DEFAULT_FALLBACK',
      isSummarized: false,
    };
  }
}
