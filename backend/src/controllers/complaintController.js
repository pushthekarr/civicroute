const { nanoid } = require('nanoid');
const db = require('../db/init');
const { classifyText, classifyImage } = require('../utils/aiClassifier');
const { buildTrieFromDepartments } = require('../utils/trieClassifier');
const { predictETA } = require('../utils/etaEngine');
const fs = require('fs');

function getAllDepartments() {
  return db.prepare('SELECT * FROM departments').all();
}

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

    const departments = getAllDepartments();
    const departmentNames = departments.map(d => d.name);

    // 1. Try AI classification (text)
    let result = await classifyText(text, departmentNames);
    let source = 'ai';

    // 2. If an image was uploaded and AI is available, let vision model weigh in too
    if (req.file && process.env.GROQ_API_KEY) {
      const base64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
      const imgResult = await classifyImage(base64, req.file.mimetype, departmentNames);
      // Prefer image result only if text classification failed
      if (!result && imgResult) result = imgResult;
    }

    // 3. Fallback: trie-based keyword matcher
    if (!result || !departmentNames.includes(result.department)) {
      const trie = buildTrieFromDepartments(departments);
      const fallbackDept = trie.classify(text) || departments[0].name;
      result = { department: fallbackDept, category: 'General', priority: 3, confidence: 0.3 };
      source = 'fallback_trie';
    }

    const dept = departments.find(d => d.name === result.department) || departments[0];

    // Backlog: how many open complaints currently assigned to this department
    const backlogCount = db
      .prepare(`SELECT COUNT(*) as c FROM complaints WHERE department_id = ? AND status != 'Resolved'`)
      .get(dept.id).c;

    const eta = predictETA({
      avgResolutionDays: dept.avg_resolution_days,
      priority: result.priority || 3,
      backlogCount,
    });

    const id = generateComplaintId();
    db.prepare(`
      INSERT INTO complaints (id, raw_text, image_path, department_id, category, priority, status, eta_days, classification_source)
      VALUES (?, ?, ?, ?, ?, ?, 'Submitted', ?, ?)
    `).run(id, text, req.file ? req.file.path : null, dept.id, result.category || 'General', result.priority || 3, eta, source);

    db.prepare(`INSERT INTO status_log (complaint_id, status) VALUES (?, 'Submitted')`).run(id);

    res.status(201).json({
      complaintId: id,
      department: dept.name,
      category: result.category || 'General',
      priority: result.priority || 3,
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
  const complaint = db.prepare(`
    SELECT c.*, d.name as department_name FROM complaints c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  res.json(complaint);
}

function getStats(req, res) {
  const byDepartment = db.prepare(`
    SELECT d.name as department, COUNT(c.id) as count
    FROM departments d LEFT JOIN complaints c ON c.department_id = d.id
    GROUP BY d.id ORDER BY count DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM complaints GROUP BY status
  `).all();

  const total = db.prepare(`SELECT COUNT(*) as c FROM complaints`).get().c;
  const avgEta = db.prepare(`SELECT AVG(eta_days) as avg FROM complaints`).get().avg;

  res.json({ total, avgEtaDays: avgEta ? Math.round(avgEta) : 0, byDepartment, byStatus });
}

module.exports = { createComplaint, getComplaint, getStats };
