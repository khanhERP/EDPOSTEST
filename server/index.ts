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

    // Handle database connection errors
    if (message.includes('ECONNREFUSED') || message.includes('connection refused')) {
      message = "Database connection failed. Please check database server.";
      console.error("❌ Database connection error:", err);
    }

    // Handle database lock errors
    if (message.includes('INDEX_LOCKED') || message.includes('database is locked')) {
      message = "Database temporarily unavailable. Please try again.";
      console.log("Database lock detected, retrying...");
    }

    // Handle authentication errors
    if (message.includes('authentication failed') || message.includes('password authentication failed')) {
      message = "Database authentication failed. Please check credentials.";
      console.error("❌ Database auth error:", err);
    }

    // Handle timeout errors
    if (message.includes('timeout') || message.includes('connection timeout')) {
      message = "Database connection timeout. Please try again.";
      console.error("⏰ Database timeout error:", err);
    }

    res.status(status).json({ message });
    if (status >= 500) {
      console.error('💥 Server error:', err);
    }
  });

  // Add WebSocket popup close endpoint
  app.post('/api/popup/close', (req, res) => {
    const { success } = req.body;

    // Import and use WebSocket server
    import('./websocket-server').then((wsModule) => {
      wsModule.broadcastPopupClose(success);
    });

    res.json({ success: true, message: 'Popup close signal sent' });
  });

  // Add endpoint to receive payment notification from external API
  app.post('/api/NotifyPos/ReceiveNotify', (req, res) => {
    try {
      const { TransactionUuid } = req.body;

      console.log('📢 Received payment notification from API! TransactionUuid:', TransactionUuid);

      // Broadcast payment success via WebSocket
      import('./websocket-server').then((wsModule) => {
        wsModule.broadcastPaymentSuccess(TransactionUuid);
      });

      res.json({ message: 'Notification received successfully.' });
    } catch (error) {
      console.error('Error processing payment notification:', error);
      res.status(500).json({ error: 'Failed to process notification' });
    }
  });

  // Start WebSocket server for popup signals
  try {
    const wsModule = await import('./websocket-server');
    wsModule.initializeWebSocketServer(server);
    log('WebSocket server initialized on same port as HTTP server');
  } catch (error) {
    log('Failed to start WebSocket server:', error);
    console.error('WebSocket error details:', error);
    // Continue without WebSocket if it fails
  }

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
  const PORT = process.env.PORT || 5001;

  // Handle server errors first before trying to listen
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is busy, trying port ${PORT + 1}`);
      setTimeout(() => {
        server.listen({
          port: PORT + 1,
          host: "0.0.0.0",
          reusePort: false,
        }, () => {
          log(`🚀 Server running on port ${PORT + 1}`);
          import('./websocket-server').then((wsModule) => {
            wsModule.initializeWebSocketServer(server);
            log('WebSocket server initialized on same port as HTTP server');
          });
        });
      }, 1000);
    } else {
      console.error('💥 Server error:', err);
    }
  });

  // Try to start server on primary port
  try {
    server.listen({
      port: PORT,
      host: "0.0.0.0",
      reusePort: false,
    }, () => {
      log(`🚀 Server running on port ${PORT}`);

      // Initialize WebSocket server after HTTP server is running
      import('./websocket-server').then((wsModule) => {
        wsModule.initializeWebSocketServer(server);
        log('WebSocket server initialized on same port as HTTP server');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();