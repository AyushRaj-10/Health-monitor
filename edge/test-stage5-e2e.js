/**
 * Stage 5 Automated End-to-End Verification Suite:
 * Real-Time Patient Monitoring via Socket.IO
 */

import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5001';
const API_URL = `${BACKEND_URL}/api`;

async function runStage5Tests() {
  console.log('================================================================');
  console.log('🧪 Starting Stage 5 Automated E2E Verification Suite: Real-Time Socket.IO');
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

  // 1. Obtain Tokens for Doctor Vance and Admin
  console.log('--- Step 1: Staff Authentication ---');
  const loginVance = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' }),
  });
  const vanceData = await loginVance.json();
  const vanceToken = vanceData.data?.accessToken;
  assert(loginVance.ok && vanceToken, 'Dr. Elena Vance authenticated and obtained JWT');

  const loginAdmin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@iomt-health.org', password: 'Admin123!' }),
  });
  const adminData = await loginAdmin.json();
  const adminToken = adminData.data?.accessToken;
  assert(loginAdmin.ok && adminToken, 'Admin Dr. Gregory House authenticated');

  // 2. Unauthenticated Connection Rejection
  console.log('\n--- Step 2: Unauthenticated Connection Security Check ---');
  await new Promise((resolve) => {
    const unauthSocket = io(BACKEND_URL, {
      auth: { token: '' },
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
    });

    unauthSocket.on('connect_error', (err) => {
      assert(
        err.message.includes('AUTHENTICATION_ERROR'),
        `Unauthenticated connection rejected with auth error: "${err.message}"`
      );
      unauthSocket.disconnect();
      resolve();
    });

    unauthSocket.on('connect', () => {
      assert(false, 'Unauthenticated socket should not have connected');
      unauthSocket.disconnect();
      resolve();
    });
  });

  // 3. Authenticated Socket Connection
  console.log('\n--- Step 3: Authenticated Socket.IO Handshake ---');
  const clientSocket = io(BACKEND_URL, {
    auth: { token: vanceToken },
    transports: ['websocket'],
    reconnection: true,
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection timeout')), 5000);
    clientSocket.on('connect', () => {
      clearTimeout(timer);
      assert(true, `Socket connected successfully with ID: ${clientSocket.id}`);
      resolve();
    });
  });

  // 4. Patient Room Subscription & Authorization Check
  console.log('\n--- Step 4: Patient Room Subscription & Access Control ---');
  const arthurId = '28657e0f-6787-4f36-8d65-884bbaff96ac'; // Arthur Pendelton (assigned to Dr. Vance)

  // 4a. Authorized subscription
  await new Promise((resolve) => {
    clientSocket.emit('monitoring:subscribe', { patientId: arthurId }, (res) => {
      assert(res?.success === true, `Dr. Vance successfully subscribed to assigned patient Arthur (${arthurId})`);
      assert(res?.room === `patient:${arthurId}`, `Joined room patient:${arthurId}`);
      resolve();
    });
  });

  // 5. Real-Time Vitals Event Broadcast (vitals:update)
  console.log('\n--- Step 5: Live Vitals Push Event (vitals:update) ---');
  let vitalsEventReceived = false;

  const vitalsPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for vitals:update event')), 8000);

    clientSocket.on('vitals:update', (payload) => {
      if (payload.patientId === arthurId && payload.reading) {
        clearTimeout(timeout);
        vitalsEventReceived = true;
        assert(true, `Received real-time "vitals:update" for Arthur Pendelton via room patient:${arthurId}`);
        assert(payload.reading.heartRate > 0, `Payload contains live HR: ${payload.reading.heartRate} bpm`);
        assert(payload.reading.spo2 > 0, `Payload contains live SpO2: ${payload.reading.spo2}%`);
        assert(Boolean(payload.broadcastAt), `Broadcast timestamp present: ${payload.broadcastAt}`);
        resolve();
      }
    });
  });

  // Ingest reading via backend HTTP API to trigger the event pipeline
  const testReadingRes = await fetch(`${API_URL}/vitals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'DEV-1001',
      apiKey: 'dev_key_arthur_ecg_84920',
      patientId: arthurId,
      heartRate: 78,
      spo2: 99,
      bloodPressureSys: 122,
      bloodPressureDia: 81,
      temperature: 36.8,
      scenario: 'REALTIME_VERIFICATION',
      isSimulated: true,
      recordedAt: new Date().toISOString(),
    }),
  });
  assert(testReadingRes.ok, 'Telemetry reading ingested and committed to PostgreSQL');

  await vitalsPromise;
  assert(vitalsEventReceived, 'Confirmed real-time WebSocket push arrived without polling');

  // 6. Real-Time Alert Event Broadcast (alert:new)
  console.log('\n--- Step 6: Real-Time Anomaly Alert Push (alert:new) ---');
  let alertEventReceived = false;

  const alertPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for alert:new event')), 8000);

    clientSocket.on('alert:new', (payload) => {
      if (payload.patientId === arthurId && payload.alert) {
        clearTimeout(timeout);
        alertEventReceived = true;
        assert(true, `Received real-time "alert:new" event for patient ${arthurId}`);
        assert(payload.alert.severity === 'CRITICAL', 'Alert severity is CRITICAL');
        assert(payload.alert.message.includes('Paroxysmal'), `Alert message verified: "${payload.alert.message}"`);
        resolve();
      }
    });
  });

  // Post new alert to trigger the broadcast
  const alertRes = await fetch(`${API_URL}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: arthurId,
      deviceId: 'DEV-1001',
      vitalType: 'Heart Rate',
      severity: 'CRITICAL',
      message: 'Paroxysmal Tachycardia Spike: HR exceeded 150 bpm',
      currentValue: '152',
      thresholdValue: '>135',
      createdAt: new Date().toISOString(),
    }),
  });
  assert(alertRes.ok, 'Alert persisted to PostgreSQL');

  await alertPromise;
  assert(alertEventReceived, 'Confirmed real-time alert delivered instantly over WebSocket');

  // 7. Multi-Patient Concurrent Monitoring (staff:overview channel)
  console.log('\n--- Step 7: Multi-Patient Concurrent Monitoring ---');
  const beatriceId = 'e30a1576-412b-4de4-bf10-e3f1825eca95'; // Beatrice Chen (DEV-1002)

  let beatriceUpdateReceived = false;
  const beatricePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for multi-patient telemetry')), 8000);

    clientSocket.on('vitals:update', (payload) => {
      if (payload.patientId === beatriceId) {
        clearTimeout(timeout);
        beatriceUpdateReceived = true;
        assert(true, 'Received real-time vitals for Beatrice Chen on staff channel');
        resolve();
      }
    });
  });

  await fetch(`${API_URL}/vitals/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'DEV-1002',
      apiKey: 'dev_key_beatrice_spo2_55104',
      patientId: beatriceId,
      heartRate: 74,
      spo2: 98,
      bloodPressureSys: 120,
      bloodPressureDia: 80,
      temperature: 36.7,
      scenario: 'MULTI_PATIENT_TEST',
      isSimulated: true,
      recordedAt: new Date().toISOString(),
    }),
  });

  await beatricePromise;
  assert(beatriceUpdateReceived, 'Multi-patient simultaneous telemetry streams verified');

  // 8. Clean Unsubscription & Disconnect
  console.log('\n--- Step 8: Unsubscription & Clean Disconnect ---');
  await new Promise((resolve) => {
    clientSocket.emit('monitoring:unsubscribe', { patientId: arthurId }, (res) => {
      assert(res?.success === true, 'Successfully unsubscribed from patient:arthurId');
      resolve();
    });
  });

  clientSocket.disconnect();
  assert(clientSocket.disconnected === true, 'Client socket disconnected cleanly');

  console.log('\n================================================================');
  console.log(`🏁 Stage 5 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runStage5Tests().catch((err) => {
  console.error('Fatal Stage 5 Test Runner Error:', err);
  process.exit(1);
});
