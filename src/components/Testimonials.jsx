import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'SDE-1 at Amazon',
    content: "RISE completely transformed my prep. The AI mock interviews felt exactly like the real rounds. The feedback on my communication and code optimization was spot on.",
    image: 'https://i.pravatar.cc/150?img=47'
  },
  {
    id: 2,
    name: 'Rahul Verma',
    role: 'Software Engineer at Google',
    content: "The company-specific roadmaps are a game changer. I knew exactly what DSA topics to focus on. The analytics dashboard kept me motivated to maintain my streak.",
    image: 'https://i.pravatar.cc/150?img=11'
  },
  {
    id: 3,
    name: 'Ananya Gupta',
    role: 'Analyst at Goldman Sachs',
    content: "I was struggling with the aptitude rounds, but the daily cognitive sprints on RISE made a huge difference. Highly recommend this to every placement-sitting student.",
    image: 'https://i.pravatar.cc/150?img=5'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-theme-text mb-6 tracking-tight"
          >
            Don't just take our word for it
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass-card p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} size={16} className="text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 mb-8 leading-relaxed italic">"{t.content}"</p>
              </div>
              <div className="flex items-center gap-4">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full border-2 border-theme-border" />
                <div>
                  <h4 className="text-theme-text font-semibold">{t.name}</h4>
                  <p className="text-xs text-brand-cyan">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
