const crypto = require('crypto');
const fs = require('fs');
const { nanoid } = require('nanoid');
const { load, save } = require('../db/init');
const { classifyText, classifyImage, combineClassifications } = require('../utils/aiClassifier');
const { buildTrieFromDepartments } = require('../utils/trieClassifier');
const { predictETA } = require('../utils/etaEngine');
const { OPEN_STATUSES, getQueueSnapshot } = require('../utils/complaintQueue');

const STATUS_FLOW = { Submitted: ['Routed'], Routed: ['In Progress'], 'In Progress': ['Resolved'], Resolved: [] };
const MAX_TEXT_LENGTH = 3000;

function generateComplaintId() { return `GC-${new Date().getFullYear()}-${nanoid(7).replace(/[^a-z0-9]/gi, 'X').toUpperCase()}`; }
function complaintHistory(db, id) { return db.status_log.filter((entry) => entry.complaint_id === id); }
function isAdminRequest(req) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = req.get('x-admin-key');
  return Boolean(expected && supplied && expected.length === supplied.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)));
}

async function createComplaint(req, res, next) {
  try {
    const text = String(req.body.text || '').trim();
    if (text.length < 5 || text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: `Complaint text must be between 5 and ${MAX_TEXT_LENGTH} characters.` });
    const db = load(); const departmentNames = db.departments.map((department) => department.name);
    const textResult = await classifyText(text, departmentNames);
    let imageResult = null;
    if (req.file && process.env.GROQ_API_KEY) imageResult = await classifyImage(fs.readFileSync(req.file.path, { encoding: 'base64' }), req.file.mimetype, departmentNames);
    let result = combineClassifications(textResult, imageResult);
    let source = result?.source;
    if (!result) {
      const matched = buildTrieFromDepartments(db.departments).score(text)[0];
      result = { department: matched?.department || 'Municipal & Property Tax', category: matched ? 'Keyword matched issue' : 'General civic issue', priority: matched ? 3 : 4, confidence: matched ? 0.5 : 0.1 };
      source = matched ? 'fallback_trie' : 'fallback_general';
    }
    const department = db.departments.find((item) => item.name === result.department) || db.departments[0];
    const backlogCount = db.complaints.filter((item) => item.department_id === department.id && OPEN_STATUSES.has(item.status)).length;
    const eta = predictETA({ avgResolutionDays: department.avg_resolution_days, priority: result.priority, backlogCount });
    const now = new Date().toISOString(); const id = generateComplaintId();
    const complaint = { id, raw_text: text, image_path: req.file ? req.file.path : null, image_mime_type: req.file?.mimetype || null, department_id: department.id, category: result.category, priority: result.priority, confidence: result.confidence, status: 'Routed', eta_days: eta, classification_source: source, created_at: now, updated_at: now };
    db.complaints.push(complaint);
    db.status_log.push({ complaint_id: id, status: 'Submitted', changed_at: now, note: 'Complaint received' }, { complaint_id: id, status: 'Routed', changed_at: now, note: `Automatically routed to ${department.name}` });
    save(db);
    res.status(201).json({ complaintId: id, department: department.name, category: complaint.category, priority: complaint.priority, etaDays: eta, status: complaint.status, classificationSource: source });
  } catch (error) { next(error); }
}

function getComplaint(req, res, next) {
  try {
    const db = load(); const complaint = db.complaints.find((item) => item.id.toUpperCase() === req.params.id.toUpperCase());
    if (!complaint) return res.status(404).json({ error: 'Complaint not found. Check the ID and try again.' });
    const department = db.departments.find((item) => item.id === complaint.department_id);
    const queue = getQueueSnapshot(db.complaints, complaint.department_id);
    const queuePosition = queue.findIndex((item) => item.complaintId === complaint.id) + 1;
    return res.json({ ...complaint, department_name: department?.name || 'Unassigned', queue_position: queuePosition || null, history: complaintHistory(db, complaint.id) });
  } catch (error) { return next(error); }
}

function updateComplaintStatus(req, res, next) {
  try {
    if (!isAdminRequest(req)) return res.status(401).json({ error: 'Administrator authorization is required.' });
    const status = String(req.body.status || ''); const note = String(req.body.note || '').trim().slice(0, 280);
    const db = load(); const complaint = db.complaints.find((item) => item.id.toUpperCase() === req.params.id.toUpperCase());
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
    if (!STATUS_FLOW[complaint.status]?.includes(status)) return res.status(400).json({ error: `Cannot move a ${complaint.status} complaint to ${status}.` });
    const now = new Date().toISOString(); complaint.status = status; complaint.updated_at = now;
    db.status_log.push({ complaint_id: complaint.id, status, changed_at: now, note: note || undefined }); save(db);
    return res.json({ id: complaint.id, status: complaint.status, history: complaintHistory(db, complaint.id) });
  } catch (error) { return next(error); }
}

function getStats(req, res, next) {
  try {
    const db = load(); const total = db.complaints.length;
    const byDepartment = db.departments.map((department) => ({ department: department.name, count: db.complaints.filter((item) => item.department_id === department.id).length })).sort((a, b) => b.count - a.count);
    const statuses = ['Submitted', 'Routed', 'In Progress', 'Resolved'];
    const byStatus = statuses.map((status) => ({ status, count: db.complaints.filter((item) => item.status === status).length }));
    const avgEtaDays = total ? Math.round(db.complaints.reduce((sum, item) => sum + item.eta_days, 0) / total) : 0;
    const openCount = db.complaints.filter((item) => OPEN_STATUSES.has(item.status)).length;
    return res.json({ total, openCount, resolvedCount: total - openCount, avgEtaDays, byDepartment, byStatus });
  } catch (error) { return next(error); }
}

function getPriorityQueues(req, res, next) {
  try {
    const db = load();
    const queues = db.departments.map((department) => ({ department: department.name, items: getQueueSnapshot(db.complaints, department.id).map((item, index) => ({ ...item, queuePosition: index + 1 })) })).filter((queue) => queue.items.length);
    return res.json({ queues });
  } catch (error) { return next(error); }
}

module.exports = { createComplaint, getComplaint, updateComplaintStatus, getStats, getPriorityQueues };
