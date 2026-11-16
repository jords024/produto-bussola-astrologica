export function getBaseUrl(): string {
  // Se houver uma variável de ambiente definida, tem prioridade absoluta
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Ambiente local
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8005";
    }

    // Se estiver em subdomínio como 'bussolaappfront.dominio.com', tenta inferir 'bussolaappback.dominio.com' ou 'bussolaappapi...'
    const protocol = window.location.protocol;
    if (hostname.startsWith("bussolaappfront.")) {
      return `${protocol}//${hostname.replace("bussolaappfront.", "bussolaappback.")}`;
    }
    if (hostname.includes("front")) {
      return `${protocol}//${hostname.replace("front", "back")}`;
    }

    // Padrão genérico de subdomínio para API
    return `${protocol}//api-${hostname}`;
  }

  return "http://localhost:8005";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 300_000, // 5 minutes default (GPT-5.4 can take ~2 min)
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Erro desconhecido");
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as unknown as T;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  get: <T>(path: string) => request<T>(path),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (path: string, body?: unknown) => {
    let payload = body;
    if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
      payload = (body as Record<string, unknown>).data;
    }
    return request<void>(path, {
      method: "DELETE",
      ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    });
  },

  download: async (
    path: string,
    method: "GET" | "POST" = "GET",
    timeoutMs = 300_000, // 5 minutos — igual ao timeout das demais chamadas
  ): Promise<Blob> => {
    const token = getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.blob();
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("A geração demorou demais. O servidor pode estar sobrecarregado — tente novamente em alguns instantes.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },
};

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("bussola_token", token);
    localStorage.setItem("sirius_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bussola_token");
    localStorage.removeItem("sirius_token");
  }
}
