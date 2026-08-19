const { nanoid } = require('nanoid');
const { load, save } = require('../db/init');
const { classifyText, classifyImage } = require('../utils/aiClassifier');
const { buildTrieFromDepartments } = require('../utils/trieClassifier');
const { predictETA } = require('../utils/etaEngine');
const fs = require('fs');

function generateComplaintId() {
  const year = new Date().getFullYear();
  const suffix = nanoid(6).toUpperCase();
  return `GC-${year}-${suffix}`;
}

async function createComplaint(req, res) {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: 'Complaint text is required (min 5 chars).' });
    }

    const db = load();
    const departmentNames = db.departments.map(d => d.name);

    // 1. Try AI classification (text)
    let result = await classifyText(text, departmentNames);
    let source = 'ai';

    // 2. If an image was uploaded and AI is available, let vision model weigh in too
    if (req.file && process.env.GROQ_API_KEY) {
      const base64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
      const imgResult = await classifyImage(base64, req.file.mimetype, departmentNames);
      if (!result && imgResult) result = imgResult;
    }

    // 3. Fallback: trie-based keyword matcher
    if (!result || !departmentNames.includes(result.department)) {
      const trie = buildTrieFromDepartments(db.departments);
      const fallbackDept = trie.classify(text) || db.departments[0].name;
      result = { department: fallbackDept, category: 'General', priority: 3, confidence: 0.3 };
      source = 'fallback_trie';
    }

    const dept = db.departments.find(d => d.name === result.department) || db.departments[0];

    const backlogCount = db.complaints.filter(
      c => c.department_id === dept.id && c.status !== 'Resolved'
    ).length;

    const eta = predictETA({
      avgResolutionDays: dept.avg_resolution_days,
      priority: result.priority || 3,
      backlogCount,
    });

    const id = generateComplaintId();
    const now = new Date().toISOString();

    const complaint = {
      id,
      raw_text: text,
      image_path: req.file ? req.file.path : null,
      department_id: dept.id,
      category: result.category || 'General',
      priority: result.priority || 3,
      status: 'Submitted',
      eta_days: eta,
      classification_source: source,
      created_at: now,
      updated_at: now,
    };

    db.complaints.push(complaint);
    db.status_log.push({ complaint_id: id, status: 'Submitted', changed_at: now });
    save(db);

    res.status(201).json({
      complaintId: id,
      department: dept.name,
      category: complaint.category,
      priority: complaint.priority,
      etaDays: eta,
      status: 'Submitted',
      classificationSource: source,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process complaint.' });
  }
}

function getComplaint(req, res) {
  const db = load();
  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

  const dept = db.departments.find(d => d.id === complaint.department_id);
  res.json({ ...complaint, department_name: dept ? dept.name : null });
}

function getStats(req, res) {
  const db = load();

  const byDepartment = db.departments
    .map(d => ({
      department: d.name,
      count: db.complaints.filter(c => c.department_id === d.id).length,
    }))
    .sort((a, b) => b.count - a.count);

  const statusCounts = {};
  for (const c of db.complaints) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  const total = db.complaints.length;
  const avgEtaDays = total
    ? Math.round(db.complaints.reduce((sum, c) => sum + c.eta_days, 0) / total)
    : 0;

  res.json({ total, avgEtaDays, byDepartment, byStatus });
}

module.exports = { createComplaint, getComplaint, getStats };
