export const metadata = {
  title: "Plans | Rupie Times",
  description: "Subscription plans and pricing for Rupie Times.",
};

export default function PlansPage() {
  return (
    <div className="min-h-[60vh] bg-white">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">Plans</h1>
        <p className="mt-3 text-slate-600">Choose a plan that fits your needs. Demo placeholders below.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Basic</h2>
            <p className="mt-2 text-slate-600">News digest and limited insights.</p>
            <button className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-white font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent">
              Get Started
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-2 text-slate-600">Full insights and alerts.</p>
            <button className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-white font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent">
              Choose Pro
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Team</h2>
            <p className="mt-2 text-slate-600">Multi-user access and reporting.</p>
            <button className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-white font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


