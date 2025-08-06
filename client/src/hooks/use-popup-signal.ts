
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

  const connect = useCallback(() => {
    try {
      // Use the current domain with the WebSocket port
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host;
      
      if (window.location.host.includes('replit.dev')) {
        // For Replit environment
        host = window.location.host.replace('-5000', '-3001');
      } else if (window.location.hostname === 'localhost') {
        // For local development
        host = 'localhost:3001';
      } else {
        // For other environments
        host = `${window.location.hostname}:3001`;
      }
      
      const wsUrl = `${protocol}//${host}`;
      
      console.log(`🔄 Đang kết nối WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket kết nối thành công!');
        console.log(`🔗 Địa chỉ: ${wsUrl}`);
        setIsConnected(true);
        
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

      ws.onclose = (event) => {
        console.log(`❌ WebSocket đã ngắt kết nối (code: ${event.code}, reason: ${event.reason})`);
        setIsConnected(false);
        setClientId(null);
        
        // Exponential backoff retry: 3s, 6s, 12s, then back to 3s
        const retryDelay = Math.min(3000 * Math.pow(2, Math.floor(Date.now() / 60000) % 3), 12000);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Thử kết nối lại sau ${retryDelay/1000}s...`);
          connect();
        }, retryDelay);
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket lỗi:', error);
        console.error('❌ Chi tiết lỗi:', {
          url: wsUrl,
          readyState: ws.readyState,
          protocol: ws.protocol || 'unknown'
        });
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [popupId, transactionUuid, machineId, onCloseSignal]);

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
  }, [connect]);

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
