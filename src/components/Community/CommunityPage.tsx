import  { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ShieldCheck,  Clock, Loader2, AlertTriangle, ImageOff, 
    Layers, Camera, Fingerprint, Eye, Lock, 
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import type { UserData } from '../../types';
import { CAT_ITEMS, BACKGROUND_ITEMS, CAT_BODY_URL } from '../game/CatDressUpGame'; 
import { useTranslation } from 'react-i18next';

const ALL_ITEMS = [...CAT_ITEMS, ...BACKGROUND_ITEMS];


const MiniCatPreview = ({ equippedIds }: { equippedIds: number[] }) => {
    const { t } = useTranslation();
    return (
        <div className="relative w-full aspect-square bg-white border-b-4 border-black flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" 
                 style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>
            
            <div className="relative w-[65%] h-[65%]"> 
                <img 
                    src={CAT_BODY_URL} 
                    alt="Target Base" 
                    className="w-full h-full object-contain pointer-events-none relative z-0 opacity-90" 
                />
                
                {equippedIds.map(id => {
                    const item = ALL_ITEMS.find(i => i.id === id);
                    if (!item) return null;
                    return (
                        <img 
                            key={id} 
                            src={item.img} 
                            className="absolute pointer-events-none" 
                            style={{ 
                                top: item.pos.top, 
                                left: item.pos.left, 
                                right: item.pos.right, 
                                bottom: item.pos.bottom,
                                width: item.pos.width, 
                                zIndex: item.pos.zIndex || 10,
                                transform: item.pos.rotate ? `rotate(${item.pos.rotate})` : undefined
                            }}
                        />
                    );
                })}
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-black font-bold border border-black px-1 bg-white z-10">
                {t('community.fig_caption')}
            </div>
        </div>
    );
};

export const CommunityPage = ({ user }: { user: UserData }) => {
    const { t } = useTranslation();
    
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const recordedDays = Number(user.daysCompleted) || 0;
    const sessionCount = user.catConfig?.lastRewardedSession || 0;
    const ownedCount = user.catConfig?.ownedIds?.length || 0;

    const isFieldPhaseUnlocked = recordedDays >= 3 || sessionCount >= 3 || ownedCount >= 5;

    const [activeTab, setActiveTab] = useState<'TEMPLATE' | 'EVIDENCE'>('TEMPLATE');

    const handleForceRefresh = () => {
        window.location.reload();
    };

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'community_posts'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(postsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error(err);
            setError(err.message);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []); 

    const handleValidate = async (postId: string, currentLikes: number) => {
        if (!user.uid) return;
        const postRef = doc(db, 'community_posts', postId);
        try { await updateDoc(postRef, { likes: (currentLikes || 0) + 1 }); } catch (e) {}
    };

    const handleNote = async (postId: string, tag: string) => {
        if (!user.uid) return;
        const postRef = doc(db, 'community_posts', postId);
        try { await updateDoc(postRef, { comments: arrayUnion(tag) }); } catch (e) {}
    };

   
    const filteredPosts = posts.filter(post => {
        if (activeTab === 'TEMPLATE') {
           
            return !post.evidenceImgUrl && post.saliencyScore !== undefined;
        } else {
            
            return !!post.evidenceImgUrl;
        }
    });

    return (
        <div className="min-h-screen pb-20 animate-in fade-in duration-500 bg-white text-black font-sans relative">
            
            {!isFieldPhaseUnlocked && (
                <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-[10px] p-1 text-center z-50 font-mono" onClick={handleForceRefresh}>
                    {t('community.debug_status', {days: recordedDays, sessions: sessionCount, items: ownedCount})}
                </div>
            )}

            
            <div className="py-8 mb-8 border-b-4 border-black bg-white">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="bg-black text-white p-2 rounded-full">
                            {activeTab === 'TEMPLATE' ? <Layers className="w-6 h-6"/> : <Camera className="w-6 h-6"/>}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black font-arcade uppercase tracking-widest text-black">
                            {activeTab === 'TEMPLATE' ? t('community.tab_template') : t('community.tab_evidence')}
                        </h1>
                    </div>
                    <div className="inline-block border border-black px-3 py-1 mt-2">
                        <p className="font-mono text-xs md:text-sm font-bold uppercase tracking-widest">
                            {activeTab === 'TEMPLATE' 
                                ? t('community.phase_1') 
                                : t('community.phase_2')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                
                
                <div className="flex border-4 border-black bg-white mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <button 
                        onClick={() => setActiveTab('TEMPLATE')}
                        className={`flex-1 py-4 font-bold font-arcade flex items-center justify-center gap-2 transition-all ${
                            activeTab === 'TEMPLATE' 
                                ? 'bg-black text-white' 
                                : 'hover:bg-gray-100 text-gray-500 hover:text-black'
                        }`}
                    >
                        <Fingerprint className="w-5 h-5" />
                        {t('community.tab_template')}
                    </button>
                    
                    <button 
                        onClick={() => isFieldPhaseUnlocked && setActiveTab('EVIDENCE')}
                        disabled={!isFieldPhaseUnlocked}
                        className={`flex-1 py-4 font-bold font-arcade flex items-center justify-center gap-2 transition-all border-l-4 border-black relative overflow-hidden ${
                            activeTab === 'EVIDENCE' 
                                ? 'bg-black text-white' 
                                : isFieldPhaseUnlocked 
                                    ? 'hover:bg-gray-100 text-gray-500 hover:text-black cursor-pointer' 
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed pattern-diagonal-lines'
                        }`}
                    >
                        {!isFieldPhaseUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                <span className="bg-black text-white text-[10px] px-2 py-1 font-mono flex items-center gap-1 border border-black">
                                    <Lock className="w-3 h-3"/> {t('community.status_locked')}
                                </span>
                            </div>
                        )}
                        <Eye className="w-5 h-5" />
                        {t('community.tab_evidence')}
                    </button>
                </div>

               
                {loading && (
                    <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-300">
                        <Loader2 className="w-12 h-12 animate-spin text-black mb-4"/>
                        <p className="font-mono text-xs text-black font-bold">{t('community.loading')}</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="p-8 border-4 border-black bg-gray-100 text-black font-mono text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                        {error}
                    </div>
                )}

                {!loading && !error && filteredPosts.length === 0 && (
                    <div className="text-center py-20 border-4 border-dashed border-gray-300">
                        <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="font-bold text-gray-400 font-mono">{t('community.no_data')}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.map(post => (
                        <motion.div 
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative group hover:-translate-y-1 transition-transform duration-300"
                        >
                            
                            <div className="flex justify-between items-center p-3 border-b-2 border-black bg-white">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-[10px] font-bold font-mono border border-black">
                                        {post.userName ? post.userName.slice(0,2).toUpperCase() : "U"}
                                    </div>
                                    <div className="text-xs font-bold font-mono text-black">
                                        SUB_{post.userName ? post.userName.toUpperCase() : "UNKNOWN"}
                                    </div>
                                    {post.userGroup && (
                                            <span className="bg-black text-white px-1.5 py-0.5 text-[9px] font-mono font-bold border border-black">
                                                {post.userGroup}
                                            </span>
                                        )}
                                </div>
                                <div className="text-[10px] font-mono text-black font-bold flex items-center gap-1 bg-gray-100 px-1 border border-black">
                                    <Clock className="w-3 h-3"/>
                                    {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleDateString() : t('community.time_just_now')}
                                </div>
                            </div>

                           
                            {activeTab === 'TEMPLATE' ? (
                                <>
                                    <MiniCatPreview equippedIds={post.equippedIds || []} />
                                    
                                    {post.saliencyScore && (
                                        <div className="absolute top-12 right-2 bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                                            <div className="text-[9px] text-black font-mono leading-none border-b border-black pb-0.5 mb-0.5">{t('community.snr_score')}</div>
                                            <div className="text-lg font-black leading-none text-black">
                                                {post.saliencyScore}%
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="aspect-video bg-gray-100 relative flex items-center justify-center overflow-hidden border-b-4 border-black">
                                    {post.evidenceImgUrl ? (
                                        <img src={post.evidenceImgUrl} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"/>
                                    ) : (
                                        <div className="text-black font-mono text-xs flex flex-col items-center">
                                            <ImageOff className="w-8 h-8 mb-2"/>
                                            {t('community.corrupted')}
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-0.5 font-mono border border-white">
                                       
                                        {t('community.live_footage')}
                                    </div>
                                </div>
                            )}

                            
                            <div className="p-4 bg-white mt-auto">
                                <div className="flex flex-wrap gap-1 mb-4 min-h-[24px]">
                                    {(post.comments || []).length > 0 ? (
                                        post.comments.slice(-4).map((tag: string, i: number) => (
                                            <span key={i} className="bg-white border border-black px-1.5 py-0.5 text-[10px] font-mono text-black font-bold uppercase hover:bg-black hover:text-white transition-colors cursor-default">
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-gray-400 font-mono italic">{t('community.awaiting_review')}</span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t-2 border-dashed border-gray-300 pt-3">
                                    <button 
                                        onClick={() => handleValidate(post.id, post.likes)}
                                        className="flex items-center gap-2 group"
                                    >
                                        <div className="p-2 bg-white text-black rounded-full border-2 border-black group-hover:bg-black group-hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-active:translate-y-0.5 group-active:shadow-none">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-xs font-bold text-black group-hover:underline decoration-2">
                                                {t('community.verify')}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {post.likes || 0}
                                            </span>
                                        </div>
                                    </button>

                                    <div className="flex gap-1">
                                        {[{ label: 'High SNR', emoji: '⚡' }, { label: 'Confirmed', emoji: '✅' }, { label: 'Interesting', emoji: '🤔' }].map(opt => (
                                            <button 
                                                key={opt.label}
                                                onClick={() => handleNote(post.id, opt.label)}
                                                className="w-8 h-8 flex items-center justify-center border border-transparent hover:border-black hover:bg-gray-100 transition-all text-sm rounded-sm"
                                                title={opt.label}
                                            >
                                                <span className="grayscale">{opt.emoji}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
