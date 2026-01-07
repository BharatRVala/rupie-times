"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Label, Tooltip } from 'recharts';

export default function SubscribedProductChart({ data }) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const activeData = data.find(d => d.name === 'Active')?.value || 0;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscribed Product</h3>

            <div className="flex-1 flex flex-col justify-center items-center relative">
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                                <Label
                                    value={activeData}
                                    position="center"
                                    className="text-3xl font-bold fill-gray-800"
                                />
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ color: '#1E4032', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Floating Label approximation for visual match */}
                    <div className="absolute top-[10%] right-[25%] bg-[#DAF2E3] text-[#1E4032] text-xs font-bold px-2 py-1 rounded">
                        {data.find(d => d.name === 'Active')?.value}
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-center gap-8 mt-4">
                {data.map((entry, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-sm font-bold text-gray-700">{entry.value}</span>
                        </div>
                        <span className="text-xs text-gray-500">{entry.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
