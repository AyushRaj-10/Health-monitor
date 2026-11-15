/**
 * Stage 6 Automated End-to-End Verification Suite:
 * Alert Management Lifecycle & Health Analytics
 */

import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5001';
const API_URL = `${BACKEND_URL}/api`;

async function runStage6Tests() {
  console.log('================================================================');
  console.log('🧪 Starting Stage 6 Automated E2E Verification Suite: Alert Lifecycle & Analytics');
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

  // 1. Staff Authentication
  console.log('--- Step 1: Staff Authentication ---');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' }),
  });
  const loginData = await loginRes.json();
  const vanceToken = loginData.data?.accessToken;
  const vanceUser = loginData.data?.user;
  assert(loginRes.ok && vanceToken, 'Dr. Elena Vance authenticated and obtained JWT token');
  const authHeaders = {
    Authorization: `Bearer ${vanceToken}`,
    'Content-Type': 'application/json',
  };

  // 2. Alert Ingestion & Open State Initialization
  console.log('\n--- Step 2: Alert Ingestion & OPEN State Initialization ---');
  const arthurId = '28657e0f-6787-4f36-8d65-884bbaff96ac';
  const newAlertPayload = {
    patientId: arthurId,
    deviceId: 'DEV-1001',
    alertType: 'TACHYCARDIA',
    vitalType: 'HEART_RATE',
    severity: 'CRITICAL',
    message: 'Stage 6 Verification: Paroxysmal Tachycardia spike detected at 162 bpm',
    source: 'EDGE_GATEWAY',
    currentValue: '162 bpm',
    thresholdValue: '140 bpm',
    triggeredAt: new Date().toISOString(),
  };

  const createAlertRes = await fetch(`${API_URL}/alerts/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAlertPayload),
  });
  const createAlertData = await createAlertRes.json();
  const createdAlert = createAlertData.data;

  assert(createAlertRes.status === 201, 'Alert ingested successfully (HTTP 201)');
  assert(createdAlert?.id, `Created Alert ID: ${createdAlert?.id}`);
  assert(createdAlert?.status === 'OPEN', 'Initial alert status is OPEN');
  assert(createdAlert?.isAcknowledged === false, 'Initial isAcknowledged is false');
  assert(createdAlert?.isResolved === false, 'Initial isResolved is false');
  assert(createdAlert?.severity === 'CRITICAL', 'Severity is correctly set to CRITICAL');
  assert(createdAlert?.source === 'EDGE_GATEWAY', 'Source recorded as EDGE_GATEWAY');
  assert(createdAlert?.triggeredAt, 'TriggeredAt timestamp recorded');

  // 3. Alert Retrieval & Multi-Dimensional Filtering
  console.log('\n--- Step 3: Alert Retrieval & Filtering APIs ---');
  // 3a. Detail View GET /api/alerts/:id
  const getDetailRes = await fetch(`${API_URL}/alerts/${createdAlert.id}`, {
    headers: authHeaders,
  });
  const detailData = await getDetailRes.json();
  assert(getDetailRes.ok, `GET /api/alerts/${createdAlert.id} returned 200 OK`);
  assert(detailData.data?.patient?.id === arthurId, 'Alert detail includes linked patient');
  assert(detailData.data?.device?.deviceCode === 'DEV-1001', 'Alert detail includes linked device');

  // 3b. List filtering by Status
  const listOpenRes = await fetch(`${API_URL}/alerts?status=OPEN&patientId=${arthurId}`, {
    headers: authHeaders,
  });
  const listOpenData = await listOpenRes.json();
  const foundInOpen = listOpenData.data?.some((a) => a.id === createdAlert.id);
  assert(foundInOpen, 'Alert correctly found when filtering by status=OPEN');

  // 3c. List filtering by Severity
  const listCritRes = await fetch(`${API_URL}/alerts?severity=CRITICAL&patientId=${arthurId}`, {
    headers: authHeaders,
  });
  const listCritData = await listCritRes.json();
  const foundInCrit = listCritData.data?.some((a) => a.id === createdAlert.id);
  assert(foundInCrit, 'Alert correctly found when filtering by severity=CRITICAL');

  // 3d. Date filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const listDateRes = await fetch(`${API_URL}/alerts?startDate=${yesterday}&endDate=${tomorrow}`, {
    headers: authHeaders,
  });
  const listDateData = await listDateRes.json();
  assert(listDateData.success && listDateData.data?.length > 0, 'Date range filtering on triggeredAt works');

  // 4. Alert Acknowledgment Transition
  console.log('\n--- Step 4: Alert Acknowledgment Transition ---');
  const ackRes = await fetch(`${API_URL}/alerts/${createdAlert.id}/acknowledge`, {
    method: 'PATCH',
    headers: authHeaders,
  });
  const ackData = await ackRes.json();
  assert(ackRes.ok, 'PATCH /api/alerts/:id/acknowledge succeeded');
  assert(ackData.data?.status === 'ACKNOWLEDGED', 'Alert status transitioned to ACKNOWLEDGED');
  assert(ackData.data?.isAcknowledged === true, 'isAcknowledged flag updated to true');
  assert(ackData.data?.acknowledgedAt !== null, 'acknowledgedAt timestamp recorded');
  assert(
    ackData.data?.acknowledgedBy?.includes(vanceUser.name) || ackData.data?.acknowledgedBy?.includes(vanceUser.email),
    `acknowledgedBy recorded as: "${ackData.data?.acknowledgedBy}"`
  );

  // 5. Alert Resolution Transition
  console.log('\n--- Step 5: Alert Resolution Transition ---');
  const resolutionNotes = 'Stage 6 Test: Administered 10mg IV Metoprolol. Sinus rhythm normalized.';
  const resolveRes = await fetch(`${API_URL}/alerts/${createdAlert.id}/resolve`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ resolutionNotes }),
  });
  const resolveData = await resolveRes.json();
  assert(resolveRes.ok, 'PATCH /api/alerts/:id/resolve succeeded');
  assert(resolveData.data?.status === 'RESOLVED', 'Alert status transitioned to RESOLVED');
  assert(resolveData.data?.isResolved === true, 'isResolved flag updated to true');
  assert(resolveData.data?.resolvedAt !== null, 'resolvedAt timestamp recorded');
  assert(
    resolveData.data?.resolvedBy?.includes(vanceUser.name) || resolveData.data?.resolvedBy?.includes(vanceUser.email),
    `resolvedBy recorded as: "${resolveData.data?.resolvedBy}"`
  );
  assert(resolveData.data?.resolutionNotes === resolutionNotes, 'Resolution clinical notes saved');

  // Verify persistence in DB
  const verifyDbRes = await fetch(`${API_URL}/alerts/${createdAlert.id}`, { headers: authHeaders });
  const verifyDbData = await verifyDbRes.json();
  assert(
    verifyDbData.data?.status === 'RESOLVED' && verifyDbData.data?.isResolved === true,
    'Resolved status verified directly in PostgreSQL via detail endpoint'
  );

  // 6. Analytics Overview API (System-Wide Population Aggregation)
  console.log('\n--- Step 6: Population Analytics Overview API ---');
  const overviewRes = await fetch(`${API_URL}/analytics/overview?timeRange=7d`, {
    headers: authHeaders,
  });
  const overviewData = await overviewRes.json();
  assert(overviewRes.ok, 'GET /api/analytics/overview returned 200 OK');
  assert(overviewData.data?.summary?.totalReadings > 0, `Total readings aggregated: ${overviewData.data?.summary?.totalReadings}`);
  assert(overviewData.data?.summary?.totalAlerts > 0, `Total alerts counted: ${overviewData.data?.summary?.totalAlerts}`);
  assert(overviewData.data?.populationStats?.avgHeartRate > 0, `Population Avg HR: ${overviewData.data?.populationStats?.avgHeartRate} bpm`);
  assert(overviewData.data?.populationStats?.avgSpo2 > 0, `Population Avg SpO2: ${overviewData.data?.populationStats?.avgSpo2}%`);
  assert(overviewData.data?.populationStats?.avgSystolic > 0, `Population Avg Systolic: ${overviewData.data?.populationStats?.avgSystolic} mmHg`);
  assert(overviewData.data?.populationStats?.avgTemperature > 0, `Population Avg Temp: ${overviewData.data?.populationStats?.avgTemperature} °C`);
  assert(overviewData.data?.alertsBySeverity?.CRITICAL >= 0, 'Alerts breakdown by severity present');
  assert(overviewData.data?.alertsByStatus?.RESOLVED >= 1, 'Alerts breakdown by status shows resolved alerts');
  assert(Array.isArray(overviewData.data?.alertTrends), 'Daily alert trends array present');
  assert(Array.isArray(overviewData.data?.patientSummaries), 'Patient monitoring summaries list present');

  // 7. Patient Analytics API (Individual Patient Summary)
  console.log('\n--- Step 7: Patient-Specific Analytics API ---');
  const patientAnalyticsRes = await fetch(`${API_URL}/analytics/patients/${arthurId}?timeRange=7d`, {
    headers: authHeaders,
  });
  const ptAnalyticsData = await patientAnalyticsRes.json();
  assert(patientAnalyticsRes.ok, `GET /api/analytics/patients/${arthurId} returned 200 OK`);
  assert(
    ptAnalyticsData.data?.patient?.name === 'Arthur Pendelton' &&
      ptAnalyticsData.data?.patient?.patientCode === 'PAT-84920',
    'Patient demographics match Arthur Pendelton (PAT-84920)'
  );
  assert(ptAnalyticsData.data?.vitalsSummary?.sampleCount > 0, `Patient sample count: ${ptAnalyticsData.data?.vitalsSummary?.sampleCount}`);
  assert(ptAnalyticsData.data?.alertsSummary?.total > 0, `Patient alert count: ${ptAnalyticsData.data?.alertsSummary?.total}`);
  assert(Array.isArray(ptAnalyticsData.data?.recentAlerts), 'Patient recent alerts list populated');

  // 8. Patient Vitals Time-Bucketed SQL Aggregation (GET /api/analytics/vitals/:id)
  console.log('\n--- Step 8: Time-Bucketed SQL date_trunc Aggregation API ---');
  const vitalsBucketsRes = await fetch(`${API_URL}/analytics/vitals/${arthurId}?bucket=hour&timeRange=7d`, {
    headers: authHeaders,
  });
  const vitalsBucketsData = await vitalsBucketsRes.json();
  assert(vitalsBucketsRes.ok, `GET /api/analytics/vitals/${arthurId} returned 200 OK`);
  assert(vitalsBucketsData.data?.bucket === 'hour', 'Bucket interval confirmed as "hour"');
  assert(vitalsBucketsData.data?.pointsCount > 0, `SQL aggregated bucket points returned: ${vitalsBucketsData.data?.pointsCount}`);

  const sampleBucket = vitalsBucketsData.data?.points?.[0];
  assert(sampleBucket?.bucketTime !== undefined, 'Bucket contains bucketTime timestamp');
  assert(sampleBucket?.avgHeartRate !== undefined, `Bucket avgHeartRate computed: ${sampleBucket?.avgHeartRate} bpm`);
  assert(sampleBucket?.minHeartRate !== undefined, `Bucket minHeartRate: ${sampleBucket?.minHeartRate}`);
  assert(sampleBucket?.maxHeartRate !== undefined, `Bucket maxHeartRate: ${sampleBucket?.maxHeartRate}`);
  assert(sampleBucket?.sampleCount > 0, `Bucket aggregated ${sampleBucket?.sampleCount} individual raw readings`);

  // 9. Real-Time Alert Lifecycle WebSocket Broadcast Verification
  console.log('\n--- Step 9: Real-Time Alert Lifecycle WebSocket Broadcast ---');
  const clientSocket = io(BACKEND_URL, {
    auth: { token: vanceToken },
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => {
    clientSocket.on('connect', () => {
      assert(true, `Staff socket connected: ${clientSocket.id}`);
      clientSocket.emit('monitoring:subscribe', { patientId: arthurId }, () => {
        assert(true, `Subscribed to patient room: patient:${arthurId}`);
        resolve();
      });
    });
  });

  // Test real-time broadcast of alert:update when alert is acknowledged
  const updateEventPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for alert:update event')), 6000);
    clientSocket.on('alert:update', (payload) => {
      clearTimeout(timeout);
      assert(payload?.patientId === arthurId, 'Received alert:update event for Arthur Pendelton');
      assert(payload?.alert?.id === createdAlert.id, 'alert:update references target alert ID');
      resolve();
    });
  });

  // Trigger an acknowledgment to produce alert:update
  await fetch(`${API_URL}/alerts/${createdAlert.id}/acknowledge`, {
    method: 'PATCH',
    headers: authHeaders,
  });

  await updateEventPromise;
  clientSocket.disconnect();
  assert(true, 'WebSocket disconnected cleanly');

  // Final Summary
  console.log('\n================================================================');
  console.log(`🏁 Stage 6 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage6Tests().catch((err) => {
  console.error('Fatal Stage 6 Test Runner Error:', err);
  process.exit(1);
});
