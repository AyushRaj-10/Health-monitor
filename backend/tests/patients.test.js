import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Patient Management & Privacy-Aware Access Suite', () => {
  let doctorElenaToken = '';
  let doctorArisToken = '';
  let nurseToken = '';
  let patientArthurId = '';
  let patientMarcusId = '';

  before(async () => {
    // Authenticate Doctor Elena (Assigned to Arthur Pendelton PAT-84920)
    const elenaRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' });
    doctorElenaToken = elenaRes.body.data.accessToken;

    // Authenticate Doctor Aris (Assigned to Marcus Sterling PAT-91244)
    const arisRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.thorne@iomt-health.org', password: 'Doctor123!' });
    doctorArisToken = arisRes.body.data.accessToken;

    // Authenticate Nurse Davis
    const nurseRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nurse.davis@iomt-health.org', password: 'Nurse123!' });
    nurseToken = nurseRes.body.data.accessToken;

    // Fetch patient IDs
    const p1 = await prisma.patient.findFirst({ where: { patientCode: 'PAT-84920' } });
    const p2 = await prisma.patient.findFirst({ where: { patientCode: 'PAT-91244' } });
    patientArthurId = p1.id;
    patientMarcusId = p2.id;
  });

  test('GET /api/patients - Authorized staff can list patients', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination.total > 0);
  });

  test('GET /api/patients/:id - Doctor can access their assigned patient record', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientArthurId}`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.patientCode, 'PAT-84920');
    // Primary care physician has unmasked contact info access
    assert.ok(res.body.data.contactInformation.includes('arthur.pendelton@example.com'));
  });

  test('GET /api/patients/:id - Doctor CANNOT access unassigned patient (403 Forbidden)', async () => {
    // Dr. Elena tries to view Marcus Sterling (assigned to Dr. Aris)
    const res = await request(app)
      .get(`/api/patients/${patientMarcusId}`)
      .set('Authorization', `Bearer ${doctorElenaToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED_PATIENT_ACCESS');
  });

  test('GET /api/patients/:id - Nurse gets masked contact information', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientArthurId}`)
      .set('Authorization', `Bearer ${nurseToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    // Contact information must be masked for ward nurses
    assert.ok(res.body.data.contactInformation.includes('***'));
    assert.ok(res.body.data.contactInformation.includes('a***@example.com'));
  });

  test('POST /api/patients - Validation rejection on missing required fields', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${doctorElenaToken}`)
      .send({
        // Missing required fields
        name: 'Invalid Test Patient',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });
});
