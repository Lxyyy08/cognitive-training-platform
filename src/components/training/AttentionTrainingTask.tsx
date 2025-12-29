import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Zap, Loader2, BarChart3, CheckCircle, Play, Target, MousePointer2, ScanEye, Coffee, Lock, Sparkles, Wind, Camera, Fingerprint } from 'lucide-react';
import { useWebGazer } from '../../Hook/useWebGazer'; 
import { db } from '../../firebase' 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { UserData } from '../../types'
import { CatBox, PawButton } from '../ui/CatThemedComponents';
import { useSettings } from '../../contexts/SettingsContent'
import { useTranslation } from 'react-i18next';

// =========================================================
// ⏱️ 训练配置
// =========================================================
const TOTAL_SETS = 3;           
const DURATION_PER_SET = 90;    
const REST_DURATION = 15;       
const HINT_DURATION = 3;        

const TARGET_SIZE = 120; 

const TASK_BOUNDS = { width: 800, height: 500 };
const GAZE_HIT_TOLERANCE = 150; 
const CALIBRATION_POINTS_CONFIG = [
    { x: 15, y: 15 }, { x: 50, y: 15 }, { x: 85, y: 15 },
    { x: 15, y: 50 }, { x: 50, y: 50 }, { x: 85, y: 50 },
    { x: 15, y: 85 }, { x: 50, y: 85 }, { x: 85, y: 85 }
];

const DIFFICULTY_LEVELS: { [key: number]: { numDistractors: number; speed: number } } = {
    1: { numDistractors: 5, speed: 3.3 }, 
    2: { numDistractors: 7, speed: 4.8 }, 
    3: { numDistractors: 9, speed: 6.8 }, 
};

const SMOOTHING_WINDOW_SIZE = 4;  
const MOVEMENT_DEADZONE = 3;      
const LERP_FACTOR = 0.35;         

const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

export interface SessionMetrics {
    group: 'G2';
    taskDuration: number;
    accuracy: number;
    gazeStability: number;
    level: number;
    setsCompleted: number;
}

interface AttentionTrainingTaskProps {
    onSessionComplete: (metrics: SessionMetrics) => void;
    level: number;
    targetImageUrl: string;
    distractorImageUrls: string[];
    user: UserData; 

    customSettings? : {
        totalSets: number;
        durationPerSet: number;
        restDuration : number;
    }
}

interface MovingObject {
    id: string; 
    url: string; 
    isTarget: boolean; 
    x: number; 
    y: number; 
    vx: number; 
    vy: number;
}

interface ClickRipple {
    id: number; x: number; y: number;
}

export const AttentionTrainingTask: React.FC<AttentionTrainingTaskProps> = ({ 
    onSessionComplete, level, targetImageUrl, distractorImageUrls, user , customSettings
}) => {
    const { t } = useTranslation();

    const TOTAL_SETS_ACTUAL = customSettings?.totalSets ?? TOTAL_SETS;
    const DURATION_PER_SET_ACTUAL = customSettings?.durationPerSet ?? DURATION_PER_SET;
    const REST_DURATION_ACTUAL = customSettings?.restDuration ?? REST_DURATION;
    
    const [status, setStatus] = useState<'intro' | 'initializing' | 'cameraCheck' | 'calibrating' | 'calibrationSuccess' | 'running' | 'rest' | 'results'>('intro');
    
    const {  stopSpeech, pauseBgm } = useSettings(); 
    
    const [secondsLeft, setSecondsLeft] = useState(DURATION_PER_SET_ACTUAL);
    const [restSecondsLeft, setRestSecondsLeft] = useState(0); 
    const [checkSecondsLeft, setCheckSecondsLeft] = useState(3); 
    
    const [isTargetLocked, setIsTargetLocked] = useState(false);
    const [isHintActive, setIsHintActive] = useState(false);

    const [currentSet, setCurrentSet] = useState(1);
    const [catFact, setCatFact] = useState(""); 
    
    const [movingObjects, setMovingObjects] = useState<MovingObject[]>([]);
    const [calibIndex, setCalibIndex] = useState(0);
    const [isClicking, setIsClicking] = useState(false);
    const [clickRipples, setClickRipples] = useState<ClickRipple[]>([]);

    // Refs
    const movingObjectsRef = useRef<MovingObject[]>([]);
    const totalMetricsRef = useRef({ 
        totalGazePoints: [] as { x: number, y: number }[], 
        totalGazeOnTargetDuration: 0, 
        accumulatedDuration: 0 
    });

    useLayoutEffect(() => {
        pauseBgm(); 
        return () => {
            stopSpeech();
        };
    }, [pauseBgm, stopSpeech]);
    
    const redDotRef = useRef<HTMLDivElement>(null);
    const currentGazeRef = useRef<{x: number, y: number} | null>(null); 
    const gazeHistoryRef = useRef<{x: number, y: number}[]>([]);        
    const smoothedGazeRef = useRef<{x: number, y: number}>({ x: 0, y: 0 }); 
    const isHintActiveRef = useRef(false);

    const { 
        isReady, permissionError, 
        initWebGazer, startCalibration, addCalibrationPoint, endCalibration, 
        startTracking, stopTracking, shutdown, setVideoLayout
    } = useWebGazer();
    
    const taskAreaRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);
    
    // 【关键修复】确保只在组件彻底卸载时才关闭摄像头
    useEffect(() => {
        // 这个 cleanup 函数只会在组件被销毁（如切到别的页面）时运行
        return () => {
            // 1. 停止动画帧
            if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            
            // 2. 停止 WebGazer
            stopTracking();
            shutdown();

            // 3. 强制关闭摄像头硬件连接
            const videoElement = document.getElementById('webgazerVideoFeed') as HTMLVideoElement;
            if (videoElement && videoElement.srcObject) {
                const stream = videoElement.srcObject as MediaStream;
                const tracks = stream.getTracks();
                
                tracks.forEach(track => {
                    track.stop(); // 这行代码会让摄像头指示灯熄灭
                });
                
                videoElement.srcObject = null;
            }

            // 隐藏红点
            if (redDotRef.current) {
                redDotRef.current.style.opacity = '0';
            }
        };
        // 依赖数组为空 []，表示只在 mount/unmount 时执行
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ------------------------------------------------
    // 逻辑函数定义
    // ------------------------------------------------

    // 开始校准流程
    const handleStartCalibrationProcess = useCallback(() => {
        startCalibration();
        setCalibIndex(0);
        setStatus('calibrating');
        
        setCurrentSet(1); 
        setSecondsLeft(DURATION_PER_SET_ACTUAL);
        totalMetricsRef.current = { 
            totalGazePoints: [], 
            totalGazeOnTargetDuration: 0, 
            accumulatedDuration: 0 
        };
        gazeHistoryRef.current = [];
    }, [startCalibration, DURATION_PER_SET_ACTUAL]);

    // 初始化 WebGazer
    const handleInitialize = async () => {
        setStatus('initializing');
        const success = await initWebGazer();
        if (success) {
             setVideoLayout('center');
             setCheckSecondsLeft(3);   
             setStatus('cameraCheck');
        } else {
             setStatus('intro'); 
        }
    };

    // 摄像头自检倒计时
    useEffect(() => {
        let checkTimer: ReturnType<typeof setInterval>;
        if (status === 'cameraCheck') {
            checkTimer = setInterval(() => {
                setCheckSecondsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(checkTimer);
                        setTimeout(() => {
                            setVideoLayout('corner');
                            // 【优化】检测完直接进入校准，不再回 intro，防止流程中断
                            handleStartCalibrationProcess();
                        }, 500);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if(checkTimer) clearInterval(checkTimer); };
    }, [status, setVideoLayout, handleStartCalibrationProcess]);

    const handleCalibrationClick = (e: React.MouseEvent) => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 200);
        const { clientX, clientY } = e;
        setTimeout(() => { addCalibrationPoint(clientX, clientY); }, 100);
        setTimeout(() => {
            if (calibIndex < CALIBRATION_POINTS_CONFIG.length - 1) {
                setCalibIndex(prev => prev + 1);
            } else {
                endCalibration();
                setStatus('calibrationSuccess');
            }
        }, 300);
    };

    const handleGameAreaClick = (e: React.MouseEvent) => {
        if (status === 'running') {
            addCalibrationPoint(e.clientX, e.clientY);
            if (taskAreaRef.current) {
                const rect = taskAreaRef.current.getBoundingClientRect();
                const newRipple = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
                setClickRipples(prev => [...prev, newRipple]);
                setTimeout(() => setClickRipples(prev => prev.filter(r => r.id !== newRipple.id)), 500);
            }
        }
    };

    const handleStartSet = () => {
        setStatus('running');
        setSecondsLeft(DURATION_PER_SET_ACTUAL); 
        
        setIsHintActive(true);
        isHintActiveRef.current = true;
        
        setTimeout(() => {
            setIsHintActive(false);
            isHintActiveRef.current = false;
        }, HINT_DURATION * 1000);

        const config = DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS[1];
        
        const newObjects: MovingObject[] = [];
        const createObj = (url: string, isTarget: boolean) => {
             const speed = config.speed * (Math.random() * 0.5 + 0.8);
             const angle = Math.random() * 2 * Math.PI;
             
             return {
                 id: Math.random().toString(), url, isTarget,
                 x: Math.random() * (TASK_BOUNDS.width - TARGET_SIZE) + TARGET_SIZE/2,
                 y: Math.random() * (TASK_BOUNDS.height - TARGET_SIZE) + TARGET_SIZE/2,
                 vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
             }
        }

        newObjects.push(createObj(targetImageUrl, true));

        // 随机干扰物逻辑
        let safeDistractors = distractorImageUrls.length > 0 
            ? [...distractorImageUrls] 
            : ["https://placekitten.com/100/100"];
        
        // 简单的洗牌算法
        safeDistractors.sort(() => Math.random() - 0.5);

        for(let i=0; i<config.numDistractors; i++) {
            newObjects.push(createObj(safeDistractors[i % safeDistractors.length], false));
        }
        
        movingObjectsRef.current = newObjects;
        setMovingObjects(newObjects);
        
        gazeHistoryRef.current = [];
        smoothedGazeRef.current = { x: TASK_BOUNDS.width / 2, y: TASK_BOUNDS.height / 2 };

        startTracking((data) => {
            currentGazeRef.current = { x: data.x, y: data.y };
        });
    };

    const finishSession = async () => {
        setStatus('results');
        
        // 结束时也尝试关闭，双重保险
        stopTracking();
        shutdown();
        const videoElement = document.getElementById('webgazerVideoFeed') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const { totalGazeOnTargetDuration, accumulatedDuration, totalGazePoints } = totalMetricsRef.current;
        const validDuration = accumulatedDuration > 0 ? accumulatedDuration : 1;
        const accuracy = Math.min(1, totalGazeOnTargetDuration / validDuration);
        
        const metrics: SessionMetrics = {
            group: 'G2',
            taskDuration: accumulatedDuration / 1000,
            accuracy: accuracy,
            gazeStability: 0.85,
            level: level,
            setsCompleted: TOTAL_SETS_ACTUAL
        };
        
        try {
            await addDoc(collection(db, 'users', user.uid, 'gazeData'), {
                ...metrics, 
                userId: user.uid, 
                group: user.group, 
                submittedAt: serverTimestamp(), 
                gazeStream: totalGazePoints.slice(0, 500) 
            });
        } catch (e) { console.error(e) }
        onSessionComplete(metrics);
    };

    const handleSetComplete = useCallback(() => {
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stopTracking();

        if (currentSet < TOTAL_SETS_ACTUAL) {
            setStatus('rest');
            setRestSecondsLeft(REST_DURATION_ACTUAL); 
            setCurrentSet(prev => prev + 1); 
            
            const facts = t('g2.facts', { returnObjects: true }) as string[];
            const randomFact = facts[Math.floor(Math.random() * facts.length)];
            setCatFact(randomFact);
        } else {
            finishSession();
        }
    }, [currentSet, stopTracking, t, TOTAL_SETS_ACTUAL, REST_DURATION_ACTUAL]); 

    // 计时器逻辑
    useEffect(() => {
        if (status === 'running') {
            const timer = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]);

    useEffect(() => {
        if (status === 'running' && secondsLeft === 0) {
            handleSetComplete();
        }
    }, [status, secondsLeft, handleSetComplete]);


    const gameLoop = useCallback((timestamp: number) => {
        if (status !== 'running') return;
        const deltaTime = timestamp - lastTimestampRef.current;
        lastTimestampRef.current = timestamp;
        
        totalMetricsRef.current.accumulatedDuration += deltaTime;

        let currentObjects = movingObjectsRef.current;
        const nextObjects = currentObjects.map(obj => {
             let { x, y, vx, vy } = obj;
             x += vx; y += vy;
             if (x < TARGET_SIZE/2 || x > TASK_BOUNDS.width - TARGET_SIZE/2) vx = -vx;
             if (y < TARGET_SIZE/2 || y > TASK_BOUNDS.height - TARGET_SIZE/2) vy = -vy;
             
             return { ...obj, x, y, vx, vy };
        });
        movingObjectsRef.current = nextObjects;
        setMovingObjects(nextObjects);

        const currentGaze = currentGazeRef.current;
        const targetObj = nextObjects.find(o => o.isTarget);

        if(currentGaze && taskAreaRef.current) {
             const rect = taskAreaRef.current.getBoundingClientRect();
             const rawRelX = currentGaze.x - rect.left;
             const rawRelY = currentGaze.y - rect.top;

             gazeHistoryRef.current.push({ x: rawRelX, y: rawRelY });
             if (gazeHistoryRef.current.length > SMOOTHING_WINDOW_SIZE) gazeHistoryRef.current.shift(); 

             let avgX = 0, avgY = 0;
             gazeHistoryRef.current.forEach(p => { avgX += p.x; avgY += p.y; });
             avgX /= gazeHistoryRef.current.length;
             avgY /= gazeHistoryRef.current.length;

             let nextX = lerp(smoothedGazeRef.current.x, avgX, LERP_FACTOR);
             let nextY = lerp(smoothedGazeRef.current.y, avgY, LERP_FACTOR);

             const deltaDistance = Math.sqrt(Math.pow(nextX - smoothedGazeRef.current.x, 2) + Math.pow(nextY - smoothedGazeRef.current.y, 2));

             if (deltaDistance > MOVEMENT_DEADZONE || gazeHistoryRef.current.length < 3) {
                 smoothedGazeRef.current.x = nextX;
                 smoothedGazeRef.current.y = nextY;
             }
             
             const gx = smoothedGazeRef.current.x;
             const gy = smoothedGazeRef.current.y;
             
             if (redDotRef.current) {
                redDotRef.current.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
                const isInside = gx >= 0 && gx <= rect.width && gy >= 0 && gy <= rect.height;
                redDotRef.current.style.opacity = isInside ? '1' : '0';
             }

             if(targetObj && gx >=0 && gx <= TASK_BOUNDS.width && gy >=0 && gy <= TASK_BOUNDS.height) {
                 const dist = Math.sqrt(Math.pow(gx - targetObj.x, 2) + Math.pow(gy - targetObj.y, 2));
                 const locked = dist < GAZE_HIT_TOLERANCE;
                 
                 if (locked !== isTargetLocked) {
                      setIsTargetLocked(locked);
                 }

                 if(locked) {
                     totalMetricsRef.current.totalGazeOnTargetDuration += deltaTime;
                 }
                 
                 if(Math.random() < 0.1) totalMetricsRef.current.totalGazePoints.push({ x: Math.round(gx), y: Math.round(gy) });
             } else {
                 setIsTargetLocked(false);
             }
        }
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [status, isTargetLocked]); 

    useEffect(() => {
        if (status === 'running') {
            lastTimestampRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
        return () => { if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [status, gameLoop]);

    useEffect(() => {
        let restTimer: ReturnType<typeof setInterval>;
        if (status === 'rest') {
            restTimer = setInterval(() => {
                setRestSecondsLeft(prev => {
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (restTimer) clearInterval(restTimer); };
    }, [status]);

    if (status === 'intro') {
        return (
            <CatBox variant="sitting" title={t('g2.title_intro', { level })} className="max-w-3xl mx-auto">
                <div className="text-center space-y-8 py-8">
                    <div className="inline-block p-4 border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <Zap className="w-12 h-12 text-black" />
                    </div>
                    <div className="space-y-4">
                        <p className="text-xl font-bold font-arcade uppercase">{t('g2.plan_title')}</p>
                        <div className="flex justify-center gap-4 text-sm font-mono">
                            <span className="bg-gray-100 px-3 py-1 border-2 border-black">{t('g2.label_sets')}: {TOTAL_SETS_ACTUAL}</span>
                            <span className="bg-gray-100 px-3 py-1 border-2 border-black">{t('g2.label_duration')}: {DURATION_PER_SET_ACTUAL}s</span>
                            <span className="bg-yellow-100 px-3 py-1 border-2 border-black font-bold">{t('g2.label_total')}: 4.5 min</span>
                        </div>
                        <div className="bg-black-50 border-l-4 border-black-500 p-4 text-left max-w-lg mx-auto mt-4">
                             <p className="font-bold text-black-900 mb-2">{t('g2.upgrade_title')}</p>
                             <ul className="list-disc list-inside text-sm text-black-800 space-y-1">
                                 <li>{t('g2.upgrade_desc_1')}</li>
                                 <li>{t('g2.upgrade_desc_2')}</li>
                                 <li>{t('g2.upgrade_desc_3')}</li>
                             </ul>
                        </div>
                    </div>
                    {!isReady && !permissionError && <PawButton onClick={handleInitialize} icon={Target}>{t('g2.btn_init_cam')}</PawButton>}
                    {permissionError && <div className="bg-red-50 border-4 border-black p-4 font-bold text-red-600">Error: {permissionError}</div>}
                    {isReady && <div className="space-y-6"><PawButton onClick={handleStartCalibrationProcess} variant="outline">{t('g2.btn_start_calib')}</PawButton></div>}
                </div>
            </CatBox>
        );
    }
    
    if (status === 'cameraCheck') {
        return (
            <div className="fixed inset-0 z-[10000] bg-black/80 flex flex-col items-center justify-center text-white">
                <div className="absolute top-10 text-center animate-pulse">
                    <h2 className="text-4xl font-black font-arcade text-white">{t('g2.camera_check')}</h2>
                    <p className="font-mono mt-2">{t('g2.camera_instruction')}</p>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-black/50 mb-8 mt-[300px]">
                    <span className="text-5xl font-black font-arcade">{checkSecondsLeft}</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 font-bold"><Camera className="w-6 h-6 animate-pulse"/>{t('g2.detecting')}</div>
            </div>
        );
    }

    if (status === 'initializing') return <CatBox variant="sitting" title="INITIALIZING..."><div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-20 h-20 text-black animate-spin"/><p className="font-black text-2xl font-arcade mt-4">CONNECTING...</p></div></CatBox>;

    if (status === 'calibrating') {
        const point = CALIBRATION_POINTS_CONFIG[calibIndex];
        return (
             <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-crosshair" onClick={handleCalibrationClick}>
                <div className="absolute top-10 text-center text-white pointer-events-none">
                    <h2 className="text-5xl font-black uppercase tracking-tighter font-arcade mb-4">{t('g2.calib_title')}</h2>
                    <p className="font-mono text-xl bg-white text-black px-4 py-1 inline-block">{t('g2.calib_step', { current: calibIndex + 1 })}</p>
                </div>
                <div className={`absolute w-12 h-12 rounded-full border-4 border-white shadow-[0_0_30px_rgba(255,0,0,1)] transition-all duration-100 ${isClicking ? 'bg-white scale-90' : 'bg-red-600 scale-100'}`} style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}></div>
            </div>
        );
    }

    if (status === 'calibrationSuccess') {
        return (
            <CatBox variant="sitting" title="CALIBRATION COMPLETE" className="max-w-2xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-8 py-10">
                    <CheckCircle className="w-24 h-24 text-black" />
                    <p className="text-gray-600 font-medium">{t('g2.calib_success')}</p>
                    <PawButton onClick={handleStartSet} icon={Play} className="scale-110">{t('g2.btn_start_round_1')}</PawButton>
                </div>
            </CatBox>
        );
    }

    if (status === 'rest') {
        const isLocked = restSecondsLeft > 0;
        return (
            <CatBox variant="sitting" title={t('g2.title_rest')} className="max-w-2xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in fade-in">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                         <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }}></div>
                         <div className="absolute inset-0 bg-blue-200 rounded-full opacity-30 transform scale-75" style={{ animation: 'pulse 3s infinite' }}></div>
                         <div className="relative z-10 text-blue-800 flex flex-col items-center">
                             <Wind className="w-6 h-6 mb-1"/>
                             <span className="font-bold text-xs">{t('g2.breathe')}</span>
                         </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase font-arcade">{t('g2.round_complete', { round: currentSet - 1 })}</h2>
                    <div className="bg-yellow-50 border-2 border-black p-5 rounded-xl shadow-sm max-w-sm w-full relative overflow-hidden text-left">
                        <Sparkles className="absolute top-2 right-2 w-5 h-5 text-yellow-500 animate-pulse"/>
                        <p className="text-xs font-bold text-yellow-600 uppercase mb-2 flex items-center gap-1"><Coffee className="w-3 h-3"/> {t('g2.cat_fact_title')}</p>
                        <p className="font-medium text-gray-800 text-lg leading-snug">{catFact}</p>
                    </div>
                    <div className="flex flex-col gap-4 w-full max-w-xs mt-6">
                        {isLocked ? (
                            <button disabled className="bg-gray-200 border-4 border-gray-400 text-gray-500 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                <Lock className="w-5 h-5"/>{t('g2.btn_rest_locked', { seconds: restSecondsLeft })}
                            </button>
                        ) : (
                            <PawButton onClick={handleStartSet} icon={Play} className="scale-110 animate-bounce">{t('g2.btn_start_round', { round: currentSet })}</PawButton>
                        )}
                        <p className="text-xs text-gray-400 font-mono uppercase">{t('g2.next_round_info', { current: currentSet, total: TOTAL_SETS_ACTUAL })}</p>
                    </div>
                </div>
            </CatBox>
        );
    }

    if (status === 'running') {
        return (
            <CatBox variant="sitting" title={t('g2.title_running', { current: currentSet, total: TOTAL_SETS_ACTUAL, seconds: secondsLeft })} className="max-w-5xl mx-auto">
                <div className="relative flex justify-center py-4">
                    <div ref={taskAreaRef} onClick={handleGameAreaClick} className="relative bg-white border-4 border-black overflow-hidden cursor-crosshair shadow-inner group" style={{ width: TASK_BOUNDS.width, height: TASK_BOUNDS.height }}>
                         <div ref={redDotRef} className="absolute w-6 h-6 bg-red-600 rounded-full border-2 border-white pointer-events-none z-50 shadow-lg transition-transform duration-100 ease-out" style={{ top: 0, left: 0, opacity: 0 }}/>
                         {clickRipples.map(ripple => (
                            <div key={ripple.id} className="absolute w-12 h-12 border-4 border-red-500 rounded-full animate-ping pointer-events-none z-40" style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)' }}/>
                         ))}
                         {movingObjects.map((obj) => {
                             let borderStyle = '2px solid #e5e7eb'; 
                             let shadow = 'none';
                             let zIndex = 1;

                             if (obj.isTarget) {
                                 zIndex = 20;
                                 if (isHintActive) {
                                     borderStyle = '6px solid #ef4444';
                                     shadow = '0 0 20px rgba(239, 68, 68, 0.6)';
                                 } else if (isTargetLocked) {
                                     if (level >= 2) {
                                         borderStyle = '2px solid #e5e7eb';
                                     } else {
                                         borderStyle = '4px solid rgba(234, 179, 8, 0.5)';
                                         shadow = '0 0 15px rgba(234, 179, 8, 0.4)';
                                     }
                                 }
                             }
                             return (
                                <div 
                                    key={obj.id} 
                                    style={{ 
                                        position: 'absolute', left: obj.x, top: obj.y, width: TARGET_SIZE, height: TARGET_SIZE, 
                                        transform: `translate(-50%, -50%)`, 
                                        border: borderStyle, boxShadow: shadow, zIndex: zIndex, transition: 'border 0.2s, box-shadow 0.2s'
                                    }} 
                                    className="rounded-full overflow-hidden bg-white flex items-center justify-center transition-transform"
                                >
                                    <img src={obj.url} className="w-full h-full object-cover" alt="obj"/>
                                </div>
                             );
                         })}
                         
                         {isHintActive && (
                             <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full font-bold shadow-lg animate-bounce z-50">
                                 {t('g2.hint_stare')}
                             </div>
                         )}
                         
                         {!isHintActive && isTargetLocked && (
                             <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-1 rounded-full font-bold shadow-lg z-50 animate-in fade-in zoom-in duration-200">
                                 {t('g2.hint_locked')} <Fingerprint className="inline w-4 h-4 ml-1"/>
                             </div>
                         )}
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 mt-4">
                    <div className="flex gap-4">
                        <div className="bg-yellow-100 border-2 border-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                             <MousePointer2 className="w-5 h-5 text-black" />
                             <span className="font-bold text-sm text-yellow-900">{t('g2.tip_mouse')}</span>
                        </div>
                        <div className="bg-blue-100 border-2 border-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                             <ScanEye className="w-5 h-5 text-black" />
                             <span className="font-bold text-sm text-blue-900">{t('g2.tip_scan')}</span>
                        </div>
                    </div>
                </div>
            </CatBox>
        );
    }
    
    if (status === 'results') {
        const accuracy = Math.round(totalMetricsRef.current.totalGazeOnTargetDuration / (totalMetricsRef.current.accumulatedDuration || 1) * 100);
        return (
             <CatBox variant="sitting" title={t('g2.title_complete')}>
                <div className="flex flex-col items-center text-center space-y-8 py-6">
                    <BarChart3 className="w-24 h-24 text-black border-4 border-black p-2 rounded-xl bg-gray-100"/>
                    <h2 className="text-3xl font-black uppercase tracking-tight font-arcade">{t('g2.all_sets_done')}</h2>
                    <div className="grid grid-cols-2 gap-6 w-full max-w-md">
                        <div className="p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('g2.label_accuracy')}</p>
                            <p className="text-3xl font-black font-arcade">{accuracy}%</p>
                        </div>
                        <div className="p-6 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-xs font-bold text-gray-500 uppercase">{t('g2.label_sets_done')}</p>
                            <p className="text-3xl font-black font-arcade">{TOTAL_SETS_ACTUAL}</p>
                        </div>
                    </div>
                    <PawButton onClick={() => setStatus('intro')}>{t('g2.btn_home')}</PawButton>
                </div>
            </CatBox>
        );
    }

    return null;
};