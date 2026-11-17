import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ThresholdEngine } from '../../edge/src/threshold-engine.js';
import { OfflineQueue } from '../../edge/src/offline-queue.js';
import { sampleLaplaceNoise, processVitalsAtEdge } from '../../edge/src/edge-processor.js';

describe('Edge Computing, Anomaly Hysteresis & Differential Privacy Suite', () => {
  test('ThresholdEngine - Correctly identifies normal resting vitals', () => {
    const engine = new ThresholdEngine('STANDARD_ADULT');
    const result = engine.evaluateInstantaneous({
      heartRate: 72,
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.8,
    });

    assert.strictEqual(result.state, 'NORMAL');
    assert.strictEqual(result.anomalies.length, 0);
  });

  test('ThresholdEngine - Detects critical anomaly (Tachycardia)', () => {
    const engine = new ThresholdEngine('STANDARD_ADULT');
    const result = engine.evaluateInstantaneous({
      heartRate: 145,
      spo2: 97,
      bloodPressureSys: 125,
      bloodPressureDia: 82,
      temperature: 36.9,
    });

    assert.strictEqual(result.state, 'CRITICAL');
    assert.ok(result.anomalies.some((a) => a.vitalType === 'Heart Rate' && a.severity === 'CRITICAL'));
  });

  test('ThresholdEngine - Persistence & Hysteresis suppresses transient single-sample warning', () => {
    const engine = new ThresholdEngine('STANDARD_ADULT');
    // Sample 1: Transient warning spike (requires 2 persistent samples to transition)
    const warningReading = { heartRate: 110, spo2: 98, bloodPressureSys: 120, bloodPressureDia: 80, temperature: 36.7 };
    const res1 = engine.processReading(warningReading);
    assert.strictEqual(res1.confirmedState, 'NORMAL'); // Suppressed by persistence filter
    assert.strictEqual(res1.shouldGenerateAlert, false);

    // Sample 2: Persistent spike confirms warning anomaly
    const res2 = engine.processReading(warningReading);
    assert.strictEqual(res2.confirmedState, 'WARNING'); // Confirmed after 2 consecutive samples
    assert.strictEqual(res2.shouldGenerateAlert, true);
  });

  test('Differential Privacy - Laplace mechanism generates noise bounded around zero', () => {
    const samples = [];
    for (let i = 0; i < 500; i++) {
      samples.push(sampleLaplaceNoise(1.0, 0.5));
    }

    const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
    // Mean of 500 zero-mean Laplace samples should be close to 0 (|mean| < 0.6)
    assert.ok(Math.abs(mean) < 0.6, `Mean noise should center near 0, got ${mean}`);
  });

  test('Offline Queue - Buffers telemetry when disconnected and drains on reconnection', () => {
    const queue = new OfflineQueue(100);
    queue.setOnlineStatus(false);

    queue.enqueue({ readingId: 1, heartRate: 75 });
    queue.enqueue({ readingId: 2, heartRate: 76 });
    queue.enqueue({ readingId: 3, heartRate: 77 });

    assert.strictEqual(queue.size(), 3);

    // Network restored
    const status = queue.setOnlineStatus(true);
    assert.strictEqual(status.justReconnected, true);
    assert.strictEqual(status.pendingCount, 3);

    const drained = queue.drainAll();
    assert.strictEqual(drained.length, 3);
    assert.strictEqual(queue.size(), 0);
  });
});
