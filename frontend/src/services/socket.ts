/**
 * Socket.IO Real-Time Client Service
 * 
 * Manages authenticated WebSocket connections, patient room subscriptions,
 * live telemetry event listeners, and automatic reconnection handling.
 */

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socketInstance: Socket | null = null;
let activeToken: string | null = null;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function initSocket(): Socket {
  const token = getAccessToken();

  // If socket already exists and token has not changed, reuse existing instance
  if (socketInstance && activeToken === token && socketInstance.connected) {
    return socketInstance;
  }

  // Disconnect previous instance if token changed
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  activeToken = token;

  socketInstance = io('/', {
    path: '/socket.io',
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socketInstance.on('connect', () => {
    console.log(`⚡ [Socket.IO Client] Connected to real-time engine (ID: ${socketInstance?.id})`);
  });

  socketInstance.on('connect_error', (err) => {
    console.warn(`⚠️ [Socket.IO Client] Connection error: ${err.message}`);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log(`🔌 [Socket.IO Client] Disconnected (${reason})`);
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    activeToken = null;
  }
}

export function subscribeToPatient(
  patientId: string,
  callback?: (response: { success: boolean; error?: string; room?: string }) => void
) {
  const socket = socketInstance || initSocket();
  socket.emit('monitoring:subscribe', { patientId }, callback);
}

export function unsubscribeFromPatient(
  patientId: string,
  callback?: (response: { success: boolean }) => void
) {
  if (socketInstance) {
    socketInstance.emit('monitoring:unsubscribe', { patientId }, callback);
  }
}
