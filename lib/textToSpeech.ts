/**
 * Text-to-Speech utilities using Web Speech Synthesis API
 */

let synth: SpeechSynthesis | null = null;

if (typeof window !== 'undefined') {
    synth = window.speechSynthesis;
}

export interface TTSOptions {
    rate?: number; // 0.1 to 10, default 1
    pitch?: number; // 0 to 2, default 1
    volume?: number; // 0 to 1, default 1
    voice?: SpeechSynthesisVoice | null;
    lang?: string; // default 'en-US'
}

export function speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!synth) {
            console.warn('Speech synthesis not available');
            resolve();
            return;
        }

        // Cancel any ongoing speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;
        utterance.lang = options.lang ?? 'en-US';

        if (options.voice) {
            utterance.voice = options.voice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            reject(event);
        };

        synth.speak(utterance);
    });
}

/**
 * Speak text with personality-specific TTS parameters
 * @param text - Text to speak
 * @param mode - Optional personality mode (defaults to current mode)
 * @param options - Optional additional TTS options (will override personality settings)
 */
export async function speakWithPersonality(
    text: string,
    mode?: import('./voicePersonality').PersonalityMode,
    options: TTSOptions = {}
): Promise<void> {
    const { PERSONALITY_PRESETS, getCurrentPersonalityMode } = await import('./voicePersonality');
    const personalityMode = mode || getCurrentPersonalityMode();
    const config = PERSONALITY_PRESETS[personalityMode];

    // Merge personality config with any override options
    const ttsOptions: TTSOptions = {
        rate: options.rate ?? config.rate,
        pitch: options.pitch ?? config.pitch,
        volume: options.volume ?? config.volume,
        voice: options.voice,
        lang: options.lang,
    };

    return speak(text, ttsOptions);
}

export function stopSpeaking(): void {
    if (synth) {
        synth.cancel();
    }
}

export function isSpeaking(): boolean {
    if (!synth) return false;
    return synth.speaking;
}

export function getVoices(): SpeechSynthesisVoice[] {
    if (!synth) return [];
    return synth.getVoices();
}

export function getDefaultVoice(): SpeechSynthesisVoice | null {
    const voices = getVoices();
    // Prefer Google US English or Microsoft Natural voices
    const preferred = voices.find(
        (v) => (v.name.includes('Google US English') || v.name.includes('Microsoft Zira') || v.name.includes('Natural')) && v.lang.startsWith('en')
    );
    return preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
}

// Load voices when available
if (typeof window !== 'undefined') {
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            // Voices loaded
        };
    }
}






