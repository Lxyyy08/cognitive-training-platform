import React from 'react';
import { motion } from 'framer-motion';
import { Database, ShieldCheck, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ArtBackground from '../../ArtBackground'; 


const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const PaperTextureDefs = () => (
    <svg className="absolute w-0 h-0 pointer-events-none">
        <filter id="paper-noise-end">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0"/>
            <feBlend mode="multiply" in2="SourceGraphic" />
        </filter>
    </svg>
);

const RetroPaperBox = ({ children, title, className }: { children: React.ReactNode, title?: string, className?: string }) => {
    return (
        <div className={cn("relative group w-full max-w-2xl mx-auto px-4", className)}>
            <PaperTextureDefs />
            
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#f4f4f0]/90 shadow-sm z-20 rotate-1"
                 style={{ clipPath: 'polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)', opacity: 0.8 }} />
            
            
            <div className="absolute inset-0 bg-[#d6d3cb] transform rotate-2 rounded-sm shadow-md z-0" />
            <div className="absolute inset-0 bg-[#eae8e1] transform -rotate-1 rounded-sm shadow-sm z-0 translate-x-1 translate-y-1" />

           
            <div className="relative bg-[#fdfbf7] z-10 shadow-xl pb-8 pt-12 px-6 md:px-12 flex flex-col border border-gray-200"
                 style={{ filter: 'url(#paper-noise-end)' }}
            >
                {title && (
                    <div className="mb-8 text-center border-b-2 border-black border-dashed pb-4">
                        <h2 className="text-3xl font-black uppercase tracking-tighter font-mono text-black">
                            {title}
                        </h2>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};


interface ExperimentEndedScreenProps {
    userStats: {
        daysCompleted: number;
        totalReports: number;
    };
    onGoToCommunity: () => void;
}

export const ExperimentEndedScreen: React.FC<ExperimentEndedScreenProps> = ({ userStats, onGoToCommunity }) => {
    const { t } = useTranslation();

    return (
        <ArtBackground>
            <div className="min-h-screen flex items-center justify-center p-4 py-20">
                <RetroPaperBox title={t('end_screen.title')} className="mt-10">
                    <div className="flex flex-col items-center text-center">
                        
                     
                        <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center mb-6 border-4 border-double border-gray-300 shadow-xl"
                        >
                            <Database className="w-10 h-10" />
                        </motion.div>

                        <h3 className="text-sm font-mono font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">
                            {t('end_screen.subtitle')}
                        </h3>
                        
                        <h1 className="text-4xl md:text-5xl font-black font-mono text-black mb-6 tracking-tight">
                            {t('end_screen.thank_you')}
                        </h1>

                        <div className="font-serif text-lg text-gray-800 leading-relaxed mb-10 w-full text-left bg-yellow-50/50 p-6 border-l-4 border-black">
                            {t('end_screen.message')}
                        </div>

                      
                        <div className="grid grid-cols-3 gap-4 w-full mb-10">
                            {/* Days */}
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                className="border-2 border-black p-3 flex flex-col items-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                            >
                                <span className="text-3xl font-black font-mono">{userStats.daysCompleted}</span>
                                <span className="text-[10px] font-bold uppercase text-gray-500 mt-1">{t('end_screen.stat_days')}</span>
                            </motion.div>
                            
                            {/* Reports */}
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                                className="border-2 border-black p-3 flex flex-col items-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                            >
                                <span className="text-3xl font-black font-mono">{userStats.totalReports}</span>
                                <span className="text-[10px] font-bold uppercase text-gray-500 mt-1">{t('end_screen.stat_reports')}</span>
                            </motion.div>
                            
                            {/* Rating */}
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                                className="border-2 border-black p-3 flex flex-col items-center bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                            >
                                <div className="flex items-center gap-1">
                                    <span className="text-xl font-black font-mono">A+</span>
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">{t('end_screen.stat_contribution')}</span>
                            </motion.div>
                        </div>

                        
                        <button 
                            onClick={onGoToCommunity}
                            className="w-full bg-black text-white py-4 font-bold font-mono text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none"
                        >
                            <Terminal className="w-5 h-5" />
                            {t('end_screen.btn_community')}
                        </button>
                        
                        <div className="text-center pt-4">
                            <span className="text-[10px] font-mono text-gray-400">SESSION_ID: END_{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                        </div>

                    </div>
                </RetroPaperBox>
            </div>
        </ArtBackground>
    );
};
