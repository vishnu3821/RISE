import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  ClipboardList, ArrowRight, Clock, Layers, BookOpen, 
  CheckCircle2, AlertCircle, PlayCircle, ArrowLeft, Bookmark, Timer, AlertTriangle, MonitorX, Star, Calculator
} from 'lucide-react';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { autocompletion, completeAnyWord } from '@codemirror/autocomplete';
import { GoogleGenerativeAI } from '@google/generative-ai';
import BasicCalculator from './BasicCalculator';

export default function MockTestsStudent({ searchQuery = '' }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 'list' | 'instructions' | 'countdown' | 'exam' | 'review' | 'success'
  const [viewState, setViewState] = useState('list');
  
  // Data States
  const [availableExams, setAvailableExams] = useState([]);
  const [examModulesMap, setExamModulesMap] = useState({});
  const [studentAttempts, setStudentAttempts] = useState({});
  const [loading, setLoading] = useState(true);

  // Active Exam States
  const [activeExam, setActiveExam] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentAttemptId, setCurrentAttemptId] = useState(null);
  
  // Navigation & Answers
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [activeModules, setActiveModules] = useState([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [transitionCountdown, setTransitionCountdown] = useState(10);
  
  // Timers
  const [countdown, setCountdown] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(null); // Overall exam timer
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(null); // Section timer
  const [tabSwitches, setTabSwitches] = useState(0);

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionConfirmText, setSubmissionConfirmText] = useState('');
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Exam Feedback
  const [examFeedback, setExamFeedback] = useState({
    ratings: {},
    message: '',
    isSubmitting: false
  });

  // Calculator
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  useDocumentTitle(
    viewState === 'exam' || viewState === 'review' || viewState === 'countdown'
      ? `Exam: ${activeExam?.title || 'Mock Test'}`
      : viewState === 'instructions'
        ? `Instructions: ${activeExam?.title || 'Mock Test'}`
        : viewState === 'success'
          ? `Results: ${activeExam?.title || 'Mock Test'}`
          : 'Mock Tests'
  );

  useEffect(() => {
    let interval;
    if (viewState === 'countdown') {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setViewState('exam');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewState]);

  useEffect(() => {
    let interval;
    if (viewState === 'exam' || viewState === 'review') {
      interval = setInterval(() => {
        // Overall timer
        setTimeRemaining(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleFinalSubmit(); // Overall time expired, force submit entire exam
            return 0;
          }
          return prev - 1;
        });

        // Section timer
        setSectionTimeRemaining(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleSectionSubmit(true); // Auto-submit section
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewState]);

  useEffect(() => {
    if (viewState === 'exam' || viewState === 'review') {
      const handleBlur = () => {
        setTabSwitches(prev => prev + 1);
        setShowTabWarning(true);
      };
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }
  }, [viewState]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const [codingEvalStatus, setCodingEvalStatus] = useState({}); // { questionId: { running: boolean, passed: num, total: num, error: string } }

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Run independent queries concurrently
      const [
        { data: testData, error: testError },
        { data: attemptData, error: attemptError }
      ] = await Promise.all([
        supabase.from('mock_tests').select('*').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('mock_test_attempts')
          .select(`
            id, test_id, status, submitted_at,
            mock_test_answers ( obtained_marks ),
            mock_test_coding_answers ( score, ai_bonus )
          `)
          .eq('student_id', user.id)
          .eq('status', 'submitted')
      ]);

      if (testError) throw testError;
      if (attemptError) throw attemptError;

      const testIds = testData ? testData.map(t => t.id) : [];
      let modsMap = {};
      
      if (testIds.length > 0) {
        const { data: modData, error: modError } = await supabase.from('mock_test_modules').select('*').in('test_id', testIds).order('order_index', { ascending: true });
        if (modError) throw modError;
        
        modData.forEach(m => {
          if (!modsMap[m.test_id]) modsMap[m.test_id] = [];
          modsMap[m.test_id].push(m);
        });
      }

      const attemptsMap = {};
      if (attemptData) {
        attemptData.forEach(att => {
           let totalMarks = 0;
           if (att.mock_test_answers) {
             att.mock_test_answers.forEach(ans => totalMarks += (ans.obtained_marks || 0));
           }
           if (att.mock_test_coding_answers) {
             const uniqueCoding = {};
             att.mock_test_coding_answers.forEach(ans => uniqueCoding[ans.question_id] = ans);
             Object.values(uniqueCoding).forEach(ans => totalMarks += (ans.score || 0));
           }
           att.total_score = totalMarks;

           if (!attemptsMap[att.test_id] || new Date(att.submitted_at) > new Date(attemptsMap[att.test_id].submitted_at)) {
             attemptsMap[att.test_id] = att;
           }
        });
      }

      setAvailableExams(testData || []);
      setExamModulesMap(modsMap);
      setStudentAttempts(attemptsMap);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync state with URL
  useEffect(() => {
    if (availableExams.length > 0) {
      const pathParts = location.pathname.split('/');
      const testNameFromUrl = pathParts[3]; // e.g. 'cal'
      
      if (testNameFromUrl) {
        // User is visiting a specific test URL
        const decodedName = decodeURIComponent(testNameFromUrl);
        const exam = availableExams.find(e => e.title === decodedName || e.id === decodedName);
        
        if (exam && (!activeExam || activeExam.id !== exam.id)) {
          handleSelectExam(exam, false);
        }
      } else if (!testNameFromUrl && viewState !== 'list') {
        // User navigated back to the root /dashboard/mock-tests
        // Only allow backing out if not currently taking an exam
        if (viewState !== 'exam' && viewState !== 'countdown') {
          setViewState('list');
          setActiveExam(null);
        } else {
          // If they try to hit back while in an exam, block it by pushing state forward
          navigate(`/dashboard/mock-tests/${encodeURIComponent(activeExam?.title || '')}`, { replace: true });
        }
      }
    }
  }, [location.pathname, availableExams]);

  const handleSelectExam = async (exam, shouldNavigate = true) => {
    if (shouldNavigate) {
      navigate(`/dashboard/mock-tests/${encodeURIComponent(exam.title)}`);
    }
    setActiveExam(exam);
    const mods = examModulesMap[exam.id] || [];
    setActiveModules(mods);
    setCurrentModuleIndex(0);
    setViewState('instructions');
    
    try {
      // Fetch MCQs
      const { data: mcqData, error: mcqError } = await supabase.from('mock_test_questions').select('*').eq('test_id', exam.id);
      if (mcqError) throw mcqError;
      
      // Fetch Coding Questions
      const { data: codingData, error: codingError } = await supabase.from('mock_test_coding_questions').select('*').eq('test_id', exam.id);
      if (codingError) throw codingError;

      let allQuestions = [...(mcqData || [])];

      if (codingData && codingData.length > 0) {
        // Fetch test cases for these coding questions
        const codingIds = codingData.map(c => c.id);
        const { data: tcData, error: tcError } = await supabase.from('mock_test_coding_test_cases').select('*').in('question_id', codingIds);
        
        if (!tcError && tcData) {
          // Map test cases to questions
          const mappedCodingQuestions = codingData.map(cq => ({
            ...cq,
            question_type: 'CODING',
            question_text: cq.problem_statement, // alias to match MCQ
            module_name: mods.find(m => m.module_id === cq.module_id)?.module_name || 'Coding',
            test_cases: tcData.filter(tc => tc.question_id === cq.id)
          }));
          allQuestions = [...allQuestions, ...mappedCodingQuestions];
        }
      }

      setActiveQuestions(allQuestions);
    } catch(err) {
      console.error('Error fetching questions:', err);
      alert('Failed to load questions. Did you run the SQL script? Error: ' + err.message);
    }
  };

  const handleStartCountdown = async () => {
    try {
      // Request native browser fullscreen for immersive experience
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Error attempting to enable fullscreen:', err);
        });
      }

      const { data, error } = await supabase.from('mock_test_attempts').insert([{
        test_id: activeExam.id,
        student_id: user.id,
        status: 'in_progress',
        module_state: {}
      }]).select();
      
      if (error) throw error;
      setCurrentAttemptId(data[0].id);
      setCurrentQuestionIndex(0);
      
      // Update URL to show active test state to prevent accidental back navigation
      navigate(`/dashboard/mock-tests/${encodeURIComponent(activeExam.title)}/active`, { replace: true });

      const firstMod = activeModules[0];
      const sectionSeconds = (firstMod?.duration_minutes || 30) * 60;
      setSectionTimeRemaining(sectionSeconds);

      if (activeExam.duration_minutes) {
        setTimeRemaining(activeExam.duration_minutes * 60);
      } else {
        setTimeRemaining(null);
      }
      
      setCountdown(10);
      setViewState('countdown');
      setTabSwitches(0);
    } catch (err) {
      console.error('Error starting exam:', err);
      alert('Failed to start exam.');
    }
  };

  const toggleMarkForReview = () => {
    const newSet = new Set(markedForReview);
    if (newSet.has(currentQ.id)) {
      newSet.delete(currentQ.id);
    } else {
      newSet.add(currentQ.id);
    }
    setMarkedForReview(newSet);
  };

  const handleAnswerUpdate = async (questionId, payload) => {
    const updatedAnswers = {
      ...answers,
      [questionId]: { ...(answers[questionId] || {}), ...payload }
    };
    setAnswers(updatedAnswers);

    try {
      const existingRecord = await supabase.from('mock_test_answers')
        .select('id')
        .eq('attempt_id', currentAttemptId)
        .eq('question_id', questionId)
        .maybeSingle();
        
      if (existingRecord.data) {
        await supabase.from('mock_test_answers').update(payload).eq('id', existingRecord.data.id);
      } else {
        await supabase.from('mock_test_answers').insert([{
          attempt_id: currentAttemptId,
          question_id: questionId,
          ...payload
        }]);
      }
    } catch (err) {
      console.error('Auto-save error (silent)', err);
    }
  };

  const handleSectionSubmit = async (isAutoSubmit = false) => {
    try {
      // Find current module
      const currentModule = activeModules[currentModuleIndex] || {};
      const currentModuleQs = activeQuestions.filter(q => q.module_name === currentModule.module_name);
      
      // Update attempt module_state in DB to mark this module as completed
      const { data: attempt } = await supabase.from('mock_test_attempts').select('module_state').eq('id', currentAttemptId).maybeSingle();
      const newState = attempt?.module_state || {};
      newState[currentModule.module_name] = { status: 'completed' };
      
      await supabase.from('mock_test_attempts').update({ module_state: newState }).eq('id', currentAttemptId);
      
      setShowSubmitModal(false);
      setSubmissionConfirmText('');

      if (currentModuleIndex < activeModules.length - 1) {
        setCurrentModuleIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        const nextMod = activeModules[currentModuleIndex + 1];
        setSectionTimeRemaining((nextMod?.duration_minutes || 30) * 60);
        setViewState('exam');
      } else {
        handleFinalSubmit();
      }
    } catch (err) {
      console.error('Error submitting section', err);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);

      // 1. Prepare and save MCQ evaluations
      const updates = activeQuestions.filter(q => q.question_type !== 'CODING').map(q => {
        const ans = answers[q.id];
        let marks = null;
        let isEval = false;
        if (q.question_type === 'MCQ') {
          isEval = true;
          if (ans && ans.selected_option) {
            marks = ans.selected_option === q.correct_answer ? (q.marks || 1) : 0;
          } else {
            marks = 0;
          }
        }
        return { question_id: q.id, obtained_marks: marks, is_evaluated: isEval };
      });

      await Promise.all(updates.map(async (u) => {
        const { data: existing } = await supabase.from('mock_test_answers')
          .select('id').eq('attempt_id', currentAttemptId).eq('question_id', u.question_id).maybeSingle();
        if (existing) {
          await supabase.from('mock_test_answers').update({ obtained_marks: u.obtained_marks, is_evaluated: u.is_evaluated }).eq('id', existing.id);
        } else {
          await supabase.from('mock_test_answers').insert([{ attempt_id: currentAttemptId, question_id: u.question_id, obtained_marks: u.obtained_marks, is_evaluated: u.is_evaluated }]);
        }
      }));

      // 1.b Prepare and evaluate Coding Questions using Gemini
      const codingQuestions = activeQuestions.filter(q => q.question_type === 'CODING');
      if (codingQuestions.length > 0) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Gemini API key is not configured in .env file.");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        for (const q of codingQuestions) {
          const ans = answers[q.id] || {};
          const codeResponse = ans.code_response || '';
          const codeLanguage = ans.code_language || 'Python';
          const testCases = q.test_cases || [];
          
          if (!codeResponse.trim()) {
            const { data: existing } = await supabase.from('mock_test_coding_answers')
              .select('id').eq('attempt_id', currentAttemptId).eq('question_id', q.id).maybeSingle();
              
            const payload = {
              attempt_id: currentAttemptId, question_id: q.id, code: '', language: codeLanguage,
              test_cases_passed: 0, total_test_cases: testCases.length, score: 0, ai_bonus: 0, ai_feedback: {}
            };
            
            if (existing) {
              await supabase.from('mock_test_coding_answers').update(payload).eq('id', existing.id);
            } else {
              await supabase.from('mock_test_coding_answers').insert([payload]);
            }
            continue;
          }

          let evalResult = { test_cases_passed: 0, total_test_cases: testCases.length, ai_bonus: 0, ai_feedback: {} };

          if (testCases.length > 0) {
            const tcString = testCases.map((tc, idx) => `Test Case ${idx + 1} (${tc.is_hidden ? 'HIDDEN' : 'VISIBLE'}): \nInput:\n${tc.input_data}\nExpected Output:\n${tc.expected_output}\n`).join('---\n');
            const prompt = `
You are a strict code execution engine and AI code reviewer.

Problem Statement:
${q.question_text}

Student Code (${codeLanguage}):
${codeResponse}

Test Cases:
${tcString}

INSTRUCTIONS:
1. For every test case, execute the student code mentally with the given Input. Pay special attention to C/C++ (cin/scanf) and Java (Scanner) standard input parsing.
2. Check if the output matches the Expected Output exactly (ignore trailing whitespace/newlines).
3. Tally the number of passed test cases.
4. Review the code for Logic, Optimization, Time/Space complexity, and Readability.
5. Assign an 'ai_bonus' score between 0 and 2.
6. Output EXACTLY a valid JSON object matching this schema:
{
  "test_cases_passed": <number>,
  "total_test_cases": ${testCases.length},
  "ai_bonus": <number between 0 and 2>,
  "ai_feedback": {
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"],
    "suggestions": ["string", "string"]
  }
}
Output only the JSON.`;

            try {
              // Enforce JSON parsing natively using Gemini configuration
              const jsonModel = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                generationConfig: { responseMimeType: "application/json" }
              });
              const result = await jsonModel.generateContent(prompt);
              const responseText = result.response.text();
              evalResult = JSON.parse(responseText);
            } catch (e) {
              console.error('Gemini Eval Error:', e);
            }
          }

          const tcPassed = evalResult.test_cases_passed || 0;
          const totalTc = testCases.length;
          let score = 0;
          if (totalTc > 0) {
            score = Math.floor((tcPassed / totalTc) * (q.marks || 10));
          }

          const { data: existing } = await supabase.from('mock_test_coding_answers')
            .select('id').eq('attempt_id', currentAttemptId).eq('question_id', q.id).maybeSingle();
            
          const payload = {
            attempt_id: currentAttemptId,
            question_id: q.id,
            code: codeResponse,
            language: codeLanguage,
            test_cases_passed: tcPassed,
            total_test_cases: totalTc,
            score: score,
            ai_bonus: evalResult.ai_bonus || 0,
            ai_feedback: evalResult.ai_feedback || {},
            status: 'evaluated'
          };

          if (existing) {
            await supabase.from('mock_test_coding_answers').update(payload).eq('id', existing.id);
          } else {
            await supabase.from('mock_test_coding_answers').insert([payload]);
          }
        }
      }

      // 2. Submit attempt
      const { error } = await supabase.from('mock_test_attempts').update({
        status: 'submitted',
        tab_switches: tabSwitches,
        submitted_at: new Date().toISOString()
      }).eq('id', currentAttemptId);
      
      if (error) throw error;
      setShowSubmitModal(false);
      setViewState('exam_feedback');
      navigate(`/dashboard/mock-tests/${encodeURIComponent(activeExam.title)}`, { replace: true });
    } catch (err) {
      console.error('Error submitting exam:', err);
      alert('Failed to submit exam.');
    }
  };

  const handleSubmitExamFeedback = async () => {
    setExamFeedback(prev => ({ ...prev, isSubmitting: true }));
    try {
      const moduleNames = activeModules.map(m => m.module_name);
      
      // Calculate average rating
      const ratingsArr = Object.values(examFeedback.ratings);
      let avgRating = 0;
      if (ratingsArr.length > 0) {
        avgRating = ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length;
      }

      const { error } = await supabase.from('exam_feedback').insert([{
        student_id: user.id,
        student_email: user.email,
        exam_id: activeExam.id,
        exam_name: activeExam.title,
        modules: moduleNames,
        module_ratings: examFeedback.ratings,
        average_rating: avgRating > 0 ? avgRating : null,
        custom_message: examFeedback.message,
        status: 'Pending'
      }]);

      if (error) throw error;
      
      setViewState('results');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      // Even if feedback fails, we let them see their results
      setViewState('results');
    }
  };

  // Render Helpers
  const currentModule = activeModules[currentModuleIndex] || {};
  const currentModuleQs = activeQuestions.filter(q => q.module_name === currentModule.module_name);
  const currentQ = currentModuleQs[currentQuestionIndex];
  const totalQ = currentModuleQs.length;
  const currentAnswer = currentQ ? answers[currentQ.id] || {} : {};

  const isCodingSection = currentQ?.question_type === 'CODING' || 
    ['coding', 'dsa', 'programming'].some(kw => currentQ?.module_name?.toLowerCase().includes(kw));

  useEffect(() => {
    if (isCodingSection) {
      setIsCalculatorOpen(false);
    }
  }, [isCodingSection]);

  const getCodemirrorExtensions = (lang) => {
    const baseExt = [autocompletion({ override: [completeAnyWord] })];
    switch (lang) {
      case 'C':
      case 'C++': return [cpp(), ...baseExt];
      case 'Java': return [java(), ...baseExt];
      case 'Python': return [python(), ...baseExt];
      default: return [javascript(), ...baseExt];
    }
  };

  const isFullScreen = ['countdown', 'exam', 'review', 'results', 'exam_feedback'].includes(viewState);

  // FULL SCREEN VIEWS
  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-theme-card-alt overflow-y-auto animate-in fade-in duration-500">
        {/* Submit Confirmation Modal */}
        <AnimatePresence>
          {showSubmitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSubmitModal(false)}></div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-theme-card border border-theme-border p-8 rounded-3xl shadow-2xl relative z-10 max-w-md w-full">
                {(() => {
                  const currentModule = activeModules[currentModuleIndex];
                  const isFinal = currentModuleIndex === activeModules.length - 1;
                  const moduleName = currentModule?.module_name || '';
                  const isValid = submissionConfirmText === moduleName;
                  
                  return (
                    <>
                      <div className="flex items-center gap-3 text-red-400 mb-4">
                        <AlertTriangle className="w-8 h-8" />
                        <h3 className="text-2xl font-black text-theme-text">{isFinal ? 'Confirm Final Exam Submission' : 'Confirm Module Submission'}</h3>
                      </div>
                      
                      <div className="bg-theme-card-alt/50 border border-theme-border rounded-xl p-5 mb-6 space-y-4">
                        <p className="text-theme-text-muted text-sm leading-relaxed">
                          {isFinal 
                            ? "You are about to submit the entire exam. After submission you cannot make any changes. All unanswered questions will be marked as unattempted."
                            : "You are about to submit the current module. Once submitted, you cannot return to this module and all unanswered questions will be marked as unattempted."
                          }
                        </p>
                        
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">To continue, type the exact name of the current module:</label>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-theme-text text-sm">Current Module</span>
                            <span className="text-brand-primary font-bold text-lg select-none">{moduleName}</span>
                          </div>
                          
                          <input 
                            type="text" 
                            placeholder={`Type "${moduleName}" to continue`}
                            value={submissionConfirmText}
                            onChange={(e) => setSubmissionConfirmText(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            className="w-full bg-theme-bg border border-theme-border rounded-xl py-3 px-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono"
                          />
                          
                          <div className="mt-2 text-xs font-bold flex items-center gap-1">
                            {submissionConfirmText === '' ? null : isValid ? (
                              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Correct module name</span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Module name does not match</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-8">
                        <button onClick={() => { setShowSubmitModal(false); setSubmissionConfirmText(''); }} className="flex-1 py-3.5 bg-theme-glass hover:bg-theme-border border border-theme-border text-theme-text rounded-xl font-bold transition-colors">Cancel</button>
                        <button 
                          onClick={() => {
                            if (isValid) {
                              if (isFinal) {
                                handleFinalSubmit();
                              } else {
                                handleSectionSubmit(false);
                              }
                            }
                          }} 
                          disabled={!isValid}
                          className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 disabled:hover:bg-brand-primary disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-primary/20"
                        >
                          {isFinal ? 'Finish Exam' : 'Submit Module'}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Calculator */}
        {viewState === 'exam' && activeExam?.allow_calculator && !isCodingSection && (
          <button 
            onClick={() => setIsCalculatorOpen(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-brand-secondary transition-colors z-99 group"
          >
            <Calculator className="w-6 h-6" />
            <div className="absolute right-16 bg-theme-card border border-theme-border text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Open Calculator
            </div>
          </button>
        )}

        <AnimatePresence>
          {viewState === 'exam' && isCalculatorOpen && activeExam?.allow_calculator && !isCodingSection && (
            <BasicCalculator onClose={() => setIsCalculatorOpen(false)} />
          )}
        </AnimatePresence>

        {/* Tab Warning Modal */}
        <AnimatePresence>
          {showTabWarning && (
            <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-theme-card border border-red-500/30 p-8 rounded-3xl shadow-2xl shadow-red-500/20 relative z-10 max-w-md w-full text-center">
                <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-theme-text mb-4 tracking-tight">SECURITY WARNING</h3>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  You have left the exam tab. Tab switching is strictly monitored. Multiple infractions may result in auto-submission or disqualification.
                </p>
                <button 
                  onClick={() => setShowTabWarning(false)} 
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20 text-lg uppercase tracking-wider"
                >
                  I Understand
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 1. SYSTEM INITIALIZATION VIEW */}
        {viewState === 'countdown' && (
          <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full max-w-4xl bg-theme-card/80 border border-theme-border rounded-3xl p-10 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-theme-border">
                <div>
                  <h2 className="text-3xl font-black text-theme-text tracking-tight flex items-center gap-3 mb-2">
                    <MonitorX className="w-8 h-8 text-brand-primary" /> System Initialization
                  </h2>
                  <p className="text-theme-text-muted font-mono">{activeExam?.title}</p>
                </div>
                <div className="px-5 py-3 bg-brand-primary/20 border border-brand-primary/30 rounded-2xl text-brand-primary font-mono font-bold text-2xl flex items-center gap-3">
                  <Timer className="w-6 h-6" /> T-{countdown}s
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {/* Overall Stats */}
                <div className="col-span-2 md:col-span-4 grid grid-cols-3 gap-6 bg-theme-bg/50 p-6 rounded-2xl border border-theme-border">
                  <div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Questions</div>
                    <div className="text-theme-text font-mono text-2xl font-black">{activeQuestions.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Marks</div>
                    <div className="text-theme-text font-mono text-2xl font-black">{activeQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Duration</div>
                    <div className="text-theme-text font-mono text-2xl font-black">{(examModulesMap[activeExam?.id] || []).reduce((sum, m) => sum + (m.duration_minutes || 0), 0)} Min</div>
                  </div>
                </div>

                {/* Modules Summary */}
                <div className="col-span-2 md:col-span-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 mb-[-10px]">Module Summary</div>
                {(examModulesMap[activeExam?.id] || []).map((mod, idx) => {
                   const modQs = activeQuestions.filter(q => q.module_name === mod.module_name);
                   const marks = modQs.reduce((sum, q) => sum + (q.marks || 1), 0);
                   return (
                     <div key={idx} className="bg-theme-card-alt/50 border border-theme-border p-5 rounded-2xl flex flex-col justify-between">
                       <h4 className="text-brand-secondary font-bold text-lg mb-4">{mod.module_name}</h4>
                       <div className="space-y-2">
                         <div className="flex justify-between text-sm">
                           <span className="text-theme-text-muted">Questions</span>
                           <span className="text-theme-text font-mono font-bold">{modQs.length}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-theme-text-muted">Marks</span>
                           <span className="text-theme-text font-mono font-bold">{marks}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-theme-text-muted">Duration</span>
                           <span className="text-theme-text font-mono font-bold">{mod.duration_minutes}m</span>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm font-mono font-bold">
                  <span className="text-brand-primary flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    {countdown > 8 ? 'Securing environment...' :
                     countdown > 6 ? 'Preparing questions...' :
                     countdown > 4 ? 'Loading exam modules...' :
                     countdown > 2 ? 'Initializing timer...' :
                     'Verifying assessment settings...'}
                  </span>
                  <span className="text-theme-text-muted">{(10 - countdown) * 10}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-3 bg-theme-card-alt rounded-full overflow-hidden border border-theme-border">
                  <motion.div 
                    className="h-full bg-linear-to-r from-brand-primary to-brand-cyan relative"
                    animate={{ width: `${(10 - countdown) * 10}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                  </motion.div>
                </div>
              </div>

              <div className="text-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> ⚠ Do not exit fullscreen or switch tabs during the exam.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. EXAM INTERFACE */}
        {(viewState === 'exam' || viewState === 'review') && (
          <div className="min-h-screen flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-theme-card-alt/90 backdrop-blur-md border-b border-theme-border px-8 py-4 flex justify-between items-center shadow-lg shadow-black/50">
              <div>
                <h1 className="text-xl font-bold text-theme-text tracking-tight">{currentModule?.module_name || 'Module'}</h1>
                <div className="text-xs text-brand-primary font-bold uppercase tracking-widest mt-1">
                  Question {currentQuestionIndex + 1} of {totalQ}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if(window.confirm('Are you sure you want to cancel the exam? All progress will be lost.')) {
                      setViewState('list');
                      navigate(`/dashboard/mock-tests/${encodeURIComponent(activeExam.title)}`, { replace: true });
                    }
                  }} 
                  className="text-sm font-bold text-gray-400 hover:text-white px-4 py-2 border border-theme-border rounded-xl hover:bg-theme-card transition-colors"
                >
                  Cancel Exam
                </button>
                {timeRemaining !== null && (
                  <div className="hidden sm:flex items-center gap-2 bg-theme-glass border border-theme-border px-4 py-2.5 rounded-xl">
                    <span className="text-theme-text-muted text-[10px] uppercase font-bold tracking-wider">Overall Time</span>
                    <span className="text-theme-text font-mono text-sm font-bold">{formatTime(timeRemaining)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-5 py-2.5 rounded-xl" title="Current Section Time">
                  <Timer className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-mono text-xl font-bold tracking-wider">{formatTime(sectionTimeRemaining)}</span>
                </div>
              </div>
            </div>

            {viewState === 'exam' && currentQ && (
              <div className="flex flex-col lg:flex-row flex-1 p-6 gap-6 max-w-[1600px] mx-auto w-full">
                {/* Sidebar Navigator */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
                  
                  {/* Security Panel */}
                  <div className="glass-card bg-theme-card/80 border border-red-500/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Security
                    </h3>
                    <div className="flex justify-between items-center bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <span className="text-sm font-semibold text-gray-300">Tab Switches</span>
                      <span className="text-red-400 font-bold text-lg">{tabSwitches}</span>
                    </div>
                  </div>

                  {/* Module Breakdown Panel */}
                  <div className="glass-card bg-theme-card/80 border border-theme-border rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3">Module Breakdown</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {Array.from(new Set(activeQuestions.map(q => q.module_name))).map(mod => {
                        const modQs = activeQuestions.filter(q => q.module_name === mod);
                        const totalMarks = modQs.reduce((sum, q) => sum + (q.marks || 1), 0);
                        return (
                          <div key={mod} className="flex justify-between items-center bg-theme-card-alt/50 p-2 rounded border border-theme-border text-xs">
                            <span className="text-gray-300 font-bold">{mod}</span>
                            <span className="text-brand-primary font-mono">{modQs.length}Q • {totalMarks}M</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="glass-card bg-theme-card/80 border border-theme-border rounded-2xl p-6 sticky top-28 flex flex-col min-h-[450px]">
                    <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
                      <Bookmark className="w-4 h-4" /> Question Navigator
                    </h3>
                    
                    <div className="overflow-y-auto pr-2 pb-4 flex-1 custom-scrollbar space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-3">{currentModule?.module_name}</h4>
                        <div className="grid grid-cols-4 gap-2.5">
                          {currentModuleQs.map((q, idx) => {
                            const isAnswered = answers[q.id]?.selected_option || answers[q.id]?.code_response;
                            const isMarked = markedForReview.has(q.id);
                            const isCurrent = idx === currentQuestionIndex;
                            
                            let baseClass = "h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all border shadow-sm";
                            
                            if (isCurrent) {
                              baseClass += " bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10";
                            } else if (isMarked) {
                              baseClass += " bg-brand-secondary/20 text-brand-secondary border-brand-secondary/50 hover:bg-brand-secondary/30";
                            } else if (isAnswered) {
                              baseClass += " bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30";
                            } else {
                              baseClass += " bg-theme-card-alt text-theme-text-muted border-theme-border hover:border-white/30 hover:bg-theme-glass";
                            }

                            return (
                              <button 
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={baseClass}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-5 border-t border-theme-border grid grid-cols-2 gap-3 text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                      <div className="flex items-center gap-2 bg-theme-card-alt/50 px-3 py-2.5 rounded-xl border border-theme-border">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> 
                        <span className="flex-1">Answered</span>
                        <span className="text-theme-text text-xs">{Object.keys(answers).length}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-theme-card-alt/50 px-3 py-2.5 rounded-xl border border-theme-border">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-secondary"></div> 
                        <span className="flex-1">Review</span>
                        <span className="text-theme-text text-xs">{markedForReview.size}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-theme-card-alt/50 px-3 py-2.5 rounded-xl border border-theme-border col-span-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/20 border border-theme-border"></div> 
                        <span className="flex-1">Unanswered</span>
                        <span className="text-theme-text text-xs">{activeQuestions.length - Object.keys(answers).length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Question Area */}
                <div className="flex-1 flex flex-col min-h-full">
                  <div className="glass-card bg-theme-card/40 border border-theme-border rounded-3xl p-10 flex-1 flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center border-b border-theme-border pb-6 mb-8">
                      <div className="flex items-center gap-4">
                        <span className="px-4 py-1.5 bg-brand-primary/10 text-brand-primary font-bold text-sm uppercase tracking-wider rounded-lg border border-brand-primary/20">{currentQ.module_name}</span>
                        <span className={`px-4 py-1.5 rounded-lg text-sm font-bold uppercase
                          ${currentQ.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            currentQ.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                        >
                          {currentQ.difficulty}
                        </span>
                      </div>
                      <button 
                        onClick={toggleMarkForReview}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${markedForReview.has(currentQ.id) ? 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30' : 'bg-theme-glass text-white-muted hover:text-white border-theme-border hover:bg-theme-border'}`}
                      >
                        <Bookmark className="w-4 h-4" />
                        {markedForReview.has(currentQ.id) ? 'Marked For Review' : 'Mark For Review'}
                      </button>
                    </div>

                    <div className="flex-1">
                      <p className="text-2xl text-theme-text font-medium mb-12 whitespace-pre-wrap leading-relaxed tracking-wide">
                        {currentQ.question_text}
                      </p>

                      {currentQ.question_type === 'MCQ' && (
                        <div className="max-w-5xl">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                              const optionText = currentQ[`option_${opt.toLowerCase()}`];
                              if (!optionText) return null;
                              const isSelected = currentAnswer.selected_option === opt;
                              return (
                                <button 
                                  key={opt}
                                  onClick={() => handleAnswerUpdate(currentQ.id, { selected_option: opt })}
                                  className={`w-full text-left p-6 rounded-2xl border transition-all flex items-start gap-4 relative overflow-hidden group
                                    ${isSelected ? 'bg-brand-primary/10 border-brand-primary text-white shadow-[0_0_30px_rgba(79,70,229,0.15)] ring-1 ring-brand-primary/50' : 'bg-theme-card-alt/50 border-theme-border text-gray-300 hover:border-white/20 hover:bg-theme-card'}`}
                                >
                                  {isSelected && <div className="absolute inset-0 bg-linear-to-br from-brand-primary/20 to-transparent pointer-events-none"></div>}
                                  <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all z-10
                                    ${isSelected ? 'border-brand-primary bg-brand-primary/20 scale-110' : 'border-gray-500 group-hover:border-gray-400'}`}
                                  >
                                    {isSelected && <div className="w-2.5 h-2.5 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(79,70,229,1)]"></div>}
                                  </div>
                                  <span className="text-lg leading-relaxed z-10 font-medium">{optionText}</span>
                                </button>
                              );
                            })}
                          </div>
                          <AnimatePresence>
                            {currentAnswer.selected_option && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <button 
                                  onClick={() => handleAnswerUpdate(currentQ.id, { selected_option: '' })}
                                  className="text-sm font-bold text-gray-500 hover:text-red-400 transition-colors flex items-center gap-2 px-2 py-1 rounded hover:bg-red-500/10"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span> Clear Selection
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {currentQ.question_type === 'CODING' && (
                        <div className="w-full flex flex-col h-full space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2">
                              Coding Environment
                            </label>
                            <select 
                              value={currentAnswer.code_language || 'Python'} 
                              onChange={e => handleAnswerUpdate(currentQ.id, { code_language: e.target.value })}
                              className="bg-theme-card border border-brand-primary/30 rounded-xl py-2 px-4 text-base text-brand-primary font-bold focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/50"
                            >
                              {['C', 'C++', 'Java', 'Python'].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          
                          <div className="flex-1 bg-[#1e1e1e] rounded-2xl overflow-hidden border-2 border-theme-border focus-within:border-brand-primary transition-colors flex flex-col min-h-[500px]">
                            <div className="bg-[#2d2d2d] text-sm text-theme-text-muted px-6 py-3 border-b border-black/50 font-mono flex gap-4 shrink-0">
                              <span>Solution.{currentAnswer.code_language === 'Python' ? 'py' : currentAnswer.code_language === 'Java' ? 'java' : 'cpp'}</span>
                              <span className="text-brand-secondary">{"/* Auto-saving */"}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                              <CodeMirror
                                value={currentAnswer.code_response || ''}
                                height="100%"
                                minHeight="500px"
                                theme={vscodeDark}
                                extensions={getCodemirrorExtensions(currentAnswer.code_language || 'Python')}
                                onChange={code => handleAnswerUpdate(currentQ.id, { code_response: code, code_language: currentAnswer.code_language || 'Python' })}
                                className="text-lg"
                                style={{
                                  fontFamily: '"Fira Code", "JetBrains Mono", monospace'
                                }}
                              />
                            </div>
                          </div>
                          
                          {currentQ.test_cases && currentQ.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                            <div className="bg-theme-card border border-theme-border rounded-2xl p-6 mt-6">
                              <h4 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider mb-4">Sample Test Cases</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQ.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                                  <div key={idx} className="bg-brand-bg rounded-xl p-4 border border-theme-border font-mono text-sm">
                                    <div className="text-brand-primary mb-2 text-xs uppercase tracking-wider font-bold">Example {idx + 1}</div>
                                    <div className="mb-2">
                                      <span className="text-gray-500 block mb-1 text-[10px] uppercase">Input:</span>
                                      <div className="text-theme-text">{tc.input_data}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block mb-1 text-[10px] uppercase">Expected Output:</span>
                                      <div className="text-emerald-400 font-bold">{tc.expected_output}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Console / Testing Area */}
                          <div className="mt-8 bg-theme-card-alt/50 border border-theme-border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              {codingEvalStatus[currentQ.id]?.passed !== undefined ? (
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${codingEvalStatus[currentQ.id].passed === codingEvalStatus[currentQ.id].total ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'}`}>
                                    {codingEvalStatus[currentQ.id].passed === codingEvalStatus[currentQ.id].total ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">Execution Result</div>
                                    <div className={`font-mono text-xl font-black tracking-tight ${codingEvalStatus[currentQ.id].passed === codingEvalStatus[currentQ.id].total ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                      {codingEvalStatus[currentQ.id].passed} / {codingEvalStatus[currentQ.id].total} Test Cases Passed
                                    </div>
                                  </div>
                                </div>
                              ) : codingEvalStatus[currentQ.id]?.error ? (
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-red-500/20 border-red-500/50 text-red-400">
                                    <MonitorX className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">Execution Failed</div>
                                    <div className="text-red-400 font-bold text-sm max-w-lg truncate">{codingEvalStatus[currentQ.id].error}</div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-sm font-bold text-theme-text">Test your code</div>
                                  <div className="text-xs text-theme-text-muted mt-1">Run against the visible sample cases.</div>
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={async () => {
                                const ans = currentAnswer;
                                const codeResponse = ans.code_response || '';
                                const codeLanguage = ans.code_language || 'Python';
                                const testCases = currentQ.test_cases || [];
                                
                                if (!codeResponse.trim()) {
                                  alert('Please write some code before running test cases.');
                                  return;
                                }
                                
                                setCodingEvalStatus(prev => ({ ...prev, [currentQ.id]: { running: true }}));
                                
                                try {
                                  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                                  if (!apiKey) throw new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
                                  
                                  const genAI = new GoogleGenerativeAI(apiKey);
                                  const jsonModel = genAI.getGenerativeModel({ 
                                    model: "gemini-flash-latest",
                                    generationConfig: { responseMimeType: "application/json" }
                                  });
                                  
                                  const tcString = testCases.map((tc, idx) => `Test Case ${idx + 1} (${tc.is_hidden ? 'HIDDEN' : 'VISIBLE'}): \nInput:\n${tc.input_data}\nExpected Output:\n${tc.expected_output}\n`).join('---\n');
                                  const prompt = `
You are a strict code execution engine.
Problem Statement: ${currentQ.question_text}
Student Code (${codeLanguage}):
${codeResponse}
Test Cases:
${tcString}

INSTRUCTIONS:
1. Mentally execute the code for each test case.
2. Output EXACTLY a valid JSON object matching this schema:
{
  "test_cases_passed": <number>,
  "total_test_cases": ${testCases.length}
}
Output only the JSON.`;
                                  
                                  const result = await jsonModel.generateContent(prompt);
                                  const evalResult = JSON.parse(result.response.text());
                                  
                                  setCodingEvalStatus(prev => ({ 
                                    ...prev, 
                                    [currentQ.id]: { 
                                      running: false, 
                                      passed: evalResult.test_cases_passed, 
                                      total: evalResult.total_test_cases 
                                    }
                                  }));
                                } catch (err) {
                                  console.error(err);
                                  setCodingEvalStatus(prev => ({ ...prev, [currentQ.id]: { running: false, error: err.message || 'Unknown error' }}));
                                }
                              }}
                              disabled={codingEvalStatus[currentQ.id]?.running}
                              className="px-8 py-4 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] disabled:opacity-70 disabled:cursor-not-allowed shrink-0"
                            >
                              {codingEvalStatus[currentQ.id]?.running ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Executing...</>
                              ) : (
                                <><PlayCircle className="w-5 h-5" /> Run Test Cases</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center border-t border-theme-border pt-8 mt-12 shrink-0">
                      <button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-8 py-4 rounded-xl text-base font-semibold text-theme-text-muted hover:text-theme-text disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 bg-theme-card border border-theme-border hover:bg-theme-glass"
                      >
                        <ArrowLeft className="w-5 h-5"/> Previous
                      </button>
                      
                      <div className="flex gap-4">
                        {currentQuestionIndex < totalQ - 1 ? (
                          <button 
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQ - 1, prev + 1))}
                            className="px-10 py-4 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold text-lg transition-colors flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                          >
                            Save & Next <ArrowRight className="w-5 h-5"/>
                          </button>
                        ) : (
                          <button 
                            onClick={() => setShowSubmitModal(true)}
                            className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-theme-text rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-500/20"
                          >
                            Submit {currentModule?.module_name} Section
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REVIEW VIEW */}
            {viewState === 'review' && (
              <div className="max-w-6xl mx-auto p-12 w-full animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-16">
                  <h2 className="text-5xl font-black text-theme-text mb-4 tracking-tight">Review Submission</h2>
                  <p className="text-xl text-theme-text-muted">Please review your question statuses before final submission.</p>
                </div>

                <div className="glass-card bg-theme-card/80 border border-theme-border rounded-[40px] p-12 shadow-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
                    {activeQuestions.map((q, idx) => {
                      const isAnswered = answers[q.id]?.selected_option || answers[q.id]?.code_response;
                      const isMarked = markedForReview.has(q.id);
                      
                      let cardClass = "bg-theme-card border-theme-border hover:bg-theme-glass";
                      if (isAnswered) cardClass = "bg-emerald-500/10 border-emerald-500/30";
                      if (isMarked) cardClass = "bg-brand-secondary/10 border-brand-secondary/30";

                      return (
                        <button 
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIndex(idx);
                            setViewState('exam');
                          }}
                          className={`p-6 rounded-3xl border-2 text-left transition-all hover:-translate-y-1 ${cardClass}`}
                        >
                          <div className="text-sm text-theme-text-muted uppercase tracking-widest font-bold mb-3">Question {idx + 1}</div>
                          <div className="font-bold flex items-center gap-2 text-lg">
                            {isMarked ? (
                              <><Bookmark className="w-5 h-5 text-brand-secondary"/> <span className="text-brand-secondary">Review</span></>
                            ) : isAnswered ? (
                              <><CheckCircle2 className="w-5 h-5 text-emerald-400"/> <span className="text-emerald-400">Answered</span></>
                            ) : (
                              <><AlertCircle className="w-5 h-5 text-red-400"/> <span className="text-red-400">Not Answered</span></>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-center border-t border-theme-border pt-12">
                    <button onClick={() => setShowSubmitModal(true)} className="px-16 py-5 bg-emerald-500 hover:bg-emerald-600 text-theme-text rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                      Submit Exam
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. EXAM FEEDBACK VIEW */}
        {viewState === 'exam_feedback' && (
          <div className="min-h-screen flex flex-col items-center justify-center relative p-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-2xl bg-theme-card border border-theme-border rounded-3xl p-10 relative z-10 shadow-2xl">
              <div className="text-center mb-8 pb-8 border-b border-theme-border">
                <div className="w-16 h-16 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 fill-brand-primary" />
                </div>
                <h1 className="text-3xl font-black text-theme-text mb-2 tracking-tight">How was your exam experience?</h1>
                <p className="text-theme-text-muted">Help us improve future assessments.</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-theme-text-muted uppercase tracking-widest text-center">Rate Modules</h4>
                  {activeModules.map(mod => (
                    <div key={mod.module_name} className="flex justify-between items-center bg-theme-card-alt p-4 rounded-xl border border-theme-border">
                      <span className="font-bold text-theme-text">{mod.module_name}</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star}
                            onClick={() => setExamFeedback(prev => ({ ...prev, ratings: { ...prev.ratings, [mod.module_name]: star } }))}
                            className="p-1 hover:scale-110 transition-transform"
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            <Star className={`w-6 h-6 ${examFeedback.ratings[mod.module_name] >= star ? 'fill-yellow-400 text-yellow-400' : 'text-theme-text-muted opacity-50'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-theme-text-muted uppercase tracking-widest text-center mb-4">Additional Comments</h4>
                  <textarea 
                    rows="4" 
                    value={examFeedback.message}
                    onChange={(e) => setExamFeedback(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-brand-bg border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:border-brand-primary resize-none"
                    placeholder="Share your experience, difficulty level, question quality, timer issues, or any suggestions..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-theme-border">
                <button onClick={() => setViewState('results')} className="flex-1 py-3 bg-theme-glass hover:bg-theme-border text-theme-text rounded-xl font-bold transition-colors">
                  Skip
                </button>
                <button 
                  onClick={handleSubmitExamFeedback}
                  disabled={examFeedback.isSubmitting} 
                  className="flex-2 py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
                >
                  {examFeedback.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 6. RESULTS VIEW */}
        {viewState === 'results' && (
          <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-primary/10 rounded-full blur-[150px] pointer-events-none"></div>
             <div className="max-w-4xl w-full relative z-10 space-y-8">
              
              <div className="text-center">
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                  <div className="w-24 h-24 mx-auto bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-12 h-12 text-theme-text" />
                  </div>
                </motion.div>
                <h1 className="text-4xl font-black text-theme-text mb-2 tracking-tight">Assessment Completed!</h1>
                <p className="text-xl text-theme-text-muted">Here are your preliminary results for <span className="text-theme-text">{activeExam?.title}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(new Set(activeQuestions.map(q => q.module_name))).map(mod => {
                  const modQs = activeQuestions.filter(q => q.module_name === mod);
                  const isCodingOnly = modQs.every(q => q.question_type === 'CODING');
                  const totalMarksPossible = modQs.reduce((sum, q) => sum + (q.marks || 1), 0);
                  
                  let obtained = 0;
                  modQs.forEach(q => {
                    if (q.question_type === 'MCQ') {
                      const ans = answers[q.id];
                      if (ans && ans.selected_option === q.correct_answer) {
                        obtained += (q.marks || 1);
                      }
                    }
                  });

                  return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={mod} className="bg-theme-card/80 border border-theme-border p-6 rounded-3xl glass-card shadow-xl hover:border-theme-border transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-theme-text uppercase tracking-wider">{mod}</h3>
                        {isCodingOnly ? (
                          <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            Pending Admin Evaluation
                          </span>
                        ) : (
                          <span className="text-brand-primary font-mono text-3xl font-black">
                            {obtained} <span className="text-base text-gray-500 font-sans">/ {totalMarksPossible}</span>
                          </span>
                        )}
                      </div>
                      
                      {!isCodingOnly && modQs.some(q => q.question_type === 'CODING') && (
                        <div className="mt-2 text-xs text-yellow-500 bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Includes coding questions pending admin evaluation.
                        </div>
                      )}
                      
                      <div className="mt-4 flex gap-4 text-sm text-theme-text-muted font-medium pt-4 border-t border-theme-border">
                        <div>Questions: <span className="text-theme-text font-bold">{modQs.length}</span></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="flex justify-center pt-8">
                <button onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.warn(err));
                  }
                  setViewState('list');
                }} className="px-10 py-4 bg-theme-glass border border-theme-border text-theme-text hover:bg-theme-border rounded-2xl font-bold text-lg transition-colors">
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // STANDARD VIEWS (List & Instructions)
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1440px] mx-auto w-full">
      
      {/* EXAM LIST */}
      {viewState === 'list' && (
        <>
          <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-brand-primary" /> Mock Tests
            </h2>
            <p className="text-theme-text-muted">Evaluate your skills with our industry-standard mock assessments.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <div className="w-10 h-10 border-4 border-theme-border border-t-brand-primary rounded-full animate-spin mb-4"></div>
              <p className="text-theme-text-muted font-medium tracking-wide text-sm">Loading mock tests...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableExams.filter(exam => !searchQuery || exam.title.toLowerCase().includes(searchQuery.toLowerCase())).map((exam, i) => {
                const pastAttempt = studentAttempts[exam.id];
                return (
                <motion.div 
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border hover:border-brand-primary/50 group transition-all relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-all"></div>
                  
                  <div className="flex-1 relative z-10">
                    <h3 className="text-2xl font-bold text-theme-text mb-2">{exam.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-6">
                      {(examModulesMap[exam.id] || []).map(m => (
                        <span key={m.module_name} className="px-2 py-1 bg-theme-glass text-gray-300 font-bold text-[10px] uppercase tracking-wider rounded">{m.module_name}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-theme-border mt-auto relative z-10">
                    {pastAttempt ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-0.5">Latest Score</span>
                        <span className="text-sm font-black text-brand-primary font-mono">{pastAttempt.total_score} Marks</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-brand-primary">Available Now</span>
                    )}
                    <button 
                      onClick={() => handleSelectExam(exam)}
                      className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-primary/20"
                    >
                      {pastAttempt ? 'Re-Attempt' : 'Take Test'}
                    </button>
                  </div>
                </motion.div>
                );
              })}
              {availableExams.filter(exam => !searchQuery || exam.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="col-span-full p-12 text-center border border-dashed border-white/20 rounded-3xl">
                  <h3 className="text-xl font-bold text-theme-text mb-2">No Exams Found</h3>
                  <p className="text-theme-text-muted">Try adjusting your search query.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SPLIT INSTRUCTIONS VIEW */}
      {viewState === 'instructions' && (
        <div className="space-y-6">
          <button onClick={() => { setViewState('list'); navigate('/dashboard/mock-tests'); }} className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors flex items-center gap-2 font-semibold w-max">
            <ArrowLeft className="w-5 h-5" /> Back to Exams
          </button>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Rules & Warnings */}
            <div className="flex-1 space-y-6">
              <div className="glass-card p-10 rounded-[32px] bg-theme-card/40 border border-theme-border max-h-[500px] flex flex-col">
                <div className="mb-6 shrink-0">
                  <h2 className="text-3xl font-black text-theme-text tracking-tight">Exam Instructions</h2>
                  <p className="text-theme-text-muted mt-2">Please read all instructions carefully before starting the examination.</p>
                </div>
                
                <div className="overflow-y-auto pr-4 space-y-4 font-serif text-theme-text-muted whitespace-pre-wrap flex-1 custom-scrollbar">
                  {(() => {
                    let inst = "Read all questions carefully.\n\nDo not switch tabs or exit fullscreen.\n\nCalculator is available only for non-coding sections.\n\nCoding sections do not allow calculators.\n\nModule submission is final and cannot be reversed.\n\nAll answers are auto-saved.\n\nEnsure a stable internet connection before starting.";
                    if (activeExam?.description?.includes('::INSTRUCTIONS::')) {
                      inst = activeExam.description.split('::INSTRUCTIONS::')[1] || inst;
                    }
                    return inst;
                  })()}
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[32px] flex gap-6 items-start">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0 text-red-500">
                  <MonitorX className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-red-400 font-bold text-xl mb-2">Tab Switching is Monitored</h3>
                  <p className="text-red-400/80 leading-relaxed">Leaving the exam screen or attempting to open other applications may lead to automatic disqualification and termination of the exam.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Exam Summary */}
            <div className="w-full lg:w-[450px] shrink-0">
              <div className="glass-card p-10 rounded-[32px] bg-theme-card/80 border border-brand-primary/30 relative overflow-hidden shadow-[0_0_50px_rgba(var(--brand-primary-rgb),0.1)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="text-brand-primary font-bold text-sm uppercase tracking-widest mb-4">Ready to Begin</div>
                  <h1 className="text-3xl font-black text-theme-text mb-2 leading-tight">{activeExam?.title}</h1>
                  <p className="text-theme-text-muted mb-8">
                    {activeExam?.description?.includes('::INSTRUCTIONS::') 
                      ? activeExam.description.split('::INSTRUCTIONS::')[0] 
                      : (activeExam?.description || "Comprehensive Assessment")}
                  </p>
                  
                  <div className="space-y-4 mb-10">
                    {studentAttempts[activeExam?.id] && (
                      <div className="bg-brand-primary/10 border border-brand-primary/30 p-5 rounded-2xl flex flex-col justify-center items-center mb-2">
                        <span className="text-brand-primary font-bold text-xs uppercase tracking-wider mb-1">Previous Score</span>
                        <span className="text-theme-text font-black text-4xl font-mono">{studentAttempts[activeExam.id].total_score} <span className="text-lg text-brand-primary/50">Marks</span></span>
                      </div>
                    )}

                    <div className="bg-theme-card-alt/50 p-5 rounded-2xl flex justify-between items-center border border-theme-border">
                      <span className="text-theme-text-muted font-bold">Total Questions</span>
                      <span className="text-theme-text font-black text-xl">{activeQuestions.length}</span>
                    </div>
                    <div className="bg-theme-card-alt/50 p-5 rounded-2xl flex justify-between items-center border border-theme-border">
                      <span className="text-theme-text-muted font-bold">Total Marks</span>
                      <span className="text-theme-text font-black text-xl">
                        {activeQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                      </span>
                    </div>
                    <div className="bg-theme-card-alt/50 p-5 rounded-2xl flex justify-between items-center border border-theme-border">
                      <span className="text-theme-text-muted font-bold">Estimated Duration</span>
                      <span className="text-theme-text font-black text-xl">
                        {activeExam?.duration_minutes || 120} Minutes
                      </span>
                    </div>
                    <div className="bg-theme-card-alt/50 p-5 rounded-2xl flex justify-between items-center border border-theme-border">
                      <span className="text-theme-text-muted font-bold">Calculator Availability</span>
                      <span className="text-theme-text font-black text-sm uppercase tracking-wider px-3 py-1 rounded bg-theme-bg border border-theme-border">
                        {activeExam?.allow_calculator ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="bg-theme-card-alt/50 p-5 rounded-2xl flex flex-col border border-theme-border">
                      <span className="text-theme-text-muted font-bold mb-4">Modules Included</span>
                      <div className="grid grid-cols-2 gap-3">
                        {(examModulesMap[activeExam?.id] || []).map(m => (
                          <div key={m.module_name} className="p-3 bg-theme-bg border border-theme-border rounded-xl">
                            <div className="font-bold text-theme-text mb-1">{m.module_name}</div>
                            <div className="text-xs text-theme-text-muted space-y-1">
                              <div>{m.question_count} Questions</div>
                              <div>{m.duration_minutes} Minutes</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button onClick={handleStartCountdown} className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-brand-primary text-white rounded-2xl font-black text-xl hover:bg-brand-secondary transition-all hover:scale-[1.02] shadow-[0_10px_30px_rgba(var(--brand-primary-rgb),0.3)]">
                    <PlayCircle className="w-7 h-7" /> {studentAttempts[activeExam?.id] ? 'Re-Attempt Exam' : 'Start Exam'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
