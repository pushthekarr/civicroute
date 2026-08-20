const test = require('node:test');
const assert = require('node:assert/strict');
const { MinHeap } = require('../src/utils/priorityQueue');
const { buildTrieFromDepartments } = require('../src/utils/trieClassifier');
const { predictETA } = require('../src/utils/etaEngine');
const { getQueueSnapshot } = require('../src/utils/complaintQueue');

test('min-heap orders urgency first and then oldest complaint', () => {
  const heap = new MinHeap();
  heap.push({ priority: 3, complaintId: 'new', createdAt: '2026-01-02T00:00:00.000Z' });
  heap.push({ priority: 1, complaintId: 'urgent', createdAt: '2026-01-03T00:00:00.000Z' });
  heap.push({ priority: 3, complaintId: 'old', createdAt: '2026-01-01T00:00:00.000Z' });
  assert.deepEqual([heap.pop().complaintId, heap.pop().complaintId, heap.pop().complaintId], ['urgent', 'old', 'new']);
});

test('trie scores Hindi, Marathi and English issue vocabulary', () => {
  const trie = buildTrieFromDepartments([
    { name: 'Roads', keywords: 'pothole,खड्डा,रस्ता' },
    { name: 'Water', keywords: 'water,paani,पानी,पाणी' },
  ]);
  assert.equal(trie.classify('रस्त्यावर मोठा खड्डा आहे'), 'Roads');
  assert.equal(trie.classify('paani pipeline leakage'), 'Water');
});

test('ETA responds to priority and backlog', () => {
  assert.equal(predictETA({ avgResolutionDays: 5, priority: 1, backlogCount: 0 }), 2);
  assert.equal(predictETA({ avgResolutionDays: 5, priority: 3, backlogCount: 10 }), 7);
});

test('department queues exclude resolved work and retain heap order', () => {
  const queue = getQueueSnapshot([
    { id: 'normal', department_id: 1, priority: 3, status: 'Routed', created_at: '2026-01-02T00:00:00.000Z' },
    { id: 'urgent', department_id: 1, priority: 1, status: 'In Progress', created_at: '2026-01-03T00:00:00.000Z' },
    { id: 'done', department_id: 1, priority: 1, status: 'Resolved', created_at: '2026-01-01T00:00:00.000Z' },
  ], 1);
  assert.deepEqual(queue.map((item) => item.complaintId), ['urgent', 'normal']);
});
