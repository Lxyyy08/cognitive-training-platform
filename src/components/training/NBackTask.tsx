import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, X, Play, ArrowUpCircle } from 'lucide-react';
import { db } from '../../firebase' 
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import type { UserData } from '../../types'
import { useSettings } from '../../contexts/SettingsContent'
import { CatBox, PawButton } from '../ui/CatThemedComponents';
import { useTranslation } from 'react-i18next';

const STIMULI = ['A', 'B', 'C', 'D', 'H', 'K', 'L', 'M']; 
const SEQUENCE_LENGTH = 15; 
const STIMULUS_DURATION = 2000; 

export interface SessionMetrics {
    group: 'G4'; level: number; accuracy: number; hits: number; misses: number; falseAlarms: number;
}

interface NBackTaskProps {
    onSessionComplete: (metrics: SessionMetrics) => void;
    level: number; user: UserData;
}

export const NBackTask: React.FC<NBackTaskProps> = ({ onSessionComplete, level, user }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'intro' | 'running' | 'results'>('intro');
    const [sequence, setSequence] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [feedback, setFeedback] = useState<'hit' | 'miss' | 'falseAlarm' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [levelUp, setLevelUp] = useState(false);

    const { stopSpeech, pauseBgm } = useSettings();
    const metrics = useRef({ hits: 0, misses: 0, falseAlarms: 0, possibleMatches: 0 });
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ----------------------------------------------------
    // 1. 生成序列 (修复版：重新计算真实匹配数)
    // ----------------------------------------------------
    const generateSequence = () => {
        const seq: string[] = [];
        
        // 步骤 A: 生成序列
        for (let i = 0; i < SEQUENCE_LENGTH; i++) {
            if (i >= level && Math.random() < 0.3) { 
                // 30% 概率强制匹配
                seq.push(seq[i - level]); 
            } else { 
                // 70% 概率随机生成 (这里可能会意外产生匹配，这就是BUG的源头)
                let char = STIMULI[Math.floor(Math.random() * STIMULI.length)]; 
                seq.push(char); 
            }
        }
        setSequence(seq); 

        // 步骤 B: 【核心修复】生成完后，重新扫描一遍，统计真实的匹配数量
        let actualMatches = 0;
        for (let i = level; i < SEQUENCE_LENGTH; i++) {
            if (seq[i] === seq[i - level]) {
                actualMatches++;
            }
        }
        
        metrics.current.possibleMatches = actualMatches;
        console.log(`[G4 Fix] Level: ${level}, Real Matches Counted: ${actualMatches}`);
    };

    const startTraining = () => { 
        metrics.current = { hits: 0, misses: 0, falseAlarms: 0, possibleMatches: 0 }; 
        generateSequence(); 
        
        setCurrentIndex(0); 
        setFeedback(null); 
        setLevelUp(false);
        setStatus('running'); 
    };
    
    // ----------------------------------------------------
    // 2. 交互逻辑
    // ----------------------------------------------------
    const isMatch = (index: number): boolean => { 
        if (index < level) return false; 
        return sequence[index] === sequence[index - level]; 
    };
    
    const handleMatchClick = () => { 
        if (status !== 'running' || feedback) return; 
        if (isMatch(currentIndex)) { 
            setFeedback('hit'); 
            metrics.current.hits++; 
        } else { 
            setFeedback('falseAlarm'); 
            metrics.current.falseAlarms++; 
        } 
    };

    useEffect(() => {
        if (status === 'running' && currentIndex < SEQUENCE_LENGTH) {
            timerRef.current = setTimeout(() => {
                // 如果是匹配项但用户没点，算 Miss
                if (isMatch(currentIndex) && !feedback) {
                    metrics.current.misses++;
                }
                
                const nextIndex = currentIndex + 1;
                if (nextIndex >= SEQUENCE_LENGTH) {
                    setStatus('results'); 
                } else { 
                    setCurrentIndex(nextIndex); 
                    setFeedback(null); 
                }
            }, STIMULUS_DURATION);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [status, currentIndex, sequence, feedback, level]);

    useLayoutEffect(() => {
        pauseBgm(); 
        return () => { stopSpeech(); };
    }, [pauseBgm, stopSpeech]);
    
    // ----------------------------------------------------
    // 3. 结算与升级核心逻辑
    // ----------------------------------------------------
    const finishSession = async () => {
        setIsSaving(true);
        
        // 计算准确率
        const possible = metrics.current.possibleMatches;
        const hits = metrics.current.hits;
        // 修复：如果全对了(hits == possible)，就是 100%，不会超过了
        const accuracy = possible > 0 ? Math.min(1, hits / possible) : 0;
        
        console.log(`[G4 Results] Accuracy: ${accuracy.toFixed(2)}, Hits: ${hits}/${possible}`);

        // 升级判定
        if (accuracy >= 0.8 && level < 3) {
            console.log("--> Requirements met! Attempting Level Up...");
            const newLevel = Number(level) + 1; 
            
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { 
                    'trainingLevels.g4_nback': newLevel 
                });
                console.log("--> Level Up Success: ", newLevel);
                setLevelUp(true); 
            } catch (e) { 
                console.error("--> Level Up FAILED:", e); 
            }
        }

        const finalMetrics: SessionMetrics = { 
            group: 'G4', 
            level, 
            accuracy, 
            hits: metrics.current.hits, 
            misses: metrics.current.misses, 
            falseAlarms: metrics.current.falseAlarms 
        };
        
        try { 
            await addDoc(collection(db, 'users', user.uid, 'nbackData'), { 
                ...finalMetrics, 
                userId: user.uid, 
                group: user.group, 
                submittedAt: serverTimestamp() 
            }); 
        } catch (e) { console.error("Save Data Error:", e) }
        
        setIsSaving(false); 
        onSessionComplete(finalMetrics); 
    };

    // ----------------------------------------------------
    // 4. 渲染 UI
    // ----------------------------------------------------
    if (status === 'intro') {
        return (
            <CatBox variant="lazy" title={t('g4.title', { level })} className="max-w-xl mx-auto">
                <div className="text-center space-y-8 py-8">
                    <Brain className="w-20 h-20 text-black mx-auto border-4 border-black rounded-full p-4 bg-gray-100" />
                    <div className="bg-black text-white p-4 rounded-lg font-mono text-sm mx-4">
                        <p className="text-amber-400 font-bold text-lg">{t('g4.rule', { level })}</p>
                        <p className="text-gray-400 mt-2 text-xs">
                            Current Level: {level} <br/>
                            Target: {'>'}80% Accuracy to Level Up
                        </p>
                    </div>
                    <PawButton onClick={startTraining} icon={Play}>{t('g4.btn_start')}</PawButton>
                </div>
            </CatBox>
        );
    }

    if (status === 'running') {
        return (
             <CatBox variant="lazy" title={`${t('g4.progress')}: ${currentIndex + 1} / ${SEQUENCE_LENGTH}`} className="max-w-xl mx-auto">
                <div className="flex flex-col items-center space-y-10 py-10">
                    <div className="w-56 h-56 border-8 border-black bg-white rounded-3xl flex items-center justify-center relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <AnimatePresence mode="wait">
                            <motion.span key={currentIndex} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black text-black">{sequence[currentIndex]}</motion.span>
                        </AnimatePresence>
                        <AnimatePresence>
                            {feedback && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">{feedback === 'hit' ? <Check className="w-32 h-32 text-green-600" /> : <X className="w-32 h-32 text-red-600" />}</motion.div>}
                        </AnimatePresence>
                    </div>
                    <PawButton onClick={handleMatchClick} className="w-full text-2xl py-6" variant="filled" disabled={!!feedback}>{t('g4.btn_match')}</PawButton>
                </div>
            </CatBox>
        );
    }
    
    if (status === 'results') {
        const accPercentage = metrics.current.possibleMatches > 0 
            ? Math.round((metrics.current.hits / metrics.current.possibleMatches) * 100) 
            : 0;
        // 显示修正：哪怕计算出来超过100（应该不会了），也只显示100
        const displayPercentage = Math.min(100, accPercentage);

        return (
            <CatBox variant="lazy" title={t('g4.title_game_over')} className="max-w-xl mx-auto">
                <div className="text-center space-y-8 py-6">
                    <div className="relative inline-block">
                        <h2 className="text-4xl font-black bg-black text-white px-4 py-2 transform -rotate-2">{t('g4.status_complete')}</h2>
                        {levelUp && (
                            <motion.div 
                                initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
                                className="absolute -top-12 -right-10 bg-yellow-400 text-black border-4 border-black px-3 py-1 rounded-full flex items-center shadow-lg font-bold whitespace-nowrap z-20"
                            >
                                <ArrowUpCircle className="w-5 h-5 mr-1" /> LEVEL UP!
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6 px-4">
                        <div className="p-4 border-4 border-black bg-white">
                            <p className="text-xs font-bold uppercase">{t('g4.stats_hits')}</p>
                            <p className="text-4xl font-black">{metrics.current.hits} <span className="text-sm text-gray-400">/ {metrics.current.possibleMatches}</span></p>
                        </div>
                        <div className={`p-4 border-4 border-black ${displayPercentage >= 80 ? 'bg-green-100' : 'bg-white'}`}>
                            <p className="text-xs font-bold uppercase">Accuracy</p>
                            <p className="text-4xl font-black">{displayPercentage}%</p>
                        </div>
                    </div>
                    
                    <PawButton onClick={finishSession} loading={isSaving}>
                        {isSaving ? "SAVING..." : t('g4.btn_save')}
                    </PawButton>
                </div>
            </CatBox>
        );
    }
    return null;
};