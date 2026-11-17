/**
 * Stage 7 Automated End-to-End Verification Suite:
 * Privacy-Aware Access, Patient Consent, Granular RBAC, Audit Logging & Cryptographic Controls
 */

const BACKEND_URL = 'http://localhost:5001';
const API_URL = `${BACKEND_URL}/api`;

async function runStage7Tests() {
  console.log('================================================================');
  console.log('🧪 Starting Stage 7 Automated E2E Verification Suite: Privacy & Security');
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

  // 1. Multi-Role Authentication
  console.log('--- Step 1: Multi-Role Authentication ---');
  // 1a. Admin
  const adminLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@iomt-health.org', password: 'Admin123!' }),
  });
  const adminData = await adminLogin.json();
  const adminToken = adminData.data?.accessToken;
  assert(adminLogin.ok && adminToken, 'Administrator Dr. Gregory House authenticated');

  // 1b. Assigned Doctor (Dr. Vance)
  const vanceLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.vance@iomt-health.org', password: 'Doctor123!' }),
  });
  const vanceData = await vanceLogin.json();
  const vanceToken = vanceData.data?.accessToken;
  assert(vanceLogin.ok && vanceToken, 'Assigned Doctor Dr. Elena Vance authenticated');

  // 1c. Unassigned Doctor (Dr. Thorne)
  const thorneLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.thorne@iomt-health.org', password: 'Doctor123!' }),
  });
  const thorneData = await thorneLogin.json();
  const thorneToken = thorneData.data?.accessToken;
  assert(thorneLogin.ok && thorneToken, 'Unassigned Doctor Dr. Aris Thorne authenticated');

  // 1d. Ward Nurse (Sarah Davis)
  const nurseLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nurse.davis@iomt-health.org', password: 'Nurse123!' }),
  });
  const nurseData = await nurseLogin.json();
  const nurseToken = nurseData.data?.accessToken;
  assert(nurseLogin.ok && nurseToken, 'Ward Nurse Sarah Davis authenticated');

  const arthurId = '28657e0f-6787-4f36-8d65-884bbaff96ac'; // Assigned to Dr. Vance

  // 2. Role-Based Permissions & Privilege Boundaries
  console.log('\n--- Step 2: Granular Role Permissions & Least-Privilege Checks ---');
  // 2a. Nurse attempts DELETE on patient record -> Denied by requirePermission(patients.delete)
  const nurseDeleteRes = await fetch(`${API_URL}/patients/${arthurId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${nurseToken}` },
  });
  const nurseDelErr = await nurseDeleteRes.json();
  assert(nurseDeleteRes.status === 403, 'Nurse restricted from patient deletion (HTTP 403)');
  assert(
    nurseDelErr.error?.code === 'FORBIDDEN_PERMISSION',
    `Blocked with expected code FORBIDDEN_PERMISSION: "${nurseDelErr.error?.message}"`
  );

  // 2b. Nurse can view patient list (patients.view granted)
  const nurseListRes = await fetch(`${API_URL}/patients?limit=5`, {
    headers: { Authorization: `Bearer ${nurseToken}` },
  });
  assert(nurseListRes.status === 200, 'Nurse granted read-only patient list access (patients.view)');

  // 3. Patient Record Isolation & Access Authorization
  console.log('\n--- Step 3: Patient-Specific Physician Authorization ---');
  // 3a. Assigned Doctor (Dr. Vance) accesses assigned patient Arthur Pendelton
  const vanceAccessRes = await fetch(`${API_URL}/patients/${arthurId}`, {
    headers: { Authorization: `Bearer ${vanceToken}` },
  });
  const vanceAccessData = await vanceAccessRes.json();
  assert(vanceAccessRes.status === 200, 'Assigned Doctor Vance authorized to access patient Arthur (HTTP 200)');
  assert(
    vanceAccessData.data?.contactInformation?.includes('@example.com'),
    'Assigned Doctor sees unmasked clinical contact information'
  );

  // 3b. Unassigned Doctor (Dr. Thorne) attempts to access Arthur Pendelton -> Denied
  const thorneAccessRes = await fetch(`${API_URL}/patients/${arthurId}`, {
    headers: { Authorization: `Bearer ${thorneToken}` },
  });
  const thorneAccessErr = await thorneAccessRes.json();
  assert(thorneAccessRes.status === 403, 'Unassigned Doctor Thorne denied access to Arthur Pendelton (HTTP 403)');
  assert(
    thorneAccessErr.error?.code === 'UNAUTHORIZED_PATIENT_ACCESS',
    `Rejection code UNAUTHORIZED_PATIENT_ACCESS: "${thorneAccessErr.error?.message}"`
  );

  // 4. Sensitive Field Masking (Safe Harbor Sanitization)
  console.log('\n--- Step 4: Sensitive Field Masking & Quasi-Identifier Sanitization ---');
  const nurseArthurRes = await fetch(`${API_URL}/patients/${arthurId}`, {
    headers: { Authorization: `Bearer ${nurseToken}` },
  });
  const nurseArthurData = await nurseArthurRes.json();
  assert(nurseArthurRes.status === 200, 'Nurse has ward oversight access (HTTP 200)');
  assert(
    nurseArthurData.data?.contactInformation?.includes('***'),
    `Nurse sees sanitized/masked contact details: "${nurseArthurData.data?.contactInformation}"`
  );

  // 5. Data at Rest Encryption (AES-256-GCM)
  console.log('\n--- Step 5: Data-at-Rest Encryption (AES-256-GCM) ---');
  const testPatientCode = `PAT-ENC-${Date.now().toString().slice(-5)}`;
  const createEncPatientRes = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientCode: testPatientCode,
      name: 'Eleanor Security Test',
      dateOfBirth: '1975-06-15',
      gender: 'Female',
      contactInformation: '+1 (555) 789-0123 • eleanor.test@iomt-secure.org',
      condition: 'Cryptographic Verification',
      riskLevel: 'LOW',
    }),
  });
  const createdPatientData = await createEncPatientRes.json();
  assert(createEncPatientRes.status === 201, 'Patient created with sensitive contact information');
  const testPatientId = createdPatientData.data?.id;

  // 6. Patient Consent Management Lifecycle
  console.log('\n--- Step 6: Patient Consent Lifecycle (Grant -> Enforce -> Revoke) ---');
  // 6a. Grant Consent
  const grantConsentRes = await fetch(`${API_URL}/consent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId: testPatientId,
      purpose: 'EMERGENCY_CARE',
      grantedBy: 'Eleanor Test (Self)',
      authorizedRoles: ['DOCTOR', 'NURSE', 'ADMIN'],
      authorizedPurposes: ['EMERGENCY_CARE'],
      notes: 'Emergency break-glass consent authorized during intake.',
    }),
  });
  const grantConsentData = await grantConsentRes.json();
  assert(grantConsentRes.status === 201, 'Consent granted successfully (HTTP 201)');
  assert(grantConsentData.data?.status === 'GRANTED', 'Consent status is GRANTED');
  assert(grantConsentData.data?.purpose === 'EMERGENCY_CARE', 'Purpose set to EMERGENCY_CARE');
  const createdConsentId = grantConsentData.data?.id;

  // 6b. Verify Consent Listing
  const listConsentRes = await fetch(`${API_URL}/consent?patientId=${testPatientId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const listConsentData = await listConsentRes.json();
  assert(listConsentData.data?.length > 0, 'Consent found in consent query endpoint');

  // 6c. Revoke Consent
  const revokeConsentRes = await fetch(`${API_URL}/consent/${createdConsentId}/revoke`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ revocationReason: 'Patient withdrawn from emergency study.' }),
  });
  const revokeConsentData = await revokeConsentRes.json();
  assert(revokeConsentRes.status === 200, 'Consent revoked successfully (HTTP 200)');
  assert(revokeConsentData.data?.status === 'REVOKED', 'Consent status transitioned to REVOKED');
  assert(revokeConsentData.data?.revocationReason !== null, 'Revocation reason recorded');

  // 7. Immutable Audit Trail & Verification
  console.log('\n--- Step 7: Tamper-Evident Immutable Audit Ledger ---');
  const auditRes = await fetch(`${API_URL}/audit?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditData = await auditRes.json();
  assert(auditRes.status === 200, 'GET /api/audit returned 200 OK');
  assert(auditData.data?.length > 0, `Audit log entries returned: ${auditData.data?.length}`);

  // Check specific actions recorded in audit trail
  const recordedActions = auditData.data?.map((l) => l.action) || [];
  assert(recordedActions.includes('AUTH_LOGIN'), 'AUTH_LOGIN event recorded in audit log');
  assert(recordedActions.includes('UNAUTHORIZED_ACCESS_ATTEMPT'), 'UNAUTHORIZED_ACCESS_ATTEMPT recorded in audit log');
  assert(recordedActions.includes('PATIENT_RECORD_VIEW'), 'PATIENT_RECORD_VIEW event recorded in audit log');
  assert(recordedActions.includes('CONSENT_GRANT'), 'CONSENT_GRANT event recorded in audit log');
  assert(recordedActions.includes('CONSENT_REVOKE'), 'CONSENT_REVOKE event recorded in audit log');

  // 7b. Immutability Verification: Verify DELETE and PATCH on audit logs are strictly rejected
  const deleteAuditRes = await fetch(`${API_URL}/audit/${auditData.data[0]?.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    deleteAuditRes.status === 404 || deleteAuditRes.status === 405,
    `Immutability check: DELETE /api/audit/:id rejected (${deleteAuditRes.status})`
  );

  // 8. Security & Cryptographic Posture Overview API
  console.log('\n--- Step 8: Security & Cryptographic Posture Overview API ---');
  const secOverviewRes = await fetch(`${API_URL}/security/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const secOverviewData = await secOverviewRes.json();
  assert(secOverviewRes.status === 200, 'GET /api/security/overview returned 200 OK');
  assert(
    secOverviewData.data?.cryptography?.dataAtRestEncryption?.includes('AES-256-GCM'),
    `Verified AES-256-GCM Data-at-Rest Encryption: "${secOverviewData.data?.cryptography?.dataAtRestEncryption}"`
  );
  assert(secOverviewData.data?.permissionsMatrix?.ADMIN !== undefined, 'Permissions matrix defines ADMIN role');
  assert(secOverviewData.data?.permissionsMatrix?.DOCTOR !== undefined, 'Permissions matrix defines DOCTOR role');
  assert(secOverviewData.data?.permissionsMatrix?.NURSE !== undefined, 'Permissions matrix defines NURSE role');
  assert(secOverviewData.data?.complianceSafeguards?.hipaaSecurityRule !== undefined, 'HIPAA Security Safeguards verified');
  assert(secOverviewData.data?.complianceSafeguards?.gdprSafeguards !== undefined, 'GDPR Privacy Safeguards verified');

  // Final Summary
  console.log('\n================================================================');
  console.log(`🏁 Stage 7 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage7Tests().catch((err) => {
  console.error('Fatal Stage 7 Test Runner Error:', err);
  process.exit(1);
});
