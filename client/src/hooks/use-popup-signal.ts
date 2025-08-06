
import { useEffect, useState, useCallback } from 'react';

interface PopupSignal {
  type: 'close_popup';
  popupId: string;
  targetClientId?: string; // Optional: target specific client
}

interface UsePopupSignalProps {
  popupId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function usePopupSignal({ popupId, isOpen, onClose }: UsePopupSignalProps) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [clientId] = useState(() => `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Use the current host for WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/popup-signals`;
        
        const websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
          console.log('PopupSignal WebSocket connected');
          setConnectionStatus('connected');
          
          // Register this client with its ID
          websocket.send(JSON.stringify({
            type: 'register',
            clientId: clientId
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const signal: PopupSignal = JSON.parse(event.data);
            console.log('Received popup signal:', signal);
            
            if (signal.type === 'close_popup' && signal.popupId === popupId) {
              // Check if this signal is for this specific client or for all clients
              if (!signal.targetClientId || signal.targetClientId === clientId) {
                console.log(`Closing popup ${popupId} for client ${clientId}`);
                onClose();
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onclose = () => {
          console.log('PopupSignal WebSocket disconnected');
          setConnectionStatus('disconnected');
          setWs(null);
          
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        websocket.onerror = (error) => {
          console.error('PopupSignal WebSocket error:', error);
          setConnectionStatus('disconnected');
        };

        setWs(websocket);
        setConnectionStatus('connecting');
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [popupId, onClose, clientId]);

  // Send close signal to other clients
  const sendCloseSignal = useCallback((targetPopupId: string, targetClientId?: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const signal: PopupSignal = {
        type: 'close_popup',
        popupId: targetPopupId,
        targetClientId
      };
      
      ws.send(JSON.stringify(signal));
      console.log('Sent close popup signal:', signal);
    }
  }, [ws]);

  return {
    clientId,
    connectionStatus,
    sendCloseSignal,
    isConnected: connectionStatus === 'connected'
  };
}
