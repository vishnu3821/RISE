import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const steps = [
  {
    id: 1,
    title: 'Company Target',
    description: 'Select your Dream companies (MAANG, Big 4, Startups) and unlock specialized prep modules.',
    color: 'bg-indigo-400'
  },
  {
    id: 2,
    title: 'Skill Foundation',
    description: 'Master core fundamentals of DSA, Quants, and Reasoning through interactive modules.',
    color: 'bg-purple-400'
  },
  {
    id: 3,
    title: 'AI Simulation',
    description: 'Participate in unlimited AI-led technical and HR mock interviews with real-time benchmark analysis.',
    color: 'bg-cyan-400'
  },
  {
    id: 4,
    title: 'Placement Ready',
    description: 'Get verified "Placement Ready" status and share your profile with partner recruiters.',
    color: 'bg-emerald-400'
  }
];

export default function JourneyTimeline() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="prep" className="py-32 bg-brand-bg relative" ref={containerRef}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-theme-text mb-6 tracking-tight"
        >
          Your Path to <span className="text-gradient">Day Zero</span>
        </motion.h2>
        <p className="text-theme-text-muted text-lg">A structured journey designed for results.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Timeline Background Line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-white/10 transform md:-translate-x-1/2 rounded-full"></div>
        
        {/* Animated Fill Line */}
        <motion.div 
          className="absolute left-8 md:left-1/2 top-0 w-1 bg-linear-to-b from-indigo-500 via-purple-500 to-cyan-500 transform md:-translate-x-1/2 rounded-full z-10 origin-top"
          style={{ height: lineHeight }}
        ></motion.div>

        <div className="space-y-24">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-center md:justify-center w-full">
              
              {/* Left Content (hidden on mobile, acts as spacer or content on desktop) */}
              <div className="hidden md:block w-1/2 pr-12 text-right">
                {index % 2 === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                  >
                    <h3 className="text-2xl font-bold text-theme-text mb-3">{step.title}</h3>
                    <p className="text-theme-text-muted leading-relaxed">{step.description}</p>
                  </motion.div>
                )}
              </div>

              {/* Center Dot */}
              <motion.div 
                className="absolute left-8 md:left-1/2 transform -translate-x-1/2 flex items-center justify-center z-20"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-brand-bg shadow-[0_0_15px_rgba(255,255,255,0.2)] ${step.color}`}>
                  <span className="text-theme-text font-bold text-sm">{step.id}</span>
                </div>
              </motion.div>

              {/* Right Content (content on mobile, spacer or content on desktop) */}
              <div className="w-full pl-20 md:w-1/2 md:pl-12 text-left">
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className={index % 2 === 0 ? "md:hidden" : ""}
                >
                  <h3 className="text-2xl font-bold text-theme-text mb-3">{step.title}</h3>
                  <p className="text-theme-text-muted leading-relaxed">{step.description}</p>
                </motion.div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
