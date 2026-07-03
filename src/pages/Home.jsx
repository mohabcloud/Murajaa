import React, { useState, useEffect } from "react";
import { loadAllPlans, saveAllPlans, savePlan, deletePlan, loadActivePlan, setActivePlanId } from "@/lib/planStorage";
import { initQuranData } from "@/lib/quranData";
import CreatePlanForm from "@/components/quran/CreatePlanForm";
import Dashboard from "@/components/quran/Dashboard";
import { BookOpen, Moon, Sun, AlertCircle, Download, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initGoogleDrive, signInToDrive, signOutFromDrive, syncFromDrive, uploadToDrive, checkSignedIn } from "@/lib/googleDrive";

// ===== دالة عرض Toast مخصصة =====
const showCustomToast = (type, title, description) => {
  const dismiss = () => toast.dismiss();

  const content = (
    <div className="relative w-full pe-8">
      <button
        onClick={dismiss}
        className="absolute top-0 end-0 w-7 h-7 rounded-full border border-border/50 bg-background/80 hover:bg-muted/50 flex items-center justify-center transition-colors z-10 shadow-sm"
        style={{ insetInlineEnd: '-75px', transform: 'none' }}
        aria-label="إغلاق"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="ps-6">
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );

  if (type === 'success') {
    toast.success(content, { duration: 4000, className: "murajaa-toast" });
  } else if (type === 'error') {
    toast.error(content, { duration: 4000, className: "murajaa-toast" });
  } else if (type === 'info') {
    toast.info(content, { duration: 4000, className: "murajaa-toast" });
  } else if (type === 'warning') {
    toast.warning(content, { duration: 4000, className: "murajaa-toast" });
  } else {
    toast(content, { duration: 4000, className: "murajaa-toast" });
  }
};

// ===== مكون Home الرئيسي =====
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

  // ===== إعادة تحميل الخطط (مع معالجة الأخطاء) =====
  const reloadPlans = () => {
    try {
      let plans = loadAllPlans();
      plans = plans.map(p => {
        if (!p.schedule) {
          return { ...p, schedule: [], completedVerses: 0, totalPages: p.totalPages || 1, totalVerses: p.totalVerses || 0 };
        }
        return p;
      });
      setAllPlans(plans);

      const active = loadActivePlan();
      if (active && !active.schedule) {
        active.schedule = [];
      }
      setActivePlan(active);
      setShowCreateForm(plans.length === 0);
    } catch (err) {
      console.error('❌ Error reloading plans:', err);
    }
  };

  // ===== المزامنة اليدوية مع Drive =====
  const handleManualSync = async () => {
    if (!driveConnected) {
      showCustomToast('warning', 'غير متصل بـ Drive', 'يرجى ربط حساب Google أولاً.');
      return;
    }
    setSyncing(true);
    try {
      const plans = await syncFromDrive();
      if (plans) {
        reloadPlans();
        showCustomToast('success', 'تمت المزامنة', 'تم تحديث البيانات من Drive.');
      } else {
        await uploadToDrive();
        showCustomToast('success', 'تمت المزامنة', 'تم رفع بياناتك المحلية إلى السحابة.');
      }
    } catch (error) {
      showCustomToast('error', 'فشلت المزامنة', error.message || 'حدث خطأ');
    } finally {
      setSyncing(false);
    }
  };

  // ===== تهيئة Google Drive =====
  useEffect(() => {
    const initDrive = async () => {
      try {
        await initGoogleDrive();
        const signedIn = checkSignedIn();
        setDriveConnected(signedIn);
        if (signedIn) {
          try {
            await syncFromDrive();
            reloadPlans(); // ✅ تحديث الواجهة بعد المزامنة التلقائية
          } catch (syncError) {
            console.warn('⚠️ Auto-sync failed:', syncError);
            reloadPlans(); // نستمر محلياً
          }
        }
      } catch (error) {
        console.warn('⚠️ Drive init failed:', error);
      }
    };
    initDrive();
  }, []);

  // ===== دوال ربط وفصل Drive =====
  const handleConnectDrive = async () => {
    setDriveLoading(true);
    try {
      await signInToDrive();
      setDriveConnected(true);

      // محاولة المزامنة
      try {
        const plans = await syncFromDrive();
        if (plans) {
          reloadPlans();
          showCustomToast('success', 'تم الربط والمزامنة', 'تم تحميل أحدث البيانات من Drive.');
        } else {
          await uploadToDrive();
          reloadPlans(); // تحديث الواجهة بعد الرفع
          showCustomToast('success', 'تم الربط', 'تم رفع بياناتك المحلية إلى السحابة.');
        }
      } catch (syncError) {
        console.error('⚠️ Sync error:', syncError);
        reloadPlans(); // حتى لو فشلت المزامنة، نستمر بالعمل محلياً
        showCustomToast('warning', 'تم الربط لكن فشلت المزامنة', 'يمكنك المحاولة يدوياً باستخدام زر المزامنة.');
      }
    } catch (error) {
      showCustomToast('error', 'فشل ربط Google Drive', error.message || 'حدث خطأ');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDisconnectDrive = () => {
    signOutFromDrive();
    setDriveConnected(false);
    showCustomToast('info', 'تم فصل Google Drive', 'ستستمر البيانات محلياً');
  };

  // ===== دوال التطبيق الأساسية =====
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        await initQuranData();
        setQuranReady(true);

        let plans = loadAllPlans();
        plans = plans.map(p => {
          if (!p.schedule) {
            return { ...p, schedule: [], completedVerses: 0, totalPages: p.totalPages || 1, totalVerses: p.totalVerses || 0 };
          }
          return p;
        });
        setAllPlans(plans);

        let active = loadActivePlan();
        if (active && !active.schedule) {
          active = { ...active, schedule: [], completedVerses: 0 };
        }
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

  // ===== دوال إدارة الخطط =====
  const handlePlanCreated = (newPlan) => {
    if (!newPlan.schedule) newPlan.schedule = [];
    savePlan(newPlan);
    setAllPlans(prev => [...prev, newPlan]);
    setActivePlan(newPlan);
    setShowCreateForm(false);
    showCustomToast('success', 'تم إنشاء الخطة بنجاح', `الخطة "${newPlan.name}" جاهزة للبدء.`);
  };

  const handlePlanUpdate = (updatedPlan) => {
    if (!updatedPlan.schedule) updatedPlan.schedule = [];
    savePlan(updatedPlan);
    setAllPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    setActivePlan(updatedPlan);
    showCustomToast('success', 'تم تحديث الخطة', `تم حفظ التغييرات في "${updatedPlan.name}".`);
  };

  const handleDeletePlan = (id) => {
    deletePlan(id);
    const updated = loadAllPlans();
    setAllPlans(updated);
    const active = loadActivePlan();
    setActivePlan(active);
    if (updated.length === 0) setShowCreateForm(true);
  };

  const handleSwitchPlan = (id) => {
    setActivePlanId(id);
    const plans = loadAllPlans();
    const plan = plans.find(p => p.id === id);
    setActivePlan(plan || null);
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    if (allPlans.length > 0) setShowCreateForm(false);
    setIsEditSheetOpen(false);
    setEditingPlan(null);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setIsEditSheetOpen(true);
  };

  const handleEditSubmit = (updatedPlan) => {
    handlePlanUpdate(updatedPlan);
    setIsEditSheetOpen(false);
    setEditingPlan(null);
  };

  // ===== دوال التصدير والاستيراد =====
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
    a.download = `quran_review_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showCustomToast('success', 'تم التصدير بنجاح', `تم تصدير ${plans.length} خطة كملف JSON.`);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedPlans = JSON.parse(e.target.result);
        if (!Array.isArray(importedPlans) || importedPlans.length === 0) {
          showCustomToast('error', 'ملف غير صالح', 'الملف لا يحتوي على خطط صالحة.');
          return;
        }
        if (window.confirm(`سيتم استبدال جميع الخطط الحالية (عددها ${allPlans.length}) بالخطط المستوردة (عددها ${importedPlans.length}). هل أنت متأكد؟`)) {
          saveAllPlans(importedPlans);
          const reloadedPlans = loadAllPlans();
          setAllPlans(reloadedPlans);
          const active = loadActivePlan();
          setActivePlan(active);
          setShowCreateForm(reloadedPlans.length === 0);
          showCustomToast('success', 'تم الاستيراد بنجاح', `تم استيراد ${importedPlans.length} خطة.`);
        }
      } catch (err) {
        showCustomToast('error', 'خطأ في الاستيراد', 'الملف غير صالح أو تالف.');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  // ===== حالات التحميل والخطأ =====
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">حدث خطأ أثناء تحميل بيانات القرآن</h2>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <p className="text-muted-foreground text-xs mb-4">
            تأكد من اتصالك بالإنترنت، أو حاول إعادة تحميل الصفحة.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
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
        <p className="text-xs text-muted-foreground">قد يستغرق هذا بضع ثوانٍ</p>
      </div>
    );
  }

  // ===== الواجهة الرئيسية =====
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold font-heading text-foreground leading-tight">مُراجِع</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {allPlans.length > 0 ? `${allPlans.length} خطط` : "إدارة مراجعة القرآن"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="h-9 w-9 p-0 rounded-xl"
                title="تصدير الخطط كنسخة احتياطية"
              >
                <Download className="w-4 h-4" />
              </Button>
              <label className="h-9 w-9 p-0 rounded-xl flex items-center justify-center hover:bg-muted/80 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>

            {/* زر المزامنة مع Drive */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              disabled={!driveConnected || syncing}
              className="h-9 w-9 p-0 rounded-xl"
              title={!driveConnected ? 'غير متصل بـ Drive' : 'مزامنة مع Drive'}
            >
              {syncing ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
                </svg>
              )}
            </Button>

            {/* زر Google Drive */}
            <Button
              variant="ghost"
              size="sm"
              onClick={driveConnected ? handleDisconnectDrive : handleConnectDrive}
              disabled={driveLoading}
              className="h-9 w-9 p-0 rounded-xl"
              title={driveConnected ? 'فصل Google Drive' : 'ربط Google Drive'}
            >
              {driveLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={driveConnected ? '#34A853' : 'currentColor'}>
                  <path d="M12.01 2.39L8.46 8.14l3.55 5.75 3.55-5.75-3.55-5.75zM4.46 8.14L.91 13.89l3.55 5.75 3.55-5.75-3.55-5.75zm15.08 0l-3.55 5.75 3.55 5.75 3.55-5.75-3.55-5.75zM12.01 15.64l-3.55 5.75 3.55 5.75 3.55-5.75-3.55-5.75z" />
                </svg>
              )}
            </Button>

            <button onClick={toggleDarkMode} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {showCreateForm ? (
          <CreatePlanForm
            onPlanCreated={handlePlanCreated}
            onCancel={handleCancelCreate}
            existingPlans={allPlans}
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
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد خطط حالياً. يمكنك إنشاء خطة جديدة.</p>
            <Button onClick={handleNewPlan} className="mt-4">إنشاء خطة جديدة</Button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">مُراجِع · تطبيق شخصي لإدارة مراجعة القرآن الكريم</p>
        </div>
      </footer>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-3xl p-0" dir="rtl">
          <div className="p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>تعديل الخطة</SheetTitle>
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
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}