import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, Eye, Target, Server, ShieldCheck, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 样式工具函数
const cn = (...classes: (string | boolean | null | undefined)[]) => {
    return classes.filter(Boolean).join(' ');
};

// Markdown 解析组件
const RenderText = ({ text }: { text: string }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-black">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

// 按钮组件
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    icon?: LucideIcon;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', icon: Icon, children, style, ...props }, ref) => {
        const baseStyle = 'inline-flex items-center justify-center rounded-lg font-medium py-3 px-6 transition-all duration-200 disabled:opacity-50 font-arcade text-lg border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none';
        
        // 样式变体
        const variants = {
            // 注意：虽然这里写了 tailwind 类，但下方我们会用 style 属性进行强制覆盖
            primary: 'bg-white text-black border-black hover:bg-gray-200',
            secondary: 'bg-white text-red-600 border-red-600 hover:bg-red-50',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyle, variants[variant], className)}
                style={style} // 允许传入内联样式
                {...props}
            >
                {Icon && <Icon className="w-5 h-5 mr-2" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

// 主模态框组件
interface PrivacyPolicyModalProps {
    onAgree: () => void;
    onDecline: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onAgree, onDecline }) => {
    // 引入 ready 状态：只有当翻译资源加载完毕，ready 才会变为 true
    const { t, i18n, ready } = useTranslation();

    // 如果翻译还没加载好，显示一个加载圈，避免显示英文原文
    if (!ready) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        );
    }

    return (
        // key={i18n.language} 确保语言切换时组件彻底重绘
        <div key={i18n.language} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-4 border-black w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
                {/* 标题栏 */}
                <div className="flex items-center gap-3 border-b-4 border-black p-6 bg-yellow-50 flex-shrink-0">
                    <div className="p-2 bg-black text-white">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black font-arcade uppercase tracking-wide">
                            {t('privacy.title')}
                        </h2>
                        <p className="text-xs font-mono font-bold text-gray-500 mt-1">
                            PROTOCOL_VER: 2025.1.0 // SECURE
                        </p>
                    </div>
                </div>

                {/* 滚动内容区域 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white font-sans">
                    
                    {/* 简介部分 */}
                    <div className="p-4 border-l-4 border-black bg-gray-50 text-sm leading-relaxed text-gray-800">
                        <RenderText text={t('privacy.intro')} />
                    </div>

                    {/* Section 1: 数据收集 */}
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-black text-lg uppercase border-b-2 border-dashed border-gray-300 pb-2">
                            <Server className="w-5 h-5" /> {t('privacy.section1_title')}
                        </h3>
                        <ul className="space-y-3 pl-2">
                            {[1, 2, 3, 4].map((num) => (
                                <li key={num} className="flex gap-3 text-sm text-gray-700">
                                    <span className="font-bold font-mono text-black min-w-[24px]">0{num}.</span>
                                    <span>
                                        {/* @ts-ignore */}
                                        <RenderText text={t(`privacy.section1_item${num}`)} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Section 2: 眼动追踪 */}
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-black text-lg uppercase border-b-2 border-dashed border-gray-300 pb-2">
                            <Eye className="w-5 h-5" /> {t('privacy.section2_title')}
                        </h3>
                        <div className="bg-blue-50 border-2 border-black p-4 text-sm space-y-3">
                            <p className="flex gap-2">
                                <Target className="w-4 h-4 mt-1 flex-shrink-0" />
                                <span><RenderText text={t('privacy.section2_item1')} /></span>
                            </p>
                            <p className="flex gap-2">
                                <Eye className="w-4 h-4 mt-1 flex-shrink-0" />
                                <span><RenderText text={t('privacy.section2_item2')} /></span>
                            </p>
                            <p className="font-bold text-blue-900 border-l-2 border-blue-900 pl-2">
                                <RenderText text={t('privacy.section2_item3')} />
                            </p>
                            <p className="text-xs text-gray-500 italic pt-2 border-t border-blue-200">
                                * <RenderText text={t('privacy.section2_item4')} />
                            </p>
                        </div>
                    </div>

                    {/* Section 3: 其他/可选 */}
                    {t('privacy.section3_title') !== 'privacy.section3_title' && (
                        <div className="space-y-3">
                            <h3 className="flex items-center gap-2 font-black text-lg uppercase border-b-2 border-dashed border-gray-300 pb-2">
                                <AlertTriangle className="w-5 h-5" /> {t('privacy.section3_title')}
                            </h3>
                            <p className="text-sm text-gray-700">
                                <RenderText text={t('privacy.section3_desc')} />
                            </p>
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="p-6 border-t-4 border-black bg-gray-50 flex justify-end gap-4 flex-shrink-0">
                    <Button
                        variant="secondary"
                        onClick={onDecline}
                        icon={X}
                    >
                        {t('privacy.btn_decline') || "DECLINE"}
                    </Button>
                    
                    <Button
                        variant="primary"
                        onClick={onAgree}
                        icon={Check}
                        // 【强制修复】使用 style 属性强制覆盖颜色，解决优先级问题
                        style={{ backgroundColor: '#ffffff', color: '#000000' }}
                        className="border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
                    >
                        {t('privacy.btn_agree') || "I AGREE"}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};