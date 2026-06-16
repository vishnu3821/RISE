import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = TIMEOUT_MS - (15 * 1000); // 15 seconds warning

const SessionManager = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const showWarningRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const performLogout = useCallback(async () => {
    try {
      localStorage.removeItem('lastActivity');
      await logout();
      navigate('/login?expired=true');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login?expired=true');
    }
  }, [logout, navigate]);

  const updateActivity = useCallback(() => {
    if (!showWarningRef.current) {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('lastActivity', now.toString());
    }
  }, []);

  const handleContinue = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('lastActivity', now.toString());
    showWarningRef.current = false;
    setShowWarning(false);
  };

  useEffect(() => {
    if (!user) return;

    // Always reset activity to NOW when the app loads or a new tab is opened
    // This prevents the user from being instantly logged out if they reopen the site after being away
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('lastActivity', now.toString());

    const checkSession = () => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= TIMEOUT_MS) {
        performLogout();
      } else if (elapsed >= WARNING_MS) {
        if (!showWarningRef.current) {
          showWarningRef.current = true;
          setShowWarning(true);
        }
        setTimeLeft(Math.ceil((TIMEOUT_MS - elapsed) / 1000));
      } else {
        if (showWarningRef.current) {
          showWarningRef.current = false;
          setShowWarning(false);
        }
      }
    };

    const intervalId = setInterval(checkSession, 1000);
    checkSession();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    let throttleTimer;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateActivity();
        throttleTimer = null;
      }, 1000);
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const handleStorage = (e) => {
      if (e.key === 'lastActivity' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
        if (showWarningRef.current) {
          showWarningRef.current = false;
          setShowWarning(false);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, performLogout, updateActivity]);

  if (!showWarning) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative glass-card bg-theme-card/95 border border-red-500/30 w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-black text-theme-text tracking-tight mb-2">Session Expiring Soon</h2>
          <p className="text-theme-text-muted mb-8">
            Your session will expire in <span className="text-red-400 font-bold">{timeLeft} seconds</span> due to inactivity.
          </p>

          <div className="flex w-full gap-4">
            <button 
              onClick={performLogout}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-theme-glass transition-colors border border-theme-border"
            >
              Logout
            </button>
            <button 
              onClick={handleContinue}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
            >
              Continue Session
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SessionManager;
