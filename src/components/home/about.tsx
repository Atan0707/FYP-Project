import Arrow from "../ui/arrow";

export default function About() {
  return (
    <div 
      id="about" 
      className="about bg-[url('../assets/background-islamic.png')] bg-cover bg-center w-full h-screen relative"
      >
        <div className="absolute inset-0 bg-black/90" /> {/* Dark overlay */}
        <div className="relative z-10 container mx-auto h-full flex items-center px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="text-white">
              <h3 className="text-orange-400 text-xl font-medium mb-4">
                About Us
              </h3>
              <h2 className="text-4xl font-bold mb-8">
                Will & Estate Management Solution Provider (WEMSP)
              </h2>
            </div>
            
            {/* Right Column */}
            <div className="text-white/80">
              <p className="text-lg leading-relaxed mb-8">
                Our mission is to enhance the quality of life for Muslims by integrating 
                modern technology with traditional values, ensuring that our services 
                align with Shariah principles. Over the years, we have developed a deep 
                understanding of the unique challenges faced by the Muslim community, 
                particularly in areas such as asset management, financial planning, and 
                family governance.
              </p>
              <button className="bg-orange-400 text-white px-6 py-3 rounded-full hover:bg-orange-500 transition-colors flex items-center gap-2">
                Continue Reading
                <Arrow />
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}