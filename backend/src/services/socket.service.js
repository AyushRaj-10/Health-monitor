/**
 * Socket.IO Real-Time Service
 * 
 * Manages authenticated WebSocket connections, patient-specific rooms,
 * authorization verification, and real-time biometric/alert broadcasting.
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';

let io = null;

/**
 * Initializes Socket.IO with the HTTP server
 */
export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication Middleware for Socket.IO Handshake
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('AUTHENTICATION_ERROR: Access token is required for socket connection.'));
      }

      const decoded = jwt.verify(token, config.jwtAccessSecret);
      const userId = decoded.userId || decoded.sub || decoded.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new Error('AUTHENTICATION_ERROR: User account is inactive or not found.'));
      }

      // Attach authorized user profile to socket instance
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error(`AUTHENTICATION_ERROR: ${err.message || 'Invalid token'}`));
    }
  });

  // Socket Connection Management
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id} (User: ${socket.user.email}, Role: ${socket.user.role})`);

    // Staff general room for broad alerts/overview
    if (['ADMIN', 'DOCTOR', 'NURSE'].includes(socket.user.role)) {
      socket.join('staff:overview');
      socket.join('staff:alerts');
    }

    // Client requests subscription to specific patient monitoring room
    socket.on('monitoring:subscribe', async (data, callback) => {
      try {
        const patientId = data?.patientId;
        if (!patientId) {
          if (callback) callback({ success: false, error: 'patientId is required' });
          return;
        }

        // Verify patient exists
        const patient = await prisma.patient.findFirst({
          where: { OR: [{ id: patientId }, { patientCode: patientId }] },
          select: { id: true, patientCode: true, name: true, assignedDoctorId: true },
        });

        if (!patient) {
          if (callback) callback({ success: false, error: 'Patient not found' });
          return;
        }

        // Authorization Rule:
        // - ADMIN has universal access
        // - NURSE has ward monitoring access
        // - DOCTOR is authorized if assigned to patient, OR if patient is unassigned/open ward
        const isAuthorized =
          socket.user.role === 'ADMIN' ||
          socket.user.role === 'NURSE' ||
          patient.assignedDoctorId === socket.user.id ||
          !patient.assignedDoctorId;

        if (!isAuthorized) {
          socket.emit('monitoring:status', {
            patientId: patient.id,
            status: 'UNAUTHORIZED',
            error: 'Authorization failure: You are not assigned to monitor this patient.',
          });
          if (callback) callback({ success: false, error: 'UNAUTHORIZED_PATIENT_ACCESS' });
          console.warn(`[Socket.IO] ⛔ Access denied: ${socket.user.email} attempted unauthorized subscription to patient ${patient.patientCode}`);
          return;
        }

        const roomName = `patient:${patient.id}`;
        socket.join(roomName);

        socket.emit('monitoring:status', {
          patientId: patient.id,
          patientCode: patient.patientCode,
          status: 'SUBSCRIBED',
          room: roomName,
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true, patientId: patient.id, room: roomName });
        console.log(`📡 [Socket.IO] ${socket.user.email} subscribed to room "${roomName}" (${patient.name})`);
      } catch (err) {
        console.error('[Socket.IO] Subscription error:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Client requests unsubscription
    socket.on('monitoring:unsubscribe', (data, callback) => {
      const patientId = data?.patientId;
      if (patientId) {
        const roomName = `patient:${patientId}`;
        socket.leave(roomName);

        socket.emit('monitoring:status', {
          patientId,
          status: 'UNSUBSCRIBED',
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true });
        console.log(`🔌 [Socket.IO] ${socket.user.email} unsubscribed from room "${roomName}"`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Returns active Socket.IO server instance
 */
export function getIO() {
  return io;
}

/**
 * Broadcasts live vitals update to patient room and staff overview
 * (Called strictly after database persistence)
 */
export function emitVitalsUpdate(patientId, payload) {
  if (!io) return;
  const roomName = `patient:${patientId}`;
  io.to(roomName).emit('vitals:update', {
    patientId,
    ...payload,
    broadcastAt: new Date().toISOString(),
  });

  // Also emit to staff overview wall for multi-patient monitoring
  io.to('staff:overview').emit('vitals:update', {
    patientId,
    ...payload,
    broadcastAt: new Date().toISOString(),
  });
}

/**
 * Broadcasts newly created anomaly alert
 */
export function emitNewAlert(patientId, alertData) {
  if (!io) return;
  const roomName = `patient:${patientId}`;
  const payload = {
    patientId,
    alert: alertData,
    broadcastAt: new Date().toISOString(),
  };

  io.to(roomName).emit('alert:new', payload);
  io.to('staff:alerts').emit('alert:new', payload);
}

/**
 * Broadcasts alert status update (acknowledge or resolve)
 */
export function emitAlertUpdate(patientId, alertData) {
  if (!io) return;
  const roomName = `patient:${patientId}`;
  const payload = {
    patientId,
    alert: alertData,
    broadcastAt: new Date().toISOString(),
  };

  io.to(roomName).emit('alert:update', payload);
  io.to('staff:alerts').emit('alert:update', payload);
}

/**
 * Broadcasts device status or battery update
 */
export function emitDeviceStatus(deviceId, patientId, deviceData) {
  if (!io) return;
  const payload = {
    deviceId,
    patientId,
    device: deviceData,
    broadcastAt: new Date().toISOString(),
  };

  if (patientId) {
    io.to(`patient:${patientId}`).emit('device:status', payload);
  }
  io.to('staff:overview').emit('device:status', payload);
}
