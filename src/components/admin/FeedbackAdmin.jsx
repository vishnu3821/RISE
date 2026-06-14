import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, CheckCircle2, Clock, Calendar, 
  Eye, Search, Filter, Loader2, X, Trash2, ShieldAlert, Star
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function FeedbackAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'exam' ? 'Exam' : 'General';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [feedback, setFeedback] = useState([]);
  const [examFeedback, setExamFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedExamFeedback, setSelectedExamFeedback] = useState(null);
  const [fullImage, setFullImage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchFeedback();
    fetchExamFeedback();

    const channel1 = supabase.channel('public:user_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_feedback' }, () => {
        fetchFeedback();
      })
      .subscribe();

    const channel2 = supabase.channel('public:exam_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_feedback' }, () => {
        fetchExamFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  const fetchExamFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExamFeedback(data || []);
    } catch (err) {
      console.error('Error fetching exam feedback:', err);
    }
  };

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFeedback(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ 
          status: newStatus,
          resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const { error } = await supabase.from('user_feedback').delete().eq('id', id);
      if (error) throw error;
      
      setFeedback(prev => prev.filter(f => f.id !== id));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(null);
      }
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback.');
    }
  };

  const handleUpdateExamStatus = async (id, newStatus) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('exam_feedback')
        .update({ 
          status: newStatus,
          resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      
      setExamFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      if (selectedExamFeedback?.id === id) {
        setSelectedExamFeedback({ ...selectedExamFeedback, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam feedback?')) return;
    
    try {
      const { error } = await supabase.from('exam_feedback').delete().eq('id', id);
      if (error) throw error;
      
      setExamFeedback(prev => prev.filter(f => f.id !== id));
      if (selectedExamFeedback?.id === id) {
        setSelectedExamFeedback(null);
      }
    } catch (err) {
      console.error('Error deleting exam feedback:', err);
      alert('Failed to delete exam feedback.');
    }
  };

  // Derived Stats
  const totalFeedback = feedback.length;
  const pendingCount = feedback.filter(f => f.status === 'Pending').length;
  const resolvedCount = feedback.filter(f => f.status === 'Resolved').length;
  const todaysCount = feedback.filter(f => {
    const today = new Date().toISOString().split('T')[0];
    const fbDate = new Date(f.created_at).toISOString().split('T')[0];
    return today === fbDate;
  }).length;

  // Filtered List for General
  const filteredFeedback = feedback.filter(f => {
    const matchesSearch = f.student_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Derived Stats for Exam Feedback
  const examTotal = examFeedback.length;
  const examTodaysCount = examFeedback.filter(f => {
    const today = new Date().toISOString().split('T')[0];
    const fbDate = new Date(f.created_at).toISOString().split('T')[0];
    return today === fbDate;
  }).length;
  const examAvgRating = examFeedback.length > 0 ? (examFeedback.reduce((acc, f) => acc + (f.average_rating || 0), 0) / examFeedback.length).toFixed(1) : 'N/A';
  
  // Lowest Rated Module
  let lowestRatedModule = 'N/A';
  if (examFeedback.length > 0) {
    const moduleScores = {};
    const moduleCounts = {};
    examFeedback.forEach(f => {
      if (f.module_ratings) {
        Object.entries(f.module_ratings).forEach(([mod, rating]) => {
          moduleScores[mod] = (moduleScores[mod] || 0) + rating;
          moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
        });
      }
    });
    let minScore = 6;
    Object.keys(moduleScores).forEach(mod => {
      const avg = moduleScores[mod] / moduleCounts[mod];
      if (avg < minScore) {
        minScore = avg;
        lowestRatedModule = mod;
      }
    });
  }

  // Filtered List for Exam
  const filteredExamFeedback = examFeedback.filter(f => {
    const matchesSearch = f.student_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.exam_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.custom_message?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    
    // Also parse star filters from statusFilter for exams
    if (statusFilter.includes('Star')) {
      const starLevel = parseInt(statusFilter.split(' ')[0]);
      if (f.average_rating >= starLevel && f.average_rating < starLevel + 1) return matchesSearch;
      return false;
    }

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 w-full">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-theme-text-muted font-medium">Loading feedback data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">Feedback Management</h2>
          <p className="text-theme-text-muted">Review, manage, and resolve student issues and suggestions.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-theme-border pb-4 mb-8 overflow-x-auto custom-scrollbar">
        {['General', 'Exam'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              // Update URL so linking works
              if (tab === 'Exam') {
                navigate('?tab=exam', { replace: true });
              } else {
                navigate('?', { replace: true });
              }
            }}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                : 'text-theme-text-muted hover:text-white hover:bg-theme-glass'
            }`}
          >
            {tab} Feedback
          </button>
        ))}
      </div>

      {activeTab === 'General' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Feedback", value: totalFeedback, icon: MessageSquare, color: "text-brand-primary" },
              { title: "Pending", value: pendingCount, icon: Clock, color: "text-yellow-400" },
              { title: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-400" },
              { title: "Today's Feedback", value: todaysCount, icon: Calendar, color: "text-brand-secondary" },
            ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">{stat.title}</p>
                <h3 className="text-3xl font-black text-theme-text">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email or message..." 
            className="w-full bg-theme-card border border-theme-border rounded-xl py-2.5 pl-11 pr-4 text-sm text-theme-text focus:outline-none focus:border-brand-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-theme-text-muted" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-theme-card border border-theme-border rounded-xl py-2.5 px-4 text-sm font-bold text-theme-text focus:outline-none focus:border-brand-primary"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                <th className="px-6 py-4">Student Email</th>
                <th className="px-6 py-4">Issue Message</th>
                <th className="px-6 py-4 text-center">Images</th>
                <th className="px-6 py-4">Submitted Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFeedback.length > 0 ? filteredFeedback.map(item => (
                <tr key={item.id} className="hover:bg-theme-glass transition-colors group">
                  <td className="px-6 py-4 font-bold text-theme-text">
                    <a href={`mailto:${item.student_email}`} className="hover:text-brand-primary transition-colors">
                      {item.student_email}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-theme-text-muted max-w-[300px] truncate">
                    {item.message}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-sm text-brand-secondary font-bold">
                    {item.image_urls?.length || 0}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      item.status === 'In Progress' ? 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20' :
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => setSelectedFeedback(item)}
                      className="px-3 py-1.5 bg-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    {item.status !== 'Resolved' && (
                      <button 
                        onClick={() => handleUpdateStatus(item.id, 'Resolved')}
                        disabled={isUpdating}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Resolve
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-theme-text-muted">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    No feedback found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL (General) */}
      <AnimatePresence>
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedFeedback(null)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-theme-card border border-theme-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              
              <div className="flex justify-between items-center p-6 border-b border-theme-border bg-theme-card-alt/50">
                <h2 className="text-2xl font-bold text-theme-text">Feedback Details</h2>
                <button onClick={() => setSelectedFeedback(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-theme-text-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-bg border border-theme-border p-4 rounded-xl">
                    <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Student Email</p>
                    <p className="font-bold text-theme-text">{selectedFeedback.student_email}</p>
                  </div>
                  <div className="bg-brand-bg border border-theme-border p-4 rounded-xl">
                    <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Submitted On</p>
                    <p className="font-mono text-sm text-theme-text">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-brand-bg border border-theme-border p-5 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Issue Message</p>
                    <select 
                      value={selectedFeedback.status}
                      onChange={(e) => handleUpdateStatus(selectedFeedback.id, e.target.value)}
                      disabled={isUpdating}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none ${
                        selectedFeedback.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                        selectedFeedback.status === 'In Progress' ? 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/30' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <p className="text-theme-text whitespace-pre-wrap text-sm leading-relaxed">{selectedFeedback.message}</p>
                </div>

                {selectedFeedback.image_urls?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3">Attached Screenshots ({selectedFeedback.image_urls.length})</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {selectedFeedback.image_urls.map((url, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-theme-border bg-theme-glass cursor-pointer hover:border-brand-primary transition-all group" onClick={() => setFullImage(url)}>
                          <img src={url} alt={`Screenshot ${idx+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-theme-border bg-theme-card-alt/50 flex justify-between items-center">
                <button 
                  onClick={() => handleDelete(selectedFeedback.id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Ticket
                </button>
                <button onClick={() => setSelectedFeedback(null)} className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors">
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </motion.div>
      ) : (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Responses", value: examTotal, icon: MessageSquare, color: "text-brand-primary" },
            { title: "Today's Responses", value: examTodaysCount, icon: Calendar, color: "text-brand-secondary" },
            { title: "Average Rating", value: `${examAvgRating}★`, icon: Star, color: "text-yellow-400" },
            { title: "Lowest Rated Module", value: lowestRatedModule, icon: ShieldAlert, color: "text-red-400" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1 truncate">{stat.title}</p>
                  <h3 className="text-3xl font-black text-theme-text truncate max-w-[120px]">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center shrink-0 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email, exam name, or message..." 
              className="w-full bg-theme-card border border-theme-border rounded-xl py-2.5 pl-11 pr-4 text-sm text-theme-text focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-theme-text-muted" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-theme-card border border-theme-border rounded-xl py-2.5 px-4 text-sm font-bold text-theme-text focus:outline-none focus:border-brand-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="5 Stars">5 Stars</option>
              <option value="4 Stars">4 Stars</option>
              <option value="3 Stars">3 Stars</option>
              <option value="2 Stars">2 Stars</option>
              <option value="1 Stars">1 Stars</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Student Email</th>
                  <th className="px-6 py-4">Exam Name</th>
                  <th className="px-6 py-4">Submitted Time</th>
                  <th className="px-6 py-4 text-center">Avg Rating</th>
                  <th className="px-6 py-4">Custom Message</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExamFeedback.length > 0 ? filteredExamFeedback.map(item => (
                  <tr key={item.id} className="hover:bg-theme-glass transition-colors group">
                    <td className="px-6 py-4 font-bold text-theme-text">
                      <a href={`mailto:${item.student_email}`} className="hover:text-brand-primary transition-colors">
                        {item.student_email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-brand-secondary">
                      {item.exam_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-md text-xs border border-yellow-500/20">
                        {item.average_rating || 0} <Star className="w-3 h-3 fill-yellow-400" />
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted max-w-[200px] truncate">
                      {item.custom_message || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedExamFeedback(item)}
                        className="px-3 py-1.5 bg-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button 
                        onClick={() => handleDeleteExam(item.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-theme-text-muted">
                      <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      No exam feedback found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXAM VIEW MODAL */}
        <AnimatePresence>
          {selectedExamFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedExamFeedback(null)} />
              
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-theme-card border border-theme-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-center p-6 border-b border-theme-border bg-theme-card-alt/50">
                  <h2 className="text-2xl font-bold text-theme-text">Exam Feedback Details</h2>
                  <button onClick={() => setSelectedExamFeedback(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-theme-text-muted hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-bg border border-theme-border p-4 rounded-xl">
                      <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Student Email</p>
                      <p className="font-bold text-theme-text">{selectedExamFeedback.student_email}</p>
                    </div>
                    <div className="bg-brand-bg border border-theme-border p-4 rounded-xl">
                      <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Exam Name</p>
                      <p className="font-bold text-brand-secondary">{selectedExamFeedback.exam_name}</p>
                    </div>
                    <div className="bg-brand-bg border border-theme-border p-4 rounded-xl col-span-2 sm:col-span-1">
                      <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Submitted On</p>
                      <p className="font-mono text-sm text-theme-text">{new Date(selectedExamFeedback.created_at).toLocaleString()}</p>
                    </div>
                    <div className="bg-brand-bg border border-theme-border p-4 rounded-xl col-span-2 sm:col-span-1 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Average</p>
                        <p className="font-bold text-yellow-400 flex items-center gap-1">{selectedExamFeedback.average_rating || 0} / 5</p>
                      </div>
                      <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3">Module Ratings</h4>
                    <div className="space-y-2">
                      {selectedExamFeedback.modules?.map(mod => (
                        <div key={mod} className="flex justify-between items-center bg-theme-card-alt p-4 rounded-xl border border-theme-border">
                          <span className="font-bold text-theme-text">{mod}</span>
                          <div className="flex gap-1 items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={`w-5 h-5 ${selectedExamFeedback.module_ratings?.[mod] >= star ? 'fill-yellow-400 text-yellow-400' : 'text-theme-text-muted opacity-50'}`} />
                            ))}
                            <span className="ml-3 text-sm font-bold text-theme-text-muted">{selectedExamFeedback.module_ratings?.[mod] || 0}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedExamFeedback.custom_message && (
                    <div className="bg-brand-bg border border-theme-border p-5 rounded-xl">
                      <p className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3">Student Comment</p>
                      <p className="text-theme-text whitespace-pre-wrap text-sm leading-relaxed">{selectedExamFeedback.custom_message}</p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-theme-border bg-theme-card-alt/50 flex justify-between items-center">
                  <button 
                    onClick={() => handleDeleteExam(selectedExamFeedback.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Feedback
                  </button>
                  <button onClick={() => setSelectedExamFeedback(null)} className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors">
                    Close Details
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
      )}

      {/* FULL IMAGE VIEWER */}
      <AnimatePresence>
        {fullImage && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              src={fullImage} 
              alt="Full view" 
              className="relative z-10 max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl" 
            />
            <button onClick={() => setFullImage(null)} className="absolute top-6 right-6 z-20 p-3 bg-theme-card/50 hover:bg-red-500 rounded-full text-white transition-colors backdrop-blur-xl">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
