import React from 'react';
import { motion } from 'framer-motion';
import { Play, Code, MessageSquare, LineChart, Cpu } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden bg-mesh-animated">
      <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-[2px] z-0"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
        {/* Text Content */}
        <div className="lg:w-1/2 flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-1.5 mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-cyan animate-pulse"></span>
            <span className="text-xs font-medium text-brand-cyan uppercase tracking-wider">Trusted by 50,000+ Candidates</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-theme-text leading-tight mb-6"
          >
            Your Complete <br/>
            <span className="text-gradient">Placement Prep</span> <br/>
            Platform
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-theme-text-muted mb-8 max-w-xl leading-relaxed"
          >
            Master Aptitude, Verbal, Reasoning, and Coding with AI-powered personalized roadmaps and realistic mock interviews.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] flex items-center justify-center space-x-2">
              <span>Start Preparing</span>
            </button>
            <button className="w-full sm:w-auto glass-card hover:bg-theme-border text-theme-text font-semibold px-8 py-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2">
              <Play size={20} className="text-brand-cyan" />
              <span>Explore Platform</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex items-center gap-6 text-sm text-gray-500 font-medium"
          >
            <div className="flex items-center gap-2">
              <Cpu size={16} /> <span>AI Mock</span>
            </div>
            <div className="flex items-center gap-2">
              <Code size={16} /> <span>Reasoning</span>
            </div>
            <div className="flex items-center gap-2">
              <LineChart size={16} /> <span>Coding</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} /> <span>HR Interviews</span>
            </div>
          </motion.div>
        </div>

        {/* Visual Mockups */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="lg:w-1/2 relative mt-16 lg:mt-0 w-full"
        >
          {/* Main Dashboard Card */}
          <div className="glass-card p-6 border border-theme-border shadow-2xl relative z-20 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-cyan"></div>
            <div className="flex items-center justify-between border-b border-theme-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs text-theme-text-muted font-medium bg-theme-glass px-2 py-1 rounded">rise/dashboard</div>
              </div>
            </div>
            
            {/* Mock Content inside dashboard */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-theme-text-muted text-sm">Overall Readiness</h3>
                  <p className="text-3xl font-bold text-theme-text mt-1">87%</p>
                </div>
                <div className="text-green-400 text-sm font-medium flex items-center gap-1">
                  ↑ 12% this week
                </div>
              </div>
              
              {/* Chart Mockup */}
              <div className="h-32 w-full bg-linear-to-t from-brand-primary/20 to-transparent rounded-lg border border-brand-primary/10 relative mt-4 flex items-end px-2 pb-2 gap-2">
                 {[40, 60, 45, 70, 65, 85, 87].map((height, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      className="flex-1 bg-brand-primary/50 rounded-t-sm hover:bg-brand-cyan/50 transition-colors"
                    ></motion.div>
                 ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-theme-glass p-3 rounded-lg border border-theme-border">
                  <p className="text-xs text-theme-text-muted">Upcoming Interview</p>
                  <p className="text-sm font-medium text-theme-text mt-1">Amazon SDET Mock</p>
                </div>
                <div className="bg-theme-glass p-3 rounded-lg border border-theme-border">
                  <p className="text-xs text-theme-text-muted">Daily Streak</p>
                  <p className="text-sm font-medium text-theme-text mt-1">14 Days 🔥</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Cards */}
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-8 -top-12 glass-card p-4 z-30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-brand-secondary/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-brand-secondary/20 flex items-center justify-center">
                <MessageSquare size={16} className="text-brand-secondary" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">AI Feedback</p>
                <p className="text-sm font-bold text-theme-text">"Great communication!"</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -left-12 bottom-12 glass-card p-4 z-30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-brand-cyan/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                <Code size={16} className="text-brand-cyan" />
              </div>
              <div>
                <p className="text-xs text-theme-text-muted">Code Optimization</p>
                <p className="text-sm font-bold text-theme-text">O(n) achieved</p>
              </div>
            </div>
          </motion.div>
          
        </motion.div>
      </div>
    </div>
  );
}
