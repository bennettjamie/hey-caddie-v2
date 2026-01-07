export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    phone?: string;

    // Friend system
    friendIds: string[]; // Cached array for offline queries
    friendCount: number;

    // Stats (synced from Player records)
    stats: {
        roundsPlayed: number;
        averageScore: number;
        bestRound?: number;
        bestCourse?: string;
    };

    // Settings
    settings: {
        shareStats: boolean; // Show on leaderboards (future)
        notificationsEnabled: boolean;
        privacyLevel: 'public' | 'friends' | 'private';
    };

    // Activity
    lastActive: Timestamp | Date;
    recentPlayers: string[]; // Player IDs (not User UIDs)
    mrtzBalance?: number; // Current MRTZ balance

    // Metadata
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

export interface Friend {
    id: string; // Same as friendUserId
    userId: string; // Parent user ID
    displayName: string;
    photoURL?: string;
    email?: string;
    playerId?: string; // Linked Player.id if known

    // Relationship
    status: 'active'; // MVP: only active (no pending/blocked yet)
    addedAt: Timestamp | Date;
    addedBy: string; // userId who initiated

    // Activity
    lastPlayedTogether?: string; // ISO date of last round
    roundsPlayedTogether: number;

    // Cached stats for display
    stats?: {
        averageScore: number;
        bestRound?: number;
    };
}

export interface StatsClaim {
    id: string; // Unique token (nanoid)
    roundId: string;
    playerId: string; // Player to be claimed
    playerName: string;
    playerEmail?: string;

    // Delivery
    deliveryMethod: 'email' | 'sms' | 'link';
    recipient: string; // email/phone

    // Ownership
    createdBy: string; // userId who sent
    inviterName: string;

    // Claim status
    claimedBy?: string; // userId who claimed
    claimedAt?: Timestamp | Date;
    expiresAt: Timestamp | Date; // 30 days

    // Round summary for preview
    roundSummary: {
        courseName: string;
        date: string;
        score: number; // Relative to par
        players: string[]; // Names
    };

    createdAt: Timestamp | Date;
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
    // Public/Wiki fields
    isPublic?: boolean;
    maintainerIds?: string[]; // UIDs of users who can edit this public course
    source?: 'manual' | 'udisc-import' | 'dgcoursereview-import';
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
    holeCount?: number; // Explicit total, usually 9, 18, 24, 27
    tags?: string[]; // e.g., ["Pro", "Short", "Winter", "Main"]
}

export interface HoleInfo {
    label?: string; // e.g., "8a" or "Top of the World"
    par: number;
    distance?: number; // in feet/meters
    notes?: string; // e.g., "OB right", "Mandatory left"

    // GPS & Navigation
    teeLocation?: { lat: number; lng: number };
    basketLocation?: { lat: number; lng: number };

    // Media
    images?: Array<{
        url: string;
        caption?: string;
        type: 'tee' | 'basket' | 'fairway' | 'map';
    }>;
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
