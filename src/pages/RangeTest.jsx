// src/pages/RangeTest.jsx
import React, { useState } from 'react';
import { Layers, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ===== مكون Info =====
const InfoIcon = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="inline-flex items-center justify-center cursor-pointer max-md:mt-0.5">
        <Info className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#94a3b8' }} />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" className="max-w-xs text-xs p-3" dir="rtl">
      <p><strong>أيام المراجعة:</strong> أيام تُقرأ فيها أجزاء جديدة.</p>
      <p><strong>أيام التثبيت:</strong> أيام تُراجع فيها الأجزاء السابقة بدلاً من قراءة جديدة.</p>
      <p className="mt-1 text-muted-foreground">تتكرر الدورة تلقائياً طوال مدة الخطة.</p>
    </PopoverContent>
  </Popover>
);

// ===== مكون الإدخال =====
const InputField = ({ label, value, onChange, placeholder }) => (
  <div>
    <Label className="text-sm text-muted-foreground mb-1.5 block">{label}</Label>
    <div className="flex items-center h-10 w-full rounded-xl border border-input bg-transparent px-3 focus-within:ring-1 focus-within:ring-primary">
      <input
        type="number"
        min={1}
        max={30}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-full bg-transparent border-0 p-0 outline-none text-center"
        style={{
          fontSize: '16px',
          lineHeight: '1.3',
          height: '100%',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          background: 'transparent',
          textAlign: 'center',
          color: 'hsl(var(--foreground))',
          WebkitAppearance: 'none',
          appearance: 'none',
          fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif",
        }}
        dir="ltr"
      />
    </div>
  </div>
);

// ===== محاولة 1: w-14 h-8 (الحجم الحالي) =====
const Attempt1 = () => {
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '2px solid #e0e0e0', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>
        1. w-14 h-8 (الحجم الحالي)
      </h3>
      <div className="border-t border-border/40 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-4 h-4 text-primary shrink-0 stroke-[2] max-md:mt-0.5" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">نظام التناوب</h3>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-8 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "left-0.5 translate-x-6" : "left-0.5"
            }`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">(مراجعة / تثبيت)</span>
          <InfoIcon />
        </div>
        {enabled && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-4 mt-3">
            <p className="text-sm text-muted-foreground">حدد دورة من أيام المراجعة تليها أيام تثبيت.</p>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="أيام المراجعة" value={daysOn} onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))} />
              <InputField label="أيام التثبيت" value={daysOff} onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="text-sm text-primary font-medium bg-primary/5 p-3 rounded-lg">
              <span className="font-bold">الدورة:</span> {daysOn} يوم مراجعة → {daysOff} يوم تثبيت
            </div>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-1.5 mt-4" variant="outline">
        <Sparkles className="w-4 h-4 stroke-[2]" style={{ color: 'hsl(var(--primary))' }} />
        معاينة الخطة
      </Button>
    </div>
  );
};

// ===== محاولة 2: w-12 h-7 (أصغر قليلاً) =====
const Attempt2 = () => {
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '2px solid #3b82f6', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#3b82f6' }}>
        2. w-12 h-7 (أصغر قليلاً)
      </h3>
      <div className="border-t border-border/40 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-4 h-4 text-primary shrink-0 stroke-[2] max-md:mt-0.5" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">نظام التناوب</h3>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "left-0.5 translate-x-5" : "left-0.5"
            }`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">(مراجعة / تثبيت)</span>
          <InfoIcon />
        </div>
        {enabled && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-4 mt-3">
            <p className="text-sm text-muted-foreground">حدد دورة من أيام المراجعة تليها أيام تثبيت.</p>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="أيام المراجعة" value={daysOn} onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))} />
              <InputField label="أيام التثبيت" value={daysOff} onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="text-sm text-primary font-medium bg-primary/5 p-3 rounded-lg">
              <span className="font-bold">الدورة:</span> {daysOn} يوم مراجعة → {daysOff} يوم تثبيت
            </div>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-1.5 mt-4" variant="outline">
        <Sparkles className="w-4 h-4 stroke-[2]" style={{ color: 'hsl(var(--primary))' }} />
        معاينة الخطة
      </Button>
    </div>
  );
};

// ===== محاولة 3: w-10 h-6 (أصغر) =====
const Attempt3 = () => {
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '2px solid #f59e0b', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#f59e0b' }}>
        3. w-10 h-6 (أصغر)
      </h3>
      <div className="border-t border-border/40 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-4 h-4 text-primary shrink-0 stroke-[2] max-md:mt-0.5" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">نظام التناوب</h3>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-10 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "left-0.5 translate-x-4.5" : "left-0.5"
            }`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">(مراجعة / تثبيت)</span>
          <InfoIcon />
        </div>
        {enabled && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-4 mt-3">
            <p className="text-sm text-muted-foreground">حدد دورة من أيام المراجعة تليها أيام تثبيت.</p>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="أيام المراجعة" value={daysOn} onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))} />
              <InputField label="أيام التثبيت" value={daysOff} onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="text-sm text-primary font-medium bg-primary/5 p-3 rounded-lg">
              <span className="font-bold">الدورة:</span> {daysOn} يوم مراجعة → {daysOff} يوم تثبيت
            </div>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-1.5 mt-4" variant="outline">
        <Sparkles className="w-4 h-4 stroke-[2]" style={{ color: 'hsl(var(--primary))' }} />
        معاينة الخطة
      </Button>
    </div>
  );
};

// ===== محاولة 4: w-9 h-5 (الأصغر) =====
const Attempt4 = () => {
  const [daysOn, setDaysOn] = useState(2);
  const [daysOff, setDaysOff] = useState(2);
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '2px solid #8b5cf6', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '10px', color: '#8b5cf6' }}>
        4. w-9 h-5 (الأصغر)
      </h3>
      <div className="border-t border-border/40 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-4 h-4 text-primary shrink-0 stroke-[2] max-md:mt-0.5" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">نظام التناوب</h3>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
              enabled ? "left-0.5 translate-x-4" : "left-0.5"
            }`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">(مراجعة / تثبيت)</span>
          <InfoIcon />
        </div>
        {enabled && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-4 mt-3">
            <p className="text-sm text-muted-foreground">حدد دورة من أيام المراجعة تليها أيام تثبيت.</p>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="أيام المراجعة" value={daysOn} onChange={(e) => setDaysOn(Math.max(1, parseInt(e.target.value) || 1))} />
              <InputField label="أيام التثبيت" value={daysOff} onChange={(e) => setDaysOff(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="text-sm text-primary font-medium bg-primary/5 p-3 rounded-lg">
              <span className="font-bold">الدورة:</span> {daysOn} يوم مراجعة → {daysOff} يوم تثبيت
            </div>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-1.5 mt-4" variant="outline">
        <Sparkles className="w-4 h-4 stroke-[2]" style={{ color: 'hsl(var(--primary))' }} />
        معاينة الخطة
      </Button>
    </div>
  );
};

// ===== المكون الرئيسي =====
export default function RangeTest() {
  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '700px',
        margin: '0 auto',
        fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif",
        direction: 'rtl',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#1A6E5A' }}>🧪 اختبار حجم زر التناوب (مع شكل السطرين)</h2>
      <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        السطر الأول: [أيقونة] نظام التناوب [الزر] | السطر الثاني: (مراجعة / تثبيت) [i]
      </p>

      <Attempt1 />
      <Attempt2 />
      <Attempt3 />
      <Attempt4 />

      <div
        style={{
          background: '#d4edda',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          border: '1px solid #c3e6cb',
        }}
      >
        <p style={{ fontSize: '13px', color: '#155724', textAlign: 'center', margin: 0 }}>
          📱 <strong>التعليمات:</strong>
          <br />
          1. اختبر الأحجام المختلفة على هاتفك.
          <br />
          2. لاحظ أن شكل السطرين محفوظ في جميع المحاولات.
          <br />
          <br />
          <strong>محاولة 1:</strong> w-14 h-8 (الحجم الحالي)
          <br />
          <strong>محاولة 2:</strong> w-12 h-7 (أصغر قليلاً) ✅
          <br />
          <strong>محاولة 3:</strong> w-10 h-6 (أصغر)
          <br />
          <strong>محاولة 4:</strong> w-9 h-5 (الأصغر)
        </p>
      </div>
    </div>
  );
}