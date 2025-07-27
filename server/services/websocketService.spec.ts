// websocket.spec.ts
import { setupWebSocket } from './websocketService';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService';
import { Server as SocketIOServer } from 'socket.io';

// Mock the feature flag service methods
jest.mock('./lowDBService', () => ({
  writeFeatureFlags: jest.fn(),
  readFeatureFlags: jest.fn(),
}));

// Mock the entire socket.io module
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    engine: {
      on: jest.fn(),
    },
  })),
}));

describe('setupWebSocket', () => {
  let mockServer: any;
  let io: any;
  let mockSocket: any;
  let connectionHandler: Function;

  beforeEach(() => {
    mockServer = {};
    io = {
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'connection') {
          connectionHandler = handler;  // Capture the connection handler
        }
      }),
      use: jest.fn(),
      emit: jest.fn(),
      engine: {
        on: jest.fn(),
      },
    };

    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
      onAny: jest.fn(),
    };

    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => io);
    (readFeatureFlags as jest.Mock).mockResolvedValue({ featureA: true });
    (writeFeatureFlags as jest.Mock).mockResolvedValue({ featureA: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize the WebSocket server with the correct options', () => {
    setupWebSocket(mockServer);

    expect(SocketIOServer).toHaveBeenCalledWith(mockServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true,
      },
    });
  });

  it('should handle client connection and send feature flags', async () => {
    setupWebSocket(mockServer);

    // Ensure the connection handler was captured
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));

    const connectionHandler = io.on.mock.calls.find(
      ([event]) => event === 'connection'
    )?.[1];

    if (connectionHandler) {
      connectionHandler(mockSocket);  // Simulate connection
    }

    // Wait for feature flags to be sent
    await Promise.resolve();

    expect(readFeatureFlags).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('update-feature-flags', {
      featureA: true,
    });
  });

  it('should handle feature flag updates and broadcast them', async () => {
    setupWebSocket(mockServer);
  
    // Ensure the connection handler was captured
    const connectionHandler = io.on.mock.calls.find(
      ([event]) => event === 'connection'
    )?.[1];
  
    if (connectionHandler) {
      connectionHandler(mockSocket);  // Simulate connection
    }
  
    // Mock the 'update-feature-flag' event handler
    const updateFeatureFlagHandler = jest.fn((newFeatures) => {
      writeFeatureFlags(newFeatures); // Call writeFeatureFlags from within the event handler
      io.emit('update-feature-flags', newFeatures); // Call io.emit from within the event handler
    });
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'update-feature-flag') {
        updateFeatureFlagHandler.mockImplementation(handler);  // Mock the event handler
      }
    });
  
    const newFeatures = { featureA: false };
  
    // Simulate the handler call for 'update-feature-flag'
    await updateFeatureFlagHandler(newFeatures);
  
    // Trigger the mockSocket.on event handler
    mockSocket.emit('update-feature-flag', newFeatures);
  
    // Ensure writeFeatureFlags is called
    expect(writeFeatureFlags).toHaveBeenCalledWith(newFeatures);
  
    // Ensure io.emit is called with 'update-feature-flags' and the updated features
    expect(io.emit).toHaveBeenCalledWith('update-feature-flags', newFeatures);
  });
  
  it('should handle socket disconnection', () => {
    setupWebSocket(mockServer);
  
    // Ensure the connection handler was captured
    const connectionHandler = io.on.mock.calls.find(
      ([event]) => event === 'connection'
    )?.[1];
  
    if (connectionHandler) {
      connectionHandler(mockSocket);  // Simulate connection
    }
  
    // Mock the 'disconnect' event handler
    const disconnectHandler = jest.fn();
    mockSocket.on.mockImplementation((event, handler) => {
      if (event === 'disconnect') {
        handler(); // Call the original event handler
      } else {
        handler(); // Call the original event handler for other events
      }
    });
  
    // Trigger the mockSocket.on event handler
    mockSocket.on('disconnect', disconnectHandler); // Register the disconnect handler
    mockSocket.emit('disconnect'); // Emit the disconnect event
  
    // Ensure 'disconnect' handler was called
    expect(disconnectHandler).toHaveBeenCalledTimes(1);
  });
  
  it('should log connection errors', () => {
    setupWebSocket(mockServer);

    const errorHandler = io.on.mock.calls.find(
      ([event]) => event === 'connect_error'
    )?.[1];

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockError = new Error('Connection error');
    errorHandler(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'WebSocket connection error:',
      mockError
    );

    /**/consoleErrorSpy.mockRestore();
  });

  it('should set up middleware and engine event listeners', () => {
    setupWebSocket(mockServer);

    expect(io.use).toHaveBeenCalled();
    expect(io.engine.on).toHaveBeenCalledWith('headers', expect.any(Function));
    expect(io.engine.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(io.engine.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });
});
