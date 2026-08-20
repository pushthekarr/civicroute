const { MinHeap } = require('./priorityQueue');
const OPEN_STATUSES = new Set(['Submitted', 'Routed', 'In Progress']);

function buildPriorityQueues(complaints) {
  const queues = new Map();
  for (const complaint of complaints) {
    if (!OPEN_STATUSES.has(complaint.status)) continue;
    if (!queues.has(complaint.department_id)) queues.set(complaint.department_id, new MinHeap());
    queues.get(complaint.department_id).push({ priority: complaint.priority, complaintId: complaint.id, createdAt: complaint.created_at, status: complaint.status });
  }
  return queues;
}
function getQueueSnapshot(complaints, departmentId) { return buildPriorityQueues(complaints).get(departmentId)?.peekAll() || []; }
module.exports = { OPEN_STATUSES, buildPriorityQueues, getQueueSnapshot };
