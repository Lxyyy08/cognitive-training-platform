import React, { useState, useLayoutEffect } from 'react';
import { Lightbulb, Brain, Zap, Check } from 'lucide-react';
import { VisualizationTrainingTask, type SessionMetrics as G1Metrics } from './VisualizationTrainingTask';
import { AttentionTrainingTask, type SessionMetrics as G2Metrics } from './AttentionTrainingTask'; 
import { db } from '../../firebase' 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { UserData } from '../../types'
import { useSettings } from '../../contexts/SettingsContent'
import { useTranslation } from 'react-i18next';
import { CatBox, PawButton } from '../ui/CatThemedComponents';

export interface CombinedSessionMetrics {
    group: 'G3'; 
    totalDuration: number; 
    g1BlocksCompleted: number; 
    attAccuracy: number; 
    attGazeStability: number; 
    level: number;
}

interface MixedTrainingTaskProps {
    onOverallComplete: (metrics: CombinedSessionMetrics) => void;
    level: number; 
    
    targetImageUrls: string[]; 
    distractorImageUrls: string[]; 
    user: UserData; 
}

const G3_VIZ_SETTINGS ={
    totalBlocks: 2,
    observeDuration: 25,
    rehearseDuration: 40
};

const G3_ATT_SETTINGS ={
    totalSets: 2,
    durationPerSet: 60,
    restDuration: 15
};

export const MixedTrainingTask: React.FC<MixedTrainingTaskProps> = ({ 
    onOverallComplete, 
    level, 
    targetImageUrls, 
    distractorImageUrls, 
    user 
}) => {
    const { t } = useTranslation();
    const [phase, setPhase] = useState<'intro' | 'viz' | 'att' | 'complete'>('intro');
    const [vizMetrics, setVizMetrics] = useState<G1Metrics | null>(null);
    const [attMetrics, setAttMetrics] = useState<G2Metrics | null>(null);
    const { stopSpeech, pauseBgm } = useSettings();

    const startMixedTraining = () => setPhase('viz');
    
    const handleVizComplete = (metrics: G1Metrics) => { 
        setVizMetrics(metrics); 
        setPhase('att'); 
    };
    
    const handleAttComplete = (metrics: G2Metrics) => { 
        setAttMetrics(metrics); 
        setPhase('complete'); 
    };

    const finalizeSession = async () => {
        if (!vizMetrics || !attMetrics) return;
        
        const combinedMetrics: CombinedSessionMetrics = {
            group: 'G3',
            totalDuration: vizMetrics.taskDuration + attMetrics.taskDuration,
            g1BlocksCompleted: vizMetrics.blocksCompleted,
            attAccuracy: attMetrics.accuracy,
            attGazeStability: attMetrics.gazeStability,
            level: attMetrics.level,
        };

        try { 
            await addDoc(collection(db, 'users', user.uid, 'g3_sessions'), { 
                ...combinedMetrics, 
                userId: user.uid, 
                group: user.group, 
                submittedAt: serverTimestamp() 
            }); 
        } catch (error) { 
            console.error("G3 Save Error:", error); 
        }
        
        onOverallComplete(combinedMetrics);
    };

    useLayoutEffect(() => {
        pauseBgm(); 
        return () => {
            stopSpeech();
        };
    }, [pauseBgm, stopSpeech]);

    if (phase === 'intro') {
        return (
            <CatBox variant="backward" title={t('g3.title')} className="max-w-2xl mx-auto">
                <div className="text-center space-y-10 py-8 px-4">
                    <div className="relative inline-block">
                        <Lightbulb className="w-20 h-20 text-black mx-auto" />
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-black rounded-full animate-ping"></div>
                    </div>
                    <div className="flex justify-center gap-6">
                        <div className="p-4 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                            <Brain className="w-6 h-6 mb-2"/> 
                            <span className="font-bold text-sm">{t('g3.phase_1')}</span>
                        </div>
                        <div className="h-0.5 w-8 bg-black self-center"></div>
                        <div className="p-4 border-4 border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] flex flex-col items-center">
                            <Zap className="w-6 h-6 mb-2"/> 
                            <span className="font-bold text-sm">{t('g3.phase_2')}</span>
                        </div>
                    </div>
                    <PawButton onClick={startMixedTraining}>{t('g3.btn_start')}</PawButton>
                </div>
            </CatBox>
        );
    }

    if (phase === 'viz') {
        return (
            <VisualizationTrainingTask
                onSessionComplete={handleVizComplete}
                
                targetImageUrls={targetImageUrls} 
                user={user}
                customSettings={G3_VIZ_SETTINGS}
            />
        );
    }

    if (phase === 'att') {
        return (
            <AttentionTrainingTask
                onSessionComplete={handleAttComplete}
                level={level}
                
                targetImageUrl={targetImageUrls[0] || ""} 
                distractorImageUrls={distractorImageUrls}
                user={user}
                customSettings={G3_ATT_SETTINGS}
            />
        );
    }

    if (phase === 'complete') return (
        <CatBox variant="backward" title={t('g3.title_complete')} className="max-w-2xl mx-auto">
            <div className="text-center space-y-8 py-6">
                <Check className="w-20 h-20 text-black mx-auto" />
                <h2 className="text-3xl font-black">{t('g3.all_systems_go')}</h2>
                <PawButton onClick={finalizeSession} variant="outline">{t('g3.btn_upload')}</PawButton>
            </div>
        </CatBox>
    );
    
    return null;
};
