import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Layers, FileQuestion, Plus, Search, 
  Trash2, Filter, CheckCircle2, XCircle, Edit2
} from 'lucide-react';

export default function LearningHubAdmin() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'topics' | 'questions'
  
  // Data States
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkTopicModalOpen, setIsBulkTopicModalOpen] = useState(false);
  const [isPatternTextModalOpen, setIsPatternTextModalOpen] = useState(false);

  // Form States
  const [topicForm, setTopicForm] = useState({ category_id: '', customCategoryName: '', name: '', description: '' });
  const [patternTextForm, setPatternTextForm] = useState({ text: '' });
  const [currentTopicForPattern, setCurrentTopicForPattern] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    category_id: '', topic_id: '', question_text: '',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', explanation: '', difficulty: 'Medium'
  });

  // Filters
  const [questionFilters, setQuestionFilters] = useState({ category: '', topic: '', search: '', showDuplicates: false });
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  
  const [bulkUploadForm, setBulkUploadForm] = useState({ category_id: '', topic_id: '' });
  const [csvFile, setCsvFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [bulkTopicForm, setBulkTopicForm] = useState({ category_id: '', topicsText: '' });
  const [bulkTopicPreview, setBulkTopicPreview] = useState(null); // array of { name, status }

  const difficulties = ['Easy', 'Medium', 'Hard'];
  const answerOptions = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, topRes, qRes] = await Promise.all([
        supabase.from('learning_hub_categories').select('*').order('name'),
        supabase.from('learning_hub_topics').select('*, learning_hub_categories(name)').order('created_at', { ascending: false }),
        supabase.from('learning_hub_questions').select('*, learning_hub_topics(name, category_id, learning_hub_categories(name))').order('created_at', { ascending: false })
      ]);

      if (catRes.error) throw catRes.error;
      if (topRes.error) throw topRes.error;
      if (qRes.error) throw qRes.error;

      setCategories(catRes.data || []);
      setTopics(topRes.data || []);
      setQuestions(qRes.data || []);
    } catch (err) {
      console.error('Error fetching LH data:', err);
    } finally {
      setLoading(false);
    }
  };

  // CATEGORY MANAGEMENT
  const toggleCategoryStatus = async (category) => {
    try {
      const newStatus = !category.is_active;
      const { error } = await supabase.from('learning_hub_categories')
        .update({ is_active: newStatus })
        .eq('id', category.id);
      
      if (error) throw error;
      setCategories(categories.map(c => c.id === category.id ? { ...c, is_active: newStatus } : c));
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category status.');
    }
  };

  // TOPIC MANAGEMENT
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      let finalCategoryId = topicForm.category_id;

      if (topicForm.category_id === 'custom') {
        const { data: catData, error: catError } = await supabase.from('learning_hub_categories')
          .insert([{ name: topicForm.customCategoryName, is_active: true }])
          .select();
        if (catError) throw catError;
        finalCategoryId = catData[0].id;
        setCategories([...categories, catData[0]]);
      }

      const { data, error } = await supabase.from('learning_hub_topics').insert([{
        category_id: finalCategoryId,
        name: topicForm.name,
        description: topicForm.description
      }]).select('*, learning_hub_categories(name)');
      
      if (error) throw error;
      setTopics([data[0], ...topics]);
      setIsTopicModalOpen(false);
      setTopicForm({ category_id: '', customCategoryName: '', name: '', description: '' });
    } catch (err) {
      console.error('Error creating topic:', err);
      alert('Failed to create topic');
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!confirm('Are you sure? This will delete all questions in this topic.')) return;
    try {
      const { error } = await supabase.from('learning_hub_topics').delete().eq('id', id);
      if (error) throw error;
      setTopics(topics.filter(t => t.id !== id));
      setQuestions(questions.filter(q => q.topic_id !== id));
    } catch (err) {
      console.error('Error deleting topic:', err);
    }
  };

  const handleUpdatePatternText = async (e) => {
    e.preventDefault();
    if (!currentTopicForPattern) return;
    try {
      const { error } = await supabase.from('learning_hub_topics')
        .update({ pattern_text: patternTextForm.text })
        .eq('id', currentTopicForPattern.id);
      
      if (error) throw error;
      
      setTopics(topics.map(t => t.id === currentTopicForPattern.id ? { ...t, pattern_text: patternTextForm.text } : t));
      setIsPatternTextModalOpen(false);
      alert('Pattern text updated successfully!');
    } catch (err) {
      console.error('Error updating pattern text:', err);
      alert('Failed to update pattern text');
    }
  };

  const handleBulkTopicPreview = () => {
    if (!bulkTopicForm.category_id || !bulkTopicForm.topicsText.trim()) return;
    
    // Existing topics in the selected category
    const existingTopics = topics
      .filter(t => t.category_id === bulkTopicForm.category_id)
      .map(t => t.name.toLowerCase().trim());
      
    const rawTopics = bulkTopicForm.topicsText.split('\n');
    const previewData = [];
    const seenNew = new Set(); // To prevent duplicates within the pasted text
    
    for (const raw of rawTopics) {
      const topicName = raw.trim();
      if (!topicName) continue;
      
      const normalized = topicName.toLowerCase();
      
      if (existingTopics.includes(normalized) || seenNew.has(normalized)) {
        previewData.push({ name: topicName, status: 'Already Exists' });
      } else {
        previewData.push({ name: topicName, status: 'New' });
        seenNew.add(normalized);
      }
    }
    
    setBulkTopicPreview(previewData);
  };

  const handleBulkTopicSubmit = async () => {
    const topicsToAdd = bulkTopicPreview.filter(t => t.status === 'New');
    if (topicsToAdd.length === 0) return;
    
    setBulkLoading(true);
    try {
      const payload = topicsToAdd.map((t, index) => {
        const d = new Date();
        d.setMilliseconds(d.getMilliseconds() + index); // Ensure sequential order
        return {
          category_id: bulkTopicForm.category_id,
          name: t.name,
          description: '', // No description in bulk upload
          created_at: d.toISOString()
        };
      });
      
      const { data, error } = await supabase.from('learning_hub_topics')
        .insert(payload)
        .select('*, learning_hub_categories(name)');
        
      if (error) throw error;
      
      setTopics([...data, ...topics]);
      setIsBulkTopicModalOpen(false);
      setBulkTopicForm({ category_id: '', topicsText: '' });
      setBulkTopicPreview(null);
      alert(`Successfully added ${data.length} topics!`);
    } catch (err) {
      console.error('Error in bulk topic upload:', err);
      alert('Failed to upload topics.');
    } finally {
      setBulkLoading(false);
    }
  };

  // QUESTION MANAGEMENT
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      const { category_id, ...questionData } = questionForm;
      
      const { data, error } = await supabase.from('learning_hub_questions').insert([questionData]).select('*, learning_hub_topics(name, category_id, learning_hub_categories(name))');
      if (error) throw error;
      
      setQuestions([data[0], ...questions]);
      setIsQuestionModalOpen(false);
      setQuestionForm({
        ...questionForm, // keep category and topic selected
        question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
        correct_answer: 'A', explanation: ''
      });
    } catch (err) {
      console.error('Error creating question:', err);
      alert('Failed to create question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase.from('learning_hub_questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(questions.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  const handleDeleteAllQuestionsInTopic = async () => {
    if (!questionFilters.topic) return;
    if (!confirm('Are you sure you want to delete ALL questions in this specific topic? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('learning_hub_questions').delete().eq('topic_id', questionFilters.topic);
      if (error) throw error;
      setQuestions(questions.filter(q => q.topic_id !== questionFilters.topic));
      setSelectedQuestions([]);
      alert('Successfully deleted all questions in the selected topic.');
    } catch (err) {
      console.error('Error bulk deleting questions:', err);
      alert('Failed to delete questions.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestion = (e, id) => {
    if (e.target.checked) {
      setSelectedQuestions([...selectedQuestions, id]);
    } else {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('learning_hub_questions').delete().in('id', selectedQuestions);
      if (error) throw error;
      setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      alert(`Successfully deleted ${selectedQuestions.length} questions.`);
    } catch (err) {
      console.error('Error deleting selected questions:', err);
      alert('Failed to delete selected questions.');
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const result = [];
    for(let i = 1; i < lines.length; i++) {
      const rowRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const currentline = lines[i].split(rowRegex).map(val => val.replace(/^"|"$/g, '').trim());
      if (currentline.length >= 6) {
        result.push({
          question_text: currentline[0] || '',
          option_a: currentline[1] || '',
          option_b: currentline[2] || '',
          option_c: currentline[3] || '',
          option_d: currentline[4] || '',
          correct_answer: (currentline[5] || 'A').toUpperCase().replace(/[^A-D]/g, '') || 'A',
          explanation: currentline[6] || '',
          difficulty: ['Easy', 'Medium', 'Hard'].includes(currentline[7]) ? currentline[7] : 'Medium',
        });
      }
    }
    return result;
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile || !bulkUploadForm.topic_id) return;
    setBulkLoading(true);
    
    try {
      const text = await csvFile.text();
      const parsedQuestions = parseCSV(text);
      if (parsedQuestions.length === 0) throw new Error("No valid questions found in CSV");
      
      const payload = parsedQuestions.map(q => ({
        ...q,
        topic_id: bulkUploadForm.topic_id
      }));

      const { data, error } = await supabase.from('learning_hub_questions').insert(payload).select('*, learning_hub_topics(name, category_id, learning_hub_categories(name))');
      if (error) throw error;
      
      setQuestions([...data, ...questions]);
      setIsBulkUploadModalOpen(false);
      setCsvFile(null);
      setBulkUploadForm({ category_id: '', topic_id: '' });
      alert(`Successfully uploaded ${data.length} questions!`);
    } catch (err) {
      console.error('Error in bulk upload:', err);
      alert('Failed to process bulk upload. Please check CSV format.');
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "Question,Option A,Option B,Option C,Option D,Correct Answer (A/B/C/D),Explanation,Difficulty (Easy/Medium/Hard)\n";
    const sample = "What is the capital of France?,Berlin,Madrid,Paris,Rome,C,Paris is the capital.,Easy\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'questions_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Derived counts & filters
  const getTopicQuestionCount = (topicId) => questions.filter(q => q.topic_id === topicId).length;
  
  // Dynamic topic list for the Add Question modal based on selected category
  const availableTopicsForQuestionForm = [...topics].reverse().filter(t => t.category_id === questionForm.category_id);

  // Compute duplicates
  const questionTextCounts = {};
  questions.forEach(q => {
    const t = q.question_text.trim().toLowerCase();
    questionTextCounts[t] = (questionTextCounts[t] || 0) + 1;
  });
  const duplicateTexts = new Set(Object.keys(questionTextCounts).filter(t => questionTextCounts[t] > 1));

  const filteredQuestions = questions.filter(q => {
    const qCategory = q.learning_hub_topics?.category_id;
    const matchesSearch = q.question_text.toLowerCase().includes(questionFilters.search.toLowerCase());
    const matchesCategory = questionFilters.category === '' || qCategory === questionFilters.category;
    const matchesTopic = questionFilters.topic === '' || q.topic_id === questionFilters.topic;
    const matchesDuplicate = !questionFilters.showDuplicates || duplicateTexts.has(q.question_text.trim().toLowerCase());
    return matchesSearch && matchesCategory && matchesTopic && matchesDuplicate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">Learning Hub Management</h2>
          <p className="text-theme-text-muted">Manage categories, topics, and multiple-choice questions.</p>
        </div>
        <div className="flex bg-theme-card p-1 rounded-xl border border-theme-border overflow-x-auto max-w-full hide-scrollbar">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'categories' ? 'bg-brand-primary text-white shadow-lg' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            Category Management
          </button>
          <button 
            onClick={() => setActiveTab('topics')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'topics' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            Topic Management
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'questions' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}
          >
            Question Management
          </button>
        </div>
      </div>

      {/* TAB CONTENT: CATEGORIES */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-primary" /> Default Categories
            </h3>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Total Topics</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4 font-bold text-theme-text">{cat.name}</td>
                    <td className="px-6 py-4 text-theme-text-muted font-mono">
                      {topics.filter(t => t.category_id === cat.id).length} Topics
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 w-max ${cat.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {cat.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {cat.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleCategoryStatus(cat)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${cat.is_active ? 'bg-theme-glass hover:bg-theme-border text-theme-text' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'}`}
                      >
                        {cat.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB CONTENT: TOPICS */}
      {activeTab === 'topics' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-secondary" /> Topics
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsBulkTopicModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border hover:bg-theme-glass text-theme-text font-bold rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Bulk Upload Topics
              </button>
              <button onClick={() => setIsTopicModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-secondary hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Topic
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4">Topic Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Questions</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topics.length > 0 ? topics.map(topic => (
                    <tr key={topic.id} className="hover:bg-theme-glass transition-colors">
                      <td className="px-6 py-4 font-bold text-theme-text">{topic.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <span className="px-2 py-1 bg-theme-glass rounded text-xs">{topic.learning_hub_categories?.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-theme-text-muted max-w-[200px] truncate" title={topic.description}>{topic.description || '-'}</td>
                      <td className="px-6 py-4 text-theme-text-muted font-mono text-sm">
                        {getTopicQuestionCount(topic.id)} Qs
                      </td>
                      <td className="px-6 py-4 text-sm text-theme-text-muted">
                        {new Date(topic.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => { setCurrentTopicForPattern(topic); setPatternTextForm({text: topic.pattern_text || ''}); setIsPatternTextModalOpen(true); }} className="px-3 py-1 bg-theme-glass hover:bg-theme-border border border-theme-border rounded text-xs font-bold text-brand-cyan transition-colors whitespace-nowrap">
                          {topic.pattern_text ? "Edit Pattern Text" : "+ Add Pattern Text"}
                        </button>
                        <button onClick={() => handleDeleteTopic(topic.id)} className="p-2 hover:bg-red-500/10 text-white-muted hover:text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">No topics found. Click 'Add Topic' to begin.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB CONTENT: QUESTIONS */}
      {activeTab === 'questions' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-cyan" /> Questions
            </h3>
            <div className="flex items-center gap-3">
              {selectedQuestions.length > 0 && (
                <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Selected ({selectedQuestions.length})
                </button>
              )}
              {questionFilters.topic && (
                <button onClick={handleDeleteAllQuestionsInTopic} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete All in Topic
                </button>
              )}
              <button onClick={() => setIsBulkUploadModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-border hover:bg-theme-glass text-theme-text font-bold rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Bulk Upload
              </button>
              <button onClick={() => setIsQuestionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg font-bold rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>

            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                <input 
                  type="text" placeholder="Search questions..." 
                  value={questionFilters.search} onChange={e => setQuestionFilters({...questionFilters, search: e.target.value})}
                  className="w-full bg-theme-card border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary" 
                />
              </div>
              <button 
                onClick={() => setQuestionFilters({...questionFilters, showDuplicates: !questionFilters.showDuplicates})}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap border ${questionFilters.showDuplicates ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-theme-card text-theme-text-muted border-theme-border hover:bg-theme-glass hover:text-white'}`}
                title="Find duplicate questions"
              >
                <Layers className="w-4 h-4" /> 
                {questionFilters.showDuplicates ? 'Showing Duplicates' : 'Find Duplicates'}
              </button>
              <select 
                value={questionFilters.category} onChange={e => { setQuestionFilters({...questionFilters, category: e.target.value, topic: ''}); setSelectedQuestions([]); }}
                className="bg-theme-card border border-theme-border rounded-lg py-2 px-4 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={questionFilters.topic} onChange={e => { setQuestionFilters({...questionFilters, topic: e.target.value}); setSelectedQuestions([]); }} disabled={!questionFilters.category} className="bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none disabled:opacity-50">
                  <option value="">All Topics</option>
                  {[...topics].reverse().filter(t => t.category_id === questionFilters.category).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-theme-border bg-theme-glass text-brand-primary focus:ring-brand-primary"
                        checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4">Question</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Topic</th>
                    <th className="px-6 py-4">Difficulty</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredQuestions.length > 0 ? filteredQuestions.map(q => (
                    <tr key={q.id} className="hover:bg-theme-glass transition-colors">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-theme-border bg-theme-glass text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                          checked={selectedQuestions.includes(q.id)}
                          onChange={(e) => handleSelectQuestion(e, q.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-theme-text max-w-xs truncate" title={q.question_text}>{q.question_text}</td>
                      <td className="px-6 py-4 text-sm text-theme-text-muted">{q.learning_hub_topics?.learning_hub_categories?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{q.learning_hub_topics?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                          ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : 
                            q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 
                            'bg-red-500/10 text-red-400'}`}
                        >
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 hover:bg-red-500/10 text-white-muted hover:text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">No questions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isTopicModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsTopicModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-4">Add New Topic</h3>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Category</label>
                  <select required value={topicForm.category_id} onChange={e => setTopicForm({...topicForm, category_id: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                    <option value="" disabled>Select Category...</option>
                    {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="custom" className="text-brand-primary font-bold">+ Custom Category...</option>
                  </select>
                </div>
                {topicForm.category_id === 'custom' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-brand-primary">Custom Category Name</label>
                    <input required type="text" value={topicForm.customCategoryName} onChange={e => setTopicForm({...topicForm, customCategoryName: e.target.value})} className="w-full bg-brand-primary/10 border border-brand-primary/50 rounded-lg py-2.5 px-3 text-sm text-white focus:border-brand-primary outline-none" placeholder="e.g. System Design" />
                  </motion.div>
                )}
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Topic Name</label>
                  <input required type="text" value={topicForm.name} onChange={e => setTopicForm({...topicForm, name: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. Number System" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Description (Optional)</label>
                  <textarea rows="2" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Briefly describe the topic..."></textarea>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => setIsTopicModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-brand-secondary hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors">Save Topic</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isPatternTextModalOpen && currentTopicForPattern && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsPatternTextModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-lg shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-1">Edit Pattern Text</h3>
              <p className="text-sm text-theme-text-muted mb-6">For Topic: <span className="font-bold text-brand-primary">{currentTopicForPattern.name}</span></p>
              
              <form onSubmit={handleUpdatePatternText} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Pattern Description / Breakdown</label>
                  <textarea 
                    rows="8" 
                    value={patternTextForm.text} 
                    onChange={e => setPatternTextForm({text: e.target.value})} 
                    className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" 
                    placeholder="Enter the pattern description, topics breakdown, or syllabus here..." 
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
                  <button type="button" onClick={() => setIsPatternTextModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg rounded-lg text-sm font-bold transition-colors">Save Pattern Text</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsQuestionModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-theme-text mb-4">Add New Question</h3>
              {categories.length === 0 || topics.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                  You must create at least one Category and Topic first!
                </div>
              ) : (
                <form onSubmit={handleCreateQuestion} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Category</label>
                      <select required value={questionForm.category_id} onChange={e => setQuestionForm({...questionForm, category_id: e.target.value, topic_id: ''})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                        <option value="" disabled>Select Category...</option>
                        {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Topic</label>
                      <select required value={questionForm.topic_id} onChange={e => setQuestionForm({...questionForm, topic_id: e.target.value})} disabled={!questionForm.category_id} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none disabled:opacity-50">
                        <option value="" disabled>Select Topic...</option>
                        {availableTopicsForQuestionForm.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Question Text</label>
                    <textarea required rows="3" value={questionForm.question_text} onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Enter the full question..."></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Option A</label>
                      <input required type="text" value={questionForm.option_a} onChange={e => setQuestionForm({...questionForm, option_a: e.target.value})} className="w-full bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Option A text" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Option B</label>
                      <input required type="text" value={questionForm.option_b} onChange={e => setQuestionForm({...questionForm, option_b: e.target.value})} className="w-full bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Option B text" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Option C</label>
                      <input required type="text" value={questionForm.option_c} onChange={e => setQuestionForm({...questionForm, option_c: e.target.value})} className="w-full bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Option C text" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Option D</label>
                      <input required type="text" value={questionForm.option_d} onChange={e => setQuestionForm({...questionForm, option_d: e.target.value})} className="w-full bg-theme-card border border-theme-border rounded-lg py-2 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Option D text" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-theme-border pt-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-brand-primary">Correct Answer</label>
                      <select value={questionForm.correct_answer} onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="w-full bg-brand-primary/10 border border-brand-primary/30 rounded-lg py-2.5 px-3 text-sm text-brand-primary font-bold focus:border-brand-primary outline-none">
                        {answerOptions.map(o => <option key={o} value={o}>Option {o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Difficulty</label>
                      <select value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                        {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Explanation (Optional)</label>
                    <textarea rows="2" value={questionForm.explanation} onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Explain the correct answer..."></textarea>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                    <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg rounded-lg text-sm font-bold transition-colors">Save Question</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {isBulkUploadModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsBulkUploadModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-lg shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-4">Bulk Upload Questions</h3>
              {categories.length === 0 || topics.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                  You must create at least one Category and Topic first!
                </div>
              ) : (
                <form onSubmit={handleBulkUpload} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Category</label>
                      <select required value={bulkUploadForm.category_id} onChange={e => setBulkUploadForm({...bulkUploadForm, category_id: e.target.value, topic_id: ''})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                        <option value="" disabled>Select Category...</option>
                        {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Topic</label>
                      <select required value={bulkUploadForm.topic_id} onChange={e => setBulkUploadForm({...bulkUploadForm, topic_id: e.target.value})} disabled={!bulkUploadForm.category_id} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none disabled:opacity-50">
                        <option value="" disabled>Select Topic...</option>
                        {[...topics].reverse().filter(t => t.category_id === bulkUploadForm.category_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#15203b] border border-theme-border rounded-xl p-6 text-center border-dashed">
                    <p className="text-sm text-theme-text-muted mb-4">Upload a CSV file containing your questions.</p>
                    <button type="button" onClick={downloadTemplate} className="text-brand-primary font-bold text-sm hover:underline mb-4">Download CSV Template</button>
                    <input 
                      type="file" 
                      accept=".csv"
                      required
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="block w-full text-sm text-white-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/20 file:text-brand-primary hover:file:bg-brand-primary/30 mx-auto"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-theme-border">
                    <button type="button" onClick={() => setIsBulkUploadModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                    <button type="submit" disabled={bulkLoading || !csvFile} className="px-6 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-bg rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                      {bulkLoading ? 'Uploading...' : 'Upload Questions'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {isBulkTopicModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => !bulkLoading && setIsBulkTopicModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-theme-text mb-4">Bulk Upload Topics</h3>
              
              {!bulkTopicPreview ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Category</label>
                    <select required value={bulkTopicForm.category_id} onChange={e => setBulkTopicForm({...bulkTopicForm, category_id: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                      <option value="" disabled>Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Paste Topics (One per line)</label>
                    <textarea required rows="10" value={bulkTopicForm.topicsText} onChange={e => setBulkTopicForm({...bulkTopicForm, topicsText: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Number System&#10;LCM and HCF&#10;Percentages"></textarea>
                  </div>
                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                    <button type="button" onClick={() => setIsBulkTopicModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                    <button type="button" onClick={handleBulkTopicPreview} disabled={!bulkTopicForm.category_id || !bulkTopicForm.topicsText.trim()} className="px-6 py-2 bg-brand-secondary hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors">Preview Topics</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-theme-card/80 border border-theme-border rounded-xl">
                    <div className="flex-1">
                      <p className="text-xs text-theme-text-muted font-bold uppercase tracking-wider">Ready to Add</p>
                      <p className="text-2xl font-bold text-emerald-400">{bulkTopicPreview.filter(t => t.status === 'New').length}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-theme-text-muted font-bold uppercase tracking-wider">Skipped (Duplicates)</p>
                      <p className="text-2xl font-bold text-yellow-400">{bulkTopicPreview.filter(t => t.status !== 'New').length}</p>
                    </div>
                  </div>
                  
                  <div className="border border-theme-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-theme-card">
                        <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                          <th className="px-4 py-3">Topic Name</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bulkTopicPreview.map((topic, i) => (
                          <tr key={i} className="hover:bg-theme-glass">
                            <td className="px-4 py-2 text-sm text-theme-text font-medium">{topic.name}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${topic.status === 'New' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {topic.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                    <button type="button" onClick={() => setBulkTopicPreview(null)} disabled={bulkLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Back</button>
                    <button type="button" onClick={handleBulkTopicSubmit} disabled={bulkLoading || bulkTopicPreview.filter(t => t.status === 'New').length === 0} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-theme-text rounded-lg text-sm font-bold transition-colors">
                      {bulkLoading ? 'Saving...' : 'Save All'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
