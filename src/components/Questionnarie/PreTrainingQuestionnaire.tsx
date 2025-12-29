import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, User, Users, Briefcase, Eye, Target, Lightbulb, Search, Heart, TrendingUp, Zap, LogOut, Brain, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { db, auth } from '../../firebase'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth' 
import type { UserData } from '../../types'
import { useTranslation } from 'react-i18next'

const cn = (...classes: (string | boolean | null | undefined | number | bigint)[]) => classes.filter(Boolean).join(' ');

// =========================================================================
// 1. UI 组件 (保持复古风格)
// =========================================================================

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            className={cn('flex h-14 w-full border-4 border-black bg-white px-4 py-2 text-xl font-arcade text-black placeholder:text-gray-400 focus:outline-none focus:bg-yellow-50 transition-colors', className)}
            ref={ref}
            {...props}
        />
    )
);
Input.displayName = 'Input';

const Button = React.forwardRef<HTMLButtonElement, any>(
    ({ className, variant = 'primary', children, disabled, loading, icon: Icon, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-bold font-arcade border-4 border-black transition-all duration-200 active:translate-y-1 active:shadow-none disabled:opacity-50'
        const variants = {
            primary: 'bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800',
            secondary: 'bg-white text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100',
        }
        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant as keyof typeof variants], 'px-8 py-3 text-lg', className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? "..." : (
                    <>
                        {Icon && <Icon className="mr-2 w-5 h-5" />}
                        {children}
                    </>
                )}
            </button>
        )
    }
);
Button.displayName = 'Button';

const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={cn("bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]", className)}>
        {children}
    </div>
);

// 【修复 1】性别选项匹配 JSON 结构 (gender_male, gender_female, gender_other)
const GENDER_OPTIONS = [
    { val: 'Male', labelKey: 'gender_male' },
    { val: 'Female', labelKey: 'gender_female' },
    { val: 'Other', labelKey: 'gender_other' }, 
];

// 【修复 2】题目 Key 改为大写 'Q' 开头，以匹配 JSON 中的 "questions": { "Q1": ... }
const PRE_TEST_QUESTIONS = [
    { id: 1, type: 'scale', key: 'Q1', icon: Eye },
    { id: 2, type: 'scale', key: 'Q2', icon: Target },
    { id: 3, type: 'scale', key: 'Q3', icon: Lightbulb },
    { id: 4, type: 'scale', key: 'Q4', icon: Search },
    { id: 5, type: 'scale', key: 'Q5', icon: Brain },
    { id: 6, type: 'scale', key: 'Q6', icon: Heart },
    { id: 7, type: 'scale', key: 'Q7', icon: TrendingUp },
    { id: 8, type: 'scale', key: 'Q8', icon: Zap },
];

interface PreTrainingQuestionnaireProps {
    user: UserData;
    groupName: string;
    onComplete: () => void;
}

export const PreTrainingQuestionnaire: React.FC<PreTrainingQuestionnaireProps> = ({ user, groupName, onComplete }) => {
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);

    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [occupation, setOccupation] = useState('');

    const handleAnswer = (key: string, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const answeredCount = Object.keys(answers).length;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                preTestCompleted: true,
                demographics: { age, gender, occupation },
                preTestAnswers: answers,
                preTestTimestamp: serverTimestamp()
            });
            // 提交成功，跳转到步骤 3 (欢迎/成功页面)
            setStep(3); 
        } catch (error) {
            console.error("Error submitting pre-test:", error);
            alert(t('questionnaire.error_submit'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    // 进度条计算
    const progressWidth = step === 1 ? '30%' : (step === 2 ? '90%' : '100%');

    return (
        <div key={i18n.language} className="min-h-screen w-full flex items-center justify-center p-4 md:p-8">
            <div className="fixed top-4 right-4 z-50">
                <button onClick={handleLogout} className="bg-white px-4 py-2 border-4 border-black font-bold font-mono text-sm hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                    <LogOut className="w-4 h-4"/> {t('main.nav.logout')}
                </button>
            </div>

            <Card className="w-full max-w-4xl bg-[#f0f0f0] min-h-[600px] flex flex-col relative overflow-hidden">
                <div className="h-4 w-full bg-gray-200 border-b-4 border-black flex">
                    <div className="h-full bg-black transition-all duration-500" style={{ width: progressWidth }} />
                </div>

                <div className="p-8 md:p-12 flex-1 flex flex-col">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 flex flex-col"
                            >
                                <div className="text-center mb-10">
                                    <div className="inline-block bg-black text-white px-4 py-1 text-sm font-bold font-mono mb-4 border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                        {/* 【修复 3】使用 protocol_prefix 替代缺失的 phase_title */}
                                        {t('questionnaire.protocol_prefix')} 0: INITIALIZATION
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black font-arcade uppercase mb-4 leading-tight">
                                        {/* 【修复 4】使用 title 替代缺失的 title_demographics */}
                                        {t('questionnaire.title')}
                                    </h1>
                                    {/* 移除了缺失的 desc_demographics 字段，保持界面整洁 */}
                                </div>

                                <div className="grid gap-6 max-w-lg mx-auto w-full flex-1">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 font-bold font-arcade uppercase text-lg">
                                            <User className="w-5 h-5" /> {t('questionnaire.label_age')}
                                        </label>
                                        <Input 
                                            placeholder={t('questionnaire.placeholder_age') || "e.g. 24"} 
                                            type="number" 
                                            value={age} 
                                            onChange={(e) => setAge(e.target.value)} 
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 font-bold font-arcade uppercase text-lg">
                                            <Users className="w-5 h-5" /> {t('questionnaire.label_gender')}
                                        </label>
                                        <div className="flex gap-4">
                                            {GENDER_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => setGender(opt.val)}
                                                    className={cn(
                                                        "flex-1 py-3 border-4 font-bold font-arcade text-sm transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none",
                                                        gender === opt.val ? "bg-black text-white border-black" : "bg-white text-gray-500 border-black hover:bg-gray-100"
                                                    )}
                                                >
                                                    {/* 【修复 5】使用 questionnaire.gender_xxx */}
                                                    {t(`questionnaire.${opt.labelKey}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 font-bold font-arcade uppercase text-lg">
                                            <Briefcase className="w-5 h-5" /> {t('questionnaire.label_occupation')}
                                        </label>
                                        <Input 
                                            placeholder={t('questionnaire.placeholder_occupation') || "e.g. Student / Designer"} 
                                            value={occupation} 
                                            onChange={(e) => setOccupation(e.target.value)} 
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 flex justify-end">
                                    <Button 
                                        onClick={() => setStep(2)} 
                                        disabled={!age || !gender || !occupation}
                                        className="w-full md:w-auto"
                                    >
                                        {t('questionnaire.btn_next')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 flex flex-col"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-block bg-yellow-400 text-black border-4 border-black px-4 py-1 text-sm font-bold font-mono mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        {t('questionnaire.step')} 2/2
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black font-arcade uppercase mb-2">
                                        {t('questionnaire.title')}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                    {PRE_TEST_QUESTIONS.map((q) => (
                                        <div key={q.id} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-black text-white border-2 border-black">
                                                    <q.icon className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-bold font-sans text-sm leading-tight">
                                                    {/* 【修复 6】确保引用 questionnaire.questions.Q1 */}
                                                    {t(`questionnaire.questions.${q.key}`)}
                                                </h3>
                                            </div>
                                            
                                            <div className="flex justify-between items-center gap-1">
                                                <span className="text-[10px] font-mono font-bold text-gray-400">{t('questionnaire.scale_disagree')}</span>
                                                <div className="flex gap-1 flex-1 justify-center">
                                                    {[1, 2, 3, 4, 5, 6, 7].map(score => (
                                                        <button
                                                            key={score}
                                                            onClick={() => handleAnswer(q.key, score)}
                                                            className={cn(
                                                                "w-6 h-8 md:w-8 md:h-10 border-2 font-bold font-mono text-xs md:text-sm transition-all",
                                                                answers[q.key] === score 
                                                                    ? "bg-black text-white border-black transform -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]" 
                                                                    : "bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black"
                                                            )}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-gray-400">{t('questionnaire.scale_agree')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-6 border-t-4 border-black">
                                    <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">{t('questionnaire.btn_back')}</Button>
                                    <Button onClick={handleSubmit} disabled={answeredCount < PRE_TEST_QUESTIONS.length || submitting} loading={submitting} className="flex-[2]">
                                        {submitting ? t('questionnaire.btn_uploading') : t('questionnaire.btn_submit')}
                                    </Button>
                                </div>
                                
                                {step === 2 && answeredCount < PRE_TEST_QUESTIONS.length && (
                                     <p className="text-center text-red-600 font-bold text-lg font-arcade mt-2 bg-red-50 border-2 border-red-200 inline-block px-4 py-1 mx-auto w-full shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)]">
                                         * {t('questionnaire.error_incomplete')}
                                     </p>
                                )}
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center text-center p-8"
                            >
                                <div className="mb-6 bg-green-500 text-white p-6 rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                    <CheckCircle2 className="w-16 h-16" />
                                </div>
                                
                                <h2 className="text-3xl md:text-5xl font-black font-arcade uppercase mb-6 leading-tight">
                                    {t('questionnaire.success_title')}
                                </h2>
                                
                                <div className="max-w-xl bg-blue-50 border-4 border-black p-6 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                    <p className="text-lg md:text-xl font-medium leading-relaxed">
                                        {t('questionnaire.success_desc', { group: groupName })}
                                    </p>
                                </div>

                                <Button 
                                    onClick={onComplete} 
                                    size="lg" 
                                    className="w-full md:w-auto text-xl py-4 px-10 animate-pulse"
                                >
                                    {/* 【修复 7】替换不存在的 btn_start_training 为 btn_next */}
                                    {t('questionnaire.btn_next')} -&gt;
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>
        </div>
    );
};