// components/AboutHero.jsx
import Image from 'next/image';
import abouthirograph from '@/app/assets/abouthirograph.jpg';

export const AboutHero = () => {
  return (
    <section className="relative py-12 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-3 lg:opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231f3e32' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            <div className="space-y-4 lg:space-y-6">
              <span className="inline-flex items-center px-3 py-1.5 lg:px-4 lg:py-2 bg-[#c19755]/10 text-[#c19755] text-xs lg:text-sm font-semibold rounded-full border border-[#c19755]/20">
                <div className="w-1.5 h-1.5 bg-[#c19755] rounded-full mr-2"></div>
                About Rupie Times
              </span>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight lg:leading-tight">
                Redefining{' '}
                <span className="text-[#c19755] block lg:inline">Market</span>{' '}
                Intelligence
              </h1>
              
              <p className="text-base lg:text-lg xl:text-xl text-gray-600 leading-relaxed lg:leading-relaxed">
                Empowering traders and investors with cutting-edge analytics, 
                real-time insights, and comprehensive market education. 
                We believe everyone deserves access to professional-grade market intelligence.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 lg:gap-6 pt-4 lg:pt-6 border-t border-gray-200/60">
              <div className="text-center p-3 lg:p-4 rounded-xl backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10/50 backdrop-blur-sm border border-gray-200/50">
                <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-[#1f3e32]">50K+</div>
                <div className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Active Traders</div>
              </div>
              <div className="text-center p-3 lg:p-4 rounded-xl backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10/50 backdrop-blur-sm border border-gray-200/50">
                <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-[#1f3e32]">15+</div>
                <div className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Markets Covered</div>
              </div>
              <div className="text-center p-3 lg:p-4 rounded-xl backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10/50 backdrop-blur-sm border border-gray-200/50">
                <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-[#1f3e32]">24/7</div>
                <div className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2">Live Analysis</div>
              </div>
            </div>
          </div>

          {/* Stock Chart Image */}
          <div className="relative order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="bg-gradient-to-br from-[#1f3e32] to-[#2a4f3f] rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-xl lg:shadow-2xl">
              <div className="bg-gray-900 rounded-lg lg:rounded-xl p-4 lg:p-6 overflow-hidden">
                {/* Stock Market Graph Image */}
                <div className="space-y-3 lg:space-y-4">
                  {/* Chart Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="text-white font-semibold text-sm lg:text-base">NIFTY 50</div>
                    </div>
                    <div className="bg-green-500/20 text-green-400 px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium border border-green-500/30">
                      +1.25%
                    </div>
                  </div>
                  
                  {/* Chart Container */}
                  <div className="h-48 sm:h-56 lg:h-60 xl:h-64 bg-gray-800 rounded-lg relative overflow-hidden">
                    <Image
                      src={abouthirograph}
                      alt="Stock Market Analytics Dashboard"
                      className="w-full h-full object-cover"
                      placeholder="blur"
                      priority
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                  </div>
                  
                  {/* Timeline */}
                  <div className="flex justify-between px-1 lg:px-2">
                    {['9:30 AM', '11:00 AM', '1:30 PM', '3:00 PM'].map((time, index) => (
                      <span key={index} className="text-xs text-gray-400 font-medium">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements - Hidden on mobile, visible on larger screens */}
            <div className="hidden lg:block absolute -top-4 -right-4 w-20 h-20 lg:w-24 lg:h-24 bg-[#c19755]/10 rounded-full blur-xl"></div>
            <div className="hidden lg:block absolute -bottom-4 -left-4 w-24 h-24 lg:w-32 lg:h-32 bg-[#1f3e32]/10 rounded-full blur-xl"></div>
            
            {/* Mobile floating elements - smaller and less prominent */}
            <div className="lg:hidden absolute -top-2 -right-2 w-12 h-12 bg-[#c19755]/10 rounded-full blur-lg"></div>
            <div className="lg:hidden absolute -bottom-2 -left-2 w-16 h-16 bg-[#1f3e32]/10 rounded-full blur-lg"></div>
          </div>
        </div>

        {/* Additional Mobile CTA */}
        <div className="lg:hidden mt-8 pt-6 border-t border-gray-200/60">
          <button className="w-full bg-[#1f3e32] text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
            Start Free Trial
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">
            Join 50,000+ traders today
          </p>
        </div>
      </div>
    </section>
  );
};