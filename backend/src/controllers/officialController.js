const { load, save } = require('../db/init');
const { getQueueSnapshot } = require('../utils/complaintQueue');
const { credentialsAreValid, createSession, setSessionCookie, clearSessionCookie } = require('../services/officialAuth');

const STATUS_FLOW = { Submitted: ['Routed'], Routed: ['In Progress'], 'In Progress': ['Resolved'], Resolved: [] };
const STATUSES = Object.keys(STATUS_FLOW);
function text(value, max = 500) { return String(value || '').trim().slice(0, max); }
function history(db, id) { return db.status_log.filter((entry) => entry.complaint_id === id); }
function present(db, complaint) {
  const department = db.departments.find((item) => item.id === complaint.department_id);
  const queue = getQueueSnapshot(db.complaints, complaint.department_id);
  return { id: complaint.id, subject: complaint.subject, description: complaint.raw_text, department: department?.name || 'Unassigned', category: complaint.category, priority: complaint.priority, status: complaint.status, etaDays: complaint.eta_days, queuePosition: queue.findIndex((item) => item.complaintId === complaint.id) + 1 || null, createdAt: complaint.created_at, updatedAt: complaint.updated_at, location: complaint.location, citizen: complaint.citizen, internalNote: complaint.internal_note || '', history: history(db, complaint.id) };
}
function login(req, res) {
  const username = text(req.body?.username, 160); const password = String(req.body?.password || '');
  if (!credentialsAreValid(username, password)) return res.status(401).json({ error: 'Invalid official username or password.' });
  try { setSessionCookie(res, createSession(username)); return res.json({ authenticated: true, username }); }
  catch { return res.status(503).json({ error: 'Official login is not configured. Set OFFICIAL_SESSION_SECRET.' }); }
}
function logout(req, res) { clearSessionCookie(res); return res.json({ authenticated: false }); }
function session(req, res) { return res.json({ authenticated: true, username: req.official.username }); }
function listComplaints(req, res, next) {
  try {
    const db = load(); const filters = req.query;
    const results = db.complaints.filter((item) => {
      const department = db.departments.find((candidate) => candidate.id === item.department_id)?.name || '';
      return (!filters.id || item.id.toLowerCase().includes(String(filters.id).toLowerCase())) && (!filters.department || department === filters.department) && (!filters.status || item.status === filters.status) && (!filters.priority || item.priority === Number(filters.priority)) && (!filters.date || String(item.created_at).slice(0, 10) === filters.date) && (!filters.locality || item.location.toLowerCase().includes(String(filters.locality).toLowerCase()));
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ complaints: results.map((item) => present(db, item)), departments: db.departments.map((item) => item.name), statuses: STATUSES });
  } catch (error) { return next(error); }
}
function getOfficialComplaint(req, res, next) {
  try { const db = load(); const complaint = db.complaints.find((item) => item.id.toUpperCase() === req.params.id.toUpperCase()); if (!complaint) return res.status(404).json({ error: 'Complaint not found.' }); return res.json(present(db, complaint)); } catch (error) { return next(error); }
}
function updateOfficialComplaint(req, res, next) {
  try {
    const db = load(); const complaint = db.complaints.find((item) => item.id.toUpperCase() === req.params.id.toUpperCase());
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
    const requestedStatus = text(req.body.status, 40); const internalNote = text(req.body.internalNote, 1000);
    if (requestedStatus && !STATUSES.includes(requestedStatus)) return res.status(400).json({ error: 'Invalid complaint status.' });
    if (requestedStatus && requestedStatus !== complaint.status && !STATUS_FLOW[complaint.status].includes(requestedStatus)) return res.status(400).json({ error: `Cannot move a ${complaint.status} complaint to ${requestedStatus}.` });
    if (!requestedStatus && req.body.internalNote === undefined) return res.status(400).json({ error: 'Provide a valid status transition or an internal note.' });
    const now = new Date().toISOString();
    if (req.body.internalNote !== undefined) complaint.internal_note = internalNote;
    if (requestedStatus && requestedStatus !== complaint.status) { complaint.status = requestedStatus; db.status_log.push({ complaint_id: complaint.id, status: requestedStatus, changed_at: now, note: 'Status updated by municipal official' }); }
    complaint.updated_at = now; save(db); return res.json(present(db, complaint));
  } catch (error) { return next(error); }
}
module.exports = { login, logout, session, listComplaints, getOfficialComplaint, updateOfficialComplaint };
