export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    stats: {
        roundsPlayed: number;
        averageScore: number;
    };
    recentPlayers: string[]; // Array of User UIDs
    mrtzBalance?: number; // Current MRTZ balance
}

export interface Course {
    id: string;
    name: string;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
    address?: string;
    phone?: string;
    website?: string;
    description?: string;
    difficulty?: number; // 1-5 rating
    rating?: number; // User rating
    numRatings?: number;
    yearEstablished?: number;
    courseType?: 'Public' | 'Private' | 'Pay to Play';
    terrain?: string;
    property?: string;
    dgcoursereviewId?: string; // Original ID from dgcoursereview
    dgcoursereviewUrl?: string; // Link back to original
    layouts: {
        [layoutId: string]: CourseLayout;
    };
    selectedLayoutKey?: string; // Currently selected layout for active round
    images?: string[]; // Array of image URLs
    amenities?: string[]; // e.g., ['Restrooms', 'Parking', 'Water']
    createdAt?: string;
    updatedAt?: string;
}

export interface CourseLayout {
    name: string; // e.g., "Main", "Short", "Long"
    holes: {
        [holeNumber: number]: HoleInfo;
    };
    parTotal: number;
}

export interface HoleInfo {
    par: number;
    distance?: number; // in feet/meters
    notes?: string; // e.g., "OB right", "Mandatory left"
    imageUrl?: string;
}

import { Timestamp } from 'firebase/firestore';
import { NassauResult } from '@/lib/betting';
import { FundatoryBet } from '@/lib/betting';

export interface Round {
    id: string;
    courseId: string;
    layoutId: string;
    date: string; // ISO string
    players: string[]; // Array of User UIDs or player IDs
    scores: {
        [holeNumber: number]: {
            [playerId: string]: number; // Score relative to par (e.g., -1, 0, 1)
        };
    };
    bets: {
        skins?: {
            [holeNumber: number]: {
                winnerId?: string;
                value: number; // e.g., 0.25 merits
                carryOver: boolean;
            };
        };
        nassau?: NassauResult | null;
        fundatory?: FundatoryBet[];
        mrtzResults?: { [playerId: string]: number };
        // Add other bet types here
    };
    status: 'active' | 'completed' | 'partial';
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
    // Additional metadata
    courseName?: string; // Denormalized for easier display
    layoutName?: string; // Denormalized for easier display
    playerNames?: { [playerId: string]: string }; // Denormalized player names
}
