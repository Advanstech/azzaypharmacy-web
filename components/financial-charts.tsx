'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface ChartPoint {
  label: string;
  value: number;
  [key: string]: any;
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
  data: ChartPoint[];
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

function niceMax(max: number): number {
  if (max <= 0) return 100;
  const digits = Math.floor(Math.log10(max));
  const base = Math.pow(10, digits);
  const frac = max / base;
  let step = 1;
  if (frac <= 1) step = 1;
  else if (frac <= 2) step = 2;
  else if (frac <= 5) step = 5;
  else step = 10;
  return step * base;
}

const padding = { top: 24, right: 24, bottom: 36, left: 56 };

export function AreaChart({
  series,
  height = 260,
  currency = true,
  title,
  subtitle,
}: {
  series: ChartSeries[];
  height?: number;
  currency?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const width = 800;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const maxY = niceMax(Math.max(...allValues, 0));
  const xStep = series[0]?.data.length ? chartW / (series[0].data.length - 1 || 1) : chartW;

  const yFor = (v: number) => chartH - (v / maxY) * chartH + padding.top;
  const xFor = (i: number) => padding.left + i * xStep;

  const paths = useMemo(() => {
    return series.map(s => {
      const d = s.data
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`)
        .join(' ');
      const areaD = `${d} L ${xFor(s.data.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`;
      return { ...s, d, areaD };
    });
  }, [series]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ t, value: maxY * t, y: chartH - t * chartH + padding.top }));

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h4 className="text-sm font-black font-display">{title}</h4>}
          {subtitle && <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4" />
            <text x={padding.left - 8} y={tick.y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
              {currency ? `GH₵${formatCurrencyShort(tick.value)}` : tick.value.toFixed(0)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {series[0]?.data.map((p, i) => {
          const step = Math.max(1, Math.ceil(series[0].data.length / 12));
          if (i % step !== 0 && i !== series[0].data.length - 1) return null;
          return (
            <text key={i} x={xFor(i)} y={height - 10} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.5}>
              {p.label}
            </text>
          );
        })}
        {/* Areas */}
        {paths.map((s, idx) => (
          <motion.path
            key={s.key}
            d={s.areaD}
            fill={s.color}
            fillOpacity={0.12}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
          />
        ))}
        {/* Lines */}
        {paths.map((s, idx) => (
          <motion.path
            key={s.key}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: idx * 0.1 }}
          />
        ))}
        {/* Points */}
        {paths.map(s =>
          s.data.map((p, i) => (
            <circle key={`${s.key}-${i}`} cx={xFor(i)} cy={yFor(p.value)} r={3.5} fill={s.color} stroke="currentColor" strokeWidth={2} />
          ))
        )}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 220,
  currency = true,
  title,
  subtitle,
  color = '#0EA5E9',
}: {
  data: ChartPoint[];
  height?: number;
  currency?: boolean;
  title?: string;
  subtitle?: string;
  color?: string;
}) {
  const width = 800;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxY = niceMax(Math.max(...data.map(d => d.value), 0));
  const barWidth = Math.min(48, (chartW / data.length) * 0.6);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  const yFor = (v: number) => chartH - (v / maxY) * chartH + padding.top;
  const xFor = (i: number) => padding.left + gap + i * (barWidth + gap);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ t, value: maxY * t, y: chartH - t * chartH + padding.top }));

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h4 className="text-sm font-black font-display">{title}</h4>}
          {subtitle && <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4" />
            <text x={padding.left - 8} y={tick.y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
              {currency ? `GH₵${formatCurrencyShort(tick.value)}` : tick.value.toFixed(0)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(2, chartH - (yFor(d.value) - padding.top));
          return (
            <g key={i}>
              <motion.rect
                x={xFor(i)}
                y={yFor(d.value)}
                width={barWidth}
                height={h}
                rx={4}
                fill={color}
                initial={{ height: 0, y: yFor(0) }}
                animate={{ height: h, y: yFor(d.value) }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
              <text x={xFor(i) + barWidth / 2} y={yFor(d.value) - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill={color}>
                {currency ? `GH₵${formatCurrencyShort(d.value)}` : d.value}
              </text>
              <text x={xFor(i) + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.6}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({
  data,
  size = 180,
  title,
  subtitle,
}: {
  data: ChartPoint[];
  size?: number;
  title?: string;
  subtitle?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const radius = size / 2 - 12;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="w-full flex flex-col items-center">
      {(title || subtitle) && (
        <div className="mb-3 self-start">
          {title && <h4 className="text-sm font-black font-display">{title}</h4>}
          {subtitle && <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {data.map((d, i) => {
            const frac = total > 0 ? d.value / total : 0;
            const dash = frac * circumference;
            const segment = (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }}
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Total</p>
          <p className="text-sm font-black font-display">GH₵{formatCurrencyShort(total)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="truncate opacity-70">{d.label}</span>
            <span className="font-bold ml-auto">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart({
  series,
  height = 260,
  currency = true,
  title,
  subtitle,
}: {
  series: ChartSeries[];
  height?: number;
  currency?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const width = 800;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const maxY = niceMax(Math.max(...allValues, 0));
  const groupCount = series[0]?.data.length || 0;
  const groupWidth = groupCount ? chartW / groupCount : chartW;
  const barGap = 4;
  const barWidth = Math.max(8, (groupWidth - barGap * (series.length + 1)) / series.length);

  const yFor = (v: number) => chartH - (v / maxY) * chartH + padding.top;
  const xGroup = (i: number) => padding.left + i * groupWidth + groupWidth / 2;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ t, value: maxY * t, y: chartH - t * chartH + padding.top }));

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h4 className="text-sm font-black font-display">{title}</h4>}
          {subtitle && <p className="text-[10px] opacity-60 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4" />
            <text x={padding.left - 8} y={tick.y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
              {currency ? `GH₵${formatCurrencyShort(tick.value)}` : tick.value.toFixed(0)}
            </text>
          </g>
        ))}
        {series[0]?.data.map((p, i) => {
          const step = Math.max(1, Math.ceil(series[0].data.length / 12));
          if (i % step !== 0 && i !== series[0].data.length - 1) return null;
          return (
            <text key={i} x={xGroup(i)} y={height - 10} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.5}>
              {p.label}
            </text>
          );
        })}
        {series.map((s, sIdx) =>
          s.data.map((d, i) => {
            const groupCenter = xGroup(i);
            const totalBarsWidth = series.length * barWidth + (series.length - 1) * barGap;
            const startX = groupCenter - totalBarsWidth / 2;
            const x = startX + sIdx * (barWidth + barGap);
            const h = Math.max(2, chartH - (yFor(d.value) - padding.top));
            return (
              <g key={`${s.key}-${i}`}>
                <motion.rect
                  x={x}
                  y={Number.isNaN(yFor(d.value)) ? 0 : yFor(d.value)}
                  width={barWidth}
                  height={Number.isNaN(h) ? 0 : Math.max(0, h)}
                  rx={3}
                  fill={s.color}
                  initial={{ height: 0, y: Number.isNaN(yFor(0)) ? 0 : yFor(0) }}
                  animate={{ height: Number.isNaN(h) ? 0 : Math.max(0, h), y: Number.isNaN(yFor(d.value)) ? 0 : yFor(d.value) }}
                  transition={{ duration: 0.5, delay: i * 0.05 + sIdx * 0.05 }}
                />
                {(d.value || 0) > 0 && series[0]?.data.length <= 15 && (
                  <text x={x + barWidth / 2} y={(Number.isNaN(yFor(d.value)) ? 0 : yFor(d.value)) - 5} textAnchor="middle" fontSize="8" fontWeight="bold" fill={s.color}>
                    {currency ? `GH₵${formatCurrencyShort(d.value || 0)}` : d.value}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="w-2.5 h-2.5 rounded" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SparkLine({
  data,
  color = '#10B981',
  width = 120,
  height = 40,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const xStep = data.length > 1 ? width / (data.length - 1) : width;
  const d = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
