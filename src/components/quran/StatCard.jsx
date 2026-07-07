import React from "react";

export default function StatCard({ icon: Icon, label, value, subValue, className = "" }) {
  return (
    <div className={`bg-card rounded-2xl border border-border/60 p-5 flex items-start gap-4 transition-all duration-300 hover:shadow-md hover:border-primary/20 max-md:items-start ${className}`}>
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 max-md:mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground leading-relaxed">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
      </div>
    </div>
  );
}