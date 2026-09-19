const crypto = require('crypto');
const fs = require('fs');
const { nanoid } = require('nanoid');
const { load, save } = require('../db/init');
const { classifyText, classifyImage, combineClassifications } = require('../utils/aiClassifier');
const { buildTrieFromDepartments } = require('../utils/trieClassifier');
const { predictETA } = require('../utils/etaEngine');
const { OPEN_STATUSES, getQueueSnapshot } = require('../utils/complaintQueue');
const { sendComplaintConfirmation } = require('../services/emailService');

const STATUS_FLOW = { Submitted: ['Routed'], Routed: ['In Progress'], 'In Progress': ['Resolved'], Resolved: [] };
const MAX_TEXT_LENGTH = 3000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateComplaintId() { return `GC-${new Date().getFullYear()}-${nanoid(7).replace(/[^a-z0-9]/gi, 'X').toUpperCase()}`; }
function complaintHistory(db, id) { return db.status_log.filter((entry) => entry.complaint_id === id); }
function isAdminRequest(req) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = req.get('x-admin-key');
  return Boolean(expected && supplied && expected.length === supplied.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)));
}

function validText(value, max = MAX_TEXT_LENGTH) { return String(value || '').trim().slice(0, max); }
function normaliseAadhaar(value) { return String(value || '').replace(/[\s-]/g, ''); }
function validPhone(value) { return /^[6-9]\d{9}$/.test(String(value || '').replace(/\s|-/g, '')); }
function hashAadhaar(aadhaar) {
  // A per-record salt means the stored value cannot reveal or be used to look up
  // the original number. Raw Aadhaar is deliberately never written to disk.
  return crypto.createHash('sha256').update(`${crypto.randomBytes(32).toString('hex')}:${aadhaar}`).digest('hex');
}
function citizenValidation(body) {
  const fullName = validText(body.fullName, 120);
  const email = validText(body.email, 160).toLowerCase();
  const phone = String(body.phone || '').replace(/\s|-/g, '');
  const address = validText(body.address, 300);
  const aadhaar = normaliseAadhaar(body.aadhaar);
  if (!fullName || !EMAIL_PATTERN.test(email) || !validPhone(phone) || !address || !/^\d{12}$/.test(aadhaar)) {
    return null;
  }
  return { fullName, email, phone, address, aadhaar };
}
function titleFromText(text) {
  const firstSentence = text.replace(/\s+/g, ' ').split(/[.!?।]/)[0].trim();
  return (firstSentence || 'Civic service request').slice(0, 120);
}

async function analyseComplaint({ text, file, db }) {
  const departmentNames = db.departments.map((department) => department.name);
  const textResult = await classifyText(text, departmentNames);
  let imageResult = null;
  if (file && process.env.GROQ_API_KEY) {
    const image = file.buffer || fs.readFileSync(file.path);
    imageResult = await classifyImage(image.toString('base64'), file.mimetype, departmentNames);
  }
  let result = combineClassifications(textResult, imageResult);
  let source = result?.source;
  if (!result) {
    const matched = buildTrieFromDepartments(db.departments).score(text)[0];
    result = { department: matched?.department || 'Municipal & Property Tax', category: matched ? 'Keyword matched issue' : 'General civic issue', priority: matched ? 3 : 4, confidence: matched ? 0.5 : 0.1 };
    source = matched ? 'fallback_trie' : 'fallback_general';
  }
  const department = db.departments.find((item) => item.name === result.department) || db.departments[0];
  const backlogCount = db.complaints.filter((item) => item.department_id === department.id && OPEN_STATUSES.has(item.status)).length;
  return { department, category: result.category, priority: result.priority, confidence: result.confidence, classificationSource: source, etaDays: predictETA({ avgResolutionDays: department.avg_resolution_days, priority: result.priority, backlogCount }) };
}

async function analyseComplaintRequest(req, res, next) {
  try {
    const text = validText(req.body.text);
    if (text.length < 5) return res.status(400).json({ error: `Complaint text must be between 5 and ${MAX_TEXT_LENGTH} characters.` });
    const analysis = await analyseComplaint({ text, file: req.file, db: load() });
    return res.json({ subject: titleFromText(text), description: text, department: analysis.department.name, category: analysis.category, priority: analysis.priority, confidence: analysis.confidence, etaDays: analysis.etaDays, classificationSource: analysis.classificationSource });
  } catch (error) { return next(error); }
}

async function createComplaint(req, res, next) {
  try {
    const text = validText(req.body.description || req.body.text);
    if (text.length < 5 || text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: `Complaint text must be between 5 and ${MAX_TEXT_LENGTH} characters.` });
    const citizen = citizenValidation(req.body);
    if (!citizen) return res.status(400).json({ error: 'Provide a full name, valid email, 10-digit Indian mobile number, address/locality, and a 12-digit Aadhaar number.' });
    const db = load();
    const analysis = await analyseComplaint({ text, file: req.file, db });
    const reviewedDepartment = db.departments.find((item) => item.name === validText(req.body.department, 100));
    const reviewedPriority = Number(req.body.priority);
    const department = reviewedDepartment || analysis.department;
    const category = validText(req.body.category, 80) || analysis.category;
    const priority = Number.isInteger(reviewedPriority) && reviewedPriority >= 1 && reviewedPriority <= 5 ? reviewedPriority : analysis.priority;
    const backlogCount = db.complaints.filter((item) => item.department_id === department.id && OPEN_STATUSES.has(item.status)).length;
    const eta = predictETA({ avgResolutionDays: department.avg_resolution_days, priority, backlogCount });
    const now = new Date().toISOString(); const id = generateComplaintId();
    const complaint = {
      id, raw_text: text, subject: validText(req.body.subject, 120) || titleFromText(text),
      location: citizen.address, citizen: { full_name: citizen.fullName, email: citizen.email, phone: citizen.phone },
      aadhaar_last4: citizen.aadhaar.slice(-4), aadhaar_hash: hashAadhaar(citizen.aadhaar),
      image_path: req.file ? req.file.path : null, image_mime_type: req.file?.mimetype || null,
      department_id: department.id, category, priority, confidence: analysis.confidence, status: 'Routed', eta_days: eta,
      classification_source: analysis.classificationSource, created_at: now, updated_at: now,
    };
    db.complaints.push(complaint);
    db.status_log.push({ complaint_id: id, status: 'Submitted', changed_at: now, note: 'Complaint received' }, { complaint_id: id, status: 'Routed', changed_at: now, note: `Automatically routed to ${department.name}` });
    save(db);
    // Registration is durable before the optional external email attempt. A mail
    // outage must never roll back a citizen's successfully registered complaint.
    const email = await sendComplaintConfirmation({ to: citizen.email, complaint, department: department.name });
    res.status(201).json({ complaintId: id, department: department.name, category: complaint.category, priority: complaint.priority, etaDays: eta, status: complaint.status, classificationSource: analysis.classificationSource, email: { attempted: email.attempted, delivered: email.delivered } });
  } catch (error) { next(error); }
}

function getComplaint(req, res, next) {
  try {
    const db = load(); const complaint = db.complaints.find((item) => item.id.toUpperCase() === req.params.id.toUpperCase());
    if (!complaint) return res.status(404).json({ error: 'Complaint not found. Check the ID and try again.' });
    const department = db.departments.find((item) => item.id === complaint.department_id);
    const queue = getQueueSnapshot(db.complaints, complaint.department_id);
    const queuePosition = queue.findIndex((item) => item.complaintId === complaint.id) + 1;
    // Tracking deliberately exposes only the information required to follow a case.
    // It never returns contact details, address, attachment paths, full description,
    // Aadhaar fragments, or the stored Aadhaar hash.
    return res.json({
      id: complaint.id, subject: complaint.subject, department_name: department?.name || 'Unassigned',
      category: complaint.category, priority: complaint.priority, status: complaint.status, eta_days: complaint.eta_days,
      created_at: complaint.created_at, updated_at: complaint.updated_at, queue_position: queuePosition || null,
      history: complaintHistory(db, complaint.id),
    });
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
    const today = new Date().toISOString().slice(0, 10);
    const registeredToday = db.complaints.filter((item) => String(item.created_at).slice(0, 10) === today).length;
    const inProgressCount = db.complaints.filter((item) => item.status === 'In Progress').length;
    const highPriorityCount = db.complaints.filter((item) => OPEN_STATUSES.has(item.status) && item.priority <= 2).length;
    const resolvedDurations = db.complaints.map((complaint) => {
      const resolved = db.status_log.find((entry) => entry.complaint_id === complaint.id && entry.status === 'Resolved');
      return resolved ? (new Date(resolved.changed_at) - new Date(complaint.created_at)) / 86400000 : null;
    }).filter(Number.isFinite);
    const avgResolutionDays = resolvedDurations.length ? Math.round((resolvedDurations.reduce((sum, days) => sum + days, 0) / resolvedDurations.length) * 10) / 10 : null;
    const trendMap = new Map();
    db.complaints.forEach((item) => { const day = String(item.created_at).slice(0, 10); trendMap.set(day, (trendMap.get(day) || 0) + 1); });
    const trends = [...trendMap].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, count]) => ({ date, count }));
    const byLocation = [...db.complaints.reduce((map, item) => { if (item.location) map.set(item.location, (map.get(item.location) || 0) + 1); return map; }, new Map())]
      .filter(([, count]) => count >= 3).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count);
    return res.json({ total, openCount, inProgressCount, resolvedCount: total - openCount, registeredToday, highPriorityCount, avgEtaDays, avgResolutionDays, byDepartment, byStatus, trends, byLocation });
  } catch (error) { return next(error); }
}

function getPriorityQueues(req, res, next) {
  try {
    const db = load();
    const queues = db.departments.map((department) => ({ department: department.name, items: getQueueSnapshot(db.complaints, department.id).map((item, index) => ({ ...item, queuePosition: index + 1 })) })).filter((queue) => queue.items.length);
    return res.json({ queues });
  } catch (error) { return next(error); }
}

module.exports = { analyseComplaintRequest, createComplaint, getComplaint, updateComplaintStatus, getStats, getPriorityQueues };
