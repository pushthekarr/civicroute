const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function complaintFormData(values, imageFile) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (imageFile) formData.append('image', imageFile);
  return formData;
}

export async function analyseComplaint(text, imageFile) {
  const res = await fetch(`${API_BASE}/complaints/analyse`, {
    method: 'POST', body: complaintFormData({ text }, imageFile),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'We could not analyse this complaint. Please try again.');
  return data;
}

export async function submitComplaint(values, imageFile) {
  const formData = complaintFormData(values, imageFile);

  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export async function trackComplaint(id) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(id.trim())}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Complaint not found.');
  return data;
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/complaints/stats`);
  if (!res.ok) throw new Error('Could not load dashboard data.');
  return res.json();
}

export async function fetchPriorityQueues() {
  const res = await fetch(`${API_BASE}/complaints/queues`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load priority queues.');
  return data;
}

async function officialRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}/official${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Official request failed.');
  return data;
}
export const officialLogin = (username, password) => officialRequest('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const officialLogout = () => officialRequest('/logout', { method: 'POST' });
export const officialSession = () => officialRequest('/session');
export const fetchOfficialComplaints = (filters = {}) => officialRequest(`/complaints?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`);
export const updateOfficialComplaint = (id, payload) => officialRequest(`/complaints/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
