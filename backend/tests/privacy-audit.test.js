import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Privacy, Consent Governance & Immutable Audit Suite', () => {
  let adminToken = '';
  let doctorToken = '';
  let arthurPatient = null;
  let createdConsentId = '';

  before(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@iomt-health.org', password: 'Admin123!' });
    adminToken = adminRes.body.data.accessToken;

    const doctorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' });
    doctorToken = doctorRes.body.data.accessToken;

    arthurPatient = await prisma.patient.findFirst({ where: { patientCode: 'PAT-84920' } });
  });

  test('GET /api/consent/purposes - Retrieve authorized clinical consent purposes', async () => {
    const res = await request(app)
      .get('/api/consent/purposes')
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.purposes));
    assert.ok(res.body.data.purposes.some((p) => p.code === 'REMOTE_MONITORING'));
  });

  test('POST /api/consent - Grant informed patient telemetry consent', async () => {
    const res = await request(app)
      .post('/api/consent')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: arthurPatient.id,
        purpose: 'REMOTE_MONITORING',
        status: 'GRANTED',
        notes: 'Informed consent obtained for ambulatory ECG and SpO2 telemetry.',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'GRANTED');
    assert.strictEqual(res.body.data.purpose, 'REMOTE_MONITORING');

    createdConsentId = res.body.data.id;
  });

  test('PATCH /api/consent/:id/revoke - Revoke patient consent', async () => {
    assert.ok(createdConsentId, 'Consent ID should exist');
    const res = await request(app)
      .patch(`/api/consent/${createdConsentId}/revoke`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        reason: 'Patient requested withdrawal from continuous telemetry.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'REVOKED');
  });

  test('GET /api/audit - Admin can view immutable audit log trail', async () => {
    const res = await request(app)
      .get('/api/audit?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.total > 0);

    // Verify audit logs contain tamper-evident fields
    const latest = res.body.data[0];
    assert.ok(latest.action);
    assert.ok(latest.timestamp);
  });

  test('GET /api/security/overview - Retrieve privacy and encryption posture', async () => {
    const res = await request(app)
      .get('/api/security/overview')
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.cryptography.dataAtRestEncryption.includes('AES-256-GCM'));
    assert.strictEqual(res.body.data.differentialPrivacy.status, 'ACTIVE');
  });
});
