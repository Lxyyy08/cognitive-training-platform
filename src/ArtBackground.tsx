import React, { useRef, useEffect, useState, useCallback, type FC } from 'react';

// === Canvas 绘制逻辑和配置 ===

// Configuration parameters
const CONFIG = {
    bgColor: '#f9fafb', // Very light gray background
    
    // Layer 1: Dots
    dots: { spacing: 40, radius: 1.5, color: '#e5e7eb' },

    // Layer 2: Crosses
    cross: { spacing: 120, size: 8, color: '#9ca3af', offset: { x: 20, y: 20 } },

    // Layer 3: Cat Paws (small and sparse)
    paw: {
        spacing: 280,
        scale: 0.4,
        color: '#111827',
        strokeColor: '#ffffff',
        strokeWidth: 6,
        offset: { x: 40, y: -120 }
    },

    parallaxStrength: 0.02
};

// Pure drawing functions
const drawPaw = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string, strokeColor: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = CONFIG.paw.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Main pad
    ctx.beginPath();
    ctx.moveTo(-15, 5);
    ctx.bezierCurveTo(-20, 15, -10, 25, 0, 25);
    ctx.bezierCurveTo(10, 25, 20, 15, 15, 5);
    ctx.bezierCurveTo(15, -5, -15, -5, -15, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Four toes
    const toes = [
        { x: -18, y: -5, r: 6 },
        { x: -6,  y: -15, r: 7 },
        { x: 6,   y: -15, r: 7 },
        { x: 18,  y: -5, r: 6 }
    ];

    toes.forEach(toe => {
        ctx.beginPath();
        ctx.ellipse(toe.x, toe.y, toe.r, toe.r * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke(); 
        ctx.fill();
    });

    ctx.restore();
};

const drawCross = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.moveTo(x - size/2, y);
    ctx.lineTo(x + size/2, y);
    ctx.moveTo(x, y - size/2);
    ctx.lineTo(x, y + size/2);
    ctx.stroke();
};

const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
};


// === React Component ===

interface ArtBackgroundProps {
    children: React.ReactNode;
}

const ArtBackground: FC<ArtBackgroundProps> = ({ children }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // 修复问题 3：提供初始值 0，解决 'undefined' not assignable to 'number' 的问题
    const animationFrameRef = useRef<number>(0); 
    
    const targetXRef = useRef(0);
    const targetYRef = useRef(0);

    const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    // 绘制逻辑
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, targetX: number, targetY: number) => {
        // 1. Clear and fill background
        ctx.fillStyle = CONFIG.bgColor;
        ctx.fillRect(0, 0, width, height);

        const offsetX = (targetX - width / 2);
        const offsetY = (targetY - height / 2);

        // Helper: Draw a seamless pattern layer
        const drawLayer = (spacing: number, parallaxFactor: number, offsetConfig: { x: number, y: number } | null, drawFn: (x: number, y: number) => void) => {
            const shiftX = offsetX * CONFIG.parallaxStrength * parallaxFactor + (offsetConfig?.x || 0);
            const shiftY = offsetY * CONFIG.parallaxStrength * parallaxFactor + (offsetConfig?.y || 0);

            let startX = (shiftX % spacing);
            if (startX > 0) startX -= spacing;
            
            let startY = (shiftY % spacing);
            if (startY > 0) startY -= spacing;

            for (let x = startX; x < width + spacing; x += spacing) {
                for (let y = startY; y < height + spacing; y += spacing) {
                    drawFn(x, y);
                }
            }
        };

        // --- Layers ---
        drawLayer(CONFIG.dots.spacing, 0.2, null, (x, y) => {
            drawDot(ctx, x, y, CONFIG.dots.radius, CONFIG.dots.color);
        });

        drawLayer(CONFIG.cross.spacing, 0.5, CONFIG.cross.offset, (x, y) => {
             const stagger = (Math.floor((y - (CONFIG.cross.offset.y || 0)) / CONFIG.cross.spacing) % 2 === 0) ? 0 : CONFIG.cross.spacing / 2;
             drawCross(ctx, x + stagger, y, CONFIG.cross.size, CONFIG.cross.color);
        });

        drawLayer(CONFIG.paw.spacing, 1.0, CONFIG.paw.offset, (x, y) => {
            const rotation = Math.sin((x + y) * 0.01) * 0.15; 
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.translate(-x, -y);
            
            drawPaw(ctx, x, y, CONFIG.paw.scale, CONFIG.paw.color, CONFIG.paw.strokeColor);
            ctx.restore();
        });

    }, []);

    // Animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        // 修复 'canvas' is possibly 'null'.
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return; 

        let currentX = targetXRef.current;
        let currentY = targetYRef.current;

        // Smooth interpolation
        currentX += (mousePos.x - currentX) * 0.1;
        currentY += (mousePos.y - currentY) * 0.1;
        
        targetXRef.current = currentX;
        targetYRef.current = currentY;

        const dpr = window.devicePixelRatio || 1;
        draw(ctx, canvas.width / dpr, canvas.height / dpr, currentX, currentY);

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [draw, mousePos]); // Dependency includes draw and mousePos

    // Initialization and cleanup effect
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const ctx = canvas?.getContext('2d');

        // 严格的 null 检查
        if (!ctx || !container || !canvas) return; 

        // 1. DPI and Resize handling
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            
            if (!container) return; 

            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            canvas.style.width = `${container.clientWidth}px`;
            canvas.style.height = `${container.clientHeight}px`;
            ctx.scale(dpr, dpr);
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            setMousePos({ 
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        container.addEventListener('mousemove', handleMouseMove);

        // 2. Start animation
        animationFrameRef.current = requestAnimationFrame(animate);

        // 3. Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            container.removeEventListener('mousemove', handleMouseMove);
            // 修复 3: 这里可以使用非空断言，或者通过初始值 0 来保证 safety
            if (animationFrameRef.current !== undefined) {
                 cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [animate]); // Dependency includes animate

    return (
        // Container element
        <div 
            ref={containerRef}
            className="w-full min-h-screen relative overflow-hidden" 
            style={{ 
                // Ensure container itself is transparent
                backgroundColor: 'transparent'
            }}
        >
            {/* Canvas element */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0"
                style={{ zIndex: 0 }}
            />
            
            {/* Page content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default ArtBackground;