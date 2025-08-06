import { useEffect, useRef, useState, useCallback } from 'react';

interface PopupSignal {
  type: 'CLOSE_POPUP';
  popupId: string;
  transactionUuid: string;
  machineId?: string;
}

interface UsePopupSignalOptions {
  popupId: string;
  transactionUuid?: string;
  machineId?: string;
  onCloseSignal?: () => void;
}

interface UsePopupSignalReturn {
  isConnected: boolean;
  clientId: string | null;
  sendMessage: (message: any) => void;
  closePopup: () => void;
}

export function usePopupSignal({
  popupId,
  transactionUuid,
  machineId,
  onCloseSignal
}: UsePopupSignalOptions): UsePopupSignalReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // Added state for connection status

  const connect = useCallback(() => {
    try {
      // In development, always use ws://
      // In production, Replit will handle the SSL termination
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;

      // For Replit, use the full hostname for WSS
      const wsUrl = protocol === 'wss:'
        ? `wss://${hostname.replace('-00-', '-00-')}/`
        : `ws://${hostname}:3001`;

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket kết nối thành công!');
        console.log(`🔗 Địa chỉ: ${wsUrl}`);
        setIsConnected(true);
        setConnectionStatus('connected');

        // Register machine if provided
        if (machineId) {
          ws.send(JSON.stringify({
            type: 'REGISTER_MACHINE',
            machineId: machineId
          }));
        }

        // Report popup opened
        ws.send(JSON.stringify({
          type: 'POPUP_OPENED',
          popupId,
          transactionUuid,
          timestamp: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          switch (data.type) {
            case 'CONNECTION_ESTABLISHED':
              setClientId(data.clientId);
              console.log(`🆔 Client ID được gán: ${data.clientId}`);
              console.log('🎯 WebSocket sẵn sàng nhận tín hiệu popup!');
              break;

            case 'CLOSE_POPUP':
              // Check if this signal is for our popup
              if (data.popupId === popupId || data.transactionUuid === transactionUuid) {
                console.log(`Received close signal for popup: ${data.popupId}, transaction: ${data.transactionUuid}`);
                if (onCloseSignal) {
                  onCloseSignal();
                }
              }
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.log('🔄 Will attempt to reconnect...');
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
        setConnectionStatus('disconnected');

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [popupId, transactionUuid, machineId, onCloseSignal]); // Added connect to dependencies

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, []);

  const closePopup = useCallback(() => {
    if (onCloseSignal) {
      onCloseSignal();
    }
  }, [onCloseSignal]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]); // Added connect to dependency array

  return {
    isConnected,
    clientId,
    sendMessage,
    closePopup
  };
}

// Utility function to generate machine ID based on browser/device fingerprint
export function generateMachineId(): string {
  // Create a simple fingerprint based on available browser info
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Machine fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    localStorage.getItem('machineId') // Persistent ID if exists
  ].join('|');

  // Generate hash-like ID
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const machineId = `machine_${Math.abs(hash).toString(36)}`;

  // Store for persistence
  localStorage.setItem('machineId', machineId);

  return machineId;
}