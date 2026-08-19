const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../civicroute.db'));
db.pragma('journal_mode = WAL');

// Departments taxonomy - seed data, extensible without code changes
db.exec(`
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  keywords TEXT NOT NULL,          -- comma-separated, used by trie fallback
  avg_resolution_days INTEGER NOT NULL DEFAULT 7
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,             -- e.g. GC-2026-00042
  raw_text TEXT NOT NULL,
  image_path TEXT,
  department_id INTEGER,
  category TEXT,
  priority INTEGER NOT NULL DEFAULT 3,   -- 1 = highest urgency, 5 = lowest
  status TEXT NOT NULL DEFAULT 'Submitted', -- Submitted, In Progress, Resolved
  eta_days INTEGER,
  classification_source TEXT,      -- 'ai' or 'fallback_trie'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS status_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id TEXT NOT NULL,
  status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);
`);

const DEPARTMENTS = [
  ['Roads & PWD', 'pothole,road,footpath,pavement,bridge,construction'],
  ['Water Supply', 'water,pipeline,leakage,tap,supply,tanker'],
  ['Electricity', 'power,electricity,outage,transformer,wire,streetlight cut'],
  ['Sanitation & Garbage', 'garbage,waste,trash,dump,cleaning,sewage,drain'],
  ['Food Safety', 'food,restaurant,hygiene,adulteration,expired food'],
  ['Drugs & Medicines', 'medicine,drug,pharmacy,fake medicine,expired drug'],
  ['Public Health', 'hospital,clinic,disease,outbreak,mosquito,health'],
  ['Police', 'crime,theft,safety,harassment,traffic violation,noise'],
  ['Education', 'school,college,teacher,fees,education,exam'],
  ['Municipal & Property Tax', 'tax,property,municipal,certificate,license'],
  ['Public Transport', 'bus,transport,auto,taxi,station,railway'],
  ['Environment & Pollution', 'pollution,smoke,noise pollution,tree,air quality'],
  ['Street Lighting', 'streetlight,lamp,light not working,dark street'],
  ['Building & Encroachment', 'illegal construction,encroachment,building,demolition'],
  ['Consumer Affairs', 'consumer,billing,fraud,overcharge,shop'],
  ['Telecom & Utilities', 'network,telecom,broadband,tower,signal'],
];

const insertDept = db.prepare(
  'INSERT OR IGNORE INTO departments (name, keywords, avg_resolution_days) VALUES (?, ?, ?)'
);
const seedTx = db.transaction(() => {
  for (const [name, keywords] of DEPARTMENTS) {
    insertDept.run(name, keywords, 5 + Math.floor(Math.random() * 5));
  }
});
seedTx();

module.exports = db;
