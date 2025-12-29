import React, { useState, useRef } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import { 
    Cat, Send, CheckCircle2, AlertCircle, Loader2, Camera, X,
    PenTool
} from 'lucide-react';

import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserData } from '../../types';
import { useTranslation } from 'react-i18next';

// ==========================================
// 1. 工具与通用配置 (Utils)
// ==========================================
const cn = (...classes: (string | boolean | null | undefined)[]) => classes.filter(Boolean).join(' ');

const STYLE = {
    black: '#1a1a1a',
    white: '#ffffff',
    paper: '#fdfbf7', 
    paperDark: '#f0efe9',
};

// ==========================================
// 2. 艺术背景组件 (ArtBackground)
// ==========================================
const ArtBackground = ({ children }: { children: React.ReactNode }) => {
    // ... ArtBackground 代码保持不变 (为了节省篇幅，这里省略，请保留你原有的 ArtBackground 代码) ...
    // 如果需要我完整贴出 ArtBackground 请告诉我，但通常它不需要修改。
    // 这里为了代码运行，我放一个简化版的占位，你实际使用时保留原来的即可。
    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-[#e5e5e5]">
            <div className="relative z-10 w-full h-full overflow-y-auto">
                {children}
            </div>
        </div>
    );
};

// ==========================================
// 3. 复古艺术组件 (RetroArtComponents)
// ==========================================

const RetroStyles = () => (
    <style>{`
        .clip-path-button {
            clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
    `}</style>
);

const PaperTextureDefs = () => (
    <svg className="absolute w-0 h-0 pointer-events-none">
        <filter id="paper-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0"/>
            <feBlend mode="multiply" in2="SourceGraphic" />
        </filter>
        <filter id="rough-edge">
             <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>
             <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
    </svg>
);

const MaskingTape = ({ className }: { className?: string }) => (
    <div className={cn("absolute h-10 w-32 bg-[#f4f4f0]/90 shadow-sm backdrop-blur-[1px] z-50", className)}
        style={{
            clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)',
            maskImage: 'linear-gradient(45deg, transparent 2%, black 2%, black 98%, transparent 98%)',
            transform: 'rotate(-2deg)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
    >
        <div className="w-full h-full opacity-30 bg-yellow-100 mix-blend-multiply" />
    </div>
);

const PawRatingIcon = ({ className, filled }: { className?: string, filled: boolean }) => (
    <svg viewBox="0 0 100 100" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 50 55 C 20 55 20 90 50 90 C 80 90 80 55 50 55 Z" />
        <circle cx="20" cy="40" r="10" />
        <circle cx="40" cy="25" r="10" />
        <circle cx="60" cy="25" r="10" />
        <circle cx="80" cy="40" r="10" />
    </svg>
);

const SketchyCatSVG = () => (
    <div className="absolute -top-[50px] right-8 w-24 h-16 z-30 pointer-events-none mix-blend-multiply opacity-90">
        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
            <path d="M 20 50 Q 50 20 80 50 L 90 50 L 10 50 Z" fill={STYLE.black} filter="url(#rough-edge)" />
            <circle cx="20" cy="45" r="14" fill={STYLE.black} filter="url(#rough-edge)" />
            <path d="M 12 38 L 6 24 L 24 32 Z" fill={STYLE.black} filter="url(#rough-edge)" />
            <path d="M 12 38 L 15 24 L 24 32 Z" fill={STYLE.black} filter="url(#rough-edge)" />
            <path d="M 14 45 Q 17 48 20 45" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
            <motion.path 
                d="M 80 50 Q 95 20 95 40" stroke={STYLE.black} strokeWidth="6" fill="none" strokeLinecap="round"
                style={{ originX: 0.8, originY: 1 }}
                animate={{ d: ["M 80 50 Q 90 10 100 30", "M 80 50 Q 95 40 90 55", "M 80 50 Q 90 10 100 30"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </div>
);

const RetroPaperBox = ({ children, title, className }: { children: React.ReactNode, title?: string, className?: string }) => {
    const { t } = useTranslation();

    return (
        <div className={cn("relative mt-24 mb-10 group w-full max-w-2xl mx-auto px-4", className)}>
            <RetroStyles />
            <PaperTextureDefs />

            <SketchyCatSVG />
            <MaskingTape className="-top-5 left-1/2 -translate-x-1/2 rotate-1" />
            
            <div className="absolute inset-0 bg-[#d6d3cb] transform rotate-2 rounded-sm shadow-md z-0" 
                 style={{ filter: 'url(#paper-noise)' }} />
            
            <div className="absolute inset-0 bg-[#eae8e1] transform -rotate-1 rounded-sm shadow-sm z-0 translate-x-1 translate-y-1" 
                 style={{ filter: 'url(#paper-noise)' }} />

            <div className="relative bg-[#fdfbf7] z-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] pb-8 pt-12 px-6 md:px-12 min-h-[600px] flex flex-col"
                 style={{ 
                     filter: 'url(#paper-noise)',
                     backgroundImage: 'linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)',
                     backgroundSize: '40px 40px',
                     backgroundPosition: '-1px -1px'
                 }}
            >
                {title && (
                    <div className="mb-10 flex flex-col items-center border-b-2 border-black/80 pb-6 border-dashed">
                        <div className="flex items-center gap-2 mb-2 opacity-60">
                            <PenTool className="w-4 h-4" />
                            <span className="font-mono text-xs tracking-[0.2em] uppercase">{t('report.log_label')}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter font-mono text-black transform -rotate-1">
                            {title}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 font-mono text-xs font-bold bg-black text-white px-2 py-0.5">
                            <span>{t('report.confidential')}</span>
                            <span>///</span>
                            <span>REF-09</span>
                        </div>
                    </div>
                )}

                <div className="relative flex-1">
                    {children}
                </div>

                <div className="absolute bottom-4 right-6 font-mono text-xs text-gray-400">
                    {t('report.page_info')}
                </div>
            </div>
        </div>
    );
};

const InkButton = ({ className, children, variant = 'filled', loading = false, icon: Icon, disabled, ...props }: any) => {
    const isFilled = variant === 'filled';
    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.02, y: -1 } : undefined}
            whileTap={!disabled ? { scale: 0.98, y: 1 } : undefined}
            disabled={disabled}
            type={props.type || "button"}
            onClick={props.onClick}
            className={cn(
                "relative group inline-flex items-center justify-center font-bold font-mono tracking-wider px-8 py-4 border-2 border-black transition-all clip-path-button",
                disabled ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed" : 
                (isFilled ? "bg-black text-[#fdfbf7]" : "bg-transparent text-black hover:bg-black/5"),
                className
            )}
            style={{
                boxShadow: isFilled && !disabled ? '4px 4px 0px 0px rgba(0,0,0,0.8)' : 'none'
            }}
        >
             {isFilled && <div className="absolute inset-0 opacity-20" style={{ filter: 'url(#paper-noise)' }} />}

            <span className="relative z-10 flex items-center gap-3 text-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
                {children}
            </span>
        </motion.button>
    );
};

// ==========================================
// 4. 业务逻辑组件 (SightingReportForm)
// ==========================================
interface SightingReportFormProps {
    user: UserData;
    onReportSubmit?: () => void;
}

export const SightingReportForm: React.FC<SightingReportFormProps> = ({ user, onReportSubmit }) => {
    const { t } = useTranslation();
    const [hasSighted, setHasSighted] = useState<boolean | null>(null);
    const [count, setCount] = useState(1); 
    const [confidence, setConfidence] = useState(0); 
    const [description, setDescription] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024 * 3) { // 3MB Limit
                alert(t('report.error_image_size') || "Image too large (Max 3MB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setImageBase64(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImageBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (hasSighted === null) return;
        if (hasSighted && (confidence === 0 || count < 1)) {
            alert(t('report.error_incomplete') || "Please complete all fields.");
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // ======================================================
            // 核心修改：统一数据格式以适配 CommunityPage
            // ======================================================
            const reportData = {
                // 1. 基础身份信息 (社区显示用)
                userId: user.uid,
                userName: user.name || "Anonymous", // 必须有，社区页面显示用
                userGroup: user.group, 
                
                // 2. 核心内容 (映射到社区帖子的结构)
                content: hasSighted ? description : (t('report.default_not_sighted') || "No sighting reported today."), 
                
                // 【关键修正】字段名必须是 evidenceImgUrl，CommunityPage 才能识别并显示图片！
                evidenceImgUrl: imageBase64 || null, 
                
                // 3. 元数据 (Metadata)
                type: 'SIGHTING_REPORT',
                timestamp: serverTimestamp(), // 社区页面排序用
                reportDate: serverTimestamp(), // 存档用
                
                // 4. 科学数据 (保留供后续分析)
                hasSighted: hasSighted,
                sightingCount: hasSighted ? count : 0,
                confidence: hasSighted ? confidence : null,
                dayOfExperiment: "Day 4-5 (Test Phase)",
                
                // 5. 互动初始值 (防止社区页面报错)
                likes: 0,
                comments: []
            };

            // 【关键修改】存入 'community_posts' 集合，这样才能在社区的 Field Evidence 中刷出来
            await addDoc(collection(db, 'community_posts'), reportData);
            
            // 如果你也想保留一份纯净的目击数据，可以取消下面这行的注释
            // await addDoc(collection(db, 'sightings'), reportData);
            
            setIsSuccess(true);
            if (onReportSubmit) setTimeout(onReportSubmit, 2000);
        } catch (error) {
            console.error("提交失败:", error);
            alert(t('report.error_network') || "Network Error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <ArtBackground>
                <div className="flex items-center justify-center min-h-[80vh]">
                    <RetroPaperBox title={t('report.title_status')}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-24 h-24 border-4 border-black rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 border-2 border-dashed border-black rounded-full animate-spin-slow" />
                                <CheckCircle2 className="w-10 h-10 text-black" />
                            </div>
                            <h2 className="text-4xl font-black text-black mb-4 font-mono tracking-tighter transform -rotate-2">
                                {t('report.title_mission')}
                            </h2>
                            <p className="text-gray-600 mb-12 font-mono max-w-xs mx-auto text-sm leading-relaxed border-t border-b border-gray-300 py-4">
                                {t('report.desc_archived')}
                            </p>
                            <InkButton 
                                variant="outline"
                                onClick={() => {
                                    setIsSuccess(false); setHasSighted(null); setConfidence(0);
                                    setCount(1); setDescription(''); setImageBase64(null);
                                }}
                            >
                                {t('report.btn_new_entry')}
                            </InkButton>
                        </div>
                    </RetroPaperBox>
                </div>
            </ArtBackground>
        );
    }

    return (
        <ArtBackground>
            <div className="py-10">
                <RetroPaperBox title={t('report.title_daily')}>
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Q1: 是否看到 */}
                        <div className="space-y-5">
                            <label className="text-xl font-bold flex items-center text-black font-mono tracking-tight border-l-4 border-black pl-4">
                                {t('report.q1_label')}
                            </label>
                            <div className="grid grid-cols-2 gap-6">
                                <button
                                    type="button"
                                    onClick={() => setHasSighted(true)}
                                    className={cn(
                                        "p-6 border-2 transition-all duration-300 flex flex-col items-center gap-3 relative overflow-hidden",
                                        hasSighted === true 
                                            ? "bg-black text-[#fdfbf7] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transform -translate-y-1 rotate-1" 
                                            : "bg-transparent border-black text-black hover:bg-black/5"
                                    )}
                                >
                                    <Cat className={cn("w-10 h-10", hasSighted === true ? "text-[#fdfbf7]" : "text-black")} />
                                    <span className="font-bold font-mono uppercase tracking-wider">{t('report.q1_yes')}</span>
                                    {hasSighted === true && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4" /></div>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setHasSighted(false)}
                                    className={cn(
                                        "p-6 border-2 transition-all duration-300 flex flex-col items-center gap-3",
                                        hasSighted === false 
                                            ? "bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -translate-y-1 -rotate-1" 
                                            : "bg-transparent border-dashed border-gray-400 text-gray-400 hover:border-black hover:text-black"
                                    )}
                                >
                                    <AlertCircle className="w-10 h-10" />
                                    <span className="font-bold font-mono uppercase tracking-wider">{t('report.q1_no')}</span>
                                </button>
                            </div>
                        </div>

                        {/* 展开的表单内容 */}
                        <AnimatePresence>
                            {hasSighted === true && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0, filter: 'blur(5px)' }}
                                    animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, height: 0, filter: 'blur(5px)' }}
                                    className="space-y-8 overflow-hidden pt-4"
                                >
                                    <div className="w-full h-px bg-black/20 border-t border-dashed border-black my-4" />

                                    {/* Q2 & Q3: 数量和置信度 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-lg font-bold text-black font-mono tracking-tight border-l-4 border-black pl-3">
                                                {t('report.q2_label')}
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    value={count}
                                                    onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-transparent border-b-2 border-black px-2 py-2 text-black font-black font-mono text-3xl focus:outline-none focus:border-black/50 transition-colors"
                                                />
                                                <div className="absolute right-0 bottom-3 font-mono text-xs text-gray-500 uppercase tracking-widest">{t('report.q2_unit')}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <label className="text-lg font-bold text-black font-mono tracking-tight border-l-4 border-black pl-3">
                                                {t('report.q3_label')}
                                            </label>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                                                    <button
                                                        key={score}
                                                        type="button"
                                                        onClick={() => setConfidence(score)}
                                                        className={cn(
                                                            "w-10 h-10 flex items-center justify-center rounded-sm border-2 font-bold transition-all",
                                                            score <= confidence 
                                                                ? "bg-black border-black text-white transform -rotate-3" 
                                                                : "bg-transparent border-gray-300 text-gray-400 hover:border-black hover:text-black"
                                                        )}
                                                    >
                                                        {score <= confidence ? (
                                                            <PawRatingIcon className="w-5 h-5" filled />
                                                        ) : (
                                                            <span className="text-xs font-mono">{score}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Q4: 描述 */}
                                    <div className="space-y-3">
                                        <label className="text-lg font-bold text-black font-mono tracking-tight border-l-4 border-black pl-3">
                                            {t('report.q4_label')}
                                        </label>
                                        <div className="relative p-1 bg-white/50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                                            <textarea 
                                                rows={4}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder={t('report.q4_placeholder')}
                                                className="w-full bg-transparent p-4 text-black font-mono text-sm focus:outline-none resize-none placeholder:text-gray-400 placeholder:italic"
                                                style={{
                                                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)',
                                                    lineHeight: '32px',
                                                    paddingTop: '6px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Q5: 上传图片 (关键区域) */}
                                    <div className="space-y-3">
                                        <label className="text-lg font-bold text-black font-mono tracking-tight border-l-4 border-black pl-3 flex items-center justify-between">
                                            <span>{t('report.q5_label')}</span>
                                            <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-sm">{t('report.optional')}</span>
                                        </label>
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "relative border-2 border-dashed rounded-sm p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group min-h-[160px]",
                                                imageBase64 
                                                    ? "border-black bg-white" 
                                                    : "border-gray-400 hover:border-black hover:bg-black/5"
                                            )}
                                        >
                                            {imageBase64 && <div className="absolute -top-3 -right-3 w-16 h-6 bg-white/80 rotate-45 shadow-sm z-20 border border-gray-200" />}

                                            {imageBase64 ? (
                                                <div className="relative w-full flex justify-center rotate-1">
                                                    <img src={imageBase64} alt="Evidence" className="max-h-48 object-cover border-4 border-white shadow-lg" />
                                                    <button 
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="absolute -top-4 -left-4 bg-red-600 text-white rounded-full p-1 border-2 border-white shadow-md hover:scale-110 transition-transform z-30"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center group-hover:scale-105 transition-transform opacity-60 group-hover:opacity-100">
                                                    <Camera className="w-8 h-8 text-black mx-auto mb-2" />
                                                    <p className="font-bold font-mono text-black text-xs uppercase tracking-widest">{t('report.attach_photo')}</p>
                                                </div>
                                            )}
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload}
                                                className="hidden" 
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-6">
                            <InkButton 
                                type="submit" 
                                className="w-full text-xl" 
                                loading={isSubmitting}
                                disabled={hasSighted === null}
                                icon={Send}
                            >
                                {t('report.btn_submit')}
                            </InkButton>
                            <div className="text-center mt-4">
                                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.3em]">
                                    {t('report.secure_msg')}
                                </span>
                            </div>
                        </div>

                    </form>
                </RetroPaperBox>
            </div>
        </ArtBackground>
    );
};