import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { fetchPriorityQueues, fetchStats } from '../api';
import './Dashboard.css';

const STATUS_COLORS = {
  Submitted: '#DCE1E8',
  'In Progress': '#E8A93B',
  Resolved: '#2E8B74',
};

const BAR_COLOR = '#1B2A4A';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queues, setQueues] = useState([]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchPriorityQueues()])
      .then(([statsData, queueData]) => { setStats(statsData); setQueues(queueData.queues || []); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-state">Loading civic data…</div>;
  if (error) return <div className="dashboard-state dashboard-state--error">{error}</div>;
  if (!stats || stats.total === 0) {
    return (
      <div className="dashboard-state">
        No complaints have been reported yet. Once citizens start submitting reports, this dashboard
        fills in with live department and status breakdowns.
      </div>
    );
  }

  const deptData = stats.byDepartment.filter((d) => d.count > 0);
  const statusData = stats.byStatus;

  return (
    <div className="container dashboard">
      <div className="dashboard__headline">
        <span className="eyebrow">Public dashboard</span>
        <h2>How the city is doing</h2>
        <p className="form-intro">Live view of every complaint reported through CivicRoute — no login needed.</p>
      </div>

      <div className="dashboard__stat-row">
        <div className="stat-card">
          <span className="stat-card__value">{stats.total}</span>
          <span className="stat-card__label">Total complaints</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.avgEtaDays}</span>
          <span className="stat-card__label">Avg. resolution (days)</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{deptData.length}</span>
          <span className="stat-card__label">Departments active</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.openCount}</span>
          <span className="stat-card__label">Open complaints</span>
        </div>
      </div>

      {queues.length > 0 && (
        <div className="card dashboard__queue">
          <h3 className="chart-card__title">Priority routing queues</h3>
          <p>Open complaints are ordered by urgency, then by submission time. Individual details stay private.</p>
          <div className="queue-summary">
            {queues.map((queue) => <div key={queue.department}><strong>{queue.department}</strong><span>{queue.items.length} open · next priority {queue.items[0].priority}</span></div>)}
          </div>
        </div>
      )}

      <div className="dashboard__panels">
        <div className="card chart-card">
          <h3 className="chart-card__title">Complaints by department</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, deptData.length * 34)}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="var(--text-muted)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="department"
                width={150}
                stroke="var(--text-muted)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {deptData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 className="chart-card__title">Status breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] || '#999'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
