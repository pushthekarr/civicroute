// Lightweight, portable JSON persistence. The file is intentionally kept outside
// source control and can be mounted as a persistent volume on EC2.
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.CIVICROUTE_DATA_PATH
  ? path.resolve(process.env.CIVICROUTE_DATA_PATH)
  : path.join(__dirname, '../../data.json');

const DEPARTMENTS_SEED = [
  { name: 'Roads & PWD', keywords: 'pothole,road,footpath,pavement,bridge,construction,खड्डा,रस्ता,सड़क,गड्ढा', avg_resolution_days: 7 },
  { name: 'Water Supply', keywords: 'water,pipeline,leakage,tap,supply,tanker,paani,पानी,जल,पाइप,गळती,पाणी', avg_resolution_days: 5 },
  { name: 'Electricity', keywords: 'power,electricity,outage,transformer,wire,विद्युत,बिजली,वीज,तार', avg_resolution_days: 4 },
  { name: 'Sanitation & Garbage', keywords: 'garbage,waste,trash,dump,cleaning,sewage,drain,kachra,कचरा,सफाई,नाली,घाण', avg_resolution_days: 3 },
  { name: 'Food Safety', keywords: 'food,restaurant,hygiene,adulteration,expired food,खाना,भोजन,रेस्टोरेंट,अन्न', avg_resolution_days: 6 },
  { name: 'Drugs & Medicines', keywords: 'medicine,drug,pharmacy,fake medicine,expired drug,दवा,औषध,मेडिसिन', avg_resolution_days: 6 },
  { name: 'Public Health', keywords: 'hospital,clinic,disease,outbreak,mosquito,health,अस्पताल,बीमारी,डास,आरोग्य', avg_resolution_days: 5 },
  { name: 'Police & Public Safety', keywords: 'crime,theft,safety,harassment,traffic violation,emergency,अपराध,चोरी,परेशान,सुरक्षा,गुन्हा', avg_resolution_days: 2 },
  { name: 'Education', keywords: 'school,college,teacher,fees,education,exam,स्कूल,कॉलेज,शिक्षक,शिक्षण', avg_resolution_days: 8 },
  { name: 'Municipal & Property Tax', keywords: 'tax,property,municipal,certificate,license,कर,मालमत्ता,पालिका', avg_resolution_days: 9 },
  { name: 'Public Transport', keywords: 'bus,transport,auto,taxi,station,railway,बस,परिवहन,रिक्षा,रेलवे', avg_resolution_days: 6 },
  { name: 'Environment & Pollution', keywords: 'pollution,smoke,noise pollution,tree,air quality,प्रदूषण,धुआं,धूर,झाड', avg_resolution_days: 8 },
  { name: 'Street Lighting', keywords: 'streetlight,lamp,light not working,dark street,स्ट्रीट लाइट,लाइट,दिवा,अंधार', avg_resolution_days: 4 },
  { name: 'Building & Encroachment', keywords: 'illegal construction,encroachment,building,demolition,अतिक्रमण,निर्माण,इमारत', avg_resolution_days: 10 },
  { name: 'Consumer Affairs', keywords: 'consumer,billing,fraud,overcharge,shop,ग्राहक,बिल,धोखा,फसवणूक', avg_resolution_days: 7 },
  { name: 'Telecom & Utilities', keywords: 'network,telecom,broadband,tower,signal,नेटवर्क,मोबाइल,सिग्नल', avg_resolution_days: 5 },
  { name: 'Parks & Recreation', keywords: 'park,garden,playground,play area,उद्यान,बगीचा,गार्डन,मैदान', avg_resolution_days: 7 },
  { name: 'Fire & Disaster Response', keywords: 'fire,fire brigade,flood,disaster,collapsed,आग,बाढ़,पूर,आपत्ती', avg_resolution_days: 1 },
];

function createInitialData() {
  return { schema_version: 2, departments: DEPARTMENTS_SEED.map((department, index) => ({ id: index + 1, ...department })), complaints: [], status_log: [] };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialData();
    save(initial);
    return initial;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    db.departments = Array.isArray(db.departments) ? db.departments : [];
    db.complaints = Array.isArray(db.complaints) ? db.complaints : [];
    db.status_log = Array.isArray(db.status_log) ? db.status_log : [];
    // Day 2 named this department "Police". Preserve its identifier and all
    // existing complaint relationships while upgrading the public-facing name.
    const legacyPolice = db.departments.find((department) => department.name === 'Police');
    if (legacyPolice) legacyPolice.name = 'Police & Public Safety';
    for (const seed of DEPARTMENTS_SEED) {
      const existing = db.departments.find((department) => department.name === seed.name);
      if (existing) Object.assign(existing, seed);
      else db.departments.push({ id: nextDepartmentId(db.departments), ...seed });
    }
    db.schema_version = 2;
    return db;
  } catch (error) { throw new Error(`Could not read CivicRoute data store: ${error.message}`); }
}

function nextDepartmentId(departments) { return departments.reduce((max, department) => Math.max(max, department.id || 0), 0) + 1; }

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tempPath = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tempPath, DB_PATH);
}

module.exports = { load, save, DEPARTMENTS_SEED, DB_PATH };
