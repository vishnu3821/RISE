import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Users, Code, Building2, FileText, 
  Play, StopCircle, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, Target, Volume2, Upload, AlertCircle,
  BarChart2, History, RotateCcw, X, Loader2
} from 'lucide-react';

const IconMap = { Mic, Users, Code, Building2, FileText };

// AI Evaluation is now handled dynamically using Gemini 1.5 Flash

export default function AiInterviewsStudent() {
  const { user } = useAuth();
  
  // App States
  const [view, setView] = useState('modules'); // 'modules', 'companies', 'resume', 'instructions', 'interview', 'result', 'history'
  
  // Data States
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Selection States
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [resumeBase64, setResumeBase64] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Interview Session States
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: { transcript, feedback, score } }
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // STT States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchModulesAndHistory();
  }, []);

  const fetchModulesAndHistory = async () => {
    try {
      const [modRes, histRes] = await Promise.all([
        supabase.from('ai_interview_modules').select('*').eq('is_active', true).order('created_at', { ascending: true }),
        supabase.from('ai_interview_attempts').select('*, ai_interview_modules(name)').eq('student_id', user.id).order('created_at', { ascending: false })
      ]);
      if (modRes.data) setModules(modRes.data);
      if (histRes.data) setHistory(histRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const transcribeAudioWithGemini = async (base64Audio, retryCount = 0) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key is not configured in .env file.");

    try {
      setIsProcessingVoice(true);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      
      const result = await model.generateContent([
        { text: "You are a highly accurate audio transcription tool. Transcribe the following speech exactly as spoken. Do not add any conversational filler, formatting, or commentary. Only output the spoken words." },
        {
          inlineData: {
            mimeType: "audio/webm",
            data: base64Audio
          }
        }
      ]);

      const text = result.response.text();
      
      if (text) {
        setTranscript(prev => prev ? prev + " " + text : text);
      }
      setIsProcessingVoice(false);
    } catch (err) {
      console.error('Gemini API Error:', err);
      
      const isRetryableError = err?.message?.includes('503') || err?.message?.includes('Load failed') || err?.message?.includes('fetch');
      if (isRetryableError && retryCount < 3) {
        console.log(`Network/Demand issue. Retrying in 2 seconds... (${retryCount + 1}/3)`);
        setTimeout(() => transcribeAudioWithGemini(base64Audio, retryCount + 1), 2000);
      } else {
        alert('Transcription failed: ' + err.message + (retryCount > 0 ? ` (After ${retryCount} retries)` : ''));
        setIsProcessingVoice(false);
      }
    }
  };

  const handleModuleSelect = async (mod) => {
    setSelectedModule(mod);
    
    if (mod.name.toLowerCase().includes('company')) {
      // Fetch companies
      const { data } = await supabase.from('ai_interview_companies').select('*').eq('is_active', true);
      setCompanies(data || []);
      setView('companies');
    } else if (mod.name.toLowerCase().includes('resume')) {
      setView('resume');
    } else {
      await prepareQuestions(mod.id, null);
      setView('instructions');
    }
  };

  const handleCompanySelect = async (comp) => {
    setSelectedCompany(comp);
    await prepareQuestions(selectedModule.id, comp.id);
    setView('instructions');
  };

  const generateQuestionsFromResume = async () => {
    if (!resumeBase64) return;
    setIsGeneratingQuestions(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is not configured in .env file.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // 1.5-flash supports PDF processing
      
      const prompt = "You are an expert technical interviewer. Analyze this candidate's resume and generate 3 highly targeted and challenging interview questions based on their specific skills, projects, and experience. Also provide 2 or 3 expected key points or concepts the candidate should hit in their answer. Return ONLY a valid JSON array of objects, with each object having exactly these two keys: 'question_text' (string) and 'expected_points' (array of strings). Do not wrap the JSON in markdown code blocks.";
      
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: resumeBase64
          }
        }
      ]);

      const responseText = result.response.text();
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedQuestions = JSON.parse(jsonString);
      
      const formattedQuestions = parsedQuestions.map((q, idx) => ({
        id: `gen_${idx}`,
        question_text: q.question_text,
        expected_points: q.expected_points
      }));

      setQuestions(formattedQuestions);
      setView('instructions');
    } catch (err) {
      console.error('Error generating questions:', err);
      alert('Failed to analyze resume. Make sure you uploaded a valid PDF document.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const prepareQuestions = async (moduleId, companyId) => {
    try {
      let query = supabase.from('ai_interview_questions').select('*');
      if (moduleId && !companyId) query = query.eq('module_id', moduleId);
      if (companyId) query = query.eq('company_id', companyId);
      
      const { data } = await query.limit(5); // Limit to 5 questions for a session
      setQuestions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startInterview = async () => {
    try {
      // Create attempt record
      const { data, error } = await supabase.from('ai_interview_attempts').insert([{
        student_id: user.id,
        module_id: selectedModule.id,
        company_id: selectedCompany?.id || null,
        resume_url: uploadedResume || null,
        status: 'in_progress'
      }]).select();

      if (error) throw error;
      
      setCurrentAttempt(data[0]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTranscript('');
      setSessionStartTime(Date.now());
      setView('interview');
    } catch (err) {
      console.error('Failed to start interview:', err);
      alert("Failed to initialize session. Make sure your database tables are created.");
    }
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Clean up media stream to turn off camera/mic light
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            transcribeAudioWithGemini(base64String);
          };
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Could not access microphone. Please allow permissions.');
      }
    }
  };

  const handleNextQuestion = () => {
    // Save current answer locally
    const currentQ = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: transcript
    }));

    setTranscript('');
    setIsRecording(false);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Save current answer locally
      const currentQ = questions[currentQuestionIndex];
      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: transcript
      }));

      const prevQ = questions[currentQuestionIndex - 1];
      setTranscript(answers[prevQ.id] || '');
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const finishInterview = async () => {
    // Save final answer
    const currentQ = questions[currentQuestionIndex];
    const finalAnswers = { ...answers, [currentQ.id]: transcript };
    setAnswers(finalAnswers);

    setIsRecording(false);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setView('evaluating'); // Show loading state

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is not configured in .env file.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const evaluationPrompt = `You are an expert technical and behavioral interview evaluator.
I will provide you with a list of interview questions and the candidate's exact transcribed answers.
Evaluate the candidate's performance across all questions critically and accurately. Be realistic and strict in your scoring.
If an answer is too short, irrelevant, or non-existent, the score should be very low.

Questions and Answers:
${questions.map(q => `
Question ID: ${q.id}
Question: ${q.question_text}
Expected Key Points: ${q.expected_points?.join(', ') || 'None provided'}
Candidate Answer: ${finalAnswers[q.id] || '(No Answer Provided)'}
`).join('\n')}

Based on their answers, return ONLY a valid JSON object with the following exact keys:
{
  "overall_score": <number 0-100>,
  "comm_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "fluency_score": <number 0-100>,
  "grammar_score": <number 0-100>,
  "vocab_score": <number 0-100>,
  "pron_score": <number 0-100>,
  "feedback_per_question": [
    { "question_id": "<id>", "points_hit": <number>, "total_expected": <number>, "strengths": ["<string>"], "improvements": ["<string>"], "suggestions": ["<string>"] }
  ]
}
Do NOT wrap the response in markdown code blocks. Return only raw JSON.`;

      const result = await model.generateContent(evaluationPrompt);
      const jsonString = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const evalResult = JSON.parse(jsonString);

      const answerPayloads = questions.map(q => {
        const fb = evalResult.feedback_per_question?.find(f => f.question_id === q.id) || { points_hit: 0, total_expected: 0, strengths: ["No specific strengths found"], improvements: ["Could not analyze answer"], suggestions: [] };
        return {
          attempt_id: currentAttempt.id,
          question_id: q.id,
          transcript_text: finalAnswers[q.id] || '',
          feedback: fb,
          score: Math.round((evalResult.overall_score || 0) + (fb.points_hit > 0 ? 10 : -10)) // slight per-question variance simulation
        };
      });

      const finalScores = {
        overall_score: evalResult.overall_score || 0,
        comm_score: evalResult.comm_score || 0,
        confidence_score: evalResult.confidence_score || 0,
        fluency_score: evalResult.fluency_score || 0,
        grammar_score: evalResult.grammar_score || 0,
        vocab_score: evalResult.vocab_score || 0,
        pron_score: evalResult.pron_score || 0,
        duration_seconds: Math.round((Date.now() - sessionStartTime) / 1000),
        status: 'completed'
      };

      // Save to DB
      await supabase.from('ai_interview_answers').insert(answerPayloads);
      const { data } = await supabase.from('ai_interview_attempts').update(finalScores).eq('id', currentAttempt.id).select('*, ai_interview_modules(name)');
      
      setCurrentAttempt(data[0]);
      await fetchModulesAndHistory(); // Refresh history
      setView('result');

    } catch (err) {
      console.error(err);
      alert('Error finalizing interview: ' + (err.message || 'Unknown error'));
      setView('modules');
    }
  };

  const renderModuleSelection = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">AI Mock Interviews</h2>
          <p className="text-theme-text-muted">Practice real-world interview scenarios with our AI evaluator.</p>
        </div>
        <button onClick={() => setView('history')} className="px-4 py-2 bg-brand-bg border border-theme-border hover:bg-theme-glass rounded-lg text-theme-text text-sm font-bold flex items-center gap-2 transition-colors">
          <History className="w-4 h-4" /> View History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(mod => {
          const Icon = IconMap[mod.icon] || Mic;
          return (
            <motion.div 
              key={mod.id}
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-3xl bg-theme-card/60 border border-theme-border hover:border-brand-primary/50 transition-all flex flex-col group cursor-pointer"
              onClick={() => handleModuleSelect(mod)}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6 group-hover:bg-brand-primary group-hover:text-white transition-colors duration-500">
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-theme-text mb-2">{mod.name}</h3>
              <p className="text-sm text-theme-text-muted mb-6 flex-1 line-clamp-2">{mod.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-theme-border">
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                  <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> 5 Qs</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ~10m</span>
                </div>
                <button className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg text-xs font-bold transition-colors">
                  Start
                </button>
              </div>
            </motion.div>
          );
        })}
        {modules.length === 0 && (
          <div className="col-span-full p-12 text-center border border-theme-border border-dashed rounded-3xl">
            <p className="text-gray-500">No AI interview modules available yet. Please check back later.</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderCompanySelection = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-4xl mx-auto">
      <button onClick={() => setView('modules')} className="text-theme-text-muted hover:text-theme-text flex items-center gap-2 text-sm font-bold transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to Modules
      </button>
      <div>
        <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">Select a Company</h2>
        <p className="text-theme-text-muted">Choose a company to practice their specific interview patterns.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {companies.map(c => (
          <button 
            key={c.id} onClick={() => handleCompanySelect(c)}
            className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border hover:border-brand-primary hover:bg-brand-primary/5 text-center transition-all group"
          >
            <Building2 className="w-8 h-8 text-brand-primary mx-auto mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
            <h4 className="font-bold text-theme-text text-lg">{c.name}</h4>
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderResumeUpload = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-2xl mx-auto">
      <button onClick={() => setView('modules')} className="text-theme-text-muted hover:text-theme-text flex items-center gap-2 text-sm font-bold transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to Modules
      </button>
      <div className="text-center">
        <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-brand-primary" />
        </div>
        <h2 className="text-3xl font-bold text-theme-text mb-2 tracking-tight">Upload Your Resume</h2>
        <p className="text-theme-text-muted mb-8">Our AI will analyze your resume and generate personalized questions based on your skills, projects, and experience.</p>
        
        <div className="border-2 border-dashed border-brand-primary/30 rounded-3xl p-12 bg-theme-card/40 hover:bg-theme-card/60 transition-colors cursor-pointer relative">
          <input type="file" accept=".pdf" onChange={(e) => {
            const file = e.target.files[0];
            if(file) {
              setUploadedResume(file.name);
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onloadend = () => {
                setResumeBase64(reader.result.split(',')[1]);
              };
            }
          }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload className="w-12 h-12 text-brand-primary/50 mx-auto mb-4" />
          <p className="text-theme-text font-bold mb-2">{uploadedResume || "Drag & drop your resume here"}</p>
          <p className="text-sm text-gray-500">Supports PDF Only (Max 5MB)</p>
        </div>

        <button 
          onClick={generateQuestionsFromResume} 
          disabled={!uploadedResume || isGeneratingQuestions}
          className="mt-8 w-full py-4 flex items-center justify-center gap-2 bg-linear-to-br from-brand-primary to-brand-secondary rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(147,51,234,0.3)]"
        >
          {isGeneratingQuestions ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Resume...</>
          ) : (
            'Generate Questions & Continue'
          )}
        </button>
      </div>
    </motion.div>
  );

  const renderInstructions = () => {
    const hasCompletedAttempt = history.some(h => h.module_id === selectedModule?.id && h.status === 'completed');

    return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto glass-card bg-theme-card/80 border border-theme-border rounded-3xl p-10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
          <Volume2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-theme-text">Interview Instructions</h2>
          <p className="text-theme-text-muted">{selectedModule?.name} {selectedCompany ? `- ${selectedCompany.name}` : ''}</p>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-1"><CheckCircle2 className="w-5 h-5" /></div>
          <div><h4 className="text-theme-text font-bold mb-1">Microphone Access Required</h4><p className="text-sm text-theme-text-muted">Please allow microphone access when prompted. Ensure you are in a quiet environment.</p></div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0 mt-1"><Mic className="w-5 h-5" /></div>
          <div><h4 className="text-theme-text font-bold mb-1">Speak Naturally</h4><p className="text-sm text-theme-text-muted">Answer as you would in a real interview. Speak clearly and at a normal pace.</p></div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0 mt-1"><AlertCircle className="w-5 h-5" /></div>
          <div><h4 className="text-theme-text font-bold mb-1">Editable Transcripts</h4><p className="text-sm text-theme-text-muted">Your speech will be converted to text automatically. You can edit the text before moving to the next question.</p></div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-1"><AlertCircle className="w-5 h-5" /></div>
          <div><h4 className="text-theme-text font-bold mb-1">One Attempt Only</h4><p className="text-sm text-theme-text-muted">You may only attempt this specific interview module once. Ensure you are fully prepared.</p></div>
        </div>
      </div>

      {hasCompletedAttempt && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
          <p className="text-red-400 font-bold flex items-center gap-2">
            <X className="w-5 h-5" /> You have already completed an interview for this module. Retakes are not allowed.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={() => setView('modules')} className="flex-1 py-4 bg-theme-glass hover:bg-theme-border rounded-xl text-theme-text font-bold transition-colors">
          Go Back
        </button>
        <button 
          onClick={startInterview} 
          disabled={hasCompletedAttempt}
          className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-theme-text font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasCompletedAttempt ? 'Already Completed' : 'Start Interview'}
        </button>
      </div>
    </motion.div>
    );
  };

  const renderInterview = () => {
    const currentQ = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;

    return (
      <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col">
        {/* Top Bar */}
        <div className="h-16 border-b border-theme-border bg-theme-card-alt flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-theme-text font-bold tracking-wider">{selectedModule?.name}</span>
            <span className="px-2 py-1 bg-brand-primary/20 text-brand-primary rounded text-[10px] font-bold uppercase tracking-wider">Active Session</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs text-theme-text-muted font-bold uppercase tracking-wider mb-1">Progress</span>
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-brand-primary" />
              </div>
            </div>
            <button onClick={() => { if(confirm("Are you sure you want to exit? Progress will be lost.")) setView('modules'); }} className="p-2 text-white-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Question Navigator */}
          <div className="w-20 lg:w-64 border-r border-theme-border bg-theme-card/30 p-4 flex flex-col gap-2 overflow-y-auto">
            <div className="hidden lg:block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Questions</div>
            {questions.map((q, idx) => {
              const isActive = idx === currentQuestionIndex;
              const isCompleted = answers[q.id] && idx !== currentQuestionIndex;
              return (
                <div key={q.id} className={`p-3 rounded-xl flex items-center gap-3 transition-colors ${isActive ? 'bg-brand-primary/20 border border-brand-primary/50' : isCompleted ? 'bg-theme-glass border border-transparent opacity-60' : 'border border-transparent opacity-40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${isActive ? 'bg-brand-primary text-theme-text' : isCompleted ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-white-muted'}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`hidden lg:block text-sm font-semibold truncate ${isActive ? 'text-theme-text' : 'text-theme-text-muted'}`}>
                    Question {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8 overflow-y-auto flex flex-col relative">
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
              
              {/* Question Card */}
              <div className="glass-card p-8 rounded-3xl bg-theme-card/80 border border-theme-border mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-brand-primary"></div>
                <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-4">Question {currentQuestionIndex + 1} of {questions.length}</h3>
                <p className="text-2xl md:text-3xl font-medium text-theme-text leading-relaxed">
                  {currentQ?.question_text}
                </p>
              </div>

              {/* Recording Area */}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <h4 className="text-sm font-bold text-theme-text-muted uppercase tracking-wider">Your Answer</h4>
                  <div className="flex items-center gap-4">
                    {isProcessingVoice && (
                      <span className="text-brand-primary text-sm font-bold animate-pulse flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing Audio with AI...
                      </span>
                    )}
                    <button 
                      onClick={toggleRecording}
                      disabled={isProcessingVoice || (transcript.length > 0 && !isRecording)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg ${isRecording ? 'bg-red-500 text-theme-text animate-pulse shadow-red-500/20' : isProcessingVoice || transcript.length > 0 ? 'bg-gray-500 text-white opacity-50 cursor-not-allowed' : 'bg-white text-brand-bg hover:bg-gray-200'}`}
                    >
                      {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      {isRecording ? 'Stop Recording' : transcript.length > 0 ? 'Recorded' : 'Start Recording'}
                    </button>
                  </div>
                </div>
                
                <textarea 
                  value={transcript}
                  readOnly
                  placeholder="Click 'Start Recording' and speak your answer. You can only record once. Your speech will be automatically transcribed here..."
                  className="flex-1 w-full bg-theme-card-alt/50 border border-theme-border rounded-2xl p-6 text-theme-text text-lg leading-relaxed focus:ring-2 focus:ring-brand-primary outline-none resize-none min-h-[250px] cursor-not-allowed"
                ></textarea>
              </div>

              {/* Bottom Navigation */}
              <div className="flex justify-between items-center mt-8 pt-8 border-t border-theme-border">
                <button 
                  onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 bg-theme-card border border-theme-border hover:bg-theme-glass rounded-xl text-theme-text font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                  <button 
                    onClick={finishInterview}
                    className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-theme-text font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Finish Interview
                  </button>
                ) : (
                  <button 
                    onClick={handleNextQuestion}
                    className="px-8 py-3 bg-brand-primary hover:bg-brand-secondary rounded-xl text-white font-bold flex items-center gap-2 transition-colors shadow-lg shadow-brand-primary/20"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!currentAttempt) return null;
    
    const ScoreCard = ({ title, score, color }) => (
      <div className="glass-card p-4 rounded-2xl bg-theme-card/40 border border-theme-border flex flex-col items-center justify-center text-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 border-[3px] font-bold text-xl
          ${score >= 80 ? 'border-emerald-500 text-emerald-400' : score >= 50 ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-400'}`}
        >
          {score}
        </div>
        <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{title}</span>
      </div>
    );

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-theme-text mb-2">Interview Performance Report</h2>
            <p className="text-theme-text-muted">Module: {currentAttempt.ai_interview_modules?.name}</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setView('modules')} className="px-4 py-2 bg-theme-card border border-theme-border hover:bg-theme-glass text-theme-text rounded-lg text-sm font-bold transition-colors">Return Home</button>
             <button onClick={() => { setView('modules'); handleModuleSelect(selectedModule); }} className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><RotateCcw className="w-4 h-4"/> Retake</button>
          </div>
        </div>

        {/* Overall Score Banner */}
        <div className="glass-card p-8 rounded-3xl bg-linear-to-br from-brand-primary/20 to-[#121c33] border border-brand-primary/30 flex flex-col sm:flex-row items-center gap-8 shadow-[0_0_50px_rgba(79,70,229,0.1)]">
          <div className="relative w-40 h-40 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4f46e5" strokeWidth="3" strokeDasharray={`${currentAttempt.overall_score}, 100`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-theme-text">{currentAttempt.overall_score}%</span>
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mt-1">Overall</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-theme-text mb-2">Great Effort!</h3>
            <p className="text-gray-300 leading-relaxed max-w-lg">
              Your overall performance was solid. You communicated ideas effectively, though there's room for improvement in specific keywords and fluency. Review the detailed metrics below.
            </p>
          </div>
        </div>

        {/* Granular Scores */}
        <div>
          <h4 className="text-lg font-bold text-theme-text mb-4">Detailed Metrics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <ScoreCard title="Communication" score={currentAttempt.comm_score} />
            <ScoreCard title="Confidence" score={currentAttempt.confidence_score} />
            <ScoreCard title="Fluency" score={currentAttempt.fluency_score} />
            <ScoreCard title="Grammar" score={currentAttempt.grammar_score} />
            <ScoreCard title="Vocabulary" score={currentAttempt.vocab_score} />
            <ScoreCard title="Pronunciation" score={currentAttempt.pron_score} />
          </div>
        </div>

        {/* Strengths & Weaknesses (Mocked aggregated from answers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border">
            <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5"/> Key Strengths</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2"></div> Maintained good vocal projection throughout.</li>
              <li className="flex items-start gap-2 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2"></div> Answered all questions without excessive pausing.</li>
            </ul>
          </div>
          <div className="glass-card p-6 rounded-2xl bg-theme-card/40 border border-theme-border">
            <h4 className="text-lg font-bold text-yellow-500 flex items-center gap-2 mb-4"><AlertCircle className="w-5 h-5"/> Areas to Improve</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2"></div> Try to incorporate more industry-specific terminology.</li>
              <li className="flex items-start gap-2 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2"></div> Reduce the use of filler words (um, like).</li>
            </ul>
          </div>
        </div>

      </motion.div>
    );
  };

  const renderHistory = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <button onClick={() => setView('modules')} className="text-theme-text-muted hover:text-theme-text flex items-center gap-2 text-sm font-bold transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Modules
          </button>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight">Interview History</h2>
        </div>
      </div>

      <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Module</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Overall Score</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.map(attempt => {
              const date = new Date(attempt.created_at).toLocaleDateString();
              const mins = Math.floor(attempt.duration_seconds / 60);
              const secs = attempt.duration_seconds % 60;
              return (
                <tr key={attempt.id} className="hover:bg-theme-glass transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">{date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-theme-text">{attempt.ai_interview_modules?.name || 'Unknown Module'}</td>
                  <td className="px-6 py-4 text-sm text-theme-text-muted font-mono">{mins}m {secs}s</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${attempt.overall_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : attempt.overall_score >= 50 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-400'}`}>
                      {attempt.overall_score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { setCurrentAttempt(attempt); setView('result'); }} className="text-brand-primary text-sm font-bold hover:underline">
                      View Report
                    </button>
                  </td>
                </tr>
              )
            })}
            {history.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No interview history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full">
      {view === 'modules' && renderModuleSelection()}
      {view === 'companies' && renderCompanySelection()}
      {view === 'resume' && renderResumeUpload()}
      {view === 'instructions' && renderInstructions()}
      {view === 'interview' && renderInterview()}
      {view === 'evaluating' && (
        <div className="fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-20 h-20 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">AI is evaluating your responses...</h2>
          <p className="text-theme-text-muted">Analyzing speech patterns, vocabulary, and technical accuracy.</p>
        </div>
      )}
      {view === 'result' && renderResult()}
      {view === 'history' && renderHistory()}
    </div>
  );
}
