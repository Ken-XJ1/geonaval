const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string {
  let token = localStorage.getItem('token');
  if (!token) {
    const legacy = localStorage.getItem('geonaval_token');
    if (legacy) {
      localStorage.setItem('token', legacy);
      localStorage.removeItem('geonaval_token');
      token = legacy;
    }
  }
  return token || '';
}

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem('token');
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }
  if (!response.ok || (data as { error?: string }).error) {
    throw new Error(
      (data as { error?: string }).error || 'Error de API'
    );
  }
  return data as T;
}

export const api = {
  login: async (email: string, password: string) => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson<{
      token: string;
      rol: string;
      nombre: string;
    }>(r);
    localStorage.setItem('token', data.token);
    return data;
  },

  getEmbarcaciones: () =>
    fetch(`${BASE}/embarcaciones`, { headers: headers() }).then((r) =>
      parseJson(r)
    ),
  createEmbarcacion: (data: Record<string, unknown>) =>
    fetch(`${BASE}/embarcaciones`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updateEmbarcacion: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/embarcaciones/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deleteEmbarcacion: (id: number) =>
    fetch(`${BASE}/embarcaciones/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),

  getPropietarios: () =>
    fetch(`${BASE}/propietarios`, { headers: headers() }).then((r) =>
      parseJson(r)
    ),
  createPropietario: (data: Record<string, unknown>) =>
    fetch(`${BASE}/propietarios`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updatePropietario: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/propietarios/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deletePropietario: (id: number) =>
    fetch(`${BASE}/propietarios/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),

  getTripulacion: () =>
    fetch(`${BASE}/tripulacion`, { headers: headers() }).then((r) =>
      parseJson(r)
    ),
  createTripulante: (data: Record<string, unknown>) =>
    fetch(`${BASE}/tripulacion`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updateTripulante: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/tripulacion/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deleteTripulante: (id: number) =>
    fetch(`${BASE}/tripulacion/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),

  getPasajeros: () =>
    fetch(`${BASE}/pasajeros`, { headers: headers() }).then((r) =>
      parseJson(r)
    ),
  createPasajero: (data: Record<string, unknown>) =>
    fetch(`${BASE}/pasajeros`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updatePasajero: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/pasajeros/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deletePasajero: (id: number) =>
    fetch(`${BASE}/pasajeros/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),

  getViajes: () =>
    fetch(`${BASE}/viajes`, { headers: headers() }).then((r) => parseJson(r)),
  createViaje: (data: Record<string, unknown>) =>
    fetch(`${BASE}/viajes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updateViaje: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/viajes/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deleteViaje: (id: number) =>
    fetch(`${BASE}/viajes/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),

  getViajePasajeros: (viajeId: number) =>
    fetch(`${BASE}/viajes/${viajeId}/pasajeros`, { headers: headers() }).then(
      (r) => parseJson(r)
    ),
  assignPasajeroViaje: (viajeId: number, pasajeroId: number) =>
    fetch(`${BASE}/viajes/${viajeId}/pasajeros`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ pasajero_id: pasajeroId }),
    }).then((r) => parseJson(r)),

  getIncidentes: () =>
    fetch(`${BASE}/incidentes`, { headers: headers() }).then((r) =>
      parseJson(r)
    ),
  createIncidente: (data: Record<string, unknown>) =>
    fetch(`${BASE}/incidentes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),

  getUsuarios: () =>
    fetch(`${BASE}/usuarios`, { headers: headers() }).then((r) => parseJson(r)),
  createUsuario: (data: Record<string, unknown>) =>
    fetch(`${BASE}/usuarios`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  updateUsuario: (id: number, data: Record<string, unknown>) =>
    fetch(`${BASE}/usuarios/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    }).then((r) => parseJson(r)),
  deleteUsuario: (id: number) =>
    fetch(`${BASE}/usuarios/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then((r) => parseJson(r)),
};
