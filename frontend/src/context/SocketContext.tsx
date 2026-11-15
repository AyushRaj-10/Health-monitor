import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket, subscribeToPatient, unsubscribeFromPatient } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  error: string | null;
  subscribePatient: (patientId: string, callback?: (res: any) => void) => void;
  unsubscribePatient: (patientId: string, callback?: (res: any) => void) => void;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED');
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    if (!isAuthenticated) return;

    setStatus('CONNECTING');
    setError(null);

    const s = initSocket();
    setSocket(s);

    const handleConnect = () => {
      setIsConnected(true);
      setStatus('CONNECTED');
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setStatus('DISCONNECTED');
    };

    const handleConnectError = (err: Error) => {
      setIsConnected(false);
      setStatus('ERROR');
      setError(err.message);
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.on('connect_error', handleConnectError);

    if (s.connected) {
      handleConnect();
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('connect_error', handleConnectError);
    };
  };

  useEffect(() => {
    if (isAuthenticated) {
      const cleanup = connect();
      return () => {
        if (cleanup) cleanup();
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      setStatus('DISCONNECTED');
    }
  }, [isAuthenticated, user?.id]);

  const handleSubscribe = (patientId: string, callback?: (res: any) => void) => {
    subscribeToPatient(patientId, callback);
  };

  const handleUnsubscribe = (patientId: string, callback?: (res: any) => void) => {
    unsubscribeFromPatient(patientId, callback);
  };

  const reconnect = () => {
    disconnectSocket();
    connect();
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        status,
        error,
        subscribePatient: handleSubscribe,
        unsubscribePatient: handleUnsubscribe,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
