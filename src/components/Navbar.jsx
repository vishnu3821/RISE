import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Features', href: '#features' },
    { name: 'Prep', href: '#prep' },
    { name: 'Mock Interviews', href: '#interviews' },
    { name: 'Analytics', href: '#analytics' },
  ];

  return (
    <nav className={`fixed w-full z-50 glass-nav ${isScrolled ? 'scrolled' : 'py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="shrink-0 flex items-center">
            <span className="text-2xl font-bold tracking-tighter text-theme-text">
              RISE<span className="text-brand-primary">.</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-300 hover:text-theme-text transition-colors text-sm font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <a href="/login" className="text-gray-300 hover:text-theme-text font-medium text-sm px-4 py-2 transition-colors">
              Login
            </a>
            <a href="/signup" className="bg-brand-primary hover:bg-brand-secondary text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] text-center block">
              Get Started
            </a>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-theme-text focus:outline-none"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card mx-4 mt-2 p-4 flex flex-col space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-gray-300 hover:text-theme-text px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="pt-4 border-t border-theme-border flex flex-col space-y-3">
            <a href="/login" className="text-gray-300 hover:text-theme-text font-medium w-full text-left px-3 block">
              Login
            </a>
            <a href="/signup" className="bg-brand-primary text-white font-medium w-full py-2.5 rounded-lg text-center block">
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
