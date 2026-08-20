// Trie-based, language-agnostic keyword scorer. It provides a deterministic
// fallback when the AI service is unavailable or uncertain.
class TrieNode { constructor() { this.children = new Map(); this.matches = []; } }

class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(keyword, departmentName) {
    const normalized = normalize(keyword);
    if (!normalized) return;
    let node = this.root;
    for (const character of normalized) {
      if (!node.children.has(character)) node.children.set(character, new TrieNode());
      node = node.children.get(character);
    }
    if (!node.matches.includes(departmentName)) node.matches.push(departmentName);
  }
  classify(text) { return this.score(text)[0]?.department || null; }
  score(text) {
    const normalized = normalize(text); const scores = new Map();
    for (let start = 0; start < normalized.length; start += 1) {
      let node = this.root;
      for (let index = start; index < normalized.length && node.children.has(normalized[index]); index += 1) {
        node = node.children.get(normalized[index]);
        for (const department of node.matches) scores.set(department, (scores.get(department) || 0) + 1);
      }
    }
    return [...scores.entries()].map(([department, score]) => ({ department, score }))
      .sort((a, b) => b.score - a.score || a.department.localeCompare(b.department));
  }
}

function normalize(value) { return String(value || '').toLocaleLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim(); }
function buildTrieFromDepartments(departments) {
  const trie = new Trie();
  for (const department of departments) for (const keyword of String(department.keywords || '').split(',')) trie.insert(keyword, department.name);
  return trie;
}
module.exports = { Trie, buildTrieFromDepartments, normalize };
