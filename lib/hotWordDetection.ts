/**
 * Hot Word Detection for "Hey Caddie"
 * Uses continuous listening with keyword filtering
 */

export interface HotWordState {
    isListeningForHotWord: boolean;
    hotWordDetected: boolean;
}

const HOT_WORD_VARIANTS = [
    'hey caddie',
    'hey caddy',
    'hey cadi',
    'hey cadi',
    'hey caddie',
    'hey caddy'
];

export function detectHotWord(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    
    // Check for exact matches or starts with
    for (const variant of HOT_WORD_VARIANTS) {
        if (lowerText === variant || lowerText.startsWith(variant + ' ')) {
            return true;
        }
    }
    
    // Also check if hot word appears anywhere in the text
    for (const variant of HOT_WORD_VARIANTS) {
        if (lowerText.includes(variant)) {
            // Make sure it's not part of another word
            const regex = new RegExp(`\\b${variant}\\b`, 'i');
            if (regex.test(lowerText)) {
                return true;
            }
        }
    }
    
    return false;
}

export function extractCommandAfterHotWord(text: string): string {
    const lowerText = text.toLowerCase();
    
    for (const variant of HOT_WORD_VARIANTS) {
        const index = lowerText.indexOf(variant);
        if (index !== -1) {
            const afterHotWord = text.substring(index + variant.length).trim();
            return afterHotWord;
        }
    }
    
    return text.trim();
}

