import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LogOut, Menu, X, Home, Gamepad2, BarChart3, Settings,
  Music, Music2, Eye, Lock, MessageCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContent'
import { useTranslation } from 'react-i18next'

const cn = (...classes: (string | boolean | null | undefined | number | bigint)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user?: { name: string; group: string }
  onLogout?: () => void
  isReportingUnlocked: boolean
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab, onTabChange, user, onLogout, isReportingUnlocked
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { isBgmPlaying, toggleBgm } = useSettings();
  const { t } = useTranslation();


  const isCommunityLocked = user?.group === 'G4';

  const navItems: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: t('nav.overview'), icon: Home }, 
    { id: 'training', label: t('nav.training'), icon: Gamepad2 },
    { id: 'reporting', label: t('nav.reporting'), icon: Eye },
    { id: 'progress', label: t('nav.progress'), icon: BarChart3 },
    { id: 'community', label: t('nav.community'), icon: MessageCircle },
    { id: 'settings', label: t('nav.settings'), icon: Settings }, 
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b-4 border-black shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="bg-black p-2 rounded-lg transform -rotate-3 border-2 border-transparent hover:border-black hover:bg-white hover:text-black transition-all group cursor-default">
             <Eye className="w-6 h-6 text-white group-hover:text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-black uppercase hidden sm:block">
            Cat Lab
          </span> 
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            
            
            let isLocked = false;
            let lockTip = "";

            if (item.id === 'reporting' && !isReportingUnlocked) {
                isLocked = true;
                lockTip = t('nav.locked_tip');
            } else if (item.id === 'community' && isCommunityLocked) {
                isLocked = true;
                lockTip = "Protocol G4: Access Restricted"; 
            }

            return (
              <button
                key={item.id}
                onClick={() => !isLocked && onTabChange(item.id)}
                disabled={isLocked}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg border-2 font-bold transition-all duration-200 relative group',
                  isActive
                    ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transform -translate-y-1'
                    : isLocked 
                      ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'
                      : 'bg-white text-black border-transparent hover:border-black hover:bg-gray-50'
                )}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <item.icon className="w-5 h-5" />}
                <span>{item.label}</span>
                
               
                {isLocked && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {lockTip}
                    </span>
                )}
              </button>
            );
          })}
        </nav>

    
        <div className="hidden md:flex items-center space-x-4 border-l-2 border-black pl-6 ml-2">
            <button 
                onClick={toggleBgm}
                className={cn(
                    "p-2 rounded-full border-2 transition-all",
                    isBgmPlaying 
                        ? "bg-black text-white border-black animate-pulse" 
                        : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"
                )}
                title={isBgmPlaying ? t('nav.music_off') : t('nav.music_on')}
            >
                {isBgmPlaying ? <Music className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
            </button>

            {user && (
                <div className="text-right">
                    <p className="font-bold text-sm text-black">{user.name}</p>
                    <span className="inline-block bg-black text-white text-xs px-2 py-0.5 rounded-sm font-mono border border-black">
                      {user.group}
                    </span>
                </div>
            )}
            {onLogout && (
                <button 
                    onClick={onLogout} 
                    className="p-2 rounded-lg border-2 border-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px]"
                    title={t('nav.logout')}
                >
                    <LogOut className="w-5 h-5" />
                </button>
            )}
        </div>

        
        <button className="md:hidden text-black p-2 border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none bg-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

   
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b-4 border-black overflow-hidden"
          >
            <div className="p-4 space-y-2">
               <button
                  onClick={toggleBgm}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold border-2 bg-white text-black border-black hover:bg-gray-100"
                >
                  {isBgmPlaying ? <Music className="w-5 h-5 text-green-600" /> : <Music2 className="w-5 h-5 text-gray-400" />}
                  <span>{isBgmPlaying ? t('nav.music_on') : t('nav.music_off')}</span>
                </button>

              {navItems.map((item) => {
               
                let isLocked = false;
                if (item.id === 'reporting' && !isReportingUnlocked) isLocked = true;
                if (item.id === 'community' && isCommunityLocked) isLocked = true;

                return (
                    <button
                    key={item.id}
                    disabled={isLocked}
                    onClick={() => {
                        if(!isLocked) {
                            onTabChange(item.id);
                            setIsOpen(false);
                        }
                    }}
                    className={cn(
                        'w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold border-2 transition-all',
                        isActive(item.id) 
                        ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(100,100,100,0.5)]'
                        : isLocked
                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-black border-black hover:bg-gray-100'
                    )}
                    >
                    {isLocked ? <Lock className="w-5 h-5" /> : <item.icon className="w-5 h-5" />}
                    <span>{item.label}</span>
                    </button>
                )
              })}
              
              <div className="pt-4 mt-4 border-t-2 border-dashed border-gray-300">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 border-black text-black font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>{t('nav.logout')}</span>
                  </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
  
  function isActive(id: string) { return activeTab === id; }
};
