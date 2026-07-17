// src/components/quran/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Calendar, Target, TrendingUp, Trash2, BookOpen, Layers, Plus, ChevronDown, Pencil } from "lucide-react";
import { getStats, getProgress, getTodayData, recordDayProgressFlexible, undoDayProgress, formatQuranUnits, smartQuranDisplay, versesToPages } from "@/lib/quranPlanEngine";
import { savePlan, deletePlan, loadAllPlans, setActivePlanId } from "@/lib/planStorage";
import ProgressRing from "./ProgressRing";
import StatCard from "./StatCard";
import ScheduleView from "./ScheduleView";
import FlexibleEntryPanel from "./FlexibleEntryPanel";
import QuranDetailsPopover from "./QuranDetailsPopover";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard({ plan, allPlans, onPlanUpdate, onDeletePlan, onSwitchPlan, onNewPlan, onEditPlan }) {
  const [recordDay, setRecordDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const tooltipColors = {
    bg: isDark ? 'hsl(180, 8%, 9%)' : '#ffffff',
    text: isDark ? 'hsl(40, 15%, 90%)' : '#1e293b',
    border: isDark ? 'hsl(180, 8%, 18%)' : '#e2e8f0',
  };

  if (!plan || !plan.schedule || !Array.isArray(plan.schedule)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الخطة غير مكتملة. يرجى إنشاء خطة جديدة.</p>
        <Button onClick={onNewPlan} className="mt-4">إنشاء خطة جديدة</Button>
      </div>
    );
  }

  const stats = getStats(plan);
  const progress = getProgress(plan);
  const todayData = getTodayData(plan);
  const alreadyRecorded = todayData && todayData.status !== "pending";

  const handleRecordDay = (day) => {
    setRecordDay(day);
    setDialogOpen(true);
  };

  const handleSaveProgress = (dateStr, calculatedVerses, flexibleInput) => {
    const updatedPlan = recordDayProgressFlexible(plan, dateStr, flexibleInput);
    savePlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  };

  const handleUndoProgress = (dateStr) => {
    const updatedPlan = undoDayProgress(plan, dateStr);
    savePlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  };

  const completedPages = plan.completedVerses ? versesToPages(plan.completedVerses, plan.startPage) : 0;
  const totalPages = plan.totalPages || 1;

  return (
    <div className="space-y-8">
      {/* الرأس */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2.5 hover:border-primary/30 transition-colors">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-foreground text-sm max-w-[180px] truncate">{plan.name || "بدون اسم"}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {allPlans.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => p.id !== plan.id && onSwitchPlan(p.id)}
                    className={`flex items-center justify-between ${p.id === plan.id ? 'bg-primary/10' : ''}`}
                  >
                    <span className="truncate flex-1 text-right ml-2">{p.name}</span>
                    {p.id === plan.id && (
                      <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">نشط</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <div className="border-t border-border/40 mt-1 pt-1">
                  <DropdownMenuItem onClick={onNewPlan} className="text-primary font-medium">
                    <Plus className="w-4 h-4 ml-2 shrink-0" /> خطة جديدة
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditPlan(plan)}
                    className="h-10 px-3 border-primary/20 hover:bg-primary/5"
                  >
                    <Pencil className="w-4 h-4 ml-1 shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-xs border"
                  style={{
                    backgroundColor: tooltipColors.bg,
                    color: tooltipColors.text,
                    borderColor: tooltipColors.border,
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                  }}
                >
                  <p>تعديل الخطة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/5 h-10">
                  <Trash2 className="w-4 h-4 ml-1 shrink-0" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف "{plan.name}"</AlertDialogTitle>
                  <AlertDialogDescription>هل أنت متأكد من حذف هذه الخطة؟ سيتم فقدان جميع بيانات التقدم.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-2 sm:gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeletePlan(plan.id)} className="bg-destructive hover:bg-destructive/90">
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <p className="text-muted-foreground mt-2 text-sm flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              {smartQuranDisplay(plan.totalVerses || 0, plan.startPage || 1)}
              <QuranDetailsPopover verses={plan.totalVerses || 0} startPage={plan.startPage || 1} />
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border/60 rounded-2xl px-5 py-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">مُنجَز</p>
            <p className="text-lg font-bold text-emerald-600">{completedPages}</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">متبقي</p>
            <p className="text-lg font-bold text-accent">{totalPages - completedPages}</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">يوميًا</p>
            <p className="text-lg font-bold text-primary">{plan.dailyPages || 0}</p>
          </div>
        </div>
      </div>

      {/* باقي المكونات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center justify-center">
          <ProgressRing progress={progress || 0} />
          <div className="mt-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{completedPages}</span> من {totalPages} صفحة
            </p>
            <p className="text-xs text-muted-foreground">
              متبقي: <span className="font-semibold text-accent">{totalPages - completedPages} صفحة</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatQuranUnits(plan.completedVerses || 0, plan.startPage || 1)}</p>
          </div>
        </div>

        {todayData && (
          <div className={`rounded-2xl border p-6 ${todayData.isOff ? 'bg-secondary/50 border-border/40' : 'bg-primary/5 border-primary/20'}`}>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 max-md:items-start">
              <Target className="w-5 h-5 text-primary shrink-0 max-md:mt-0.5" />
              مهمة اليوم
            </h3>
            {todayData.isOff ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-lg font-semibold text-muted-foreground">يوم إجازة</p>
                <p className="text-sm text-muted-foreground">استمتع بيومك!</p>
                <Button onClick={() => handleRecordDay(todayData)} variant="outline" className="rounded-xl" size="sm">
                  تسجيل مراجعة استثنائية
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center py-3 space-y-2">
                  <p className="text-4xl font-bold text-primary">{formatQuranUnits(todayData.targetVerses || 0, todayData.targetStartPage || plan.startPage || 1)}</p>
                  <p className="text-sm text-muted-foreground">الورد المطلوب</p>
                  {todayData.targetStartPage && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg py-1.5 px-3 inline-block">
                      من ص{todayData.targetStartPage} إلى ص{todayData.targetEndPage}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleRecordDay(todayData)}
                  className="w-full mt-4 rounded-xl h-11 font-semibold"
                  variant={alreadyRecorded ? "outline" : "default"}
                >
                  {alreadyRecorded ? `تعديل (${formatQuranUnits(todayData.completedVerses || 0, todayData.targetStartPage || plan.startPage || 1)})` : "تسجيل الإنجاز"}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          <StatCard icon={TrendingUp} label="المعدل اليومي" value={`${stats?.avgDailyPages || 0} صفحات`} />
          <StatCard icon={BookOpen} label="المقدار اليومي الحالي" value={`${plan.dailyPages || 0} صفحات`} />
          <StatCard icon={Layers} label="الأيام المتبقية" value={`${stats?.pendingDays || 0} يوم`} subValue={`${stats?.completedDays || 0} منجز · ${stats?.partialDays || 0} جزئي · ${stats?.skippedDays || 0} متخطى`} />
        </div>
      </div>

      <ScheduleView schedule={plan.schedule || []} onRecordDay={handleRecordDay} />
      <FlexibleEntryPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        day={recordDay}
        onSave={handleSaveProgress}
        onUndo={handleUndoProgress}
        alreadyRecorded={recordDay && recordDay.status !== "pending"}
      />
    </div>
  );
}