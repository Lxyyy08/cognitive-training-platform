import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import ArtBackground from './ArtBackground' 
import Login from './components/LoginPage/Login'
import { PrivacyPolicyModal } from './components/onboarding/PrivacyPolicyModal'
import { MainLayout } from './components/layout/MainLayout'
import { PreTrainingQuestionnaire } from './components/Questionnarie/PreTrainingQuestionnaire'
import { SettingsProvider } from './contexts/SettingsContent'

import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import type { UserData } from './types'
import { PostTrainingQuestionnaire } from './components/Questionnarie/PostTrainingQuestionnaire'
import { SightingReportForm } from './components/reporting/SightingReportForm' 
import { ExperimentEndedScreen } from './components/layout/ExperimentEndedScreen'

const App: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  const [justReported, setJustReported] = useState(false)

 
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid)
        
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data() as Omit<UserData, 'uid'>
                setUser({
                    uid: firebaseUser.uid,
                    ...userData,
                    email: firebaseUser.email || '', 
                });
            } else {
                signOut(auth);
                setUser(null);
            }
            setLoadingAuth(false);
        }, (error) => {
            console.error("Firestore Listen Error:", error);
            setLoadingAuth(false);
        });

      } else {
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
        }
        setUser(null)
        setLoadingAuth(false) 
      }
    })

    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
    }
  }, []) 

  const handleLogout = async() => {
    await signOut(auth)
    setActiveTab('overview')
    setJustReported(false)
  }

  const handlePolicyAgree = async () => {
    if (!user) return
    const userDocRef = doc(db,'users',user.uid)
    await updateDoc(userDocRef,{ agreedToPolicy:true })
  }

  const handlePolicyDecline = async() => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }


  const renderContent = () => {
    if(loadingAuth){
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-black animate-spin"/>
        </div>
      )
    }
    
    if (!user) return <Login />
    
    if (!user.agreedToPolicy) {
      return (
        <PrivacyPolicyModal
          onAgree={handlePolicyAgree}
          onDecline={handlePolicyDecline}
        />
      )
    }
    
    if (!user.preTestCompleted) {
      return (
        <PreTrainingQuestionnaire
          user={user}
          groupName={user.group}
          onComplete={()=>{}}
        />
      )
    }

  
    let currentDay = 1;
    if (user.createdAt) {
      // @ts-ignore
      const startDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (currentDay < 1) currentDay = 1;
    }

    const TRAINING_END_DAY = 5; 
    const isTrainingDaysReached = currentDay >= TRAINING_END_DAY;

    if (user.studyCompleted && isTrainingDaysReached && activeTab !== 'community') {
      return (
        <ExperimentEndedScreen 
          userStats={{
            daysCompleted: currentDay, 
            totalReports: user.catConfig?.lastRewardedSession || 0 
          }}
          onGoToCommunity={() => setActiveTab('community')}
        />
      );
    }


    if (isTrainingDaysReached && !user.studyCompleted) {
      
      if (!user.postTestCompleted) {
       
         if (justReported) {
            return (
              <PostTrainingQuestionnaire 
                user={user}
                onComplete={() => {
                   console.log("Study sequence completed");
                }}
              />
            );
         } 
 
         else {
           return (
              <div className="pt-20"> 
                  <SightingReportForm 
                    user={user}
                    onReportSubmit={() => {
                      setJustReported(true);
                    }}
                  />
              </div>
           );
         }
      }
    }
    
   
    return (
      <MainLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        currentDay={currentDay}
      />
    )
  }

  return (
    <SettingsProvider>
      <ArtBackground>
        {renderContent()}
      </ArtBackground>
    </SettingsProvider>
  )
}

export default App
