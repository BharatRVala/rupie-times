import Image from 'next/image';
import { ABOUT_DATA } from './data';

export const metadata = {
  title: "About | Rupie Times",
  description: "Learn about Rupie Times and our mission to democratize market intelligence.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen font-sans">
      {/* About Us Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-4 rounded-lg">

          {/* Left Column: Content */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-black mb-8">
              {ABOUT_DATA.title}
            </h1>
            <div className="space-y-6 text-gray-800 leading-relaxed text-base lg:text-lg">
              {ABOUT_DATA.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative w-full h-[400px] lg:h-[500px] bg-gray-200 rounded-[20px] overflow-hidden">
            <Image
              src={ABOUT_DATA.image}
              alt="About Rupie Times"
              fill
              className="object-cover"
              unoptimized
            />
          </div>

        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

          {/* Mission */}
          <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-4 rounded-lg">
            <div className="w-16 h-16 mb-6 relative">
              <Image
                src={ABOUT_DATA.mission.icon}
                alt="Mission Icon"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <h2 className="text-3xl font-bold text-black mb-6">{ABOUT_DATA.mission.title}</h2>
            <p className="text-gray-800 leading-relaxed text-base lg:text-lg">
              {ABOUT_DATA.mission.content}
            </p>
          </div>

          {/* Vision */}
          <div className="backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-4 rounded-lg">
            <div className="w-16 h-16 mb-6 relative">
              <Image
                src={ABOUT_DATA.vision.icon}
                alt="Vision Icon"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <h2 className="text-3xl font-bold text-black mb-6">{ABOUT_DATA.vision.title}</h2>
            <p className="text-gray-800 leading-relaxed text-base lg:text-lg">
              {ABOUT_DATA.vision.content}
            </p>
          </div>

        </div>
      </section>

      {/* Editorial Policy Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16 lg:my-24">
        <div className=" backdrop-blur supports-[backdrop-filter]:bg-[#757575]/60 bg-[#757575]/60 rounded-[15px] p-8 lg:p-16 text-center">
          <p className="text-white leading-relaxed text-base lg:text-lg max-w-5xl mx-auto">
            {ABOUT_DATA.editorialPolicy.content}
          </p>
        </div>
      </section>
    </div>
  );
}