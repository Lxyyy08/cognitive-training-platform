/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. 强制覆盖所有字体家族为 VT323
      fontFamily: {
        sans: ['"VT323"', 'monospace'],   // 覆盖默认无衬线字体 (Tailwind 默认文本)
        serif: ['"VT323"', 'monospace'],  // 覆盖衬线字体
        mono: ['"VT323"', 'monospace'],   // 覆盖等宽字体
        arcade: ['"VT323"', 'monospace'], // 保留自定义类名 (可选)
        hanzhi: ['"Zhi Mang Xing"', 'cursive'], // 保留你的中文艺术字
      },
      
      colors: {
        // 'amber': require('tailwindcss/colors').amber, 
      },
      
      animation: {
        'scanLine': 'scanLine 2s linear infinite', 
        'catBounce': 'catBounce 2s ease-in-out infinite',
        'pawPrint': 'pawPrint 1s ease-out infinite',
        'gamePulse': 'gamePulse 2s ease-in-out infinite',
        'neonGlow': 'neonGlow 2s ease-in-out infinite',
        'flicker': 'flicker 0.1s step-end infinite',
      },
      
      keyframes: {
        scanLine: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        catBounce: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) rotate(-5deg)' },
          '75%': { transform: 'translateY(-5px) rotate(5deg)' },
        },
        pawPrint: { 
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.5)' },
        },
        gamePulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '4px 4px 0px #000000' },
          '50%': { transform: 'scale(1.01)', boxShadow: '6px 6px 0px #000000' },
        },
        neonGlow: {
          '0%': { 
            textShadow: '0 0 4px #000000, 0 0 10px #000000', 
            opacity: '0.9' 
          },
          '100%': { 
            textShadow: '0 0 2px #000000, 0 0 5px #000000', 
            opacity: '1' 
          },
        },
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '1' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}