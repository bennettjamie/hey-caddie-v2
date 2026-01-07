'use client';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999, // Very high z-index
                padding: '1rem'
            }}
            onClick={onCancel}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    backgroundColor: '#1e1e1e',
                    border: '1px solid var(--border)',
                    textAlign: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{title}</h3>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)', lineHeight: '1.5' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="btn"
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            backgroundColor: isDestructive ? 'var(--danger)' : 'var(--primary)',
                            color: '#fff'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
