"use client";

import { useState, useEffect } from 'react';
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

export default function RevenueChart({ initialData }) { // Accept initialData if available, optional
    const [period, setPeriod] = useState('weekly');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRevenueData(period);
    }, [period]);

    const fetchRevenueData = async (selectedPeriod) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/dashboard/revenue?range=${selectedPeriod}`);
            const data = await res.json();
            if (data.success) {
                setChartData(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch revenue data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total revenue for the current period
    const totalRevenue = chartData.reduce((acc, curr) => acc + curr.value, 0);

    // Identify a peak or active point (e.g., today's data or highest point)
    const activePointIndex = chartData.length > 0 ? chartData.length - 1 : 0; // Highlight the most recent point usually
    const activePoint = chartData[activePointIndex];

    const handlePeriodChange = (e) => {
        setPeriod(e.target.value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#EFDECC] text-[#C0934B] px-3 py-1.5 rounded-lg shadow-sm text-sm font-bold border border-[#C0934B]/20 relative">
                    <p>{`₹ ${payload[0].value.toLocaleString()}`}</p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#EFDECC]"></div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Total Revenue</h3>
                    <h2 className="text-3xl font-bold text-gray-900 mt-1">₹ {totalRevenue.toLocaleString()}</h2>
                </div>
                <div className="relative z-10">
                    <select
                        value={period}
                        onChange={handlePeriodChange}
                        disabled={loading}
                        className="appearance-none bg-[#FFF8DC] text-[#C0934B] text-xs font-bold py-1.5 pl-4 pr-8 rounded-full cursor-pointer focus:outline-none hover:bg-[#F5E6CC] transition-colors disabled:opacity-50"
                    >
                        <option value="today">Today</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Last Month</option>
                        <option value="sixMonthly">Last 6 Months</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#C0934B]">
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>

            <div className={`h-[250px] w-full mt-auto transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 40, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C0934B" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#C0934B" stopOpacity={0} />
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
                            tickFormatter={(value) =>
                                value >= 1000 ? `${value / 1000}k` : value
                            }
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#C0934B', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#C0934B"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                        {/* Static Active Point logic simplified: show point for last item */}
                        {activePoint && chartData.length > 0 && (
                            <ReferenceDot
                                x={activePoint.name}
                                y={activePoint.value}
                                r={4}
                                fill="white"
                                stroke="#C0934B"
                                strokeWidth={2}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    content={(props) => {
                                        const { x, y, value } = props;
                                        // Only show label for the very last point
                                        if (value !== activePoint.value) return null;

                                        return (
                                            <g transform={`translate(${x},${y - 45})`}>
                                                <rect x="-30" y="0" width="60" height="28" rx="4" fill="#EADBC8" fillOpacity="0.8" />
                                                <text x="0" y="19" textAnchor="middle" fill="#8B6E4A" fontSize="12" fontWeight="bold">₹ {value.toLocaleString()}</text>
                                                <path d="M-5 28 L0 34 L5 28 Z" fill="#EADBC8" fillOpacity="0.8" />
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
