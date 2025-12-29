import React, { useEffect, useRef } from 'react';
import { motion, type TargetAndTransition, type HTMLMotionProps } from 'framer-motion';
import { Sparkles, Crosshair, Circle, Square,Loader2, type LucideIcon } from 'lucide-react';

// ==========================================
// 1. 工具与通用配置
// ==========================================
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const STYLE = {
    black: '#1a1a1a',
    white: '#ffffff',
    dotColor: '#d1d5db',
};

// ==========================================
// 2. 装饰性几何体 (Floating Shapes)
// ==========================================
const FloatingShapes = ({ variant }: { variant: string }) => {
    const floatAnim: TargetAndTransition = {
        y: [0, -15, 0],
        rotate: [0, 10, -10, 0],
        transition: { 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
        }
    };

    const circleAnim: TargetAndTransition = {
        y: [0, 20, 0],
        rotate: [0, 10, -10, 0],
        transition: { 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut"
        }
    };

    switch (variant) {
        case 'sitting': // G2: 方块与圆 (稳定)
            return (
                <>
                    <motion.div animate={floatAnim} className="absolute -top-6 -left-6 z-0 text-black opacity-80">
                        <Square className="w-8 h-8 fill-black" />
                    </motion.div>
                    <motion.div 
                        animate={circleAnim} 
                        className="absolute -bottom-8 -right-4 z-0 text-black"
                    >
                        <Circle className="w-10 h-10 stroke-[3px]" />
                    </motion.div>
                </>
            );
        case 'backward': // G3: 胶囊与三角 (混合)
            return (
                <>
                    {/* 模拟药丸胶囊 */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-4 -left-8 z-0 border-2 border-black bg-white w-12 h-6 rounded-full" 
                    />
                    <motion.div animate={floatAnim} className="absolute top-1/2 -right-10 z-0">
                        <svg width="30" height="30" viewBox="0 0 24 24" className="fill-black">
                            <path d="M12 2L22 22H2L12 2Z" />
                        </svg>
                    </motion.div>
                </>
            );
        case 'walking': // G1: 十字与箭头 (动态)
            return (
                <>
                    <motion.div 
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-5 -left-5 z-0 text-black"
                    >
                        <Crosshair className="w-10 h-10 stroke-[3px]" />
                    </motion.div>
                    {/* 箭头 */}
                    <motion.div 
                        animate={{ x: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-10 -right-8 z-0"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" className="fill-black rotate-90">
                            <path d="M12 2L15 5H9L12 2ZM12 22V5" stroke="black" strokeWidth="3" />
                            <path d="M5 12L12 19L19 12" fill="none" stroke="black" strokeWidth="3" />
                        </svg>
                    </motion.div>
                </>
            );
        default: // Lazy: 星星
            return (
                <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3 -left-3 text-black z-10 bg-white rounded-full border-2 border-black p-1"
                >
                    <Sparkles className="w-6 h-6 fill-black" />
                </motion.div>
            );
    }
};

// ==========================================
// 3. 静态/简单动画猫咪 (SVG)
// ==========================================

// --- A. 慵懒趴着的猫 ---
const LazyCatSVG = () => (
    <div className="absolute -top-[50px] right-8 w-24 h-16 z-20 pointer-events-none">
        <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
            <path d="M 20 50 Q 50 20 80 50 L 90 50 L 10 50 Z" fill={STYLE.black} />
            <circle cx="20" cy="45" r="14" fill={STYLE.black} />
            <path d="M 8 38 L 12 25 L 20 35 Z" fill={STYLE.black} />
            <path d="M 32 38 L 28 25 L 20 35 Z" fill={STYLE.black} />
            <path d="M 14 45 Q 17 48 20 45" stroke="white" strokeWidth="1.5" fill="none" />
            <motion.path 
                d="M 80 50 Q 95 20 95 40" stroke={STYLE.black} strokeWidth="6" fill="none" strokeLinecap="round"
                style={{ originX: 0.8, originY: 1 }}
                animate={{ d: ["M 80 50 Q 90 10 100 30", "M 80 50 Q 95 40 90 55", "M 80 50 Q 90 10 100 30"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </div>
);

// --- B. 端正坐立的猫 ---
const SittingCatSVG = () => (
    <div className="absolute -top-[75px] right-10 w-20 h-24 z-20 pointer-events-none">
        <svg viewBox="-40 -90 80 100" className="w-full h-full overflow-visible">
            <motion.path
                stroke={STYLE.black} strokeWidth="8" fill="none" strokeLinecap="round"
                initial={{ pathLength: 1, pathOffset: 0 }}
                animate={{ d: ["M -15 -5 C -45 -15, -15 -65, -25 -85", "M -15 -5 C -30 -15, 5 -65, 10 -85", "M -15 -5 C -45 -15, -15 -65, -25 -85"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <path d="M -25 0 L 25 0 Q 20 -50 0 -60 Q -20 -50 -25 0 Z" fill={STYLE.black} />
            <circle cx="0" cy="-60" r="20" fill={STYLE.black} />
            <path d="M -15 -70 L -20 -85 L -5 -75 Z" fill={STYLE.black} />
            <path d="M 15 -70 L 20 -85 L 5 -75 Z" fill={STYLE.black} />
            <path d="M -12 -60 Q -8 -58 -4 -60" stroke="white" strokeWidth="2" fill="none" />
            <path d="M 12 -60 Q 8 -58 4 -60" stroke="white" strokeWidth="2" fill="none" />
        </svg>
    </div>
);

// --- C. 回眸守望的猫 ---
const BackwardCatSVG = () => (
    <div className="absolute -top-[70px] right-12 w-24 h-20 z-20 pointer-events-none">
        <svg viewBox="-40 -70 90 80" className="w-full h-full overflow-visible">
            <motion.path
                stroke={STYLE.black} strokeWidth="7" fill="none" strokeLinecap="round"
                animate={{ d: ["M -15 -5 C -30 -5, -55 5, -70 -10", "M -15 -5 C -30 -5, -25 5, -40 -10", "M -15 -5 C -30 -5, -55 5, -70 -10"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <path d="M -20 0 L 20 0 C 35 -15, 25 -50, 10 -60 C -5 -60, -35 -30, -20 0 Z" fill={STYLE.black} />
            <circle cx="12" cy="-65" r="18" fill={STYLE.black} />
            <path d="M 0 -78 L -5 -90 L 10 -80 Z" fill={STYLE.black} />
            <path d="M 15 -75 L 25 -92 L 28 -75 Z" fill={STYLE.black} />
            <path d="M 18 -65 Q 22 -68 26 -63" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    </div>
);

// ==========================================
// 4. 复杂动态猫咪 (Canvas - V2 复刻)
// ==========================================
const WalkingCatCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;
        const dpr = window.devicePixelRatio || 1;
        const parent = canvas.parentElement;
        const width = parent ? parent.clientWidth : 300;
        const height = 100;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            time += 0.01; 
            const startX = width - 150; 
            const walkOffset = Math.sin(time * 0.2) * 50; 
            const isWalkingRight = Math.cos(time * 0.2) > 0;
            const catX = startX + walkOffset;
            const catY = height - 2; 

            drawLazyWalkingCat(ctx, catX, catY, time, isWalkingRight);
            animationFrameId = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const drawLazyWalkingCat = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, facingRight: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        if (!facingRight) ctx.scale(-1, 1);

        const stride = t * 2.0;
        const bob = Math.abs(Math.sin(stride)) * 3;
        ctx.translate(0, -bob);

        const legAngle1 = Math.sin(stride) * 0.6;
        const legAngle2 = Math.sin(stride + Math.PI) * 0.6;
        drawLeg(ctx, -15, 8, legAngle2, STYLE.black); 
        drawLeg(ctx, 25, 8, legAngle1, STYLE.black);  

        const tailWag = Math.sin(t * 1.5) * 8;
        ctx.strokeStyle = STYLE.black; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-35, -25);
        ctx.bezierCurveTo(-55, -25, -65, -45 + tailWag, -75, -35 + tailWag); ctx.stroke();

        ctx.fillStyle = STYLE.black; ctx.beginPath(); ctx.ellipse(0, -25, 38, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(35, -38, 17, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(30, -48); ctx.lineTo(25, -62); ctx.lineTo(40, -52); ctx.moveTo(45, -48); ctx.lineTo(53, -58); ctx.lineTo(50, -42); ctx.fill();
        ctx.strokeStyle = STYLE.white; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, -42); ctx.lineTo(47, -42); ctx.stroke();

        drawLeg(ctx, -15, 8, legAngle1, STYLE.white, true); 
        drawLeg(ctx, 25, 8, legAngle2, STYLE.white, true);  
        ctx.restore();
    };

    const drawLeg = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, border = false) => {
        ctx.save();
        ctx.translate(x, -20);
        ctx.rotate(angle);
        ctx.fillStyle = color; ctx.strokeStyle = STYLE.black; ctx.lineWidth = 2;
        const w = 10; const h = 28;
        ctx.beginPath(); ctx.moveTo(-w/2, 0); ctx.lineTo(w/2, 0); ctx.lineTo(w/2 - 2, h);
        ctx.arc(0, h, 3, 0, Math.PI, false); ctx.lineTo(-w/2 + 2, h); ctx.closePath();
        ctx.fill();
        if (border || color === STYLE.white) ctx.stroke();
        ctx.restore();
    };

    return (
        <div className="absolute -top-[100px] left-0 w-full h-[100px] z-20 pointer-events-none overflow-hidden">
            <canvas ref={canvasRef} />
        </div>
    );
};

// ==========================================
// 5. 主容器组件 (CatBox - 核心差异化逻辑)
// ==========================================
interface CatBoxProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    variant?: 'lazy' | 'sitting' | 'backward' | 'walking'; 
}

export const CatBox: React.FC<CatBoxProps> = ({ children, title, className, variant = 'lazy' }) => {
    
    // 根据不同变体渲染不同的框体结构
    const renderBoxContent = () => {
        const commonContent = (
            <>
                {/* 背景装饰：复古波点 */}
                <div 
                    className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />
                {/* 子内容 */}
                <div className="relative z-10 p-6">
                    {children}
                </div>
            </>
        );

        if (variant === 'sitting') {
            // G2: 纯黑顶栏 (Solid Black Header)
            return (
                <div className="relative bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    {title && (
                        <div className="bg-black text-white border-b-4 border-black px-6 py-3 flex items-center justify-between">
                            <h2 className="text-xl font-black uppercase tracking-wider font-mono">{title}</h2>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-white" />
                                <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                            </div>
                        </div>
                    )}
                    {commonContent}
                </div>
            );
        }

        if (variant === 'backward') {
            // G3: 左侧黑条 (Sidebar)
            return (
                <div className="relative bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex overflow-hidden">
                    {/* 左侧黑条 */}
                    <div className="w-12 bg-black flex flex-col items-center justify-end pb-4 border-r-4 border-black">
                        <span className="text-white font-mono font-bold text-xs tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
                            SYSTEM_READY
                        </span>
                    </div>
                    <div className="flex-1">
                        {title && (
                            <div className="px-6 py-4 border-b-2 border-dashed border-gray-300">
                                <h2 className="text-2xl font-black uppercase tracking-wider font-mono text-black">{title}</h2>
                            </div>
                        )}
                        {commonContent}
                    </div>
                </div>
            );
        }

        if (variant === 'walking') {
            // G1: 四角切口
            return (
                <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    
                    {/* 四角切口装饰 (黑色三角形) */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 bg-black" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-black" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-black" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }} />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black" style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }} />

                    {/* 内部容器 (稍微内缩一点以避开切口) */}
                    <div className="m-1 border-2 border-black/10 h-full">
                        {title && (
                            <div className="text-center py-4 border-b-4 border-black bg-gray-100">
                                <h2 className="text-xl font-black uppercase tracking-widest font-mono">{title}</h2>
                            </div>
                        )}
                        {commonContent}
                    </div>
                </div>
            );
        }

        // Default (Lazy)
        return (
            <div className="relative bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {title && (
                    <div className="border-b-4 border-black px-6 py-3 flex items-center justify-between bg-white text-black">
                        <h2 className="text-xl font-black uppercase tracking-wider font-mono">{title}</h2>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-black" />
                            <div className="w-2 h-2 rounded-full bg-black opacity-50" />
                        </div>
                    </div>
                )}
                {commonContent}
            </div>
        );
    };

    return (
        <div className={cn("relative mt-20 group w-full", className)}>
            {/* 猫咪 */}
            {variant === 'lazy' && <LazyCatSVG />}
            {variant === 'sitting' && <SittingCatSVG />}
            {variant === 'backward' && <BackwardCatSVG />}
            {variant === 'walking' && <WalkingCatCanvas />}

            {/* 漂浮装饰 */}
            <FloatingShapes variant={variant} />

            {/* 框体渲染 */}
            {renderBoxContent()}
        </div>
    );
};

// ==========================================
// 6. 猫爪按钮
// ==========================================

// FIX: 显式定义 children 为 React.ReactNode，覆盖 HTMLMotionProps 中的宽泛定义 (MotionValue 等)
// 这样在下面使用 {children} 放入 span 时，TS 就知道它是安全的 React 节点了。
interface PawButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'filled' | 'outline';
    children: React.ReactNode; 
    loading?: boolean;
    icon?:LucideIcon;
}

export const PawButton: React.FC<PawButtonProps> = ({ className, children, variant = 'filled',loading = false,icon:Icon,disabled,...props }) => {
    const isFilled = variant === 'filled';

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95, y: 2 }}
            className={cn(
                "relative group inline-flex items-center justify-center font-bold font-mono tracking-wide px-10 py-4 rounded-full transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none",
                isFilled ? "bg-black text-white border-2 border-black" : "bg-white text-black border-2 border-black",
                className
            )}
            {...props}
        >
            {/* 大肉垫装饰 */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex justify-center items-end w-full h-8 pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
                <div className={cn("w-3 h-3 rounded-full border-2 border-black mb-1 mr-1", isFilled ? "bg-white" : "bg-black")} />
                <div className={cn("w-4 h-4 rounded-full border-2 border-black mb-3 mx-1", isFilled ? "bg-white" : "bg-black")} />
                <div className={cn("w-3 h-3 rounded-full border-2 border-black mb-1 ml-1", isFilled ? "bg-white" : "bg-black")} />
            </div>
            {/* 按钮内容 */}
            <span className="relative z-10 flex items-center gap-2 text-lg">
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    Icon && <Icon className="w-5 h-5" />
                )}
                {children}
            </span>
        </motion.button>
    );
};