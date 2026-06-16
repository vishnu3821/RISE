import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, Search, ChevronRight, ArrowLeft, 
  Bookmark, CheckCircle2, Layers, PlayCircle,
  HelpCircle, Check, X
} from 'lucide-react';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function LearningHubStudent({ searchQuery = '' }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation State: 'categories' -> 'topics' -> 'details'
  const [viewState, setViewState] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Pattern
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [selectedPatternTopic, setSelectedPatternTopic] = useState(null);

  // Local interaction state for questions
  // Stores { [questionId]: { selectedOption: 'A', isRevealed: true } }
  const [questionInteraction, setQuestionInteraction] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, topRes, progRes] = await Promise.all([
        supabase.from('learning_hub_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('learning_hub_topics').select('*'),
        supabase.from('learning_hub_progress').select('*').eq('student_id', user.id)
      ]);

      if (catRes.error) throw catRes.error;
      
      let allQuestions = [];
      let fetchMore = true;
      let from = 0;
      let limit = 1000;
      while (fetchMore) {
        const { data, error } = await supabase.from('learning_hub_questions').select('*').range(from, from + limit - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allQuestions = [...allQuestions, ...data];
          from += limit;
        }
        if (!data || data.length < limit) fetchMore = false;
      }

      setCategories(catRes.data || []);
      setTopics(topRes.data || []);
      setQuestions(allQuestions);
      setProgressData(progRes.data || []);

      // Restore session state
      const restoredInteractions = {};
      (progRes.data || []).forEach(p => {
        if (p.selected_option) {
          restoredInteractions[p.question_id] = {
            selectedOption: p.selected_option,
            isRevealed: true
          };
        }
      });
      setQuestionInteraction(restoredInteractions);

    } catch (err) {
      console.error('Error fetching LH data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length > 0 && topics.length > 0) {
      const pathParts = location.pathname.split('/');
      const categoryNameFromUrl = pathParts[3] ? decodeURIComponent(pathParts[3]) : null;
      const topicNameFromUrl = pathParts[4] ? decodeURIComponent(pathParts[4]) : null;

      if (!categoryNameFromUrl) {
        setViewState('categories');
        setSelectedCategory(null);
        setSelectedTopic(null);
      } else {
        const cat = categories.find(c => c.name === categoryNameFromUrl || c.id === categoryNameFromUrl);
        if (cat) {
          if (!topicNameFromUrl) {
            setSelectedCategory(cat);
            setSelectedTopic(null);
            setViewState('topics');
          } else {
            const top = topics.find(t => t.name === topicNameFromUrl || t.id === topicNameFromUrl);
            if (top) {
              setSelectedCategory(cat);
              setSelectedTopic(top);
              setViewState('details');
            }
          }
        } else {
          // invalid category, reset to root
          navigate('/dashboard/learning-hub', { replace: true });
        }
      }
    }
  }, [location.pathname, categories, topics]);

  useDocumentTitle(
    viewState === 'details' && selectedTopic 
      ? selectedTopic.name 
      : viewState === 'topics' && selectedCategory 
        ? `${selectedCategory.name}`
        : 'Learning Hub'
  );

  const handleCategorySelect = (category) => {
    navigate(`/dashboard/learning-hub/${encodeURIComponent(category.name)}`);
  };

  const handleTopicSelect = (topic) => {
    const currentCategory = selectedCategory || categories.find(c => c.id === topic.category_id);
    if (currentCategory) {
      navigate(`/dashboard/learning-hub/${encodeURIComponent(currentCategory.name)}/${encodeURIComponent(topic.name)}`);
    }
  };

  const handleBack = () => {
    if (viewState === 'details') {
      navigate(`/dashboard/learning-hub/${encodeURIComponent(selectedCategory.name)}`);
    } else if (viewState === 'topics') {
      navigate('/dashboard/learning-hub');
    }
  };

  const toggleProgress = async (questionId, status) => {
    // Find the record for this question regardless of status
    const existing = progressData.find(p => p.question_id === questionId);
    
    if (existing && existing.status === status) {
      // Toggle off: set back to 'saved' to preserve any selected answers
      setProgressData(prev => prev.map(p => p.id === existing.id ? { ...p, status: 'saved' } : p));
      await supabase.from('learning_hub_progress').update({ status: 'saved' }).eq('id', existing.id);
    } else if (existing) {
      // Switch status (e.g. from saved to completed)
      setProgressData(prev => prev.map(p => p.id === existing.id ? { ...p, status } : p));
      await supabase.from('learning_hub_progress').update({ status }).eq('id', existing.id);
    } else {
      // Create new record
      const tempId = Date.now().toString();
      const newRecord = { id: tempId, student_id: user.id, question_id: questionId, status, selected_option: null, is_correct: null };
      setProgressData([...progressData, newRecord]);
      
      const { data, error } = await supabase.from('learning_hub_progress').insert([{ 
        student_id: user.id, question_id: questionId, status 
      }]).select();
      
      if (!error && data) {
        setProgressData(prev => prev.map(p => p.id === tempId ? data[0] : p));
      }
    }
  };

  const handleOptionSelect = async (questionId, option) => {
    // If already revealed, prevent changing answer
    if (questionInteraction[questionId]?.isRevealed) return;
    
    // Optimistic UI update
    setQuestionInteraction(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOption: option }
    }));

    // Save to database instantly
    const existing = progressData.find(p => p.question_id === questionId);
    const tempId = existing ? existing.id : Date.now().toString();
    
    const newRecord = { 
      id: tempId, 
      student_id: user.id, 
      question_id: questionId, 
      status: existing ? existing.status : 'saved', // Preserve completed if it was completed
      selected_option: option,
      is_correct: null
    };

    if (existing) {
      setProgressData(prev => prev.map(p => p.id === tempId ? newRecord : p));
      await supabase.from('learning_hub_progress').update({ 
        selected_option: option
      }).eq('id', existing.id);
    } else {
      setProgressData([...progressData, newRecord]);
      const { data, error } = await supabase.from('learning_hub_progress').insert([{ 
        student_id: user.id, 
        question_id: questionId, 
        status: 'saved',
        selected_option: option
      }]).select();
      
      if (!error && data) {
        setProgressData(prev => prev.map(p => p.id === tempId ? data[0] : p));
      }
    }
  };

  const handleRevealAnswer = async (questionId) => {
    const interaction = questionInteraction[questionId];
    if (!interaction || !interaction.selectedOption) return;

    // Immediately update local UI
    setQuestionInteraction(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], isRevealed: true }
    }));

    // Save to Database
    const question = questions.find(q => q.id === questionId);
    const isCorrect = interaction.selectedOption === question?.correct_answer;

    const existing = progressData.find(p => p.question_id === questionId);
    const tempId = existing ? existing.id : Date.now().toString();
    const newRecord = { 
      id: tempId, 
      student_id: user.id, 
      question_id: questionId, 
      status: 'completed',
      selected_option: interaction.selectedOption,
      is_correct: isCorrect
    };

    if (existing) {
      setProgressData(prev => prev.map(p => p.id === tempId ? newRecord : p));
      await supabase.from('learning_hub_progress').update({ 
        status: 'completed',
        selected_option: interaction.selectedOption,
        is_correct: isCorrect
      }).eq('id', existing.id);
    } else {
      setProgressData([...progressData, newRecord]);
      const { data, error } = await supabase.from('learning_hub_progress').insert([{ 
        student_id: user.id, 
        question_id: questionId, 
        status: 'completed',
        selected_option: interaction.selectedOption,
        is_correct: isCorrect
      }]).select();
      
      if (!error && data) {
        setProgressData(prev => prev.map(p => p.id === tempId ? data[0] : p));
      }
    }
  };

  const isSaved = (qId) => progressData.some(p => p.question_id === qId && p.status === 'saved');
  const isCompleted = (qId) => progressData.some(p => p.question_id === qId && p.status === 'completed');

  // Derived Data Helpers
  const getCategoryMetrics = (catId) => {
    const catTopics = topics.filter(t => t.category_id === catId);
    const catQuestions = questions.filter(q => catTopics.some(t => t.id === q.topic_id));
    const completedQs = catQuestions.filter(q => isCompleted(q.id)).length;
    const progressPercent = catQuestions.length > 0 ? Math.round((completedQs / catQuestions.length) * 100) : 0;
    return { topicCount: catTopics.length, questionCount: catQuestions.length, progressPercent };
  };

  const getTopicMetrics = (topicId) => {
    const topicQs = questions.filter(q => q.topic_id === topicId);
    const completedQs = topicQs.filter(q => isCompleted(q.id)).length;
    const progressPercent = topicQs.length > 0 ? Math.round((completedQs / topicQs.length) * 100) : 0;
    return { questionCount: topicQs.length, progressPercent };
  };

  // Filtered views
  const displayCategories = categories.filter(c => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const displayTopics = topics.filter(t => {
    if (t.category_id !== selectedCategory?.id) return false;
    if (!searchQuery) return true;
    return t.name.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => a.name.localeCompare(b.name));

  const displayQuestions = questions.filter(q => {
    if (q.topic_id !== selectedTopic?.id) return false;
    if (!searchQuery) return true;
    return q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* HEADER WITH BACK BUTTON */}
      <div className="flex items-center gap-4">
        {viewState !== 'categories' && (
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2 flex items-center gap-3">
            {viewState === 'categories' && <><BookOpen className="w-8 h-8 text-brand-primary" /> Learning Hub</>}
            {viewState === 'topics' && <><Layers className="w-8 h-8 text-brand-secondary" /> {selectedCategory?.name}</>}
            {viewState === 'details' && selectedTopic?.name}
          </h2>
          <p className="text-theme-text-muted">
            {viewState === 'categories' && "Master fundamental concepts with structured topics and practice questions."}
            {viewState === 'topics' && "Select a topic to start practicing."}
            {viewState === 'details' && selectedTopic?.description}
          </p>
        </div>
      </div>

      {/* VIEW 1: CATEGORIES */}
      {viewState === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayCategories.map((category, i) => {
            const metrics = getCategoryMetrics(category.id);
            return (
              <motion.div 
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleCategorySelect(category)}
                className="glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border hover:border-brand-primary/50 cursor-pointer group transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-all"></div>
                
                <h3 className="text-2xl font-bold text-theme-text mb-2">{category.name}</h3>
                
                <div className="flex gap-4 mb-6 text-sm">
                  <span className="text-theme-text-muted font-medium"><span className="text-theme-text font-bold">{metrics.topicCount}</span> Topics</span>
                  <span className="text-theme-text-muted font-medium"><span className="text-theme-text font-bold">{metrics.questionCount}</span> Questions</span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-theme-text-muted uppercase tracking-wider">Progress</span>
                    <span className="text-brand-primary">{metrics.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-theme-glass h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-brand-primary transition-all duration-1000"
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-theme-border">
                  <span className="text-sm font-bold text-brand-primary group-hover:text-brand-secondary transition-colors">Start Learning</span>
                  <div className="w-8 h-8 rounded-full bg-theme-glass flex items-center justify-center group-hover:bg-brand-primary group-hover:text-theme-text text-white-muted transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
          {displayCategories.length === 0 && !loading && (
            <div className="col-span-full p-12 text-center border border-dashed border-white/20 rounded-3xl">
              <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-theme-text">No Categories Found</h3>
              <p className="text-theme-text-muted">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TOPICS */}
      {viewState === 'topics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayTopics.map((topic, i) => {
            const metrics = getTopicMetrics(topic.id);
            return (
              <motion.div 
                key={topic.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card bg-theme-card/40 border border-theme-border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 justify-between hover:bg-theme-glass transition-all"
              >
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-theme-text">{topic.name}</h3>
                  <p className="text-sm text-theme-text-muted line-clamp-2">{topic.description || "No description provided."}</p>
                  
                  <div className="pt-2 flex items-center gap-4 text-xs font-bold">
                    <span className="text-gray-500 uppercase tracking-wider">{metrics.questionCount} Questions</span>
                    <span className="text-brand-secondary">{metrics.progressPercent}% Completed</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-4 sm:mt-0">
                  {topic.pattern_text && (
                    <button 
                      onClick={() => { setSelectedPatternTopic(topic); setIsPatternModalOpen(true); }}
                      className="px-4 py-2.5 bg-theme-glass border border-theme-border text-brand-cyan hover:bg-theme-border font-bold rounded-xl transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Layers className="w-4 h-4" /> Pattern
                    </button>
                  )}
                  <button 
                    onClick={() => handleTopicSelect(topic)}
                    className="px-6 py-2.5 bg-brand-bg border border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary hover:text-white font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" /> Practice
                  </button>
                </div>
              </motion.div>
            );
          })}
          {displayTopics.length === 0 && !loading && (
            <div className="col-span-full p-12 text-center border border-dashed border-white/20 rounded-3xl">
              <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-theme-text">No Topics Available</h3>
              <p className="text-theme-text-muted">This category is currently empty.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: QUESTION DETAILS */}
      {viewState === 'details' && (
        <div className="space-y-8">
          {displayQuestions.length === 0 ? (
             <div className="p-12 text-center border border-dashed border-white/20 rounded-3xl">
               <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-theme-text">No Questions Available</h3>
               <p className="text-theme-text-muted">Check back later for practice material.</p>
             </div>
          ) : (
            displayQuestions.map((q, index) => {
              const interaction = questionInteraction[q.id] || {};
              const { selectedOption, isRevealed } = interaction;
              const isCorrect = selectedOption === q.correct_answer;
              
              const options = [
                { id: 'A', text: q.option_a },
                { id: 'B', text: q.option_b },
                { id: 'C', text: q.option_c },
                { id: 'D', text: q.option_d }
              ];

              return (
                <div key={q.id} className="glass-card bg-theme-card/40 border border-theme-border rounded-3xl overflow-hidden relative">
                  
                  {/* Question Header */}
                  <div className="p-6 border-b border-theme-border bg-theme-glass flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider
                        ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 
                          q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 
                          'bg-red-500/10 text-red-400'}`}
                      >
                        {q.difficulty}
                      </span>
                      {isCompleted(q.id) && <span className="px-2.5 py-1 bg-brand-primary/20 text-brand-primary rounded flex items-center gap-1 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Completed</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleProgress(q.id, 'saved')}
                        className={`p-2 rounded-lg transition-colors border ${isSaved(q.id) ? 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30' : 'bg-theme-card text-theme-text-muted border-theme-border hover:text-white hover:bg-theme-border'}`}
                        title="Save for Later"
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved(q.id) ? 'fill-current' : ''}`} />
                      </button>
                      <button 
                        onClick={() => toggleProgress(q.id, 'completed')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${isCompleted(q.id) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-theme-card text-theme-text-muted border-theme-border hover:text-theme-text hover:bg-theme-border'}`}
                      >
                        {isCompleted(q.id) ? 'Mark Incomplete' : 'Mark Completed'}
                      </button>
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Question Text */}
                    <p className="text-lg text-theme-text font-medium mb-8 whitespace-pre-wrap">{q.question_text}</p>
                    
                    {/* Options */}
                    <div className="space-y-3 mb-8">
                      {options.map((opt) => {
                        let btnClass = "w-full text-left p-4 rounded-xl border font-medium transition-all flex items-center justify-between ";
                        let icon = null;

                        if (isRevealed) {
                          if (opt.id === q.correct_answer) {
                            btnClass += "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                            icon = <Check className="w-5 h-5 text-emerald-400" />;
                          } else if (opt.id === selectedOption && !isCorrect) {
                            btnClass += "bg-red-500/20 border-red-500/50 text-red-100";
                            icon = <X className="w-5 h-5 text-red-400" />;
                          } else {
                            btnClass += "bg-theme-glass border-theme-border text-gray-500 opacity-50";
                          }
                        } else {
                          if (selectedOption === opt.id) {
                            btnClass += "bg-brand-primary/20 border-brand-primary text-white";
                          } else {
                            btnClass += "bg-brand-bg border-theme-border text-gray-300 hover:bg-theme-glass hover:border-white/20";
                          }
                        }

                        return (
                          <button 
                            key={opt.id}
                            disabled={isRevealed}
                            onClick={() => handleOptionSelect(q.id, opt.id)}
                            className={btnClass}
                          >
                            <span className="flex items-center gap-4">
                              <span className="w-6 h-6 rounded bg-brand-bg/50 border border-theme-border flex items-center justify-center text-xs font-bold text-theme-text-muted">
                                {opt.id}
                              </span>
                              {opt.text}
                            </span>
                            {icon}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action / Explanation Area */}
                    {!isRevealed ? (
                      <button 
                        disabled={!selectedOption}
                        onClick={() => handleRevealAnswer(q.id)}
                        className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-secondary transition-colors"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className={`absolute top-0 left-0 w-1 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                          Explanation
                        </h4>
                        <p className="text-theme-text text-sm leading-relaxed whitespace-pre-wrap">
                          {q.explanation || "No explanation provided."}
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isPatternModalOpen && selectedPatternTopic && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsPatternModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-theme-text mb-1">Pattern & Breakdown</h3>
                  <p className="text-sm text-brand-cyan font-semibold">For: {selectedPatternTopic.name}</p>
                </div>
                <button onClick={() => setIsPatternModalOpen(false)} className="p-2 bg-theme-glass hover:bg-theme-border text-theme-text-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-[#0b1221] border border-theme-border rounded-xl p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <pre className="text-sm text-gray-300 font-sans whitespace-pre-wrap leading-relaxed">
                  {selectedPatternTopic.pattern_text}
                </pre>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => {
                    setIsPatternModalOpen(false);
                    handleTopicSelect(selectedPatternTopic);
                  }} 
                  className="px-6 py-2 bg-brand-secondary hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" /> Start Practicing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
