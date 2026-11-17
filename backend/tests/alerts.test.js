import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Alert Lifecycle & Clinical Triage Suite', () => {
  let doctorElenaToken = '';
  let arthurPatient = null;
  let createdAlertId = '';

  before(async () => {
    const elenaRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' });
    doctorElenaToken = elenaRes.body.data.accessToken;

    arthurPatient = await prisma.patient.findFirst({ where: { patientCode: 'PAT-84920' } });
  });

  test('POST /api/alerts - Ingest new clinical anomaly alert', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .send({
        patientId: arthurPatient.patientCode,
        vitalType: 'HEART_RATE_CRITICAL_HIGH',
        severity: 'CRITICAL',
        message: 'Acute Tachycardia detected by Edge Gateway (HR: 148 bpm, threshold: 120 bpm)',
        currentValue: 148,
        thresholdValue: 120,
        source: 'EDGE_GATEWAY',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'OPEN');
    assert.strictEqual(res.body.data.severity, 'CRITICAL');
    assert.strictEqual(res.body.data.isAcknowledged, false);

    createdAlertId = res.body.data.id;
  });

  test('GET /api/alerts - List alerts filtered by status and severity', async () => {
    const res = await request(app)
      .get('/api/alerts?status=OPEN&severity=CRITICAL')
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.openCount > 0);
  });

  test('GET /api/alerts/:id - Retrieve alert detail', async () => {
    const res = await request(app)
      .get(`/api/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, createdAlertId);
    assert.strictEqual(res.body.data.patient.patientCode, arthurPatient.patientCode);
  });

  test('PATCH /api/alerts/:id/acknowledge - Doctor acknowledges alert', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'ACKNOWLEDGED');
    assert.strictEqual(res.body.data.isAcknowledged, true);
    assert.ok(res.body.data.acknowledgedBy);
  });

  test('PATCH /api/alerts/:id/resolve - Doctor resolves alert with clinical notes', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${createdAlertId}/resolve`)
      .set('Authorization', `Bearer ${doctorElenaToken}`)
      .send({
        resolutionNotes: 'Patient contacted via tele-consultation. Metoprolol dose adjusted; heart rate stabilized to 76 bpm.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'RESOLVED');
    assert.strictEqual(res.body.data.isResolved, true);
    assert.ok(res.body.data.resolutionNotes.includes('Metoprolol'));
  });
});
