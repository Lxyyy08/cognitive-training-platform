import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Eye, Target, Lightbulb, Search, Heart, TrendingUp, Zap, Brain, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { db } from '../../firebase'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import type { UserData } from '../../types'
import { useTranslation } from 'react-i18next'

const cn = (...classes: (string | boolean | null | undefined | number | bigint)[]) => classes.filter(Boolean).join(' ');

// =========================================================================
// 1. 复用 UI 组件 (与 PreTrainingQuestionnaire 保持风格一致)
// =========================================================================

const Button = React.forwardRef<HTMLButtonElement, any>(
    ({ className, variant = 'primary', children, disabled, loading, icon: Icon, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-bold font-arcade border-4 border-black transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100'
        const variants = {
            primary: 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-gray-800',
            secondary: 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-gray-100',
        }
        return (
            <button ref={ref} disabled={disabled || loading} className={cn(baseStyles, variants[variant as keyof typeof variants], 'px-6 py-3 text-xl', className)} {...props}>
                {children} {Icon && <Icon className="w-5 h-5 ml-2" />}
            </button>
        )
    }
)
Button.displayName = 'Button'

const Card = ({ className, ...props }: any) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("border-4 border-black bg-white text-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-3xl mx-auto", className)} {...props} />
);

// =========================================================================
// 2. 数据结构配置
// =========================================================================

type Question = { id: string; icon: LucideIcon; scale: string; };

// ID 必须与 zh.json/en.json 中的 "post_questions" key 对应
const POST_TEST_QUESTIONS: Question[] = [
    { id: 'Q1', scale: 'Attention', icon: Eye },
    { id: 'Q2', scale: 'Attention', icon: Target },
    { id: 'Q3', scale: 'Imagery', icon: Brain },
    { id: 'Q4', scale: 'Imagery', icon: Lightbulb },
    { id: 'Q5', scale: 'Motivation', icon: Heart },
    { id: 'Q6', scale: 'Expectancy', icon: TrendingUp },
    { id: 'Q7', scale: 'Expectancy', icon: Search },
    { id: 'Q8', scale: 'Current State', icon: Zap }, // 这一题的翻译已更改为反映"训练后"状态
];

interface PostTrainingQuestionnaireProps {
    user: UserData;
    onComplete: () => void;
}

export const PostTrainingQuestionnaire: React.FC<PostTrainingQuestionnaireProps> = ({ user, onComplete }) => {
    const { t } = useTranslation();
    
    // 初始化答案状态
    const [answers, setAnswers] = useState<{ [key: string]: number | null }>(
        POST_TEST_QUESTIONS.reduce((acc, q) => ({ ...acc, [q.id]: null }), {})
    );
    const [submitting, setSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleAnswerChange = (questionId: string, score: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: score }));
    };

    // 计算已回答数量
    const answeredCount = Object.values(answers).filter(a => a !== null).length;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // 1. 存入 postTest 集合 (对应数据分析中的 Post-Test 数据源)
            await setDoc(doc(db, 'users', user.uid, 'postTest', 'result'), { 
                answers, 
                submittedAt: serverTimestamp(),
                type: 'post-test',
                group: user.group // 冗余存一份 group，方便在子集合导出数据时直接查看
            });
            
            setIsSubmitted(true);
            setSubmitting(false);
            
            // 2. 延迟跳转，给用户展示成功动画
            setTimeout(async () => {
                // 更新用户主文档状态
                await updateDoc(doc(db, 'users', user.uid), { 
                    postTestCompleted: true, // 标记后测完成
                    studyCompleted: true     // 标记整个研究流程结束
                });
                onComplete(); 
            }, 2500);
        } catch (error) { 
            console.error("Post-test submit error:", error);
            setSubmitting(false); 
        }
    };

    // 评分按钮组件
    const ScoreOption = ({ score, selectedScore, onSelect }: any) => {
        const isSelected = selectedScore === score;
        return (
            <button 
                type="button" 
                onClick={() => onSelect(score)}
                className={cn(
                    "flex flex-col items-center justify-center w-10 h-12 sm:w-14 sm:h-16 border-4 border-black font-bold font-arcade transition-all duration-150",
                    "hover:-translate-y-1",
                    isSelected 
                        ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] transform scale-110 z-10" 
                        : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                )}
            >
                <span className="text-xl sm:text-3xl">{score}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-arcade bg-gray-100">
            <Card className="border-4 border-black">
                {/* 顶部标题栏 */}
                <div className="mb-8 border-b-4 border-black pb-4">
                    <h1 className="text-3xl md:text-4xl font-black uppercase flex items-center gap-3">
                        <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 fill-black" />
                        {/* 如果翻译文件还没加载，提供默认英文 */}
                        {t('questionnaire.post_title') || 'FINAL ASSESSMENT'}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mt-2 font-sans font-bold">
                        {t('questionnaire.post_subtitle') || 'Training Complete. Please evaluate your current state.'}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {isSubmitted ? (
                        <motion.div
                            key="submitted"
                            initial={{opacity:0,scale:0.9}}
                            animate={{opacity:1,scale:1}}
                            transition={{duration:0.5}}
                            className="text-center p-8"
                        >
                            <div className="w-24 h-24 rounded-full bg-black text-white mx-auto flex items-center justify-center mb-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                                <Check className="w-12 h-12"/>
                            </div>
                            <h2 className="text-3xl font-black uppercase mb-3">{t('questionnaire.post_success_title') || 'ALL DATA SAVED'}</h2>
                            <p className="text-gray-600 mb-6 font-sans text-lg">
                                {t('questionnaire.post_success_desc') || 'Thank you for your contribution to science.'}
                            </p>
                            <div className="inline-block bg-yellow-100 border-2 border-black px-4 py-2 font-mono text-sm">
                                SESSION_ID: {user.uid.slice(0,8).toUpperCase()}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                            
                            {/* 题目列表 */}
                            <div className="space-y-6">
                                {POST_TEST_QUESTIONS.map((q, i) => (
                                    <div key={q.id} className="p-4 border-2 border-black bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start mb-4">
                                            <span className="font-bold mr-4 text-2xl">0{i + 1}.</span>
                                            
                                            {/* 【关键修改】这里读取的是 questionnaire.post_questions.{id} */}
                                            <p className="text-xl font-arcade leading-tight font-medium">
                                                {t(`questionnaire.post_questions.${q.id}`)}
                                            </p>
                                            
                                        </div>
                                        <div className="flex justify-between sm:justify-center gap-2 sm:gap-4 max-w-xl mx-auto">
                                            {[1, 2, 3, 4, 5, 6, 7].map(s => (
                                                <ScoreOption 
                                                    key={s} 
                                                    score={s} 
                                                    selectedScore={answers[q.id]} 
                                                    onSelect={(val: number) => handleAnswerChange(q.id, val)} 
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-lg font-arcade font-bold text-gray-500 mt-3 px-2 max-w-xl mx-auto uppercase">
                                            <span>{t('questionnaire.scale_disagree')}</span>
                                            <span>{t('questionnaire.scale_agree')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 底部按钮 */}
                            <div className="flex flex-col gap-4 pt-6 border-t-4 border-black">
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={answeredCount < POST_TEST_QUESTIONS.length || submitting} 
                                    loading={submitting} 
                                    className="w-full text-2xl py-4"
                                >
                                    {submitting ? t('questionnaire.btn_uploading') : t('questionnaire.btn_submit_final') || 'COMPLETE STUDY'}
                                </Button>
                                
                                {answeredCount < POST_TEST_QUESTIONS.length && (
                                     <p className="text-center text-red-600 font-bold text-sm font-mono mt-1">
                                         * {t('questionnaire.error_incomplete')} ({answeredCount}/{POST_TEST_QUESTIONS.length})
                                     </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </div>
    );
};