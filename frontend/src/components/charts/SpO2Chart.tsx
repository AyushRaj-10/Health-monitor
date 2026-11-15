import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { VitalTimeSeriesPoint } from '../../types';

interface SpO2ChartProps {
  data: VitalTimeSeriesPoint[];
  height?: number;
}

export const SpO2Chart: React.FC<SpO2ChartProps> = ({
  data,
  height = 260,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs text-healthcare-textSecondary">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-healthcare-textPrimary font-medium">Oxygen Saturation (SpO2 %)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[11px]">
            Hypoxia Caution &lt; 95%
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[11px]">
            Critical &lt; 92%
          </span>
        </div>
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#142825" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#526E69"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#193833' }}
            />
            <YAxis
              domain={[85, 100]}
              stroke="#526E69"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#193833' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as VitalTimeSeriesPoint;
                  const isHypoxic = item.spo2 < 95;
                  return (
                    <div className="bg-[#0B1514] border border-[#193833] rounded-lg p-3 shadow-xl text-xs">
                      <div className="text-healthcare-textMuted mb-1 font-mono">
                        Time: {label}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-400 text-sm font-mono">
                          {item.spo2}% SpO2
                        </span>
                        {isHypoxic && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                            Desaturation
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={95}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={92}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="spo2"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#spo2Gradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
