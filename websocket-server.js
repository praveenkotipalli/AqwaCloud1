const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

console.log('🚀 Real-time transfer WebSocket server started on port 3001');

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    id: 'welcome',
    type: 'connection',
    data: { message: 'Connected to real-time transfer service' },
    timestamp: new Date()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📡 Received message:', data.type);
      
      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            ...data,
            timestamp: new Date()
          }));
        }
      });
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Only send test events when no real file monitoring is active
let realFileMonitoringActive = false;
let testEventInterval = null;

// Function to start test events (when no real monitoring)
function startTestEvents() {
  if (testEventInterval) return; // Already running
  
  console.log('🧪 Starting test file change events (no real monitoring detected)');
  
  testEventInterval = setInterval(() => {
    const testEvent = {
      id: `test_event_${Date.now()}`,
      type: 'file_changed',
      data: {
        fileId: 'test_file_123',
        fileName: 'test_document.pdf',
        changeType: 'modified',
        timestamp: new Date(),
        source: 'google',
        metadata: {
          oldSize: 1024,
          newSize: 2048,
          oldModified: new Date(Date.now() - 60000),
          newModified: new Date()
        }
      },
      timestamp: new Date()
    };

    // Broadcast test event to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(testEvent));
      }
    });
  }, 30000); // Send test event every 30 seconds
}

// Function to stop test events (when real monitoring starts)
function stopTestEvents() {
  if (testEventInterval) {
    console.log('🛑 Stopping test file change events (real monitoring active)');
    clearInterval(testEventInterval);
    testEventInterval = null;
  }
}

// Listen for real file monitoring activity
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Check if this is a real file monitoring message
      if (data.type === 'file_monitoring_started') {
        realFileMonitoringActive = true;
        stopTestEvents();
      } else if (data.type === 'file_monitoring_stopped') {
        realFileMonitoringActive = false;
        startTestEvents();
      }
    } catch (error) {
      // Ignore parsing errors
    }
  });
});

// Start test events initially (will be stopped when real monitoring starts)
startTestEvents();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});
