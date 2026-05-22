const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TOKEN_KEY = 'geonaval_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Error de API');
  }
  return res.json() as Promise<T>;
}

export interface LoginResponse {
  token: string;
  rol: string;
  nombre: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      'No se pudo conectar al servidor. Ejecuta en otra terminal: npm run dev'
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || 'Credenciales inválidas'
    );
  }
  const data = (await res.json()) as LoginResponse;
  setToken(data.token);
  return data;
}

export async function healthCheck(): Promise<{ status: string; proyecto: string }> {
  return request('/health');
}

// Embarcaciones
export async function fetchEmbarcaciones() {
  return request<Record<string, unknown>[]>('/embarcaciones');
}
export async function fetchEmbarcacion(id: number | string) {
  return request<Record<string, unknown>>(`/embarcaciones/${id}`);
}
export async function createEmbarcacion(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/embarcaciones', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export async function updateEmbarcacion(
  id: number | string,
  body: Record<string, unknown>
) {
  return request<Record<string, unknown>>(`/embarcaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export async function deleteEmbarcacion(id: number | string) {
  return request<{ message: string }>(`/embarcaciones/${id}`, { method: 'DELETE' });
}

// Propietarios
export async function fetchPropietarios() {
  return request<Record<string, unknown>[]>('/propietarios');
}
export async function createPropietario(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/propietarios', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export async function updatePropietario(
  id: number | string,
  body: Record<string, unknown>
) {
  return request<Record<string, unknown>>(`/propietarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export async function deletePropietario(id: number | string) {
  return request<{ message: string }>(`/propietarios/${id}`, { method: 'DELETE' });
}

// Tripulación
export async function fetchTripulacion() {
  return request<Record<string, unknown>[]>('/tripulacion');
}
export async function createTripulante(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/tripulacion', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export async function updateTripulante(
  id: number | string,
  body: Record<string, unknown>
) {
  return request<Record<string, unknown>>(`/tripulacion/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export async function deleteTripulante(id: number | string) {
  return request<{ message: string }>(`/tripulacion/${id}`, { method: 'DELETE' });
}

// Pasajeros
export async function fetchPasajeros() {
  return request<Record<string, unknown>[]>('/pasajeros');
}
export async function createPasajero(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/pasajeros', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export async function updatePasajero(
  id: number | string,
  body: Record<string, unknown>
) {
  return request<Record<string, unknown>>(`/pasajeros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export async function deletePasajero(id: number | string) {
  return request<{ message: string }>(`/pasajeros/${id}`, { method: 'DELETE' });
}

// Viajes
export async function fetchViajes() {
  return request<Record<string, unknown>[]>('/viajes');
}
export async function createViaje(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/viajes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export async function updateViaje(
  id: number | string,
  body: Record<string, unknown>
) {
  return request<Record<string, unknown>>(`/viajes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export async function deleteViaje(id: number | string) {
  return request<{ message: string }>(`/viajes/${id}`, { method: 'DELETE' });
}

// GPS
export async function fetchGpsByViaje(viajeId: number | string) {
  return request<Record<string, unknown>[]>(`/gps/viaje/${viajeId}`);
}
export async function createUbicacionGps(body: Record<string, unknown>) {
  return request<Record<string, unknown>>('/gps', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
