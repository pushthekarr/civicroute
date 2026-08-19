// Lightweight JSON-file-backed data store — no native compilation required
// (unlike better-sqlite3, which needs Visual Studio build tools on Windows).
// Good enough for this project's scale; swap for Postgres later if needed.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data.json');

const DEPARTMENTS_SEED = [
  { name: 'Roads & PWD', keywords: 'pothole,road,footpath,pavement,bridge,construction', avg_resolution_days: 7 },
  { name: 'Water Supply', keywords: 'water,pipeline,leakage,tap,supply,tanker', avg_resolution_days: 5 },
  { name: 'Electricity', keywords: 'power,electricity,outage,transformer,wire,streetlight cut', avg_resolution_days: 4 },
  { name: 'Sanitation & Garbage', keywords: 'garbage,waste,trash,dump,cleaning,sewage,drain', avg_resolution_days: 3 },
  { name: 'Food Safety', keywords: 'food,restaurant,hygiene,adulteration,expired food', avg_resolution_days: 6 },
  { name: 'Drugs & Medicines', keywords: 'medicine,drug,pharmacy,fake medicine,expired drug', avg_resolution_days: 6 },
  { name: 'Public Health', keywords: 'hospital,clinic,disease,outbreak,mosquito,health', avg_resolution_days: 5 },
  { name: 'Police', keywords: 'crime,theft,safety,harassment,traffic violation,noise', avg_resolution_days: 2 },
  { name: 'Education', keywords: 'school,college,teacher,fees,education,exam', avg_resolution_days: 8 },
  { name: 'Municipal & Property Tax', keywords: 'tax,property,municipal,certificate,license', avg_resolution_days: 9 },
  { name: 'Public Transport', keywords: 'bus,transport,auto,taxi,station,railway', avg_resolution_days: 6 },
  { name: 'Environment & Pollution', keywords: 'pollution,smoke,noise pollution,tree,air quality', avg_resolution_days: 8 },
  { name: 'Street Lighting', keywords: 'streetlight,lamp,light not working,dark street', avg_resolution_days: 4 },
  { name: 'Building & Encroachment', keywords: 'illegal construction,encroachment,building,demolition', avg_resolution_days: 10 },
  { name: 'Consumer Affairs', keywords: 'consumer,billing,fraud,overcharge,shop', avg_resolution_days: 7 },
  { name: 'Telecom & Utilities', keywords: 'network,telecom,broadband,tower,signal', avg_resolution_days: 5 },
];

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      departments: DEPARTMENTS_SEED.map((d, i) => ({ id: i + 1, ...d })),
      complaints: [],
      status_log: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = { load, save };
