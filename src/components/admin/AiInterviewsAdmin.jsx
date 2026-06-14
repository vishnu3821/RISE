import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Check, X, Search, 
  Settings, Database, Building2, BarChart2,
  Mic, Users, Code, FileText
} from 'lucide-react';

// Icon Map for dynamic rendering
const IconMap = {
  Mic, Users, Code, Building2, FileText
};

export default function AiInterviewsAdmin() {
  const [activeTab, setActiveTab] = useState('modules'); // 'modules', 'questions', 'companies', 'analytics'
  
  // Data States
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ id: null, name: '', description: '', icon: 'Mic', is_active: true });

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({ id: null, name: '', is_active: true });

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    id: null,
    module_id: '',
    company_id: '',
    question_text: '',
    expected_points: [''],
    difficulty: 'Medium'
  });

  // Filters
  const [qFilters, setQFilters] = useState({ module: '', company: '', search: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modulesRes, companiesRes, questionsRes, attemptsRes] = await Promise.all([
        supabase.from('ai_interview_modules').select('*').order('created_at', { ascending: true }),
        supabase.from('ai_interview_companies').select('*').order('name'),
        supabase.from('ai_interview_questions').select('*, ai_interview_modules(name), ai_interview_companies(name)').order('created_at', { ascending: false }),
        supabase.from('ai_interview_attempts').select('*, ai_interview_modules(name), ai_interview_companies(name)').order('created_at', { ascending: false })
      ]);

      if (modulesRes.data) setModules(modulesRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data);

      if (attemptsRes.data) {
        // Fetch profiles manually
        const studentIds = [...new Set(attemptsRes.data.map(a => a.student_id))];
        const profilesMap = {};
        if (studentIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, email').in('id', studentIds);
          if (profilesError) console.error('Profiles fetch error:', profilesError);
          if (profilesData) {
            profilesData.forEach(p => profilesMap[p.id] = p);
          }
        }
        
        const mappedAttempts = attemptsRes.data.map(a => ({
          ...a,
          profile: profilesMap[a.student_id] || { email: 'Unknown User' }
        }));
        setAttempts(mappedAttempts);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllowRetake = async (attemptId) => {
    if (!confirm('Allowing a retake will let the student attempt this module again. Continue?')) return;
    try {
      const { error } = await supabase.from('ai_interview_attempts').update({ status: 'retake_allowed' }).eq('id', attemptId);
      if (error) throw error;
      setAttempts(attempts.map(a => a.id === attemptId ? { ...a, status: 'retake_allowed' } : a));
    } catch (err) {
      console.error(err);
      alert('Failed to allow retake');
    }
  };

  // --- MODULE MANAGEMENT ---
  const handleSaveModule = async (e) => {
    e.preventDefault();
    try {
      if (moduleForm.id) {
        const { error } = await supabase.from('ai_interview_modules')
          .update({ name: moduleForm.name, description: moduleForm.description, icon: moduleForm.icon, is_active: moduleForm.is_active })
          .eq('id', moduleForm.id);
        if (error) throw error;
        setModules(modules.map(m => m.id === moduleForm.id ? { ...m, ...moduleForm } : m));
      } else {
        const { data, error } = await supabase.from('ai_interview_modules')
          .insert([{ name: moduleForm.name, description: moduleForm.description, icon: moduleForm.icon, is_active: moduleForm.is_active }])
          .select();
        if (error) throw error;
        setModules([...modules, data[0]]);
      }
      setIsModuleModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save module');
    }
  };

  // --- COMPANY MANAGEMENT ---
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      if (companyForm.id) {
        const { error } = await supabase.from('ai_interview_companies')
          .update({ name: companyForm.name, is_active: companyForm.is_active })
          .eq('id', companyForm.id);
        if (error) throw error;
        setCompanies(companies.map(c => c.id === companyForm.id ? { ...c, ...companyForm } : c));
      } else {
        const { data, error } = await supabase.from('ai_interview_companies')
          .insert([{ name: companyForm.name, is_active: companyForm.is_active }])
          .select();
        if (error) throw error;
        setCompanies([...companies, data[0]]);
      }
      setIsCompanyModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save company');
    }
  };

  // --- QUESTION MANAGEMENT ---
  const handleExpectedPointChange = (index, value) => {
    const newPoints = [...questionForm.expected_points];
    newPoints[index] = value;
    setQuestionForm({ ...questionForm, expected_points: newPoints });
  };

  const addExpectedPoint = () => {
    setQuestionForm({ ...questionForm, expected_points: [...questionForm.expected_points, ''] });
  };

  const removeExpectedPoint = (index) => {
    const newPoints = questionForm.expected_points.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, expected_points: newPoints });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const validPoints = questionForm.expected_points.filter(p => p.trim() !== '');
      if (validPoints.length === 0) return alert('At least one expected point is required');

      const payload = {
        module_id: questionForm.module_id || null,
        company_id: questionForm.company_id || null,
        question_text: questionForm.question_text,
        expected_points: validPoints,
        difficulty: questionForm.difficulty
      };

      if (questionForm.id) {
        const { error } = await supabase.from('ai_interview_questions').update(payload).eq('id', questionForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_interview_questions').insert([payload]);
        if (error) throw error;
      }
      
      await fetchData(); // Refresh to get relations
      setIsQuestionModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await supabase.from('ai_interview_questions').delete().eq('id', id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (qFilters.module && q.module_id !== qFilters.module) return false;
    if (qFilters.company && q.company_id !== qFilters.company) return false;
    if (qFilters.search && !q.question_text.toLowerCase().includes(qFilters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">AI Mock Interviews Management</h2>
          <p className="text-theme-text-muted">Configure interview modules, question banks, and company-specific rounds.</p>
        </div>
        <div className="flex bg-theme-card p-1 rounded-xl border border-theme-border overflow-x-auto max-w-full hide-scrollbar">
          <button onClick={() => setActiveTab('modules')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'modules' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}>
            <Settings className="w-4 h-4 inline-block mr-2" /> Modules
          </button>
          <button onClick={() => setActiveTab('questions')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'questions' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}>
            <Database className="w-4 h-4 inline-block mr-2" /> Question Bank
          </button>
          <button onClick={() => setActiveTab('companies')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'companies' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}>
            <Building2 className="w-4 h-4 inline-block mr-2" /> Companies
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}>
            <BarChart2 className="w-4 h-4 inline-block mr-2" /> Analytics
          </button>
        </div>
      </div>

      {/* MODULES TAB */}
      {activeTab === 'modules' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-theme-text">Interview Modules</h3>
            <button onClick={() => { setModuleForm({id: null, name: '', description: '', icon: 'Mic', is_active: true}); setIsModuleModalOpen(true); }} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Module
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(mod => {
              const Icon = IconMap[mod.icon] || Settings;
              return (
                <div key={mod.id} className={`glass-card p-6 rounded-2xl border ${mod.is_active ? 'border-theme-border bg-theme-card/40' : 'border-red-500/10 bg-red-500/5'} flex flex-col`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <button 
                      onClick={() => { setModuleForm(mod); setIsModuleModalOpen(true); }}
                      className="p-2 text-theme-text-muted hover:text-theme-text hover:bg-theme-border rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">{mod.name}</h3>
                  <p className="text-sm text-theme-text-muted mb-6 flex-1">{mod.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-theme-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {questions.filter(q => q.module_id === mod.id).length} Questions
                    </span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${mod.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {mod.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPANIES TAB */}
      {activeTab === 'companies' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-theme-text">Configured Companies</h3>
            <button onClick={() => { setCompanyForm({id: null, name: '', is_active: true}); setIsCompanyModalOpen(true); }} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {companies.map(c => (
              <div key={c.id} className="glass-card p-5 rounded-xl border border-theme-border bg-theme-card/40 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-theme-text text-lg">{c.name}</h4>
                  <p className="text-xs text-theme-text-muted mt-1">{questions.filter(q => q.company_id === c.id).length} Qs</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <button onClick={() => { setCompanyForm(c); setIsCompanyModalOpen(true); }} className="p-2 hover:bg-theme-border rounded-lg text-theme-text-muted hover:text-theme-text transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {companies.length === 0 && <div className="col-span-full p-8 text-center text-gray-500">No companies added yet.</div>}
          </div>
        </div>
      )}

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-4 w-full sm:w-auto flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input 
                  type="text" placeholder="Search questions..." 
                  value={qFilters.search} onChange={e => setQFilters({...qFilters, search: e.target.value})}
                  className="w-full bg-theme-card border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary" 
                />
              </div>
              <select value={qFilters.module} onChange={e => setQFilters({...qFilters, module: e.target.value})} className="bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text">
                <option value="">All Modules</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={qFilters.company} onChange={e => setQFilters({...qFilters, company: e.target.value})} className="bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text">
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={() => { setQuestionForm({id: null, module_id: '', company_id: '', question_text: '', expected_points: [''], difficulty: 'Medium'}); setIsQuestionModalOpen(true); }} className="px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg rounded-lg text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4">Question</th>
                    <th className="px-6 py-4">Module / Company</th>
                    <th className="px-6 py-4">Expected Points</th>
                    <th className="px-6 py-4">Difficulty</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredQuestions.map(q => (
                    <tr key={q.id} className="hover:bg-theme-glass transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-theme-text max-w-md line-clamp-2">{q.question_text}</p>
                      </td>
                      <td className="px-6 py-4">
                        {q.ai_interview_modules?.name && <span className="block text-xs font-bold text-brand-primary">{q.ai_interview_modules.name}</span>}
                        {q.ai_interview_companies?.name && <span className="block text-xs font-bold text-brand-secondary mt-1">{q.ai_interview_companies.name}</span>}
                        {!q.module_id && !q.company_id && <span className="text-gray-500 text-xs">Uncategorized</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-theme-text-muted font-mono">{q.expected_points?.length || 0} Points</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase
                          ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 
                            q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' : 
                            'bg-yellow-500/10 text-yellow-500'}`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setQuestionForm(q); setIsQuestionModalOpen(true); }} className="p-2 hover:bg-theme-border rounded-lg text-theme-text-muted hover:text-theme-text transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-white-muted hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredQuestions.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">No questions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attempts.map(a => (
                  <tr key={a.id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-theme-text">{a.profile?.email}</p>
                      <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-primary">{a.ai_interview_modules?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                        a.status === 'retake_allowed' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-theme-text">{a.overall_score || 0}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {a.status === 'completed' && (
                        <button 
                          onClick={() => handleAllowRetake(a.id)}
                          className="px-3 py-1.5 bg-brand-primary/20 hover:bg-brand-primary/40 text-brand-primary rounded-lg text-xs font-bold transition-colors"
                        >
                          Allow Retake
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No attempts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isModuleModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsModuleModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-4">{moduleForm.id ? 'Edit' : 'Add'} Module</h3>
              <form onSubmit={handleSaveModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Module Name</label>
                  <input required type="text" value={moduleForm.name} onChange={e => setModuleForm({...moduleForm, name: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Description</label>
                  <textarea required rows="3" value={moduleForm.description} onChange={e => setModuleForm({...moduleForm, description: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Icon</label>
                    <select value={moduleForm.icon} onChange={e => setModuleForm({...moduleForm, icon: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                      {Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Status</label>
                    <select value={moduleForm.is_active ? 'active' : 'disabled'} onChange={e => setModuleForm({...moduleForm, is_active: e.target.value === 'active'})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                  <button type="button" onClick={() => setIsModuleModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-bold transition-colors">Save Module</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsCompanyModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-4">{companyForm.id ? 'Edit' : 'Add'} Company</h3>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Company Name</label>
                  <input required type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Status</label>
                  <select value={companyForm.is_active ? 'active' : 'disabled'} onChange={e => setCompanyForm({...companyForm, is_active: e.target.value === 'active'})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                  <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-bold transition-colors">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsQuestionModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl font-bold text-theme-text mb-4">{questionForm.id ? 'Edit' : 'Add'} Question</h3>
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Assign Module (Optional)</label>
                    <select value={questionForm.module_id} onChange={e => setQuestionForm({...questionForm, module_id: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                      <option value="">None</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Assign Company (Optional)</label>
                    <select value={questionForm.company_id} onChange={e => setQuestionForm({...questionForm, company_id: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                      <option value="">None</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Question Text</label>
                  <textarea required rows="3" value={questionForm.question_text} onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none" placeholder="e.g. Tell me about a time you faced a challenge..."></textarea>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider">Expected Answer Points (For AI Evaluation)</label>
                    <button type="button" onClick={addExpectedPoint} className="text-xs text-brand-primary font-bold hover:text-theme-text">+ Add Point</button>
                  </div>
                  <div className="space-y-2">
                    {questionForm.expected_points.map((point, i) => (
                      <div key={i} className="flex gap-2">
                        <input required type="text" value={point} onChange={e => handleExpectedPointChange(i, e.target.value)} className="flex-1 bg-[#15203b] border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none" placeholder="e.g. Mentioned problem solving skills" />
                        {questionForm.expected_points.length > 1 && (
                          <button type="button" onClick={() => removeExpectedPoint(i)} className="p-2 text-gray-500 hover:text-red-400 rounded-lg bg-theme-glass hover:bg-red-500/10">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Difficulty</label>
                  <select value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})} className="w-full bg-[#15203b] border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                  <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg rounded-lg text-sm font-bold transition-colors">Save Question</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
