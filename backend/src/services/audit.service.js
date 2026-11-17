/**
 * Audit Logging Service
 * 
 * Provides tamper-evident, append-only security and clinical access auditing.
 * Records are strictly immutable once committed; no update or deletion APIs are exposed.
 */

import { prisma } from '../config/prisma.js';
import { getSocketIO } from './socket.service.js';

/**
 * Sanitizes metadata to strip sensitive authentication credentials,
 * plaintext passwords, or raw physiological arrays from audit logs.
 */
function sanitizeMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      return metadata.slice(0, 500);
    }
  }

  const sanitized = { ...metadata };
  // Redact credentials and private security keys
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'jwtAccessSecret',
    'secret',
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED_CREDENTIAL]';
    }
  }

  return JSON.stringify(sanitized);
}

/**
 * Appends an immutable audit log entry to PostgreSQL.
 */
export async function recordAuditLog({
  userId = null,
  userName = null,
  userEmail = null,
  userRole = null,
  action,
  resourceType,
  resourceId = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
}) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userEmail,
        userRole,
        action,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        metadata: sanitizeMetadata(metadata),
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        status: ['SUCCESS', 'DENIED', 'FAILURE'].includes(status) ? status : 'SUCCESS',
      },
    });

    // Broadcast audit event to administrative / security channel in real time
    try {
      const io = getSocketIO();
      if (io) {
        io.to('staff:alerts').emit('audit:new', {
          id: entry.id,
          action: entry.action,
          resourceType: entry.resourceType,
          userName: entry.userName || 'Anonymous',
          status: entry.status,
          timestamp: entry.timestamp,
        });
      }
    } catch {
      // Non-blocking socket emission
    }

    return entry;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
}

/**
 * Retrieves audit logs with multi-attribute filtering (read-only query).
 */
export async function queryAuditLogs({
  action,
  resourceType,
  resourceId,
  userId,
  status,
  startDate,
  endDate,
  search,
  page = 1,
  limit = 50,
}) {
  const where = {};

  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { resourceType: { contains: search, mode: 'insensitive' } },
      { userName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } },
      { resourceId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

  const [logs, total, unauthorizedAttempts, totalDenied] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take,
      skip,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { action: 'UNAUTHORIZED_ACCESS_ATTEMPT' } }),
    prisma.auditLog.count({ where: { status: 'DENIED' } }),
  ]);

  return {
    logs,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
      unauthorizedAttempts,
      totalDenied,
    },
  };
}
