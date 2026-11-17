import { prisma } from '../config/prisma.js';
import { queryAuditLogs } from '../services/audit.service.js';

/**
 * GET /api/audit
 * Queries the immutable audit trail with filtering and pagination.
 */
export async function getAuditLogs(req, res, next) {
  try {
    const {
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
    } = req.query;

    const result = await queryAuditLogs({
      action,
      resourceType,
      resourceId,
      userId,
      status,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.logs,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/audit/:id
 * Retrieves detail view of a single immutable audit entry.
 */
export async function getAuditLogById(req, res, next) {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true } },
      },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AUDIT_LOG_NOT_FOUND',
          message: `Audit entry "${id}" was not found.`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
}
