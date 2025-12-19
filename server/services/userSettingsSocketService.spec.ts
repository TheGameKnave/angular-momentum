import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  broadcastUserSettingsUpdate,
  joinUserRoom,
  leaveUserRoom,
  UserSettingsPayload,
} from './userSettingsSocketService';

describe('userSettingsSocketService', () => {
  describe('broadcastUserSettingsUpdate', () => {
    it('should emit user-settings-updated event to user room', () => {
      const mockTo = jest.fn().mockReturnThis();
      const mockEmit = jest.fn();
      const mockIo = {
        to: mockTo,
        emit: mockEmit,
      } as unknown as SocketIOServer;

      mockTo.mockReturnValue({ emit: mockEmit });

      const userId = 'user-123';
      const settings: UserSettingsPayload = {
        timezone: 'America/New_York',
        theme_preference: 'dark',
        language: 'en-US',
        updated_at: '2025-12-17T10:00:00Z',
      };

      broadcastUserSettingsUpdate(mockIo, userId, settings);

      expect(mockTo).toHaveBeenCalledWith('user:user-123');
      expect(mockEmit).toHaveBeenCalledWith('user-settings-updated', settings);
    });

    it('should handle partial settings payload', () => {
      const mockTo = jest.fn().mockReturnThis();
      const mockEmit = jest.fn();
      const mockIo = {
        to: mockTo,
      } as unknown as SocketIOServer;

      mockTo.mockReturnValue({ emit: mockEmit });

      const userId = 'user-456';
      const settings: UserSettingsPayload = {
        theme_preference: 'light',
        updated_at: '2025-12-17T11:00:00Z',
      };

      broadcastUserSettingsUpdate(mockIo, userId, settings);

      expect(mockTo).toHaveBeenCalledWith('user:user-456');
      expect(mockEmit).toHaveBeenCalledWith('user-settings-updated', settings);
    });
  });

  describe('joinUserRoom', () => {
    it('should join socket to user-prefixed room', () => {
      const mockJoin = jest.fn();
      const mockSocket = {
        join: mockJoin,
      } as unknown as Socket;

      const userId = 'user-789';

      joinUserRoom(mockSocket, userId);

      expect(mockJoin).toHaveBeenCalledWith('user:user-789');
    });
  });

  describe('leaveUserRoom', () => {
    it('should leave socket from user-prefixed room', () => {
      const mockLeave = jest.fn();
      const mockSocket = {
        leave: mockLeave,
      } as unknown as Socket;

      const userId = 'user-abc';

      leaveUserRoom(mockSocket, userId);

      expect(mockLeave).toHaveBeenCalledWith('user:user-abc');
    });
  });
});
