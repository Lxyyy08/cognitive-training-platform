import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 引入你的翻译文件
import en from './locales/en.json';
import zh from './locales/zh.json';

// 【核心逻辑】手动计算初始语言，不依赖不稳定的检测插件
const getInitialLanguage = () => {
  // 1. 最高优先级：检查 localStorage (Login页面写入的值)
  const savedLang = localStorage.getItem('i18nextLng');
  if (savedLang) {
    return savedLang;
  }

  // 2. 次优先级：检查浏览器语言
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }

  // 3. 默认兜底
  return 'en';
};

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next) // 传递 i18n 给 react-i18next
  .init({
    resources,
    
    // 【关键】直接使用我们计算出来的语言，而不是让它自己去猜
    lng: getInitialLanguage(), 

    // 备用语言
    fallbackLng: 'en', 

    interpolation: {
      escapeValue: false, // React 已经处理了 XSS，不需要 escape
    },
    
    // 调试模式（开发时可以开启，上线关闭）
    debug: false,
    
    // 反应选项：确保语言切换时组件会更新
    react: {
      useSuspense: true, 
    }
  });

export default i18n;