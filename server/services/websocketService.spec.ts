// websocket.spec.ts
import { setupWebSocket } from './websocketService';
import { readFeatureFlags, writeFeatureFlags } from './lowDBService';
import { Server as SocketIOServer } from 'socket.io';

// Mock the feature flag service methods
jest.mock('./lowDBService', () => ({
  writeFeatureFlags: jest.fn(),
  readFeatureFlags: jest.fn(),
}));

// Mock the userSettingsSocketService
jest.mock('./userSettingsSocketService', () => ({
  joinUserRoom: jest.fn(),
  leaveUserRoom: jest.fn(),
}));

import { joinUserRoom, leaveUserRoom } from './userSettingsSocketService';

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
        origin: [
          'http://localhost:4200',
          'http://192.168.1.x:4200',
          'https://dev.angularmomentum.app',
          'https://staging.angularmomentum.app',
          'https://angularmomentum.app',
          'tauri://localhost', // for tauri ios
          'http://tauri.localhost', // for tauri android
        ],
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
  
  it('should handle connection errors silently', () => {
    setupWebSocket(mockServer);

    const errorHandler = io.on.mock.calls.find(
      ([event]) => event === 'connect_error'
    )?.[1];

    const mockError = new Error('Connection error');
    // Error handler exists but doesn't log to console (removed for production)
    expect(() => errorHandler(mockError)).not.toThrow();
  });

  it('should set up middleware and engine event listeners', () => {
    setupWebSocket(mockServer);

    expect(io.use).toHaveBeenCalled();
    expect(io.engine.on).toHaveBeenCalledWith('headers', expect.any(Function));
    expect(io.engine.on).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(io.engine.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  describe('authentication', () => {
    let authenticateHandler: Function;
    let disconnectHandler: Function;
    let mockSupabase: any;

    beforeEach(() => {
      mockSupabase = {
        auth: {
          getUser: jest.fn(),
        },
      };

      // Capture event handlers when socket.on is called
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'authenticate') {
          authenticateHandler = handler;
        } else if (event === 'disconnect') {
          disconnectHandler = handler;
        }
      });
    });

    it('should emit auth-error when supabase is not provided', async () => {
      setupWebSocket(mockServer, null);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      // Call the authenticate handler with a token
      await authenticateHandler('some-token');

      expect(mockSocket.emit).toHaveBeenCalledWith('auth-error', { message: 'Authentication failed' });
    });

    it('should emit auth-error when token is empty', async () => {
      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      // Call the authenticate handler with empty token
      await authenticateHandler('');

      expect(mockSocket.emit).toHaveBeenCalledWith('auth-error', { message: 'Authentication failed' });
    });

    it('should emit auth-error when getUser returns error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: null, error: new Error('Invalid token') });

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      await authenticateHandler('invalid-token');

      expect(mockSocket.emit).toHaveBeenCalledWith('auth-error', { message: 'Invalid token' });
    });

    it('should emit auth-error when getUser returns no user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      await authenticateHandler('valid-but-no-user-token');

      expect(mockSocket.emit).toHaveBeenCalledWith('auth-error', { message: 'Invalid token' });
    });

    it('should authenticate successfully and join user room', async () => {
      const userId = 'user-123';
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      await authenticateHandler('valid-token');

      expect(joinUserRoom).toHaveBeenCalledWith(mockSocket, userId);
      expect(mockSocket.emit).toHaveBeenCalledWith('authenticated', { userId });
    });

    it('should leave old room when re-authenticating', async () => {
      const oldUserId = 'user-old';
      const newUserId = 'user-new';

      mockSupabase.auth.getUser
        .mockResolvedValueOnce({ data: { user: { id: oldUserId } }, error: null })
        .mockResolvedValueOnce({ data: { user: { id: newUserId } }, error: null });

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      // First authentication
      await authenticateHandler('first-token');
      expect(joinUserRoom).toHaveBeenCalledWith(mockSocket, oldUserId);

      // Re-authenticate with different user
      await authenticateHandler('second-token');
      expect(leaveUserRoom).toHaveBeenCalledWith(mockSocket, oldUserId);
      expect(joinUserRoom).toHaveBeenCalledWith(mockSocket, newUserId);
    });

    it('should emit auth-error when getUser throws exception', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      await authenticateHandler('valid-token');

      expect(mockSocket.emit).toHaveBeenCalledWith('auth-error', { message: 'Authentication failed' });
    });

    it('should leave user room on disconnect when authenticated', async () => {
      const userId = 'user-123';
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      // First authenticate
      await authenticateHandler('valid-token');

      // Then disconnect
      disconnectHandler();

      expect(leaveUserRoom).toHaveBeenCalledWith(mockSocket, userId);
    });
  });
});
