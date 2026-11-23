#!/usr/bin/env python3
# make_bundle.py
import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(ROOT_DIR, "murajaa_bundle.txt")

# المجلدات والملفات المستبعدة
EXCLUDED_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".vite",
    ".wrangler",
    "public",
    "__pycache__",
}

EXCLUDED_FILES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "quran_complete_data.json",
    "murajaa_bundle.txt",
    "make_bundle.py",
    ".DS_Store",
}

ALLOWED_EXTENSIONS = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".json",
}

HEADER = """# ============================================================
# 📦 حزمة ملفات مشروع "مُراجِع" - تطبيق إدارة حفظ ومراجعة القرآن
# ============================================================
#
# 📌 السياق:
# - تطبيق ويب عربي RTL لإدارة حفظ ومراجعة القرآن، اسمه "مُراجِع" (مُصمم للتحويل لتطبيق هاتف لاحقاً).
# - التقنيات: React 18.2 + Vite 6.1 + Tailwind CSS 3.4 + shadcn/ui + Radix UI + date-fns (ar-SA).
# - الاستضافة: Cloudflare Pages على murajaa.pages.dev.
# - التخزين: Google Drive API v3 (drive.appdata) + localStorage كـ cache.
# - quran_complete_data.json (~2.8MB) موجود ويُستخدم في quranData.js، ولا يُرسل.
#
# 🖥️ بيئة التطوير: Linux Lite، npm run dev (يعمل تلقائياً على الشبكة المحلية).
# ============================================================
"""


def should_include_file(filename):
    if filename in EXCLUDED_FILES:
        return False
    if filename.startswith(".env"):
        return False
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_EXTENSIONS


def build_bundle():
    collected_files = []

    for current_root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = sorted([d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith(".")])
        for file in sorted(files):
            if should_include_file(file):
                full_path = os.path.join(current_root, file)
                rel_path = "/" + os.path.relpath(full_path, ROOT_DIR).replace(os.sep, "/")
                collected_files.append((rel_path, full_path))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(HEADER.strip() + "\n\n\n")
        for rel_path, full_path in collected_files:
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                out.write(f"\n--- FILE: {rel_path} ---\n\n")
                out.write(content.rstrip() + "\n\n")
            except Exception as e:
                print(f"⚠️ تعذّرت قراءة {rel_path}: {e}")

    print(f"✅ تم إنشاء {os.path.basename(OUTPUT_FILE)} بنجاح ({len(collected_files)} ملف).")


if __name__ == "__main__":
    build_bundle()