export const metadata = {
  title: "Insights | Rupie Times",
  description: "Research insights, analysis, and educational articles.",
};

export default function InsightsPage() {
  return (
    <div className="min-h-[60vh] bg-white">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">Insights</h1>
        <p className="mt-3 text-slate-600">Deep dives, tutorials, and perspectives. Demo content below.</p>

        <section className="mt-8 space-y-6">
          <div className="rounded-lg border border-slate-200 p-5">
            <h2 className="text-xl font-semibold">Understanding Market Cycles</h2>
            <p className="mt-2 text-slate-600">High-level overview of cycles and investor psychology.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-5">
            <h2 className="text-xl font-semibold">Risk Management Basics</h2>
            <p className="mt-2 text-slate-600">Position sizing, stop-losses, and diversification concepts.</p>
          </div>
        </section>
      </div>
    </div>
  );
}


