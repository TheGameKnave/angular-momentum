import { Server as SocketIOServer } from 'socket.io';
import { readFeatureFlags } from './lowDBService';

export function setupWebSocket(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: [
        'http://localhost:4200',
        'http://192.168.1.x:4200',
        'http://tauri.localhost',
        'https://angularmomentum.app',
        'tauri://localhost', // for tauri ios
        'http://tauri.localhost', // for tauri android
      ], // Replace with your frontend's actual origin for production
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
    /**/console.error('WebSocket connection error:', err);
  });  
  // Handle WebSocket connections
  io.on('connection', async (socket) => {

    // Send the current flags when a client connects
    const featureFlags = await readFeatureFlags();
    socket.emit('update-feature-flags', featureFlags);

    // istanbul ignore next
    socket.onAny((event, ...args) => {});

    socket.on('disconnect', () => {
    });
  });

  return io;
}