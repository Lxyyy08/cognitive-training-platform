import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cat, Mail, Check, Loader2, ArrowLeft, Globe, Lock, AlertCircle } from 'lucide-react' 
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { auth, db } from '../../firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, onSnapshot, runTransaction, getDoc } from 'firebase/firestore'
import type { UserData } from '../../types'

const cn = (...classes: (string | boolean | null | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon: Icon, iconPosition = 'left', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black font-arcade'
    const variants = {
      primary: 'bg-black text-white hover:bg-gray-800 focus:ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-xl focus:ring-offset-white active:translate-y-1 active:shadow-none', 
      secondary: 'bg-white text-black border-2 border-black hover:bg-gray-100 focus:ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow focus:ring-offset-white active:translate-y-1 active:shadow-none',
      ghost: 'text-black hover:bg-gray-100 focus:ring-black focus:ring-offset-white border-transparent'
    }
    const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2.5' }
    return (
      <button ref={ref} disabled={disabled || loading} className={cn(baseStyles, variants[variant], sizes[size], loading && 'cursor-wait', className)} {...props}>
        {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
        {!loading && Icon && iconPosition === 'left' && <Icon className={cn(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', children ? 'mr-2' : '')} />}
        {children}
        {!loading && Icon && iconPosition === 'right' && <Icon className={cn(size === 'lg' ? 'w-5 h-5' : 'w-4 h-4', children ? 'ml-2' : '')} />}
      </button>
    )
  }
)
Button.displayName = 'Button'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn('flex h-12 w-full rounded-lg border-4 border-black bg-white px-4 py-2 text-lg font-arcade text-black ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm', className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const Login: React.FC = () =>{
  const { t, i18n } = useTranslation();
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [groupCounts, setGroupCounts] = useState<{ [key: string]: number }>({ G1: 0, G2: 0, G3: 0, G4: 0 });
  const MAX_PER_GROUP = 10;

  useEffect(() => {
      const unsub = onSnapshot(doc(db, 'meta', 'groupCounts'), (docSnap) => {
          if (docSnap.exists()) {
              setGroupCounts(docSnap.data() as any);
          }
      }, (err) => {
          console.error("Failed to fetch group counts", err);
      });
      return () => unsub();
  }, []);

  const groups = [
    { id: 'G1', label: t('login.groups.g1_label'), description: t('login.groups.g1_desc') },
    { id: 'G2', label: t('login.groups.g2_label'), description: t('login.groups.g2_desc') },
    { id: 'G3', label: t('login.groups.g3_label'), description: t('login.groups.g3_desc') },
    { id: 'G4', label: t('login.groups.g4_label'), description: t('login.groups.g4_desc') },
  ];

  // 【修复 1】切换语言时，强制写入 localStorage
  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang); 
  };

  const handleSubmit = async(e:React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try{
      if(isLogin){
        if(!email || !password) throw new Error("MISSING_FIELDS")
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.warn("Detected Zombie Account, fixing...");
            const repairData = {
                uid: uid,
                name: "Recovered Subject",
                email: email,
                group: 'G1', 
                agreedToPolicy: false,
                preTestCompleted: false,
                postTestCompleted: false,
                daysCompleted: 0, 
                trainingLevels: { g2_attention: 1, g4_nback: 1 },
                createdAt: serverTimestamp(),
                catConfig: { 
                    equippedIds: [], 
                    ownedIds: [4, 7, 21], 
                    lastRewardedSession: 0,
                    lastRewardDate: ""
                }
            };
            await setDoc(docRef, repairData);
        }

      } else {
        // Register Logic
        if(!name.trim() || !selectedGroup || !email || !password) {
          throw new Error("MISSING_FIELDS")
        }

        if (groupCounts[selectedGroup] >= MAX_PER_GROUP) {
            throw new Error("GROUP_FULL_LOCAL"); 
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const uid = userCredential.user.uid
        
        const userRef = doc(db, 'users', uid);
        const countRef = doc(db, 'meta', 'groupCounts');

        try {
            await runTransaction(db, async (transaction) => {
                const metaDoc = await transaction.get(countRef);
                if (!metaDoc.exists()) throw new Error("SYSTEM_NO_COUNTERS");

                const currentCount = metaDoc.data()[selectedGroup] || 0;
                
                if (currentCount >= MAX_PER_GROUP) {
                    throw new Error("GROUP_FULL");
                }

                transaction.update(countRef, {
                    [selectedGroup]: currentCount + 1
                });

                const newUserDoc: Omit<UserData,'uid'> = {
                    name: name.trim(),
                    email: email,
                    group: selectedGroup,
                    agreedToPolicy: false, 
                    preTestCompleted: false,
                    postTestCompleted: false,
                    createdAt: serverTimestamp(),
                    daysCompleted: 0, 
                    trainingLevels: { g2_attention: 1, g4_nback: 1 },
                    catConfig: { 
                        equippedIds: [], 
                        ownedIds: [4, 7, 21],
                        lastRewardedSession: 0,
                        lastRewardDate: ""
                    } 
                }
                transaction.set(userRef, newUserDoc);
            });

        } catch (transError: any) {
            await userCredential.user.delete();
            if (transError.message === "GROUP_FULL") {
                throw new Error("GROUP_FULL");
            }
            throw transError; 
        }
      }
      
      console.log("Auth success, reloading...");
      
      // 【修复 2】在刷新页面前，保存当前语言偏好，防止被浏览器默认语言覆盖
      localStorage.setItem('i18nextLng', i18n.language);

      window.location.reload(); 

    } catch (err:any) {
      console.error("Auth/Trans Error:", err)
      
      if(err.code === "auth/email-already-in-use"){
        setError(t('login.errors.email_in_use'));
      } else if(err.code === 'auth/weak-password'){
        setError(t('login.errors.weak_password'))
      } else if (err.message === "MISSING_FIELDS") {
        setError(t('login.errors.missing_fields'));
      } else if (err.message === "GROUP_FULL" || err.message === "GROUP_FULL_LOCAL") {
        setError(t('login.errors.group_full', { group: selectedGroup }));
      } else {
        setError(err.message || t('login.errors.general'))
      }
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-arcade relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 p-2 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 flex items-center gap-2 font-bold z-50"
      >
        <Globe className="w-5 h-5" />
        <span>{i18n.language.startsWith('en') ? 'EN' : '中文'}</span>
      </button>

      <motion.div
        className="w-full max-w-lg bg-white p-8 rounded-xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black" 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
      >
        {!isLogin && (
            <button onClick={() => setIsLogin(true)} className="flex items-center text-gray-500 hover:text-black mb-4 font-bold transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1"/> {t('login.btn_back')}
            </button>
        )}

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-black text-white mx-auto mb-4 flex items-center justify-center border-4 border-transparent hover:border-black hover:bg-white hover:text-black transition-all rounded-full">
             <Cat className="w-12 h-12" /> 
          </div>
          <h2 className="text-3xl font-extrabold uppercase text-black tracking-tighter">
            {isLogin ? t('login.title_login') : t('login.title_register')}
          </h2>
          <p className="text-gray-500 mt-2 font-sans">
            {isLogin ? t('login.subtitle_login') : t('login.subtitle_register')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-2 uppercase">
              <Mail className="w-4 h-4 inline-block mr-1"/> {t('login.label_email')}
            </label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.placeholder_email')} required />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black mb-2 uppercase">
              <Lock className="w-4 h-4 inline-block mr-1"/> {t('login.label_password')}
            </label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.placeholder_password')} required />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{opacity:0,height:0}}
                animate={{opacity:1,height:'auto'}}
                exit={{opacity:0, height:0}}
                className="space-y-6 overflow-hidden">
                  
                  <div className="pt-2">
                    <label htmlFor='name' className='block text-sm font-medium text-black mb-2 uppercase'>
                      {t('login.label_nickname')}
                    </label>
                    <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('login.placeholder_nickname')} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-3 uppercase">
                     {t('login.label_protocol')}
                    </label>
                  <div className="space-y-4">
                    {groups.map((group) => {
                        const isFull = groupCounts[group.id] >= MAX_PER_GROUP;
                        
                        return (
                        <motion.div key={group.id} whileHover={!isFull ? { scale: 1.02 } : {}} whileTap={!isFull ? { scale: 0.98 } : {}}>
                          <button
                             type="button"
                             onClick={() => !isFull && setSelectedGroup(group.id)}
                             disabled={isFull}
                             className={cn(
                              "w-full p-4 rounded-lg text-left transition-all duration-200 border-4 relative",
                              isFull 
                                ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-70" 
                                : selectedGroup === group.id
                                    ? "bg-black text-white border-black shadow-md" 
                                    : "bg-white text-black border-black hover:bg-gray-100" 
                               )}
                              >
                            <div className="flex justify-between items-start">
                              <span className={cn("font-bold text-xl", selectedGroup === group.id ? "text-white" : "text-black")}>
                                {group.label}
                              </span>
                              
                              {isFull ? (
                                  <span className="flex items-center text-red-500 font-bold font-mono text-sm bg-red-100 px-2 py-1 rounded border border-red-200">
                                      <Lock className="w-3 h-3 mr-1" /> FULL
                                  </span>
                              ) : (
                                  <span className={cn("font-mono text-sm font-bold px-2 py-1 rounded border", 
                                      selectedGroup === group.id ? "bg-white text-black border-transparent" : "bg-gray-100 text-gray-500 border-gray-300")}>
                                      {groupCounts[group.id]}/{MAX_PER_GROUP}
                                  </span>
                              )}
                            </div>
                            <p className={cn("text-xs mt-1 font-sans", selectedGroup === group.id ? "text-gray-300" : "text-gray-500")}>
                                {group.description}
                            </p>
                            
                            {selectedGroup === group.id && !isFull && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 border-2 border-black">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                          </button>
                        </motion.div>
                    )})}
                  </div>
                 </div>
            </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
                className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border-2 border-red-600 font-bold flex gap-2 items-center" 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                <span>{error}</span>
            </motion.div>
          )}

          <Button type="submit" size="lg" icon={loading ? Loader2 : Cat} iconPosition="right" className="w-full mt-8 text-xl" loading={loading} disabled={loading}>
            {loading ? (isLogin ? t('login.btn_processing') : t('login.btn_creating')) : (isLogin ? t('login.btn_login') : t('login.btn_register'))}
          </Button>

          <div className="text-center mt-4">
              <button type="button" onClick={()=>{ setIsLogin(!isLogin); setError(''); }} className="text-sm text-gray-600 underline hover:text-black hover:bg-black hover:text-white transition-all px-2 py-1">
                {isLogin ? t('login.switch_to_register') : t('login.switch_to_login')}
              </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default Login