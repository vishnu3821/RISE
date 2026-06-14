import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { id: 1, name: 'Practice Questions', value: '50,000+' },
  { id: 2, name: 'Programming Languages', value: '20+' },
  { id: 3, name: 'Mock Interviews', value: '500+' },
  { id: 4, name: 'Student Satisfaction', value: '95%' },
];

export default function Stats() {
  return (
    <div className="bg-brand-bg relative z-10 border-y border-theme-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <dt className="order-2 mt-2 text-sm md:text-base font-medium text-theme-text-muted">
                {stat.name}
              </dt>
              <dd className="order-1 text-4xl md:text-5xl font-extrabold text-theme-text tracking-tight">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
