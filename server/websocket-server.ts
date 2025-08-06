
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

interface PopupSignal {
  type: 'CLOSE_POPUP';
  popupId: string;
  transactionUuid: string;
  machineId?: string;
}

interface Client {
  ws: any;
  machineId?: string;
}

class PopupSignalServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private server: any;

  constructor(port: number = 3001) {
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocket();
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`WebSocket server running on port ${port}`);
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`Client connected: ${clientId}`);

      // Store client
      this.clients.set(clientId, { ws });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Invalid message format:', error);
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private handleMessage(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'REGISTER_MACHINE':
        // Register machine ID for this client
        client.machineId = data.machineId;
        console.log(`Machine registered: ${data.machineId} for client ${clientId}`);
        break;

      case 'POPUP_OPENED':
        // Client reports popup opened
        console.log(`Popup opened: ${data.popupId} on machine ${client.machineId || 'unknown'}`);
        break;

      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  // Method to signal popup close from external source (like payment success webhook)
  public signalPopupClose(transactionUuid: string, popupId: string, targetMachineId?: string) {
    const signal: PopupSignal = {
      type: 'CLOSE_POPUP',
      popupId,
      transactionUuid,
      machineId: targetMachineId
    };

    console.log(`Signaling popup close for transaction: ${transactionUuid}, popup: ${popupId}`);

    // Send to specific machine or all clients
    this.clients.forEach((client, clientId) => {
      if (!targetMachineId || client.machineId === targetMachineId) {
        try {
          client.ws.send(JSON.stringify(signal));
          console.log(`Signal sent to client ${clientId} (machine: ${client.machineId || 'unknown'})`);
        } catch (error) {
          console.error(`Failed to send signal to client ${clientId}:`, error);
        }
      }
    });
  }

  // HTTP endpoint to trigger popup close (for external webhooks)
  public createHttpEndpoint() {
    this.server.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/api/popup/close') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { transactionUuid, popupId, machineId } = data;
            
            if (!transactionUuid || !popupId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'transactionUuid and popupId are required' }));
              return;
            }

            this.signalPopupClose(transactionUuid, popupId, machineId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Popup close signal sent',
              transactionUuid,
              popupId,
              targetMachineId: machineId || 'all'
            }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to get server instance (for integration)
  public getServer() {
    return this.server;
  }

  // Method to get active clients count
  public getClientsCount(): number {
    return this.clients.size;
  }

  // Method to get machine status
  public getMachineStatus() {
    const machines = Array.from(this.clients.values()).map((client, index) => ({
      machineId: client.machineId || `unknown_${index}`,
      connected: true,
      lastSeen: new Date().toISOString()
    }));
    
    return { 
      totalClients: this.clients.size,
      machines
    };
  }
}

// Create and export singleton instance
export const popupSignalServer = new PopupSignalServer(3001);

// Setup HTTP endpoint for external triggers
popupSignalServer.createHttpEndpoint();

export default PopupSignalServer;
