import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Authentication & Session Management Suite', () => {
  let adminToken = '';
  let doctorToken = '';
  let refreshTokenCookie = '';

  test('POST /api/auth/login - Admin Login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@iomt-health.org',
        password: 'Admin123!',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'ADMIN');
    assert.ok(res.body.data.accessToken, 'Access token should be issued');
    assert.ok(res.headers['set-cookie'], 'Refresh token cookie should be set');

    adminToken = res.body.data.accessToken;
    refreshTokenCookie = res.headers['set-cookie'];
  });

  test('POST /api/auth/login - Doctor Login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dr.vance@iomt-health.org',
        password: 'Doctor123!',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'DOCTOR');
    assert.ok(res.body.data.accessToken);
    doctorToken = res.body.data.accessToken;
  });

  test('POST /api/auth/login - Reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@iomt-health.org',
        password: 'WrongPassword!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('POST /api/auth/login - Reject non-existent user email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@iomt-health.org',
        password: 'Password123!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/auth/me - Retrieve authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'dr.vance@iomt-health.org');
    assert.strictEqual(res.body.data.user.role, 'DOCTOR');
  });

  test('POST /api/auth/refresh - Renew access token using refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.accessToken, 'New access token should be returned');
  });

  test('POST /api/auth/logout - Revoke session and clear cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Cookie', refreshTokenCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
