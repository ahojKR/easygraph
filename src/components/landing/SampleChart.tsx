'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const data = [
  { month: '1월', 매출: 4200, 평균: 4200 },
  { month: '2월', 매출: 3800, 평균: 4000 },
  { month: '3월', 매출: 5100, 평균: 4367 },
  { month: '4월', 매출: 4700, 평균: 4450 },
  { month: '5월', 매출: 5600, 평균: 4680 },
  { month: '6월', 매출: 6200, 평균: 4933 },
  { month: '7월', 매출: 5900, 평균: 5071 },
  { month: '8월', 매출: 6800, 평균: 5288 },
  { month: '9월', 매출: 7200, 평균: 5500 },
  { month: '10월', 매출: 6500, 평균: 5600 },
  { month: '11월', 매출: 7800, 평균: 5800 },
  { month: '12월', 매출: 8500, 평균: 6025 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'rgba(20,28,53,0.95)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function SampleChart() {
  return (
    <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>월별 매출 추이 (샘플)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>2024년 1월 ~ 12월</p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, background: '#00d4ff', borderRadius: 2, display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>매출</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, background: '#7c3aed', borderRadius: 2, display: 'inline-block', borderTop: '1px dashed #7c3aed' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>누적 평균</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: '#8892b0', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8892b0', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={6000} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 4" label={{ value: '목표', fill: '#f59e0b', fontSize: 11 }} />
          <Line type="monotone" dataKey="매출" stroke="#00d4ff" strokeWidth={2.5} dot={{ fill: '#00d4ff', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#00d4ff' }} />
          <Line type="monotone" dataKey="평균" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
        <span className="badge badge-up">↑ 전월 대비 +8.97%</span>
        <span className="badge badge-neutral">YTD 평균 6,025</span>
      </div>
    </div>
  );
}
