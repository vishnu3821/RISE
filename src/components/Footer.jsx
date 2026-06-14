import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Briefcase, Code } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#060b17] border-t border-theme-border pt-24 pb-12 relative overflow-hidden">
      {/* Final CTA Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card bg-linear-to-br from-brand-primary/20 to-brand-secondary/10 p-12 text-center rounded-3xl border border-brand-primary/20 shadow-[0_0_50px_rgba(79,70,229,0.15)]"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-theme-text mb-6">
            Your Dream Offer Letter Starts Here
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Prepare smarter with AI-powered placement training.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button className="w-full sm:w-auto bg-white text-brand-bg font-bold px-8 py-4 rounded-xl hover:bg-gray-200 transition-colors">
              Start Your Journey Today
            </button>
            <button className="w-full sm:w-auto glass-card text-theme-text font-medium px-8 py-4 rounded-xl hover:bg-theme-border transition-colors">
              Request a Demo
            </button>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <span className="text-2xl font-bold tracking-tighter text-theme-text mb-4 block">
              RISE<span className="text-brand-primary">.</span>
            </span>
            <p className="text-theme-text-muted text-sm max-w-sm">
              The world's premier platform for technical placement preparation, engineering future leaders through AI-driven insights and rigorous training.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white-muted hover:text-theme-text hover:bg-brand-primary/20 transition-all">
                <MessageCircle size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white-muted hover:text-theme-text hover:bg-brand-secondary/20 transition-all">
                <Briefcase size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border transition-all">
                <Code size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-theme-text font-semibold mb-6">Platform</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Curriculum</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Mock Interviews</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Coding Assessment</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-theme-text font-semibold mb-6">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">Community</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-theme-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs text-center md:text-left">
            © 2026 RISE Placement Prep, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Designed for the ambitious. Powered by Intelligence.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
