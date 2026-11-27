// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { loadAllPlans, saveAllPlans, savePlan, deletePlan, loadActivePlan, setActivePlanId, mergeImportedPlans } from "@/lib/planStorage";
import { initQuranData } from "@/lib/quranData";
import { syncPlanSchedule, toArabicNumbers, getLocalToday } from "@/lib/quranPlanEngine";
import CreatePlanForm from "@/components/quran/CreatePlanForm";
import Dashboard from "@/components/quran/Dashboard";
import { BookOpen, BookmarkCheck, Moon, Sun, AlertCircle, Download, Upload, RefreshCw, Cloud, CloudOff, MoreVertical, Smartphone, WifiOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initGoogleDrive, signInToDrive, signOutFromDrive, syncFromDrive, uploadToDrive, checkSignedIn } from "@/lib/googleDrive";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ===== دالة عرض Toast مخصصة (مع دعم إجراء اختياري مثل التراجع) =====
const showCustomToast = (type, title, description, extraOpts = {}) => {
  const content = (
    <div className="w-full text-right" dir="rtl">
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );

  const opts = {
    duration: extraOpts.action ? 5500 : 4000,
    className: "murajaa-toast",
    ...extraOpts,
  };

  if (type === 'success') toast.success(content, opts);
  else if (type === 'error') toast.error(content, opts);
  else if (type === 'info') toast.info(content, opts);
  else if (type === 'warning') toast.warning(content, opts);
  else toast(content, opts);
};

// ✅ تطبيع ومزامنة جميع الخطط
function normalizeAndSyncPlans(rawPlans) {
  let anyChanged = false;
  const syncedPlans = rawPlans.map((p) => {
    const base = !p.schedule
      ? { ...p, planType: p.planType || "review", schedule: [], completedVerses: 0, totalPages: p.totalPages || 1, totalVerses: p.totalVerses || 0 }
      : { ...p, planType: p.planType || "review" };
    const { plan: updated, changed } = syncPlanSchedule(base);
    if (changed) {
      anyChanged = true;
      return { ...updated, updatedAt: new Date().toISOString() };
    }
    return updated;
  });

  if (anyChanged) {
    saveAllPlans(syncedPlans, false);
  }
  return syncedPlans;
}

export default function Home() {
  const [allPlans, setAllPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [quranReady, setQuranReady] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [draftPlanType, setDraftPlanType] = useState("review");
  // ✅ متابعة حالة الاتصال بالإنترنت وإتاحة تثبيت التطبيق (PWA)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  });

  const driveTimeoutRef = useRef(null);
  const mobileImportInputRef = useRef(null);

  const scrollToPageTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const currentThemeType = (showCreateForm || isEditSheetOpen)
    ? draftPlanType
    : (activePlan?.planType || "review");

  // ✅ تحديث الثيم ولون شريط الحالة في التطبيق المثبّت (theme-color) تلقائياً
  useEffect(() => {
    if (currentThemeType === "memorization") {
      document.documentElement.setAttribute("data-plan-theme", "memorization");
    } else {
      document.documentElement.removeAttribute("data-plan-theme");
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      const color = isDark
        ? (currentThemeType === "memorization" ? "#16130e" : "#0d1714")
        : (currentThemeType === "memorization" ? "#ad8229" : "#1A6E5A");
      themeColorMeta.setAttribute("content", color);
    }
  }, [currentThemeType, isDark]);

  // ✅ التقاط حدث التثبيت لإتاحة زر "تثبيت التطبيق" للأجهزة الداعمة
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      showCustomToast('success', 'تم تثبيت التطبيق بنجاح', 'يمكنك الآن فتح مُراجِع من الشاشة الرئيسية والعمل بدون إنترنت.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (err) {
      console.warn('⚠️ Install prompt failed:', err);
    }
  };

  const reloadPlans = () => {
    try {
      const plans = normalizeAndSyncPlans(loadAllPlans());
      setAllPlans(plans);
      const active = loadActivePlan();
      setActivePlan(active);
      setShowCreateForm(plans.length === 0);
    } catch (err) {
      console.error('❌ Error reloading plans:', err);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      showCustomToast('info', 'أنت في وضع عدم الاتصال', 'بياناتك محفوظة على جهازك، وستتمكن من المزامنة فور عودة الإنترنت.');
      return;
    }
    if (!driveConnected || !checkSignedIn()) {
      setDriveConnected(false);
      showCustomToast('warning', 'غير متصل بـ Drive', 'يرجى ربط حساب Google أولاً.');
      return;
    }
    setSyncing(true);
    try {
      const plans = await syncFromDrive();
      if (plans) {
        reloadPlans();
        showCustomToast('success', 'تمت المزامنة', `تم دمج ومزامنة ${toArabicNumbers(plans.length)} خطة بنجاح.`);
      } else {
        await uploadToDrive();
        showCustomToast('success', 'تمت المزامنة', 'تم رفع بياناتك المحلية إلى السحابة.');
      }
    } catch (error) {
      setDriveConnected(checkSignedIn());
      showCustomToast('error', 'فشلت المزامنة', error.message || 'حدث خطأ');
    } finally {
      setSyncing(false);
    }
  };

  // ✅ تهيئة Google Drive عند بدء التشغيل (فقط عند توفر الإنترنت)
  useEffect(() => {
    const initDrive = async () => {
      if (!navigator.onLine) return;
      try {
        await initGoogleDrive();
        const signedIn = checkSignedIn();
        setDriveConnected(signedIn);
        if (signedIn) {
          try {
            await syncFromDrive();
            reloadPlans();
          } catch (syncError) {
            setDriveConnected(checkSignedIn());
            if (!syncError?.isAuthExpired) {
              console.warn('⚠️ Auto-sync failed:', syncError);
            }
            reloadPlans();
          }
        }
      } catch (error) {
        console.warn('⚠️ Drive init failed:', error);
      }
    };
    initDrive();
  }, []);

  // ✅ مراقبة عودة وانقطاع الإنترنت والمزامنة التلقائية الصامتة عند عودة الاتصال
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        await initGoogleDrive();
        const signedIn = checkSignedIn();
        setDriveConnected(signedIn);
        if (signedIn) {
          const plans = await syncFromDrive();
          if (plans) {
            reloadPlans();
            showCustomToast('success', 'عاد الاتصال وتمت المزامنة', 'تم تحديث خططك مع Google Drive تلقائياً.');
          }
        }
      } catch (err) {
        setDriveConnected(checkSignedIn());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleConnectDrive = async () => {
    if (!isOnline) {
      showCustomToast('info', 'أنت في وضع عدم الاتصال', 'يمكنك المتابعة بالعمل محلياً وربط Google Drive عند عودة الإنترنت.');
      return;
    }

    setDriveLoading(true);
    driveTimeoutRef.current = setTimeout(() => {
      setDriveLoading(false);
    }, 15000);

    try {
      await signInToDrive();
      setDriveConnected(true);
      try {
        const plans = await syncFromDrive();
        if (plans) {
          reloadPlans();
          showCustomToast(
            'success',
            'تم الربط والدمج بنجاح',
            `تم دمج خططك المحفوظة مع السحابة (الإجمالي: ${toArabicNumbers(plans.length)} خطة).`
          );
        } else {
          await uploadToDrive();
          reloadPlans();
          showCustomToast('success', 'تم الربط', 'تم رفع بياناتك المحلية إلى السحابة.');
        }
      } catch (syncError) {
        setDriveConnected(checkSignedIn());
        console.error('⚠️ Sync error:', syncError);
        reloadPlans();
        showCustomToast('warning', 'تم الربط لكن فشلت المزامنة', 'يمكنك المحاولة يدوياً باستخدام زر المزامنة.');
      }
    } catch (error) {
      const errorMsg = error?.message || error?.error || '';
      const isCancellation = errorMsg.includes('popup_closed') || errorMsg.includes('access_denied') || errorMsg.includes('cancelled') || errorMsg.includes('User cancelled') || errorMsg.includes('user closed');
      if (!isCancellation) {
        showCustomToast('error', 'فشل ربط Google Drive', errorMsg || 'حدث خطأ غير متوقع');
      }
    } finally {
      clearTimeout(driveTimeoutRef.current);
      driveTimeoutRef.current = null;
      setDriveLoading(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try { await signOutFromDrive(); } catch (e) { console.warn('Sign out failed:', e); }
    setDriveConnected(false);
    showCustomToast('info', 'تم فصل Google Drive', 'ستستمر البيانات محلياً');
  };

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        await initQuranData();
        setQuranReady(true);
        const plans = normalizeAndSyncPlans(loadAllPlans());
        setAllPlans(plans);
        const active = loadActivePlan();
        setActivePlan(active);
        setShowCreateForm(plans.length === 0);
        const prefersDark = localStorage.getItem("quran_dark_mode") === "true";
        setIsDark(prefersDark);
        if (prefersDark) document.documentElement.classList.add("dark");
        setLoading(false);
      } catch (err) {
        console.error("خطأ في التهيئة:", err);
        setError(err.message || "حدث خطأ أثناء تحميل بيانات القرآن");
        setLoading(false);
        setQuranReady(false);
      }
    }
    init();
  }, []);

  const toggleDarkMode = () => {
    const newVal = !isDark;
    setIsDark(newVal);
    localStorage.setItem("quran_dark_mode", String(newVal));
    document.documentElement.classList.toggle("dark", newVal);
  };

  const handlePlanCreated = (newPlan) => {
    if (!newPlan.schedule) newPlan.schedule = [];
    const saved = savePlan(newPlan);
    setAllPlans(prev => [...prev, saved]);
    setActivePlan(saved);
    setShowCreateForm(false);
    scrollToPageTop();
    showCustomToast('success', 'تم إنشاء الخطة بنجاح', `الخطة "${saved.name}" جاهزة للبدء.`);
  };

  const handlePlanUpdate = (updatedPlan, customToast = null) => {
    if (!updatedPlan.schedule) updatedPlan.schedule = [];
    const saved = savePlan(updatedPlan);
    setAllPlans(prev => prev.map(p => p.id === saved.id ? saved : p));
    setActivePlan(saved);

    if (customToast) {
      showCustomToast(
        customToast.type || 'success',
        customToast.title || 'تم تحديث الخطة',
        customToast.description,
        customToast.action ? { action: customToast.action } : {}
      );
    } else {
      showCustomToast('success', 'تم تحديث الخطة', `تم حفظ التغييرات في "${saved.name}".`);
    }
  };

  const handleDeletePlan = (id) => {
    const planToDelete = allPlans.find(p => p.id === id);
    deletePlan(id);
    const updated = loadAllPlans();
    setAllPlans(updated);
    setActivePlan(loadActivePlan());
    if (updated.length === 0) {
      setDraftPlanType("review");
      setShowCreateForm(true);
      scrollToPageTop();
    }
    showCustomToast('success', 'تم حذف الخطة', planToDelete ? `تم حذف "${planToDelete.name}" بنجاح.` : 'تم الحذف بنجاح.');
  };

  const handleSwitchPlan = (id) => {
    setActivePlanId(id);
    setActivePlan(allPlans.find(p => p.id === id) || null);
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setDraftPlanType("review");
    setShowCreateForm(true);
    scrollToPageTop();
  };

  const handleCancelCreate = () => {
    if (allPlans.length > 0) {
      setShowCreateForm(false);
      scrollToPageTop();
    }
    setIsEditSheetOpen(false);
    setEditingPlan(null);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setDraftPlanType(plan.planType || "review");
    setIsEditSheetOpen(true);
  };

  const handleEditSubmit = (updatedPlan) => {
    handlePlanUpdate(updatedPlan);
    setIsEditSheetOpen(false);
    setEditingPlan(null);
  };

  const handleExport = () => {
    const plans = loadAllPlans();
    if (plans.length === 0) {
      showCustomToast('info', 'لا توجد خطط', 'ليس لديك أي خطط لحفظها كنسخة احتياطية.');
      return;
    }
    const dataStr = JSON.stringify(plans, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `murajaa_backup_${getLocalToday()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCustomToast('success', 'تم التصدير بنجاح', `تم تصدير ${toArabicNumbers(plans.length)} خطة كملف JSON.`);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedPlans = Array.isArray(parsed) ? parsed : (parsed?.plans && Array.isArray(parsed.plans) ? parsed.plans : null);

        if (!importedPlans || importedPlans.length === 0) {
          showCustomToast('error', 'ملف غير صالح', 'الملف لا يحتوي على خطط صالحة.');
          return;
        }

        const validPlans = importedPlans.filter((p) => p && typeof p === 'object' && p.name && p.startDate && p.endDate);
        if (validPlans.length === 0) {
          showCustomToast('error', 'ملف غير صالح', 'لم يتم العثور على خطط مكتملة البيانات داخل الملف.');
          return;
        }

        mergeImportedPlans(validPlans);
        const reloadedPlans = normalizeAndSyncPlans(loadAllPlans());
        setAllPlans(reloadedPlans);
        setActivePlan(loadActivePlan());
        setShowCreateForm(reloadedPlans.length === 0);
        showCustomToast(
          'success',
          'تم الاستيراد والدمج بنجاح',
          `تم دمج ${toArabicNumbers(validPlans.length)} خطة مع خططك الحالية (الإجمالي: ${toArabicNumbers(reloadedPlans.length)} خطة).`
        );
      } catch (err) {
        showCustomToast('error', 'خطأ في الاستيراد', 'الملف غير صالح أو تالف.');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">حدث خطأ أثناء تحميل بيانات القرآن</h2>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            إعادة تحميل
          </button>
        </div>
      </div>
    );
  }

  if (loading || !quranReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" dir="rtl">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات المصحف...</p>
      </div>
    );
  }

  const tooltipColors = {
    bg: isDark ? 'hsl(var(--popover))' : '#ffffff',
    text: isDark ? 'hsl(var(--popover-foreground))' : '#1e293b',
    border: isDark ? 'hsl(var(--border))' : '#e2e8f0',
  };

  const canInstallPwa = Boolean(installPrompt && !isStandalone);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* الشعار والعنوان */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20 shrink-0 transition-colors duration-300">
              {currentThemeType === "memorization" ? (
                <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" strokeWidth={2.5} />
              ) : (
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold font-heading text-foreground leading-tight whitespace-nowrap">
                  مُراجِع
                </h1>
                {/* ✅ شارة لطيفة توضح وضع عدم الاتصال مع استمرار الحفظ المحلي */}
                {!isOnline && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 whitespace-nowrap"
                    title="أنت تعمل بدون إنترنت وبياناتك محفوظة محلياً"
                  >
                    <WifiOff className="w-3 h-3 shrink-0" />
                    <span className="hidden xs:inline sm:inline">أوفلاين</span>
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-muted-foreground leading-tight whitespace-nowrap mt-0.5">
                إدارة حفظ ومراجعة القرآن
              </p>
            </div>
          </div>

          {/* أزرار الأدوات */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 1. عرض سطح المكتب والأجهزة اللوحية (sm فأكبر) */}
            {canInstallPwa && (
              <div className="hidden sm:flex items-center border-e border-border/40 pe-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleInstallApp}
                        className="h-9 px-3 rounded-xl flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 active:scale-95 transition-all duration-200 text-xs font-semibold"
                      >
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>تثبيت التطبيق</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                      <p>حفظ مُراجِع كتطبيق يعمل بدون إنترنت</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1 border-e border-border/40 pe-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleExport} className="h-9 w-9 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-muted/40 active:scale-95 transition-all duration-200">
                      <Download className="w-4 h-4 text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>تصدير الخطط</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="h-9 w-9 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-muted/40 active:scale-95 transition-all duration-200 cursor-pointer">
                      <Upload className="w-4 h-4 text-foreground" />
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>استيراد ودمج الخطط</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleManualSync} disabled={!isOnline || !driveConnected || syncing} className="h-9 w-9 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-muted/40 active:scale-95 transition-all duration-200 disabled:opacity-50">
                      {syncing ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className={`w-4 h-4 ${!isOnline || !driveConnected ? 'text-muted-foreground/50' : 'text-foreground'}`} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>{!isOnline ? 'وضع بدون إنترنت · الحفظ محلياً' : !driveConnected ? 'غير متصل بـ Drive' : 'مزامنة مع Drive'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={driveConnected ? handleDisconnectDrive : handleConnectDrive} disabled={driveLoading || (!isOnline && !driveConnected)} className="h-9 w-9 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-muted/40 active:scale-95 transition-all duration-200 disabled:opacity-50">
                      {driveLoading ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : driveConnected ? (
                        <Cloud className="w-4 h-4 text-primary" />
                      ) : (
                        <CloudOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>{!isOnline ? 'لا يوجد اتصال بالإنترنت' : driveConnected ? 'فصل Google Drive' : 'ربط Google Drive'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* 2. عرض الهاتف (< sm) */}
            <div className="flex sm:hidden items-center gap-1">
              {canInstallPwa && (
                <button
                  type="button"
                  onClick={handleInstallApp}
                  aria-label="تثبيت التطبيق على الهاتف"
                  className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/30 text-primary active:scale-95 transition-all duration-200 focus:outline-none"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={driveConnected ? handleDisconnectDrive : handleConnectDrive}
                disabled={driveLoading}
                aria-label={driveConnected ? 'فصل Google Drive' : 'ربط Google Drive'}
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-card border border-border/50 active:scale-95 transition-all duration-200 disabled:opacity-50 focus:outline-none"
              >
                {driveLoading || syncing ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : driveConnected ? (
                  <Cloud className="w-4 h-4 text-primary" />
                ) : (
                  <CloudOff className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم'}
                className="h-9 w-9 rounded-xl flex items-center justify-center bg-card border border-border/50 active:scale-95 transition-all duration-200 focus:outline-none"
              >
                {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
              </button>

              <input
                ref={mobileImportInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onPointerDown={(e) => e.currentTarget.blur()}
                    aria-label="خيارات النسخ الاحتياطي والمزامنة"
                    className="h-9 w-9 rounded-xl flex items-center justify-center bg-card border border-border/50 active:scale-95 transition-all duration-200 focus:outline-none"
                  >
                    <MoreVertical className="w-4 h-4 text-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="w-52 p-1.5 rounded-2xl"
                >
                  {canInstallPwa && (
                    <>
                      <DropdownMenuItem
                        onClick={handleInstallApp}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer flex items-center gap-2.5 focus:bg-primary/15 focus:text-primary"
                      >
                        <Smartphone className="w-4 h-4 text-primary" />
                        <span>تثبيت التطبيق على الهاتف</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleManualSync}
                    disabled={!isOnline || !driveConnected || syncing}
                    className="rounded-xl px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2.5 focus:bg-primary/15 focus:text-foreground"
                  >
                    <RefreshCw className={`w-4 h-4 text-primary ${syncing ? 'animate-spin' : ''}`} />
                    <span>مزامنة الآن مع Drive</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleExport}
                    className="rounded-xl px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2.5 focus:bg-primary/15 focus:text-foreground"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    <span>تصدير نسخة احتياطية</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => mobileImportInputRef.current?.click()}
                    className="rounded-xl px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2.5 focus:bg-primary/15 focus:text-foreground"
                  >
                    <Upload className="w-4 h-4 text-primary" />
                    <span>استيراد ودمج الخطط</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* زر الوضع المظلم لسطح المكتب */}
            <div className="hidden sm:block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={toggleDarkMode} className="h-9 w-9 rounded-xl flex items-center justify-center bg-transparent hover:bg-muted/40 active:scale-95 transition-all duration-200">
                      {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>{isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {showCreateForm ? (
          <CreatePlanForm
            onPlanCreated={handlePlanCreated}
            onCancel={handleCancelCreate}
            existingPlans={allPlans}
            onPlanTypeChange={setDraftPlanType}
          />
        ) : activePlan ? (
          <Dashboard
            plan={activePlan}
            allPlans={allPlans}
            onPlanUpdate={handlePlanUpdate}
            onDeletePlan={handleDeletePlan}
            onSwitchPlan={handleSwitchPlan}
            onNewPlan={handleNewPlan}
            onEditPlan={handleEditPlan}
            isDark={isDark}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد خطط حالياً. يمكنك إنشاء خطة جديدة.</p>
            <Button type="button" onClick={handleNewPlan} className="mt-4">إنشاء خطة جديدة</Button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">مُراجِع · تطبيق شخصي لإدارة حفظ ومراجعة القرآن الكريم</p>
        </div>
      </footer>

      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open);
          if (!open) setEditingPlan(null);
        }}
      >
        <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-3xl p-0" dir="rtl">
          <div className="p-6">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-foreground">تعديل الخطة</SheetTitle>
            </SheetHeader>
            {editingPlan && (
              <CreatePlanForm
                initialPlan={editingPlan}
                isEditing={true}
                onPlanCreated={handleEditSubmit}
                onCancel={() => {
                  setIsEditSheetOpen(false);
                  setEditingPlan(null);
                }}
                existingPlans={allPlans}
                onPlanTypeChange={setDraftPlanType}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}