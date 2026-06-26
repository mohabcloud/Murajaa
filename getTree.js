import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printTree(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach((file, index) => {
        // استبعاد المجلدات التي لا نحتاجها
        if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'dist' || file === '.vscode') return;

        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const isLast = index === files.length - 1;

        // طباعة الملف أو المجلد
        console.log(`${prefix}${isLast ? '└── ' : '├── '}${file}`);

        // إذا كان مجلداً، ندخل داخله ونكرر العملية (Recursive)
        if (stats.isDirectory()) {
            printTree(filePath, `${prefix}${isLast ? '    ' : '│   '}`);
        }
    });
}

console.log('شجرة ملفات المشروع بالكامل:');
printTree(__dirname);