import React, { useState, useEffect } from "react";
import { loadAllPlans, saveAllPlans, savePlan, deletePlan, loadActivePlan, setActivePlanId } from "@/lib/planStorage";
import { initQuranData } from "@/lib/quranData";
import CreatePlanForm from "@/components/quran/CreatePlanForm";
import Dashboard from "@/components/quran/Dashboard";
import { BookOpen, Moon, Sun, AlertCircle, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const [allPlans, setAllPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [quranReady, setQuranReady] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // ✅ للتعديل
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false); // ✅ للتحكم في الـ Sheet

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

  const handlePlanCreated = (newPlan) => {
    if (!newPlan.schedule) newPlan.schedule = [];
    savePlan(newPlan);
    setAllPlans(prev => [...prev, newPlan]);
    setActivePlan(newPlan);
    setShowCreateForm(false);
    // ✅ إظهار رسالة نجاح
    toast({
      title: "تم إنشاء الخطة بنجاح",
      description: `الخطة "${newPlan.name}" جاهزة للبدء.`,
    });
  };

  const handlePlanUpdate = (updatedPlan) => {
    if (!updatedPlan.schedule) updatedPlan.schedule = [];
    savePlan(updatedPlan);
    setAllPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    setActivePlan(updatedPlan);
    // ✅ إظهار رسالة نجاح
    toast({
      title: "تم تحديث الخطة",
      description: `تم حفظ التغييرات في "${updatedPlan.name}".`,
    });
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

  // ✅ شاشة الخطأ مع زر إعادة المحاولة
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
            {/* ✅ زر التعديل يظهر بجانب الـ Dropdown إذا كانت هناك خطة نشطة */}
            {activePlan && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEditPlan(activePlan)}
                className="h-9 w-9 p-0 rounded-xl"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
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
            onEditPlan={handleEditPlan} // ✅ تمرير دالة التعديل إلى Dashboard
          />
        ) : null}
      </main>

      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">مُراجِع · تطبيق شخصي لإدارة مراجعة القرآن الكريم</p>
        </div>
      </footer>

      {/* ✅ Sheet للتعديل */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-3xl p-0">
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