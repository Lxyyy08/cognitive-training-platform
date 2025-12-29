import { useState, useCallback, useEffect, useRef } from 'react';

declare global {
    interface Window {
        webgazer: any;
    }
}

export interface GazeData {
    x: number;
    y: number;
    timestamp: number;
}

interface UseWebGazerResult {
    isSupported: boolean;
    isReady: boolean;
    isCalibrating: boolean;
    isCalibrated: boolean;
    isTracking: boolean;
    permissionError: string | null;
    initWebGazer: () => Promise<boolean>;
    startCalibration: () => void;
    addCalibrationPoint: (x: number, y: number) => void;
    endCalibration: () => void;
    startTracking: (onGaze?: (data: GazeData) => void) => void; 
    stopTracking: () => void;
    shutdown: () => void;
    showPredictionPoints: (show: boolean) => void;
    
    setVideoLayout: (mode: 'corner' | 'center') => void;
}

export const useWebGazer = (): UseWebGazerResult => {
    const [isSupported, setIsSupported] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    
    
    const videoLayoutRef = useRef<'corner' | 'center'>('corner');
    
    const gazeListenerRef = useRef<((data: any, clock: number) => void) | null>(null);

    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setIsSupported(false);
            console.error("WebGazer: getUserMedia API not supported.");
        }
    }, []);

    
    const setVideoLayout = useCallback((mode: 'corner' | 'center') => {
        videoLayoutRef.current = mode;
       
        const video = document.getElementById('webgazerVideoFeed');
        const overlay = document.getElementById('webgazerFaceOverlay');
        const feedback = document.getElementById('webgazerFaceFeedbackBox');
        
        
        const getStyle = () => {
            if (mode === 'center') {
                return `
                    position: fixed !important; 
                    top: 50% !important; 
                    left: 50% !important; 
                    right: auto !important; 
                    bottom: auto !important;
                    transform: translate(-50%, -50%) !important;
                    width: 320px !important; 
                    height: 240px !important; 
                    z-index: 999999 !important; 
                    border-radius: 12px !important; 
                    border: 4px solid #3b82f6 !important;
                    box-shadow: 0 0 0 100vh rgba(0,0,0,0.8) !important; /* 遮罩层效果 */
                    opacity: 1 !important;
                    display: block !important;
                    pointer-events: none !important;
                `;
            } else {
                return `
                    position: fixed !important; 
                    top: auto !important; 
                    bottom: 10px !important; 
                    right: 10px !important; 
                    left: auto !important; 
                    transform: none !important;
                    width: 160px !important; 
                    height: 120px !important; 
                    z-index: 999999 !important; 
                    border-radius: 8px !important; 
                    border: 2px solid #00f !important;
                    box-shadow: none !important;
                    opacity: 0.9 !important;
                    display: block !important;
                    pointer-events: none !important;
                `;
            }
        };

        const style = getStyle();
        if (video) video.style.cssText += style;
        if (overlay) overlay.style.cssText += style;
        if (feedback) feedback.style.cssText += style;
    }, []);

    
    const forceLayout = useCallback(() => {
        
        setVideoLayout(videoLayoutRef.current);
    }, [setVideoLayout]);

    const initWebGazer = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !window.webgazer) return false;
        if (isReady) {
            forceLayout();
            return true;
        }

        console.log("WebGazer: Initializing...");
        setPermissionError(null);

        try {
            window.webgazer.clearData(); 
            window.webgazer.applyKalmanFilter(true); 
            window.webgazer.params.showVideoPreview = true; 
            window.webgazer.params.showPredictionPoints = false; 

            await window.webgazer.setRegression('ridge').begin();

            // 保持监听鼠标
            // window.webgazer.removeMouseEventListeners(); 

            forceLayout();
            const layoutInterval = setInterval(forceLayout, 1000);
            setTimeout(() => clearInterval(layoutInterval), 10000);

            setIsReady(true);
            window.webgazer.pause(); 
            return true;

        } catch (error: any) {
            console.error("WebGazer Init Failed:", error);
            setPermissionError("摄像头启动失败，请检查权限。");
            setIsReady(false);
            return false;
        }
    }, [isReady, forceLayout]);

    const shutdown = useCallback(() => {
        if (window.webgazer) {
            try {
                window.webgazer.end(); 
                document.getElementById('webgazerVideoFeed')?.remove();
                document.getElementById('webgazerFaceOverlay')?.remove();
                document.getElementById('webgazerFaceFeedbackBox')?.remove();
                document.getElementById('webgazerVideoContainer')?.remove();
            } catch (e) {
                console.error("WebGazer shutdown error:", e);
            }
            setIsReady(false);
            setIsTracking(false);
            setIsCalibrating(false);
            gazeListenerRef.current = null;
        }
    }, []);

    const startCalibration = useCallback(() => {
        if (!isReady) return;
        forceLayout();
        window.webgazer.clearData(); 
        window.webgazer.resume(); 
        setIsCalibrated(false);
        setIsCalibrating(true);
    }, [isReady, forceLayout]);

    const addCalibrationPoint = useCallback((x: number, y: number) => {
        if (!isReady) return;
        for(let i=0; i<20; i++) window.webgazer.recordScreenPosition(x, y, 'click');
        console.log(`Calibration point added: ${x}, ${y}`);
    }, [isReady]);

    const endCalibration = useCallback(() => {
        if (!isReady) return;
        setIsCalibrating(false);
        setIsCalibrated(true);
        window.webgazer.pause(); 
    }, [isReady]);

    const startTracking = useCallback((onGaze?: (data: GazeData) => void) => {
        if (!isReady) return;
        
        forceLayout();
        window.webgazer.resume();
        setIsTracking(true);
        window.webgazer.clearGazeListener();
        
        const listener = (data: any, _clock: number) => {
            if (data && onGaze) {
                onGaze({ x: data.x, y: data.y, timestamp: Date.now() });
            }
        };
        
        window.webgazer.setGazeListener(listener);
        gazeListenerRef.current = listener;
    }, [isReady, forceLayout]);

    const stopTracking = useCallback(() => {
        if (!isReady) return;
        window.webgazer.pause();
        setIsTracking(false);
        if (gazeListenerRef.current) {
            window.webgazer.clearGazeListener();
            gazeListenerRef.current = null;
        }
    }, [isReady]);

    const showPredictionPoints = useCallback((show: boolean) => {
        if (window.webgazer) window.webgazer.showPredictionPoints(show);
    }, []);

    useEffect(() => {
        return () => { shutdown(); };
    }, [shutdown]);

    return {
        isSupported, isReady, isCalibrating, isCalibrated, isTracking,
        permissionError, initWebGazer, startCalibration,
        addCalibrationPoint, endCalibration, startTracking, stopTracking,
        shutdown, showPredictionPoints, setVideoLayout 
    };
};