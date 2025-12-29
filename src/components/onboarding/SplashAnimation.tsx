// src/components/onboarding/SplashAnimation.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Cat, PawPrint,  Moon } from 'lucide-react';
import { Button } from '../ui/Button'; // 假设你有一个 Button 组件

interface SplashAnimationProps {
  onComplete: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);

  const animationSteps = [
    {
      duration: 2000,
      content: (
        <motion.div
          key="step1"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center"
        >
          {/* 动画方块改为黑白配色 */}
          <div className="w-32 h-32 bg-arcade-gray-900 to-arcade-black rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl border-4 border-arcade-white">
            <Cat className="w-16 h-16 text-arcade-white" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-3xl font-bold uppercase text-arcade-white font-arcade"
          >
            黑猫乐园启动中...
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-4 text-arcade-gray-400 font-arcade"
          >
            加载像素艺术体验
          </motion.p>
        </motion.div>
      ),
    },
    {
      duration: 2500,
      content: (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* 动画图标改为黑白配色 */}
          <PawPrint className="w-24 h-24 mx-auto mb-8 text-arcade-white animate-paw-print" />
          <h1 className="text-3xl font-bold uppercase text-arcade-white font-arcade">
            冒险模式加载
          </h1>
          <p className="mt-4 text-arcade-gray-400 font-arcade">
            准备迎接黑白世界的挑战
          </p>
        </motion.div>
      ),
    },
    {
      duration: 1500,
      content: (
        <motion.div
          key="step3"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* 动画图标改为黑白配色 */}
          <Moon className="w-24 h-24 mx-auto mb-8 text-arcade-white animate-spin-slow" />
          <h1 className="text-3xl font-bold uppercase text-arcade-white font-arcade">
            系统初始化完成
          </h1>
          <p className="mt-4 text-arcade-gray-400 font-arcade">
            点击进入乐园
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            {/* 使用普通的黑色 Button，因为 Splash 阶段 cat-button 可能未完全加载 */}
            <Button 
              onClick={onComplete}
              variant="primary" // 默认 primary 样式
              className="bg-arcade-white text-arcade-black hover:bg-arcade-gray-100" // 确保按钮是黑白风格
              size="lg"
            >
              进入乐园
            </Button>
          </motion.div>
        </motion.div>
      ),
    },
  ];

  // ----------------------------------------------------
  // 【修复后的 useEffect 逻辑】
  // ----------------------------------------------------
  useEffect(() => {
    // 1. 如果已跳过，立即停止所有计时器逻辑
    if (isSkipped) {
      return;
    }

    const currentDuration = animationSteps[currentStep].duration;

    if (currentStep < animationSteps.length - 1) {
      // 2. 正常情况下，切换到下一个步骤
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, currentDuration);
      return () => clearTimeout(timer);
    } else {
      // 3. 如果到了最后一步，在持续时间后调用 onComplete 结束动画
      const finalTimer = setTimeout(onComplete, currentDuration);
      return () => clearTimeout(finalTimer);
    }
  }, [currentStep, isSkipped, onComplete, animationSteps.length]);
  // ----------------------------------------------------


  // ----------------------------------------------------
  // 【修复后的 handleSkip 函数】
  // ----------------------------------------------------
  const handleSkip = () => {
    // 关键修复：立即调用 onComplete()，通知父组件卸载此组件
    setIsSkipped(true);
    onComplete();
  };
  // ----------------------------------------------------

  return (
    // 整个背景改为黑白简约色，使用渐变强化艺术感
    <div className="fixed inset-0 bg-arcade-black z-50 flex items-center justify-center">
      {/* 顶部跳过按钮改为黑白灰 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={handleSkip} // 使用修复后的 handleSkip
        className="absolute top-6 right-6 flex items-center space-x-2 text-arcade-gray-400 hover:text-arcade-white transition-colors font-arcade text-sm"
      >
        <SkipForward className="w-4 h-4" />
        <span className="text-sm font-medium">跳过</span>
      </motion.button>

      {/* 进度条指示器改为黑白灰 */}
      <div className="absolute top-6 left-6 flex space-x-1">
        {animationSteps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentStep ? 'bg-arcade-white' : 'bg-arcade-gray-700' // 进度条颜色改为黑白
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="p-4"
        >
          {animationSteps[currentStep].content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};