// 1. 这里是最关键的修改：显式引入 /v1
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// 初始化
admin.initializeApp();
const db = admin.firestore();

// --- 配置常量 ---
const PROMOTION_THRESHOLD = 0.85;
const MAX_LEVEL = 3;

/**
 * 辅助函数：处理等级晋升
 */
const handleLevelPromotion = async (
  userId: string,
  currentLevel: number,
  accuracy: number,
  fieldToUpdate: string,
  taskName: string
) => {
  if (accuracy >= PROMOTION_THRESHOLD && currentLevel < MAX_LEVEL) {
    const newLevel = currentLevel + 1;
    try {
      await db.collection('users').doc(userId).update({
        [fieldToUpdate]: newLevel
      });
      console.log(`[Promotion] User ${userId} promoted to Level ${newLevel} in ${taskName}.`);
    } catch (error) {
      console.error(`[Error] Failed to promote user ${userId}:`, error);
    }
  } else {
    console.log(`[No Promotion] User ${userId} stays at Level ${currentLevel}.`);
  }
};

/**
 * G2 监听器
 * 2. 显式添加类型定义：QueryDocumentSnapshot 和 EventContext
 * 这解决了 'snap' 和 'context' implicitly has an 'any' type 的错误
 */
export const onG2SessionComplete = functions.firestore
  .document('users/{userId}/gazeData/{sessionId}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const newData = snap.data();
    const userId = context.params.userId;

    const accuracy = newData.accuracy || 0; 
    const level = newData.level || 1;

    await handleLevelPromotion(
      userId,
      level,
      accuracy,
      'trainingLevels.g2_attention',
      'G2 Attention Task'
    );
  });

/**
 * G4 监听器
 * 同样添加显式类型定义
 */
export const onG4SessionComplete = functions.firestore
  .document('users/{userId}/nbackData/{sessionId}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    const newData = snap.data();
    const userId = context.params.userId;

    const accuracy = newData.accuracy || 0;
    const level = newData.level || 1;

    await handleLevelPromotion(
      userId,
      level,
      accuracy,
      'trainingLevels.g4_nback',
      'G4 N-Back Task'
    );
  });