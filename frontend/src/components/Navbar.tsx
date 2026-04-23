import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
           localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Zenthera<span className="text-brand-orange">AI</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="/how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-brand-orange transition-colors">How it Works</a>
          <a href="/#section-about" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-brand-orange transition-colors">About Us</a>
          
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400 hover:text-brand-orange transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-brand-orange text-white rounded-full text-sm font-semibold hover:bg-[#d64e1f] transition-colors shadow-lg shadow-brand-orange/20"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-400"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            className="text-slate-900 dark:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-dark-bg border-t border-slate-100 dark:border-dark-border overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              <a href="/how-it-works" className="text-lg font-medium text-slate-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
              <a href="/#section-about" className="text-lg font-medium text-slate-900 dark:text-white" onClick={() => setIsMobileMenuOpen(false)}>About Us</a>
              <button 
                onClick={() => {
                  navigate('/dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-4 bg-brand-orange text-white rounded-xl font-bold"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
