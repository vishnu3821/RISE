import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, 
  ArrowRight, ArrowLeft, Save, Eye, Layers, BookOpen, User, Calendar, AlertTriangle, Star,
  UploadCloud, Database, ListPlus, Calculator, Camera
} from 'lucide-react';
import * as XLSX from 'xlsx';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import mammoth from 'mammoth';
import CodeEditor from 'react-simple-code-editor';
const Editor = CodeEditor.default || CodeEditor;
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function MockTestsAdmin() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState('list'); // 'list' | 'modules_list' | 'module_form' | 'step1' | 'step2' | 'step3' | 'review' | 'submissions_list' | 'student_attempts_list' | 'submission_detail'
  
  // Dynamic Modules States
  const [allModules, setAllModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ id: null, name: '', description: '', icon: '', status: 'Active' });
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Data States
  const [exams, setExams] = useState([]);
  const [examModules, setExamModules] = useState({});
  const [examQuestionCounts, setExamQuestionCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Results State
  const [activeReviewExam, setActiveReviewExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeStudentGroup, setActiveStudentGroup] = useState(null);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewAnswers, setReviewAnswers] = useState({});
  const [codingEvaluations, setCodingEvaluations] = useState({});
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [reviewTab, setReviewTab] = useState('answers');

  // Wizard States
  const [examForm, setExamForm] = useState({ title: '', description: '', instructions: '', duration_minutes: '', allow_calculator: false, require_webcam: false, attempt_type: 'unlimited', max_attempts: '' });
  const [selectedModules, setSelectedModules] = useState([]);
  const [draftQuestions, setDraftQuestions] = useState([]);
  
  // Step 3 (Questions) State
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [questionForm, setQuestionForm] = useState({
    question_type: 'MCQ', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', explanation: '', difficulty: 'Medium', marks: 1, test_cases: []
  });
  const [saveToBank, setSaveToBank] = useState(false);

  const [editAttemptsExam, setEditAttemptsExam] = useState(null);
  const [newMaxAttempts, setNewMaxAttempts] = useState('');
  const [newAttemptType, setNewAttemptType] = useState('unlimited');

  // Bulk Question States
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showBankImportModal, setShowBankImportModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  useDocumentTitle(
    viewState === 'list' ? 'Mock Tests' :
    viewState === 'modules_list' ? 'Manage Modules' :
    viewState === 'module_form' ? 'Edit Module' :
    viewState === 'step1' || viewState === 'step2' || viewState === 'review' || viewState === 'instructions_setup' ? 'Create Exam' :
    viewState === 'step3' ? 'Add Questions' :
    viewState === 'submissions_list' || viewState === 'student_attempts_list' || viewState === 'submission_detail' ? 'Exam Results' :
    'Mock Tests',
    true
  );

  useEffect(() => {
    fetchExams();
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase.from('mock_modules').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setAllModules(data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data: testData, error: testError } = await supabase.from('mock_tests').select('*').order('created_at', { ascending: false });
      if (testError) throw testError;
      
      const { data: modData, error: modError } = await supabase.from('mock_test_modules').select('*');
      if (modError) throw modError;

      // Group modules by test_id
      const modsMap = {};
      modData.forEach(m => {
        if (!modsMap[m.test_id]) modsMap[m.test_id] = [];
        modsMap[m.test_id].push(m.module_name);
      });

      // Get question counts per test
      const { data: qData, error: qError } = await supabase.from('mock_test_questions').select('test_id, id');
      if (qError) throw qError;
      
      const countMap = {};
      qData.forEach(q => {
        countMap[q.test_id] = (countMap[q.test_id] || 0) + 1;
      });

      setExams(testData || []);
      setExamModules(modsMap);
      setExamQuestionCounts(countMap);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (examId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
      const { error } = await supabase.from('mock_tests').update({ status: newStatus }).eq('id', examId);
      if (error) throw error;
      setExams(exams.map(e => e.id === examId ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (examId) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from('mock_tests').delete().eq('id', examId);
      if (error) throw error;
      setExams(exams.filter(e => e.id !== examId));
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Failed to delete exam.');
    }
  };

  // --- MODULE MANAGEMENT HANDLERS ---
  const handleSaveModule = async () => {
    if (!moduleForm.name) return alert('Module Name is required.');
    setIsSavingModule(true);
    try {
      if (moduleForm.id) {
        const { error } = await supabase.from('mock_modules').update({
          name: moduleForm.name,
          description: moduleForm.description,
          icon: moduleForm.icon,
          status: moduleForm.status
        }).eq('id', moduleForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mock_modules').insert([{
          name: moduleForm.name,
          description: moduleForm.description,
          icon: moduleForm.icon,
          status: moduleForm.status
        }]);
        if (error) throw error;
      }
      await fetchModules();
      setViewState('modules_list');
    } catch (err) {
      console.error(err);
      alert('Failed to save module: ' + err.message);
    } finally {
      setIsSavingModule(false);
    }
  };

  const handleDeleteModule = async (id) => {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('mock_modules').delete().eq('id', id);
      if (error) throw error;
      await fetchModules();
    } catch (err) {
      console.error(err);
      alert('Failed to delete module.');
    }
  };

  const handleEditModule = (mod) => {
    setModuleForm({ id: mod.id, name: mod.name, description: mod.description || '', icon: mod.icon || '', status: mod.status });
    setViewState('module_form');
  };

  // --- RESULTS HANDLERS ---
  const handleViewSubmissions = async (exam) => {
    setLoading(true);
    setActiveReviewExam(exam);
    try {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('mock_test_attempts')
        .select('*')
        .eq('test_id', exam.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });
        
      if (attemptsError) throw attemptsError;

      // Fetch profiles manually to avoid Foreign Key join 400 errors
      const studentIds = attemptsData.map(a => a.student_id);
      const profilesMap = {};
      
      if (studentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', studentIds);
          
        if (profilesData) {
          profilesData.forEach(p => {
             profilesMap[p.id] = p;
          });
        }
      }

      const enrichedAttempts = attemptsData.map(a => ({
        ...a,
        profiles: profilesMap[a.student_id] || { email: 'Unknown User' }
      }));

      // Group by student_id
      const grouped = {};
      enrichedAttempts.forEach(a => {
        if (!grouped[a.student_id]) {
          grouped[a.student_id] = {
            student_id: a.student_id,
            email: a.profiles.email,
            attempts: [],
            latest_attempt: a.submitted_at
          };
        }
        grouped[a.student_id].attempts.push(a);
        if (new Date(a.submitted_at) > new Date(grouped[a.student_id].latest_attempt)) {
          grouped[a.student_id].latest_attempt = a.submitted_at;
        }
      });
      const groupedArray = Object.values(grouped).sort((a,b) => new Date(b.latest_attempt) - new Date(a.latest_attempt));

      setSubmissions(groupedArray);
      setViewState('submissions_list');
    } catch (err) {
      console.error('Error fetching submissions:', err);
      alert('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDetail = async (attempt) => {
    setLoading(true);
    setActiveSubmission(attempt);
    try {
      // 1. Fetch MCQs
      const { data: qData, error: qError } = await supabase.from('mock_test_questions').select('*').eq('test_id', attempt.test_id);
      if (qError) throw qError;
      
      const { data: aData, error: aError } = await supabase.from('mock_test_answers').select('*').eq('attempt_id', attempt.id);
      if (aError) throw aError;
      
      // 2. Fetch Coding
      const { data: cqData, error: cqError } = await supabase.from('mock_test_coding_questions').select('*').eq('test_id', attempt.test_id);
      if (cqError) throw cqError;

      const { data: caData, error: caError } = await supabase.from('mock_test_coding_answers').select('*').eq('attempt_id', attempt.id);
      if (caError) throw caError;

      const mappedCodingQs = cqData ? cqData.map(c => ({ ...c, question_type: 'CODING', module_name: 'Coding', question_text: c.problem_statement })) : [];

      const answerMap = {};
      const evals = {};
      
      (aData || []).forEach(a => {
        answerMap[a.question_id] = a;
      });

      (caData || []).forEach(ca => {
        answerMap[ca.question_id] = ca;
        evals[ca.question_id] = ca.score || 0;
      });
      
      // 3. Fetch Proctoring
      const { data: procData, error: procError } = await supabase.from('mock_test_proctoring').select('*').eq('attempt_id', attempt.id).order('captured_at', { ascending: true });
      // If error occurs here, it might just mean the table doesn't exist yet, we can gracefully ignore it for now or log it
      if (procError && procError.code !== '42P01') console.error(procError);

      setReviewQuestions([...(qData || []), ...mappedCodingQs]);
      setReviewAnswers(answerMap);
      setCodingEvaluations(evals);
      setProctoringLogs(procData || []);
      setViewState('submission_detail');
    } catch (err) {
      console.error('Error fetching review details:', err);
      alert('Failed to load submission details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvaluation = async (questionId) => {
    try {
      const marks = codingEvaluations[questionId];
      const answer = reviewAnswers[questionId];
      if (!answer) return;

      let error;
      const isCodingUpdate = reviewQuestions.find(rq => rq.id === questionId)?.question_type === 'CODING';
      
      if (isCodingUpdate) {
        const res = await supabase.from('mock_test_coding_answers')
          .update({ score: marks })
          .eq('id', answer.id);
        error = res.error;
      } else {
        const res = await supabase.from('mock_test_answers')
          .update({ obtained_marks: marks, is_evaluated: true })
          .eq('id', answer.id);
        error = res.error;
      }

      if (error) throw error;
      
      const q = reviewQuestions.find(rq => rq.id === questionId);
      if (q && activeSubmission?.student_id) {
        await supabase.from('notifications').insert([{
          user_id: activeSubmission.student_id,
          title: `Coding Evaluation Updated - ${activeReviewExam?.title || 'Mock Test'}`,
          message: `For your ${q.module_name} module, coding question, you got ${marks} marks. These marks were provided by the admin.`,
          type: 'evaluation'
        }]);
      }
      
      setReviewAnswers({
        ...reviewAnswers,
        [questionId]: { ...answer, score: marks, obtained_marks: marks, is_evaluated: true }
      });
      alert('Evaluation saved successfully!');
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Failed to save evaluation.');
    }
  };

  const getPrismLanguage = (lang) => {
    switch (lang) {
      case 'C': return Prism.languages.c;
      case 'C++': return Prism.languages.cpp;
      case 'Java': return Prism.languages.java;
      case 'Python': return Prism.languages.python;
      default: return Prism.languages.python;
    }
  };

  // --- WIZARD HANDLERS ---
  const startNewExam = () => {
    setExamForm({ title: '', description: '', duration_minutes: '', allow_calculator: false, require_webcam: false });
    setSelectedModules([]);
    setDraftQuestions([]);
    setCurrentModuleIndex(0);
    resetQuestionForm();
    setViewState('step1');
  };

  const toggleModule = (modObj) => {
    if (selectedModules.find(m => m.id === modObj.id)) {
      setSelectedModules(selectedModules.filter(m => m.id !== modObj.id));
    } else {
      setSelectedModules([...selectedModules, { id: modObj.id, name: modObj.name, duration_minutes: 30, question_count: 10 }]);
    }
  };

  const updateModuleConfig = (modId, field, value) => {
    setSelectedModules(selectedModules.map(m => m.id === modId ? { ...m, [field]: value } : m));
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_type: 'MCQ', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A', explanation: '', difficulty: 'Medium', marks: 1, test_cases: []
    });
  };

  const saveToQuestionBank = async (q) => {
    try {
      const payload = {
        module_name: q.module_name,
        question_type: q.question_type,
        question_text: q.question_text,
        marks: q.marks || 1,
        difficulty: q.difficulty || 'Medium',
        option_a: q.option_a || null,
        option_b: q.option_b || null,
        option_c: q.option_c || null,
        option_d: q.option_d || null,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        test_cases: q.test_cases || []
      };
      const { error } = await supabase.from('mock_question_bank').insert([payload]);
      if (error) console.error('Error saving to question bank:', error);
    } catch (err) {
      console.error('Error saving to question bank:', err);
    }
  };

  const handleSaveDraftQuestion = (addAnother = true) => {
    const currentModuleObj = selectedModules[currentModuleIndex];
    const currentModule = currentModuleObj?.name;
    const isCoding = questionForm.question_type === 'CODING' || currentModule === 'Coding';
    
    const isFormEmpty = !questionForm.question_text.trim();

    // If form is empty but they want to move to next module
    if (isFormEmpty) {
      if (!addAnother) {
        const hasQuestions = draftQuestions.some(q => q.module_id === currentModuleObj.id);
        if (!hasQuestions) return alert("Please add at least one question for this module.");
        
        if (currentModuleIndex < selectedModules.length - 1) {
          setCurrentModuleIndex(currentModuleIndex + 1);
        } else {
          setViewState('instructions_setup');
        }
        return;
      } else {
        return alert("Question text is required.");
      }
    }

    // Validation for non-empty form
    if (!isCoding && (!questionForm.option_a || !questionForm.option_b)) return alert("At least Options A and B are required for MCQs.");

    const newQ = {
      tempId: Date.now().toString(),
      module_id: currentModuleObj.id,
      module_name: currentModule,
      question_type: isCoding ? 'CODING' : 'MCQ',
      ...questionForm
    };

    setDraftQuestions([...draftQuestions, newQ]);
    
    if (saveToBank) {
      saveToQuestionBank(newQ);
    }

    resetQuestionForm();

    if (!addAnother) {
      if (currentModuleIndex < selectedModules.length - 1) {
        setCurrentModuleIndex(currentModuleIndex + 1);
      } else {
        setViewState('instructions_setup');
      }
    }
  };

  // --- BULK ADD & QUESTION BANK HELPERS ---

  const parseBulkText = (text) => {
    // Split by "Question:" or a numbered list pattern like "15. "
    const blocks = text.split(/(?:^|\n)\s*(?=Question:|\d+\.\s+)/i).filter(b => b.trim());
    const parsed = [];
    
    blocks.forEach((block, idx) => {
      const q = { 
        tempId: `bulk_${Date.now()}_${idx}`, 
        question_type: 'MCQ',
        question_text: '',
        difficulty: 'Medium',
        marks: 1,
        test_cases: []
      };
      
      const isCoding = /Description:|Hidden Testcases:/i.test(block);
      if (isCoding) q.question_type = 'CODING';
      
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      let parsingContext = 'question_text';
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith('description:')) {
          parsingContext = 'question_text';
        } else if (lowerLine.startsWith('difficulty:')) {
          q.difficulty = line.substring(11).trim();
          parsingContext = 'skip';
        } else if (lowerLine.startsWith('marks:')) {
          q.marks = parseInt(line.substring(6).trim(), 10) || 1;
          parsingContext = 'skip';
        } else if (!isCoding && (lowerLine.match(/^[a-d][.)]/) || lowerLine.match(/^\([a-d]\)/) || lowerLine.match(/^\([1-4]\)/) || lowerLine.match(/^[1-4][.)]/))) {
          // Single option per line
          let optLetter = 'a';
          if (lowerLine.includes('b.') || lowerLine.includes('2)') || lowerLine.includes('b)')) optLetter = 'b';
          if (lowerLine.includes('c.') || lowerLine.includes('3)') || lowerLine.includes('c)')) optLetter = 'c';
          if (lowerLine.includes('d.') || lowerLine.includes('4)') || lowerLine.includes('d)')) optLetter = 'd';
          q[`option_${optLetter}`] = line.replace(/^([a-d1-4][.)]|\([a-d1-4]\))\s*/i, '').trim();
        } else if (!isCoding && lowerLine.includes('(1)') && lowerLine.includes('(2)') && lowerLine.includes('(3)')) {
          // Multiple options on the same line like: (1) 648  (2) 738  (3) 836  (4) 810
          const parts = line.split(/\([1-4a-d]\)/i).map(s => s.trim()).filter(Boolean);
          if (parts[0]) q.option_a = parts[0];
          if (parts[1]) q.option_b = parts[1];
          if (parts[2]) q.option_c = parts[2];
          if (parts[3]) q.option_d = parts[3];
          parsingContext = 'skip';
        } else if (!isCoding && lowerLine.startsWith('answer:')) {
          q.correct_answer = line.substring(7).trim().toUpperCase().replace(/[()]/g, '');
          parsingContext = 'skip';
        } else if (isCoding && lowerLine.startsWith('input:')) {
           parsingContext = 'skip';
        } else if (isCoding && lowerLine.startsWith('output:')) {
           parsingContext = 'skip';
        } else if (isCoding && lowerLine.startsWith('sample input:')) {
           parsingContext = 'skip';
        } else if (isCoding && lowerLine.startsWith('sample output:')) {
           parsingContext = 'skip';
        } else if (isCoding && lowerLine.startsWith('hidden testcases:')) {
           parsingContext = 'testcases';
        } else if (parsingContext === 'testcases' && line.includes('->')) {
           const [input, output] = line.split('->').map(s => s.trim());
           q.test_cases.push({ input_data: input, expected_output: output, is_hidden: true });
        } else if (parsingContext === 'question_text') {
           // Remove leading "15. " if present
           const cleanLine = line.replace(/^\d+\.\s*/, '');
           q.question_text += (q.question_text ? '\n' : '') + cleanLine;
        }
      });
      
      parsed.push(q);
    });
    
    setParsedQuestions(parsed);
  };

  const handleBulkSave = () => {
    const currentModuleObj = selectedModules[currentModuleIndex];
    const currentModule = currentModuleObj?.name;
    
    const validQuestions = parsedQuestions.filter(q => q.question_text.trim());
    const finalQuestions = validQuestions.map(q => ({
      ...q,
      module_id: currentModuleObj.id,
      module_name: currentModule
    }));

    setDraftQuestions(prev => [...prev, ...finalQuestions]);
    
    if (saveToBank) {
      finalQuestions.forEach(q => saveToQuestionBank(q));
    }
    
    setShowBulkAddModal(false);
    setShowBulkUploadModal(false);
    setBulkText('');
    setParsedQuestions([]);
    alert(`Successfully added ${finalQuestions.length} questions.`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let text = '';
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'txt' || ext === 'json') {
        text = await file.text();
        setBulkText(text);
        parseBulkText(text);
      } else if (ext === 'xlsx' || ext === 'csv') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet);
        
        const mappedQuestions = json.map((row, idx) => {
          // Find keys dynamically regardless of exact header
          const getVal = (...keys) => {
             // 1. Exact match
             for(let k of Object.keys(row)) {
                if(keys.some(key => k.trim().toLowerCase() === key.toLowerCase())) return row[k];
             }
             // 2. Partial match, excluding 'no', 'number', 'id'
             for(let k of Object.keys(row)) {
                const lowerK = k.toLowerCase();
                if(keys.some(key => lowerK.includes(key)) && !lowerK.includes('no') && !lowerK.includes('number') && !lowerK.includes('id')) {
                    return row[k];
                }
             }
             return '';
          };
          
          const qText = getVal('question_text', 'question', 'statement', 'text', 'desc', 'problem');
          const optA = getVal('option a', 'option_a', 'opt a', 'a');
          const optB = getVal('option b', 'option_b', 'opt b', 'b');
          const optC = getVal('option c', 'option_c', 'opt c', 'c');
          const optD = getVal('option d', 'option_d', 'opt d', 'd');
          const ans = getVal('answer', 'correct', 'ans');
          const diff = getVal('difficulty', 'level') || 'Medium';
          const marks = parseInt(getVal('marks', 'score', 'points')) || 1;
          const type = getVal('type', 'format') || (qText ? 'MCQ' : '');

          return {
            tempId: `bulk_csv_${Date.now()}_${idx}`,
            question_type: type.toUpperCase().includes('CODING') ? 'CODING' : 'MCQ',
            question_text: qText ? String(qText) : '',
            option_a: optA ? String(optA) : '',
            option_b: optB ? String(optB) : '',
            option_c: optC ? String(optC) : '',
            option_d: optD ? String(optD) : '',
            correct_answer: ans ? String(ans).toUpperCase().trim() : '',
            difficulty: diff,
            marks: marks,
            test_cases: []
          };
        }).filter(q => q.question_text);
        
        setParsedQuestions(mappedQuestions);
        setBulkText(mappedQuestions.map(q => 
          `Question:\n${q.question_text}\n` + 
          (q.option_a ? `A. ${q.option_a}\n` : '') +
          (q.option_b ? `B. ${q.option_b}\n` : '') +
          (q.option_c ? `C. ${q.option_c}\n` : '') +
          (q.option_d ? `D. ${q.option_d}\n` : '') +
          `Answer: ${q.correct_answer}\nDifficulty: ${q.difficulty}\nMarks: ${q.marks}\n`
        ).join('\n\n'));
      } else if (ext === 'docx') {
        const data = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: data });
        text = result.value;
        setBulkText(text);
        parseBulkText(text);
      } else {
        alert("Unsupported file format. Please use txt, csv, json, xlsx, or docx.");
        return;
      }
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Error parsing file content.');
    }
  };

  const fetchBankQuestions = async () => {
    try {
      const { data, error } = await supabase.from('mock_question_bank').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBankQuestions(data || []);
    } catch (err) {
      console.error('Error fetching question bank:', err);
    }
  };

  const handleImportFromBank = (selectedIds) => {
    const currentModuleObj = selectedModules[currentModuleIndex];
    const currentModule = currentModuleObj?.name;
    
    const selectedQ = bankQuestions.filter(q => selectedIds.includes(q.id));
    const finalQuestions = selectedQ.map(q => {
      const { id, created_at, ...rest } = q;
      return {
        tempId: `bank_${Date.now()}_${id}`,
        module_id: currentModuleObj.id,
        module_name: currentModule,
        ...rest
      };
    });
    
    setDraftQuestions(prev => [...prev, ...finalQuestions]);
    setShowBankImportModal(false);
    alert(`Successfully imported ${finalQuestions.length} questions.`);
  };

  const downloadCsvTemplate = () => {
    const headers = "Question,Option A,Option B,Option C,Option D,Answer,Difficulty,Marks\n";
    const sample = '"What is 2+2?","1","2","3","4","D","Easy",1\n';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Mock_Test_Template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- END BULK HELPERS ---

  const handleSaveAttempts = async () => {
    if (!editAttemptsExam) return;
    try {
      const max_attempts = newAttemptType === 'limited' ? parseInt(newMaxAttempts, 10) || null : null;
      setLoading(true);
      const { error } = await supabase.from('mock_tests').update({ max_attempts }).eq('id', editAttemptsExam.id);
      if (error) throw error;
      await fetchExams();
      setEditAttemptsExam(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update attempts');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantResume = async (attemptId) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('mock_test_attempts').update({
        status: 'in_progress',
        tab_switches: 0
      }).eq('id', attemptId);
      
      if (error) throw error;
      
      const updatedSubmissions = submissions.map(group => {
        if (group.student_id === activeStudentGroup.student_id) {
          return {
            ...group,
            attempts: group.attempts.map(att => 
              att.id === attemptId ? { ...att, status: 'in_progress', tab_switches: 0 } : att
            )
          };
        }
        return group;
      });
      setSubmissions(updatedSubmissions);
      
      setActiveStudentGroup({
        ...activeStudentGroup,
        attempts: activeStudentGroup.attempts.map(att => 
          att.id === attemptId ? { ...att, status: 'in_progress', tab_switches: 0 } : att
        )
      });
      
      alert('Resume access granted successfully. The student can now resume the exam.');
    } catch (err) {
      console.error(err);
      alert('Failed to grant resume access');
    } finally {
      setLoading(false);
    }
  };

  const saveExamToDatabase = async (statusToSave) => {
    try {
      const totalModDuration = selectedModules.reduce((acc, m) => acc + (parseInt(m.duration_minutes) || 0), 0);
      const overallDuration = examForm.duration_minutes ? parseInt(examForm.duration_minutes, 10) : null;

      if (overallDuration && overallDuration < totalModDuration) {
        alert("Overall exam duration cannot be less than total module duration. Please increase the overall exam duration or reduce section times.");
        return;
      }

      setLoading(true);
      // 1. Insert Exam
      const { data: testData, error: testError } = await supabase.from('mock_tests').insert([{
        title: examForm.title,
        description: examForm.instructions ? `${examForm.description}::INSTRUCTIONS::${examForm.instructions}` : examForm.description,
        duration_minutes: examForm.duration_minutes ? parseInt(examForm.duration_minutes, 10) : null,
        allow_calculator: examForm.allow_calculator,
        require_webcam: examForm.require_webcam,
        max_attempts: examForm.attempt_type === 'limited' ? parseInt(examForm.max_attempts, 10) || null : null,
        status: statusToSave
      }]).select();
      if (testError) throw testError;
      
      const newTestId = testData[0].id;

      // 2. Insert Modules
      const modulePayload = selectedModules.map((m, index) => ({ 
        test_id: newTestId, 
        module_id: m.id,
        module_name: m.name,
        duration_minutes: parseInt(m.duration_minutes, 10) || 30,
        question_count: parseInt(m.question_count, 10) || 10,
        order_index: index
      }));
      const { error: modError } = await supabase.from('mock_test_modules').insert(modulePayload);
      if (modError) throw modError;

      // 3. Insert Questions
      if (draftQuestions.length > 0) {
        const mcqQuestions = draftQuestions.filter(q => q.question_type !== 'CODING');
        const codingQuestions = draftQuestions.filter(q => q.question_type === 'CODING');

        // Insert MCQs
        if (mcqQuestions.length > 0) {
          const questionPayload = mcqQuestions.map(q => {
            const { tempId, test_cases, question_type, ...dbReadyQ } = q;
            return { ...dbReadyQ, question_type: 'MCQ', test_id: newTestId };
          });
          const { error: qError } = await supabase.from('mock_test_questions').insert(questionPayload);
          if (qError) throw qError;
        }

        // Insert Coding Questions & Test Cases
        for (const cq of codingQuestions) {
          const { error: cqError, data: cqData } = await supabase.from('mock_test_coding_questions').insert([{
            test_id: newTestId,
            module_id: cq.module_id,
            title: `Coding Problem - ${cq.difficulty}`,
            problem_statement: cq.question_text,
            difficulty: cq.difficulty,
            marks: cq.marks
          }]).select();
          
          if (cqError) throw cqError;

          if (cq.test_cases && cq.test_cases.length > 0) {
            const tcPayload = cq.test_cases.map(tc => ({
              question_id: cqData[0].id,
              input_data: tc.input_data,
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden
            }));
            const { error: tcError } = await supabase.from('mock_test_coding_test_cases').insert(tcPayload);
            if (tcError) throw tcError;
          }
        }
      }

      alert("Exam saved successfully!");
      fetchExams();
      setViewState('list');
    } catch (err) {
      console.error('Error saving exam:', err);
      alert('Failed to save exam to database.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const currentModuleObj = selectedModules[currentModuleIndex];
  const currentModule = currentModuleObj?.name;
  const isCoding = questionForm.question_type === 'CODING' || currentModule === 'Coding';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      {viewState === 'list' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">Mock Test Management</h2>
            <p className="text-theme-text-muted">Create and manage multi-module assessment exams.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/admin/feedback-management?tab=exam')} className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 font-bold rounded-xl transition-colors border border-yellow-500/50 text-sm">
              <Star className="w-4 h-4" /> Exam Feedback
            </button>
            <button onClick={() => setViewState('modules_list')} className="flex items-center gap-2 px-4 py-2.5 bg-brand-secondary/20 hover:bg-brand-secondary/30 text-brand-secondary font-bold rounded-xl transition-colors border border-brand-secondary/50 text-sm">
              <Layers className="w-4 h-4" /> Manage Modules
            </button>
            <button onClick={startNewExam} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-primary/20 text-sm">
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewState === 'list' && (
        <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                <th className="px-6 py-4">Exam Name</th>
                <th className="px-6 py-4">Modules</th>
                <th className="px-6 py-4">Questions</th>
                <th className="px-6 py-4">Attempt Policy</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {exams.length > 0 ? exams.map(exam => (
                <tr key={exam.id} className="hover:bg-theme-glass transition-colors">
                  <td className="px-6 py-4 font-bold text-theme-text">
                    {exam.title}
                    <div className="text-xs text-theme-text-muted font-normal mt-1 truncate max-w-xs">{exam.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(examModules[exam.id] || []).map(m => (
                        <span key={m} className="px-2 py-0.5 bg-theme-glass text-gray-300 rounded text-[10px]">{m}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-theme-text-muted font-mono text-sm">
                    {examQuestionCounts[exam.id] || 0} Qs
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-theme-text-muted">
                      {exam.max_attempts ? `${exam.max_attempts} Attempt${exam.max_attempts > 1 ? 's' : ''}` : 'Unlimited'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${exam.status === 'published' ? 'bg-brand-primary/20 text-brand-primary' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => {
                      setEditAttemptsExam(exam);
                      setNewAttemptType(exam.max_attempts ? 'limited' : 'unlimited');
                      setNewMaxAttempts(exam.max_attempts || '');
                    }} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/20">
                      Policy
                    </button>
                    <button onClick={() => handleViewSubmissions(exam)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 hover:bg-brand-cyan/30">
                      Results
                    </button>
                    <button onClick={() => handleToggleStatus(exam.id, exam.status)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${exam.status === 'published' ? 'bg-theme-card text-theme-text-muted border-theme-border hover:text-theme-text' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                      {exam.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => handleDelete(exam.id)} className="p-1.5 hover:bg-red-500/10 text-white-muted hover:text-red-400 rounded-lg transition-colors border border-transparent">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">No exams found. Click 'Create Exam' to begin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODULES LIST VIEW */}
      {viewState === 'modules_list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewState('list')} className="p-2 bg-theme-glass hover:bg-theme-border rounded-xl transition-colors text-theme-text">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-theme-text">Module Management</h2>
                <p className="text-sm text-theme-text-muted">Create custom dynamic modules for exams.</p>
              </div>
            </div>
            <button onClick={() => { setModuleForm({ id: null, name: '', description: '', icon: '', status: 'Active' }); setViewState('module_form'); }} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Create Module
            </button>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Module Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allModules.length > 0 ? allModules.map(mod => (
                  <tr key={mod.id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4 font-bold text-theme-text">{mod.name}</td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted truncate max-w-[200px]">{mod.description || 'No description'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${mod.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {mod.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{new Date(mod.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEditModule(mod)} className="p-1.5 hover:bg-brand-cyan/20 text-brand-cyan rounded-lg transition-colors border border-transparent">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteModule(mod.id)} className="p-1.5 hover:bg-red-500/10 text-theme-text-muted hover:text-red-400 rounded-lg transition-colors border border-transparent">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">No modules found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODULE FORM VIEW */}
      {(viewState === 'module_form' || viewState === 'module_form_from_step2') && (
        <div className="max-w-2xl mx-auto glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setViewState(viewState === 'module_form_from_step2' ? 'step2' : 'modules_list')} className="p-2 bg-theme-glass hover:bg-theme-border rounded-xl transition-colors text-theme-text"><ArrowLeft className="w-5 h-5"/></button>
            <h3 className="text-2xl font-bold text-theme-text">{moduleForm.id ? 'Edit Module' : 'Create Custom Module'}</h3>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Module Name</label>
              <input type="text" value={moduleForm.name} onChange={e => setModuleForm({...moduleForm, name: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. Advanced Quantitative, Java Programming" />
            </div>
            <div>
              <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Description</label>
              <textarea rows="3" value={moduleForm.description} onChange={e => setModuleForm({...moduleForm, description: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="Provide a short description..."></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Status</label>
              <select value={moduleForm.status} onChange={e => setModuleForm({...moduleForm, status: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none">
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
            <div className="flex justify-end pt-6 border-t border-theme-border">
              <button 
                onClick={() => setViewState(viewState === 'module_form_from_step2' ? 'step2' : 'modules_list')} 
                className="px-6 py-2.5 mr-3 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button onClick={async () => {
                await handleSaveModule();
                if (viewState === 'module_form_from_step2') {
                  setViewState('step2');
                }
              }} disabled={isSavingModule} className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                {isSavingModule ? 'Saving...' : 'Save Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD VIEWS */}
      {['step1', 'step2', 'step3', 'instructions_setup', 'review'].includes(viewState) && (
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-theme-glass -z-10 rounded-full"></div>
            {[
              { id: 'step1', label: 'Basic Info' },
              { id: 'step2', label: 'Modules' },
              { id: 'step3', label: 'Questions' },
              { id: 'instructions_setup', label: 'Instructions' },
              { id: 'review', label: 'Review' }
            ].map((step, idx) => {
              const isActive = viewState === step.id;
              const isPast = ['step1', 'step2', 'step3', 'instructions_setup', 'review'].indexOf(viewState) > idx;
              return (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${isActive ? 'bg-brand-primary border-brand-primary text-theme-text' : isPast ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-theme-card border-theme-border text-gray-500'}`}>
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-brand-primary' : isPast ? 'text-emerald-400' : 'text-gray-500'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Step 1: Basic Info */}
          {viewState === 'step1' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border">
              <h3 className="text-2xl font-bold text-theme-text mb-6">Exam Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Exam Name</label>
                  <input type="text" value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none text-lg" placeholder="e.g. TCS Master Assessment 2026" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Description</label>
                  <textarea rows="4" value={examForm.description} onChange={e => setExamForm({...examForm, description: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="Provide instructions or details about this exam..."></textarea>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Overall Exam Time Limit (Optional)</label>
                  <input type="number" min="1" value={examForm.duration_minutes} onChange={e => setExamForm({...examForm, duration_minutes: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none text-lg" placeholder="Leave empty for section-timers only" />
                  <p className="text-gray-500 text-xs mt-1">If provided, this represents the maximum duration allowed for the entire exam.</p>
                </div>
                <div className="pt-6 border-t border-theme-border">
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-brand-secondary" /> Calculator Settings
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-theme-card border border-theme-border rounded-xl">
                    <div>
                      <h4 className="text-theme-text font-bold text-sm">Allow Calculator</h4>
                      <p className="text-xs text-theme-text-muted mt-1">If enabled, a basic calculator will be available to students in non-coding sections.</p>
                    </div>
                    <button
                      onClick={() => setExamForm({...examForm, allow_calculator: !examForm.allow_calculator})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${examForm.allow_calculator ? 'bg-brand-primary' : 'bg-theme-border'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${examForm.allow_calculator ? 'translate-x-6' : ''}`}></div>
                    </button>
                  </div>
                </div>
                <div className="pt-6 border-t border-theme-border">
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-brand-secondary" /> Security Settings
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-theme-card border border-theme-border rounded-xl">
                    <div>
                      <h4 className="text-theme-text font-bold text-sm">Require Webcam Proctoring</h4>
                      <p className="text-xs text-theme-text-muted mt-1">If enabled, students must allow webcam access. The system will capture snapshots periodically during the exam.</p>
                    </div>
                    <button
                      onClick={() => setExamForm({...examForm, require_webcam: !examForm.require_webcam})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${examForm.require_webcam ? 'bg-brand-primary' : 'bg-theme-border'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${examForm.require_webcam ? 'translate-x-6' : ''}`}></div>
                    </button>
                  </div>
                </div>
                <div className="pt-6 border-t border-theme-border">
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-secondary" /> Attempt Settings
                  </h3>
                  <div className="bg-theme-card border border-theme-border rounded-xl p-5 space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="attempt_type" value="unlimited" checked={examForm.attempt_type === 'unlimited'} onChange={() => setExamForm({...examForm, attempt_type: 'unlimited'})} className="text-brand-primary focus:ring-brand-primary" />
                        <span className="text-theme-text font-bold text-sm">Unlimited Attempts</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="attempt_type" value="limited" checked={examForm.attempt_type === 'limited'} onChange={() => setExamForm({...examForm, attempt_type: 'limited'})} className="text-brand-primary focus:ring-brand-primary" />
                        <span className="text-theme-text font-bold text-sm">Limited Attempts</span>
                      </label>
                    </div>
                    {examForm.attempt_type === 'limited' && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Maximum Attempts</label>
                        <input type="number" min="1" value={examForm.max_attempts} onChange={e => setExamForm({...examForm, max_attempts: e.target.value})} className="w-full max-w-[200px] bg-brand-bg border border-theme-border rounded-xl py-2 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. 1, 2, 3" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-theme-border">
                  <button onClick={() => setViewState('list')} className="px-6 py-3 mr-4 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-theme-text">Cancel</button>
                  <button onClick={() => { if(!examForm.title) alert('Title required'); else setViewState('step2'); }} className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Modules */}
          {viewState === 'step2' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-theme-text mb-2">Select Modules</h3>
                  <p className="text-theme-text-muted">Choose which sections to include in this exam.</p>
                </div>
                <button 
                  onClick={() => { setModuleForm({ id: null, name: '', description: '', icon: '', status: 'Active' }); setViewState('module_form_from_step2'); }} 
                  className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/20 hover:bg-brand-secondary/30 text-brand-secondary font-bold rounded-lg transition-colors border border-brand-secondary/50 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add New Module
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {allModules.filter(m => m.status === 'Active').map(mod => {
                  const modObj = selectedModules.find(m => m.id === mod.id);
                  const isSelected = !!modObj;
                  return (
                    <div key={mod.id} className={`p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-brand-primary/10 border-brand-primary/50' : 'bg-brand-bg border-theme-border hover:border-white/20'}`}>
                      <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => toggleModule(mod)}>
                        <div className="flex flex-col">
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-theme-text-muted'}`}>{mod.name}</span>
                          {mod.description && <span className="text-[10px] text-gray-500">{mod.description}</span>}
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-600'}`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-theme-border space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">Duration (mins)</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={modObj.duration_minutes} 
                              onChange={(e) => updateModuleConfig(mod.id, 'duration_minutes', e.target.value)}
                              className="w-full bg-theme-card-alt border border-theme-border rounded-lg px-3 py-1.5 text-theme-text text-sm focus:border-brand-primary outline-none" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">Total Questions</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={modObj.question_count} 
                              onChange={(e) => updateModuleConfig(mod.id, 'question_count', e.target.value)}
                              className="w-full bg-theme-card-alt border border-theme-border rounded-lg px-3 py-1.5 text-theme-text text-sm focus:border-brand-primary outline-none" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedModules.length > 0 && (
                <div className="bg-theme-card border border-theme-border rounded-xl p-6 mb-8 flex justify-around text-center">
                  <div>
                    <div className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Total Modules</div>
                    <div className="text-2xl font-black text-white">{selectedModules.length}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Total Questions</div>
                    <div className="text-2xl font-black text-brand-secondary">
                      {selectedModules.reduce((acc, m) => acc + (parseInt(m.question_count) || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-1">Total Module Duration</div>
                    <div className="text-2xl font-black text-emerald-400">
                      {selectedModules.reduce((acc, m) => acc + (parseInt(m.duration_minutes) || 0), 0)} <span className="text-sm font-medium text-gray-400">mins</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-theme-border">
                <button onClick={() => setViewState('step1')} className="px-6 py-3 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-theme-text flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Back</button>
                <button onClick={() => { if(selectedModules.length===0) alert('Select at least one module'); else setViewState('step3'); }} className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Questions */}
          {viewState === 'step3' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-theme-border gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-theme-text mb-1">Add Questions</h3>
                  <p className="text-theme-text-muted">Current Module: <span className="text-brand-primary font-bold">{currentModule}</span> ({currentModuleIndex + 1} of {selectedModules.length})</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="mr-4 text-right hidden lg:block">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-theme-text-muted">Added</div>
                    <div className="text-xl font-mono text-brand-primary font-bold">{draftQuestions.filter(q => q.module_name === currentModule).length}</div>
                  </div>
                  <button onClick={() => setShowBankImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan text-sm font-bold rounded-lg transition-colors border border-brand-cyan/50">
                    <Database className="w-4 h-4" /> Import Bank
                  </button>
                  <button onClick={() => setShowBulkAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 text-sm font-bold rounded-lg transition-colors border border-yellow-500/50">
                    <ListPlus className="w-4 h-4" /> Bulk Add
                  </button>
                  <button onClick={() => setShowBulkUploadModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-brand-secondary/20 hover:bg-brand-secondary/30 text-brand-secondary text-sm font-bold rounded-lg transition-colors border border-brand-secondary/50">
                    <UploadCloud className="w-4 h-4" /> Bulk File
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Question Type</label>
                  <select 
                    value={questionForm.question_type} 
                    onChange={e => setQuestionForm({...questionForm, question_type: e.target.value})} 
                    className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none font-medium"
                  >
                    <option value="MCQ">Multiple Choice Question (MCQ)</option>
                    <option value="CODING">Coding Problem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">{isCoding ? 'Problem Statement' : 'Question Text'}</label>
                  <textarea rows="4" value={questionForm.question_text} onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none font-medium" placeholder="Type the question here..."></textarea>
                </div>

                {!isCoding && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const key = `option_${opt.toLowerCase()}`;
                      return (
                        <div key={opt}>
                          <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Option {opt}</label>
                          <input type="text" value={questionForm[key]} onChange={e => setQuestionForm({...questionForm, [key]: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-2.5 px-4 text-sm text-theme-text focus:border-brand-primary outline-none" />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme-border">
                  {!isCoding && (
                    <div>
                      <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-brand-primary">Correct Answer</label>
                      <select value={questionForm.correct_answer} onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})} className="w-full bg-brand-primary/10 border border-brand-primary/30 rounded-xl py-3 px-4 text-sm text-brand-primary font-bold focus:border-brand-primary outline-none">
                        {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>Option {o}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Difficulty Level</label>
                      <div className="flex gap-2">
                        {DIFFICULTIES.map(d => (
                          <button key={d} onClick={() => setQuestionForm({...questionForm, difficulty: d})} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${questionForm.difficulty === d ? 'bg-brand-primary/20 text-brand-primary border-brand-primary' : 'bg-theme-card text-theme-text-muted border-theme-border hover:border-theme-text-muted'}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Marks</label>
                      <input type="number" min="1" value={questionForm.marks} onChange={e => setQuestionForm({...questionForm, marks: parseInt(e.target.value) || 1})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="1" />
                    </div>
                  </div>
                </div>

                {!isCoding && (
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Explanation</label>
                    <textarea rows="2" value={questionForm.explanation} onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Explain the answer..."></textarea>
                  </div>
                )}

                {isCoding && (
                  <div className="pt-4 border-t border-theme-border">
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-xs font-bold text-theme-text-muted uppercase tracking-wider">Test Cases</label>
                      <button 
                        onClick={() => setQuestionForm({...questionForm, test_cases: [...questionForm.test_cases, { input_data: '', expected_output: '', is_hidden: false }]})}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary/20 text-brand-primary rounded-lg text-xs font-bold hover:bg-brand-primary hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Test Case
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {questionForm.test_cases.map((tc, idx) => (
                        <div key={idx} className="p-4 bg-theme-card-alt border border-theme-border rounded-xl relative group">
                          <button 
                            onClick={() => {
                              const newTc = [...questionForm.test_cases];
                              newTc.splice(idx, 1);
                              setQuestionForm({...questionForm, test_cases: newTc});
                            }}
                            className="absolute top-2 right-2 p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-[10px] font-bold text-theme-text-muted uppercase mb-1">Input Data</label>
                              <textarea 
                                rows="2" 
                                value={tc.input_data} 
                                onChange={(e) => {
                                  const newTc = [...questionForm.test_cases];
                                  newTc[idx].input_data = e.target.value;
                                  setQuestionForm({...questionForm, test_cases: newTc});
                                }}
                                className="w-full bg-brand-bg border border-theme-border rounded-lg p-2 text-xs font-mono text-theme-text focus:border-brand-primary outline-none" 
                                placeholder="5" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-theme-text-muted uppercase mb-1">Expected Output</label>
                              <textarea 
                                rows="2" 
                                value={tc.expected_output} 
                                onChange={(e) => {
                                  const newTc = [...questionForm.test_cases];
                                  newTc[idx].expected_output = e.target.value;
                                  setQuestionForm({...questionForm, test_cases: newTc});
                                }}
                                className="w-full bg-brand-bg border border-theme-border rounded-lg p-2 text-xs font-mono text-theme-text focus:border-brand-primary outline-none" 
                                placeholder="120" 
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={tc.is_hidden} 
                              onChange={(e) => {
                                const newTc = [...questionForm.test_cases];
                                newTc[idx].is_hidden = e.target.checked;
                                setQuestionForm({...questionForm, test_cases: newTc});
                              }}
                              className="w-4 h-4 rounded border-theme-border bg-theme-bg text-brand-primary focus:ring-brand-primary" 
                            />
                            <label className="text-xs text-theme-text-muted font-bold">Hidden Test Case (Used for evaluation only, hidden from student)</label>
                          </div>
                        </div>
                      ))}
                      {questionForm.test_cases.length === 0 && (
                        <div className="text-center py-6 text-theme-text-muted text-sm border border-dashed border-theme-border rounded-xl">
                          No test cases added. Click "Add Test Case" to create inputs and expected outputs.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center pt-6 mt-6 border-t border-theme-border gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="saveToBank"
                      checked={saveToBank} 
                      onChange={(e) => setSaveToBank(e.target.checked)}
                      className="w-4 h-4 rounded border-theme-border bg-theme-bg text-brand-primary focus:ring-brand-primary" 
                    />
                    <label htmlFor="saveToBank" className="text-xs text-theme-text-muted font-bold cursor-pointer">
                      Save to reusable Question Bank
                    </label>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setViewState('step2')} className="px-6 py-3 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-theme-text flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Back</button>
                    <button onClick={() => handleSaveDraftQuestion(true)} className="px-6 py-3 bg-theme-card border border-brand-secondary/50 text-brand-secondary hover:bg-brand-secondary hover:text-white rounded-xl font-bold transition-colors">
                      Save & Add Another
                    </button>
                    <button onClick={() => handleSaveDraftQuestion(false)} className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/80 transition-colors">
                      {currentModuleIndex < selectedModules.length - 1 ? 'Next Module' : 'Setup Instructions'} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3.5: Instructions Setup */}
          {viewState === 'instructions_setup' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card bg-theme-card/80 border border-theme-border rounded-3xl p-8 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-theme-text tracking-tight">Exam Instructions</h2>
                  <p className="text-theme-text-muted mt-2">Define the custom rules and instructions students will see before starting the exam.</p>
                </div>
                <button 
                  onClick={() => setExamForm(prev => ({
                    ...prev, 
                    instructions: "Read all questions carefully.\n\nDo not switch tabs or exit fullscreen.\n\nCalculator is available only for non-coding sections.\n\nCoding sections do not allow calculators.\n\nModule submission is final and cannot be reversed.\n\nAll answers are auto-saved.\n\nEnsure a stable internet connection before starting."
                  }))}
                  className="px-4 py-2 bg-theme-glass hover:bg-theme-border text-theme-text rounded-xl font-bold transition-colors border border-theme-border flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4"/> Load Default Template
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Custom Instructions</label>
                  <textarea
                    value={examForm.instructions || ''}
                    onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                    rows={12}
                    placeholder="Enter instructions here. Line breaks are supported..."
                    className="w-full bg-theme-bg border border-theme-border rounded-xl py-4 px-5 text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all font-serif resize-y"
                  ></textarea>
                  <div className="text-right text-xs text-theme-text-muted font-bold mt-2">
                    {(examForm.instructions || '').length} characters
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-theme-border">
                  <button onClick={() => setViewState('step3')} className="px-6 py-3 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-theme-text flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Back to Questions</button>
                  <button onClick={() => setViewState('review')} className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors shadow-lg shadow-brand-primary/20">
                    Review Exam <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {viewState === 'review' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-gray-900 rounded-lg shadow-2xl overflow-hidden">
              <div className="bg-gray-100 p-8 border-b border-gray-300">
                <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">{examForm.title}</h1>
                <p className="text-gray-600 font-medium mb-6">{examForm.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedModules.map(m => (
                    <span key={m.name} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold uppercase tracking-widest border border-gray-300">{m.name}</span>
                  ))}
                </div>
              </div>

              <div className="p-8 space-y-12 bg-white">
                {selectedModules.map((mod, modIdx) => {
                  const modQs = draftQuestions.filter(q => q.module_name === mod.name);
                  if (modQs.length === 0) return null;
                  
                  return (
                    <div key={mod.name} className="break-inside-avoid">
                      <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-900 pb-2 mb-6 flex items-center gap-3">
                        <span className="text-brand-primary">Part {modIdx + 1}:</span> {mod.name}
                      </h2>
                      
                      <div className="space-y-8">
                        {modQs.map((q, qIdx) => (
                          <div key={q.tempId} className="pl-4 border-l-4 border-gray-200">
                            <div className="flex gap-4">
                              <span className="font-bold text-gray-900">{qIdx + 1}.</span>
                              <div className="flex-1 space-y-4">
                                <p className="text-lg text-gray-900 whitespace-pre-wrap font-serif">{q.question_text}</p>
                                
                                {q.question_type === 'MCQ' && (
                                  <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-gray-700">
                                    <div className={q.correct_answer === 'A' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'px-2 py-1'}>a) {q.option_a}</div>
                                    <div className={q.correct_answer === 'B' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'px-2 py-1'}>b) {q.option_b}</div>
                                    <div className={q.correct_answer === 'C' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'px-2 py-1'}>c) {q.option_c}</div>
                                    <div className={q.correct_answer === 'D' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded' : 'px-2 py-1'}>d) {q.option_d}</div>
                                  </div>
                                )}
                                
                                {q.question_type === 'CODING' && (
                                  <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 font-mono text-center">
                                    [ Code Editor Placeholder for Student ]
                                  </div>
                                )}
                                
                                <div className="text-xs text-gray-500 flex gap-4 uppercase tracking-wider">
                                  <span>Difficulty: <span className="font-bold">{q.difficulty}</span></span>
                                  <span>Marks: <span className="font-bold">{q.marks}</span></span>
                                  {q.question_type === 'MCQ' && q.explanation && <span>Explanation attached</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Footer overlay (dark mode styling to stand out from the paper) */}
              <div className="bg-brand-bg border-t border-theme-border p-6 flex justify-between items-center sticky bottom-0 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <button onClick={() => setViewState('step3')} className="px-6 py-3 rounded-xl text-sm font-semibold text-theme-text-muted hover:text-theme-text flex items-center gap-2"><Edit2 className="w-4 h-4"/> Edit Exam</button>
                <div className="flex gap-4">
                  <button onClick={() => saveExamToDatabase('draft')} disabled={loading} className="px-6 py-3 bg-theme-card border border-theme-border text-theme-text hover:bg-theme-glass rounded-xl font-bold transition-colors">
                    Save as Draft
                  </button>
                  <button onClick={() => saveExamToDatabase('published')} disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors shadow-lg shadow-brand-primary/20">
                    <CheckCircle2 className="w-5 h-5" /> Publish Exam
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* RESULTS VIEWS */}
      {viewState === 'submissions_list' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setViewState('list')} className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-theme-text tracking-tight">Submissions: {activeReviewExam?.title}</h2>
              <p className="text-theme-text-muted">Review student attempts for this exam.</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Student Email</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {submissions.length > 0 ? submissions.map(studentGroup => (
                  <tr key={studentGroup.student_id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4 text-theme-text font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary"><User className="w-4 h-4"/></div>
                      <div>
                        {studentGroup.email}
                        <div className="text-xs text-theme-text-muted font-normal mt-0.5">{studentGroup.attempts.length} Attempt{studentGroup.attempts.length > 1 ? 's' : ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-theme-text-muted text-sm">
                      {new Date(studentGroup.latest_attempt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setActiveStudentGroup(studentGroup); setViewState('student_attempts_list'); }} className="px-4 py-2 bg-theme-card border border-theme-border text-theme-text hover:bg-theme-glass rounded-xl font-bold transition-colors text-xs flex items-center gap-2 ml-auto">
                        <Eye className="w-4 h-4" /> View Attempts
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500 text-sm">No submissions found for this exam yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {viewState === 'student_attempts_list' && activeStudentGroup && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setViewState('submissions_list')} className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-theme-text tracking-tight">Student Attempts</h2>
              <p className="text-theme-text-muted">Viewing attempts for <span className="text-brand-primary font-bold">{activeStudentGroup.email}</span></p>
            </div>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4">Attempt #</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Marks</th>
                  <th className="px-6 py-4">Security Status</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeStudentGroup.attempts.map((attempt, idx) => (
                  <tr key={attempt.id} className="hover:bg-theme-glass transition-colors">
                    <td className="px-6 py-4 text-theme-text font-bold">
                      Attempt {activeStudentGroup.attempts.length - idx}
                    </td>
                    <td className="px-6 py-4 text-theme-text-muted text-sm">
                      {new Date(attempt.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-theme-text font-mono font-bold">
                      {attempt.total_score || 0}
                    </td>
                    <td className="px-6 py-4">
                      {attempt.tab_switches > 0 ? (
                        <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center gap-2 w-max">
                          <AlertTriangle className="w-3 h-3" /> {attempt.tab_switches} Tab Switches
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-2 w-max">
                          <CheckCircle2 className="w-3 h-3" /> Clean
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${attempt.status === 'disqualified' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'}`}>
                        {attempt.status || 'completed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {attempt.status === 'disqualified' && (
                        <button onClick={() => handleGrantResume(attempt.id)} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl font-bold transition-colors text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Grant Resume
                        </button>
                      )}
                      <button onClick={() => handleReviewDetail(attempt)} className="px-4 py-2 bg-brand-primary text-white hover:bg-brand-secondary rounded-xl font-bold transition-colors text-xs flex items-center gap-2 shadow-lg shadow-brand-primary/20">
                        <Eye className="w-4 h-4" /> Review Answers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {viewState === 'submission_detail' && activeSubmission && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewState('student_attempts_list')} className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-theme-text tracking-tight">Reviewing Answers</h2>
                <p className="text-theme-text-muted">Student: <span className="text-brand-primary font-bold">{activeSubmission.profiles?.email}</span></p>
              </div>
            </div>
            
            {/* Simple Auto-Grader Score for MCQs */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
              <div className="text-emerald-500 font-bold uppercase text-xs tracking-wider">MCQ Auto-Score</div>
              <div className="text-2xl font-black text-emerald-400">
                {reviewQuestions.filter(q => q.question_type === 'MCQ' && reviewAnswers[q.id]?.selected_option === q.correct_answer).length} 
                <span className="text-emerald-500/50 text-lg"> / {reviewQuestions.filter(q => q.question_type === 'MCQ').length}</span>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-theme-border mb-6">
            <button
              onClick={() => setReviewTab('answers')}
              className={`px-6 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 ${reviewTab === 'answers' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-theme-text-muted hover:text-theme-text'}`}
            >
              Exam Answers
            </button>
            <button
              onClick={() => setReviewTab('proctoring')}
              className={`px-6 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 ${reviewTab === 'proctoring' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-theme-text-muted hover:text-theme-text'}`}
            >
              Proctoring Logs <span className="ml-2 bg-theme-border text-theme-text-muted px-2 py-0.5 rounded-full text-xs">{proctoringLogs.length}</span>
            </button>
          </div>

          {reviewTab === 'answers' && (
            <div className="space-y-6">
              {reviewQuestions.map((q, i) => {
              const answer = reviewAnswers[q.id];
              const isMCQ = q.question_type === 'MCQ';
              const isCorrect = isMCQ && answer?.selected_option === q.correct_answer;
              
              return (
                <div key={q.id} className="glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${isMCQ ? (isCorrect ? 'bg-emerald-500' : 'bg-red-500') : 'bg-brand-secondary'}`}></div>
                  
                  <div className="flex justify-between items-start mb-4 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-theme-glass text-gray-300 font-bold text-xs uppercase tracking-wider rounded">{q.module_name}</span>
                      <span className="text-theme-text-muted text-sm font-bold">Question {i + 1}</span>
                    </div>
                    {isMCQ ? (
                      <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${(answer?.is_evaluated || answer?.status === 'evaluated') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {(answer?.is_evaluated || answer?.status === 'evaluated') ? 'Evaluated' : 'Pending Evaluation'}
                      </span>
                    )}
                  </div>

                  <p className="text-lg text-theme-text font-medium mb-6 whitespace-pre-wrap leading-relaxed pl-4">
                    {q.question_text}
                  </p>

                  {isMCQ && (
                    <div className="space-y-2 pl-4">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const optionText = q[`option_${opt.toLowerCase()}`];
                        if (!optionText) return null;
                        
                        const isStudentAnswer = answer?.selected_option === opt;
                        const isActuallyCorrect = q.correct_answer === opt;
                        
                        let optionClass = "bg-theme-card border-theme-border text-theme-text-muted";
                        if (isActuallyCorrect) optionClass = "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold";
                        else if (isStudentAnswer && !isActuallyCorrect) optionClass = "bg-red-500/10 border-red-500/50 text-red-400";

                        return (
                          <div key={opt} className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 ${optionClass}`}>
                            <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center opacity-70">
                              <span className="text-[10px]">{opt}</span>
                            </div>
                            <span className="text-base">{optionText}</span>
                            {isStudentAnswer && <span className="ml-auto text-xs uppercase tracking-widest font-black opacity-50">Student's Answer</span>}
                          </div>
                        );
                      })}
                      {q.explanation && (
                         <div className="mt-4 p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                            <span className="text-brand-primary font-bold text-xs uppercase tracking-wider block mb-1">Explanation</span>
                            <span className="text-gray-300 text-sm">{q.explanation}</span>
                         </div>
                      )}
                    </div>
                  )}

                  {!isMCQ && (
                    <div className="pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-brand-secondary font-bold text-xs uppercase tracking-wider">Student's Code Response</span>
                        <span className="text-xs text-theme-text-muted bg-theme-glass px-2 py-1 rounded font-mono">{answer?.language || answer?.code_language || 'N/A'}</span>
                      </div>
                      <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-theme-border mb-6">
                        <Editor
                          value={answer?.code || answer?.code_response || '// No code submitted'}
                          onValueChange={() => {}}
                          highlight={code => Prism.highlight(code, getPrismLanguage(answer?.language || answer?.code_language), 'javascript')}
                          padding={20}
                          className="font-mono text-sm opacity-90 cursor-not-allowed"
                          disabled={true}
                          style={{ fontFamily: '"Fira Code", monospace', backgroundColor: '#1e1e1e', color: '#d4d4d4' }}
                        />
                      </div>
                      
                      {/* AI Evaluation Results */}
                      {answer?.status === 'evaluated' && (
                        <div className="mb-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-theme-card border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-theme-text-muted uppercase tracking-wider font-bold mb-1">Test Cases Passed</span>
                              <div className="text-2xl font-black text-emerald-400">{answer.test_cases_passed} <span className="text-sm text-theme-text-muted">/ {answer.total_test_cases}</span></div>
                            </div>
                            <div className="bg-theme-card border border-theme-border rounded-xl p-4 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-theme-text-muted uppercase tracking-wider font-bold mb-1">AI Bonus Marks</span>
                              <div className="text-2xl font-black text-brand-primary">+{answer.ai_bonus}</div>
                            </div>
                          </div>
                          
                          {answer.ai_feedback && Object.keys(answer.ai_feedback).length > 0 && (
                            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-6">
                              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                                AI Code Review <CheckCircle2 className="w-4 h-4" />
                              </h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h5 className="text-xs font-bold text-emerald-400 mb-2 uppercase">Strengths</h5>
                                  <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                                    {(answer.ai_feedback.strengths || []).map((s, idx) => <li key={idx}>{s}</li>)}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-red-400 mb-2 uppercase">Weaknesses</h5>
                                  <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                                    {(answer.ai_feedback.weaknesses || []).map((w, idx) => <li key={idx}>{w}</li>)}
                                  </ul>
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-brand-primary/10">
                                <h5 className="text-xs font-bold text-brand-secondary mb-2 uppercase">Suggestions</h5>
                                <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                                  {(answer.ai_feedback.suggestions || []).map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-theme-card-alt/50 border border-theme-border p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Override Final Marks</label>
                          <input 
                            type="number" 
                            min="0" 
                            max={(q.marks || 1) + 2} // Add AI bonus potential
                            value={codingEvaluations[q.id] !== undefined ? codingEvaluations[q.id] : (answer?.score || 0)}
                            onChange={(e) => setCodingEvaluations({...codingEvaluations, [q.id]: parseInt(e.target.value) || 0})}
                            className="bg-theme-card border border-theme-border text-theme-text font-mono text-center rounded-lg w-20 py-2 px-3 outline-none focus:border-brand-primary"
                          />
                        </div>
                        <button 
                          onClick={() => handleSaveEvaluation(q.id)}
                          className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg font-bold text-sm transition-colors shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.2)]"
                        >
                          Save Final Grade
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}

          {reviewTab === 'proctoring' && (
            <div className="space-y-6">
              {proctoringLogs.length === 0 ? (
                <div className="text-center py-20 bg-theme-card border border-theme-border rounded-[32px]">
                  <Camera className="w-16 h-16 text-theme-text-muted/30 mx-auto mb-4" />
                  <h3 className="text-2xl font-black text-theme-text mb-2 tracking-tight">No Proctoring Logs</h3>
                  <p className="text-theme-text-muted">Webcam proctoring was either disabled for this exam, or the student bypassed it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {proctoringLogs.map((log, i) => (
                    <div key={log.id} className="bg-theme-card border border-theme-border rounded-3xl overflow-hidden shadow-lg">
                      <div className="bg-brand-bg/50 px-4 py-3 border-b border-theme-border flex items-center justify-between">
                        <span className="text-theme-text font-bold text-sm">Snapshot {i + 1}</span>
                        <span className="text-theme-text-muted text-xs">{new Date(log.captured_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="aspect-video bg-black relative">
                        <img src={log.snapshot_base64} alt={`Proctoring Snapshot ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* BULK UPLOAD MODAL */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkUploadModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-theme-bg border border-theme-border rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
              <UploadCloud className="w-12 h-12 text-brand-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-theme-text mb-2">Upload File</h2>
              <p className="text-sm text-theme-text-muted mb-4">Support for CSV, TXT, JSON, XLSX, DOCX.</p>
              
              <button onClick={downloadCsvTemplate} className="mb-6 text-brand-primary hover:text-brand-secondary text-xs font-bold underline">
                Download CSV Template
              </button>

              <input type="file" accept=".csv,.txt,.json,.xlsx,.docx" onChange={async (e) => {
                 await handleFileUpload(e);
                 setShowBulkUploadModal(false);
                 setShowBulkAddModal(true);
              }} className="w-full text-sm text-theme-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/20 file:text-brand-primary hover:file:bg-brand-primary hover:file:text-white transition-colors cursor-pointer" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK ADD MODAL */}
      <AnimatePresence>
        {showBulkAddModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkAddModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-6xl bg-theme-bg border border-theme-border rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
              <div className="p-6 border-b border-theme-border bg-theme-card flex justify-between items-center">
                <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2"><ListPlus className="w-6 h-6 text-brand-primary" /> Bulk Add Questions</h2>
                <button onClick={() => setShowBulkAddModal(false)} className="text-theme-text-muted hover:text-white"><XCircle className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 flex overflow-hidden min-h-[400px]">
                {/* Left side: Input */}
                <div className="flex-1 p-6 flex flex-col border-r border-theme-border overflow-y-auto">
                  <label className="text-xs font-bold text-theme-text-muted uppercase mb-2">Paste Raw Text or Review Upload</label>
                  <textarea 
                    value={bulkText}
                    onChange={e => {
                      setBulkText(e.target.value);
                      parseBulkText(e.target.value);
                    }}
                    className="flex-1 w-full bg-theme-card border border-theme-border rounded-xl p-4 text-theme-text font-mono text-sm focus:border-brand-primary outline-none whitespace-pre-wrap min-h-[300px]"
                    placeholder={`Question:\nWhat is 2+2?\nA. 1\nB. 2\nC. 3\nD. 4\nAnswer: D\nDifficulty: Easy\nMarks: 1\n\nQuestion:\nReverse a String\nDescription:\nGiven a string, reverse it.\nHidden Testcases:\nabc -> cba`}
                  />
                </div>
                {/* Right side: Live Preview */}
                <div className="w-[450px] bg-theme-card-alt p-6 overflow-y-auto flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-theme-text">Live Preview</h3>
                    <div className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-md border border-brand-primary/20">
                      {parsedQuestions.length} Questions Detected
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    {parsedQuestions.map((q, idx) => (
                      <div key={idx} className="bg-theme-card border border-theme-border p-3 rounded-xl shadow-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${q.question_type === 'CODING' ? 'bg-purple-500/20 text-purple-400' : 'bg-brand-primary/20 text-brand-primary'}`}>
                            {q.question_type}
                          </span>
                          <div className="flex gap-2">
                            <span className="text-[10px] bg-theme-bg px-2 py-0.5 rounded text-theme-text-muted border border-theme-border">{q.difficulty}</span>
                            <span className="text-[10px] bg-theme-bg px-2 py-0.5 rounded text-theme-text-muted border border-theme-border">{q.marks} Marks</span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-theme-text line-clamp-2">{q.question_text || 'No Question Text'}</p>
                      </div>
                    ))}
                    {parsedQuestions.length === 0 && (
                      <div className="text-center py-10 text-theme-text-muted text-sm border border-dashed border-theme-border rounded-xl">
                        Awaiting input. Paste your questions on the left.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-theme-border bg-theme-card flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="bulkSaveToBank" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)} className="w-4 h-4 rounded border-theme-border bg-theme-bg text-brand-primary focus:ring-brand-primary" />
                  <label htmlFor="bulkSaveToBank" className="text-sm font-bold text-theme-text cursor-pointer">Save to reusable Question Bank</label>
                </div>
                <button 
                  onClick={handleBulkSave}
                  disabled={parsedQuestions.length === 0}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save {parsedQuestions.length} Questions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BANK IMPORT MODAL */}
      <AnimatePresence>
        {showBankImportModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBankImportModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative w-full max-w-4xl bg-theme-bg border border-theme-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onAnimationComplete={() => fetchBankQuestions()}
            >
              <div className="p-6 border-b border-theme-border bg-theme-card flex justify-between items-center">
                <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2"><Database className="w-6 h-6 text-brand-cyan" /> Question Bank</h2>
                <button onClick={() => setShowBankImportModal(false)} className="text-theme-text-muted hover:text-white"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <div className="p-6 border-b border-theme-border flex gap-4 bg-theme-bg">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
                  <input 
                    type="text"
                    value={bankSearchQuery}
                    onChange={e => setBankSearchQuery(e.target.value)}
                    placeholder="Search question text..."
                    className="w-full bg-theme-card border border-theme-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-theme-text focus:border-brand-cyan outline-none"
                  />
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto bg-theme-card/30">
                <div className="space-y-3">
                  {bankQuestions.filter(q => q.question_text.toLowerCase().includes(bankSearchQuery.toLowerCase())).map(q => (
                    <div key={q.id} className="flex gap-4 p-4 bg-theme-card border border-theme-border hover:border-brand-cyan/50 rounded-xl transition-colors cursor-pointer" onClick={() => {
                      if (selectedBankIds.includes(q.id)) setSelectedBankIds(selectedBankIds.filter(id => id !== q.id));
                      else setSelectedBankIds([...selectedBankIds, q.id]);
                    }}>
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={selectedBankIds.includes(q.id)} 
                          onChange={() => {}} // handled by parent div
                          className="w-5 h-5 rounded border-theme-border text-brand-cyan focus:ring-brand-cyan bg-theme-bg" 
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2 items-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${q.question_type === 'CODING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-brand-primary/20 text-brand-primary border border-brand-primary/20'}`}>
                              {q.question_type}
                            </span>
                            <span className="text-[10px] bg-theme-bg px-2 py-0.5 rounded text-theme-text-muted border border-theme-border">{q.difficulty}</span>
                            <span className="text-[10px] bg-theme-bg px-2 py-0.5 rounded text-theme-text-muted border border-theme-border">{q.marks} Marks</span>
                          </div>
                          <span className="text-xs text-theme-text-muted font-bold px-2 py-1 bg-theme-card-alt rounded-lg border border-theme-border">Module: {q.module_name}</span>
                        </div>
                        <p className="text-sm font-bold text-theme-text">{q.question_text}</p>
                      </div>
                    </div>
                  ))}
                  {bankQuestions.length === 0 && (
                    <div className="text-center py-12 text-theme-text-muted">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Question Bank is empty.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-theme-border bg-theme-card flex justify-between items-center">
                <div className="text-sm font-bold text-theme-text-muted">
                  <span className="text-brand-cyan">{selectedBankIds.length}</span> questions selected
                </div>
                <button 
                  onClick={() => handleImportFromBank(selectedBankIds)}
                  disabled={selectedBankIds.length === 0}
                  className="px-6 py-2.5 bg-brand-cyan hover:bg-brand-cyan/80 text-black font-bold rounded-xl transition-colors shadow-lg shadow-brand-cyan/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Import Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Attempts Modal */}
      <AnimatePresence>
        {editAttemptsExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditAttemptsExam(null)}></div>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-theme-card border border-theme-border p-8 rounded-3xl shadow-2xl relative z-10 max-w-md w-full">
              <h3 className="text-2xl font-bold text-theme-text mb-2">Edit Attempt Policy</h3>
              <p className="text-theme-text-muted mb-6 text-sm">Update the attempt policy for <span className="font-bold text-brand-primary">{editAttemptsExam.title}</span></p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="new_attempt_type" value="unlimited" checked={newAttemptType === 'unlimited'} onChange={() => setNewAttemptType('unlimited')} className="text-brand-primary focus:ring-brand-primary" />
                    <span className="text-theme-text font-bold text-sm">Unlimited Attempts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="new_attempt_type" value="limited" checked={newAttemptType === 'limited'} onChange={() => setNewAttemptType('limited')} className="text-brand-primary focus:ring-brand-primary" />
                    <span className="text-theme-text font-bold text-sm">Limited Attempts</span>
                  </label>
                </div>
                {newAttemptType === 'limited' && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">Maximum Attempts</label>
                    <input type="number" min="1" value={newMaxAttempts} onChange={e => setNewMaxAttempts(e.target.value)} className="w-full bg-brand-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. 1, 2, 3" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setEditAttemptsExam(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-theme-text-muted hover:text-theme-text transition-colors">Cancel</button>
                <button onClick={handleSaveAttempts} className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
