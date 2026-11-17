import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Vitals Ingestion & Boundaries Suite', () => {
  let doctorElenaToken = '';
  let arthurPatient = null;
  let marcusPatient = null;
  let arthurDevice = null;

  before(async () => {
    const elenaRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' });
    doctorElenaToken = elenaRes.body.data.accessToken;

    arthurPatient = await prisma.patient.findFirst({ where: { patientCode: 'PAT-84920' } });
    marcusPatient = await prisma.patient.findFirst({ where: { patientCode: 'PAT-91244' } });
    arthurDevice = await prisma.device.findFirst({ where: { deviceCode: 'DEV-1001' } });
  });

  test('POST /api/vitals/ingest - Ingest valid physiological vitals reading', async () => {
    const res = await request(app)
      .post('/api/vitals/ingest')
      .send({
        deviceId: arthurDevice.deviceCode,
        apiKey: arthurDevice.apiKey,
        patientId: arthurPatient.patientCode,
        heartRate: 74,
        spo2: 98,
        bloodPressureSys: 120,
        bloodPressureDia: 80,
        temperature: 36.8,
        respiratoryRate: 16,
        scenario: 'NORMAL',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.count, 1);
    assert.strictEqual(res.body.data.deviceId, arthurDevice.deviceCode);
  });

  test('POST /api/vitals/ingest - Reject invalid device API key (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/vitals/ingest')
      .send({
        deviceId: arthurDevice.deviceCode,
        apiKey: 'WRONG_UNAUTHORIZED_KEY',
        patientId: arthurPatient.patientCode,
        heartRate: 75,
        spo2: 98,
        bloodPressureSys: 120,
        bloodPressureDia: 80,
        temperature: 36.6,
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_DEVICE_CREDENTIALS');
  });

  test('POST /api/vitals/ingest - Reject device transmitting for unauthorized patient (403 Forbidden)', async () => {
    // DEV-1001 belongs to Arthur, but payload targets Marcus
    const res = await request(app)
      .post('/api/vitals/ingest')
      .send({
        deviceId: arthurDevice.deviceCode,
        apiKey: arthurDevice.apiKey,
        patientId: marcusPatient.patientCode,
        heartRate: 78,
        spo2: 97,
        bloodPressureSys: 122,
        bloodPressureDia: 81,
        temperature: 36.9,
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED_PATIENT_ASSOCIATION');
  });

  test('POST /api/vitals/ingest - Reject out-of-boundary physiological values (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/vitals/ingest')
      .send({
        deviceId: arthurDevice.deviceCode,
        apiKey: arthurDevice.apiKey,
        patientId: arthurPatient.patientCode,
        heartRate: 999, // Lethally invalid heart rate beyond biological boundary
        spo2: 98,
        bloodPressureSys: 120,
        bloodPressureDia: 80,
        temperature: 36.7,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'MALFORMED_READING');
  });

  test('GET /api/patients/:id/vitals - Retrieve historical readings', async () => {
    const res = await request(app)
      .get(`/api/patients/${arthurPatient.id}/vitals?limit=10`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('GET /api/analytics/vitals/:patientId - SQL date_trunc aggregated vitals', async () => {
    const res = await request(app)
      .get(`/api/analytics/vitals/${arthurPatient.id}?interval=1h`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data);
  });
});
