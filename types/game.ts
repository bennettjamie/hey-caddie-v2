/**
 * Game-specific type definitions for in-memory game state
 * These types represent the active game state, which differs from Firestore Round format
 */

import { Course } from './firestore';
import { Player } from '@/lib/players';
export type { Player };
import { FundatoryBet, NassauResult } from '@/lib/betting';
export type { NassauResult };

/**
 * Represents an active round in memory (different from Firestore Round)
 */
export interface GameRound {
    course: Course;
    players: Player[];
    scores: { [holeNumber: number]: { [playerId: string]: number } };
    startTime: string; // ISO string
    status: 'active' | 'ended' | 'partial';
    activeHole: number;
    teeOrder: string[]; // Array of player IDs
    currentTeeIndex: number;
    fundatoryBets?: FundatoryBet[];
    id?: string;
    activeBets?: {
        skins?: { value: number; started: boolean; participants?: string[] };
        nassau?: { value: number; started: boolean; participants?: string[] };
    };
}

/**
 * Round resolution options for handling ties and carry-overs
 */
export interface RoundResolution {
    action: 'exclude' | 'playoff' | 'push' | 'payout';
    settleToday?: boolean;
    playoffWinners?: { [holeNumber: number]: string };
}

/**
 * Final round data returned from endRound() function
 */
export interface FinalRoundData extends GameRound {
    bets: {
        skins: {
            [holeNumber: number]: {
                winnerId?: string;
                value: number;
                carryOver: boolean;
                push?: boolean;
                tiedPlayers?: string[];
            }
        };
        nassau: NassauResult | null;
        fundatory: FundatoryBet[];
        mrtzResults: { [playerId: string]: number };
    };
    finalScores: { [playerId: string]: number };
    endTime?: string;
}

/**
 * Cached round structure for localStorage
 */
export interface CachedRound {
    timestamp: string;
    round: GameRound;
    courseName: string;
    holesPlayed: number;
}
