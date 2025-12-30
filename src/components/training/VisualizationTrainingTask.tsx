import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Eye, Check, EyeOff, Play, Mic, Wind, Sparkles } from 'lucide-react';
import { db } from '../../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { UserData } from '../../types'
import { useSettings } from '../../contexts/SettingsContent'
import { CatBox, PawButton } from '../ui/CatThemedComponents'; 
import { useTranslation } from 'react-i18next';

export interface SessionMetrics {
    group: 'G1';
    taskDuration: number;
    blocksCompleted: number;
}

interface VisualizationTrainingTaskProps {
    onSessionComplete: (metrics: SessionMetrics) => void;
    targetImageUrls: string[]; 
    user: UserData;
    customSettings? : {
        totalBlocks: number;
        observeDuration: number;
        rehearseDuration: number;
    }
}

export const VisualizationTrainingTask: React.FC<VisualizationTrainingTaskProps> = ({ 
    onSessionComplete, 
    targetImageUrls, 
    user,
    customSettings
}) => {
    const { t } = useTranslation();
    const { speak, stopSpeech, pauseBgm } = useSettings();

    const [status, setStatus] = useState<'intro' | 'ready' | 'observe' | 'rehearse' | 'results'>('intro');
    const [currentBlock, setCurrentBlock] = useState(1);
    const [timerValue, setTimerValue] = useState(999); 
    
   
    const currentImageUrl = targetImageUrls.length > 0 
        ? targetImageUrls[(currentBlock - 1) % targetImageUrls.length] 
        : ""; 

    // --- Refs ---
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);         
    const wakeUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);  
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); 
    const audioLockRef = useRef<{ status: string; block: number }>({ status: '', block: 0 });

    const TOTAL_BLOCKS = customSettings?.totalBlocks ?? 3;
    const OBSERVE_DURATION = customSettings?.observeDuration ?? 30;
    const REHEARSE_DURATION = customSettings?.rehearseDuration ?? 60;
    const BLOCK_DURATION = OBSERVE_DURATION + REHEARSE_DURATION;

    // --- Cleanup Helpers ---
    
    const cleanupTimers = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (wakeUpTimerRef.current) {
            clearTimeout(wakeUpTimerRef.current);
            wakeUpTimerRef.current = null;
        }
        
        if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
        }
    }, []);

    
    const safeSpeak = useCallback((text: string, delay: number = 0) => {
        
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        
       
        stopSpeech();

       
        if (delay === 0) {
            speak(text);
        } else {
            speechTimeoutRef.current = setTimeout(() => {
                speak(text);
                speechTimeoutRef.current = null; 
            }, delay);
        }
    }, [speak, stopSpeech]);

    // --- Effects ---

 
    useEffect(() => {
        return () => {
            cleanupTimers();
            stopSpeech();
        };
    }, [cleanupTimers, stopSpeech]);

    
    useLayoutEffect(() => {
        pauseBgm(); 
        return () => {
            stopSpeech();
        };
    }, [pauseBgm, stopSpeech]);


    useEffect(() => {
       
        const isSameState = 
            status === audioLockRef.current.status && 
            ((status !== 'observe' && status !== 'rehearse') || currentBlock === audioLockRef.current.block);

        if (isSameState) return;

        
        cleanupTimers();
        audioLockRef.current = { status, block: currentBlock };

       
        switch (status) {
            case 'intro':
                
                safeSpeak(t('voice_guide.g1.intro'), 300);
                break;

            case 'ready':
               
                safeSpeak(t('voice_guide.g1.intro'), 300); 
                break;

            case 'observe':
                const obsText = currentBlock === 1 ? t('voice_guide.g1.observe_start') : t('voice_guide.g1.observe_mid');
                safeSpeak(obsText, 200);

                
                timerRef.current = setInterval(() => {
                    setTimerValue((prev) => {
                        if (prev <= 1) {
                            
                            if(timerRef.current) clearInterval(timerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                break;

            case 'rehearse':
                const rehText = currentBlock === 1 ? t('voice_guide.g1.rehearse_start') : t('voice_guide.g1.rehearse_deep');
                safeSpeak(rehText, 200);

             
                const wakeUpTime = (REHEARSE_DURATION - 15) * 1000;
                if (wakeUpTime > 0) {
                    wakeUpTimerRef.current = setTimeout(() => {
                       
                        speak(t('voice_guide.g1.end')); 
                    }, wakeUpTime);
                }

           
                timerRef.current = setInterval(() => {
                    setTimerValue((prev) => {
                        if (prev <= 1) {
                            if(timerRef.current) clearInterval(timerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                break;

            case 'results':
                safeSpeak(t('voice_guide.g1.end'), 200);
                break;
        }

    }, [status, currentBlock, t, cleanupTimers, safeSpeak, speak, REHEARSE_DURATION]); 
  

    
    useEffect(() => {
        if (timerValue === 0) {
            if (status === 'observe') {
                setTimerValue(REHEARSE_DURATION);
                setStatus('rehearse');
            } else if (status === 'rehearse') {
                if (currentBlock < TOTAL_BLOCKS) {
                    setCurrentBlock(prev => prev + 1);
                    setTimerValue(OBSERVE_DURATION);
                    setStatus('observe');
                } else {
                    stopSpeech();
                    setStatus('results');
                }
            }
        }
    }, [timerValue, status, currentBlock, TOTAL_BLOCKS, REHEARSE_DURATION, OBSERVE_DURATION, stopSpeech]);


    // --- Handlers ---

    const handleEnterReady = () => setStatus('ready');
    
    const startTraining = () => {
        setCurrentBlock(1);
        setTimerValue(OBSERVE_DURATION);
        setStatus('observe');
    };

    const finishSession = async () => {
        stopSpeech();
        const metrics: SessionMetrics = {
            group: 'G1',
            taskDuration: TOTAL_BLOCKS * BLOCK_DURATION,
            blocksCompleted: TOTAL_BLOCKS,
        };
        try {
            await addDoc(collection(db, 'users', user.uid, 'g1_sessions'), {
                ...metrics, userId: user.uid, group: user.group, submittedAt: serverTimestamp()
            });
        } catch (error) { console.error("G1 Error:", error); }
        
        onSessionComplete(metrics);
        setStatus('intro');
    };

    // --- RENDER ---
    if (status === 'intro') {
        return (
            <CatBox variant="walking" title={t('g1.title_intro')} className="max-w-4xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-8 py-10">
                    <div className="p-6 border-4 border-black rounded-full bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Sparkles className="w-20 h-20 text-black" />
                    </div>
                    <div className="space-y-6 max-w-2xl px-4">
                        <h2 className="text-3xl font-black uppercase font-arcade">{t('g1.title_awakening')}</h2>
                        <div className="text-gray-700 font-sans text-lg leading-relaxed space-y-4 text-left bg-gray-50 p-6 border-2 border-black rounded-lg">
                            <p className="font-bold text-xl text-black mb-2">{t('g1.mission_label')}</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>{t('g1.mission_1')}</li>
                                <li>{t('g1.mission_2')}</li>
                            </ul>
                            <p className="mt-4 text-black font-bold text-center border-t-2 border-dashed border-gray-300 pt-4">
                                {t('g1.voice_note')}
                            </p>
                        </div>
                    </div>
                    <PawButton onClick={handleEnterReady} icon={Play} className="scale-110">
                        {t('g1.btn_prep')}
                    </PawButton>
                </div>
            </CatBox>
        );
    }

    if (status === 'ready') {
        return (
            <CatBox variant="walking" title={t('g1.title_check')} className="max-w-4xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-10 py-12">
                    <div className="relative">
                        <div className="absolute -inset-6 bg-black/5 rounded-full animate-pulse"></div>
                        <Mic className="w-24 h-24 text-black relative z-10" />
                    </div>
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <h2 className="text-4xl font-black font-arcade uppercase">{t('g1.ready_title')}</h2>
                        <div className="bg-white border-4 border-black p-6 text-left space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex items-start">
                                <Wind className="w-6 h-6 mr-3 mt-1 text-black" />
                                <div>
                                    <h3 className="font-bold text-lg font-arcade">{t('g1.step_1_title')}</h3>
                                    <p className="text-gray-600 font-sans">{t('g1.step_1_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Eye className="w-6 h-6 mr-3 mt-1 text-black" />
                                <div>
                                    <h3 className="font-bold text-lg font-arcade">{t('g1.step_2_title')}</h3>
                                    <p className="text-gray-600 font-sans">{t('g1.step_2_desc')}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-lg text-gray-500 font-medium font-sans italic animate-pulse">
                            {t('g1.voice_standby')}
                        </p>
                    </div>
                    <div className="pt-4">
                        <PawButton onClick={startTraining} variant="filled" className="scale-125 origin-center shadow-xl">
                            {t('g1.btn_start')}
                        </PawButton>
                    </div>
                </div>
            </CatBox>
        );
    }

    if (status === 'observe') {
        return (
            <CatBox variant="walking" title={t('g1.title_observe', { current: currentBlock, total: TOTAL_BLOCKS })} className="max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-8 py-4">
                    <div className="flex justify-between w-full px-8 border-b-4 border-dashed border-gray-300 pb-4 font-mono font-bold text-2xl">
                         <span className="flex items-center"><Eye className="w-8 h-8 mr-3"/>{t('g1.label_observe')}</span>
                         <span className="text-6xl font-arcade">{timerValue}s</span>
                    </div>
                    <div className="p-4 border-8 border-black bg-white rotate-1 hover:rotate-0 transition-transform duration-500 shadow-xl">
                        {currentImageUrl ? (
                            <img src={currentImageUrl} alt={`Target ${currentBlock}`} className="w-[512px] h-[512px] object-contain" />
                        ) : (
                            <div className="w-[512px] h-[512px] flex items-center justify-center bg-gray-200 text-gray-500">
                                Loading or No Image...
                            </div>
                        )}
                    </div>
                    <p className="text-xl font-bold bg-black text-white px-6 py-2 font-arcade animate-pulse">
                        {t('g1.hint_observe')}
                    </p>
                </div>
            </CatBox>
        );
    }
    
    if (status === 'rehearse') {
        return (
            <CatBox variant="walking" title={t('g1.title_rehearse', { current: currentBlock, total: TOTAL_BLOCKS })} className="max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-10 py-12 bg-black text-white rounded-lg px-4 border-8 border-black mx-4">
                    <div className="flex justify-between w-full px-4 border-b-2 border-gray-700 pb-4 font-mono font-bold text-2xl">
                            <span className="flex items-center"><EyeOff className="w-8 h-8 mr-3"/>{t('g1.label_rehearse')}</span>
                            <span className="text-6xl font-arcade text-yellow-400">{timerValue}s</span>
                    </div>
                    <EyeOff className="w-48 h-48 text-gray-300 opacity-80" />
                    <div className="text-center space-y-6">
                        <p className="text-5xl font-black uppercase font-arcade tracking-widest">{t('g1.close_eyes_title')}</p>
                        <div className="inline-block border-2 border-yellow-400 px-4 py-2 rounded">
                            <p className="text-2xl text-yellow-400 font-sans font-bold">
                                {t('g1.close_eyes_time')}
                            </p>
                        </div>
                        <p className="text-xl text-gray-400 font-sans mt-2 max-w-2xl mx-auto">
                            {t('g1.rehearse_desc')}
                        </p>
                    </div>
                </div>
            </CatBox>
        );
    }
    
    if (status === 'results') {
        return (
            <CatBox variant="walking" title={t('g1.title_complete')} className="max-w-4xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-8 py-10">
                    <Check className="w-24 h-24 text-white bg-black p-6 rounded-full border-4 border-black shadow-xl" />
                    <h2 className="text-4xl font-black uppercase font-arcade">{t('g1.mission_accomplished')}</h2>
                    <PawButton onClick={finishSession} variant="outline">
                        {t('g1.btn_save')}
                    </PawButton>
                </div>
            </CatBox>
        );
    }

    return null;
};
