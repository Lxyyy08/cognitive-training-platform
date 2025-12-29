import React, { useEffect, useState } from 'react';
import { 
    TrendingUp, Activity, Target, 
    BarChart2, Brain, Cat, Trophy 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { UserData } from '../../types';
import { useTranslation } from 'react-i18next';

// --- UI Components (Local Y2K Style) ---
//const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const StatCard = ({ title, value, subtext, icon: Icon }: any) => (
    <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
        <div className="flex items-start justify-between mb-4">
            <div className="p-3 border-2 border-black bg-black text-white">
                <Icon className="w-8 h-8" />
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest font-arcade">{title}</p>
            </div>
        </div>
        <div>
            <h3 className="text-5xl font-black text-black font-arcade">{value}</h3>
            {subtext && <p className="text-lg text-gray-600 mt-2 font-arcade bg-gray-100 inline-block px-2">{subtext}</p>}
        </div>
    </div>
);

// --- 复古风格折线图 ---
const RetroLineChart = ({ data }: { data: number[] }) => {
    const { t } = useTranslation();

    if (data.length < 2) return (
        <div className="h-48 flex items-center justify-center text-black font-arcade border-2 border-dashed border-black bg-gray-50">
            {t('dashboard.waitingData')}
        </div>
    );

    const maxVal = Math.max(...data, 1);
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (val / maxVal) * 80; // 留出一点边距
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-64 w-full relative p-4 border-2 border-black bg-white">
            {/* 网格背景 */}
            <div className="absolute inset-0 opacity-10" 
                 style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>
            
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible relative z-10">
                {/* 折线 */}
                <polyline
                    fill="none"
                    stroke="black"
                    strokeWidth="3" // 粗线条
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="square"
                />
                {/* 数据点：方块 */}
                {data.map((val, i) => {
                     const x = (i / (data.length - 1)) * 100;
                     const y = 100 - (val / maxVal) * 80;
                     return (
                         <rect key={i} x={x-1} y={y-1} width="2" height="2" fill="white" stroke="black" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                     )
                })}
            </svg>
        </div>
    );
};

interface ProgressDashboardProps {
    user: UserData;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ user }) => {
    const { t } = useTranslation();
    
    // 【配置】最高等级限制
    const MAX_LEVEL = 3;

    const [stats, setStats] = useState({
        totalSessions: 0,
        avgAccuracy: 0,
        currentLevel: 1,
        sightingsCount: 0,
        accuracyHistory: [] as number[],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let collectionName = 'gazeData';
                if (user.group === 'G4') collectionName = 'nbackData';
                if (user.group === 'G1') collectionName = 'g1_sessions';

                const qTraining = query(
                    collection(db, 'users', user.uid, collectionName),
                    orderBy('submittedAt', 'desc'),
                    limit(10)
                );
                const trainingSnap = await getDocs(qTraining);
                
                const history: number[] = [];
                let totalAcc = 0;
                
                trainingSnap.forEach(doc => {
                    const data = doc.data();
                    const score = data.accuracy !== undefined ? data.accuracy : (data.blocksCompleted ? 1 : 0);
                    history.push(score);
                    totalAcc += score;
                });
                history.reverse(); 

                const qSightings = query(
                    collection(db, 'sightings'),
                    where('userId', '==', user.uid)
                );
                const sightingSnap = await getDocs(qSightings);
                let totalSightings = 0;
                sightingSnap.forEach(doc => {
                    totalSightings += (doc.data().sightingCount || 0);
                });

                let level = 1;
                if (user.group === 'G2' || user.group === 'G3') level = user.trainingLevels?.g2_attention || 1;
                if (user.group === 'G4') level = user.trainingLevels?.g4_nback || 1;

                setStats({
                    totalSessions: trainingSnap.size, 
                    avgAccuracy: trainingSnap.size > 0 ? (totalAcc / trainingSnap.size) : 0,
                    currentLevel: level,
                    sightingsCount: totalSightings,
                    accuracyHistory: history
                });

            } catch (error) {
                console.error("Error loading progress:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.uid, user.group, user.trainingLevels]);

    // 【新增】辅助函数：获取组别特定的技能名称
    const getSkillName = () => {
        if (user.group === 'G4') return "Working Memory (N-Back)";
        if (user.group === 'G1') return "Visualization Stability";
        return "Attention Filter & Gaze Control"; // G2 & G3
    };

    // 【新增】判断是否满级
    const isMaxLevel = stats.currentLevel >= MAX_LEVEL;

    if (loading) {
        return <div className="p-20 text-center text-black font-arcade text-2xl animate-pulse">{t('dashboard.loading')}</div>;
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-arcade">
            <div className="border-b-4 border-black pb-4 flex justify-between items-end">
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter flex items-center">
                    <BarChart2 className="w-10 h-10 mr-4" />
                    {t('dashboard.title')}
                </h2>
                <span className="text-xl bg-black text-white px-4 py-1 transform -skew-x-12">
                    {t('dashboard.group')}: {user.group}
                </span>
            </div>

            {/* 核心指标 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={t('dashboard.currentLevel')} 
                    // 如果满级，显示 MAX
                    value={isMaxLevel ? "MAX" : `LV.${stats.currentLevel}`} 
                    subtext={user.group === 'G4' ? t('dashboard.memoryCapacity') : t('dashboard.attentionDepth')}
                    icon={Brain}
                />
                <StatCard 
                    title={t('dashboard.avgAccuracy')} 
                    value={`${(stats.avgAccuracy * 100).toFixed(0)}%`} 
                    subtext={t('dashboard.lastSessions')}
                    icon={Activity}
                />
                <StatCard 
                    title={t('dashboard.sightings')} 
                    value={stats.sightingsCount} 
                    subtext={t('dashboard.targetManifestations')}
                    icon={Cat}
                />
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左侧：曲线图 */}
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
                        <h3 className="text-2xl font-bold text-black flex items-center uppercase">
                            <TrendingUp className="w-6 h-6 mr-2"/>
                            {t('dashboard.performanceLog')}
                        </h3>
                    </div>
                    <RetroLineChart data={stats.accuracyHistory} />
                    <p className="text-lg text-gray-600 mt-4 font-medium">
                        {t('dashboard.trendAnalysis')} 
                        {stats.accuracyHistory.length > 2 && stats.accuracyHistory[stats.accuracyHistory.length-1] > stats.accuracyHistory[0] 
                            ? <span className="bg-black text-white px-2 ml-2">{t('dashboard.trendUp')}</span> 
                            : <span className="bg-gray-200 text-black px-2 ml-2">{t('dashboard.trendStable')}</span>}
                    </p>
                </div>

                {/* 右侧：目标 (Target Section) */}
                <div className="bg-black text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(100,100,100,1)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center mb-6 border-b-2 border-white pb-2 uppercase">
                            <Target className="w-6 h-6 mr-2"/>
                            {t('dashboard.nextObjectives')}
                        </h3>
                        <div className="space-y-6">
                            {/* 目标 1: 技能升级目标 */}
                            <div className={`flex items-center justify-between p-4 border-2 ${isMaxLevel ? 'border-yellow-400 bg-gray-900' : 'border-white bg-gray-900'}`}>
                                <div>
                                    {/* 显示具体的技能名称 */}
                                    <span className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                                        {getSkillName()}
                                    </span>
                                    
                                    {/* 等级显示逻辑 */}
                                    <span className={`text-xl ${isMaxLevel ? 'text-yellow-400 font-black' : 'text-white'}`}>
                                        {isMaxLevel 
                                            ? "MAX LEVEL REACHED" 
                                            : `${t('dashboard.upgradeTo')} ${stats.currentLevel + 1}`
                                        }
                                    </span>
                                </div>
                                
                                {/* 只有未满级才显示准确率要求，满级显示奖杯 */}
                                {!isMaxLevel ? (
                                    <span className="text-sm bg-white text-black px-2 py-1">
                                        {t('dashboard.reqAcc')}
                                    </span>
                                ) : (
                                    <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
                                )}
                            </div>

                            {/* 目标 2: 目击报告目标 */}
                            <div className="flex items-center justify-between p-4 border-2 border-white bg-gray-900">
                                <div>
                                    <span className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                                        REALITY MANIFESTATION
                                    </span>
                                    <span className="text-xl">{t('dashboard.totalSightings')}: 5</span>
                                </div>
                                <span className="text-sm bg-white text-black px-2 py-1">{t('dashboard.current')}: {stats.sightingsCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-gray-700 opacity-80">
                         <div className="text-lg">
                            {t('dashboard.systemTip')}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};