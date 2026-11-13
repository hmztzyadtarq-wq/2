/* =========================================================
   ProTech — firebase.js  (الملف السابع: كل ما يخص فايربيز)
   بيتحمّل في صفحة الأدمن وصفحة الموقع بعد مكتبات فايربيز (compat).
   فيه: الإعدادات + التهيئة + رفع الصور/الفيديو من الجهاز.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBzFacVVTAe2fMvCDXwexfd6Wi7cI7_1gc",
  authDomain: "bro-tech-mane.firebaseapp.com",
  projectId: "bro-tech-mane",
  storageBucket: "bro-tech-mane.firebasestorage.app",
  messagingSenderId: "391259453925",
  appId: "1:391259453925:web:0fdf19af7e23d469bb970c",
  measurementId: "G-467280QJFT"
};

/* ---------- إيميلات الأدمن المسموح لها بدخول لوحة التحكم ----------
   ⚠️ مهم: اكتب هنا إيميل الأدمن بتاعك (ممكن أكتر من إيميل).
   مثال:  const ADMIN_EMAILS = ["owner@gmail.com"];
   لو سبتها فاضية، أي حساب مسجّل (حتى حسابات الزبائن) هيقدر يدخل اللوحة! */
const ADMIN_EMAILS = [];

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = (typeof firebase.auth === 'function') ? firebase.auth() : null;
const storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;

/* ---------- ضغط الصورة قبل الرفع (بيصغّر الحجم ويسرّع الرفع) ---------- */
function compressImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر معالجة الصورة')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('الملف ده مش صورة صالحة')); };
    img.src = url;
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    r.readAsDataURL(blob);
  });
}

/* ---------- رفع ملف من الجهاز وإرجاع رابطه ----------
   • الصور: بتتضغط الأول، وبتترفع على Firebase Storage.
     لو Storage مش شغّال أو الرفع فشل، الصورة بتتحفظ مضغوطة جوه قاعدة
     البيانات نفسها — فالرفع من الجهاز بيشتغل في كل الأحوال من غير رابط.
   • الفيديو: لازم Firebase Storage يكون مفعّل (الفيديو أكبر من إنه يتحفظ في قاعدة البيانات). */
async function uploadMedia(file, onProgress) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) throw new Error('اختار صورة أو فيديو فقط');

  let payload = file;
  if (isImage) payload = await compressImage(file, 1400, 0.82);

  // محاولة الرفع على Storage
  if (storage) {
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const task = storage.ref(`uploads/${Date.now()}_${safeName}`).put(payload);
      const url = await new Promise((resolve, reject) => {
        let stalled = setTimeout(() => { try { task.cancel(); } catch (e) {} reject(new Error('timeout')); }, isImage ? 20000 : 600000);
        task.on('state_changed', (snap) => {
          if (snap.bytesTransferred > 0) { clearTimeout(stalled); stalled = null; }
          if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }, (err) => { if (stalled) clearTimeout(stalled); reject(err); },
        () => { if (stalled) clearTimeout(stalled); task.snapshot.ref.getDownloadURL().then(resolve, reject); });
      });
      return url;
    } catch (err) {
      if (isVideo) throw new Error('رفع الفيديو محتاج تفعيل Firebase Storage في مشروعك (' + (err.code || err.message) + ')');
      console.warn('Storage upload failed, using embedded image instead:', err.code || err.message);
    }
  }

  // بديل الصور: نحفظها مضغوطة كنص داخل Firestore (لازم تفضل صغيرة)
  let blob = await compressImage(file, 900, 0.7);
  if (blob.size > 250 * 1024) blob = await compressImage(file, 700, 0.55);
  if (blob.size > 350 * 1024) throw new Error('الصورة كبيرة قوي، جرّب صورة أصغر');
  if (onProgress) onProgress(100);
  return blobToDataURL(blob);
}
