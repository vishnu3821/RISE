import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, FileText, BookOpen, 
  CheckSquare, Code, Bot, BarChart2, User,
  Search, Bell, LogOut, TrendingUp, TrendingDown,
  ChevronRight, Circle, CheckCircle2, Loader2, X, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import PreviousYearQuestionsStudent from '../components/student/PreviousYearQuestionsStudent';
import ProfileStudent from '../components/student/ProfileStudent';
import LearningHubStudent from '../components/student/LearningHubStudent';
import MockTestsStudent from '../components/student/MockTestsStudent';
import AiInterviewsStudent from '../components/student/AiInterviewsStudent';
import FeedbackModal from '../components/student/FeedbackModal';
import { MessageSquare } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    learning: 0,
    pyq: 0,
    mockTests: 0,
    mockReAttempts: 0,
    interviews: 0
  });

  const [userGoals, setUserGoals] = useState({
    goal_questions_per_day: 20,
    goal_coding_per_day: 2,
    goal_mock_per_week: 1,
    current_streak: 0,
    placement_readiness: 0
  });
  const [dailyProgress, setDailyProgress] = useState({ questions: 0, coding: 0 });
  const [weeklyProgress, setWeeklyProgress] = useState({ mocks: 0 });
  const [weeklySummary, setWeeklySummary] = useState({ questions: 0, coding: 0, mocks: 0, time: 0 });
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ q: 20, c: 2, m: 1 });

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [
        { count: mockCount, data: mockAttempts },
        { count: pyqCount, data: pyqData },
        { count: learnCount, data: learnData },
        { count: interviewCount, data: interviewData }
      ] = await Promise.all([
        supabase.from('mock_test_attempts').select('test_id, started_at, mock_tests(title)', { count: 'exact' }).eq('student_id', user.id).eq('status', 'submitted').order('started_at', { ascending: false }).limit(5),
        supabase.from('student_progress').select('created_at, questions(title)', { count: 'exact' }).eq('student_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
        supabase.from('learning_hub_progress').select('created_at, learning_hub_questions(learning_hub_topics(title))', { count: 'exact' }).eq('student_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
        supabase.from('ai_interview_attempts').select('created_at, ai_interview_modules(name)', { count: 'exact' }).eq('student_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5)
      ]);

      // Calculate total hours based on activities (approximate 0.5h per topic/pyq, 2h per mock test, 0.5h per interview)
      const totalLearningHours = ((learnCount || 0) * 0.5) + ((pyqCount || 0) * 0.5) + ((mockCount || 0) * 2) + ((interviewCount || 0) * 0.5);

      setDashboardStats({
        learning: totalLearningHours,
        pyq: pyqCount || 0,
        mockTests: mockCount || 0,
        mockReAttempts: 0,
        interviews: interviewCount || 0
      });

      // Fetch User Goals and Streaks
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      let { data: goalsArray } = await supabase.from('student_goals').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1);
      let goalsData = goalsArray?.[0];
      if (!goalsData) {
        const { data: newGoals } = await supabase.from('student_goals').insert([{ student_id: user.id }]).select().limit(1);
        goalsData = newGoals?.[0] || { goal_questions_per_day: 20, goal_coding_per_day: 2, goal_mock_per_week: 1, current_streak: 0, placement_readiness: 0 };
      }
      setGoalForm({ q: goalsData.goal_questions_per_day, c: goalsData.goal_coding_per_day, m: goalsData.goal_mock_per_week });

      // Fetch coding categories to distinguish Coding vs regular questions
      const { data: codingCategories } = await supabase.from('learning_hub_categories').select('id').ilike('name', '%coding%');
      const codingCategoryIds = codingCategories?.map(c => c.id) || [];
      
      let codingQuestionIds = new Set();
      if (codingCategoryIds.length > 0) {
        const { data: codingTopics } = await supabase.from('learning_hub_topics').select('id').in('category_id', codingCategoryIds);
        const codingTopicIds = codingTopics?.map(t => t.id) || [];
        
        if (codingTopicIds.length > 0) {
          const { data: codingQuestions } = await supabase.from('learning_hub_questions').select('id').in('topic_id', codingTopicIds);
          codingQuestionIds = new Set(codingQuestions?.map(q => q.id) || []);
        }
      }

      // Daily stats
      const [
        { data: lhTodayData },
        { data: mockTodayData },
        { data: interviewTodayData }
      ] = await Promise.all([
        supabase.from('learning_hub_progress').select('id, question_id').eq('student_id', user.id).gte('created_at', startOfDay.toISOString()),
        supabase.from('mock_test_attempts').select('id').eq('student_id', user.id).gte('started_at', startOfDay.toISOString()),
        supabase.from('ai_interview_attempts').select('id').eq('student_id', user.id).gte('created_at', startOfDay.toISOString())
      ]);

      const lhTodayCoding = (lhTodayData || []).filter(row => codingQuestionIds.has(row.question_id)).length;
      const lhTodayNonCoding = (lhTodayData || []).filter(row => !codingQuestionIds.has(row.question_id)).length;

      const qToday = lhTodayNonCoding;
      const cToday = lhTodayCoding;
      setDailyProgress({ questions: qToday, coding: cToday });

      // Weekly stats
      const [
        { data: lhWeekData },
        { data: mockWeekData }
      ] = await Promise.all([
        supabase.from('learning_hub_progress').select('id, question_id').eq('student_id', user.id).gte('created_at', startOfWeek.toISOString()),
        supabase.from('mock_test_attempts').select('id').eq('student_id', user.id).eq('status', 'submitted').gte('started_at', startOfWeek.toISOString())
      ]);

      const lhWeekCoding = (lhWeekData || []).filter(row => codingQuestionIds.has(row.question_id)).length;
      const lhWeekNonCoding = (lhWeekData || []).filter(row => !codingQuestionIds.has(row.question_id)).length;

      const lhWeek = lhWeekNonCoding;
      const codeWeek = lhWeekCoding;
      const mockWeek = mockWeekData?.length || 0;

      const mWeek = mockWeek || 0;
      setWeeklyProgress({ mocks: mWeek });
      
      const weeklyTime = ((lhWeek || 0) * 0.1) + ((codeWeek || 0) * 0.3) + ((mockWeek || 0) * 2);
      setWeeklySummary({
        questions: lhWeek || 0,
        coding: codeWeek || 0,
        mocks: mockWeek || 0,
        time: weeklyTime.toFixed(1)
      });

      // Calculate Readiness
      let readinessScore = Math.min(100, Math.round(((mockCount || 0) * 10) + ((pyqCount || 0) * 2) + ((learnCount || 0) * 1) + ((interviewCount || 0) * 5)));
      
      // Update streak and readiness
      const getLocalYMD = (date) => date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      
      const today = getLocalYMD(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = getLocalYMD(yesterdayDate);

      const hasActivityToday = (lhTodayData?.length > 0) || (mockTodayData?.length > 0) || (interviewTodayData?.length > 0);
      
      let newStreak = goalsData.current_streak || 0;
      let lastDate = goalsData.last_activity_date;
      let streakUpdated = false;

      // Reset streak to 0 if they missed both today and yesterday
      if (lastDate && lastDate !== today && lastDate !== yesterdayStr) {
        newStreak = 0;
        streakUpdated = true;
      }

      if (hasActivityToday && lastDate !== today) {
        if (lastDate === yesterdayStr) {
          newStreak = (goalsData.current_streak || 0) + 1;
        } else {
          newStreak = 1;
        }
        lastDate = today;
        streakUpdated = true;
      }

      if (streakUpdated || readinessScore !== goalsData.placement_readiness) {
        await supabase.from('student_goals').update({
          current_streak: newStreak,
          last_activity_date: lastDate,
          placement_readiness: readinessScore
        }).eq('id', goalsData.id);
        setUserGoals({...goalsData, current_streak: newStreak, placement_readiness: readinessScore, last_activity_date: lastDate});
      } else {
        setUserGoals({...goalsData, placement_readiness: readinessScore, current_streak: newStreak});
      }

      // Build Recent Activity
      let activities = [];
      
      const timeAgo = (dateStr) => {
        const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
      };

      if (mockAttempts) {
        activities.push(...mockAttempts.map(m => ({
          color: 'bg-brand-cyan',
          title: 'Completed Mock Test',
          desc: m.mock_tests?.title || 'Practice Test',
          time: timeAgo(m.started_at),
          date: new Date(m.started_at)
        })));
      }
      if (pyqData) {
        activities.push(...pyqData.map(p => ({
          color: 'bg-brand-secondary',
          title: 'Solved PYQ',
          desc: p.questions?.title || 'Practice Question',
          time: timeAgo(p.created_at),
          date: new Date(p.created_at)
        })));
      }
      if (learnData) {
        activities.push(...learnData.map(l => ({
          color: 'bg-brand-primary',
          title: 'Finished Topic',
          desc: l.learning_hub_questions?.learning_hub_topics?.title || 'Learning Hub Topic',
          time: timeAgo(l.created_at),
          date: new Date(l.created_at)
        })));
      }
      if (interviewData) {
        activities.push(...interviewData.map(i => ({
          color: 'bg-emerald-400',
          title: 'Completed AI Interview',
          desc: i.ai_interview_modules?.name || 'Mock Interview',
          time: timeAgo(i.created_at),
          date: new Date(i.created_at)
        })));
      }

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setToastNotification(payload.new);
          // Auto dismiss toast after 8 seconds
          setTimeout(() => setToastNotification(null), 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const path = location.pathname;
  let activeTab = 'Dashboard';
  let shortTitle = 'Dashboard';
  if (path.includes('/previous-year-questions')) { activeTab = 'Previous Year Questions'; shortTitle = 'PYQ'; }
  else if (path.includes('/learning-hub')) { activeTab = 'Learning Hub'; shortTitle = 'Learning Hub'; }
  else if (path.includes('/mock-tests')) { activeTab = 'Mock Tests'; shortTitle = 'Mock Tests'; }
  else if (path.includes('/ai-mock-interviews')) { activeTab = 'AI Mock Interviews'; shortTitle = 'AI Mock Intvw'; }
  else if (path.includes('/profile')) { activeTab = 'Profile'; shortTitle = 'Profile'; }

  useDocumentTitle(shortTitle);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveGoals = async () => {
    try {
      await supabase.from('student_goals').update({
        goal_questions_per_day: goalForm.q,
        goal_coding_per_day: goalForm.c,
        goal_mock_per_week: goalForm.m
      }).eq('student_id', user.id);
      setUserGoals(prev => ({
        ...prev,
        goal_questions_per_day: goalForm.q,
        goal_coding_per_day: goalForm.c,
        goal_mock_per_week: goalForm.m
      }));
      setShowGoalsModal(false);
      setToastNotification({ title: 'Success', message: 'Goals updated successfully', priority: 'Low' });
    } catch (err) {
      console.error(err);
      alert('Failed to save goals.');
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Previous Year Questions', icon: FileText },
    { name: 'Learning Hub', icon: BookOpen },
    { name: 'Mock Tests', icon: CheckSquare },
    { name: 'AI Mock Interviews', icon: Bot },
    { name: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex text-white font-sans selection:bg-brand-primary/30">
      
      {/* TOAST POPUP */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-9999 bg-theme-card border border-theme-border rounded-xl shadow-2xl p-4 w-80 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${toastNotification.priority === 'High' ? 'bg-red-500' : 'bg-brand-primary'} animate-pulse`}></div>
            <div className="flex justify-between items-start mb-2 mt-1">
              <h4 className="font-bold text-theme-text flex items-center gap-2">
                {toastNotification.priority === 'High' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {toastNotification.title}
              </h4>
              <button onClick={() => setToastNotification(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-theme-text-muted line-clamp-2 mb-4">{toastNotification.message}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { 
                  setToastNotification(null); 
                  setShowNotifications(true);
                  markAsRead(toastNotification.id);
                }} 
                className="flex-1 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                View
              </button>
              <button 
                onClick={() => setToastNotification(null)} 
                className="flex-1 bg-theme-glass hover:bg-theme-border text-theme-text-muted hover:text-white py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />

      {/* GOALS MODAL */}
      <AnimatePresence>
        {showGoalsModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setShowGoalsModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-8 w-full max-w-md shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-6">Edit Study Goals</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Questions per day</label>
                  <input type="number" value={goalForm.q} onChange={e => setGoalForm({...goalForm, q: parseInt(e.target.value)||0})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Coding problems per day</label>
                  <input type="number" value={goalForm.c} onChange={e => setGoalForm({...goalForm, c: parseInt(e.target.value)||0})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Mock tests per week</label>
                  <input type="number" value={goalForm.m} onChange={e => setGoalForm({...goalForm, m: parseInt(e.target.value)||0})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowGoalsModal(false)} className="flex-1 py-3 bg-theme-glass hover:bg-theme-border text-theme-text rounded-xl font-bold transition-colors">Cancel</button>
                <button onClick={handleSaveGoals} className="flex-1 py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-primary/20">Save Goals</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-theme-card/80 backdrop-blur-xl border-r border-theme-border z-50 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 mt-8 mb-10 px-6">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-brand-primary to-brand-secondary flex items-center justify-center font-bold text-xl">
            R
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-theme-text">RISE<span className="text-brand-primary">.</span></h1>
            <p className="text-[10px] text-theme-text-muted uppercase tracking-widest font-semibold">Career Mastery</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  let targetPath = '/dashboard';
                  if (item.name === 'Previous Year Questions') targetPath = '/dashboard/previous-year-questions';
                  if (item.name === 'Learning Hub') targetPath = '/dashboard/learning-hub';
                  if (item.name === 'Mock Tests') targetPath = '/dashboard/mock-tests';
                  if (item.name === 'AI Mock Interviews') targetPath = '/dashboard/ai-mock-interviews';
                  if (item.name === 'Profile') targetPath = '/dashboard/profile';
                  navigate(targetPath);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary' 
                    : 'text-theme-text-muted hover:bg-theme-glass hover:text-white border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 pb-6 px-4 border-t border-theme-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-12">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 h-20 bg-brand-bg/80 backdrop-blur-xl border-b border-theme-border flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-theme-text hidden md:block">{activeTab}</h2>
          
          <div className="flex-1 max-w-xl md:ml-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, companies, or practice questions..." 
              className="w-full bg-[#15203b] border border-theme-border rounded-full py-2.5 pl-11 pr-4 text-sm text-theme-text placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 ml-8 relative">
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="relative p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-glass rounded-full transition-colors"
              title="Submit Feedback"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-glass rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-brand-bg"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full mt-4 right-0 w-80 max-h-[70vh] overflow-y-auto bg-theme-card/95 backdrop-blur-xl border border-theme-border rounded-2xl shadow-2xl z-50">
                <div className="p-4 border-b border-theme-border flex justify-between items-center sticky top-0 bg-theme-card/90">
                  <h3 className="font-bold text-theme-text">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-brand-primary hover:text-brand-secondary font-bold">Mark all read</button>
                  )}
                </div>
                <div className="flex flex-col">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 border-b border-theme-border hover:bg-theme-glass cursor-pointer transition-colors ${!n.is_read ? 'bg-brand-primary/5' : ''}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className={`text-sm ${!n.is_read ? 'font-bold text-theme-text' : 'font-medium text-gray-300'}`}>{n.title}</h4>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0"></span>}
                        </div>
                        <p className="text-xs text-theme-text-muted leading-relaxed mt-1">{n.message}</p>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleDateString()}</div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            n.priority === 'High' ? 'bg-red-500/10 text-red-400' : 
                            n.priority === 'Medium' ? 'bg-brand-secondary/10 text-brand-secondary' : 
                            'bg-brand-cyan/10 text-brand-cyan'
                          }`}>
                            {n.priority} Priority
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 pl-4 border-l border-theme-border">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-theme-text">{user?.email?.split('@')[0] || 'Student'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-brand-primary to-brand-secondary p-[2px] shrink-0">
                <div className="w-full h-full bg-brand-bg rounded-full flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5 text-brand-primary" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {activeTab === 'Dashboard' ? (
            statsLoading ? (
              <div className="flex flex-col items-center justify-center py-32 w-full">
                <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
                <p className="text-theme-text-muted font-medium">Loading your dashboard...</p>
              </div>
            ) : (
            <>
              {/* WELCOME SECTION */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative glass-card p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between overflow-hidden border border-theme-border bg-theme-card/50"
              >
                {/* Background Glows */}
                <div className="absolute -right-32 -top-32 w-96 h-96 bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-brand-secondary/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left mb-8 md:mb-0">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <h1 className="text-4xl font-bold text-theme-text tracking-tight">
                      Welcome back, {user?.email?.split('@')[0] || 'Student'}! 👋
                    </h1>
                    {userGoals.current_streak > 0 && (
                      <span className="bg-orange-500/20 border border-orange-500/50 text-orange-400 font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                        🔥 Current Streak: {userGoals.current_streak} Day{userGoals.current_streak !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-theme-text-muted">
                    Track your progress and continue your placement preparation journey.
                  </p>
                  <div className="pt-4">
                    <button 
                      onClick={() => navigate('/dashboard/learning-hub')}
                      className="bg-brand-primary hover:bg-brand-secondary text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
                    >
                      Resume Preparation
                    </button>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center shrink-0">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 transform">
                      <circle cx="80" cy="80" r="70" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                      <circle 
                        cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" 
                        strokeDasharray="439.8" strokeDashoffset={`${439.8 - (439.8 * userGoals.placement_readiness) / 100}`}
                        className="text-brand-primary drop-shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-1000" 
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-theme-text">{userGoals.placement_readiness}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-brand-primary uppercase tracking-wider font-bold mt-4 text-center">Placement<br/>Readiness</p>
                </div>
              </motion.section>

              {/* QUICK OVERVIEW */}
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 gap-6"
              >
                {[
                  { label: 'Learning Progress', value: `${(dashboardStats.learning * 0.5).toFixed(1)} hrs`, icon: BookOpen, trend: '0%', up: true, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
                ].map((stat, i) => (
                  <div key={i} className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border hover:border-theme-border group cursor-pointer flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <span className={`flex items-center text-xs font-bold ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                          {stat.up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {stat.trend}
                        </span>
                      </div>
                      <p className="text-sm text-theme-text-muted uppercase tracking-wider font-semibold mb-1">{stat.label}</p>
                      <div className="flex items-end gap-3">
                        <p className="text-3xl font-bold text-theme-text group-hover:text-brand-primary transition-colors">{stat.value}</p>
                        {stat.subtext && <p className="text-xs font-medium text-gray-500 mb-1">{stat.subtext}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.section>

              {/* THREE COLUMN LAYOUT: GOALS, SUMMARY, ACTIVITY */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* STUDY GOALS */}
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border flex flex-col h-[420px]"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-brand-primary" /> Study Goals
                    </h3>
                    <button onClick={() => setShowGoalsModal(true)} className="text-xs font-bold text-brand-primary hover:text-white transition-colors bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg">
                      Edit Goals
                    </button>
                  </div>
                  
                  <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {/* Goal 1 */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-theme-text">Questions Per Day</span>
                        <span className="text-xs text-theme-text-muted font-mono">{dailyProgress.questions} / {userGoals.goal_questions_per_day} completed</span>
                      </div>
                      <div className="w-full h-3 bg-theme-bg rounded-full overflow-hidden border border-theme-border relative">
                        <motion.div 
                          className="h-full bg-linear-to-r from-blue-500 to-brand-cyan relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (dailyProgress.questions / (userGoals.goal_questions_per_day || 1)) * 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                        </motion.div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-[10px] font-bold text-brand-cyan">{Math.round(Math.min(100, (dailyProgress.questions / (userGoals.goal_questions_per_day || 1)) * 100))}%</span>
                      </div>
                    </div>

                    {/* Goal 2 */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-theme-text">Coding Problems</span>
                        <span className="text-xs text-theme-text-muted font-mono">{dailyProgress.coding} / {userGoals.goal_coding_per_day} completed</span>
                      </div>
                      <div className="w-full h-3 bg-theme-bg rounded-full overflow-hidden border border-theme-border relative">
                        <motion.div 
                          className="h-full bg-linear-to-r from-purple-500 to-brand-secondary relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (dailyProgress.coding / (userGoals.goal_coding_per_day || 1)) * 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                        </motion.div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-[10px] font-bold text-brand-secondary">{Math.round(Math.min(100, (dailyProgress.coding / (userGoals.goal_coding_per_day || 1)) * 100))}%</span>
                      </div>
                    </div>

                    {/* Goal 3 */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-theme-text">Mock Tests This Week</span>
                        <span className="text-xs text-theme-text-muted font-mono">{weeklyProgress.mocks} / {userGoals.goal_mock_per_week} completed</span>
                      </div>
                      <div className="w-full h-3 bg-theme-bg rounded-full overflow-hidden border border-theme-border relative">
                        <motion.div 
                          className="h-full bg-linear-to-r from-emerald-500 to-green-400 relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (weeklyProgress.mocks / (userGoals.goal_mock_per_week || 1)) * 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                        </motion.div>
                      </div>
                      <div className="text-right mt-1">
                        <span className="text-[10px] font-bold text-emerald-400">{Math.round(Math.min(100, (weeklyProgress.mocks / (userGoals.goal_mock_per_week || 1)) * 100))}%</span>
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* WEEKLY SUMMARY */}
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border h-[420px]"
                >
                  <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-brand-secondary" /> Weekly Summary
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-theme-glass border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center text-center">
                      <span className="text-xs text-theme-text-muted uppercase font-bold tracking-wider mb-2">Questions Solved</span>
                      <span className="text-3xl font-black text-white">{weeklySummary.questions}</span>
                    </div>
                    <div className="bg-theme-glass border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center text-center">
                      <span className="text-xs text-theme-text-muted uppercase font-bold tracking-wider mb-2">Coding Solved</span>
                      <span className="text-3xl font-black text-white">{weeklySummary.coding}</span>
                    </div>
                    <div className="bg-theme-glass border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center text-center">
                      <span className="text-xs text-theme-text-muted uppercase font-bold tracking-wider mb-2">Mocks Attempted</span>
                      <span className="text-3xl font-black text-white">{weeklySummary.mocks}</span>
                    </div>
                    <div className="bg-theme-glass border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center text-center">
                      <span className="text-xs text-theme-text-muted uppercase font-bold tracking-wider mb-2">Study Time</span>
                      <span className="text-2xl font-black text-emerald-400">{weeklySummary.time} <span className="text-sm text-gray-400">hrs</span></span>
                    </div>
                  </div>
                  <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-orange-400 uppercase tracking-wider">Current Streak</span>
                    <span className="text-xl font-black text-orange-400 flex items-center gap-1"><TrendingUp className="w-5 h-5"/> {userGoals.current_streak} Days</span>
                  </div>
                </motion.section>

                {/* RECENT ACTIVITY */}
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border h-[420px] overflow-y-auto custom-scrollbar"
                >
                  <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider mb-4">Recent Activity</h3>
                  {recentActivity.length > 0 ? (
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                      {recentActivity.map((activity, i) => (
                        <div key={i} className="relative pl-6">
                          <div className={`absolute left-[-13px] top-1.5 w-3.5 h-3.5 rounded-full border-[3px] border-brand-bg ${activity.color}`}></div>
                          <p className="text-sm font-bold text-theme-text">{activity.title}</p>
                          <p className="text-xs text-theme-text-muted mt-0.5">{activity.desc}</p>
                          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase">{activity.time}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm h-40 flex flex-col items-center justify-center">
                      <p>Start your preparation to see activity here!</p>
                    </div>
                  )}
                </motion.section>

              </div>
            </>
            )
          ) : activeTab === 'Previous Year Questions' ? (
            <PreviousYearQuestionsStudent searchQuery={searchQuery} />
          ) : activeTab === 'Learning Hub' ? (
            <LearningHubStudent searchQuery={searchQuery} />
          ) : activeTab === 'Mock Tests' ? (
            <MockTestsStudent searchQuery={searchQuery} />
          ) : activeTab === 'AI Mock Interviews' ? (
            <AiInterviewsStudent />
          ) : activeTab === 'Profile' ? (
            <ProfileStudent />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="glass-card p-12 rounded-3xl bg-theme-card/40 border border-theme-border flex flex-col items-center justify-center text-center mt-12 shadow-2xl"
            >
              <div className="w-24 h-24 rounded-full bg-brand-primary/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
                <LayoutDashboard className="w-10 h-10 text-brand-primary" />
              </div>
              <h2 className="text-3xl font-bold text-theme-text mb-4">{activeTab} Module</h2>
              <p className="text-theme-text-muted max-w-lg mb-8 text-lg">
                This enterprise module is currently under active development. You will be able to access premium {activeTab.toLowerCase()} content here very soon.
              </p>
              <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-theme-glass hover:bg-theme-border border border-theme-border rounded-xl text-theme-text font-semibold transition-colors">
                Return to Dashboard
              </button>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
