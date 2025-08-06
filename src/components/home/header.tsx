import Arrow from "../ui/arrow";
import Navbar from "./navbar";

export default function Header() {
  return (
    <div 
        id="header"
        className="header bg-[url('../assets/sharia-court.jpg')] bg-cover bg-center w-full h-screen relative min-h-screen"
      >
        <Navbar />
        <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-white text-5xl font-bold mb-4">
            Will & Estate Management
          </h1>
          <h2 className="text-white text-5xl font-bold mb-8">
            Solution Provider (WEMSP)
          </h2>
          <p className="text-white text-xl font-light mb-8 max-w-2xl">
            Secure your family&apos;s future with Sharia-compliant estate planning and digital asset management
          </p>
          <button className="bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-lg font-medium">
            <a href="/login" className="flex items-center gap-2">
              Get Started
              <Arrow />
            </a>
          </button>
        </div>
      </div>
  );
}