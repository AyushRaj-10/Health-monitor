import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { VitalTimeSeriesPoint } from '../../types';

interface MultiVitalChartProps {
  data: VitalTimeSeriesPoint[];
  height?: number;
}

export const MultiVitalChart: React.FC<MultiVitalChartProps> = ({
  data,
  height = 320,
}) => {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#142825" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#526E69"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#193833' }}
          />
          <YAxis
            stroke="#526E69"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#193833' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0B1514',
              borderColor: '#193833',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#E6F4F1',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 10, fontSize: 12, color: '#8BA39E' }}
          />
          <Line
            type="monotone"
            name="Heart Rate (BPM)"
            dataKey="heartRate"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: '#14b8a6' }}
          />
          <Line
            type="monotone"
            name="SpO2 (%)"
            dataKey="spo2"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: '#10b981' }}
          />
          <Line
            type="monotone"
            name="Systolic BP (mmHg)"
            dataKey="bloodPressureSys"
            stroke="#38bdf8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 5, fill: '#38bdf8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
