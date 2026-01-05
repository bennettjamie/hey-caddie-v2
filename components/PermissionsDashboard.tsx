
import React, { useState, useEffect } from 'react';

const PermissionsDashboard = () => {
    const [permissions, setPermissions] = useState({
        microphone: 'prompt', // 'granted', 'denied', 'prompt'
        geolocation: 'prompt'
    });

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        try {
            if (navigator.permissions) {
                const mic = await navigator.permissions.query({ name: 'microphone' as any });
                const geo = await navigator.permissions.query({ name: 'geolocation' });

                setPermissions({
                    microphone: mic.state,
                    geolocation: geo.state
                });

                mic.onchange = () => setPermissions(prev => ({ ...prev, microphone: mic.state }));
                geo.onchange = () => setPermissions(prev => ({ ...prev, geolocation: geo.state }));
            }
        } catch (e) {
            console.error("Permission API not fully supported", e);
        }
    };

    const requestMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop()); // Close immediately
            checkPermissions();
        } catch (e) {
            console.error("Mic denied", e);
            checkPermissions();
        }
    };

    const requestGeo = () => {
        navigator.geolocation.getCurrentPosition(
            () => checkPermissions(),
            () => checkPermissions()
        );
    };

    return (
        <div className="card" style={{ marginTop: '1rem', borderTop: '4px solid var(--info)' }}>
            <h3>🛠️ App Permissions</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                Hey Caddy needs these to work its magic.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Microphone */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎤 Microphone</span>
                        <StatusBadge state={permissions.microphone} />
                    </div>
                    {permissions.microphone !== 'granted' && (
                        <button
                            className="btn"
                            onClick={requestMic}
                            disabled={permissions.microphone === 'denied'}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minHeight: 'auto' }}
                        >
                            {permissions.microphone === 'denied' ? 'Unlock in Browser 🔒' : 'Enable'}
                        </button>
                    )}
                </div>

                {/* Location */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📍 Location</span>
                        <StatusBadge state={permissions.geolocation} />
                    </div>
                    {permissions.geolocation !== 'granted' && (
                        <button
                            className="btn"
                            onClick={requestGeo}
                            disabled={permissions.geolocation === 'denied'}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minHeight: 'auto' }}
                        >
                            {permissions.geolocation === 'denied' ? 'Unlock in Browser 🔒' : 'Enable'}
                        </button>
                    )}
                </div>
            </div>

            {(permissions.microphone === 'denied' || permissions.geolocation === 'denied') && (
                <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <strong>Help:</strong> Access is blocked. Click the 🔒 lock icon in your browser address bar (top left) to reset permissions, then refresh the page.
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ state }: { state: string }) => {
    let color = 'var(--text-light)';
    let icon = '❓';
    if (state === 'granted') { color = 'var(--success)'; icon = '✅'; }
    if (state === 'denied') { color = 'var(--danger)'; icon = '🚫'; }

    return (
        <span style={{ fontSize: '0.75rem', color: color, fontWeight: 'bold' }}>
            {icon} {state.toUpperCase()}
        </span>
    );
};

export default PermissionsDashboard;
