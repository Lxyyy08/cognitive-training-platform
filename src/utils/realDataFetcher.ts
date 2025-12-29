import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// ============================================================================
// 🧮 辅助函数：智能计算总分
// ============================================================================
const calculateTotalScore = (docData: any): string => {
    // 1. 优先尝试直接读取现成的总分字段
    if (docData.totalScore !== undefined && docData.totalScore !== null) return String(docData.totalScore);
    if (docData.score !== undefined && docData.score !== null) return String(docData.score);

    // 2. 核心逻辑：从 answers 字段累加
    // 结构通常是: answers: { q1: 4, q2: 5, q3: "3" ... } 或 answers: [4, 5, 3]
    if (docData.answers) {
        try {
            let sum = 0;
            let hasValidScore = false;
            
            const values = typeof docData.answers === 'object' ? Object.values(docData.answers) : [];
            
            for (const val of values) {
                // 情况 A: 值直接是数字
                if (typeof val === 'number') {
                    sum += val;
                    hasValidScore = true;
                } 
                // 情况 B: 值是数字字符串 "4"
                else if (typeof val === 'string' && !isNaN(parseFloat(val))) {
                    sum += parseFloat(val);
                    hasValidScore = true;
                }
                // 情况 C: 值是对象 { value: 4 } (某些问卷库的结构)
                else if (typeof val === 'object' && val !== null) {
                    const innerVal = (val as any).value ?? (val as any).score;
                    if (typeof innerVal === 'number') {
                        sum += innerVal;
                        hasValidScore = true;
                    }
                }
            }

            if (hasValidScore) return String(sum);

        } catch (e) {
            console.warn("Error calculating score from answers:", e);
        }
    }

    return 'N/A';
};

// ============================================================================
// 🛠️ CSV 转换工具
// ============================================================================
const convertToCSV = (objArray: any[]) => {
    if (!objArray || objArray.length === 0) return '';
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    
    // 动态获取所有 Key
    const allHeaders = new Set<string>();
    array.forEach((row: any) => Object.keys(row).forEach(k => allHeaders.add(k)));
    
    // 排序表头：确保重要字段在最前面，Data_Source 也在其中
    const sortedHeaders = Array.from(allHeaders).sort((a, b) => {
        const priority = [
            'UID', 'Group', 'Data_Source', // 把 Data_Source 提到前面来，防止漏看
            'Pre_Score', 'Post_Score', 'Delta_Score', 
            'Total_Duration_Min', 'Session_Count',
            'Avg_Accuracy', 'Avg_Stability',
            'G1_Blocks', 'G3_Level'
        ];
        
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    let str = sortedHeaders.join(',') + '\r\n';
    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (const header of sortedHeaders) {
            if (line !== '') line += ',';
            let cell = array[i][header];
            if (cell === null || cell === undefined) cell = '';
            
            const cellStr = JSON.stringify(cell).replace(/^"|"$/g, ''); 
            line += `"${cellStr}"`; 
        }
        str += line + '\r\n';
    }
    return str;
};

// ============================================================================
// 🚀 核心：全量提取 (修复分数计算 & Data_Source)
// ============================================================================
export const fetchAndDownloadRealData = async () => {
    try {
        console.log("🔍 Starting Deep Extraction (Calculating Scores from 'answers')...");
        const usersRef = collection(db, 'users');
        const userSnapshot = await getDocs(usersRef);

        console.log(`📚 Found ${userSnapshot.size} users.`);
        const allUserData = [];

        for (const userDoc of userSnapshot.docs) {
            const uid = userDoc.id;
            const userData = userDoc.data();
            
            let preScore = 'N/A';
            let postScore = 'N/A';
            let deltaScore = 'N/A';
            
            // 训练指标
            let totalDurationSec = 0;
            let sessionCount = 0;
            let totalAccuracy = 0;
            let totalStability = 0;
            let g1BlocksTotal = 0;
            let maxG3Level = 0;
            
            let validEyeTrackingSessions = 0;

            // ============================================================
            // 1. Fetch Pre-Test (Look for 'result' doc -> sum 'answers')
            // ============================================================
            try {
                const subRef = collection(db, 'users', uid, 'preTest');
                const snap = await getDocs(subRef);
                if (!snap.empty) {
                    // 优先找 ID 为 'result' 的文档，找不到就用第一个
                    const targetDoc = snap.docs.find(d => d.id === 'result') || snap.docs[0];
                    preScore = calculateTotalScore(targetDoc.data());
                }
            } catch (e) { console.warn(`User ${uid} preTest error`, e); }

            // ============================================================
            // 2. Fetch Post-Test (Look for 'result' doc -> sum 'answers')
            // ============================================================
            try {
                const subRef = collection(db, 'users', uid, 'postTest');
                const snap = await getDocs(subRef);
                if (!snap.empty) {
                    const targetDoc = snap.docs.find(d => d.id === 'result') || snap.docs[0];
                    postScore = calculateTotalScore(targetDoc.data());
                }
            } catch (e) { console.warn(`User ${uid} postTest error`, e); }

            // Calculate Delta
            if (preScore !== 'N/A' && postScore !== 'N/A') {
                const p1 = parseFloat(preScore);
                const p2 = parseFloat(postScore);
                if (!isNaN(p1) && !isNaN(p2)) deltaScore = (p2 - p1).toFixed(2);
            }

            // ============================================================
            // 3. Analyze Training Sessions (G1, G2, G3)
            // ============================================================
            
            // G1
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'g1_sessions'));
                snap.forEach(doc => {
                    const d = doc.data();
                    sessionCount++;
                    totalDurationSec += (d.duration || d.taskDuration || 0);
                    g1BlocksTotal += (d.blocksCompleted || 0);
                });
            } catch (e) {}

            // G2 (GazeData)
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'gazeData'));
                snap.forEach(doc => {
                    const d = doc.data();
                    sessionCount++;
                    validEyeTrackingSessions++;
                    totalDurationSec += (d.taskDuration || d.duration || 0);
                    totalAccuracy += (d.accuracy || 0);
                    totalStability += (d.gazeStability || 0);
                });
            } catch (e) {}

            // G3
            try {
                const snap = await getDocs(collection(db, 'users', uid, 'g3_sessions'));
                snap.forEach(doc => {
                    const d = doc.data();
                    sessionCount++;
                    validEyeTrackingSessions++;
                    totalDurationSec += (d.totalDuration || 0);
                    g1BlocksTotal += (d.g1BlocksCompleted || 0);
                    totalAccuracy += (d.attAccuracy || 0);
                    totalStability += (d.attGazeStability || 0);
                    if ((d.level || 0) > maxG3Level) maxG3Level = d.level;
                });
            } catch (e) {}

            // Averages
            let avgAccuracy = 0;
            let avgStability = 0;
            if (validEyeTrackingSessions > 0) {
                 avgAccuracy = parseFloat((totalAccuracy / validEyeTrackingSessions).toFixed(2));
                 avgStability = parseFloat((totalStability / validEyeTrackingSessions).toFixed(2));
            }

            // ============================================================
            // 4. Assemble Row (确保 Data_Source 被显式赋值)
            // ============================================================
            const row = {
                UID: uid,
                Group: userData.group || 'Unassigned',
                Data_Source: 'REAL_USER_COLLECTIONS', // Explicitly set
                
                Pre_Score: preScore,
                Post_Score: postScore,
                Delta_Score: deltaScore,
                
                Total_Duration_Min: (totalDurationSec / 60).toFixed(2),
                Session_Count: sessionCount,
                
                Avg_Accuracy: avgAccuracy,
                Avg_Stability: avgStability,
                
                G1_Blocks: g1BlocksTotal,
                G3_Level: maxG3Level
            };
            allUserData.push(row);
        }

        console.log(`✅ Extraction Complete. Processed ${allUserData.length} users.`);
        
        const csvContent = convertToCSV(allUserData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const fileName = `REAL_DATA_SCORED_${new Date().toISOString().slice(0,10)}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Fatal Error:", error);
        alert(`Extraction Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};