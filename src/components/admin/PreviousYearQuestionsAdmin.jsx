import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, FileQuestion, Plus, Search, Edit2, Trash2, 
  Image as ImageIcon, Filter, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function PreviousYearQuestionsAdmin() {
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' | 'documents'
  
  // Data States
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Form States
  const [companyForm, setCompanyForm] = useState({ name: '', logo_url: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    company_id: '', title: '', description: '', year: new Date().getFullYear().toString()
  });
  const [documentFile, setDocumentFile] = useState(null);

  // Filters for Documents
  const [documentFilters, setDocumentFilters] = useState({ company: '', search: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, docsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('questions').select('*, companies(name)').order('created_at', { ascending: false })
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (docsRes.error) throw docsRes.error;

      setCompanies(companiesRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (err) {
      console.error('Error fetching PYQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalLogoUrl = companyForm.logo_url;

      // Handle File Upload if selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(fileName);

        finalLogoUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase.from('companies').insert([{
        name: companyForm.name,
        logo_url: finalLogoUrl
      }]).select();
      
      if (error) throw error;
      setCompanies([data[0], ...companies]);
      setIsCompanyModalOpen(false);
      setCompanyForm({ name: '', logo_url: '' });
      setLogoFile(null);
    } catch (err) {
      console.error('Error creating company:', err);
      alert(`Failed to create company: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!confirm('Are you sure? This will also delete all associated documents.')) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      setCompanies(companies.filter(c => c.id !== id));
      setDocuments(documents.filter(q => q.company_id !== id));
    } catch (err) {
      console.error('Error deleting company:', err);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!documentFile) {
      alert("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload file to pyq-documents
      const fileExt = documentFile.name.split('.').pop().toLowerCase();
      const isPdf = fileExt === 'pdf';
      const fileTypeCategory = isPdf ? 'PDF' : 'Image';
      
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pyq-documents')
        .upload(fileName, documentFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('pyq-documents')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;

      // 2. Map data to existing questions table schema
      const mappedData = {
        company_id: documentForm.company_id,
        title: documentForm.title,
        year: documentForm.year,
        category: fileTypeCategory, // PDF or Image
        question_text: documentForm.description, // Store description here
        answer_text: fileUrl, // Store file URL here
        explanation: documentFile.name, // Store original filename
        difficulty: 'Medium' // Default requirement for schema
      };

      const { data, error } = await supabase.from('questions').insert([mappedData]).select('*, companies(name)');
      if (error) throw error;
      
      setDocuments([data[0], ...documents]);
      setIsDocumentModalOpen(false);
      setDocumentForm({ company_id: '', title: '', description: '', year: new Date().getFullYear().toString() });
      setDocumentFile(null);
    } catch (err) {
      console.error('Error creating document:', err);
      alert(`Failed to upload document: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      setDocuments(documents.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Derived counts
  const getCompanyDocumentCount = (companyId) => {
    return documents.filter(q => q.company_id === companyId).length;
  };

  const filteredDocuments = documents.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(documentFilters.search.toLowerCase());
    const matchesCompany = documentFilters.company === '' || q.company_id === documentFilters.company;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">Previous Year Questions</h2>
          <p className="text-theme-text-muted">Manage companies and placement questions for students.</p>
        </div>
        <div className="flex bg-theme-card p-1 rounded-xl border border-theme-border">
          <button 
            onClick={() => setActiveTab('companies')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'companies' ? 'bg-brand-primary text-white shadow-lg' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            Company Management
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'documents' ? 'bg-brand-primary text-theme-text shadow-lg' : 'text-theme-text-muted hover:text-white'}`}
          >
            Document Library
          </button>
        </div>
      </div>

      {/* TAB CONTENT: COMPANIES */}
      {activeTab === 'companies' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-primary" /> Companies
            </h3>
            <button onClick={() => setIsCompanyModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4">Company Logo</th>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Total Documents</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {companies.length > 0 ? (
                    companies.map(company => (
                      <tr key={company.id} className="hover:bg-theme-glass transition-colors">
                        <td className="px-6 py-4">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover bg-white" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-brand-primary">
                              {company.name.substring(0,2).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-theme-text">{company.name}</td>
                        <td className="px-6 py-4 text-theme-text-muted font-mono">
                          <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
                            {getCompanyDocumentCount(company.id)} Documents
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-theme-text-muted">
                          {new Date(company.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteCompany(company.id)} className="p-2 hover:bg-red-500/10 text-white-muted hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">No companies found. Click 'Add Company' to begin.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'documents' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-theme-text flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-secondary" /> Documents
            </h3>
            <button onClick={() => setIsDocumentModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-secondary hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Upload Document
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted" />
              <input 
                type="text" placeholder="Search documents..." 
                value={documentFilters.search} onChange={e => setDocumentFilters({...documentFilters, search: e.target.value})}
                className="w-full bg-theme-card border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary" 
              />
            </div>
            <select 
              value={documentFilters.company} onChange={e => setDocumentFilters({...documentFilters, company: e.target.value})}
              className="bg-theme-card border border-theme-border rounded-lg py-2 px-4 text-sm text-theme-text focus:ring-1 focus:ring-brand-primary outline-none"
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="glass-card rounded-2xl bg-theme-card/40 border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-theme-border text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4">Thumbnail</th>
                    <th className="px-6 py-4">Document Title</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map(q => (
                      <tr key={q.id} className="hover:bg-theme-glass transition-colors">
                        <td className="px-6 py-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${q.category === 'PDF' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                            {q.category === 'PDF' ? <FileQuestion className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-theme-text max-w-xs truncate" title={q.title}>{q.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{q.companies?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                            ${q.category === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}
                          >
                            {q.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-theme-text-muted font-mono">{q.year || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <a href={q.answer_text} target="_blank" rel="noopener noreferrer" className="p-2 inline-flex hover:bg-brand-primary/10 text-white-muted hover:text-brand-primary rounded-lg transition-colors mr-2">
                            <Search className="w-4 h-4" />
                          </a>
                          <button onClick={() => handleDeleteDocument(q.id)} className="p-2 hover:bg-red-500/10 text-white-muted hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">No documents found matching criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsCompanyModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
              <h3 className="text-xl font-bold text-theme-text mb-4">Add New Company</h3>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Company Name</label>
                  <input required type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. Amazon" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Logo Image Upload</label>
                  <input type="file" accept="image/*" onChange={e => { setLogoFile(e.target.files[0]); setCompanyForm({...companyForm, logo_url: ''}); }} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2 px-3 text-sm text-white focus:border-brand-primary outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary transition-all" />
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">OR PASTE URL BELOW</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Logo Image URL</label>
                  <input type="url" disabled={!!logoFile} value={companyForm.logo_url} onChange={e => setCompanyForm({...companyForm, logo_url: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none disabled:opacity-50" placeholder={logoFile ? "File selected above" : "https://example.com/logo.png"} />
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => { setIsCompanyModalOpen(false); setLogoFile(null); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 text-white rounded-lg text-sm font-bold transition-colors">
                    {isUploading ? 'Uploading...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDocumentModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={() => setIsDocumentModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-theme-text mb-4">Upload New Document</h3>
              {companies.length === 0 ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                  You must create a Company first before uploading documents!
                </div>
              ) : (
                <form onSubmit={handleCreateDocument} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Company</label>
                    <select required value={documentForm.company_id} onChange={e => setDocumentForm({...documentForm, company_id: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none">
                      <option value="" disabled>Select Company...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Document Title</label>
                    <input required type="text" value={documentForm.title} onChange={e => setDocumentForm({...documentForm, title: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. TCS NQT 2024 Paper" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Description (Optional)</label>
                    <textarea rows="2" value={documentForm.description} onChange={e => setDocumentForm({...documentForm, description: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="Provide context about this document..."></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Year</label>
                    <input type="text" required value={documentForm.year} onChange={e => setDocumentForm({...documentForm, year: e.target.value})} className="w-full bg-brand-bg border border-theme-border rounded-lg py-2.5 px-3 text-sm text-theme-text focus:border-brand-primary outline-none" placeholder="e.g. 2024" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-theme-text-muted mb-1 uppercase tracking-wider">Upload File (PDF, JPG, PNG)</label>
                    <div className="border-2 border-dashed border-theme-border rounded-xl p-6 text-center hover:bg-theme-glass transition-colors cursor-pointer" onClick={() => document.getElementById('doc-upload').click()}>
                      <FileQuestion className="w-8 h-8 text-brand-secondary mx-auto mb-2" />
                      <p className="text-sm font-bold text-theme-text mb-1">{documentFile ? documentFile.name : 'Click to select a file'}</p>
                      <p className="text-xs text-theme-text-muted">{documentFile ? `${(documentFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDFs or Images up to 50MB'}</p>
                      <input id="doc-upload" type="file" required accept=".pdf,image/*" className="hidden" onChange={e => setDocumentFile(e.target.files[0])} />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-theme-border">
                    <button type="button" onClick={() => { setIsDocumentModalOpen(false); setDocumentFile(null); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-text-muted hover:text-theme-text hover:bg-theme-glass">Cancel</button>
                    <button type="submit" disabled={isUploading} className="px-6 py-2 bg-brand-secondary hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors">
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
