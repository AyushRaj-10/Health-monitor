/**
 * Comprehensive End-to-End Verification Test for Stage 3:
 * IoMT Simulation & Vitals Data Collection
 */

const BACKEND_URL = 'http://localhost:5001/api';
const SIMULATOR_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Stage 3 Automated E2E Verification Suite');
  console.log('====================================================\n');

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

  // 1. Authenticate as Doctor to access clinical endpoints
  console.log('--- Step 1: Doctor Authentication ---');
  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.vance@iomt-health.org',
      password: 'Doctor123!',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.data?.accessToken, 'Doctor logged in and obtained JWT');
  const token = loginData.data?.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Simulator Node Status & Multiple Device Operation
  console.log('\n--- Step 2: Edge Simulator Multi-Device Streaming ---');
  const simRes = await fetch(`${SIMULATOR_URL}/status`);
  const simData = await simRes.json();
  assert(simRes.ok && simData.data?.online === true, 'Edge Simulator node is online on port 5005');
  assert(simData.data?.totalDevices === 5, 'Simulator manages 5 clinical IoMT devices');
  assert(simData.data?.activeStreamingDevices >= 4, 'Multiple simulated devices are actively streaming');

  const dev1001 = simData.data.devices.find((d) => d.deviceCode === 'DEV-1001');
  assert(dev1001 && dev1001.isRunning, 'DEV-1001 (PulseGuard ECG Patch) is running');
  console.log(`   DEV-1001 readings count: ${dev1001.readingsCount}`);

  // 3. Security Boundary & Authorization Tests
  console.log('\n--- Step 3: Ingestion Security & Validation Enforcement ---');
  
  // 3a. Malformed reading
  const malformedRes = await fetch(`${BACKEND_URL}/vitals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'DEV-1001',
      apiKey: 'dev_key_arthur_ecg_84920',
      patientId: '28657e0f-6787-4f36-8d65-884bbaff96ac',
      heartRate: 999, // Exceeds human physiological max (260 bpm)
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.8,
    }),
  });
  const malformedData = await malformedRes.json();
  assert(
    malformedRes.status === 400 && malformedData.error?.code === 'MALFORMED_READING',
    'Rejects malformed telemetry out of physiological bounds (400 Bad Request)'
  );

  // 3b. Invalid API key
  const badKeyRes = await fetch(`${BACKEND_URL}/vitals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'DEV-1001',
      apiKey: 'WRONG_API_KEY_123',
      patientId: '28657e0f-6787-4f36-8d65-884bbaff96ac',
      heartRate: 75,
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.8,
    }),
  });
  const badKeyData = await badKeyRes.json();
  assert(
    badKeyRes.status === 401 && badKeyData.error?.code === 'INVALID_DEVICE_CREDENTIALS',
    'Rejects invalid device credentials / API key (401 Unauthorized)'
  );

  // 3c. Unauthorized patient association
  const unauthRes = await fetch(`${BACKEND_URL}/vitals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'DEV-1001', // Provisioned for Arthur
      apiKey: 'dev_key_arthur_ecg_84920',
      patientId: 'e30a1576-412b-4de4-bf10-e3f1825eca95', // Target is Beatrice Chen!
      heartRate: 75,
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.8,
    }),
  });
  const unauthData = await unauthRes.json();
  assert(
    unauthRes.status === 403 && unauthData.error?.code === 'UNAUTHORIZED_PATIENT_ASSOCIATION',
    'Blocks device submitting vitals for unauthorized patient (403 Forbidden)'
  );

  // 4. Device Management API & Heartbeat Tracking
  console.log('\n--- Step 4: Device Management & Heartbeat Tracking ---');
  const devicesRes = await fetch(`${BACKEND_URL}/devices`, { headers: authHeaders });
  const devicesData = await devicesRes.json();
  assert(devicesRes.ok && Array.isArray(devicesData.data), 'GET /api/devices responds with device fleet');
  assert(devicesData.data.length >= 5, `Device fleet count is ${devicesData.data.length} (>= 5)`);
  
  const onlineDev = devicesData.data.find((d) => d.deviceCode === 'DEV-1001');
  assert(onlineDev && onlineDev.status === 'ONLINE', 'DEV-1001 status is ONLINE');
  assert(onlineDev && onlineDev.lastHeartbeat, 'DEV-1001 tracks live heartbeat timestamp');
  assert(onlineDev && onlineDev._count?.readings > 0, `DEV-1001 has ${onlineDev._count?.readings} persisted readings`);

  // 5. Patient Vitals Query APIs
  console.log('\n--- Step 5: Patient Vitals Queries ---');
  const arthurId = '28657e0f-6787-4f36-8d65-884bbaff96ac';
  
  // 5a. Latest Vitals
  const latestRes = await fetch(`${BACKEND_URL}/patients/${arthurId}/vitals/latest`, {
    headers: authHeaders,
  });
  const latestData = await latestRes.json();
  assert(latestRes.ok && latestData.data !== null, 'GET /api/patients/:id/vitals/latest returns latest vitals');
  assert(latestData.data?.heartRate > 0, `Latest Heart Rate is ${latestData.data?.heartRate} bpm`);
  assert(latestData.data?.spo2 > 0, `Latest SpO2 is ${latestData.data?.spo2}%`);
  assert(latestData.data?.isSimulated === true, 'Telemetry is clearly marked isSimulated: true');

  // 5b. Historical Vitals
  const historyRes = await fetch(`${BACKEND_URL}/patients/${arthurId}/vitals?limit=20`, {
    headers: authHeaders,
  });
  const historyData = await historyRes.json();
  assert(historyRes.ok && historyData.data?.length > 0, 'GET /api/patients/:id/vitals returns historical telemetry');
  console.log(`   Retrieved ${historyData.data.length} historical readings for Arthur Pendelton (Total in DB: ${historyData.total})`);

  // 6. Clinical Scenario Transition & Anomaly Reproduction
  console.log('\n--- Step 6: Clinical Anomaly Scenario Trigger ---');
  console.log('   Triggering CRITICAL_TACHYCARDIA on DEV-1001...');
  const scenarioRes = await fetch(`${SIMULATOR_URL}/device/DEV-1001/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'CRITICAL_TACHYCARDIA', autoStart: true }),
  });
  const scenarioData = await scenarioRes.json();
  assert(scenarioRes.ok && scenarioData.data?.scenario === 'CRITICAL_TACHYCARDIA', 'Scenario successfully updated to CRITICAL_TACHYCARDIA');

  console.log('   Waiting 4 seconds for gradual physiological drift and transmission...');
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const afterAnomalyRes = await fetch(`${BACKEND_URL}/patients/${arthurId}/vitals/latest`, {
    headers: authHeaders,
  });
  const afterAnomalyData = await afterAnomalyRes.json();
  const currentHR = afterAnomalyData.data?.heartRate;
  console.log(`   Telemetry after anomaly trigger: HR = ${currentHR} bpm (Scenario: ${afterAnomalyData.data?.scenario})`);
  assert(currentHR >= 115, `Heart rate elevated dynamically to ${currentHR} bpm (Tachycardia reproduced)`);

  // Reset back to NORMAL
  await fetch(`${SIMULATOR_URL}/device/DEV-1001/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'NORMAL' }),
  });

  // 7. Start / Stop Simulation Control
  console.log('\n--- Step 7: Simulator Device Start & Stop Control ---');
  const stopRes = await fetch(`${SIMULATOR_URL}/device/DEV-1002/stop`, { method: 'POST' });
  const stopData = await stopRes.json();
  assert(stopRes.ok && stopData.data?.isRunning === false, 'DEV-1002 streaming successfully stopped');

  const startRes = await fetch(`${SIMULATOR_URL}/device/DEV-1002/start`, { method: 'POST' });
  const startData = await startRes.json();
  assert(startRes.ok && startData.data?.isRunning === true, 'DEV-1002 streaming successfully restarted');

  console.log('\n====================================================');
  console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
