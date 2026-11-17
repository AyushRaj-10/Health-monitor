/**
 * Granular Role-Based Access Control (RBAC) Permission Matrix
 * 
 * Defines fine-grained privileges across clinical and administrative domains.
 * All access attempts are subject to audit logging regardless of role.
 */

export const PERMISSIONS = {
  // Patient domain
  PATIENTS_VIEW: 'patients.view',
  PATIENTS_CREATE: 'patients.create',
  PATIENTS_UPDATE: 'patients.update',
  PATIENTS_DELETE: 'patients.delete',

  // Telemetry domain
  VITALS_VIEW: 'vitals.view',
  VITALS_INGEST: 'vitals.ingest',

  // Alerts domain
  ALERTS_VIEW: 'alerts.view',
  ALERTS_ACKNOWLEDGE: 'alerts.acknowledge',
  ALERTS_RESOLVE: 'alerts.resolve',

  // Analytics domain
  ANALYTICS_VIEW: 'analytics.view',

  // Consent & Privacy domain
  CONSENT_VIEW: 'consent.view',
  CONSENT_MANAGE: 'consent.manage',

  // Security & Audit domain
  AUDIT_VIEW: 'audit.view',
  SECURITY_MANAGE: 'security.manage',
};

export const ROLE_PERMISSIONS = {
  ADMIN: [
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_UPDATE,
    PERMISSIONS.PATIENTS_DELETE,
    PERMISSIONS.VITALS_VIEW,
    PERMISSIONS.VITALS_INGEST,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_ACKNOWLEDGE,
    PERMISSIONS.ALERTS_RESOLVE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONSENT_VIEW,
    PERMISSIONS.CONSENT_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SECURITY_MANAGE,
  ],
  DOCTOR: [
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_UPDATE,
    PERMISSIONS.VITALS_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_ACKNOWLEDGE,
    PERMISSIONS.ALERTS_RESOLVE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONSENT_VIEW,
    PERMISSIONS.CONSENT_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
  ],
  NURSE: [
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.VITALS_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_ACKNOWLEDGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.CONSENT_VIEW,
  ],
};

/**
 * Checks if a specific role possesses the required permission.
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Returns list of granted permissions for a given role.
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}
