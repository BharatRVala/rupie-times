"use client";

import { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    LabelList
} from 'recharts';

export default function RepeatCustomerChart({ data, totalCount = 0 }) {
    const [period, setPeriod] = useState('weekly');
    const chartData = data[period] || [];

    // Find active point for static label
    const activePointIndex = chartData.length > 2 ? Math.floor(chartData.length * 0.7) : 0;
    const activePoint = chartData[activePointIndex];

    const handlePeriodChange = (e) => {
        setPeriod(e.target.value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#DAF2E3] text-[#1E4032] px-3 py-1.5 rounded-lg shadow-sm text-sm font-bold border border-[#1E4032]/20 relative">
                    <p>{`${payload[0].value}`}</p>
                    {/* Arrow */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#DAF2E3]"></div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Repeat Customer</h3>
                    <h2 className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</h2>
                </div>
                <div className="relative z-10">
                    <select
                        value={period}
                        onChange={handlePeriodChange}
                        className="appearance-none bg-[#E6F4EA] text-[#1E4032] text-xs font-bold py-1.5 pl-4 pr-8 rounded-full cursor-pointer focus:outline-none hover:bg-[#d6ebd9] transition-colors"
                    >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="sixMonthly">6 Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#1E4032]">
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            <div className="h-[250px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 40, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRepeat" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1E4032" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#1E4032" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f5f5f5" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#A0AEC0', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#A0AEC0', fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#1E4032', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#1E4032"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRepeat)"
                        />
                        {/* Static Active Point */}
                        {activePoint && (
                            <ReferenceDot
                                x={activePoint.name}
                                y={activePoint.value}
                                r={4}
                                fill="white"
                                stroke="#1E4032"
                                strokeWidth={2}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    content={(props) => {
                                        const { x, y, value } = props;
                                        return (
                                            <g transform={`translate(${x},${y - 45})`}>
                                                <rect x="-15" y="0" width="30" height="28" rx="4" fill="#DAF2E3" fillOpacity="0.9" />
                                                <text x="0" y="19" textAnchor="middle" fill="#1E4032" fontSize="12" fontWeight="bold">{value}</text>
                                                {/* Triangle */}
                                                <path d="M-5 28 L0 34 L5 28 Z" fill="#DAF2E3" fillOpacity="0.9" />
                                            </g>
                                        );
                                    }}
                                />
                            </ReferenceDot>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
