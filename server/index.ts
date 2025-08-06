import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle database lock errors
    if (message.includes('INDEX_LOCKED') || message.includes('database is locked')) {
      message = "Database temporarily unavailable. Please try again.";
      console.log("Database lock detected, retrying...");
    }

    res.status(status).json({ message });
    if (status >= 500) {
      console.error('Server error:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Start WebSocket server for popup signals
  try {
    await import('./websocket-server');
    log('WebSocket server started on port 3001');
  } catch (error) {
    log('Failed to start WebSocket server:', error);
  }

  // Add WebSocket popup close endpoint
  app.post('/api/popup/close', (req, res) => {
    try {
      const { transactionUuid, popupId, machineId } = req.body;

      if (!transactionUuid || !popupId) {
        return res.status(400).json({ error: 'transactionUuid and popupId are required' });
      }

      // Import and use popup server
      import('./websocket-server').then(({ popupSignalServer }) => {
        popupSignalServer.signalPopupClose(transactionUuid, popupId, machineId);
        res.json({ 
          success: true, 
          message: 'Popup close signal sent',
          transactionUuid,
          popupId,
          targetMachineId: machineId || 'all'
        });
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  // Add notification endpoint for external payment system (compatible with your API)
  app.post('/api/NotifyPos/ReceiveNotify', (req, res) => {
    try {
      const { TransactionUuid } = req.body;

      console.log('📢 Received notification from external payment system! Payload:', JSON.stringify(req.body));

      if (!TransactionUuid) {
        return res.status(400).json({ error: 'TransactionUuid is required' });
      }

      // Import and use popup server to signal payment success
      import('./websocket-server').then(({ popupSignalServer }) => {
        // Generate popup ID based on transaction UUID
        const popupId = `payment_modal_${TransactionUuid}`;

        console.log(`💳 Payment successful for transaction: ${TransactionUuid}, closing popup: ${popupId}`);

        // Signal all connected clients to close popup for this transaction
        popupSignalServer.signalPopupClose(TransactionUuid, popupId, undefined);

        res.json({ 
          message: 'Notification received successfully.',
          success: true,
          transactionUuid: TransactionUuid,
          popupId: popupId
        });
      });
    } catch (error) {
      console.error('Error handling payment notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
})();