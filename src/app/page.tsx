'use client'

import Navbar from '../components/home/navbar';
import Header from "../components/home/header";
import About from "../components/home/about";
import Services from "../components/home/services";
import { Footer } from "@/components/ui/code.demo";

export default function Home() {
  return (
    <div className="items-center justify-items-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      {/* Header Section */}
      <Header />
      {/* About Section */}
      <About />
      {/* Services Section */}
      <Services />
      {/* Footer Section */}
      <Footer />
    </div>
  );
}
