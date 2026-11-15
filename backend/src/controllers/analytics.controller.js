import { prisma } from '../config/prisma.js';

/**
 * Parses time range into startDate and endDate
 */
function parseTimeRange(timeRange = '7d', startDateParam, endDateParam) {
  const now = new Date();
  let startDate;
  let endDate = endDateParam ? new Date(endDateParam) : now;

  if (startDateParam) {
    startDate = new Date(startDateParam);
  } else {
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }
  }

  return { startDate, endDate };
}

/**
 * GET /api/analytics/overview
 * Returns system-wide population analytics, historical aggregation, and alert frequencies.
 */
export async function getAnalyticsOverview(req, res, next) {
  try {
    const { timeRange = '7d', startDate: startParam, endDate: endParam } = req.query;
    const { startDate, endDate } = parseTimeRange(timeRange, startParam, endParam);

    // 1. Core Counts
    const [totalReadings, totalAlerts, totalPatients, openAlerts, criticalAlerts] = await Promise.all([
      prisma.vitalReading.count({
        where: { recordedAt: { gte: startDate, lte: endDate } },
      }),
      prisma.alert.count({
        where: { triggeredAt: { gte: startDate, lte: endDate } },
      }),
      prisma.patient.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.alert.count({
        where: {
          status: 'OPEN',
          triggeredAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.alert.count({
        where: {
          severity: 'CRITICAL',
          status: { not: 'RESOLVED' },
          triggeredAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // 2. Population Vitals Aggregates via SQL
    const populationVitalsRaw = await prisma.$queryRaw`
      SELECT 
        ROUND(AVG("heartRate")::numeric, 1) AS "avgHeartRate",
        ROUND(MIN("heartRate")::numeric, 1) AS "minHeartRate",
        ROUND(MAX("heartRate")::numeric, 1) AS "maxHeartRate",
        ROUND(AVG("spo2")::numeric, 1) AS "avgSpo2",
        ROUND(MIN("spo2")::numeric, 1) AS "minSpo2",
        ROUND(MAX("spo2")::numeric, 1) AS "maxSpo2",
        ROUND(AVG("bloodPressureSys")::numeric, 1) AS "avgSystolic",
        ROUND(MIN("bloodPressureSys")::numeric, 1) AS "minSystolic",
        ROUND(MAX("bloodPressureSys")::numeric, 1) AS "maxSystolic",
        ROUND(AVG("bloodPressureDia")::numeric, 1) AS "avgDiastolic",
        ROUND(MIN("bloodPressureDia")::numeric, 1) AS "minDiastolic",
        ROUND(MAX("bloodPressureDia")::numeric, 1) AS "maxDiastolic",
        ROUND(AVG("temperature")::numeric, 2) AS "avgTemperature",
        ROUND(MIN("temperature")::numeric, 2) AS "minTemperature",
        ROUND(MAX("temperature")::numeric, 2) AS "maxTemperature",
        COUNT(*)::int AS "sampleCount"
      FROM "VitalReading"
      WHERE "recordedAt" >= ${startDate} AND "recordedAt" <= ${endDate}
    `;

    const populationStats = populationVitalsRaw[0] || {
      avgHeartRate: 75,
      minHeartRate: 60,
      maxHeartRate: 110,
      avgSpo2: 98,
      minSpo2: 92,
      maxSpo2: 100,
      avgSystolic: 120,
      avgDiastolic: 80,
      avgTemperature: 36.8,
      sampleCount: totalReadings,
    };

    // 3. Alerts Breakdown by Severity
    const severityGroups = await prisma.alert.groupBy({
      by: ['severity'],
      where: { triggeredAt: { gte: startDate, lte: endDate } },
      _count: { _all: true },
    });

    const alertsBySeverity = {
      CRITICAL: 0,
      WARNING: 0,
      INFO: 0,
    };
    severityGroups.forEach((g) => {
      alertsBySeverity[g.severity] = g._count._all;
    });

    // 4. Alerts Breakdown by Status
    const statusGroups = await prisma.alert.groupBy({
      by: ['status'],
      where: { triggeredAt: { gte: startDate, lte: endDate } },
      _count: { _all: true },
    });

    const alertsByStatus = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
    };
    statusGroups.forEach((g) => {
      alertsByStatus[g.status] = g._count._all;
    });

    // 5. Daily Alert Trends via SQL
    const alertTrendsRaw = await prisma.$queryRaw`
      SELECT 
        to_char(date_trunc('day', "triggeredAt"), 'YYYY-MM-DD') AS "date",
        COUNT(*)::int AS "totalAlerts",
        COUNT(*) FILTER (WHERE "severity" = 'CRITICAL')::int AS "critical",
        COUNT(*) FILTER (WHERE "severity" = 'WARNING')::int AS "warning",
        COUNT(*) FILTER (WHERE "severity" = 'INFO')::int AS "info",
        COUNT(*) FILTER (WHERE "status" = 'RESOLVED')::int AS "resolved"
      FROM "Alert"
      WHERE "triggeredAt" >= ${startDate} AND "triggeredAt" <= ${endDate}
      GROUP BY date_trunc('day', "triggeredAt")
      ORDER BY date_trunc('day', "triggeredAt") ASC
    `;

    // 6. Population Vitals Historical Trend (daily or hourly)
    const bucketType = timeRange === '24h' ? 'hour' : 'day';
    const vitalsTrendsRaw = await prisma.$queryRaw`
      SELECT 
        date_trunc(${bucketType}, "recordedAt") AS "bucketTime",
        ROUND(AVG("heartRate")::numeric, 1) AS "avgHeartRate",
        ROUND(AVG("spo2")::numeric, 1) AS "avgSpo2",
        ROUND(AVG("bloodPressureSys")::numeric, 1) AS "avgSystolic",
        ROUND(AVG("bloodPressureDia")::numeric, 1) AS "avgDiastolic",
        ROUND(AVG("temperature")::numeric, 2) AS "avgTemperature",
        COUNT(*)::int AS "readingCount"
      FROM "VitalReading"
      WHERE "recordedAt" >= ${startDate} AND "recordedAt" <= ${endDate}
      GROUP BY "bucketTime"
      ORDER BY "bucketTime" ASC
    `;

    // 7. Top Alert Types / Anomaly distribution
    const topAlertTypesRaw = await prisma.alert.groupBy({
      by: ['vitalType'],
      where: { triggeredAt: { gte: startDate, lte: endDate } },
      _count: { _all: true },
      orderBy: { _count: { vitalType: 'desc' } },
      take: 6,
    });

    const topAlertTypes = topAlertTypesRaw.map((a) => ({
      vitalType: a.vitalType,
      count: a._count._all,
    }));

    // 8. Patient Monitoring Summaries
    const activePatients = await prisma.patient.findMany({
      where: { status: 'ACTIVE' },
      take: 20,
      select: {
        id: true,
        patientCode: true,
        name: true,
        riskLevel: true,
        roomOrLocation: true,
        assignedDoctor: { select: { id: true, name: true } },
        _count: {
          select: {
            vitalReadings: true,
            alerts: { where: { status: { not: 'RESOLVED' } } },
          },
        },
      },
      orderBy: { riskLevel: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        period: {
          timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalReadings,
          totalAlerts,
          totalPatients,
          openAlerts,
          criticalAlerts,
        },
        populationStats,
        alertsBySeverity,
        alertsByStatus,
        alertTrends: alertTrendsRaw,
        vitalsTrends: vitalsTrendsRaw,
        topAlertTypes,
        patientSummaries: activePatients.map((p) => ({
          id: p.id,
          patientCode: p.patientCode,
          name: p.name,
          riskLevel: p.riskLevel,
          room: p.roomOrLocation,
          assignedDoctor: p.assignedDoctor?.name || 'Unassigned',
          totalReadings: p._count.vitalReadings,
          activeAlerts: p._count.alerts,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/patients/:id
 * Returns deep physiological analytics for an individual patient.
 */
export async function getPatientAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    const { timeRange = '7d', startDate: startParam, endDate: endParam } = req.query;
    const { startDate, endDate } = parseTimeRange(timeRange, startParam, endParam);

    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id }, { patientCode: id }] },
      include: {
        assignedDoctor: { select: { id: true, name: true, email: true } },
        devices: { select: { id: true, deviceCode: true, name: true, status: true, batteryLevel: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient "${id}" was not found.`,
        },
      });
    }

    // 1. Vital Readings Aggregate for this patient
    const vitalsAggRaw = await prisma.$queryRaw`
      SELECT 
        ROUND(AVG("heartRate")::numeric, 1) AS "avgHeartRate",
        ROUND(MIN("heartRate")::numeric, 1) AS "minHeartRate",
        ROUND(MAX("heartRate")::numeric, 1) AS "maxHeartRate",
        ROUND(AVG("spo2")::numeric, 1) AS "avgSpo2",
        ROUND(MIN("spo2")::numeric, 1) AS "minSpo2",
        ROUND(MAX("spo2")::numeric, 1) AS "maxSpo2",
        ROUND(AVG("bloodPressureSys")::numeric, 1) AS "avgSystolic",
        ROUND(MIN("bloodPressureSys")::numeric, 1) AS "minSystolic",
        ROUND(MAX("bloodPressureSys")::numeric, 1) AS "maxSystolic",
        ROUND(AVG("bloodPressureDia")::numeric, 1) AS "avgDiastolic",
        ROUND(MIN("bloodPressureDia")::numeric, 1) AS "minDiastolic",
        ROUND(MAX("bloodPressureDia")::numeric, 1) AS "maxDiastolic",
        ROUND(AVG("temperature")::numeric, 2) AS "avgTemperature",
        ROUND(MIN("temperature")::numeric, 2) AS "minTemperature",
        ROUND(MAX("temperature")::numeric, 2) AS "maxTemperature",
        COUNT(*)::int AS "sampleCount"
      FROM "VitalReading"
      WHERE "patientId" = ${patient.id} AND "recordedAt" >= ${startDate} AND "recordedAt" <= ${endDate}
    `;

    const vitalsSummary = vitalsAggRaw[0] || {
      avgHeartRate: null,
      minHeartRate: null,
      maxHeartRate: null,
      avgSpo2: null,
      minSpo2: null,
      maxSpo2: null,
      avgSystolic: null,
      avgDiastolic: null,
      avgTemperature: null,
      sampleCount: 0,
    };

    // 2. Alert Counts for this patient
    const [totalAlerts, openAlerts, acknowledgedAlerts, resolvedAlerts, criticalAlerts] = await Promise.all([
      prisma.alert.count({
        where: { patientId: patient.id, triggeredAt: { gte: startDate, lte: endDate } },
      }),
      prisma.alert.count({
        where: { patientId: patient.id, status: 'OPEN', triggeredAt: { gte: startDate, lte: endDate } },
      }),
      prisma.alert.count({
        where: { patientId: patient.id, status: 'ACKNOWLEDGED', triggeredAt: { gte: startDate, lte: endDate } },
      }),
      prisma.alert.count({
        where: { patientId: patient.id, status: 'RESOLVED', triggeredAt: { gte: startDate, lte: endDate } },
      }),
      prisma.alert.count({
        where: {
          patientId: patient.id,
          severity: 'CRITICAL',
          status: { not: 'RESOLVED' },
          triggeredAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // 3. Recent Alerts
    const recentAlerts = await prisma.alert.findMany({
      where: { patientId: patient.id },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
      include: {
        device: { select: { deviceCode: true, name: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          patientCode: patient.patientCode,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          riskLevel: patient.riskLevel,
          condition: patient.condition,
          roomOrLocation: patient.roomOrLocation,
          assignedDoctor: patient.assignedDoctor?.name || 'Unassigned',
          devices: patient.devices,
        },
        period: {
          timeRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        vitalsSummary,
        alertsSummary: {
          total: totalAlerts,
          open: openAlerts,
          acknowledged: acknowledgedAlerts,
          resolved: resolvedAlerts,
          critical: criticalAlerts,
        },
        recentAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/vitals/:patientId
 * Returns SQL date_trunc time-bucketed historical vitals for charts.
 */
export async function getPatientVitalsAnalytics(req, res, next) {
  try {
    const { patientId } = req.params;
    const {
      bucket = 'hour',
      timeRange = '7d',
      startDate: startParam,
      endDate: endParam,
      limit = 100,
    } = req.query;

    const { startDate, endDate } = parseTimeRange(timeRange, startParam, endParam);

    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientCode: patientId }] },
      select: { id: true, name: true, patientCode: true },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient "${patientId}" was not found.`,
        },
      });
    }

    const validBucket = ['minute', 'hour', 'day'].includes(bucket) ? bucket : 'hour';
    const take = Math.min(500, Math.max(10, parseInt(limit, 10)));

    const aggregatedVitals = await prisma.$queryRaw`
      SELECT 
        date_trunc(${validBucket}, "recordedAt") AS "bucketTime",
        ROUND(AVG("heartRate")::numeric, 1) AS "avgHeartRate",
        ROUND(MIN("heartRate")::numeric, 1) AS "minHeartRate",
        ROUND(MAX("heartRate")::numeric, 1) AS "maxHeartRate",
        ROUND(AVG("spo2")::numeric, 1) AS "avgSpo2",
        ROUND(MIN("spo2")::numeric, 1) AS "minSpo2",
        ROUND(MAX("spo2")::numeric, 1) AS "maxSpo2",
        ROUND(AVG("bloodPressureSys")::numeric, 1) AS "avgSystolic",
        ROUND(MIN("bloodPressureSys")::numeric, 1) AS "minSystolic",
        ROUND(MAX("bloodPressureSys")::numeric, 1) AS "maxSystolic",
        ROUND(AVG("bloodPressureDia")::numeric, 1) AS "avgDiastolic",
        ROUND(MIN("bloodPressureDia")::numeric, 1) AS "minDiastolic",
        ROUND(MAX("bloodPressureDia")::numeric, 1) AS "maxDiastolic",
        ROUND(AVG("temperature")::numeric, 2) AS "avgTemperature",
        ROUND(MIN("temperature")::numeric, 2) AS "minTemperature",
        ROUND(MAX("temperature")::numeric, 2) AS "maxTemperature",
        COUNT(*)::int AS "sampleCount"
      FROM "VitalReading"
      WHERE "patientId" = ${patient.id} AND "recordedAt" >= ${startDate} AND "recordedAt" <= ${endDate}
      GROUP BY "bucketTime"
      ORDER BY "bucketTime" ASC
      LIMIT ${take}
    `;

    res.status(200).json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          patientCode: patient.patientCode,
          name: patient.name,
        },
        bucket: validBucket,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        pointsCount: aggregatedVitals.length,
        points: aggregatedVitals,
      },
    });
  } catch (error) {
    next(error);
  }
}
