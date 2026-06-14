import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('rise_theme') === 'light';
  });
  const [isTurningPage, setIsTurningPage] = useState(false);
  const [targetTheme, setTargetTheme] = useState(null);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('rise_theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('rise_theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => {
    if (isTurningPage) return;
    
    // Start page turn
    setTargetTheme(!isLightMode);
    setIsTurningPage(true);
    
    // Halfway through animation, actually flip the CSS classes
    setTimeout(() => {
      setIsLightMode(prev => !prev);
    }, 600); // 600ms is halfway
    
    // End animation
    setTimeout(() => {
      setIsTurningPage(false);
      setTargetTheme(null);
    }, 1200); // Full duration
  };

  return (
    <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
      {children}
      <AnimatePresence>
        {isTurningPage && (
          <div className="page-turn-container">
            {/* The actual page turning element */}
            <motion.div 
              initial={{ rotateY: 0 }}
              animate={{ rotateY: -180 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100%',
                height: '100%',
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                zIndex: 99999
              }}
            >
              {/* Front of page (current theme snapshot representation) */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  backgroundColor: !targetTheme ? '#f8fafc' : '#0b1326',
                  boxShadow: 'inset -20px 0 50px rgba(0,0,0,0.5)'
                }}
              />
              {/* Back of page (new theme representation) */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  backgroundColor: targetTheme ? '#f8fafc' : '#0b1326',
                  boxShadow: 'inset 20px 0 50px rgba(0,0,0,0.2)'
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
};
