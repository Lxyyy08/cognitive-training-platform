const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid'); // 【新增】引入 uuid 生成 token

// 1. 初始化 Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "fyp22-tme.firebasestorage.app" 
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 配置：本地文件夹 -> Firestore 文档的映射
const TASKS = [
  {
    localFolder: "./images/g1_cats",
    storagePath: "g1_cats",
    firestoreDoc: "stimuli/g1_cats"
  },
  {
    localFolder: "./images/g2_distractors",
    storagePath: "g2_distractors",
    firestoreDoc: "stimuli/g2_distractors"
  }
];

async function uploadFolder(task) {
  const dirPath = path.join(__dirname, task.localFolder);
  
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️ 文件夹不存在，跳过: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
  const publicUrls = [];

  console.log(`\n🚀 开始处理: ${task.localFolder} (共 ${files.length} 张图片)`);

  for (const file of files) {
    const localFilePath = path.join(dirPath, file);
    const destination = `${task.storagePath}/${file}`;

    console.log(`   正在上传: ${file}...`);

    try {
      // 【关键修改 1】生成一个 token
      const token = uuidv4();

      // 上传文件
      await bucket.upload(localFilePath, {
        destination: destination,
        // public: true, // 【删除】不要这一行，它会导致权限错误
        metadata: {
          contentType: 'image/jpeg', // 显式告诉 Firebase 这是图片
          cacheControl: 'public, max-age=31536000',
          metadata: {
            firebaseStorageDownloadTokens: token // 【关键修改 2】把 token 写入元数据
          }
        },
      });

      // 【关键修改 3】拼接标准的 Firebase 下载链接
      // 这种链接带 token，格式正确，React App 可以直接加载
      const encodedPath = encodeURIComponent(destination);
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
      
      publicUrls.push(publicUrl);
      
    } catch (error) {
      console.error(`   ❌ 上传失败 ${file}:`, error.message);
    }
  }

  if (publicUrls.length > 0) {
    console.log(`   💾 正在写入 Firestore: ${task.firestoreDoc}...`);
    const docRef = db.doc(task.firestoreDoc);
    
    await docRef.set({
      urls: publicUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`   ✅ 成功！已保存 ${publicUrls.length} 个链接。`);
  } else {
    console.log("   ⚠️ 没有上传任何图片。");
  }
}

async function main() {
  try {
    for (const task of TASKS) {
      await uploadFolder(task);
    }
    console.log("\n🎉 所有任务完成！请刷新您的应用查看效果。");
  } catch (error) {
    console.error("全局错误:", error);
  }
}

main();