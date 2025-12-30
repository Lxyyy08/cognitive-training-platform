import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/SettingsContent'; 
import { CatBox, PawButton } from '../ui/CatThemedComponents';
import { Volume2, VolumeX, Globe, Mic, Music, Monitor,Download,Database } from 'lucide-react';
import { generateThesisData } from '../../utils/simulationGenerator';
import { fetchAndDownloadRealData } from '../../utils/realDataFetcher';
export const SettingsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    
    
    const { 
        setLanguage, 
        volume, setVolume, 
        bgmVolume, setBgmVolume, 
        speak, stopSpeech 
    } = useSettings();

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        setLanguage(lang); 
    };

    const handleDownloadSimulation = () => {
        
        const csvContent = generateThesisData(120);
        
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'thesis_data_final_n120.csv'); 
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        
        
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
            <CatBox variant="sitting" title={`${t('settings.title') || '设置'} / SYSTEM CONFIG`}>
                <div className="space-y-12 p-6">
                    
                    {/* --- 1. language setting --- */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black flex items-center border-b-4 border-black pb-2">
                            <Globe className="w-8 h-8 mr-3 text-black" /> 
                            {t('settings.language') || '语言偏好'} (LANGUAGE)
                        </h3>
                        <div className="flex flex-wrap gap-6">
                            {['en', 'zh'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`px-8 py-4 border-4 border-black font-bold uppercase transition-all active:translate-y-1 active:shadow-none text-lg ${
                                        i18n.language === lang 
                                        ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(100,100,100,0.5)] transform -translate-y-1' 
                                        : 'bg-white text-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]'
                                    }`}
                                >
                                    {lang === 'zh' ? '中文' : 'ENGLISH'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- 2. audio setting --- */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black flex items-center border-b-4 border-black pb-2">
                            <Volume2 className="w-8 h-8 mr-3"/> 
                            音频设置 (AUDIO)
                        </h3>

                        {/* audio volumn */}
                        <div className="bg-gray-50 p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center mb-4 font-mono font-bold text-lg">
                                {volume === 0 ? <VolumeX className="w-6 h-6 mr-2"/> : <Mic className="w-6 h-6 mr-2"/>}
                                <span>{t('settings.volume') || '语音音量'} (VOICE): {Math.round(volume * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.1"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-4 bg-white rounded-lg appearance-none cursor-pointer border-2 border-black accent-black"
                            />
                        </div>

                        {/* BGM volumn */}
                        <div className="bg-gray-50 p-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center mb-4 font-mono font-bold text-lg">
                                <Music className="w-6 h-6 mr-2"/>
                                <span>背景音乐 (BGM): {Math.round(bgmVolume * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.05"
                                value={bgmVolume}
                                onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                                className="w-full h-4 bg-white rounded-lg appearance-none cursor-pointer border-2 border-black accent-black"
                            />
                        </div>
                    </div>

                    {/* --- 3. test --- */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black flex items-center border-b-4 border-black pb-2">
                            <Monitor className="w-8 h-8 mr-3"/> 
                            {t('settings.testArea') || '诊断测试'} (DIAGNOSTICS)
                        </h3>
                        <div className="flex gap-6">
                            <PawButton 
                                onClick={() => speak(t('settings.testText') || "System check. Audio system functional.")} 
                                variant="outline" 
                                className="flex-1"
                            >
                                <Mic className="w-5 h-5 mr-2"/> {t('settings.testVoice') || '测试语音'}
                            </PawButton>
                            
                            <PawButton 
                                onClick={stopSpeech} 
                                className="bg-red-600 border-red-900 text-white flex-1 hover:bg-red-700 hover:border-red-950 shadow-[4px_4px_0px_0px_rgba(150,0,0,1)]"
                            >
                                {t('settings.stopVoice') || '停止播放'}
                            </PawButton>
                        </div>

                        <div className="pt-4 border-t-2 border-dashed border-gray-300">
                                <p className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-widest">
                                    Admin Zone: Data Simulation
                                </p>
                                <PawButton 
                                    onClick={handleDownloadSimulation} 
                                    className="w-full bg-blue-600 border-blue-900 text-white hover:bg-blue-700 shadow-[4px_4px_0px_0px_rgba(0,0,150,0.5)]"
                                >
                                    <Download className="w-6 h-6 mr-2"/> 
                                    GENERATE THESIS DATA (N=120)
                                </PawButton>
                            </div>

                                <PawButton 
                                  onClick={fetchAndDownloadRealData} 
                                 className="w-full bg-red-800 border-red-950 text-white hover:bg-red-900 shadow-[4px_4px_0px_0px_rgba(100,0,0,0.5)]"
                                    >
                                  <Database className="w-6 h-6 mr-2"/> 
                         EXPORT REAL PILOT DATA (N=16)
                    </PawButton>
                    </div>

                </div>
            </CatBox>
        </div>
    );
};
