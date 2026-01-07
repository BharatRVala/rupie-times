'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaArrowUp } from 'react-icons/fa';

const IpoList = () => {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const fetchIpos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ipos?limit=0');
        const data = await response.json();

        if (data.success) {
          setIpos(data.data);
        } else {
          setError('Failed to load IPOs');
        }
      } catch (err) {
        setError('Failed to load IPOs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIpos();
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">
        <h2 className="text-4xl font-bold text-black mb-8">IPO Calendar</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c0934b]"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">
        <h2 className="text-4xl font-bold text-black mb-8">IPO Calendar</h2>
        <div className="text-center text-red-600 p-8">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section id="ipo-calendar" className="mx-auto max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold text-black">IPO Calendar</h2>
        <div className="relative">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer bg-white"
          >
            <option value={10}>Show 10</option>
            <option value={20}>Show 20</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
            <option value={9999}>Show All</option>
          </select>
        </div>
      </div>

      {ipos.length === 0 ? (
        <div className="text-center text-gray-500 p-8">
          No IPOs available at the moment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#c0934bb3]">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="backdrop-blur supports-[backdrop-filter]:bg-[#c0934b]/10 bg-[#c0934b]/10 text-left">
                <th className="p-4 font-bold text-black text-sm uppercase tracking-wider w-[30%]">
                  <div className="flex items-center gap-2 cursor-pointer">
                    Company <FaArrowUp className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 font-bold text-black text-sm uppercase tracking-wider w-[20%]">
                  Opening Date
                </th>
                <th className="p-4 font-bold text-black text-sm uppercase tracking-wider w-[20%]">
                  Closing Date
                </th>
                <th className="p-4 font-bold text-black text-sm uppercase tracking-wider w-[30%]">
                  Issue Price (Rs.)
                </th>
              </tr>
            </thead>
            <tbody>
              {ipos.slice(0, limit).map((ipo, index) => {
                const openingDate = new Date(ipo.openingDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                const closingDate = new Date(ipo.closingDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <tr
                    key={ipo._id}
                    className={`
                      group cursor-pointer transition-colors duration-200
                      ${index % 2 === 0 ? 'backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10' : 'backdrop-blur supports-[backdrop-filter]:bg-[#FDEFDB]/10 bg-[#FDEFDB]/10'}
                      hover:bg-[#FDEFDB]
                    `}
                  >
                    <td className="p-0">
                      <Link
                        href={ipo.link || '#'}
                        target="_blank"
                        className="block p-4 w-full h-full text-gray-700 font-medium group-hover:text-black"
                      >
                        {ipo.company}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={ipo.link || '#'}
                        target="_blank"
                        className="block p-4 w-full h-full text-gray-600 group-hover:text-black"
                      >
                        {openingDate}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={ipo.link || '#'}
                        target="_blank"
                        className="block p-4 w-full h-full text-gray-600 group-hover:text-black"
                      >
                        {closingDate}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={ipo.link || '#'}
                        target="_blank"
                        className="block p-4 w-full h-full text-gray-600 group-hover:text-black"
                      >
                        {ipo.issuePrice}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default IpoList;