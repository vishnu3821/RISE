import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PreviousYearQuestionsAdmin from '../components/admin/PreviousYearQuestionsAdmin';
import LearningHubAdmin from '../components/admin/LearningHubAdmin';
import MockTestsAdmin from '../components/admin/MockTestsAdmin';
import AiInterviewsAdmin from '../components/admin/AiInterviewsAdmin';
import FeedbackAdmin from '../components/admin/FeedbackAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Users, Shield, User, LogOut, 
  Search, Bell, Settings, TrendingUp, TrendingDown,
  Ban, Trash2, Eye, UserPlus, CheckCircle2, ShieldAlert,
  GraduationCap, FileText, BookOpen, ClipboardList, Mic, Sun, Moon, Send, MessageSquare
} from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Secondary client that doesn't save session, used ONLY for admin creating users
const supabaseSignup = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default function Admin() {
  const { user, logout } = useAuth();
  const { isLightMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from URL path
  const path = location.pathname;
  let activeTab = 'Dashboard';
  let shortTitle = 'Dashboard';

  if (path.includes('/student-management')) { activeTab = 'Student Management'; shortTitle = 'Students'; }
  else if (path.includes('/admin-management')) { activeTab = 'Admin Management'; shortTitle = 'Admins'; }
  else if (path.includes('/previous-year-questions')) { activeTab = 'Previous Year Questions'; shortTitle = 'PYQ'; }
  else if (path.includes('/learning-hub')) { activeTab = 'Learning Hub'; shortTitle = 'Learning Hub'; }
  else if (path.includes('/mock-tests')) { activeTab = 'Mock Tests'; shortTitle = 'Mock Tests'; }
  else if (path.includes('/ai-interviews')) { activeTab = 'AI Mock Interviews'; shortTitle = 'AI Mock Intvw'; }
  else if (path.includes('/communications')) { activeTab = 'Communications'; shortTitle = 'Communications'; }
  else if (path.includes('/feedback-management')) { activeTab = 'Feedback Management'; shortTitle = 'Student Feedback'; }
  else if (path.includes('/profile')) { activeTab = 'Profile'; shortTitle = 'Profile'; }

  useDocumentTitle(shortTitle, true); // true for isAdmin

  // Modal States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [banUser, setBanUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  // Data States
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Communications States
  const [commTab, setCommTab] = useState('notifications'); // 'notifications' | 'emails'
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgPriority, setMsgPriority] = useState('Medium');
  // Default to the Resend verified email for testing
  const [targetEmail, setTargetEmail] = useState('p.vishnuprabhakar@gmail.com');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgHistory, setMsgHistory] = useState([]);

  const handleAddUser = async (role) => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Create user in auth using secondary client so Admin doesn't get logged out
      const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (authError) throw authError;

      // Update the profile role and name (since default role is 'student', we must update it for admin)
      if (authData?.user) {
        await supabase
          .from('profiles')
          .update({ role: role })
          .eq('id', authData.user.id);
      }

      // Add to local UI state
      const dateObj = new Date();
      const mockUser = {
        id: authData?.user?.id || crypto.randomUUID(),
        name: newUserName,
        email: newUserEmail,
        role: role,
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'Active'
      };

      if (role === 'student') {
        setStudents([mockUser, ...students]);
        setIsAddStudentOpen(false);
      } else {
        setAdmins([mockUser, ...admins]);
        setIsAddAdminOpen(false);
      }

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      alert(`${role.charAt(0).toUpperCase() + role.slice(1)} added successfully to the database!`);
    } catch (err) {
      console.error(err);
      alert("Failed to add user: " + err.message);
    }
  };

  const handleSendNotification = async () => {
    if (!msgTitle || !msgContent) return alert('Please enter title and message');
    setIsSendingMsg(true);
    try {
      const { data, error } = await supabase.from('admin_messages').insert({
        title: msgTitle,
        message: msgContent,
        priority: msgPriority,
        created_by: user.id
      }).select();
      if (error) throw error;
      
      setMsgTitle('');
      setMsgContent('');
      setMsgPriority('Medium');
      alert('In-App Notification sent successfully to all students!');
      if (data) setMsgHistory([data[0], ...msgHistory].slice(0, 10));
    } catch (err) {
      console.error(err);
      alert('Error sending notification: ' + err.message);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleSendEmail = async () => {
    if (!msgTitle || !msgContent) return alert('Please enter subject and message');
    setIsSendingMsg(true);
    try {
      // NOTE: Since you are using the testing domain (onboarding@resend.dev), 
      // we are sending this to the verified targetEmail address.
      // In production with a verified domain, you would query all user emails and loop through them.
      await supabase.rpc('send_email', {
        target_email: targetEmail,
        email_subject: `New Announcement: ${msgTitle}`,
        email_html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #4f46e5;">RISE Platform Announcement</h2>
          <p><strong>${msgTitle}</strong></p>
          <p style="white-space: pre-wrap;">${msgContent}</p>
        </div>`
      });
      setMsgTitle('');
      setMsgContent('');
      alert('Email sent successfully!');
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
      alert('Failed to send email. Please make sure you ran the setup_email_rpc.sql script in your Supabase SQL Editor!');
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await supabase.from('admin_messages').delete().eq('id', id);
      setMsgHistory(msgHistory.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedData = data.map(profile => {
            const dateObj = new Date(profile.created_at);
            return {
              id: profile.id,
              name: profile.email.split('@')[0],
              email: profile.email,
              role: profile.role,
              date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              status: 'Active' // Placeholder until banning logic is implemented
            };
          });

          setStudents(formattedData.filter(u => u.role === 'student'));
          setAdmins(formattedData.filter(u => u.role === 'admin'));
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoadingData(false);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data } = await supabase.from('admin_messages').select('*').order('created_at', { ascending: false }).limit(10);
        if (data) setMsgHistory(data);
      } catch (err) {}
    };

    fetchProfiles();
    fetchMessages();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Student Management', icon: Users },
    { name: 'Admin Management', icon: Shield },
    { name: 'Previous Year Questions', icon: FileText },
    { name: 'Learning Hub', icon: BookOpen },
    { name: 'Mock Tests', icon: ClipboardList },
    { name: 'AI Mock Interviews', icon: Mic },
    { name: 'Communications', icon: Send },
    { name: 'Feedback Management', icon: MessageSquare },
  ];

  const renderDashboard = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">System Overview</h2>
        <p className="text-theme-text-muted">Manage students and administrators across the RISE platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Students', value: students.length.toString(), trend: '0%', icon: GraduationCap, color: 'text-brand-primary', bg: 'bg-brand-primary/20', fill: 'bg-brand-primary', width: students.length > 0 ? '100%' : '0%' },
          { title: 'Total Admins', value: admins.length.toString(), trend: '0%', icon: Shield, color: 'text-brand-secondary', bg: 'bg-brand-secondary/20', fill: 'bg-brand-secondary', width: admins.length > 0 ? '100%' : '0%' },
          { title: 'Active Students', value: students.length.toString(), trend: '0%', icon: CheckCircle2, color: 'text-brand-cyan', bg: 'bg-brand-cyan/20', fill: 'bg-brand-cyan', width: students.length > 0 ? '100%' : '0%' },
          { title: 'Banned Users', value: '0', trend: '0%', icon: Ban, color: 'text-red-400', bg: 'bg-red-400/20', fill: 'bg-red-400', width: '0%' },
        ].map((metric, i) => (
          <div key={i} className="glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border hover:border-white/20 transition-all group overflow-hidden relative">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${metric.bg} blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl ${metric.bg} flex items-center justify-center`}>
                <metric.icon className={`w-7 h-7 ${metric.color}`} />
              </div>
              <span className={`flex items-center text-xs font-bold ${metric.trend.includes('-') ? 'text-red-400' : metric.trend === 'Stable' ? 'text-theme-text-muted' : 'text-emerald-400'}`}>
                {metric.trend !== 'Stable' && (metric.trend.includes('-') ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />)}
                {metric.trend}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-theme-text-muted mb-1">{metric.title}</p>
              <h3 className="text-4xl font-bold text-theme-text mb-4">{metric.value}</h3>
              <div className="w-full h-1.5 bg-theme-glass rounded-full overflow-hidden">
                <div className={`h-full ${metric.fill}`} style={{ width: metric.width }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>


    </motion.div>
  );

  const renderCommunications = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">Communications Center</h2>
        <p className="text-theme-text-muted">Manage announcements and broadcast emails to students.</p>
      </div>

      {/* SUB-NAVIGATION FOR COMMUNICATIONS */}
      <div className="flex gap-4 border-b border-theme-border pb-4 mb-4">
        <button 
          onClick={() => setCommTab('notifications')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${commTab === 'notifications' ? 'bg-brand-primary text-white' : 'text-theme-text-muted hover:bg-theme-glass hover:text-white'}`}
        >
          In-App Notifications
        </button>
        <button 
          onClick={() => setCommTab('emails')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${commTab === 'emails' ? 'bg-brand-secondary text-white' : 'text-theme-text-muted hover:bg-theme-glass hover:text-white'}`}
        >
          Email Broadcasts
        </button>
      </div>

      {/* NOTIFICATION SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SEND MESSAGE CARD */}
        <div className="lg:col-span-1 glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2.5 rounded-xl ${commTab === 'notifications' ? 'bg-brand-primary/20 text-brand-primary' : 'bg-brand-secondary/20 text-brand-secondary'}`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-text">
                {commTab === 'notifications' ? 'New Dashboard Notification' : 'New Email Broadcast'}
              </h3>
              <p className="text-xs text-theme-text-muted">
                {commTab === 'notifications' ? 'Appears in student dashboard.' : 'Sends direct email to registered users.'}
              </p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {commTab === 'emails' && (
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Test Email Target</label>
                <input 
                  type="email" 
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                  placeholder="Must be your Resend verified email!"
                  className="w-full bg-brand-bg/50 border border-theme-border rounded-xl py-2.5 px-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all mb-2"
                />
                <p className="text-[10px] text-theme-text-muted">Currently using Resend Sandbox. You can only email the verified test address.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">{commTab === 'emails' ? 'Subject Line' : 'Title'}</label>
              <input 
                type="text" 
                value={msgTitle}
                onChange={e => setMsgTitle(e.target.value)}
                placeholder="New Update Available"
                className="w-full bg-brand-bg/50 border border-theme-border rounded-xl py-2.5 px-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Message Content</label>
              <textarea 
                value={msgContent}
                onChange={e => setMsgContent(e.target.value)}
                placeholder="Please check the learning hub..."
                rows="4"
                className="w-full bg-brand-bg/50 border border-theme-border rounded-xl py-2.5 px-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all resize-none"
              ></textarea>
            </div>
            {commTab === 'notifications' && (
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Priority</label>
                <select 
                  value={msgPriority}
                  onChange={e => setMsgPriority(e.target.value)}
                  className="w-full bg-brand-bg/50 border border-theme-border rounded-xl py-2.5 px-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all appearance-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-theme-border">
            <button 
              onClick={() => { setMsgTitle(''); setMsgContent(''); setMsgPriority('Medium'); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-theme-text-muted hover:bg-theme-glass hover:text-white transition-colors"
            >
              Clear
            </button>
            <button 
              onClick={commTab === 'notifications' ? handleSendNotification : handleSendEmail}
              disabled={isSendingMsg}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${commTab === 'notifications' ? 'bg-brand-primary hover:bg-brand-secondary' : 'bg-brand-secondary hover:bg-purple-500'}`}
            >
              {isSendingMsg ? 'Sending...' : (commTab === 'notifications' ? 'Send Notification' : 'Send Email')}
            </button>
          </div>
        </div>

        {/* MESSAGE HISTORY */}
        <div className="lg:col-span-2 glass-card rounded-3xl bg-theme-card/40 border border-theme-border flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-theme-border flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-secondary/20 text-brand-secondary">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-text">Recent Announcements</h3>
              <p className="text-xs text-theme-text-muted">Last 10 messages sent to students.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/30">
                  <th className="px-6 py-3 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-xs font-bold text-theme-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {msgHistory.length > 0 ? msgHistory.map(msg => (
                  <tr key={msg.id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-theme-text">{msg.title}</p>
                      <p className="text-xs text-theme-text-muted truncate max-w-[200px]">{msg.message}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {new Date(msg.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        msg.priority === 'High' ? 'bg-red-500/20 text-red-400' : 
                        msg.priority === 'Medium' ? 'bg-brand-secondary/20 text-brand-secondary' : 
                        'bg-brand-cyan/20 text-brand-cyan'
                      }`}>
                        {msg.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-md text-theme-text-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 text-sm">
                      No messages sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStudentManagement = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">Student Management</h2>
          <p className="text-theme-text-muted">Manage student accounts and platform access.</p>
        </div>
        <button onClick={() => setIsAddStudentOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
          <UserPlus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Students', value: students.length.toString(), icon: Users, color: 'text-brand-primary' },
          { title: 'Active Now', value: students.length.toString(), icon: CheckCircle2, color: 'text-brand-cyan' },
          { title: 'Banned', value: '0', icon: Ban, color: 'text-red-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-theme-text">{stat.value}</h3>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
        <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-brand-primary/20 text-brand-primary rounded-lg text-sm font-bold">All Students</button>
            <button className="px-4 py-2 hover:bg-theme-glass text-theme-text-muted rounded-lg text-sm font-semibold transition-colors">Active</button>
            <button className="px-4 py-2 hover:bg-theme-glass text-theme-text-muted rounded-lg text-sm font-semibold transition-colors">Banned</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input type="text" placeholder="Search students..." className="w-full bg-brand-bg border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-theme-border">
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Registration Date</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-brand-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs uppercase">
                          {student.name.substring(0,2)}
                        </div>
                        <span className="text-sm font-bold text-theme-text">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-theme-text-muted">{student.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{student.date}</td>
                    <td className="px-6 py-4 text-sm font-mono text-theme-text-muted">{student.time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${student.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 hover:bg-theme-border rounded-md text-theme-text-muted transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setBanUser(student)} className={`p-1.5 rounded-md transition-colors ${student.status === 'Active' ? 'hover:bg-red-500/10 hover:text-red-400 text-white-muted' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`} title={student.status === 'Active' ? 'Ban User' : 'Unban User'}>
                          <Ban className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteUser(student)} className="p-1.5 hover:bg-theme-border rounded-md text-theme-text-muted hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                    No students found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-theme-border flex justify-between items-center bg-brand-bg/30">
          <p className="text-xs text-theme-text-muted">Showing <span className="text-theme-text font-bold">{students.length > 0 ? 1 : 0}-{students.length}</span> of <span className="text-theme-text font-bold">{students.length}</span> students</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-theme-card border border-theme-border rounded text-xs text-theme-text-muted hover:bg-theme-border transition-colors opacity-50 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-theme-card border border-theme-border rounded text-xs text-theme-text-muted hover:bg-theme-border transition-colors opacity-50 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderAdminManagement = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">Admin Management</h2>
          <p className="text-theme-text-muted">Manage administrator accounts and permissions.</p>
        </div>
        <button onClick={() => setIsAddAdminOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-linear-to-br from-brand-primary to-brand-secondary text-white font-bold rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all">
          <ShieldAlert className="w-5 h-5" />
          Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Admins', value: admins.length.toString(), icon: Shield, color: 'text-brand-secondary' },
          { title: 'Active Now', value: admins.length.toString(), icon: CheckCircle2, color: 'text-brand-cyan' },
          { title: 'Banned', value: '0', icon: Ban, color: 'text-red-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-theme-text">{stat.value}</h3>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
        <div className="p-4 border-b border-theme-border flex justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input type="text" placeholder="Search administrators..." className="w-full bg-brand-bg border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-theme-border">
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Admin Name</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Date Created</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-brand-secondary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary font-bold text-xs uppercase">
                          {admin.name.substring(0,2)}
                        </div>
                        <span className="text-sm font-bold text-theme-text">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-theme-text-muted">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{admin.date}</td>
                    <td className="px-6 py-4 text-sm font-mono text-theme-text-muted">{admin.time}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${admin.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 hover:bg-theme-border rounded-md text-theme-text-muted transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setBanUser(admin)} className={`p-1.5 rounded-md transition-colors ${admin.status === 'Active' ? 'hover:bg-red-500/10 hover:text-red-400 text-white-muted' : 'bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20'}`} title={admin.status === 'Active' ? 'Ban Admin' : 'Unban Admin'}>
                          <Ban className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteUser(admin)} className="p-1.5 hover:bg-theme-border rounded-md text-theme-text-muted hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                    No administrators found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-theme-border flex justify-between items-center bg-brand-bg/30">
          <p className="text-xs text-theme-text-muted">Showing <span className="text-theme-text font-bold">{admins.length > 0 ? 1 : 0}-{admins.length}</span> of <span className="text-theme-text font-bold">{admins.length}</span> administrators</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-theme-card border border-theme-border rounded text-xs text-theme-text-muted hover:bg-theme-border transition-colors opacity-50 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-theme-card border border-theme-border rounded text-xs text-theme-text-muted hover:bg-theme-border transition-colors opacity-50 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-brand-bg flex text-white font-sans selection:bg-brand-secondary/30">
      
      {/* MODALS */}
      <AnimatePresence>
        {(isAddStudentOpen || isAddAdminOpen) && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => { setIsAddStudentOpen(false); setIsAddAdminOpen(false); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-theme-text mb-4">{isAddStudentOpen ? 'Add New Student' : 'Add New Admin'}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Full Name</label>
                  <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-brand-primary transition-colors" placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Email Address</label>
                  <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-brand-primary transition-colors" placeholder="jane@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Password</label>
                  <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-brand-primary transition-colors" placeholder="••••••••" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setIsAddStudentOpen(false); setIsAddAdminOpen(false); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass transition-colors">Cancel</button>
                <button onClick={() => handleAddUser(isAddStudentOpen ? 'student' : 'admin')} className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors ${isAddStudentOpen ? 'bg-brand-primary hover:bg-brand-secondary' : 'bg-brand-secondary hover:bg-purple-500'}`}>
                  {isAddStudentOpen ? 'Create Student' : 'Create Admin'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {banUser && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setBanUser(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-theme-text mb-2">Ban User</h3>
              <p className="text-sm text-theme-text-muted mb-6">Are you sure you want to {banUser.status === 'Active' ? 'ban' : 'unban'} <span className="text-theme-text font-bold">{banUser.name}</span>?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setBanUser(null)} className="px-6 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass transition-colors">Cancel</button>
                <button onClick={() => setBanUser(null)} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteUser && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setDeleteUser(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-theme-text mb-2">Delete User</h3>
              <p className="text-sm text-theme-text-muted mb-6">This action cannot be undone. Are you sure you want to permanently delete <span className="text-theme-text font-bold">{deleteUser.name}</span>?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteUser(null)} className="px-6 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass transition-colors">Cancel</button>
                <button onClick={() => setDeleteUser(null)} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Delete User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-theme-card/80 backdrop-blur-xl border-r border-theme-border z-50 hidden lg:flex flex-col shadow-2xl">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-theme-text mb-1">RISE Admin</h1>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest font-bold">Enterprise Suite</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  let targetPath = '/admin';
                  if (item.name === 'Dashboard') targetPath = '/admin';
                  if (item.name === 'Student Management') targetPath = '/admin/student-management';
                  if (item.name === 'Admin Management') targetPath = '/admin/admin-management';
                  if (item.name === 'Previous Year Questions') targetPath = '/admin/previous-year-questions';
                  if (item.name === 'Learning Hub') targetPath = '/admin/learning-hub';
                  if (item.name === 'Mock Tests') targetPath = '/admin/mock-tests';
                  if (item.name === 'AI Mock Interviews') targetPath = '/admin/ai-interviews';
                  if (item.name === 'Communications') targetPath = '/admin/communications';
                  if (item.name === 'Feedback Management') targetPath = '/admin/feedback-management';
                  navigate(targetPath);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-primary/20 text-brand-primary font-bold border-l-2 border-brand-primary' 
                    : 'text-theme-text-muted hover:bg-theme-glass hover:text-white font-medium border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-primary' : ''}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-theme-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-theme-text-muted hover:bg-theme-glass hover:text-theme-text transition-colors mb-2">
            <User className="w-5 h-5" />
            Profile
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-xl border-b border-theme-border flex items-center justify-between px-8 py-4 shadow-sm">
          <div className="flex-1 max-w-xl relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input 
              type="text" 
              placeholder="Search systems or users..." 
              className="w-full bg-theme-card border border-theme-border rounded-full py-2 pl-10 pr-4 text-sm text-theme-text placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-4 ml-8">
            <button className="relative p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-glass rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border border-brand-bg"></span>
            </button>
            <button className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-glass rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={toggleTheme} className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-glass rounded-full transition-colors">
              {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="w-px h-8 bg-theme-border mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-theme-text">{user?.email?.split('@')[0] || 'Admin'}</p>
                <p className="text-[10px] text-theme-text-muted uppercase font-bold tracking-wider">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-brand-primary/30 overflow-hidden bg-theme-card flex items-center justify-center">
                 <User className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full">
          {activeTab === 'Dashboard' && renderDashboard()}
          {activeTab === 'Communications' && renderCommunications()}
          {activeTab === 'Student Management' && renderStudentManagement()}
          {activeTab === 'Admin Management' && renderAdminManagement()}
          {activeTab === 'Previous Year Questions' && <PreviousYearQuestionsAdmin />}
          {activeTab === 'Learning Hub' && <LearningHubAdmin />}
          {activeTab === 'Mock Tests' && <MockTestsAdmin />}
          {activeTab === 'AI Mock Interviews' && <AiInterviewsAdmin />}
          {activeTab === 'Feedback Management' && <FeedbackAdmin />}
        </div>
      </main>
    </div>
  );
}
