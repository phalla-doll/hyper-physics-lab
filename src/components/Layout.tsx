import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Activity, Info, Github, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'tesseract', label: '4D Tesseract', icon: Box, description: 'Hypercube Projection' },
    { id: 'pendulum', label: 'Chaos Theory', icon: Activity, description: 'Double Pendulum' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Mobile Menu Button */}
      <button 
        className="fixed top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full md:hidden"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Navigation */}
      <motion.nav 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-white/5 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              HyperPhysics
            </h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Simulation Lab</p>
          </div>

          <div className="space-y-2 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full group relative flex items-center p-4 rounded-xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg mr-4 transition-colors ${
                  activeTab === item.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/40 group-hover:text-white'
                }`}>
                  <item.icon size={20} />
                </div>
                <div className="text-left">
                  <div className={`font-medium transition-colors ${
                    activeTab === item.id ? 'text-white' : 'text-white/60 group-hover:text-white'
                  }`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/30">
                    {item.description}
                  </div>
                </div>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute right-4 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-white/30">
              <span>v1.0.0</span>
              <div className="flex gap-2">
                <a href="#" className="hover:text-white transition-colors"><Github size={14} /></a>
                <a href="#" className="hover:text-white transition-colors"><Info size={14} /></a>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,30,1)_0%,rgba(0,0,0,1)_100%)]" />
        
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="relative h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
