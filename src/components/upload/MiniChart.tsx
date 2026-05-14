'use client';

/**
 * MiniChart — 갤러리용 소형 Recharts 차트 (인터랙션 최소화)
 */

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Row, ChartType } from '@/context/ChartContext';

const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#00d4ff','#7c3aed','#10b981','#f59e0b','#ec4899'],
  ocean:   ['#0ea5e9','#06b6d4','#14b8a6','#0891b2','#38bdf8'],
  sunset:  ['#f97316','#ec4899','#a855f7','#ef4444','#f59e0b'],
  forest:  ['#22c55e','#84cc16','#10b981','#16a34a','#4ade80'],
  mono:    ['#f0f4ff','#a8b2c8','#8892b0','#6b7a99','#4a5568'],
  bw:      ['#2d3748','#718096','#cbd5e0','#edf2f7','#a0aec0'],
};

const MINI_AXIS_STYLE = { fill: '#6b7a99', fontSize: 9 };
const MINI_GRID = { stroke: 'rgba(255,255,255,0.04)' };

interface Props {
  data:        Row[];
  xAxis:       string;
  yAxes:       string[];
  chartType:   ChartType;
  colorScheme: string;
  stacked:     boolean;
}

export default function MiniChart({ data, xAxis, yAxes, chartType, colorScheme, stacked }: Props) {
  const colors = COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.default;

  if (!data.length || !xAxis || !yAxes.length) {
    return (
      <div style={{ width:'100%', height:140, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ color:'#4a5568', fontSize:12 }}>데이터 없음</span>
      </div>
    );
  }

  // PIE / DONUT
  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = data.map(row => ({
      name: String(row[xAxis]),
      value: Number(row[yAxes[0]]) || 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={140}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={pieData} cx="50%" cy="50%"
            outerRadius={55} innerRadius={chartType === 'donut' ? 28 : 0}
            dataKey="value" paddingAngle={2}
          >
            {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="none" />)}
          </Pie>
          <Tooltip
            contentStyle={{ background:'rgba(15,22,40,0.95)', border:'none', fontSize:10 }}
            itemStyle={{ color:'#f0f4ff' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // LINE
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid {...MINI_GRID} />
          <XAxis dataKey={xAxis} tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} width={28}
            tickFormatter={(v:number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
          <Tooltip contentStyle={{ background:'rgba(15,22,40,0.95)', border:'none', fontSize:10 }} />
          {yAxes.slice(0,5).map((y, i) => (
            <Line key={y} type="monotone" dataKey={y} stroke={colors[i]}
              strokeWidth={1.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // AREA
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <defs>
            {yAxes.slice(0,5).map((y, i) => (
              <linearGradient key={y} id={`mini-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors[i]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={colors[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...MINI_GRID} />
          <XAxis dataKey={xAxis} tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} width={28}
            tickFormatter={(v:number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
          <Tooltip contentStyle={{ background:'rgba(15,22,40,0.95)', border:'none', fontSize:10 }} />
          {yAxes.slice(0,5).map((y, i) => (
            <Area key={y} type="monotone" dataKey={y} stroke={colors[i]}
              fill={`url(#mini-g-${i})`} strokeWidth={1.5}
              stackId={stacked ? 'stack' : undefined} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // BAR / STACKED-BAR (default)
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 0 }} barCategoryGap="18%">
        <CartesianGrid {...MINI_GRID} />
        <XAxis dataKey={xAxis} tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={MINI_AXIS_STYLE} axisLine={false} tickLine={false} width={28}
          tickFormatter={(v:number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
        <Tooltip contentStyle={{ background:'rgba(15,22,40,0.95)', border:'none', fontSize:10 }} />
        {yAxes.slice(0,5).map((y, i) => (
          <Bar key={y} dataKey={y} fill={colors[i]}
            radius={(stacked && i === yAxes.length - 1) ? [3,3,0,0] : (!stacked ? [3,3,0,0] : [0,0,0,0])}
            stackId={stacked ? 'stack' : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
