import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Save, Share2, CheckCircle2, RefreshCw, Activity, Layers, Eye, Brain, ChevronRight, Terminal } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { UserData } from '../../types';
import { useTranslation } from 'react-i18next';


export const CAT_BODY_URL = "/CAT.png"; 

export interface AcademicAccessoryItem {
  id: number;
  img: string;
  price: number; 
  saliency?: number; 
  type: 'NECK' | 'HEAD' | 'BODY' | 'FACE' | 'NOISE' | 'DISTRACTOR';
  pos: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    width: string;
    zIndex?: number;
    rotate?: string;
  };
}


export const CAT_ITEMS: AcademicAccessoryItem[] = [
  // --- Day 1: Color Anchors (NECK/FACE) ---
  //  (Color Contrast)
  { id: 4, img: 'C4.png', price: 1, saliency: 22, type: 'NECK', pos: { top: '26%', left: '31%', width: '44%', zIndex: 20 } },
  { id: 7, img: 'C7.png', price: 1, saliency: 15, type: 'NECK', pos: { top: '29%', left: '33%', width: '40%', zIndex: 20 } },
  { id: 21, img: 'C21.png', price: 1, saliency: 8, type: 'FACE', pos: { bottom: '69%', left: '37%', width: '20%', zIndex: 20 } },
  
  // --- Day 2: Shape/Contour (HEAD) ---
  //  (Shape Constancy Breaking)
  { id: 1, img: 'C1.png', price: 2, saliency: 20, type: 'HEAD', pos: { top: '-8%', left: '37%', width: '25%', zIndex: 20 } },
  { id: 5, img: 'C5.png', price: 2, saliency: 25, type: 'HEAD', pos: { top: '-4%', left: '23%', width: '55%', zIndex: 20 } },
  { id: 20, img: '/C20.png', price: 2, saliency: 12, type: 'HEAD', pos: { top: '-5%', left: '17%', width: '65%', zIndex: 20 } },
  { id: 15, img: 'C15.png', price: 2, saliency: 18, type: 'HEAD', pos: { top: '-39%', right: '-13%', width: '82%', zIndex: 20 } },
  { id: 2, img: 'C2.png', price: 2, saliency: 10, type: 'FACE', pos: { top: '23%', left: '41%', width: '18%', zIndex: 20 } },
  // FIX: C3 (Headphones) zIndex increased to 20 to show ABOVE Cat Body
  { id: 3, img: 'C3.png', price: 2, saliency: 8, type: 'HEAD', pos: { top: '7.5%', left: '32%', width: '36%', zIndex: 20 } },
  { id: 18, img: 'C18.png', price: 2, saliency: 5, type: 'FACE', pos: { top: '27%', right: '41%', width: '22%', rotate:'-15deg', zIndex: 20 } },
  
  // --- Day 3: Spatial/Body (BODY) ---
  // (Spatial Awareness)
  { id: 16, img: 'C16.png', price: 3, saliency: 28, type: 'BODY', pos: { bottom: '46%', left: '21%', width: '75%', zIndex: 5 } }, // Wings behind body
  { id: 11, img: 'C11.png', price: 3, saliency: 12, type: 'BODY', pos: { top: '28%', left: '31%', width: '71%', zIndex: 20 } },
  { id: 12, img: 'C12.png', price: 3, saliency: 15, type: 'BODY', pos: { bottom: '29%', right: '7%', width: '50%', zIndex: 20 } },
  // FIX: C8 (Tattoo) zIndex increased to 15 to show ON Cat Body (Body is z-10)
  { id: 8, img: 'C8.png', price: 3, saliency: 16, type: 'BODY', pos: { top: '55%', left: '77%', width: '15%', zIndex: 15 } },
  { id: 9, img: 'C9.png', price: 3, saliency: 14, type: 'BODY', pos: { top: '52%', left: '41%', width: '15%', zIndex: 20 } },
  { id: 19, img: 'C19.png', price: 3, saliency: 9, type: 'BODY', pos: { top: '64%', left: '33%', width: '51%', zIndex: 20 } },
];

export const BACKGROUND_ITEMS: AcademicAccessoryItem[] = [
  { id: 6, img: 'C6.png', price: 1, type: 'NOISE', pos: { top: '-2%', left: '3%', width: '95%', zIndex: 15 } },
  { id: 13, img: 'C13.png', price: 2, type: 'NOISE', pos: { bottom: '68%', left: '10%', width: '108%' } },
  { id: 14, img: 'C14.png', price: 2, type: 'NOISE', pos: { bottom: '-13%', right: '-15%', width: '98%' } },
  // --- Day 3 Noise (Distractors) ---
  { id: 10, img: 'C10.png', price: 3, type: 'DISTRACTOR', pos: { top: '65%', left: '-8%', width: '45%' } },
  { id: 17, img: 'C17.png', price: 3, type: 'DISTRACTOR', pos: { top: '40%', left: '-10%', width: '40%', zIndex: 0 } },
];

const ALL_ITEMS = [...CAT_ITEMS, ...BACKGROUND_ITEMS];
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');


interface CatDressUpGameProps {
    user: UserData;
    progress: { day: number; totalSessions: number; completionRate: number };
}

export const CatDressUpGame: React.FC<CatDressUpGameProps> = ({ user, progress }) => {
    const { t } = useTranslation();

    const [equippedIds, setEquippedIds] = useState<number[]>(user.catConfig?.equippedIds || []);
    const [ownedIds, setOwnedIds] = useState<number[]>(user.catConfig?.ownedIds || []);
    
    const [localLastRewardDate, setLocalLastRewardDate] = useState<string>(user.catConfig?.lastRewardDate || "");
    const [localLastRewarded, setLocalLastRewarded] = useState<number>(user.catConfig?.lastRewardedSession || 0);

    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [newItemsModal, setNewItemsModal] = useState<AcademicAccessoryItem[] | null>(null);
    const [briefingModal, setBriefingModal] = useState<number | null>(null);

    
    const stats = useMemo(() => {
        let signalScore = 15;
        let noiseLevel = 0;
        
        equippedIds.forEach(id => {
            const targetItem = CAT_ITEMS.find(i => i.id === id);
            if (targetItem) signalScore += (targetItem.saliency || 0);

            const noiseItem = BACKGROUND_ITEMS.find(i => i.id === id);
            if (noiseItem) noiseLevel += 10;
        });

        const fidelity = Math.min(signalScore, 100);
        let status = t('cat_game.status_unstable');
        let color = "text-red-500";
        if (fidelity > 50) { status = t('cat_game.status_stabilizing'); color = "text-yellow-600"; }
        if (fidelity > 80) { status = t('cat_game.status_optimal'); color = "text-green-600"; }

        return { fidelity, noiseLevel, status, color };
    }, [equippedIds, t]);

    
    useEffect(() => {
        const checkBriefing = () => {
            const currentDay = progress.day;
            
            if (currentDay < 1 || currentDay > 3) return;

            const storageKey = `briefing_seen_${user.uid}_day${currentDay}`;
            const hasSeen = localStorage.getItem(storageKey);
            
            if (!hasSeen) {
                setBriefingModal(currentDay);
            }
        };
        checkBriefing();
    }, [progress.day, user.uid]);

    const closeBriefing = () => {
        const storageKey = `briefing_seen_${user.uid}_day${progress.day}`;
        localStorage.setItem(storageKey, "true");
        setBriefingModal(null);
    };

   
    useEffect(() => {
        const checkRewards = async () => {
            if (!user.uid) return;
            const currentSession = progress.totalSessions;
            const todayStr = new Date().toLocaleDateString();
            const hasNewProgress = currentSession > localLastRewarded;
            const isRewardAlreadyClaimedToday = localLastRewardDate === todayStr;

            if (hasNewProgress) {
                if (!isRewardAlreadyClaimedToday) {
                    const currentDay = progress.day;
                    const unlockablePool = ALL_ITEMS.filter(item => item.price <= currentDay);
                    const unownedItems = unlockablePool.filter(item => !ownedIds.includes(item.id));
                    
                    if (unownedItems.length > 0) {
                        const shuffled = unownedItems.sort(() => 0.5 - Math.random());
                        const drawnItems = shuffled.slice(0, 5);
                        const drawnIds = drawnItems.map(i => i.id);

                        setOwnedIds([...ownedIds, ...drawnIds]);
                        setNewItemsModal(drawnItems);
                        setLocalLastRewarded(currentSession);
                        setLocalLastRewardDate(todayStr);

                        try {
                            const userRef = doc(db, 'users', user.uid);
                            await updateDoc(userRef, {
                                'catConfig.ownedIds': [...ownedIds, ...drawnIds],
                                'catConfig.lastRewardedSession': currentSession,
                                'catConfig.lastRewardDate': todayStr
                            });
                        } catch (e) { console.error(e); }
                    } else {
                         setLocalLastRewarded(currentSession);
                         setLocalLastRewardDate(todayStr);
                         try {
                            const userRef = doc(db, 'users', user.uid);
                            await updateDoc(userRef, { 
                                'catConfig.lastRewardedSession': currentSession,
                                'catConfig.lastRewardDate': todayStr
                            });
                        } catch (e) {}
                    }
                } else {
                    setLocalLastRewarded(currentSession);
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, { 'catConfig.lastRewardedSession': currentSession });
                    } catch (e) {}
                }
            }
        };
        checkRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress.totalSessions, progress.day]);

    
    const toggleEquip = (id: number) => {
        const item = ALL_ITEMS.find(i => i.id === id);
        if (!item) return;

        const isUnlockedByDay = progress.day >= item.price;
        const hasAccess = ownedIds.includes(id) || isUnlockedByDay;

        if (!hasAccess) return;

        if (equippedIds.includes(id)) {
            setEquippedIds(prev => prev.filter(i => i !== id));
        } else {
            setEquippedIds(prev => [...prev, id]);
        }
    };

    const handleSave = async () => {
        const confirmMsg = 
            `${t('cat_game.confirm_modal.title')}\n\n` +
            `${t('cat_game.confirm_modal.fidelity')}: ${stats.fidelity}%\n` +
            `${t('cat_game.confirm_modal.warning')}`;
        
        if (!confirm(confirmMsg)) return;

        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'catConfig.equippedIds': equippedIds,
                'catConfig.lastUpdated': new Date()
            });
            setTimeout(() => setIsSaving(false), 1000); 
        } catch (error) { console.error(error); setIsSaving(false); }
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            await addDoc(collection(db, 'community_posts'), {
                userId: user.uid,
                userName: user.name || "Subject",
                userGroup: user.group,
                equippedIds: equippedIds,
                saliencyScore: stats.fidelity,
                timestamp: serverTimestamp(),
                likes: 0,
                comments: []
            });
            alert(t('game.alert_shared')); 
        } catch (error) { console.error(error); } 
        finally { setIsSharing(false); }
    };

    const handleDevReset = async () => {
        if (!confirm("RESET PROTOCOL? (Dev Only)")) return;
        setIsSaving(true);
        try {
            setEquippedIds([]);
            setOwnedIds([]);
            setLocalLastRewarded(0);
            setLocalLastRewardDate("");
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                catConfig: { equippedIds: [], ownedIds: [], lastRewardedSession: 0, lastRewardDate: "" }
            });
            alert("Reset Complete.");
        } catch (error) { console.error(error); } 
        finally { setIsSaving(false); }
    };

    // Icons map for Briefings (1=Eye, 2=Brain, 3=Layers)
    const briefingIcons = {
        1: <Eye className="w-12 h-12 text-black" />,
        2: <Brain className="w-12 h-12 text-black" />,
        3: <Layers className="w-12 h-12 text-black" />
    }

    return (
        <div className="max-w-6xl mx-auto mb-8 relative font-sans text-gray-900">
            
        
            <div className="bg-white border-2 border-black p-5 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-4">
                    <div className="bg-black text-white p-2 rounded-sm mt-1">
                        <Terminal className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-black font-arcade uppercase tracking-wider text-lg">
                            {t('cat_game.system_title')}
                        </h3>
                        
                        <div className="text-sm text-gray-800 mt-3 space-y-3 leading-relaxed font-mono">
                            <p className="font-bold bg-gray-100 p-2 border border-black text-black">
                                {t('cat_game.warning')}
                            </p>
                            
                            <p>{t('cat_game.intro_1')}</p>

                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-black font-bold text-xs">
                                <li className="flex items-center gap-2 bg-white p-2 border border-black shadow-sm">
                                    <span className="text-xl">🧣</span>
                                    <span>{t('cat_game.example_neck')}</span>
                                </li>
                                <li className="flex items-center gap-2 bg-white p-2 border border-black shadow-sm">
                                    <span className="text-xl">🎩</span>
                                    <span>{t('cat_game.example_hat')}</span>
                                </li>
                            </ul>

                            <p className="text-xs text-gray-500 italic border-t border-gray-300 pt-2 mt-1">
                                {t('cat_game.validity_note')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

           
            <div className="bg-[#f0f0f0] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
                
               
                <div className="flex flex-wrap justify-between items-end mb-6 border-b-2 border-black pb-4 gap-4">
                    <div>
                        <h3 className="text-2xl font-black font-arcade uppercase">{t('game.title')}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold font-mono bg-black text-white px-2 py-0.5">
                                PROTOCOL: DAY {progress.day}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={handleDevReset} className="p-2 border-2 border-gray-300 text-gray-400 hover:bg-black hover:text-white transition-colors" title="Reset">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 transition-all active:scale-95 text-sm border-2 border-transparent hover:border-white">
                            {isSaving ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {t('cat_game.btn_confirm')}
                        </button>
                        <button onClick={handleShare} disabled={isSharing} className="flex items-center gap-2 bg-white text-black border-2 border-black px-4 py-2 font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                            <Share2 className="w-4 h-4" />
                            {t('cat_game.btn_log')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                   
                    <div className="flex-1 flex flex-col">
                        <div className="mb-2 grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-black text-white p-2 border border-black flex justify-between items-center">
                                <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> {t('cat_game.signal')}</span>
                                <span className="font-bold text-lg">{stats.fidelity}%</span>
                            </div>
                            <div className="bg-white text-black p-2 border border-black flex justify-between items-center">
                                <span className="flex items-center gap-1"><Layers className="w-3 h-3"/> {t('cat_game.noise')}</span>
                                <span className="font-bold text-lg">{stats.noiseLevel}%</span>
                            </div>
                        </div>

                        <div className="flex-1 bg-white border-2 border-black relative min-h-[500px] flex items-center justify-center pattern-grid-lg overflow-hidden">
                            <div className="relative w-80 h-80">
                                {/* Cat Base Image: z-10 */}
                                <img src={CAT_BODY_URL} alt="Cat Base" className="w-full h-full object-contain relative z-10" />
                                <AnimatePresence>
                                    {equippedIds.map(id => {
                                        const item = ALL_ITEMS.find(i => i.id === id);
                                        if (!item) return null;
                                        return (
                                            <motion.img 
                                                key={id}
                                                src={item.img}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute pointer-events-none"
                                                style={{ 
                                                    top: item.pos.top, left: item.pos.left, right: item.pos.right, bottom: item.pos.bottom,
                                                    width: item.pos.width, 
                                                    zIndex: item.pos.zIndex || 20, // Default to top if not specified
                                                    transform: item.pos.rotate ? `rotate(${item.pos.rotate})` : undefined
                                                }}
                                            />
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                            <div className="absolute top-2 left-2">
                                <div className={`text-[10px] font-bold px-2 py-1 border border-black bg-white flex items-center gap-1 ${stats.color}`}>
                                    <div className={`w-2 h-2 rounded-full ${stats.fidelity > 50 ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {t('cat_game.status_label')}: {stats.status}
                                </div>
                            </div>
                        </div>
                    </div>

                  
                    <div className="flex-1 flex flex-col h-[600px]">
                        <div className="mb-2 text-xs font-mono text-gray-500 uppercase tracking-wider flex justify-between items-center">
                            <span>{t('cat_game.search_params')}</span>
                            <span className="text-[10px] bg-black text-white px-1">{t('cat_game.clearance', {level: progress.day})}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            <div>
                                <h4 className="font-bold text-xs uppercase mb-2 flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> {t('cat_game.category_target')}
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {CAT_ITEMS.map((item) => renderItemButton(item, ownedIds, equippedIds, toggleEquip, progress.day, t))}
                                </div>
                            </div>

                            <div className="pt-4 border-t-2 border-gray-300">
                                <h4 className="font-bold text-xs uppercase mb-2 flex items-center gap-1 text-gray-600">
                                    <Layers className="w-3 h-3" /> {t('cat_game.category_noise')}
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {BACKGROUND_ITEMS.map((item) => renderItemButton(item, ownedIds, equippedIds, toggleEquip, progress.day, t))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

               
                <AnimatePresence>
                    {briefingModal !== null && (
                        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white border-4 border-black max-w-md w-full shadow-[0_0_50px_rgba(255,255,255,0.2)] relative overflow-hidden"
                            >
                                <div className="absolute -top-6 -right-6 text-[150px] text-gray-200 font-black z-0 opacity-50 select-none leading-none font-arcade">
                                    {progress.day}
                                </div>
                                <div className="relative z-10 p-8 text-center">
                                    <div className="flex justify-center mb-4">
                                        {/* @ts-ignore */}
                                        {briefingIcons[briefingModal]}
                                    </div>
                                    <h2 className="text-xl font-black font-arcade uppercase text-black mb-1">
                                        {/* @ts-ignore */}
                                        {t(`cat_game.briefings.${briefingModal}.title`)}
                                    </h2>
                                    <div className="inline-block bg-black text-white px-3 py-1 text-xs font-bold font-mono mb-6">
                                        {/* @ts-ignore */}
                                        {t(`cat_game.briefings.${briefingModal}.subtitle`)}
                                    </div>
                                    <p className="text-sm text-black font-sans leading-relaxed whitespace-pre-line mb-8 text-left bg-gray-100 p-4 border-l-4 border-black">
                                        {/* @ts-ignore */}
                                        {t(`cat_game.briefings.${briefingModal}.content`)}
                                    </p>
                                    <button 
                                        onClick={closeBriefing}
                                        className="w-full bg-black text-white py-3 font-bold font-arcade text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border-2 border-transparent hover:border-black hover:bg-white hover:text-black"
                                    >
                                        {t('cat_game.btn_acknowledge')} <ChevronRight className="w-4 h-4"/>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

               
                <AnimatePresence>
                    {newItemsModal && (
                        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="bg-white border-4 border-black p-6 max-w-md w-full"
                            >
                                <div className="text-center mb-6">
                                    <Brain className="w-12 h-12 text-black mx-auto mb-2 animate-pulse" />
                                    <h2 className="text-xl font-black font-arcade uppercase">New Protocols Unlocked</h2>
                                    <p className="text-xs text-gray-500 font-mono mt-1">Based on Day {progress.day} progress.</p>
                                </div>
                                <div className="grid grid-cols-5 gap-2 mb-6">
                                    {newItemsModal.map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="aspect-square border border-black bg-gray-100 flex items-center justify-center p-1"
                                        >
                                            <img src={item.img} alt="item" className="w-full h-full object-contain" />
                                        </motion.div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setNewItemsModal(null)}
                                    className="w-full bg-black text-white py-3 font-bold font-arcade hover:bg-gray-800 transition-colors"
                                >
                                    INTEGRATE PARAMETERS
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};


const renderItemButton = (
    item: AcademicAccessoryItem, 
    ownedIds: number[], 
    equippedIds: number[], 
    toggle: (id: number) => void,
    currentDay: number,
    t: any
) => {
    const isLockedByDay = currentDay < item.price;
    const isOwned = ownedIds.includes(item.id) || !isLockedByDay; 
    const isEquipped = equippedIds.includes(item.id);

    return (
        <button
            key={item.id}
            onClick={() => !isLockedByDay && toggle(item.id)}
            disabled={isLockedByDay}
            className={cn(
                "aspect-square border-2 relative flex flex-col items-center justify-center p-1 transition-all group",
                isLockedByDay 
                    ? "bg-gray-200 border-gray-300 cursor-not-allowed opacity-50" 
                    : isEquipped
                        ? "bg-gray-800 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -translate-y-1 text-white"
                        : "bg-white border-black hover:bg-gray-100"
            )}
        >
            {isLockedByDay ? (
                <div className="flex flex-col items-center">
                    <Lock className="w-4 h-4 text-gray-400 mb-1" />
                    <span className="text-[8px] font-mono text-gray-500">{t('cat_game.item_locked', {day: item.price})}</span>
                </div>
            ) : (
                <>
                    <img src={item.img} alt="item" className="w-full h-full object-contain p-1" />
                    {isEquipped && <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />}
                    
                    
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 bg-black text-white text-[9px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border border-gray-600">
                        <div className="font-bold mb-0.5 text-white border-b border-gray-700 pb-1">
                             {/* @ts-ignore */}
                            {t(`cat_game.item_descs.${item.id}.name`)}
                        </div>
                        <div className="leading-tight text-gray-300 mb-1 mt-1 font-mono">
                             {/* @ts-ignore */}
                            {t(`cat_game.item_descs.${item.id}.desc`)}
                        </div>
                        {item.saliency && <div className="text-black font-mono bg-white px-1 rounded inline-block font-bold">SNR +{item.saliency}%</div>}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45 border-l border-t border-gray-600"></div>
                    </div>
                </>
            )}
        </button>
    );
};
