'use client';

/**
 * Sound Effect Manager
 * Handles playing sound effects for game events.
 * Expects audio files to be in the public/sounds/ directory.
 */

const SOUNDS = {
    turkey: '/sounds/Turkey_gobble.mp3',
    skins: '/sounds/Cash_register.mp3',
    birdie: '/sounds/Birdie_chirp.mp3',
    hole_in_one: '/sounds/cheering.mp3',
    snowman: '/sounds/wind.mp3'
};

class AudioController {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== 'undefined') {
            this.preloadSounds();
        }
    }

    private preloadSounds() {
        Object.entries(SOUNDS).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.volume = 0.7;
            this.sounds.set(key, audio);
        });
    }

    public play(effect: keyof typeof SOUNDS) {
        if (!this.enabled || typeof window === 'undefined') return;

        const sound = this.sounds.get(effect);
        if (sound) {
            // Reset and play
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.warn(`Failed to play sound '${effect}':`, err);
            });
        } else {
            // Try dynamic load if not preloaded
            const path = SOUNDS[effect];
            if (path) {
                const audio = new Audio(path);
                this.sounds.set(effect, audio);
                audio.play().catch(e => console.warn(e));
            }
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

// Singleton instance
export const audioManager = new AudioController();

export function playSound(effect: keyof typeof SOUNDS) {
    audioManager.play(effect);
}
