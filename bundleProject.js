import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const homeDir = process.env.USERPROFILE || process.env.HOME;

// ✅ تم التعديل: الكشف التلقائي عن مجلد "التنزيلات" العربي في لينكس أولاً، ثم "Downloads"
function resolveOutputDir() {
  const candidates = [
    path.join(homeDir, 'التنزيلات'),
    path.join(homeDir, 'Downloads'),
    __dirname,
  ];
  return candidates.find((dir) => fs.existsSync(dir)) || __dirname;
}

const outputDir = resolveOutputDir();

// ✅ تم التعديل: ملف واحد متكامل يناسب نافذة سياق Gemini الضخمة دون قصّ الملفات
const NUM_PARTS = 1;
const MIN_SPLIT_SIZE = 40000; // 40KB

// 📋 قائمة الملفات المطلوبة فقط (بالترتيب حسب الأهمية)
const FILES_TO_BUNDLE = [
  // === 1. ملفات الإعداد والنشر ===
  'package.json',
  'vite.config.js',
  'tailwind.config.js', // ✅ مضاف: إعدادات الألوان والخطوط والأنيميشن
  'postcss.config.js',  // ✅ مضاف: إعدادات PostCSS
  'index.html',
  '_routes.json',
  'manifest.json',

  // === 2. نقطة الدخول والستايل ===
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',

  // === 3. منطق التطبيق (قلب المشروع) ===
  'src/lib/utils.js',
  'src/lib/quranData.js',
  'src/lib/quranPlanEngine.js',
  'src/lib/planStorage.js',
  'src/lib/googleDrive.js',
  'src/lib/PageNotFound.jsx', // ✅ مضاف: صفحة 404

  // === 4. الهوكس والصفحات والمكونات الرئيسية ===
  'src/hooks/use-mobile.jsx', // ✅ مضاف: هوك كشف حجم الشاشة
  'src/pages/Home.jsx',
  'src/components/ScrollToTop.jsx', // ✅ مضاف: إعادة التمرير لأعلى
  'src/components/quran/CreatePlanForm.jsx',
  'src/components/quran/Dashboard.jsx',
  'src/components/quran/StatCard.jsx',
  'src/components/quran/ScheduleView.jsx',
  'src/components/quran/DayCard.jsx',
  'src/components/quran/FlexibleEntryPanel.jsx',
  'src/components/quran/ProgressRing.jsx',
  'src/components/quran/QuranDetailsPopover.jsx',
  'src/components/QuranInteractivePicker.jsx',
  'src/components/SplashScreen.jsx',

  // === 5. مكونات shadcn المستخدمة فعلاً ===
  'src/components/ui/arabic-date-picker.tsx',
  'src/components/ui/calendar.jsx', // ✅ مضاف: يعتمد عليه ArabicDatePicker
  'src/components/ui/button.jsx',
  'src/components/ui/input.jsx',
  'src/components/ui/label.jsx',
  'src/components/ui/popover.jsx',
  'src/components/ui/select.jsx',
  'src/components/ui/sheet.jsx', // ✅ مضاف: القوائم الجانبية على الهاتف
  'src/components/ui/tooltip.jsx',
  'src/components/ui/dialog.jsx',
  'src/components/ui/alert-dialog.jsx',
  'src/components/ui/dropdown-menu.jsx',
];

// ✅ تم التحديث: رأس توضيحي يعكس حالة المشروع الحالية (نوفمبر 2026)
const HEADER = `# ============================================================
# 📦 حزمة ملفات مشروع "مُراجِع" - تطبيق مراجعة القرآن
# ============================================================
#
# 📌 السياق:
# - تطبيق ويب عربي RTL لإدارة مراجعة القرآن، اسمه "مُراجِع" (مُصمم للتحويل لتطبيق هاتف لاحقاً).
# - التقنيات: React 18.2 + Vite 6.1 + Tailwind CSS 3.4 + shadcn/ui + Radix UI + date-fns (ar-SA).
# - الاستضافة: Cloudflare Pages على murajaa.pages.dev.
# - التخزين: Google Drive API v3 (drive.appdata) + localStorage كـ cache.
# - quran_complete_data.json (~2.8MB) موجود ويُستخدم في quranData.js، ولا يُرسل.
#
# ✅ التعديلات الأخيرة المنجزة:
# - إصلاح الأخطاء الحرجة في محرك الخطط والمزامنة (Round 1 & 2 & 3).
# - توحيد نظام الألوان الدلالي (primary / accent / destructive / muted) وتحويل جميع الأرقام للعربية.
# - توحيد سلوك hover/focus في جميع الحقول ومنتقي التاريخ والسور.
#
# ⚠️ الأولوية الحالية:
# - حل مشكلة الوصول للتطبيق من الهاتف عبر الشبكة المحلية على Linux Lite (منفذ 5173).
# - المراجعة الشاملة والبدء في الميزات الجديدة.
#
# 🖥️ بيئة التطوير: Linux Lite، npm run dev -- --host.
# ============================================================

`;

// ============================================================
// أدوات مساعدة
// ============================================================

function splitContentIntoParts(content, numParts) {
  if (numParts <= 1) return [{ index: 1, content }];

  const lines = content.split('\n');
  const totalLines = lines.length;
  const linesPerPart = Math.ceil(totalLines / numParts);
  const parts = [];

  for (let i = 0; i < numParts; i++) {
    const start = i * linesPerPart;
    const end = Math.min(start + linesPerPart, totalLines);
    const partContent = lines.slice(start, end).join('\n');
    if (partContent.trim().length > 0) {
      parts.push({ index: i + 1, content: partContent });
    }
  }

  return parts;
}

function writeBundledFile(baseName, content, forceSplit = false) {
  // حذف أي ملفات قديمة بنفس الاسم (بما في ذلك الأجزاء القديمة _part1..4)
  const oldFiles = fs.readdirSync(outputDir).filter((f) => {
    const baseWithoutExt = path.basename(baseName, '.txt');
    return f === baseName || f.startsWith(`${baseWithoutExt}_part`);
  });
  oldFiles.forEach((f) => fs.unlinkSync(path.join(outputDir, f)));

  // إذا كان صغيراً أو التقسيم معطلاً، اكتبه في ملف واحد مباشرة
  if (!forceSplit || NUM_PARTS <= 1 || content.length < MIN_SPLIT_SIZE) {
    const fullPath = path.join(outputDir, baseName);
    fs.writeFileSync(fullPath, content);
    console.log(`✅ ${baseName} (${(content.length / 1024).toFixed(1)} KB)`);
    return;
  }

  // تقسيم
  console.log(`📦 ${baseName} (${(content.length / 1024).toFixed(1)} KB) → ${NUM_PARTS} أجزاء`);
  const parts = splitContentIntoParts(content, NUM_PARTS);

  parts.forEach((part) => {
    const baseWithoutExt = path.basename(baseName, '.txt');
    const partName = `${baseWithoutExt}_part${part.index}.txt`;
    const partPath = path.join(outputDir, partName);
    fs.writeFileSync(partPath, part.content);
    console.log(`   ✅ ${partName} (${(part.content.length / 1024).toFixed(1)} KB)`);
  });
}

// ============================================================
// التشغيل الرئيسي
// ============================================================

console.log('📦 جاري جمع الملفات المحددة فقط...\n');

let fullContent = HEADER;
const foundFiles = [];
const missingFiles = [];

FILES_TO_BUNDLE.forEach((relativePath) => {
  const fullPath = path.join(__dirname, relativePath);

  if (!fs.existsSync(fullPath)) {
    missingFiles.push(relativePath);
    return;
  }

  try {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    fullContent += `\n\n--- FILE: /${relativePath} ---\n\n${fileContent}\n`;
    foundFiles.push(relativePath);
  } catch (err) {
    console.error(`❌ خطأ في قراءة ${relativePath}:`, err.message);
    missingFiles.push(relativePath);
  }
});

// ملخص
console.log(`\n✅ تم جمع ${foundFiles.length} ملف.`);
if (missingFiles.length > 0) {
  console.log(`\n⚠️ ملفات غير موجودة (تم تخطيها):`);
  missingFiles.forEach((f) => console.log(`   - ${f}`));
}

if (foundFiles.length === 0) {
  console.error('\n❌ لا توجد ملفات لجمعها!');
  process.exit(1);
}

// ✅ كتابة الملف النهائي في ملف واحد متكامل (false لتعطيل التقسيم)
console.log('');
writeBundledFile('murajaa_bundle.txt', fullContent, false);

console.log(`\n🎉 تم بنجاح! الملف موجود في: ${outputDir}`);
console.log(`📊 الحجم الإجمالي: ${(fullContent.length / 1024).toFixed(1)} KB`);