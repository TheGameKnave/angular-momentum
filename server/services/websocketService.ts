// websocket.ts
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService';

export function setupWebSocket(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Replace with your frontend's actual origin for production
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true
    },
  });

  // istanbul ignore next
  io.engine.on('headers', (headers, request) => {});
  // istanbul ignore next
  io.engine.on('connection', (socket) => {});
  // istanbul ignore next
  io.engine.on('disconnect', (socket) => {});
  // istanbul ignore next
  io.use((socket, next) => {
    // Proceed with connection
    next();
  });
  io.on('connect_error', (err) => {
    console.error('WebSocket connection error:', err);
  });  
  // Handle WebSocket connections
  io.on('connection', async (socket) => {

    // Send the current flags when a client connects
    const featureFlags = await readFeatureFlags();
    socket.emit('update-feature-flags', featureFlags);

    // istanbul ignore next
    socket.onAny((event, ...args) => {});
    // Handle updates to the feature flags
    socket.on('update-feature-flag', async (newFeatures: Record<string, boolean>) => {

      // Write updates to the file
     const updatedFeatures = await writeFeatureFlags(newFeatures);

      // Broadcast the updated flags to all clients
      io.emit('update-feature-flags', updatedFeatures);
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
}