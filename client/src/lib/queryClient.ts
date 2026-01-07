import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData: any = {};
    const text = await res.text();
    
    // Tentar parsear como JSON
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      // Se não for JSON, usar o texto como está
      errorData = { error: text || res.statusText };
    }
    
    // Criar erro com informações mais detalhadas
    const error = new Error(`${res.status}: ${JSON.stringify(errorData)}`);
    (error as any).status = res.status;
    (error as any).data = errorData;
    throw error;
  }
}

// Função para obter o token JWT do storage (apenas sessionStorage para segurança)
function getUserToken(): string | null {
  return sessionStorage.getItem('userToken');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  const headers: Record<string, string> = {};
  
  // Adicionar Content-Type se houver dados
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Adicionar token JWT se disponível (exceto para rotas de autenticação)
  const token = getUserToken();
  if (token && !url.includes('/user/login') && !url.includes('/auth/login')) {
    headers["Authorization"] = `Bearer ${token}`;
  }
    
  const res = await fetch(urlWithTimestamp, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&_t=${Date.now()}` 
      : `${url}?_t=${Date.now()}`;
    
    const headers: Record<string, string> = {};
    
    // Adicionar token JWT se disponível (exceto para rotas de autenticação)
    const token = getUserToken();
    if (token && !url.includes('/user/login') && !url.includes('/auth/login')) {
      headers["Authorization"] = `Bearer ${token}`;
    }
      
    const res = await fetch(urlWithTimestamp, {
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 15000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
    },
  },
});
