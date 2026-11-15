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

interface HeartRateChartProps {
  data: VitalTimeSeriesPoint[];
  height?: number;
  showPrivacyNoise?: boolean;
}

export const HeartRateChart: React.FC<HeartRateChartProps> = ({
  data,
  height = 260,
  showPrivacyNoise = true,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs text-healthcare-textSecondary">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span className="text-healthcare-textPrimary font-medium">Heart Rate (BPM)</span>
          </div>
          {showPrivacyNoise && (
            <div className="flex items-center gap-1.5 text-healthcare-textMuted">
              <span className="w-2 h-0.5 bg-emerald-400" />
              <span>Edge DP Perturbation Applied (ε=0.5)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[11px]">
            Tachycardia Threshold: 100 BPM
          </span>
        </div>
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
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
              domain={[50, 140]}
              stroke="#526E69"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#193833' }}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as VitalTimeSeriesPoint;
                  return (
                    <div className="bg-[#0B1514] border border-[#193833] rounded-lg p-3 shadow-xl text-xs">
                      <div className="text-healthcare-textMuted mb-1 font-mono">
                        Time: {label}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-teal-400 text-sm font-mono">
                          {item.heartRate} BPM
                        </span>
                        {item.heartRate > 100 && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 rounded">
                            Elevated
                          </span>
                        )}
                      </div>
                      {item.noiseAdded !== undefined && (
                        <div className="text-healthcare-textSecondary text-[11px] pt-1 border-t border-healthcare-borderSubtle">
                          DP Laplace Noise: {item.noiseAdded > 0 ? `+${item.noiseAdded}` : item.noiseAdded} bpm
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={100}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="heartRate"
              stroke="#14b8a6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#heartRateGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
