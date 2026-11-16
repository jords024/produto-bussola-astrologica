"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ChartZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  svgContent: string;
}

export default function ChartZoomModal({
  isOpen,
  onClose,
  title,
  svgContent,
}: ChartZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onNativeWheel);
    };
  }, [mounted, isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Previne comportamento padrão apenas quando o evento for cancelável (evita erro de passive listener)
    if (e.cancelable) {
      e.preventDefault();
    }
    if (e.deltaY < 0) {
      // Rolou para cima -> Zoom In
      setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 4));
    } else if (e.deltaY > 0) {
      // Rolou para baixo -> Zoom Out
      setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
    }
  };

  const modalContent = (
    <div
      data-testid="chart-zoom-modal-backdrop"
      className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
      // Conforme regra de popups: não fechar ao clicar fora, apenas no botão de fechar
    >
      <div
        data-testid="chart-zoom-modal-panel"
        className="relative w-screen h-screen flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0e0a1c 0%, #05030c 100%)",
        }}
      >
        {/* Barra Superior de Controles */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b select-none z-10"
          style={{
            background: "rgba(26, 21, 53, 0.75)",
            borderColor: "rgba(127, 119, 221, 0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🌌</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {title || "Mandala Astrológica"}
              </h3>
              <p className="text-[11px] text-purple-300/70 hidden sm:block">
                Controles de zoom e visualização detalhada em alta resolução
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Controles de Zoom */}
            <div
              className="flex items-center bg-black/40 rounded-xl p-1 border"
              style={{ borderColor: "rgba(127, 119, 221, 0.25)" }}
            >
              <button
                type="button"
                data-testid="zoom-out-btn"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out (-)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white/90 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                🔍-
              </button>
              <button
                type="button"
                data-testid="reset-zoom-btn"
                onClick={handleResetZoom}
                title="Resetar Zoom"
                className="px-2.5 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-semibold text-purple-200 hover:bg-white/10 transition-all cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                data-testid="zoom-in-btn"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                title="Zoom In (+)"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white/90 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                🔍+
              </button>
            </div>

            {/* Botão Único de Fechar (conforme regra de popups) */}
            <button
              type="button"
              data-testid="close-chart-zoom-btn"
              onClick={onClose}
              title="Fechar visualização"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.35)",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Área Central Interativa com Zoom e Pan */}
        <div
          ref={viewportRef}
          data-testid="zoom-viewport"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 overflow-hidden relative flex items-center justify-center p-4 select-none ${
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          style={{ background: "#05030c" }}
        >
          <div
            data-testid="zoom-content-wrapper"
            className="transition-transform duration-150 ease-out w-full h-full flex items-center justify-center [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:max-h-[85vh] [&>svg]:drop-shadow-[0_0_35px_rgba(127,119,221,0.25)]"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: "center center",
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />

          {/* Dica flutuante de arrasto e scroll */}
          {zoom > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-[11px] pointer-events-none backdrop-blur-md shadow-lg"
              style={{
                background: "rgba(10, 7, 24, 0.8)",
                color: "#AFA9EC",
                border: "1px solid rgba(127, 119, 221, 0.35)",
              }}
            >
              🖱️ Use o scroll do mouse para Zoom In/Out · Clique e arraste para navegar
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
