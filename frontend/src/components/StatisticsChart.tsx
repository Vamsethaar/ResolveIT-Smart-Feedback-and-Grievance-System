import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StatisticsResponse } from '../types';

interface StatisticsChartProps {
  statistics: StatisticsResponse;
  title: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function StatisticsChart({ statistics, title }: StatisticsChartProps) {
  const statusData = Object.entries(statistics.statusDistribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const typeData = Object.entries(statistics.typeDistribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .slice(0, 10); // Limit to top 10

  const submissionTypeData = Object.entries(statistics.submissionTypeDistribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Status Distribution Pie Chart */}
        <div>
          <h4>Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Submission Type Distribution */}
        <div>
          <h4>Feedback vs Grievance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={submissionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {submissionTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '20px' }}>
        <div className="stat-card">
          <div className="stat-title">Total Grievances</div>
          <div className="stat-value">{statistics.totalGrievances}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Feedbacks</div>
          <div className="stat-value">{statistics.totalFeedbacks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Submitted</div>
          <div className="stat-value">{statistics.submitted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">In Progress</div>
          <div className="stat-value">{statistics.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Resolved</div>
          <div className="stat-value">{statistics.resolved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Rejected</div>
          <div className="stat-value">{statistics.rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Escalated</div>
          <div className="stat-value">{statistics.escalated}</div>
        </div>
      </div>
    </div>
  );
}

