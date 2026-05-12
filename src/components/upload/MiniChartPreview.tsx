'use client';

import { Row } from '@/context/ChartContext';
import { ChartType } from '@/context/ChartContext';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ec4899'];
const AXIS_STYLE = { fill: '#8892b0', fontSize: 11 };
const GRID_PROPS = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' };

interface Props {
  data: Row[];
  xAxis: string;
  yAxes: string[];
  chartType: ChartType;
  valueMode: string;
  showMoM: boolean;
}

const MiniTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,22,40,0.97)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
};

export default function MiniChartPreview({ data, xAxis, yAxes, chartType, valueMode, showMoM }: Props) {
  if (!data.length || !xAxis || !yAxes.length) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '2rem' }}>📊</span>
        <p style={{ fontSize: '0.85rem' }}>수치 항목을 선택하면 미리보기가 나타납니다</p>
      </div>
    );
  }

  const rolling = valueMode.startsWith('rolling');
  const n = rolling ? parseInt(valueMode.replace('rolling', '')) : 3;
  const isYTD = valueMode === 'ytd';

  const margin = { top: 10, right: 16, bottom: 4, left: 0 };

  const xEl = <XAxis dataKey={xAxis} tick={AXIS_STYLE} axisLine={false} tickLine={false} />;
  const yEl = <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />;
  const grid = <CartesianGrid {...GRID_PROPS} />;
  const tip = <Tooltip content={<MiniTooltip />} />;
  const leg = <Legend wrapperStyle={{ fontSize: 12, color: '#8892b0' }} />;

  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = data.map(r => ({ name: String(r[xAxis]), value: Number(r[yAxes[0]]) || 0 }));
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%"
            innerRadius={chartType === 'donut' ? 60 : 0} outerRadius={100}
            dataKey="value" paddingAngle={2}
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
          </Pie>
          {tip}{leg}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'radar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey={xAxis} tick={AXIS_STYLE} />
          {yAxes.map((y, i) => (
            <Radar key={y} name={y} dataKey={y} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.25} />
          ))}
          {tip}{leg}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar' || chartType === 'stacked-bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={margin} barCategoryGap="28%">
          {grid}{xEl}{yEl}{tip}{leg}
          {yAxes.map((y, i) => (
            <Bar key={y} dataKey={y} fill={COLORS[i]} radius={[3, 3, 0, 0]}
              stackId={chartType === 'stacked-bar' ? 'stack' : undefined} />
          ))}
          {rolling && yAxes.map((y, i) => (
            <Line key={`${y}_r`} type="monotone" dataKey={`${y}_rolling_${n}`}
              name={`${y} ${n}기 평균`} stroke={COLORS[i] + 'cc'} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={margin}>
          <defs>
            {yAxes.map((_, i) => (
              <linearGradient key={i} id={`mg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {grid}{xEl}{yEl}{tip}{leg}
          {yAxes.map((y, i) => (
            <Area key={y} type="monotone" dataKey={y} stroke={COLORS[i]} strokeWidth={2}
              fill={`url(#mg-${i})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'combo') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={margin}>
          {grid}{xEl}{yEl}{tip}{leg}
          {yAxes.map((y, i) => i === 0
            ? <Bar key={y} dataKey={y} fill={COLORS[i]} radius={[3, 3, 0, 0]} opacity={0.8} />
            : <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Default: LINE
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={margin}>
        {grid}{xEl}{yEl}{tip}{leg}
        {yAxes.map((y, i) => (
          <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i]} strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS[i], strokeWidth: 0 }} activeDot={{ r: 5 }} />
        ))}
        {isYTD && yAxes.map((y, i) => (
          <Line key={`${y}_ytd`} type="monotone" dataKey={`${y}_ytd_avg`}
            name={`${y} 누적평균`} stroke={COLORS[i] + '99'} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
        ))}
        {rolling && yAxes.map((y, i) => (
          <Line key={`${y}_roll`} type="monotone" dataKey={`${y}_rolling_${n}`}
            name={`${y} ${n}기 평균`} stroke={COLORS[i] + 'cc'} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
