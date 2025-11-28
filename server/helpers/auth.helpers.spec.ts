import { Request } from 'express';
import { getUserIdFromRequest, checkUsernameAvailability, upsertUsername } from './auth.helpers';

describe('Auth Helpers', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
  });

  describe('getUserIdFromRequest', () => {
    it('should return null if no authorization header', async () => {
      const req = { headers: {} } as Request;
      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBeNull();
    });

    it('should return null if authorization header does not start with Bearer', async () => {
      const req = { headers: { authorization: 'Basic token123' } } as Request;
      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBeNull();
    });

    it('should return null if getUser returns error', async () => {
      const req = { headers: { authorization: 'Bearer validtoken' } } as Request;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBeNull();
    });

    it('should return null if getUser returns no user', async () => {
      const req = { headers: { authorization: 'Bearer validtoken' } } as Request;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBeNull();
    });

    it('should return user id on success', async () => {
      const req = { headers: { authorization: 'Bearer validtoken' } } as Request;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBe('user-123');
    });

    it('should return null if getUser throws an exception', async () => {
      const req = { headers: { authorization: 'Bearer validtoken' } } as Request;
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const result = await getUserIdFromRequest(req, mockSupabase);
      expect(result).toBeNull();
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return error if check fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await checkUsernameAvailability(mockSupabase, 'testuser', 'user-123');
      expect(result).toEqual({
        available: false,
        isCurrentUser: false,
        error: 'Database error',
      });
    });

    it('should return available true if no existing username', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await checkUsernameAvailability(mockSupabase, 'testuser', 'user-123');
      expect(result).toEqual({
        available: true,
        isCurrentUser: false,
      });
    });

    it('should return available true if username belongs to current user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      });

      const result = await checkUsernameAvailability(mockSupabase, 'testuser', 'user-123');
      expect(result).toEqual({
        available: true,
        isCurrentUser: true,
      });
    });

    it('should return available false if username belongs to different user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'other-user' },
              error: null,
            }),
          }),
        }),
      });

      const result = await checkUsernameAvailability(mockSupabase, 'testuser', 'user-123');
      expect(result).toEqual({
        available: false,
        isCurrentUser: false,
      });
    });
  });

  describe('upsertUsername', () => {
    it('should return error if getCurrentUsername fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await upsertUsername(mockSupabase, 'user-123', 'testuser', 'testuser');
      expect(result).toEqual({ error: 'Database error' });
    });

    it('should update existing username', async () => {
      const selectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'olduser' },
              error: null,
            }),
          }),
        }),
      };

      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { username: 'newuser', fingerprint: 'newuser' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(updateMock);

      const result = await upsertUsername(mockSupabase, 'user-123', 'newuser', 'newuser');
      expect(result).toEqual({ data: { username: 'newuser', fingerprint: 'newuser' } });
    });

    it('should return error if update fails', async () => {
      const selectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { username: 'olduser' },
              error: null,
            }),
          }),
        }),
      };

      const updateMock = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(updateMock);

      const result = await upsertUsername(mockSupabase, 'user-123', 'newuser', 'newuser');
      expect(result).toEqual({ error: 'Update failed' });
    });

    it('should insert new username', async () => {
      const selectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const insertMock = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { username: 'newuser', fingerprint: 'newuser' },
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(insertMock);

      const result = await upsertUsername(mockSupabase, 'user-123', 'newuser', 'newuser');
      expect(result).toEqual({ data: { username: 'newuser', fingerprint: 'newuser' } });
    });

    it('should return error if insert fails', async () => {
      const selectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const insertMock = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectMock)
        .mockReturnValueOnce(insertMock);

      const result = await upsertUsername(mockSupabase, 'user-123', 'newuser', 'newuser');
      expect(result).toEqual({ error: 'Insert failed' });
    });
  });
});
