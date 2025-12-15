'use client';

interface TeeOrderDisplayProps {
    players: Array<{ id: string; name: string }>;
    teeOrder: string[];
    currentTeeIndex: number;
}

export default function TeeOrderDisplay({ players, teeOrder, currentTeeIndex }: TeeOrderDisplayProps) {
    // Add comprehensive safety checks
    if (!players || !Array.isArray(players) || players.length === 0) {
        return null;
    }
    
    if (!teeOrder || !Array.isArray(teeOrder) || teeOrder.length === 0) {
        return null;
    }
    
    if (currentTeeIndex < 0 || currentTeeIndex >= teeOrder.length) {
        return null;
    }

    const getPlayerById = (id: string) => {
        return players.find(p => p.id === id);
    };

    return (
        <div style={{
            padding: '0.75rem',
            background: 'rgba(0, 242, 96, 0.1)',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid var(--primary)'
        }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text)' }}>
                🏌️ Tee Order
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {teeOrder.map((playerId, index) => {
                    const player = getPlayerById(playerId);
                    if (!player) return null;
                    
                    const isCurrent = index === currentTeeIndex;
                    
                    return (
                        <div
                            key={playerId}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                backgroundColor: isCurrent ? 'var(--primary)' : 'rgba(0, 0, 0, 0.05)',
                                color: isCurrent ? 'white' : 'var(--text)',
                                fontWeight: isCurrent ? 'bold' : 'normal',
                                fontSize: '0.875rem',
                                border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                                position: 'relative'
                            }}
                        >
                            {player.name}
                            {isCurrent && (
                                <span style={{ marginLeft: '0.25rem' }}>👈</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

