/**
 * Stage 4 Automated End-to-End Verification Suite:
 * Edge Computing, Local Anomaly Detection & Transmission Policies
 */

const BACKEND_URL = 'http://localhost:5001/api';
const SIMULATOR_URL = 'http://localhost:5005/api';

async function runStage4Tests() {
  console.log('================================================================');
  console.log('🧪 Starting Stage 4 Automated E2E Verification Suite: Edge & Anomaly');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Authenticate as Doctor
  console.log('--- Step 1: Staff Authentication ---');
  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.vance@iomt-health.org',
      password: 'Doctor123!',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.data?.accessToken, 'Doctor logged in successfully');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginData.data.accessToken}`,
  };

  // 2. Edge Processing Works Independently
  console.log('\n--- Step 2: Edge Node Status & Metrics Endpoint ---');
  const metricsRes = await fetch(`${SIMULATOR_URL}/metrics`);
  const metricsData = await metricsRes.json();
  assert(metricsRes.ok && metricsData.success === true, 'GET /api/metrics responds successfully');
  assert(metricsData.data.totalReadingsGenerated > 0, `Total readings generated: ${metricsData.data.totalReadingsGenerated}`);
  assert(metricsData.data.readingsProcessedLocally > 0, `Readings processed locally: ${metricsData.data.readingsProcessedLocally}`);
  assert(metricsData.disclaimer.includes('demonstration'), 'Contains clinical demonstration disclaimer');

  // 3. Local Anomaly Detection & Latency Benchmarking
  console.log('\n--- Step 3: Local Anomaly Detection & Latency ---');
  assert(
    metricsData.data.averageEdgeProcessingLatencyMs < 1.0,
    `Edge local threshold evaluation is sub-millisecond: ${metricsData.data.averageEdgeProcessingLatencyMs}ms (< 1ms)`
  );
  assert(
    metricsData.data.simulatedCentralizedDetectionLatencyMs > metricsData.data.averageEdgeProcessingLatencyMs,
    `Edge anomaly detection (${metricsData.data.averageEdgeProcessingLatencyMs}ms) is faster than cloud roundtrip (${metricsData.data.simulatedCentralizedDetectionLatencyMs}ms)`
  );
  console.log(`   Speedup factor: ~${metricsData.data.detectionSpeedupFactor}x faster`);

  // 4. Transmission Policy: Edge Window Summarization (~70-80% reduction)
  console.log('\n--- Step 4: Transmission Policy & Bandwidth Reduction ---');
  // Set policy to TRANSMIT_ON_ANOMALY_OR_WINDOW
  const policyRes = await fetch(`${SIMULATOR_URL}/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy: 'TRANSMIT_ON_ANOMALY_OR_WINDOW' }),
  });
  assert(policyRes.ok, 'Transmission policy set to TRANSMIT_ON_ANOMALY_OR_WINDOW');

  console.log('   Waiting 5 seconds for telemetry summarization...');
  await new Promise((r) => setTimeout(r, 5000));

  const afterPolicyRes = await fetch(`${SIMULATOR_URL}/metrics`);
  const afterPolicyData = await afterPolicyRes.json();
  assert(
    afterPolicyData.data.readingsSummarized > 0,
    `Normal readings successfully summarized locally: ${afterPolicyData.data.readingsSummarized} packets`
  );
  assert(
    afterPolicyData.data.transmissionReductionPercent >= 50,
    `Egress transmission reduction achieved: ${afterPolicyData.data.transmissionReductionPercent}% (>= 50%)`
  );

  // 5. Immediate Anomaly Alert Generation (Without Waiting for Backend)
  console.log('\n--- Step 5: Immediate Local Anomaly Alert Generation ---');
  // Trigger CRITICAL_TACHYCARDIA on DEV-1001
  await fetch(`${SIMULATOR_URL}/device/DEV-1001/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'CRITICAL_TACHYCARDIA', autoStart: true }),
  });

  console.log('   Waiting 3.5s for local anomaly detection & alert dispatch...');
  await new Promise((r) => setTimeout(r, 3500));

  const alertsRes = await fetch(`${BACKEND_URL}/alerts`, { headers: authHeaders });
  const alertsData = await alertsRes.json();
  assert(alertsRes.ok && alertsData.data?.length > 0, `Local alerts persisted in PostgreSQL: ${alertsData.data?.length} alerts`);

  const tachycardiaAlert = alertsData.data.find(
    (a) => a.vitalType === 'Heart Rate' && a.severity === 'CRITICAL'
  );
  assert(tachycardiaAlert !== undefined, 'Local Edge Anomaly Engine generated CRITICAL alert for Tachycardia');
  console.log(`   Alert Message: "${tachycardiaAlert?.message}"`);

  // Reset scenario back to NORMAL
  await fetch(`${SIMULATOR_URL}/device/DEV-1001/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'NORMAL' }),
  });

  // 6. Offline Buffering & Automatic Synchronization
  console.log('\n--- Step 6: Offline Buffering & Replay Synchronization ---');
  // 6a. Disconnect network
  console.log('   Simulating edge network link drop (isOnline = false)...');
  const offlineToggleRes = await fetch(`${SIMULATOR_URL}/network-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: false }),
  });
  assert(offlineToggleRes.ok, 'Simulated network offline toggle succeeded');

  console.log('   Waiting 6s to accumulate readings in offline queue...');
  await new Promise((r) => setTimeout(r, 6000));

  const duringOfflineRes = await fetch(`${SIMULATOR_URL}/metrics`);
  const duringOfflineData = await duringOfflineRes.json();
  const bufferedCount = duringOfflineData.data.offlineBufferedReadings;
  assert(
    bufferedCount > 0,
    `Telemetry buffered into local FIFO queue during network outage: ${bufferedCount} readings`
  );

  // 6b. Reconnect network & assert automatic synchronization
  console.log('   Restoring network link (isOnline = true)...');
  const onlineToggleRes = await fetch(`${SIMULATOR_URL}/network-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: true }),
  });
  assert(onlineToggleRes.ok, 'Simulated network online reconnect toggle succeeded');

  console.log('   Waiting 2s for automatic buffer replay to backend...');
  await new Promise((r) => setTimeout(r, 2000));

  const afterSyncRes = await fetch(`${SIMULATOR_URL}/metrics`);
  const afterSyncData = await afterSyncRes.json();
  assert(
    afterSyncData.data.offlineBufferedReadings === 0,
    'Offline queue completely synchronized and drained to 0 (Zero health data lost)'
  );

  // 7. Edge vs Centralized Comparative Models
  console.log('\n--- Step 7: Edge vs Centralized Comparison Model ---');
  const comp = afterSyncData.data.comparativeModels;
  assert(comp.centralized && comp.edge, 'Metrics include comparativeModels for both Centralized and Edge');
  assert(
    comp.edge.transmittedReadings < comp.centralized.transmittedReadings,
    `Edge transmitted readings (${comp.edge.transmittedReadings}) < Centralized readings (${comp.centralized.transmittedReadings})`
  );
  assert(
    comp.edge.averageDetectionLatencyMs < comp.centralized.averageDetectionLatencyMs,
    `Edge detection latency (${comp.edge.averageDetectionLatencyMs}ms) < Centralized latency (${comp.centralized.averageDetectionLatencyMs}ms)`
  );

  // 8. Alert Acknowledgement & Resolution API
  console.log('\n--- Step 8: Alert Workflow (Acknowledge & Resolve) ---');
  if (tachycardiaAlert) {
    const ackRes = await fetch(`${BACKEND_URL}/alerts/${tachycardiaAlert.id}/acknowledge`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const ackData = await ackRes.json();
    assert(ackRes.ok && ackData.data?.isAcknowledged === true, 'Alert successfully acknowledged');

    const resolveRes = await fetch(`${BACKEND_URL}/alerts/${tachycardiaAlert.id}/resolve`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const resolveData = await resolveRes.json();
    assert(resolveRes.ok && resolveData.data?.isResolved === true, 'Alert successfully resolved in PostgreSQL');
  }

  console.log('\n================================================================');
  console.log(`🏁 Stage 4 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runStage4Tests().catch((err) => {
  console.error('Fatal Stage 4 Test Runner Error:', err);
  process.exit(1);
});
