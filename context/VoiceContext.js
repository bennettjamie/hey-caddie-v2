'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const VoiceContext = createContext();

export function VoiceProvider({ children }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            setIsSupported(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                }
                if (currentTranscript) {
                    setTranscript(currentTranscript);
                    console.log('Voice Command:', currentTranscript);
                    // TODO: Parse command here
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                }
            };

            recognitionInstance.onend = () => {
                if (isListening) {
                    // Restart if it was supposed to be listening (unless stopped manually)
                    try {
                        recognitionInstance.start();
                    } catch (e) {
                        console.log("Failed to restart recognition", e);
                    }
                }
            };

            setRecognition(recognitionInstance);
        }
    }, [isListening]);

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                recognition.start();
                setIsListening(true);
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
            setIsListening(false);
        }
    }, [recognition, isListening]);

    return (
        <VoiceContext.Provider value={{ isListening, transcript, startListening, stopListening, isSupported }}>
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoice() {
    return useContext(VoiceContext);
}
