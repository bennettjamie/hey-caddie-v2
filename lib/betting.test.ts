import { describe, it, expect } from 'vitest';
import { calculateSkins, calculateNassau, calculateFundatory, FundatoryBet } from './betting';

describe('Betting Logic', () => {

    describe('calculateSkins', () => {
        it('should calculate basic skins correctly', () => {
            // 3 holes, P1 wins hole 1, P2 wins hole 2, Tie hole 3
            const scores = {
                1: { p1: 3, p2: 4 },
                2: { p1: 4, p2: 3 },
                3: { p1: 3, p2: 3 }
            };

            const results = calculateSkins(scores, [1, 2, 3], 1.0);

            expect(results).toHaveLength(3);

            // Hole 1: P1 wins
            expect(results[0].holeNumber).toBe(1);
            expect(results[0].winnerId).toBe('p1');
            expect(results[0].value).toBe(1.0);
            expect(results[0].isCarryOver).toBe(false);

            // Hole 2: P2 wins
            expect(results[1].holeNumber).toBe(2);
            expect(results[1].winnerId).toBe('p2');
            expect(results[1].value).toBe(1.0);

            // Hole 3: Tie (Carry over)
            expect(results[2].holeNumber).toBe(3);
            expect(results[2].winnerId).toBeNull();
            expect(results[2].value).toBe(1.0);
            expect(results[2].isCarryOver).toBe(true);
        });

        it('should handle carry overs correctly', () => {
            // Hole 1: Tie, Hole 2: Tie, Hole 3: P1 wins
            const scores = {
                1: { p1: 3, p2: 3 },
                2: { p1: 4, p2: 4 },
                3: { p1: 2, p2: 3 }
            };

            const results = calculateSkins(scores, [1, 2, 3], 1.0);

            // Hole 1: Tie, Value 1.0
            expect(results[0].isCarryOver).toBe(true);
            expect(results[0].value).toBe(1.0);

            // Hole 2: Tie, Value 2.0 (1.0 carry + 1.0 new)
            expect(results[1].isCarryOver).toBe(true);
            expect(results[1].value).toBe(2.0);

            // Hole 3: P1 Wins, Value 3.0 (2.0 carry + 1.0 new)
            expect(results[2].winnerId).toBe('p1');
            expect(results[2].value).toBe(3.0);
            expect(results[2].isCarryOver).toBe(false);
        });
    });

    describe('calculateNassau', () => {
        // Front 9, Back 9, Overall
        const players = ['p1', 'p2'];

        it('should calculate nassau winner correctly', () => {
            const scores: any = {};
            // P1 wins every hole
            for (let i = 1; i <= 18; i++) {
                scores[i] = { p1: 3, p2: 4 };
            }

            const result = calculateNassau(scores, players);

            expect(result.front9WinnerId).toBe('p1');
            expect(result.back9WinnerId).toBe('p1');
            expect(result.overallWinnerId).toBe('p1');
            expect(result.front9Score['p1']).toBe(27); // 9 * 3
            expect(result.front9Score['p2']).toBe(36); // 9 * 4
        });

        it('should split nassau correctly', () => {
            const scores: any = {};
            // Front 9: P1 wins
            for (let i = 1; i <= 9; i++) {
                scores[i] = { p1: 3, p2: 4 };
            }
            // Back 9: P2 wins big
            for (let i = 10; i <= 18; i++) {
                scores[i] = { p1: 5, p2: 3 };
            }

            const result = calculateNassau(scores, players);

            expect(result.front9WinnerId).toBe('p1');
            expect(result.back9WinnerId).toBe('p2');
            // Overall: Front(27) + Back(45) = 72 for P1
            // Back: Front(36) + Back(27) = 63 for P2
            expect(result.overallWinnerId).toBe('p2');
        });
    });

    describe('calculateFundatory', () => {
        it('should calculate winnings correctly', () => {
            const bets: FundatoryBet[] = [
                {
                    id: '1',
                    challengerId: 'p1',
                    targetId: 'p2', // p2 needs to hit tree
                    amount: 5,
                    gapDescription: 'Hit tree',
                    status: 'success', // p2 failed requirement (or success means the EVENT happened? Logic check needed)
                    holeNumber: 1
                },
                {
                    id: '2',
                    challengerId: 'p1',
                    targetId: 'p2',
                    amount: 10,
                    gapDescription: 'Miss putt',
                    status: 'fail', // Event didn't happen
                    holeNumber: 2
                }
            ];

            // Logic assumption based on code reading:
            // status == 'success' => Target DOES pays Challenger? Or Challenger pays Target?
            // Let's check implementation again:
            // if (bet.status === 'success') { winnings[bet.targetId] += amount; winnings[bet.challengerId] -= amount; }
            // Ah! 'success' means TARGET WON (succeeded in the challenge).
            // So Target GETS money.
            // if 'fail', Target LOST. Target PAYS Challenger.

            const winnings = calculateFundatory(bets);

            // Bet 1: Success -> p2 gets 5, p1 loses 5
            // Bet 2: Fail -> p2 loses 10, p1 gets 10
            // Total p1: -5 + 10 = 5
            // Total p2: 5 - 10 = -5

            expect(winnings['p1']).toBe(5);
            expect(winnings['p2']).toBe(-5);
        });
    });
});
