// Trie-based keyword matcher — fallback department router used when the
// AI classifier is unavailable or returns low confidence.

class TrieNode {
  constructor() {
    this.children = {};
    this.departmentName = null; // set at the end of a keyword phrase
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(keyword, departmentName) {
    let node = this.root;
    for (const ch of keyword.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.departmentName = departmentName;
  }

  // Scans the complaint text for any inserted keyword as a substring match.
  // Returns the first department whose keyword is found, or null.
  classify(text) {
    const lower = text.toLowerCase();
    for (let start = 0; start < lower.length; start++) {
      let node = this.root;
      let i = start;
      while (i < lower.length && node.children[lower[i]]) {
        node = node.children[lower[i]];
        if (node.departmentName) return node.departmentName;
        i++;
      }
    }
    return null;
  }
}

// Build the trie once from the departments table (name + keywords columns)
function buildTrieFromDepartments(departments) {
  const trie = new Trie();
  for (const dept of departments) {
    const keywords = dept.keywords.split(',').map(k => k.trim());
    for (const kw of keywords) {
      trie.insert(kw, dept.name);
    }
  }
  return trie;
}

module.exports = { Trie, buildTrieFromDepartments };
