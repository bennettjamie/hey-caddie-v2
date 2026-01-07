/**
 * Tests for lib/rounds.ts
 * Demonstrates testing patterns for Firebase operations with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { saveRound, getRound, getUserRounds, getLocalRounds, saveLocalRound, convertGameRoundToFirestore } from './rounds';
import { STORAGE_KEYS, ROUND_STATUS, QUERY_LIMITS, CACHE_LIMITS } from './constants';
import { Round } from '@/types/firestore';
import { GameRound } from '@/types/game';

// Mock Firebase operations
vi.mock('firebase/firestore');
vi.mock('./syncQueue', () => ({
  queueOperation: vi.fn(),
  isOnline: vi.fn(() => true)
}));

describe('rounds.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('saveRound', () => {
    it('should save round to Firebase and return document ID', async () => {
      const mockRoundData: Omit<Round, 'id'> = {
        courseId: 'course-123',
        layoutId: 'layout-red',
        date: '2026-01-07T12:00:00.000Z',
        players: ['player-1', 'player-2'],
        scores: {},
        bets: { skins: {}, nassau: null, fundatory: [] },
        status: ROUND_STATUS.COMPLETED
      };

      const mockDocRef = { id: 'round-456' };
      vi.mocked(firestore.addDoc).mockResolvedValue(mockDocRef as any);
      vi.mocked(firestore.collection).mockReturnValue({} as any);

      const result = await saveRound(mockRoundData);

      expect(result).toBe('round-456');
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockRoundData,
          createdAt: expect.anything(),
          updatedAt: expect.anything()
        })
      );
    });

    it('should handle Firebase errors gracefully', async () => {
      const mockRoundData: Omit<Round, 'id'> = {
        courseId: 'course-123',
        layoutId: 'layout-red',
        date: '2026-01-07T12:00:00.000Z',
        players: ['player-1'],
        scores: {},
        bets: { skins: {}, nassau: null, fundatory: [] },
        status: ROUND_STATUS.COMPLETED
      };

      vi.mocked(firestore.addDoc).mockRejectedValue(new Error('Firebase error'));

      await expect(saveRound(mockRoundData)).rejects.toThrow('Firebase error');
    });
  });

  describe('getRound', () => {
    it('should return round if it exists', async () => {
      const mockRound: Round = {
        id: 'round-123',
        courseId: 'course-456',
        layoutId: 'layout-red',
        date: '2026-01-07T12:00:00.000Z',
        players: ['player-1'],
        scores: {},
        bets: { skins: {}, nassau: null, fundatory: [] },
        status: ROUND_STATUS.COMPLETED
      };

      const mockDocSnap = {
        exists: () => true,
        id: 'round-123',
        data: () => ({ ...mockRound, id: undefined })
      };

      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(firestore.doc).mockReturnValue({} as any);

      const result = await getRound('round-123');

      expect(result).toMatchObject(mockRound);
      expect(firestore.getDoc).toHaveBeenCalled();
    });

    it('should return null if round does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);
      vi.mocked(firestore.doc).mockReturnValue({} as any);

      const result = await getRound('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserRounds', () => {
    it('should fetch user rounds with default limit', async () => {
      const mockRounds: Round[] = [
        {
          id: 'round-1',
          courseId: 'course-123',
          layoutId: 'layout-red',
          date: '2026-01-07T12:00:00.000Z',
          players: ['user-1', 'player-2'],
          scores: {},
          bets: { skins: {}, nassau: null, fundatory: [] },
          status: ROUND_STATUS.COMPLETED
        }
      ];

      const mockSnapshot = {
        docs: mockRounds.map(round => ({
          id: round.id,
          data: () => ({ ...round, id: undefined })
        }))
      };

      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(firestore.query).mockReturnValue({} as any);
      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.where).mockReturnValue({} as any);
      vi.mocked(firestore.orderBy).mockReturnValue({} as any);
      vi.mocked(firestore.limit).mockReturnValue({} as any);

      const result = await getUserRounds('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('round-1');
      expect(firestore.limit).toHaveBeenCalledWith(QUERY_LIMITS.USER_ROUNDS_DEFAULT);
    });

    it('should use custom limit when provided', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any);
      vi.mocked(firestore.query).mockReturnValue({} as any);
      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.where).mockReturnValue({} as any);
      vi.mocked(firestore.orderBy).mockReturnValue({} as any);
      vi.mocked(firestore.limit).mockReturnValue({} as any);

      await getUserRounds('user-1', 25);

      expect(firestore.limit).toHaveBeenCalledWith(25);
    });
  });

  describe('localStorage operations', () => {
    describe('getLocalRounds', () => {
      it('should return empty array when no data stored', () => {
        const result = getLocalRounds();
        expect(result).toEqual([]);
      });

      it('should return stored rounds', () => {
        const mockRounds: Round[] = [
          {
            id: 'local-round-1',
            courseId: 'course-123',
            layoutId: 'layout-red',
            date: '2026-01-07T12:00:00.000Z',
            players: ['player-1'],
            scores: {},
            bets: { skins: {}, nassau: null, fundatory: [] },
            status: ROUND_STATUS.COMPLETED
          }
        ];

        localStorage.setItem(STORAGE_KEYS.ROUND_HISTORY, JSON.stringify(mockRounds));

        const result = getLocalRounds();
        expect(result).toEqual(mockRounds);
      });

      it('should handle malformed JSON gracefully', () => {
        localStorage.setItem(STORAGE_KEYS.ROUND_HISTORY, 'invalid json');

        const result = getLocalRounds();
        expect(result).toEqual([]);
      });
    });

    describe('saveLocalRound', () => {
      it('should save round to localStorage', () => {
        const mockRound: Round = {
          id: 'local-round-1',
          courseId: 'course-123',
          layoutId: 'layout-red',
          date: '2026-01-07T12:00:00.000Z',
          players: ['player-1'],
          scores: {},
          bets: { skins: {}, nassau: null, fundatory: [] },
          status: ROUND_STATUS.COMPLETED
        };

        saveLocalRound(mockRound);

        const stored = localStorage.getItem(STORAGE_KEYS.ROUND_HISTORY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe('local-round-1');
      });

      it('should prepend new round to beginning', () => {
        const round1: Round = {
          id: 'round-1',
          courseId: 'course-123',
          layoutId: 'layout-red',
          date: '2026-01-06T12:00:00.000Z',
          players: ['player-1'],
          scores: {},
          bets: { skins: {}, nassau: null, fundatory: [] },
          status: ROUND_STATUS.COMPLETED
        };

        const round2: Round = {
          id: 'round-2',
          courseId: 'course-456',
          layoutId: 'layout-blue',
          date: '2026-01-07T12:00:00.000Z',
          players: ['player-2'],
          scores: {},
          bets: { skins: {}, nassau: null, fundatory: [] },
          status: ROUND_STATUS.COMPLETED
        };

        saveLocalRound(round1);
        saveLocalRound(round2);

        const stored = getLocalRounds();
        expect(stored[0].id).toBe('round-2');
        expect(stored[1].id).toBe('round-1');
      });

      it('should limit to max history size', () => {
        // Save more rounds than the limit
        const maxRounds = CACHE_LIMITS.MAX_ROUND_HISTORY + 5;

        for (let i = 0; i < maxRounds; i++) {
          const round: Round = {
            id: `round-${i}`,
            courseId: 'course-123',
            layoutId: 'layout-red',
            date: `2026-01-07T${i}:00:00.000Z`,
            players: ['player-1'],
            scores: {},
            bets: { skins: {}, nassau: null, fundatory: [] },
            status: ROUND_STATUS.COMPLETED
          };
          saveLocalRound(round);
        }

        const stored = getLocalRounds();
        expect(stored).toHaveLength(CACHE_LIMITS.MAX_ROUND_HISTORY);
      });
    });
  });

  describe('convertGameRoundToFirestore', () => {
    it('should convert GameRound to Firestore format', () => {
      const mockGameRound: Partial<GameRound> = {
        startTime: '2026-01-07T12:00:00.000Z',
        players: [
          { id: 'player-1', name: 'Alice', uid: 'uid-1' },
          { id: 'player-2', name: 'Bob', uid: 'uid-2' }
        ] as any,
        scores: { 'player-1': { total: 54, scores: [] }, 'player-2': { total: 58, scores: [] } }
      };

      const result = convertGameRoundToFirestore(
        mockGameRound as GameRound,
        'course-123',
        'layout-red'
      );

      expect(result).toMatchObject({
        courseId: 'course-123',
        layoutId: 'layout-red',
        date: '2026-01-07T12:00:00.000Z',
        players: ['player-1', 'player-2'],
        scores: { 'player-1': { total: 54, scores: [] }, 'player-2': { total: 58, scores: [] } },
        status: ROUND_STATUS.COMPLETED
      });
    });

    it('should use default status when not provided', () => {
      const mockGameRound: Partial<GameRound> = {
        startTime: '2026-01-07T12:00:00.000Z',
        players: [],
        scores: {}
      };

      const result = convertGameRoundToFirestore(
        mockGameRound as GameRound,
        'course-123',
        'layout-red'
      );

      expect(result.status).toBe(ROUND_STATUS.COMPLETED);
    });

    it('should accept partial status', () => {
      const mockGameRound: Partial<GameRound> = {
        startTime: '2026-01-07T12:00:00.000Z',
        players: [],
        scores: {}
      };

      const result = convertGameRoundToFirestore(
        mockGameRound as GameRound,
        'course-123',
        'layout-red',
        ROUND_STATUS.PARTIAL
      );

      expect(result.status).toBe(ROUND_STATUS.PARTIAL);
    });
  });
});
