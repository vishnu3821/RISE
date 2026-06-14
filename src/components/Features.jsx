import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Code2, Calculator, Users, BarChart3, Building2, CheckCircle2 } from 'lucide-react';

const features = [
  {
    name: 'Personalized AI Roadmap',
    description: 'Our algorithm analyzes your diagnostic tests to build a custom study path focused on your weaknesses.',
    icon: Brain,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10'
  },
  {
    name: 'Coding Playground',
    description: 'Real-time compiler with support for 20+ languages and company-specific problem sets.',
    icon: Code2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  {
    name: 'Cognitive Prep',
    description: 'Master Aptitude and Logical Reasoning through gamified daily sprints.',
    icon: Calculator,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  },
  {
    name: 'Deep Analytics',
    description: 'Track your percentile compared to 50k+ peers. Know exactly where you stand.',
    icon: BarChart3,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10'
  }
];

const rounds = [
  {
    title: 'Aptitude Round',
    items: ['Quantitative', 'Logical Reasoning', 'Verbal Ability'],
    gradient: 'from-purple-500/20 to-transparent'
  },
  {
    title: 'Technical Round',
    items: ['Data Structures & Algorithms', 'System Design', 'Core Subjects (OS, DBMS)'],
    gradient: 'from-blue-500/20 to-transparent'
  },
  {
    title: 'Interview Round',
    items: ['HR Interviews', 'Technical Deep Dives', 'AI Actionable Feedback'],
    gradient: 'from-emerald-500/20 to-transparent'
  },
  {
    title: 'Placement Ready',
    items: ['Readiness Score', 'Progress Tracking', 'Performance Reports'],
    gradient: 'from-cyan-500/20 to-transparent'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-brand-bg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Why Choose RISE */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-theme-text mb-6 tracking-tight"
          >
            Why Engineers Choose RISE
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-theme-text-muted"
          >
            The most comprehensive preparation ecosystem for tech placements.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-32">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-8 group relative overflow-hidden flex flex-col md:flex-row items-start gap-6"
            >
              <div className={`p-4 rounded-xl ${feature.bg} shrink-0`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-theme-text mb-2 group-hover:text-brand-primary transition-colors">{feature.name}</h3>
                <p className="text-theme-text-muted leading-relaxed">{feature.description}</p>
              </div>
              
              {/* Decorative mock UI inside card on hover */}
              {index === 0 && (
                <div className="absolute -right-10 -bottom-10 w-48 h-32 bg-theme-glass border border-theme-border rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-3 transform rotate-[-5deg]">
                  <div className="h-2 w-2/3 bg-purple-400/50 rounded mb-2"></div>
                  <div className="h-2 w-1/2 bg-white/20 rounded mb-2"></div>
                  <div className="h-2 w-3/4 bg-white/20 rounded"></div>
                </div>
              )}
               {index === 1 && (
                <div className="absolute -right-10 -bottom-10 w-48 h-32 bg-[#1e1e1e] border border-theme-border rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-3 flex text-[10px] text-green-400 font-mono flex-col gap-1 shadow-lg transform rotate-[-5deg]">
                  <span>{`function solve() {`}</span>
                  <span className="pl-2">{`return "hired!";`}</span>
                  <span>{`}`}</span>
                </div>
              )}
               {index === 3 && (
                <div className="absolute -right-4 -bottom-4 w-40 h-24 flex items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-1/4 h-1/3 bg-white/10 rounded-t-sm"></div>
                  <div className="w-1/4 h-1/2 bg-white/20 rounded-t-sm"></div>
                  <div className="w-1/4 h-3/4 bg-white/40 rounded-t-sm"></div>
                  <div className="w-1/4 h-full bg-cyan-400/60 rounded-t-sm"></div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* One Platform Every Round */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-theme-text mb-6 tracking-tight"
          >
            One Platform. <span className="text-brand-cyan">Every Round.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rounds.map((round, index) => (
            <motion.div
              key={round.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-8 bg-linear-to-b ${round.gradient} h-full border-t border-theme-border`}
            >
              <h3 className="text-xl font-bold text-theme-text mb-6">{round.title}</h3>
              <ul className="space-y-4">
                {round.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
