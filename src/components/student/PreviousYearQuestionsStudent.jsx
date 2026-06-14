import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, Search, ChevronRight, ArrowLeft, 
  FileQuestion, Calendar, Eye, FileText, Image as ImageIcon
} from 'lucide-react';
import DocumentViewer from './DocumentViewer';
import useDocumentTitle from '../../hooks/useDocumentTitle';

export default function PreviousYearQuestionsStudent() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation State: 'companies' -> 'documents'
  const [viewState, setViewState] = useState('companies');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Data States
  const [companies, setCompanies] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [companiesRes, docsRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('questions').select('*') // Using questions table as documents
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (docsRes.error) throw docsRes.error;
      
      setCompanies(companiesRes.data || []);
      setAllDocuments(docsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companies.length > 0) {
      const pathParts = location.pathname.split('/');
      const companyNameFromUrl = pathParts[3] ? decodeURIComponent(pathParts[3]) : null;

      if (!companyNameFromUrl) {
        setViewState('companies');
        setSelectedCompany(null);
      } else {
        const comp = companies.find(c => c.name === companyNameFromUrl || c.id === companyNameFromUrl);
        if (comp) {
          setSelectedCompany(comp);
          setViewState('documents');
        } else {
          // Invalid company, reset
          navigate('/dashboard/previous-year-questions', { replace: true });
        }
      }
    }
  }, [location.pathname, companies]);

  useDocumentTitle(
    viewState === 'documents' && selectedCompany
      ? `${selectedCompany.name} PYQ`
      : 'PYQ'
  );

  const handleCompanySelect = (company) => {
    navigate(`/dashboard/previous-year-questions/${encodeURIComponent(company.name)}`);
  };

  const handleDocumentSelect = (doc) => {
    setSelectedDocument(doc);
  };

  const handleBack = () => {
    if (viewState === 'documents') {
      navigate('/dashboard/previous-year-questions');
    }
  };

  // Derived Data
  const getCompanyDocumentCount = (companyId) => allDocuments.filter(q => q.company_id === companyId).length;
  
  const displayDocuments = allDocuments.filter(q => {
    if (q.company_id !== selectedCompany?.id) return false;
    return q.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* HEADER WITH BACK BUTTON */}
      <div className="flex items-center gap-4">
        {viewState !== 'companies' && (
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-theme-border rounded-full text-theme-text-muted hover:text-theme-text transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">
            {viewState === 'companies' && "Premium Document Library"}
            {viewState === 'documents' && `${selectedCompany?.name} Archives`}
          </h2>
          <p className="text-theme-text-muted">
            {viewState === 'companies' && "Select a company to browse full past papers and interview documents."}
            {viewState === 'documents' && "Browse and securely view authentic past papers and materials."}
          </p>
        </div>
      </div>

      {/* VIEW 1: COMPANIES */}
      {viewState === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {companies.map((company, i) => (
            <motion.div 
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleCompanySelect(company)}
              className="glass-card p-6 rounded-3xl bg-theme-card/40 border border-theme-border hover:border-brand-primary/50 cursor-pointer group transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-2 shadow-inner overflow-hidden">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-900" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-theme-text group-hover:text-brand-primary transition-colors">{company.name}</h3>
                  <p className="text-sm text-theme-text-muted">Updated {new Date(company.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-theme-border">
                <span className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {getCompanyDocumentCount(company.id)} Documents
                </span>
                <div className="w-8 h-8 rounded-full bg-theme-glass flex items-center justify-center group-hover:bg-brand-primary group-hover:text-theme-text text-white-muted transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))}
          {companies.length === 0 && !loading && (
            <div className="col-span-full p-12 text-center border border-dashed border-white/20 rounded-3xl">
              <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-theme-text">No Companies Available</h3>
              <p className="text-theme-text-muted">Please check back later.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DOCUMENT LIBRARY */}
      {viewState === 'documents' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-text-muted" />
              <input 
                type="text" placeholder="Search documents by title..." 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-theme-card/80 border border-theme-border rounded-xl py-4 pl-12 pr-4 text-theme-text focus:ring-2 focus:ring-brand-primary outline-none transition-all text-lg" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayDocuments.map(doc => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={doc.id} 
                onClick={() => handleDocumentSelect(doc)}
                className="glass-card bg-theme-card/40 border border-theme-border hover:border-brand-primary/50 hover:bg-theme-glass rounded-3xl overflow-hidden cursor-pointer group transition-all flex flex-col h-full"
              >
                {/* Thumbnail Area */}
                <div className="h-48 bg-linear-to-br from-[#121c33] to-[#0a0f1d] border-b border-theme-border flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-primary/5 group-hover:bg-brand-primary/10 transition-colors"></div>
                  {doc.category === 'PDF' ? (
                    <FileText className="w-20 h-20 text-red-500/50 group-hover:text-red-500 transition-colors transform group-hover:scale-110 duration-500" />
                  ) : (
                    <ImageIcon className="w-20 h-20 text-blue-500/50 group-hover:text-blue-500 transition-colors transform group-hover:scale-110 duration-500" />
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md border border-theme-border rounded-full text-xs font-bold uppercase tracking-wider text-theme-text">
                    {doc.category}
                  </div>
                </div>
                
                {/* Content Area */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {doc.year && <span className="px-2.5 py-1 bg-theme-glass text-theme-text-muted rounded text-xs font-bold font-mono border border-theme-border"><Calendar className="w-3 h-3 inline mr-1" />{doc.year}</span>}
                    <span className="text-xs text-gray-500 font-bold ml-auto">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold text-theme-text leading-tight mb-2 group-hover:text-brand-primary transition-colors line-clamp-2">{doc.title}</h3>
                  {doc.question_text && (
                    <p className="text-sm text-theme-text-muted line-clamp-2 mb-4">{doc.question_text}</p>
                  )}
                  
                  <div className="mt-auto pt-6">
                    <button className="w-full py-3 bg-theme-glass hover:bg-brand-primary group-hover:bg-brand-primary text-gray-300 hover:text-theme-text group-hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                      <Eye className="w-5 h-5" /> Open Document
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {displayDocuments.length === 0 && (
            <div className="p-16 text-center border border-dashed border-theme-border rounded-3xl bg-theme-card/20">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-theme-text mb-2">No Documents Found</h3>
              <p className="text-theme-text-muted">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      <AnimatePresence>
        {selectedDocument && (
          <DocumentViewer 
            url={selectedDocument.answer_text}
            type={selectedDocument.category}
            title={selectedDocument.title}
            onClose={() => setSelectedDocument(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
