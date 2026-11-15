/**
 * IoMT Edge Metrics Collector
 * 
 * Aggregates live system telemetry, bandwidth reduction metrics,
 * microsecond processing latencies, and comparative edge vs. centralized models.
 */

export class EdgeMetricsCollector {
  constructor() {
    this.totalReadingsGenerated = 0;
    this.readingsProcessedLocally = 0;
    this.readingsTransmitted = 0;
    this.readingsSummarized = 0;
    this.alertsGeneratedLocally = 0;
    this.offlineBufferedReadings = 0;

    // Rolling latency windows (last 100 samples)
    this.edgeProcessingLatencies = [];
    this.backendTransmissionLatencies = [];

    // Rolling timeline snapshots for comparison charts
    this.historySnapshots = [];
    this.lastSnapshotTime = Date.now();
  }

  recordGenerated(count = 1) {
    this.totalReadingsGenerated += count;
  }

  recordLocalProcessing(latencyMs, isSummarized = false) {
    this.readingsProcessedLocally++;
    if (isSummarized) {
      this.readingsSummarized++;
    }
    this.edgeProcessingLatencies.push(latencyMs);
    if (this.edgeProcessingLatencies.length > 100) {
      this.edgeProcessingLatencies.shift();
    }
  }

  recordTransmission(latencyMs = null) {
    this.readingsTransmitted++;
    if (latencyMs !== null) {
      this.backendTransmissionLatencies.push(latencyMs);
      if (this.backendTransmissionLatencies.length > 100) {
        this.backendTransmissionLatencies.shift();
      }
    }
  }

  recordAlert() {
    this.alertsGeneratedLocally++;
  }

  setOfflineBufferedCount(count) {
    this.offlineBufferedReadings = count;
  }

  getMetrics() {
    const totalGen = Math.max(1, this.totalReadingsGenerated);
    const reductionPct = Math.max(
      0,
      Number((((totalGen - this.readingsTransmitted) / totalGen) * 100).toFixed(1))
    );

    const avgEdgeLatency =
      this.edgeProcessingLatencies.length > 0
        ? Number(
            (
              this.edgeProcessingLatencies.reduce((a, b) => a + b, 0) /
              this.edgeProcessingLatencies.length
            ).toFixed(3)
          )
        : 0.32; // Default baseline ~0.3ms

    const avgTransmissionLatency =
      this.backendTransmissionLatencies.length > 0
        ? Number(
            (
              this.backendTransmissionLatencies.reduce((a, b) => a + b, 0) /
              this.backendTransmissionLatencies.length
            ).toFixed(2)
          )
        : 28.5; // Typical local HTTP RTT

    // Estimated Centralized Cloud Anomaly Detection Latency:
    // (Edge sensor sample -> Serialization -> Network transit to cloud -> Cloud ingestion -> Cloud DB write -> Cloud threshold query)
    const simulatedCentralizedDetectionLatencyMs = Number((avgTransmissionLatency + 45.0).toFixed(1));

    // Periodic snapshot capture (every 3 seconds)
    if (Date.now() - this.lastSnapshotTime > 3000) {
      this.historySnapshots.push({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        generated: this.totalReadingsGenerated,
        transmitted: this.readingsTransmitted,
        summarized: this.readingsSummarized,
        reductionPct,
        edgeLatencyMs: avgEdgeLatency,
        cloudLatencyMs: simulatedCentralizedDetectionLatencyMs,
      });
      if (this.historySnapshots.length > 25) {
        this.historySnapshots.shift();
      }
      this.lastSnapshotTime = Date.now();
    }

    return {
      totalReadingsGenerated: this.totalReadingsGenerated,
      readingsProcessedLocally: this.readingsProcessedLocally,
      readingsTransmitted: this.readingsTransmitted,
      readingsSummarized: this.readingsSummarized,
      alertsGeneratedLocally: this.alertsGeneratedLocally,
      offlineBufferedReadings: this.offlineBufferedReadings,
      transmissionReductionPercent: reductionPct,
      averageEdgeProcessingLatencyMs: avgEdgeLatency,
      averageBackendTransmissionLatencyMs: avgTransmissionLatency,
      simulatedCentralizedDetectionLatencyMs,
      detectionSpeedupFactor: Number((simulatedCentralizedDetectionLatencyMs / Math.max(0.05, avgEdgeLatency)).toFixed(0)),

      // Models Comparison Breakdown
      comparativeModels: {
        centralized: {
          name: 'Centralized Architecture (Direct Cloud Streaming)',
          description: 'Every raw sensor sample transmitted to central cloud; all processing and alerting performed in remote database.',
          transmittedReadings: this.totalReadingsGenerated, // In centralized, 100% transmitted
          bandwidthUsagePct: 100.0,
          averageDetectionLatencyMs: simulatedCentralizedDetectionLatencyMs,
          offlineResilience: 'Vulnerable (Telemetry lost or stalled during network disruption)',
          cloudComputeBurden: 'High (Central servers process 100% of telemetry noise)',
        },
        edge: {
          name: 'IoMT Edge Architecture (Local Processing & Anomaly Dispatch)',
          description: 'Bedside local thresholds, sliding window summaries during normal telemetry, immediate emergency anomaly transmission, and offline FIFO buffering.',
          transmittedReadings: this.readingsTransmitted,
          bandwidthUsagePct: Number((100.0 - reductionPct).toFixed(1)),
          bandwidthSavingsPct: reductionPct,
          averageDetectionLatencyMs: avgEdgeLatency,
          offlineResilience: 'High (Autonomous offline buffering with automatic replay)',
          cloudComputeBurden: 'Minimal (Cloud receives only actionable alerts & window summaries)',
        },
      },
      historySnapshots: this.historySnapshots,
    };
  }
}
