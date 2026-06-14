import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Terminal, ShieldCheck, Zap } from 'lucide-react';

export default function MockInterviewPreview() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Welcome! Let's start with a system design question. How would you design a rate limiter?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 2000));
      setMessages(prev => [...prev, { role: 'user', content: "I would use a token bucket algorithm using Redis for distributed rate limiting." }]);
      
      await new Promise(r => setTimeout(r, 1000));
      setIsTyping(true);
      
      await new Promise(r => setTimeout(r, 2000));
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: "Good approach. How would you handle race conditions in Redis when updating the token count?" }]);
    };
    
    // Simple infinite loop simulation
    const interval = setInterval(() => {
      setMessages([{ role: 'ai', content: "Welcome! Let's start with a system design question. How would you design a rate limiter?" }]);
      sequence();
    }, 12000);
    
    sequence();
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="interviews" className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left: Features */}
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center space-x-2 bg-brand-secondary/10 border border-brand-secondary/20 rounded-full px-4 py-1.5 mb-6"
            >
              <span className="text-xs font-medium text-brand-secondary uppercase tracking-wider">Meet RISE AI</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-theme-text mb-6 tracking-tight"
            >
              Ace the Interview with <span className="text-gradient">RISE AI</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-theme-text-muted mb-10 leading-relaxed"
            >
              Don't let nerves ruin your chances. Practice in a stress-free environment that simulates top companies' actual interview patterns.
            </motion.p>
            
            <div className="space-y-6">
              {[
                { icon: Mic, title: 'Voice & Tone Analysis', desc: 'Get feedback on your confidence levels and speaking pace.', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                { icon: Terminal, title: 'Live Coding Grids', desc: 'Write code as the AI watches and asks follow-up questions.', color: 'text-purple-400', bg: 'bg-purple-400/10' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  className="flex gap-4"
                >
                  <div className={`mt-1 p-2.5 rounded-lg h-10 w-10 flex items-center justify-center ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <h4 className="text-theme-text font-semibold text-lg">{item.title}</h4>
                    <p className="text-theme-text-muted text-sm mt-1">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-10"
            >
              <button className="bg-brand-secondary hover:bg-brand-primary text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                Try Free Mock Session
              </button>
            </motion.div>
          </div>

          {/* Right: Live Chat Window */}
          <div className="lg:w-1/2 w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card bg-[#151b2b] border-theme-border rounded-2xl overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-glass">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-linear-to-tr from-brand-primary to-brand-secondary flex items-center justify-center">
                    <Zap size={14} className="text-theme-text" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-theme-text">RISE Interviewer</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Listening...
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Mic size={14} className="text-theme-text-muted" />
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="p-6 space-y-4 min-h-[320px] max-h-[320px] overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-brand-primary text-white rounded-tr-sm' 
                          : 'bg-white/10 text-gray-200 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/10 p-4 rounded-2xl rounded-tl-sm flex space-x-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input Area (Visual Only) */}
              <div className="p-4 border-t border-theme-border bg-theme-glass">
                <div className="h-10 w-full bg-theme-glass rounded-lg border border-theme-border px-4 flex items-center text-sm text-gray-500">
                  <span className="animate-pulse">Type your answer or speak...</span>
                </div>
              </div>
            </motion.div>

            {/* Floating metric */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-6 top-1/3 glass-card p-3 z-30 shadow-xl hidden md:flex items-center gap-2"
            >
              <ShieldCheck size={18} className="text-green-400" />
              <div className="text-xs">
                <p className="text-theme-text-muted">Communication</p>
                <p className="text-theme-text font-bold">Strong</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
