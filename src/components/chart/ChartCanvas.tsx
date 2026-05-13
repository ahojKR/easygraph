'use client';

import { useChart, Row } from '@/context/ChartContext';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer, LabelList,
} from 'recharts';
import { calcMoMChanges, formatPercent, detectOutliers } from '@/lib/statistics';

const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#00d4ff','#7c3aed','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444','#a78bfa'],
  ocean:   ['#0ea5e9','#06b6d4','#14b8a6','#0891b2','#38bdf8','#22d3ee','#5eead4','#7dd3fc'],
  sunset:  ['#f97316','#ec4899','#a855f7','#ef4444','#f59e0b','#e11d48','#9333ea','#fb923c'],
  forest:  ['#22c55e','#84cc16','#10b981','#16a34a','#4ade80','#65a30d','#15803d','#a3e635'],
  mono:    ['#f0f4ff','#a8b2c8','#8892b0','#6b7a99','#4a5568','#374151','#2d3748','#1f2937'],
  // B/W 모드: 목표 차트와 동일한 진회색계 (어두운순 → 밝은순)
  bw:      ['#2d3748','#718096','#cbd5e0','#edf2f7','#a0aec0','#4a5568','#1a202c','#e2e8f0'],
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number | null }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,22,40,0.97)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, minWidth: 140,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ color: '#f0f4ff', fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => p.value !== null && p.value !== undefined ? (
        <p key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ) : null)}
    </div>
  );
};

const AXIS_STYLE = { fill: '#8892b0', fontSize: 12 };
const GRID_STYLE = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' };

// 스택드 바 X축: 첨째 줄 = 기간(Jan-Jul), 두번째 줄 = Subsidiary
const CustomGroupTick = (props: {
  x?: number; y?: number; payload?: { value: string };
}) => {
  const { x = 0, y = 0, payload } = props;
  const raw   = payload?.value ?? '';
  const parts = raw.split('\n');          // ['LGEIN', 'Jan–Jul'] or ['Jan–Jul']
  const sub    = parts.length >= 2 ? parts[0] : '';
  const period = parts.length >= 2 ? parts[1] : parts[0];
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#a8b2c8" fontSize={11}>
        {period}
      </text>
      {sub && (
        <text x={0} y={0} dy={28} textAnchor="middle" fill="#6b7a99" fontSize={10}>
          {sub}
        </text>
      )}
    </g>
  );
};

interface Props { data: Row[] }

export default function ChartCanvas({ data }: Props) {
  const { state } = useChart();
  const { xAxis, yAxes, chartType, options } = state;
  const colors = COLOR_SCHEMES[options.colorScheme] || COLOR_SCHEMES.default;

  if (!data.length || !xAxis || !yAxes.length) return null;

  // MoM badges
  const momChanges = options.showMoMChange && yAxes[0]
    ? calcMoMChanges(data, xAxis, yAxes[0]) : [];

  // Outliers
  const outlierSet = options.showOutliers && yAxes[0]
    ? detectOutliers(data, yAxes[0]) : new Set<number>();

  const commonProps = {
    data,
    margin: { top: 16, right: 24, bottom: 8, left: 8 },
  };

  const xAxisEl = <XAxis dataKey={xAxis} tick={AXIS_STYLE} axisLine={false} tickLine={false} />;
  const yAxisEl = <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />;
  const gridEl = options.showGrid ? <CartesianGrid {...GRID_STYLE} /> : null;
  const tooltipEl = <Tooltip content={<CustomTooltip />} />;
  const legendEl = options.showLegend ? <Legend wrapperStyle={{ color: '#8892b0', fontSize: 13 }} /> : null;
  const targetLine = options.showTargetLine && options.targetValue !== null
    ? <ReferenceLine y={options.targetValue} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `목표 ${options.targetValue?.toLocaleString()}`, fill: '#f59e0b', fontSize: 11 }} />
    : null;

  // Helper: overlay lines (YTD avg / rolling)
  const overlayLines = yAxes.flatMap(y => {
    const lines = [];
    if (options.showCumulativeAverage) {
      lines.push(
        <Line key={`${y}_ytd`} type="monotone" dataKey={`${y}_ytd_avg`} name={`${y} 누적평균`}
          stroke={colors[yAxes.indexOf(y)] + '99'} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
      );
    }
    if (options.showRollingAverage) {
      lines.push(
        <Line key={`${y}_roll`} type="monotone" dataKey={`${y}_rolling_${options.rollingAveragePeriod}`}
          name={`${y} ${options.rollingAveragePeriod}기 이동평균`}
          stroke={colors[yAxes.indexOf(y)] + 'bb'} strokeWidth={1.5} strokeDasharray="3 2" dot={false} />
      );
    }
    return lines;
  });

  // PIE / DONUT
  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = data.map(row => ({ name: String(row[xAxis]), value: Number(row[yAxes[0]]) || 0 }));
    const outerR = 130;
    const innerR = chartType === 'donut' ? 70 : 0;
    return (
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={innerR} outerRadius={outerR}
              dataKey="value" nameKey="name" paddingAngle={2}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(1)}%`}
              labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
              {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="none" />)}
              {options.showDataLabels && <LabelList dataKey="value" style={{ fill: 'white', fontSize: 11 }} />}
            </Pie>
            {tooltipEl}
            {legendEl}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // RADAR
  if (chartType === 'radar') {
    return (
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey={xAxis} tick={AXIS_STYLE} />
            <PolarRadiusAxis tick={AXIS_STYLE} />
            {yAxes.map((y, i) => (
              <Radar key={y} name={y} dataKey={y} stroke={colors[i]} fill={colors[i]} fillOpacity={0.25} />
            ))}
            {tooltipEl}
            {legendEl}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // SCATTER
  if (chartType === 'scatter') {
    return (
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            {gridEl}
            <XAxis dataKey={yAxes[0]} name={yAxes[0]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis dataKey={yAxes[1] || yAxes[0]} name={yAxes[1] || yAxes[0]} tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} />
            {tooltipEl}
            {legendEl}
            <Scatter name={`${yAxes[0]} vs ${yAxes[1] || yAxes[0]}`} data={data} fill={colors[0]}>
              {data.map((_, i) => <Cell key={i} fill={outlierSet.has(i) ? '#ef4444' : colors[0]} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // LINE
  if (chartType === 'line') {
    return (
      <div>
        {options.showMoMChange && momChanges.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {momChanges.slice(-6).filter(m => m.changePercent !== null).map((m, i) => (
              <span key={i} className={`badge ${m.isUp ? 'badge-up' : 'badge-down'}`}>
                {m.period} {m.isUp ? '↑' : '↓'} {formatPercent(m.changePercent)}
              </span>
            ))}
          </div>
        )}
        <ResponsiveContainer width="100%" height={380}>
          <LineChart {...commonProps}>
            {gridEl}
            {xAxisEl}{yAxisEl}
            {tooltipEl}{legendEl}
            {targetLine}
            {yAxes.map((y, i) => (
              <Line key={y} type="monotone" dataKey={y} stroke={colors[i]} strokeWidth={2.5}
                dot={{ r: 4, fill: colors[i], strokeWidth: 0 }}
                activeDot={{ r: 7 }}>
                {options.showDataLabels && <LabelList dataKey={y} position="top" style={{ fill: colors[i], fontSize: 11 }} />}
              </Line>
            ))}
            {overlayLines}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // AREA
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={380}>
        <AreaChart {...commonProps}>
          <defs>
            {yAxes.map((y, i) => (
              <linearGradient key={y} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {gridEl}{xAxisEl}{yAxisEl}{tooltipEl}{legendEl}{targetLine}
          {yAxes.map((y, i) => (
            <Area key={y} type="monotone" dataKey={y} stroke={colors[i]} strokeWidth={2}
              fill={`url(#area-grad-${i})`} stackId={options.stacked ? 'stack' : undefined}>
              {options.showDataLabels && <LabelList dataKey={y} position="top" style={{ fill: colors[i], fontSize: 11 }} />}
            </Area>
          ))}
          {overlayLines}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // BAR / STACKED BAR
  if (chartType === 'bar' || chartType === 'stacked-bar') {
    const isStacked = chartType === 'stacked-bar';

    // Custom label: shows total + YoY on top of stacked bar
    const StackedTopLabel = (props: {
      x?: number; y?: number; width?: number; value?: number;
      index?: number;
    }) => {
      const { x = 0, y = 0, width = 0, index = 0 } = props;
      const row = data[index] as Record<string, string | number | null> | undefined;
      if (!row) return null;
      const total = Number(row['_total'] ?? 0);
      const yoy   = row['_yoy'] !== undefined ? Number(row['_yoy']) : null;
      if (!total) return null;
      return (
        <g>
          {/* 합계 */}
          <text
            x={x + width / 2} y={y - 6}
            textAnchor="middle" fill="#f0f4ff" fontSize={11} fontWeight={700}
          >
            {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString()}
          </text>
          {/* YoY 성장률 */}
          {yoy !== null && (
            <text
              x={x + width / 2} y={y - 20}
              textAnchor="middle"
              fill={yoy >= 0 ? '#10b981' : '#ef4444'}
              fontSize={11} fontWeight={800}
            >
              {yoy >= 0 ? '▲' : '▼'}{Math.abs(yoy)}%
            </text>
          )}
        </g>
      );
    };

    return (
      <div>
        {options.showMoMChange && momChanges.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {momChanges.slice(-6).filter(m => m.changePercent !== null).map((m, i) => (
              <span key={i} className={`badge ${m.isUp ? 'badge-up' : 'badge-down'}`}>
                {m.period} {m.isUp ? '↑' : '↓'} {formatPercent(m.changePercent)}
              </span>
            ))}
          </div>
        )}
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            {...commonProps}
            barCategoryGap="20%"
            margin={{ top: isStacked ? 44 : 24, right: 24, bottom: 8, left: 8 }}
          >
            {gridEl}
            <XAxis
              dataKey={xAxis}
              tick={isStacked ? <CustomGroupTick /> : AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              height={isStacked ? 48 : 30}
            />
            {yAxisEl}{tooltipEl}{legendEl}{targetLine}
            {yAxes.map((y, i) => {
              const isLast = i === yAxes.length - 1;
              return (
                <Bar
                  key={y}
                  dataKey={y}
                  fill={colors[i]}
                  radius={isLast && isStacked ? [4, 4, 0, 0] : (!isStacked ? [4, 4, 0, 0] : [0, 0, 0, 0])}
                  stackId={isStacked ? 'stack' : undefined}
                >
                  {/* 개별 값 라벨 (세그먼트 내부) */}
                  {options.showDataLabels && (
                    <LabelList
                      dataKey={y}
                      position="inside"
                      style={{ fill: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 700 }}
                      formatter={(v: unknown) => {
                        const n = Number(v);
                        return n > 0 ? n.toLocaleString() : '';
                      }}
                    />
                  )}
                  {/* 마지막 스택에 합계+YoY 커스텀 라벨 */}
                  {isStacked && isLast && (
                    <LabelList content={<StackedTopLabel />} />
                  )}
                  {/* 일반 바에 합계 라벨 */}
                  {!isStacked && options.showDataLabels && (
                    <LabelList
                      dataKey={y}
                      position="top"
                      style={{ fill: colors[i], fontSize: 11 }}
                    />
                  )}
                  {/* 이상값 색상 */}
                  {!isStacked && data.map((_, di) => (
                    <Cell key={di} fill={outlierSet.has(di) ? '#ef4444' : colors[i]} />
                  ))}
                </Bar>
              );
            })}
            {overlayLines}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }


  // COMBO (Line + Bar)
  if (chartType === 'combo') {
    return (
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart {...commonProps}>
          {gridEl}{xAxisEl}
          <YAxis yAxisId="left" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
          <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
          {tooltipEl}{legendEl}{targetLine}
          {yAxes.map((y, i) => i === 0
            ? <Bar key={y} yAxisId="left" dataKey={y} fill={colors[i]} radius={[4,4,0,0]} opacity={0.8} />
            : <Line key={y} yAxisId="right" type="monotone" dataKey={y} stroke={colors[i]} strokeWidth={2.5} dot={{ r: 4, fill: colors[i] }} />
          )}
          {overlayLines}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
