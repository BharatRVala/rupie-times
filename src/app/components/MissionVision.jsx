// components/MissionVision.jsx
export const MissionVision = () => {
    return (
      <section className="relative py-12 lg:py-20 xl:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-100/50 overflow-hidden">
        {/* Background Elements - Reduced on mobile */}
        <div className="absolute inset-0">
          <div className="absolute top-5 left-5 w-48 h-48 lg:w-72 lg:h-72 bg-[#c19755]/5 rounded-full blur-2xl lg:blur-3xl animate-pulse"></div>
          <div className="absolute bottom-5 right-5 w-56 h-56 lg:w-96 lg:h-96 bg-[#1f3e32]/5 rounded-full blur-2xl lg:blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 lg:w-64 lg:h-64 bg-[#c19755]/3 rounded-full blur-xl lg:blur-2xl"></div>
        </div>
  
        {/* Grid Pattern - Lighter on mobile */}
        <div className="absolute inset-0 opacity-[0.02] lg:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#1f3e32 1px, transparent 1px), linear-gradient(90deg, #1f3e32 1px, transparent 1px)`,
            backgroundSize: '40px 40px lg:60px 60px',
          }}></div>
        </div>
  
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16 xl:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-white/10 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-gray-200/60 shadow-sm mb-6 lg:mb-8">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#c19755] rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#1f3e32] rounded-full animate-pulse delay-150"></div>
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#c19755] rounded-full animate-pulse delay-300"></div>
              </div>
              <span className="text-xs lg:text-sm font-semibold text-gray-700 tracking-wide lg:tracking-wider">
                OUR CORE BELIEFS
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight">
              Shaping the Future of{' '}
              <span className="text-[#c19755] block lg:inline">Market Intelligence</span>
            </h2>
            
            <p className="text-base lg:text-lg xl:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Building bridges between complex financial data and actionable insights for traders worldwide
            </p>
          </div>
  
          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 mb-12 lg:mb-16">
            {/* Mission Card */}
            <div className="group relative">
              {/* Animated Border - Reduced on mobile */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1f3e32] via-[#c19755] to-[#2a4f3f] rounded-2xl lg:rounded-3xl blur opacity-20 lg:opacity-30 group-hover:opacity-50 lg:group-hover:opacity-70 transition duration-500"></div>
              
              <div className="relative bg-gradient-to-br from-[#1f3e32] via-[#1a382a] to-[#234338] rounded-2xl lg:rounded-3xl p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl border border-[#2a4f3f]/50 overflow-hidden h-full">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 lg:opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 25% 25%, #c19755 2px, transparent 2px)`,
                    backgroundSize: '30px 30px lg:40px 40px',
                  }}></div>
                </div>
  
                {/* Icon & Header */}
                <div className="relative flex items-start justify-between mb-6 lg:mb-8">
                  <div className="flex-1">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-[#c19755] to-[#d4af65] rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg mb-4 lg:mb-6">
                      <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-3 lg:mb-4">Our Mission</h3>
                    <div className="w-16 lg:w-20 h-1 bg-gradient-to-r from-[#c19755] to-[#d4af65] rounded-full"></div>
                  </div>
                  <div className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white/10 ml-4">01</div>
                </div>
  
                {/* Content */}
                <div className="relative">
                  <p className="text-base lg:text-lg xl:text-xl text-gray-200 leading-relaxed font-light mb-6 lg:mb-8">
                    To democratize access to professional market intelligence by providing real-time analytics, comprehensive education, and actionable insights that empower individuals to make informed financial decisions with confidence and precision.
                  </p>
                  
                  {/* Features */}
                  <div className="flex flex-wrap gap-2 lg:gap-4">
                    {['Real-time Analytics', 'Comprehensive Education', 'Actionable Insights'].map((feature, index) => (
                      <div key={index} className="flex items-center gap-1 lg:gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 lg:px-4 lg:py-2 border border-white/20">
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#c19755] rounded-full flex-shrink-0"></div>
                        <span className="text-xs lg:text-sm text-white/10 font-medium whitespace-nowrap">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
  
                {/* Corner Accent - Smaller on mobile */}
                <div className="absolute top-0 right-0 w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-bl from-[#c19755] to-transparent rounded-tr-2xl lg:rounded-tr-3xl opacity-20"></div>
              </div>
            </div>
  
            {/* Vision Card */}
            <div className="group relative">
              {/* Animated Border - Reduced on mobile */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#c19755] via-[#1f3e32] to-[#d4af65] rounded-2xl lg:rounded-3xl blur opacity-15 lg:opacity-20 group-hover:opacity-25 lg:group-hover:opacity-40 transition duration-500"></div>
              
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 xl:p-10 shadow-xl lg:shadow-2xl border border-white/20 overflow-hidden h-full hover:shadow-2xl lg:hover:shadow-3xl transition-all duration-500">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-3 lg:opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 75% 75%, #1f3e32 1px, transparent 1px)`,
                    backgroundSize: '25px 25px lg:30px 30px',
                  }}></div>
                </div>
  
                {/* Icon & Header */}
                <div className="relative flex items-start justify-between mb-6 lg:mb-8">
                  <div className="flex-1">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-white to-gray-100 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 mb-4 lg:mb-6">
                      <svg className="w-6 h-6 lg:w-8 lg:h-8 text-[#c19755]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">Our Vision</h3>
                    <div className="w-16 lg:w-20 h-1 bg-gradient-to-r from-[#c19755] to-[#d4af65] rounded-full"></div>
                  </div>
                  <div className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900/5 ml-4">02</div>
                </div>
  
                {/* Content */}
                <div className="relative">
                  <p className="text-base lg:text-lg xl:text-xl text-gray-700 leading-relaxed font-light mb-6 lg:mb-8">
                    Creating a world where every investor, regardless of experience level, has access to the tools and knowledge needed to navigate financial markets with confidence, clarity, and unprecedented success in the digital age.
                  </p>
                  
                  {/* Vision Points */}
                  <div className="space-y-3 lg:space-y-4">
                    {[
                      { title: 'Future Focused', description: 'Innovating for tomorrow\'s markets today' },
                      { title: 'Global Impact', description: 'Empowering traders across continents' }
                    ].map((point, index) => (
                      <div key={index} className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 bg-white/50 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-gray-200/50 hover:border-[#c19755]/30 transition-colors duration-300">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 bg-[#1f3e32]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 lg:mt-1">
                          <div className="w-2 h-2 lg:w-3 lg:h-3 bg-[#c19755] rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm lg:text-base mb-1">{point.title}</h4>
                          <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">{point.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
  
                {/* Corner Accent - Smaller on mobile */}
                <div className="absolute bottom-0 left-0 w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-tr from-[#1f3e32]/10 to-transparent rounded-bl-2xl lg:rounded-bl-3xl"></div>
              </div>
            </div>
          </div>
  
          {/* CTA Section */}
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 lg:gap-6 bg-gradient-to-r from-[#1f3e32] to-[#2a4f3f] rounded-2xl lg:rounded-3xl px-6 py-6 lg:px-8 lg:py-8 shadow-xl lg:shadow-2xl border border-[#c19755]/20 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5 lg:opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 30% 50%, #c19755 2px, transparent 2px)`,
                  backgroundSize: '40px 40px lg:50px 50px',
                }}></div>
              </div>
              
              <div className="relative flex items-center gap-3 lg:gap-4 mb-4 sm:mb-0">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-pulse delay-300"></div>
                </div>
                <p className="text-lg lg:text-xl xl:text-2xl font-bold text-white text-center sm:text-left">
                  Join <span className="text-[#c19755]">50,000+</span> traders already transforming their market journey
                </p>
              </div>
              
              <button className="relative bg-gradient-to-r from-[#c19755] to-[#d4af65] text-white font-semibold px-6 py-3 lg:px-8 lg:py-4 rounded-xl lg:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-[#c19755]/30 w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2">
                  Start Your Journey
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl lg:rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  };