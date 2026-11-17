"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, getBaseUrl } from "@/lib/api";
import { toast } from "@/components/Toast";

export interface TutorialLessonItem {
  id: string;
  title: string;
  description: string;
  lesson_type: "video" | "text";
  video_source: "upload" | "url";
  video_url: string;
  text_content: string;
  duration: string;
  sort_order: number;
  created_at?: string | null;
}

interface TutorialFormModalProps {
  isOpen: boolean;
  editingLesson: TutorialLessonItem | null;
  onClose: () => void;
  onSaved: (savedItem: TutorialLessonItem) => void;
}

export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const totalSec = Math.round(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function extractVideoDurationFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (
      typeof document === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      resolve("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignora falha ao liberar URL temporária
      }
    };

    videoEl.onloadedmetadata = () => {
      const formatted = formatVideoDuration(videoEl.duration);
      cleanup();
      resolve(formatted);
    };

    videoEl.onerror = () => {
      cleanup();
      resolve("");
    };

    videoEl.src = objectUrl;
  });
}

export default function TutorialFormModal({
  isOpen,
  editingLesson,
  onClose,
  onSaved,
}: TutorialFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [lessonType, setLessonType] = useState<"video" | "text">("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [duration, setDuration] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (editingLesson) {
      setLessonType(editingLesson.lesson_type === "text" ? "text" : "video");
      setTitle(editingLesson.title || "");
      setDescription(editingLesson.description || "");
      setVideoSource(editingLesson.video_source === "url" ? "url" : "upload");
      setVideoUrl(editingLesson.video_url || "");
      setSelectedFile(null);
      setTextContent(editingLesson.text_content || "");
      setDuration(editingLesson.duration || "");
      setSortOrder(String(editingLesson.sort_order ?? 0));
    } else {
      setLessonType("video");
      setTitle("");
      setDescription("");
      setVideoSource("upload");
      setVideoUrl("");
      setSelectedFile(null);
      setTextContent("");
      setDuration("");
      setSortOrder("0");
    }
  }, [isOpen, editingLesson]);

  if (!isOpen || !mounted) return null;

  const uploadVideoFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token")
        : null;

    const res = await fetch(`${getBaseUrl()}/tutorials/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.detail || "Erro ao enviar o arquivo de vídeo.");
    }
    return body.video_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe o título do tutorial.");

    if (lessonType === "video") {
      if (videoSource === "upload" && !selectedFile && !videoUrl.trim()) {
        return toast.error("Selecione um arquivo de vídeo para enviar.");
      }
      if (videoSource === "url" && !videoUrl.trim()) {
        return toast.error("Informe o link do vídeo.");
      }
    } else if (!textContent.trim()) {
      return toast.error("Informe o conteúdo do tutorial em texto.");
    }

    setSaving(true);
    try {
      let finalVideoUrl = videoUrl.trim();
      if (lessonType === "video" && videoSource === "upload" && selectedFile) {
        finalVideoUrl = await uploadVideoFile(selectedFile);
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        lesson_type: lessonType,
        video_source: lessonType === "video" ? videoSource : "url",
        video_url: lessonType === "video" ? finalVideoUrl : "",
        text_content: lessonType === "text" ? textContent.trim() : "",
        duration: duration.trim(),
        sort_order: Number(sortOrder) || 0,
      };

      const res = editingLesson
        ? await api.put<{ item: TutorialLessonItem }>(`/tutorials/${editingLesson.id}`, payload)
        : await api.post<{ item: TutorialLessonItem }>("/tutorials", payload);

      toast.success(editingLesson ? "Tutorial atualizado com sucesso!" : "Tutorial criado com sucesso!");
      onSaved(res.item);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar tutorial.");
    } finally {
      setSaving(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#131126] border border-[#7f77dd]/35 shadow-2xl overflow-hidden text-[#f0eeff]">
        <div className="px-6 py-4 border-b border-[#7f77dd]/20 flex items-center gap-2.5 bg-[#100e20]">
          <span className="text-lg">{lessonType === "video" ? "📹" : "📄"}</span>
          <h3 id="tutorial-modal-title" className="text-base font-bold">
            {editingLesson ? "Editar Aula de Tutorial" : "Nova Aula de Tutorial"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Tipo de tutorial */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0d0b1a] border border-[#7f77dd]/20">
            <button
              type="button"
              data-testid="tutorial-type-video"
              onClick={() => setLessonType("video")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                lessonType === "video" ? "bg-[#3b82f6] text-white" : "text-[#8b87b8] hover:text-white"
              }`}
            >
              <span>📹</span> Vídeo Tutorial
            </button>
            <button
              type="button"
              data-testid="tutorial-type-text"
              onClick={() => setLessonType("text")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                lessonType === "text" ? "bg-[#3b82f6] text-white" : "text-[#8b87b8] hover:text-white"
              }`}
            >
              <span>📄</span> Tutorial em Texto
            </button>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
              Título do Tutorial *
            </label>
            <input
              type="text"
              data-testid="tutorial-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Como Navegar pela Plataforma"
              className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff] focus:border-[#7f77dd]"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
              Descrição / O que você vai aprender
            </label>
            <textarea
              rows={3}
              data-testid="tutorial-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumo dos tópicos abordados neste tutorial..."
              className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff] focus:border-[#7f77dd] resize-y"
            />
          </div>

          {lessonType === "video" ? (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                  Origem do Vídeo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="video-source-upload"
                    onClick={() => setVideoSource("upload")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      videoSource === "upload"
                        ? "bg-[#1d2d50] border-[#3b82f6] text-[#93c5fd]"
                        : "bg-[#0d0b1a] border-[#7f77dd]/25 text-[#8b87b8]"
                    }`}
                  >
                    ⬆️ Upload de Arquivo
                  </button>
                  <button
                    type="button"
                    data-testid="video-source-url"
                    onClick={() => setVideoSource("url")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      videoSource === "url"
                        ? "bg-[#1d2d50] border-[#3b82f6] text-[#93c5fd]"
                        : "bg-[#0d0b1a] border-[#7f77dd]/25 text-[#8b87b8]"
                    }`}
                  >
                    🔗 Link Externo / URL
                  </button>
                </div>
              </div>

              {videoSource === "upload" ? (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                    Arquivo de Vídeo *
                  </label>
                  <input
                    type="file"
                    data-testid="tutorial-file-input"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file) {
                        const detected = await extractVideoDurationFromFile(file);
                        if (detected) setDuration(detected);
                      }
                    }}
                    className="w-full rounded-xl px-3 py-2 text-xs bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#b4b0dc] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#251f49] file:text-[#f0eeff] cursor-pointer"
                  />
                  {editingLesson?.video_url && !selectedFile && (
                    <p className="text-[11px] text-[#8b87b8] mt-1 truncate">
                      Vídeo atual mantido: {editingLesson.video_url}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                    URL do Vídeo (YouTube, Vimeo ou MP4) *
                  </label>
                  <input
                    type="url"
                    data-testid="tutorial-url-input"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou https://..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff] focus:border-[#7f77dd]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                    Duração (MM:SS)
                  </label>
                  <input
                    type="text"
                    data-testid="tutorial-duration-input"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ex: 04:30"
                    className="w-full rounded-xl px-3.5 py-2 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                    Ordem na Playlist
                  </label>
                  <input
                    type="number"
                    min={0}
                    data-testid="tutorial-order-input"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff]"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                  Conteúdo do Tutorial em Texto *
                </label>
                <textarea
                  rows={7}
                  data-testid="tutorial-text-content-input"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Escreva o passo a passo completo para o aluno..."
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff] focus:border-[#7f77dd] resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#d6d3ff" }}>
                  Ordem na Playlist
                </label>
                <input
                  type="number"
                  min={0}
                  data-testid="tutorial-order-input"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-32 rounded-xl px-3.5 py-2 text-xs outline-none bg-[#0d0b1a] border border-[#7f77dd]/30 text-[#f0eeff]"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="tutorial-submit-btn"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0ea5e9] hover:bg-[#0284c7] text-white cursor-pointer disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingLesson ? "Salvar Alterações" : "Criar Tutorial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
