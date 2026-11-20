// src/components/quran/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Target, Trash2, BookOpen, Layers, Plus, ChevronDown, Pencil, BookmarkCheck, RefreshCw } from "lucide-react";
import {
  getStats,
  getProgress,
  getTodayData,
  recordDayProgressFlexible,
  skipDayProgress,
  undoDayProgress,
  formatQuranUnits,
  smartQuranDisplay,
  versesToPages,
  toArabicNumbers,
  getPlanLabels,
} from "@/lib/quranPlanEngine";
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
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard({ plan, allPlans, onPlanUpdate, onDeletePlan, onSwitchPlan, onNewPlan, onEditPlan }) {
  const [recordDay, setRecordDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tooltipColors = {
    bg: isDark ? 'hsl(var(--popover))' : '#ffffff',
    text: isDark ? 'hsl(var(--popover-foreground))' : '#1e293b',
    border: isDark ? 'hsl(var(--border))' : '#e2e8f0',
  };

  if (!plan || !plan.schedule || !Array.isArray(plan.schedule)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الخطة غير مكتملة. يرجى إنشاء خطة جديدة.</p>
        <Button onClick={onNewPlan} className="mt-4">إنشاء خطة جديدة</Button>
      </div>
    );
  }

  const planType = plan.planType || "review";
  const labels = getPlanLabels(planType);
  const stats = getStats(plan);
  const progress = getProgress(plan);
  const todayData = getTodayData(plan);
  const alreadyRecorded = todayData && todayData.status !== "pending";
  const dailyPages = plan.dailyPages ?? Math.ceil((plan.totalPages || 0) / Math.max(1, plan.workDays || 1));

  const handleRecordDay = (day) => { setRecordDay(day); setDialogOpen(true); };

  const handleSaveProgress = (dateStr, calculatedVerses, flexibleInput, note) => {
    const updatedPlan = recordDayProgressFlexible(plan, dateStr, flexibleInput, note);
    onPlanUpdate(updatedPlan);
  };

  const handleSkipProgress = (dateStr) => {
    const updatedPlan = skipDayProgress(plan, dateStr);
    onPlanUpdate(updatedPlan);
  };

  const handleUndoProgress = (dateStr) => {
    const updatedPlan = undoDayProgress(plan, dateStr);
    onPlanUpdate(updatedPlan);
  };

  const completedPages = plan.completedVerses ? versesToPages(plan.completedVerses, plan.startPage) : 0;
  const totalPages = plan.totalPages || 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2.5 hover:border-primary/40 transition-colors">
                  {labels.isMemorization ? (
                    <BookmarkCheck className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className="font-bold text-foreground text-sm max-w-[180px] sm:max-w-[240px] truncate pe-1 leading-normal">{plan.name || "بدون اسم"}</span>
                  <span className="text-[11px] bg-primary/15 text-primary border border-primary/25 font-semibold px-2.5 py-0.5 rounded-full leading-normal">
                    {labels.planTypeName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-1.5 rounded-2xl">
                {allPlans.map((p) => {
                  const pType = p.planType || "review";
                  const pLabels = getPlanLabels(pType);
                  const isActive = p.id === plan.id;

                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => !isActive && onSwitchPlan(p.id)}
                      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        isActive
                          ? "bg-primary/10 focus:bg-primary/20 focus:text-foreground"
                          : "focus:bg-primary/15 focus:text-foreground"
                      }`}
                    >
                      <span className="truncate flex-1 text-right font-medium text-foreground pe-1 leading-normal">
                        {p.name}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 leading-normal transition-colors ${
                          pType === "memorization"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 group-focus:bg-amber-500/20"
                            : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25 group-focus:bg-teal-500/20"
                        }`}
                      >
                        {pLabels.planTypeName}
                      </span>

                      {isActive && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full shrink-0 leading-normal shadow-xs">
                          نشط
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
                <div className="border-t border-border/40 mt-1.5 pt-1.5">
                  <DropdownMenuItem
                    onClick={onNewPlan}
                    className="rounded-xl px-3 py-2 text-primary font-semibold cursor-pointer focus:bg-primary/15 focus:text-primary"
                  >
                    <Plus className="w-4 h-4 ml-2 shrink-0" /> خطة جديدة
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onEditPlan(plan)} className="h-10 w-10 p-0 border-primary/25 hover:bg-primary/10 flex items-center justify-center">
                      <Pencil className="w-4 h-4 shrink-0" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                    <p>تعديل الخطة</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 text-destructive border-destructive/25 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center">
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs border" style={{ backgroundColor: tooltipColors.bg, color: tooltipColors.text, borderColor: tooltipColors.border, borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>
                      <p>حذف الخطة</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف "{plan.name}"</AlertDialogTitle>
                    <AlertDialogDescription>هل أنت متأكد من حذف هذه الخطة؟ سيتم فقدان جميع بيانات التقدم.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-2 sm:gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeletePlan(plan.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
            <p className="text-lg font-bold text-primary">{toArabicNumbers(completedPages)}</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">متبقي</p>
            <p className="text-lg font-bold text-accent">{toArabicNumbers(Math.max(0, totalPages - completedPages))}</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">يوميًا</p>
            <p className="text-lg font-bold text-primary">{toArabicNumbers(dailyPages)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center justify-center">
          <ProgressRing progress={progress || 0} />
          <div className="mt-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{toArabicNumbers(completedPages)}</span> من {toArabicNumbers(totalPages)} صفحة
            </p>
            <p className="text-xs text-muted-foreground">
              متبقي: <span className="font-semibold text-accent">{toArabicNumbers(Math.max(0, totalPages - completedPages))} صفحة</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatQuranUnits(plan.completedVerses || 0, plan.startPage || 1)}</p>
          </div>
        </div>

        {todayData && (
          <div className={`rounded-2xl border p-6 ${
            todayData.isOff
              ? 'bg-secondary/50 border-border/40'
              : todayData.isReviewDay
              ? 'bg-accent/5 border-accent/25'
              : 'bg-primary/5 border-primary/20'
          }`}>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 max-md:items-start">
              {todayData.isReviewDay ? (
                <RefreshCw className="w-5 h-5 text-accent shrink-0 max-md:mt-0.5" />
              ) : (
                <Target className="w-5 h-5 text-primary shrink-0 max-md:mt-0.5" />
              )}
              {todayData.isReviewDay ? `مهمة اليوم (${labels.consolidationNoun})` : "مهمة اليوم"}
            </h3>
            {todayData.isOff ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-lg font-semibold text-muted-foreground">يوم إجازة</p>
                <p className="text-sm text-muted-foreground">استمتع بيومك!</p>
                <Button onClick={() => handleRecordDay(todayData)} variant="outline" className="rounded-xl" size="sm">
                  تسجيل إنجاز استثنائي
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center py-3 space-y-2">
                  <p className={`text-4xl font-bold ${todayData.isReviewDay ? 'text-accent' : 'text-primary'}`}>
                    {todayData.targetVerses > 0
                      ? formatQuranUnits(todayData.targetVerses, todayData.targetStartPage || plan.startPage || 1)
                      : labels.consolidationNoun}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayData.isReviewDay ? `مقترح ${labels.consolidationNoun} (الدورة السابقة)` : `ورد ${labels.workNoun} المطلوب`}
                  </p>
                  {todayData.targetStartPage && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg py-1.5 px-3 inline-block">
                      من ص{toArabicNumbers(todayData.targetStartPage)} إلى ص{toArabicNumbers(todayData.targetEndPage)}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleRecordDay(todayData)}
                  className={`w-full mt-4 rounded-xl h-11 font-semibold ${
                    todayData.isReviewDay && !alreadyRecorded ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                  }`}
                  variant={alreadyRecorded ? "outline" : "default"}
                >
                  {todayData.status === "skipped"
                    ? "تم التخطي · تعديل"
                    : alreadyRecorded
                    ? `تعديل (${formatQuranUnits(todayData.completedVerses || 0, todayData.targetStartPage || plan.startPage || 1)})`
                    : todayData.isReviewDay
                    ? `تسجيل ${labels.consolidationNoun}`
                    : "تسجيل الإنجاز"}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3 flex flex-col justify-center">
          <StatCard
            icon={labels.isMemorization ? BookmarkCheck : BookOpen}
            label="المقدار اليومي الحالي"
            value={`${toArabicNumbers(dailyPages)} صفحات`}
            subValue={`يتحدث تلقائياً بناءً على المتبقي من ${labels.workNoun}`}
          />
          <StatCard
            icon={Layers}
            label="الأيام المتبقية"
            value={`${toArabicNumbers(stats?.pendingDays || 0)} يوم`}
            subValue={`${toArabicNumbers(stats?.completedDays || 0)} منجز · ${toArabicNumbers(stats?.partialDays || 0)} جزئي · ${toArabicNumbers(stats?.skippedDays || 0)} متخطى`}
          />
        </div>
      </div>

      <ScheduleView schedule={plan.schedule || []} onRecordDay={handleRecordDay} planType={planType} />
      <FlexibleEntryPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        day={recordDay}
        planType={planType}
        onSave={handleSaveProgress}
        onSkip={handleSkipProgress}
        onUndo={handleUndoProgress}
        alreadyRecorded={recordDay && recordDay.status !== "pending"}
      />
    </div>
  );
}