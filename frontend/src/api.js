const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function submitComplaint(text, imageFile) {
  const formData = new FormData();
  formData.append('text', text);
  if (imageFile) formData.append('image', imageFile);

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
