import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useUIStore } from '../store';

let socketInstance = null;

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const { setLiveMetrics, addNotification } = useUIStore();
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!accessToken) return;

    if (!socketInstance) {
      socketInstance = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });
    }

    const socket = socketInstance;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    socket.on('metrics:live', (metrics) => {
      setLiveMetrics(metrics);
    });

    socket.on('deployment:complete', ({ deploymentId, status }) => {
      addNotification({
        type: status === 'success' ? 'success' : 'error',
        title: 'Deployment ' + status,
        message: `Deployment ${deploymentId.slice(0, 8)} ${status === 'success' ? 'completed' : 'failed'}`
      });
    });

    socket.on('terraform:apply:complete', ({ executionId }) => {
      addNotification({
        type: 'success',
        title: 'Terraform Applied',
        message: 'Infrastructure deployed successfully'
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    return () => {
      socket.off('metrics:live');
      socket.off('deployment:complete');
      socket.off('terraform:apply:complete');
    };
  }, [accessToken]);

  const subscribe = useCallback((event, handler) => {
    if (!socketInstance) return;
    socketInstance.on(event, handler);
    return () => socketInstance?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketInstance?.emit(event, data);
  }, []);

  return { socket: socketInstance, subscribe, emit };
};
