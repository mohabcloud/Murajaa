import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');

// ⚙️ عدد الأجزاء المطلوبة لـ src_components فقط
const COMPONENTS_PARTS = 4;

// تعريف المجموعات - كل الملفات ستكون كاملة، ما عدا src_components سيتم تقسيمها
const bundles = {
    'root_files.txt': ['root_files'],
    'src_root.txt': ['src_root'],
    'src_api.txt': ['src/api'],
    'src_components.txt': ['src/components'], // هذا الملف فقط سيتم تقسيمه
    'src_hooks.txt': ['src/hooks'],
    'src_lib.txt': ['src/lib'],
    'src_pages.txt': ['src/pages'],
    'src_utils.txt': ['src/utils'],
    'public_files.txt': ['public'], // ✅ إضافة مجلد public
};

// دالة لتقسيم المحتوى إلى عدد محدد من الأجزاء
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
        if (partContent.length > 0) {
            parts.push({ index: i + 1, content: partContent });
        }
    }
    
    return parts;
}

// دالة لكتابة ملف (عادي أو مقسم)
function writeBundledFile(baseName, content, forceSplit = false, numParts = 4) {
    const fullPath = path.join(outputDir, baseName);
    
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    // إذا كان الملف صغيراً ولا نريد تقسيمه، اكتبه مباشرة
    if (!forceSplit || content.length < 10000) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ تم إنشاء: ${baseName} (${(content.length / 1024).toFixed(1)} KB)`);
        return;
    }

    // تقسيم الملف إلى العدد المطلوب من الأجزاء
    console.log(`📦 ${baseName} (${(content.length / 1024).toFixed(1)} KB) جاري التقسيم إلى ${numParts} أجزاء...`);
    const parts = splitContentIntoParts(content, numParts);
    
    parts.forEach((part) => {
        const baseWithoutExt = path.basename(baseName, '.txt');
        const partName = `${baseWithoutExt}_part${part.index}.txt`;
        const partPath = path.join(outputDir, partName);
        fs.writeFileSync(partPath, part.content);
        console.log(`   ✅ تم إنشاء: ${partName} (${(part.content.length / 1024).toFixed(1)} KB)`);
    });
}

// ==================== جمع الملفات ====================

function getFiles(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            // استثناء المجلدات غير المرغوب فيها
            if (['node_modules', '.git', 'dist', '.vscode', '.next', 'dev-dist', 'assets'].includes(file)) return;
            // استثناء الملفات الكبيرة أو الثنائية
            if (file === 'quran_complete_data.json') return;
            if (file === 'oauth_client.json') return;
            if (file === 'package-lock.json') return;
            if (file === 'bundleProject.js') return;
            if (file === 'getTree.js') return;
            if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.svg') || file.endsWith('.ico')) return;
            if (file.endsWith('.lock')) return;
            if (file === '8080') return; // ملف بدون امتداد غير مرغوب

            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                // إذا كان المجلد هو public/assets، نتخطاه (الصور)
                if (file === 'assets' && dir.endsWith('public')) return;
                getFiles(filePath, fileList);
            } else if (/\.(js|jsx|json|css|html|md|env|ts|tsx|txt|toml|xml)$/.test(file)) {
                fileList.push({ path: filePath, name: file });
            }
        });
    } catch (e) {
        console.warn(`⚠️ مجلد غير موجود: ${dir}`);
    }
    return fileList;
}

console.log('📦 جاري تقسيم الكود إلى ملفات حسب المجلدات...');

// حذف الملفات القديمة
Object.keys(bundles).forEach(name => {
    const p = path.join(outputDir, name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
});

// جمع جميع الملفات
const allFiles = getFiles(__dirname);

// تصنيف الملفات
Object.entries(bundles).forEach(([bundleName, folders]) => {
    let content = '';
    const isRootFiles = bundleName === 'root_files.txt';
    const isSrcRoot = bundleName === 'src_root.txt';
    const isComponents = bundleName === 'src_components.txt';

    allFiles.forEach(fileObj => {
        const relativePath = fileObj.path.replace(__dirname, '').replace(/\\/g, '/');
        
        if (isRootFiles) {
            // ملفات الجذر (غير داخل src/ أو node_modules أو public)
            if (!relativePath.startsWith('/src/') && !relativePath.startsWith('/node_modules') && !relativePath.startsWith('/public')) {
                content += `\n\n--- FILE: ${relativePath} ---\n\n${fs.readFileSync(fileObj.path, 'utf-8')}`;
            }
        }
        else if (isSrcRoot) {
            if (relativePath.startsWith('/src/') && !relativePath.substring(5).includes('/')) {
                content += `\n\n--- FILE: ${relativePath} ---\n\n${fs.readFileSync(fileObj.path, 'utf-8')}`;
            }
        }
        else if (bundleName === 'public_files.txt') {
            if (relativePath.startsWith('/public/') && !relativePath.startsWith('/public/assets/')) {
                content += `\n\n--- FILE: ${relativePath} ---\n\n${fs.readFileSync(fileObj.path, 'utf-8')}`;
            }
        }
        else {
            if (folders.some(f => relativePath.startsWith(`/${f}`))) {
                content += `\n\n--- FILE: ${relativePath} ---\n\n${fs.readFileSync(fileObj.path, 'utf-8')}`;
            }
        }
    });

    if (content) {
        if (isComponents) {
            writeBundledFile(bundleName, content, true, COMPONENTS_PARTS);
        } else {
            writeBundledFile(bundleName, content, false);
        }
    } else {
        console.log(`⚠️ لا توجد ملفات في: ${bundleName}`);
    }
});

console.log('🎉 تم الإنشاء بنجاح (تم تقسيم src_components فقط إلى 4 أجزاء)!');