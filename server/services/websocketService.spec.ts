// websocket.spec.ts
import { setupWebSocket } from './websocketService';
import { readFeatureFlags } from './lowDBService';
import { Server as SocketIOServer } from 'socket.io';
import { ALLOWED_ORIGINS } from '../constants/server.constants';

// Mock the feature flag service methods
jest.mock('./lowDBService', () => ({
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
  Server: jest.fn(),
}));

describe('setupWebSocket', () => {
  let mockServer: any;
  let io: any;
  let mockSocket: any;

  beforeEach(() => {
    mockServer = {};
    io = {
      on: jest.fn(),
    };

    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => io);
    (readFeatureFlags as jest.Mock).mockResolvedValue({ featureA: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize the WebSocket server with the correct options', () => {
    setupWebSocket(mockServer);

    expect(SocketIOServer).toHaveBeenCalledWith(mockServer, {
      cors: {
        origin: ALLOWED_ORIGINS,
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

  it('should emit the freshly read feature flags to every newly connected client', async () => {
    // Distinct flag payload per connection proves the flags flow from lowDBService
    // through the real connection handler, not from test-local fixtures.
    (readFeatureFlags as jest.Mock)
      .mockResolvedValueOnce({ featureA: true, featureB: false })
      .mockResolvedValueOnce({ featureA: false, featureB: true });

    setupWebSocket(mockServer);

    const connectionHandler = io.on.mock.calls.find(
      ([event]) => event === 'connection'
    )?.[1];

    // Drive the REAL connection handler for two separate sockets
    const secondSocket = { emit: jest.fn(), on: jest.fn() };
    await connectionHandler(mockSocket);
    await connectionHandler(secondSocket);

    expect(readFeatureFlags).toHaveBeenCalledTimes(2);
    expect(mockSocket.emit).toHaveBeenCalledWith('update-feature-flags', {
      featureA: true,
      featureB: false,
    });
    expect(secondSocket.emit).toHaveBeenCalledWith('update-feature-flags', {
      featureA: false,
      featureB: true,
    });
  });

  it('should not leave any user room when an unauthenticated socket disconnects', async () => {
    setupWebSocket(mockServer);

    const connectionHandler = io.on.mock.calls.find(
      ([event]) => event === 'connection'
    )?.[1];

    // Drive the REAL connection handler so the real 'disconnect' handler is registered
    await connectionHandler(mockSocket);

    const disconnectHandler = mockSocket.on.mock.calls.find(
      ([event]: [string]) => event === 'disconnect'
    )?.[1];
    expect(disconnectHandler).toBeDefined();

    // Invoke the REAL disconnect handler without ever authenticating
    disconnectHandler();

    expect(leaveUserRoom).not.toHaveBeenCalled();
  });

  describe('authentication', () => {
    let authenticateHandler: Function;
    let deauthenticateHandler: Function;
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
        } else if (event === 'deauthenticate') {
          deauthenticateHandler = handler;
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

    it('should leave user room on deauthenticate and emit deauthenticated', async () => {
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
      (leaveUserRoom as jest.Mock).mockClear();

      // Then deauthenticate (logout)
      deauthenticateHandler();

      expect(leaveUserRoom).toHaveBeenCalledWith(mockSocket, userId);
      expect(mockSocket.emit).toHaveBeenCalledWith('deauthenticated');
    });

    it('should do nothing on deauthenticate when not authenticated', async () => {
      setupWebSocket(mockServer, mockSupabase);

      const connectionHandler = io.on.mock.calls.find(
        ([event]) => event === 'connection'
      )?.[1];

      if (connectionHandler) {
        await connectionHandler(mockSocket);
      }

      // Deauthenticate without ever authenticating
      mockSocket.emit.mockClear();
      deauthenticateHandler();

      expect(leaveUserRoom).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('deauthenticated');
    });
  });
});
