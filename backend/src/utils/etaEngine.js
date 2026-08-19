// Rule-based (not black-box) ETA prediction:
// eta = department's historical avg resolution days,
// adjusted by priority and current open-complaint backlog for that department.

function predictETA({ avgResolutionDays, priority, backlogCount }) {
  let eta = avgResolutionDays;

  // Higher urgency (lower priority number) shortens ETA
  const priorityFactor = { 1: 0.4, 2: 0.6, 3: 1.0, 4: 1.3, 5: 1.6 }[priority] ?? 1.0;
  eta *= priorityFactor;

  // Backlog pressure: every 5 open complaints in the department adds ~1 day
  eta += Math.floor(backlogCount / 5);

  return Math.max(1, Math.round(eta));
}

module.exports = { predictETA };
