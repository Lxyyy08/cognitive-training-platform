import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, Target, Gauge, 
  Loader2, 
  Sparkles, Brain, Zap, Layers, Lock, Lightbulb, RefreshCw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Firebase & Types
import { db } from '../../firebase'
import { getCountFromServer, collection, doc, getDoc } from 'firebase/firestore'
import type { UserData } from '../../types'
import { useSettings } from '../../contexts/SettingsContent'

// Components
import { Navigation } from './Navigation' 
import { VisualizationTrainingTask } from '../training/VisualizationTrainingTask'
import { AttentionTrainingTask } from '../training/AttentionTrainingTask'
import { MixedTrainingTask } from '../training/MixedTrainingTask'
import { NBackTask } from '../training/NBackTask'
import { ProgressDashboard } from '../dashboard/ProgressDashboard'
import { SightingReportForm } from '../reporting/SightingReportForm'
import { SettingsPage } from '../settings/SettingsPage' 
import { CatDressUpGame } from '../game/CatDressUpGame' 
import { CommunityPage } from '../Community/CommunityPage'

import { useTranslation } from 'react-i18next'

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');


const TRAINING_DAYS = 3; 
const TOTAL_DAYS = 5;


const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden", className)} {...props} />
);


const CognitiveTrivia = () => {
    const { t } = useTranslation();
    const [factIndex, setFactIndex] = useState(0);
    const TOTAL_FACTS = 5; 

    const nextFact = () => {
        setFactIndex((prev) => (prev + 1) % TOTAL_FACTS);
    };

    return (
        <Card className="mb-8 p-6 flex flex-col items-start min-h-[300px]">
            <div className="w-full flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-2">
                        <Lightbulb className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black font-arcade uppercase tracking-wide">
                        {t('main.trivia.title')}
                    </h3>
                </div>
                <span className="text-xs font-mono font-bold border border-black px-2 py-1">
                    {t('main.trivia.label_index')}: {factIndex + 1}/{TOTAL_FACTS}
                </span>
            </div>

            <div className="flex-1 space-y-4">
                <div className="inline-block bg-black text-white text-xs px-2 py-1 font-mono mb-2">
                     {/* @ts-ignore */}
                    {t(`main.trivia.facts.${factIndex}.tag`)}
                </div>
                <h4 className="text-xl font-bold font-sans">
                     {/* @ts-ignore */}
                    {t(`main.trivia.facts.${factIndex}.title`)}
                </h4>
                <p className="text-gray-700 font-mono leading-relaxed text-sm md:text-base">
                     {/* @ts-ignore */}
                    {t(`main.trivia.facts.${factIndex}.content`)}
                </p>
            </div>

            <div className="w-full mt-6 flex justify-end">
                <button 
                    onClick={nextFact}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-black font-bold hover:bg-black hover:text-white transition-all active:scale-95 shadow-[4px_4px_0px_0px_#000]"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('main.trivia.btn_next')}
                </button>
            </div>
        </Card>
    );
};


const GroupGuideCard = ({ group }: { group: string }) => {
    const { t } = useTranslation();

    const guides = {
        'G1': { title: t('main.guide.g1_title'), desc: t('main.guide.g1_desc'), icon: Brain },
        'G2': { title: t('main.guide.g2_title'), desc: t('main.guide.g2_desc'), icon: Zap },
        'G3': { title: t('main.guide.g3_title'), desc: t('main.guide.g3_desc'), icon: Layers },
        'G4': { title: t('main.guide.g4_title'), desc: t('main.guide.g4_desc'), icon: Sparkles }
    };

    
    const content = guides[group] || guides['G1'];
    const Icon = content.icon;

    return (
        <Card className="mb-8 border-black bg-white">
            <div className="flex flex-col md:flex-row">
                <div className="bg-black text-white p-6 flex flex-col justify-center items-center md:w-64 border-b-4 md:border-b-0 md:border-r-4 border-black">
                    <Icon className="w-16 h-16 mb-4" />
                    <span className="text-4xl font-arcade font-bold text-center">{group}</span>
                </div>
                <div className="p-8 flex-1 flex flex-col justify-center">
                    <h3 className="text-3xl font-bold mb-4 font-arcade uppercase tracking-wide">{content.title}</h3>
                    <p className="text-xl leading-relaxed text-gray-800 font-medium font-sans">
                        {content.desc}
                    </p>
                </div>
            </div>
        </Card>
    );
};


interface MainLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: UserData
  onLogout: () => void
  currentDay: number 
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
  currentDay 
}) => {
  const {  } = useSettings();
  const { t } = useTranslation();

  const [dynamicProgress, setDynamicProgress] = useState({
    day: 1,
    totalSessions: 0,
    completionRate: 0
  });

  const [stimuli, setStimuli] = useState<{target: string[], distractors: string[]}> ({
    target: ["https://placekitten.com/300/300"], 
    distractors: []
  });
  const [loadingStimuli, setLoadingStimuli] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  useEffect(() => {
    const calculateProgress = async () => {
      if (!user) return;
      

      let dayCount = currentDay;
      if (dayCount < 1) dayCount = 1;

      let collectionName = 'gazeData'; 
      if (user.group === 'G4') collectionName = 'nbackData';
      if (user.group === 'G1') collectionName = 'g1_sessions';
      if (user.group === 'G3') collectionName = 'g3_sessions';

      try {
        const collRef = collection(db, 'users', user.uid, collectionName);
        const snapshot = await getCountFromServer(collRef);
        const total = snapshot.data().count;
        const rate = Math.min(100, Math.round((total / dayCount) * 100));

        setDynamicProgress({
          day: dayCount,
          totalSessions: total,
          completionRate: rate
        });

      } catch (e) {
        console.error("Progress calculation error:", e);
      }
    };
    calculateProgress();
  }, [user, refreshTrigger, currentDay]); 

  
  useEffect(() => {
    const fetchStimuli = async () => {
      if(activeTab === 'training' && user.group !== 'G4') {
        setLoadingStimuli(true);
        try {
          const g1DocRef = doc(db,'stimuli','g1_cats');
          const g1Snap = await getDoc(g1DocRef);
          
          let targetUrls: string[] = ["https://placekitten.com/300/300"];
          
          if(g1Snap.exists() && g1Snap.data()?.urls?.length > 0) {
            const urls = g1Snap.data()!.urls;
            targetUrls = urls.sort(() => 0.5 - Math.random()).slice(0, 10);
          }

          const g2DocRef = doc(db,'stimuli','g2_distractors');
          const g2Snap = await getDoc(g2DocRef);
          let distractorUrls:string[] = [];
          if(g2Snap.exists() && g2Snap.data()?.urls?.length > 0){
            const urls = g2Snap.data()!.urls;
            distractorUrls = urls.sort(() => 0.5 - Math.random()).slice(0,10);
          }
          
          setStimuli({target: targetUrls, distractors: distractorUrls});

        } catch (error) {
          console.error("Error fetching stimuli:", error);
        } finally {
          setLoadingStimuli(false);
        }
      }
    };
    if(db) fetchStimuli();
  }, [activeTab, user.group]);

  const renderProgressCard = (icon: LucideIcon, title: string, value: string | number, unit: string) => (
    <div className="bg-white border-4 border-black p-4 flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform cursor-default">
        <div className="p-3 bg-black text-white mr-4 border-2 border-black">
            {React.createElement(icon, { className: "w-8 h-8" })}
        </div>
        <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest font-arcade">{title}</h3>
            <p className="text-4xl font-black text-black leading-none mt-1 font-arcade">
                {value}<span className="text-lg font-bold text-gray-400 ml-1">{unit}</span>
            </p>
        </div>
    </div>
  );

  const handleTaskComplete = () => {
      console.log("Task Completed! Refreshing and navigating home...");
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => {
          onTabChange('overview');
      }, 500); 
  };

  const isReportingUnlocked = dynamicProgress.day > TRAINING_DAYS;

  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between border-b-4 border-black pb-4">
                <div>
                    <h1 className="text-6xl font-black text-black tracking-tighter uppercase mb-0 font-arcade">
                        {t('main.lab_title', { group: user.group })}
                    </h1>
                    <p className="text-xl text-gray-600 font-arcade uppercase tracking-widest font-bold">
                        {t('main.welcome', { name: user?.name || 'User', day: dynamicProgress.day })}
                    </p>
                </div>
                <div className="text-right font-arcade text-xl hidden md:block">
                    <div>{t('main.status_user')}: {user.name}</div>
                    <div>{t('main.status_online')}</div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderProgressCard(Clock, t('main.stats.phase'), `Day ${dynamicProgress.day}`, `/ ${TOTAL_DAYS}`)}
              {renderProgressCard(Target, t('main.stats.sessions'), dynamicProgress.totalSessions, "")}
              {renderProgressCard(Gauge, t('main.stats.completion'), dynamicProgress.completionRate, "%")}
            </div>

            <GroupGuideCard group={user.group} />

            {user?.group === 'G4' ? (
                <CognitiveTrivia />
            ) : (
               <CatDressUpGame user={user} progress={dynamicProgress} />
            )}
          </div>
        )
      
      case 'training':
        if (dynamicProgress.day > TRAINING_DAYS) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
                    <div className="bg-green-100 p-6 rounded-full border-4 border-black mb-6">
                        <Sparkles className="w-16 h-16 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-black font-arcade mb-4">{t('main.training_complete.title')}</h2>
                    <p className="text-xl text-gray-600 font-sans max-w-md mx-auto mb-8">
                        {t('main.training_complete.desc_part1', { days: TRAINING_DAYS })}<br/>
                        {t('main.training_complete.desc_part2')} 
                        <span className="font-bold bg-black text-white px-2 py-1 mx-1">{t('main.training_complete.desc_highlight')}</span> 
                        {t('main.training_complete.desc_part3')}
                    </p>
                    <button 
                        onClick={() => onTabChange('reporting')}
                        className="bg-black text-white px-8 py-3 font-bold font-arcade border-4 border-black hover:bg-gray-800 hover:scale-105 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                    >
                        {t('main.training_complete.btn_go')}
                    </button>
                </div>
            );
        }
        
        if(loadingStimuli) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-black"/></div>;

        const {target: tImgs, distractors: dImgs} = stimuli;
        
        switch(user?.group) {
            case 'G1': 
              return <VisualizationTrainingTask 
                  user={user} 
                  targetImageUrls={tImgs} 
                  onSessionComplete={handleTaskComplete} 
              />;
            case 'G2': 
              return <AttentionTrainingTask 
                  user={user} 
                  level={user.trainingLevels?.g2_attention || 1} 
                  targetImageUrl={tImgs[0] || ""} 
                  distractorImageUrls={dImgs} 
                  onSessionComplete={handleTaskComplete} 
              />;
            case 'G3': 
              return <MixedTrainingTask 
                  user={user} 
                  level={user.trainingLevels?.g2_attention || 1} 
                  targetImageUrls={tImgs}
                  distractorImageUrls={dImgs} 
                  onOverallComplete={handleTaskComplete} 
              />;
            case 'G4': 
              return <NBackTask 
                  user={user} 
                  level={user.trainingLevels?.g4_nback || 1} 
                  onSessionComplete={handleTaskComplete} 
              />;
            default: return <div>Error: Group Not Found</div>;
        }

      case 'reporting':
          if (!isReportingUnlocked) {
              return (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50 select-none">
                      <div className="relative">
                          <Lock className="w-32 h-32 text-gray-300" />
                          <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-4xl font-black text-gray-400">?</span>
                          </div>
                      </div>
                      <h2 className="text-3xl font-black font-arcade mt-6 text-gray-400">{t('main.reporting_locked.title')}</h2>
                      <p className="mt-2 font-mono text-gray-500">
                          {t('main.reporting_locked.desc', { day: TRAINING_DAYS + 1 })}
                      </p>
                  </div>
              );
          }
          return <SightingReportForm user={user} onReportSubmit={() => {}} />;

      case 'progress':
          return <ProgressDashboard user={user} />;

      case 'settings':
          return <SettingsPage />;

      case 'community':
          if (user.group === 'G4') {
              return (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Lock className="w-20 h-20 text-black mb-4" />
                      <h2 className="text-3xl font-black font-arcade mb-2">{t('main.access_denied.title')}</h2>
                      <p className="font-mono text-gray-500">{t('main.access_denied.g4_msg')}</p>
                  </div>
              );
          }
          return <CommunityPage user={user} />;

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen text-black pt-24 pb-12 font-arcade bg-transparent">
      <Navigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        user={user}
        onLogout={onLogout}
        isReportingUnlocked={isReportingUnlocked}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
