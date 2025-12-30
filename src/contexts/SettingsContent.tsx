import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface SettingsContextType {
    
    language: string;
    setLanguage: (lang: string) => void;
    volume: number; 
    setVolume: (vol: number) => void;
    speak: (text: string) => void;
    stopSpeech: () => void;

    
    bgmVolume: number;
    setBgmVolume: (vol: number) => void;
    isBgmPlaying: boolean;
    toggleBgm: () => void;
    pauseBgm: () => void; 
    playBgm: () => void;  
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // TTS 
    const [language, setLanguage] = useState('zh-CN');
    const [volume, setVolume] = useState<number>(1.0); 
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    // --- BGM  ---
    const [bgmVolume, setBgmVolume] = useState<number>(0.3); 
    const [isBgmPlaying, setIsBgmPlaying] = useState(false); 
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    // --- 1. inital BGM ---
    useEffect(() => {
        bgmRef.current = new Audio('/bgm.mp3'); 
        bgmRef.current.loop = true;
        bgmRef.current.volume = bgmVolume;
        
        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current = null;
            }
        };
    }, []);

    // --- 2. monitor volumn and on/off change ---
    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.volume = bgmVolume;
            if (isBgmPlaying) {
                
                bgmRef.current.play().catch(e => console.log("等待用户交互以播放音乐:", e));
            } else {
                bgmRef.current.pause();
            }
        }
    }, [bgmVolume, isBgmPlaying]);

    const toggleBgm = () => setIsBgmPlaying(prev => !prev);
    const pauseBgm = () => setIsBgmPlaying(false);
    const playBgm = () => setIsBgmPlaying(true);

   
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const getBestVoice = (langCode: string) => {
        const langVoices = voices.filter(v => v.lang.startsWith(langCode.split('-')[0]));
        if (langVoices.length === 0) return null;
        const keywords = ['Google', 'Microsoft', 'Natural', 'Enhanced', 'Siri'];
        for (const keyword of keywords) {
            const best = langVoices.find(v => v.name.includes(keyword));
            if (best) return best;
        }
        return langVoices[0];
    };

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = volume; 
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        if (voices.length > 0) {
            const isChineseText = /[\u4e00-\u9fa5]/.test(text);
            const targetLang = isChineseText ? 'zh-CN' : 'en-US';
            const bestVoice = getBestVoice(targetLang);
            if (bestVoice) {
                utterance.voice = bestVoice;
                utterance.lang = bestVoice.lang;
            }
        }
        window.speechSynthesis.speak(utterance);
    }, [volume, voices]);

    const stopSpeech = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    return (
        <SettingsContext.Provider value={{ 
            language, setLanguage, 
            volume, setVolume, 
            speak, stopSpeech,
           
            bgmVolume, setBgmVolume,
            isBgmPlaying, toggleBgm, pauseBgm, playBgm
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings Error");
    return context;
};
