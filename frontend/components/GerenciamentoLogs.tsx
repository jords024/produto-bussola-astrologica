"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "@/components/Toast";
import LogToolbar from "./LogToolbar";
import LogPeriodFilter from "./LogPeriodFilter";

interface ParsedLogLine {
  id: string;
  raw: string;
  cleanLine: string;
  type: "info" | "warning" | "error" | "http" | "other";
  httpCode?: string;
  timestamp?: string;
}

export default function GerenciamentoLogs() {
  const [selectedContainer, setSelectedContainer] = useState<"backend" | "frontend">("backend");
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState<string>("docker logs --tail 100 bussolaapp_backend");
  const [loading, setLoading] = useState<boolean>(false);
  const [tailCount, setTailCount] = useState<number>(100);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [textFilter, setTextFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"todos" | "info" | "avisos" | "erros" | "http">("todos");

  // Filtros de Data e Horário
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStartTime, setFilterStartTime] = useState<string>("");
  const [filterEndTime, setFilterEndTime] = useState<string>("");

  const terminalRef = useRef<HTMLDivElement>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token") || localStorage.getItem("token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

  // Busca logs da API
  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let url = `${apiUrl}/admin/docker-logs?container=${selectedContainer}&tail=${tailCount}`;

      if (filterDate) {
        const startStr = `${filterDate}T${filterStartTime || "00:00"}:00`;
        const endStr = `${filterDate}T${filterEndTime || "23:59"}:59`;
        const startTs = Math.floor(new Date(startStr).getTime() / 1000);
        const endTs = Math.floor(new Date(endStr).getTime() / 1000);

        if (!isNaN(startTs)) url += `&since=${startTs}`;
        if (!isNaN(endTs)) url += `&until=${endTs}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.lines || []);
        if (data.command) setCommand(data.command);
      } else {
        const err = await res.json().catch(() => ({}));
        if (!isBackground) toast.error(err.detail || "Erro ao carregar logs do contêiner.");
      }
    } catch {
      if (!isBackground) toast.error("Falha ao comunicar com o servidor.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedContainer, tailCount]);

  // Gerencia auto refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 3000);
    } else {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    }
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, selectedContainer, tailCount, filterDate, filterStartTime, filterEndTime]);

  // Define data atual (Hoje)
  const setTodayDate = () => {
    const today = new Date().toISOString().split("T")[0];
    setFilterDate(today);
  };

  // Parsing e Categorização das linhas de Log com fuso horário de Brasília
  const parsedLogs = useMemo<ParsedLogLine[]>(() => {
    return logs.map((line, idx) => {
      let cleanLine = line;
      let timestamp: string | undefined = undefined;

      // 1. Extrai timestamp de Brasília no início se presente [DD/MM/AAAA HH:MM:SS]
      const tsMatch = cleanLine.match(/^\[(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
      if (tsMatch) {
        timestamp = tsMatch[1];
        cleanLine = tsMatch[2];
      }

      const lower = cleanLine.toLowerCase();
      let type: ParsedLogLine["type"] = "info";
      let httpCode: string | undefined = undefined;

      // Detecção de status HTTP
      const httpMatch = cleanLine.match(/\b(200|201|204|301|302|304|400|401|403|404|422|500|502|503)\b/);
      if (lower.includes("http") || httpMatch) {
        type = "http";
        if (httpMatch) httpCode = httpMatch[1];
      }

      if (
        lower.includes("error") ||
        lower.includes("erro") ||
        lower.includes("exception") ||
        lower.includes("fail") ||
        lower.includes("traceback") ||
        lower.includes("fatal") ||
        (httpCode && Number(httpCode) >= 500)
      ) {
        type = "error";
      } else if (
        lower.includes("warning") ||
        lower.includes("aviso") ||
        lower.includes("warn") ||
        lower.includes("não configurada") ||
        lower.includes("deprecated") ||
        (httpCode && Number(httpCode) >= 400 && Number(httpCode) < 500)
      ) {
        type = "warning";
      } else if (type !== "http") {
        type = "info";
      }

      return {
        id: `line-${idx}`,
        raw: line,
        cleanLine,
        timestamp,
        type,
        httpCode,
      };
    });
  }, [logs]);

  // Contadores por tipo
  const counts = useMemo(() => {
    let info = 0;
    let avisos = 0;
    let erros = 0;
    let http = 0;

    parsedLogs.forEach((item) => {
      if (item.type === "info") info++;
      if (item.type === "warning") avisos++;
      if (item.type === "error") erros++;
      if (item.type === "http") http++;
    });

    return { todos: parsedLogs.length, info, avisos, erros, http };
  }, [parsedLogs]);

  // Filtragem combinada (texto + categoria)
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((item) => {
      if (typeFilter !== "todos") {
        if (typeFilter === "info" && item.type !== "info") return false;
        if (typeFilter === "avisos" && item.type !== "warning") return false;
        if (typeFilter === "erros" && item.type !== "error") return false;
        if (typeFilter === "http" && item.type !== "http") return false;
      }
      if (textFilter.trim()) {
        return item.raw.toLowerCase().includes(textFilter.toLowerCase());
      }
      return true;
    });
  }, [parsedLogs, typeFilter, textFilter]);

  const copyToClipboard = () => {
    const fullText = filteredLogs.map((l) => l.raw).join("\n");
    if (!fullText) {
      toast.info("Nenhum log para copiar.");
      return;
    }
    navigator.clipboard.writeText(fullText);
    toast.success("Logs copiados com sucesso!");
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto" data-testid="gerenciamento-logs-panel">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Gerenciamento de logs
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Acompanhe e diagnostique logs por contêiner, data e horário de Brasília.
        </p>
      </div>

      {/* Seletores dos Contêineres */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSelectedContainer("backend")}
          data-testid="container-tab-backend"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            selectedContainer === "backend"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              : "bg-[#131722]/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-[#1a2030]"
          }`}
        >
          <span className="font-mono text-xs">&gt;_</span>
          <span>Backend (FastAPI)</span>
        </button>

        <button
          onClick={() => setSelectedContainer("frontend")}
          data-testid="container-tab-frontend"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            selectedContainer === "frontend"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              : "bg-[#131722]/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-[#1a2030]"
          }`}
        >
          <span className="font-mono text-xs">&gt;_</span>
          <span>Frontend (Nginx / Next.js)</span>
        </button>
      </div>

      {/* Barra de Filtro de Período */}
      <LogPeriodFilter
        filterDate={filterDate}
        onFilterDateChange={setFilterDate}
        onSetToday={setTodayDate}
        filterStartTime={filterStartTime}
        onFilterStartTimeChange={setFilterStartTime}
        filterEndTime={filterEndTime}
        onFilterEndTimeChange={setFilterEndTime}
        loading={loading}
        onApplyFilter={() => fetchLogs()}
      />

      {/* Barra de Controles: Busca por texto, Linhas, Auto, Atualizar, Copiar, Fim */}
      <LogToolbar
        textFilter={textFilter}
        onTextFilterChange={setTextFilter}
        tailCount={tailCount}
        onTailCountChange={setTailCount}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        loading={loading}
        onRefresh={() => fetchLogs()}
        onCopy={copyToClipboard}
        onScrollToBottom={scrollToBottom}
      />

      {/* Filtros por Categorias / Badges */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <span className="text-xs text-slate-400 font-medium">Separar por tipo:</span>

        <button
          onClick={() => setTypeFilter("todos")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            typeFilter === "todos"
              ? "bg-slate-700/80 text-white border border-slate-600 shadow-sm"
              : "bg-[#10141e]/60 text-slate-400 border border-slate-800 hover:text-slate-200"
          }`}
        >
          <span>Todos</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">{counts.todos}</span>
        </button>

        <button
          onClick={() => setTypeFilter("info")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            typeFilter === "info"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "bg-[#10141e]/60 text-slate-400 border border-slate-800 hover:text-sky-300"
          }`}
        >
          <span className="text-sky-400 font-bold">ℹ</span>
          <span>Info</span>
          <span className="bg-sky-950/60 px-1.5 py-0.5 rounded text-[10px] text-sky-400">{counts.info}</span>
        </button>

        <button
          onClick={() => setTypeFilter("avisos")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            typeFilter === "avisos"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-[#10141e]/60 text-slate-400 border border-slate-800 hover:text-amber-300"
          }`}
        >
          <span className="text-amber-400 font-bold">⚠</span>
          <span>Avisos</span>
          <span className="bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px] text-amber-400">{counts.avisos}</span>
        </button>

        <button
          onClick={() => setTypeFilter("erros")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            typeFilter === "erros"
              ? "bg-red-500/20 text-red-300 border border-red-500/40"
              : "bg-[#10141e]/60 text-slate-400 border border-slate-800 hover:text-red-300"
          }`}
        >
          <span className="text-red-400 font-bold">●</span>
          <span>Erros</span>
          <span className="bg-red-950/60 px-1.5 py-0.5 rounded text-[10px] text-red-400">{counts.erros}</span>
        </button>

        <button
          onClick={() => setTypeFilter("http")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            typeFilter === "http"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-[#10141e]/60 text-slate-400 border border-slate-800 hover:text-emerald-300"
          }`}
        >
          <span className="text-emerald-400 font-bold">⊕</span>
          <span>HTTP</span>
          <span className="bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px] text-emerald-400">{counts.http}</span>
        </button>
      </div>

      {/* Terminal de Logs */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Barra de Título do Terminal */}
        <div className="bg-[#121624] px-3.5 sm:px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 inline-block shrink-0"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 inline-block shrink-0"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 inline-block shrink-0"></span>
            <span className="font-mono text-xs text-slate-400 ml-1.5 truncate">{command}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            {filteredLogs.length} linha(s)
          </span>
        </div>

        {/* Linhas de Log */}
        <div
          ref={terminalRef}
          className="p-3 sm:p-4 max-h-[550px] overflow-y-auto overflow-x-auto font-mono text-xs text-slate-300 space-y-1.5 select-text"
        >
          {loading && filteredLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Carregando logs do contêiner...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhuma linha de log encontrada com os filtros selecionados.
            </div>
          ) : (
            filteredLogs.map((item, index) => {
              const lineNumber = index + 1;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 hover:bg-slate-800/40 px-2 sm:px-2.5 py-1.5 sm:py-0.5 rounded transition-colors text-xs font-mono border-b sm:border-b-0 border-slate-800/40"
                >
                  {/* Meta info: Linha, Timestamp e Badges */}
                  <div className="flex items-center gap-2 shrink-0 select-none flex-wrap">
                    <span className="text-slate-600 w-6 sm:w-7 text-right shrink-0 font-mono text-[11px]">{lineNumber}</span>

                    {item.timestamp && (
                      <span className="text-cyan-400/90 font-mono text-[10px] sm:text-[11px] shrink-0 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        [{item.timestamp}]
                      </span>
                    )}

                    {item.httpCode && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          item.httpCode.startsWith("2")
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : item.httpCode.startsWith("3")
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : item.httpCode.startsWith("4")
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        HTTP {item.httpCode}
                      </span>
                    )}

                    {!item.httpCode && item.type === "info" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        INFO
                      </span>
                    )}

                    {!item.httpCode && item.type === "warning" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        WARN
                      </span>
                    )}

                    {!item.httpCode && item.type === "error" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-red-500/20 text-red-400 border border-red-500/30">
                        ERRO
                      </span>
                    )}
                  </div>

                  {/* Conteúdo da linha de log */}
                  <div className="min-w-0 flex-1 pl-8 sm:pl-0">
                    <span className="text-slate-200 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed select-text">
                      {item.cleanLine}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
