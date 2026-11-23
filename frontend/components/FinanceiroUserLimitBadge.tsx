"use client";

import React from "react";

export interface FinanceiroUserLimitStatus {
  user_id?: string | null;
  limit_phase?: "max_limit" | "daily_limit" | "unlimited";
  limit_mode?: "strict" | "quota_then_daily" | string;
  active_ai_model?: string;
  total_used?: number;
  max_total_requests?: number | null;
  daily_used?: number;
  daily_request_limit?: number | null;
}

export default function FinanceiroUserLimitBadge({
  user,
}: {
  user: FinanceiroUserLimitStatus;
}) {
  if (!user.limit_phase && !user.active_ai_model) return null;

  const totalUsed = user.total_used ?? 0;
  const dailyUsed = user.daily_used ?? 0;
  const maxTotal = user.max_total_requests;
  const dailyLimit = user.daily_request_limit;

  let phaseLabel = "Ilimitado";
  let phaseClasses = "bg-slate-500/15 text-slate-300 border-slate-500/30";
  let phaseIcon = "∞";

  if (user.limit_phase === "max_limit") {
    phaseIcon = "⚡";
    const prefix = user.limit_mode === "quota_then_daily" ? "Franquia" : "Limite Máximo";
    phaseLabel =
      maxTotal != null && maxTotal > 0
        ? `${prefix} (${totalUsed}/${maxTotal})`
        : `${prefix} (${totalUsed})`;
    phaseClasses = "bg-[#7F77DD]/20 text-[#d6d3ff] border-[#7F77DD]/40";
  } else if (user.limit_phase === "daily_limit") {
    phaseIcon = "🕒";
    phaseLabel =
      dailyLimit != null && dailyLimit > 0
        ? `Limite Diário (${dailyUsed}/${dailyLimit} hoje)`
        : `Limite Diário (${dailyUsed} hoje)`;
    phaseClasses = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  } else if (user.limit_phase === "unlimited") {
    phaseLabel = `Ilimitado (${totalUsed} total)`;
  }

  return (
    <div
      data-testid={`financeiro-user-limit-badges-${user.user_id || "anon"}`}
      className="flex items-center gap-1.5 flex-wrap mt-1"
    >
      {user.limit_phase && (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${phaseClasses}`}
        >
          <span>{phaseIcon}</span>
          <span>{phaseLabel}</span>
        </span>
      )}

      {user.active_ai_model && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/25">
          <span>🤖</span>
          <span>{user.active_ai_model}</span>
        </span>
      )}
    </div>
  );
}
