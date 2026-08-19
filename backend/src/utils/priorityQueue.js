// Min-heap priority queue — used to rank complaints by urgency
// (priority 1 = most urgent, 5 = least urgent). Lower value = popped first.

class MinHeap {
  constructor() {
    this.heap = []; // each item: { priority, complaintId, createdAt }
  }

  size() {
    return this.heap.length;
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }

  peekAll() {
    // Returns a priority-sorted snapshot without mutating the heap
    return [...this.heap].sort((a, b) => a.priority - b.priority);
  }

  _compare(a, b) {
    // Lower priority number wins; ties broken by earlier createdAt
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.createdAt) - new Date(b.createdAt);
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this._compare(this.heap[idx], this.heap[parent]) < 0) {
        [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
        idx = parent;
      } else break;
    }
  }

  _bubbleDown(idx) {
    const n = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < n && this._compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
      if (right < n && this._compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

module.exports = { MinHeap };
