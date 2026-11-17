"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, getBaseUrl } from "@/lib/api";
import { toast } from "@/components/Toast";
import TutorialFormModal, { type TutorialLessonItem } from "@/components/TutorialFormModal";

interface ComeceAquiProps {
  isAdmin: boolean;
}

function resolveEmbedUrl(rawUrl: string): { isIframe: boolean; src: string } {
  const url = (rawUrl || "").trim();
  if (!url) return { isIframe: false, src: "" };
  if (url.startsWith("/")) {
    return { isIframe: false, src: `${getBaseUrl()}${url}` };
  }

  // YouTube watch / share links -> embed
  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (ytWatch) {
    return { isIframe: true, src: `https://www.youtube.com/embed/${ytWatch[1]}` };
  }

  // Vimeo -> player.vimeo.com
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { isIframe: true, src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([A-Za-z0-9]+)/);
  if (loomMatch) {
    return { isIframe: true, src: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  return { isIframe: false, src: url };
}

export default function ComeceAqui({ isAdmin }: ComeceAquiProps) {
  const [lessons, setLessons] = useState<TutorialLessonItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TutorialLessonItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TutorialLessonItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: TutorialLessonItem[] }>("/tutorials");
      const list = res?.items || [];
      setLessons(list);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar tutoriais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const activeLesson = lessons.find((l) => l.id === selectedId) || lessons[0] || null;
  const media = activeLesson ? resolveEmbedUrl(activeLesson.video_url) : { isIframe: false, src: "" };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tutorials/${deleteTarget.id}`);
      toast.success("Tutorial removido com sucesso.");
      setDeleteTarget(null);
      await loadLessons();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover tutorial.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="comece-aqui-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(127, 119, 221, 0.25))",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              color: "#7dd3fc",
            }}
          >
            ✨
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "#f0eeff" }}>
              Comece Aqui & Tutoriais da Plataforma
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#8b87b8" }}>
              Aprenda a navegar pela ferramenta e aproveitar todos os recursos da Bússola Astrológica.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            data-testid="new-tutorial-btn"
            onClick={() => {
              setEditingLesson(null);
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition hover:brightness-110 cursor-pointer shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
              color: "#ffffff",
            }}
          >
            + Nova Aula de Tutorial
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="rounded-2xl p-10 text-center text-sm"
          style={{ background: "#141126", border: "1px solid rgba(127, 119, 221, 0.2)", color: "#8b87b8" }}
        >
          Carregando tutoriais...
        </div>
      ) : lessons.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center space-y-2"
          style={{ background: "#141126", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#f0eeff" }}>
            Nenhum tutorial cadastrado ainda.
          </p>
          <p className="text-xs" style={{ color: "#8b87b8" }}>
            {isAdmin
              ? 'Clique em "+ Nova Aula de Tutorial" acima para adicionar vídeos ou textos explicativos.'
              : "Em breve novos tutoriais estarão disponíveis aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Palco Principal (Esquerda) */}
          <div className="lg:col-span-8 space-y-4">
            {activeLesson && activeLesson.lesson_type === "video" ? (
              <div
                className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center"
                style={{ border: "1px solid rgba(127, 119, 221, 0.25)" }}
              >
                {media.isIframe ? (
                  <iframe
                    src={media.src}
                    title={activeLesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={media.src}
                    src={media.src}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ) : activeLesson ? (
              <div
                className="rounded-2xl p-6 sm:p-8 space-y-4"
                style={{ background: "#141126", border: "1px solid rgba(127, 119, 221, 0.25)" }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
                  <span>📄</span> Tutorial em Texto
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-[#e6e3ff]">
                  {activeLesson.text_content}
                </div>
              </div>
            ) : null}

            {activeLesson && (
              <div
                className="rounded-2xl p-5 space-y-2"
                style={{ background: "#141126", border: "1px solid rgba(127, 119, 221, 0.25)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold" style={{ color: "#f0eeff" }}>
                    {activeLesson.title}
                  </h3>
                  {activeLesson.duration && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                      🕒 {activeLesson.duration}
                    </span>
                  )}
                </div>
                {activeLesson.description && (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#b4b0dc" }}>
                    {activeLesson.description}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Playlist de Aulas (Direita) */}
          <div
            className="lg:col-span-4 rounded-2xl p-4 space-y-3"
            style={{ background: "#141126", border: "1px solid rgba(127, 119, 221, 0.25)" }}
          >
            <div className="flex items-center gap-2 px-1">
              <span className="text-sky-400">📚</span>
              <h4 className="text-sm font-bold" style={{ color: "#f0eeff" }}>
                Aulas de Tutorial ({lessons.length})
              </h4>
            </div>

            <div className="space-y-2">
              {lessons.map((item) => {
                const isSelected = activeLesson?.id === item.id;
                return (
                  <div
                    key={item.id}
                    data-testid={`tutorial-playlist-item-${item.id}`}
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-xl p-3 flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? "bg-[#1b2242] border border-[#3b82f6]/60"
                        : "bg-[#1a1535]/70 border border-[#7f77dd]/15 hover:border-[#7f77dd]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                          isSelected ? "bg-[#2563eb] text-white" : "bg-[#251f49] text-[#AFA9EC]"
                        }`}
                      >
                        {item.lesson_type === "video" ? "▶" : "📄"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "#f0eeff" }}>
                          {item.title}
                        </p>
                        <p className="text-[11px]" style={{ color: "#8b87b8" }}>
                          {item.lesson_type === "video" ? (item.duration ? `🕒 ${item.duration}` : "Vídeo") : "Texto"}
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Editar tutorial"
                          aria-label={`Editar ${item.title}`}
                          onClick={() => {
                            setEditingLesson(item);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-xs hover:bg-white/10 text-[#b4b0dc] cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          title="Excluir tutorial"
                          aria-label={`Excluir ${item.title}`}
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-xs hover:bg-red-500/20 text-red-400 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <TutorialFormModal
        isOpen={modalOpen}
        editingLesson={editingLesson}
        onClose={() => {
          setModalOpen(false);
          setEditingLesson(null);
        }}
        onSaved={(saved) => {
          setSelectedId(saved.id);
          loadLessons();
        }}
      />

      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#1a1535] border border-red-500/30 p-6 space-y-4 shadow-2xl">
              <h5 className="text-base font-bold text-[#f0eeff]">Excluir &ldquo;{deleteTarget.title}&rdquo;?</h5>
              <p className="text-xs text-[#b4b0dc]">
                Esta ação removerá o tutorial da aba Comece Aqui para todos os alunos.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#251f49] text-[#d6d3ff] hover:bg-[#31295f] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Excluindo..." : "Confirmar Exclusão"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
