export interface UserData {
  uid: string;
  name: string;
  group: string;
  email: string;
  agreedToPolicy: boolean;
  preTestCompleted: boolean;
  postTestCompleted: boolean;
  studyCompleted?: boolean;
  trainingLevels: {
    g2_attention: number;
    g4_nback: number;
  };
  createdAt ? :any;

  daysCompleted: number;

  catConfig?: {
    equippedIds: number[];       // 当前身上穿戴的物品 ID
    ownedIds: number[];          // 仓库里已拥有的物品 ID
    lastRewardedSession: number; // 上次领取奖励时的训练总场次
    //lastUpdated?: any;           // 保存时间 (通常是 Firestore Timestamp)
    lastRewardDate?: string;
  };

}

