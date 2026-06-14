import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Plus, Image as ImageIcon, Trash2, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function FeedbackModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]); // File objects
  const [previewUrls, setPreviewUrls] = useState([]); // Object URLs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newFiles = [];
    const newUrls = [];

    // Check limits and types
    let remainingSlots = 5 - images.length;
    
    for (const file of files) {
      if (remainingSlots <= 0) {
        alert('You can only upload a maximum of 5 images.');
        break;
      }
      
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`File ${file.name} is not a supported format. Please use JPG, PNG, or WEBP.`);
        continue;
      }

      // Max size check: 5MB per image
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 5MB size limit.`);
        continue;
      }

      newFiles.push(file);
      newUrls.push(URL.createObjectURL(file));
      remainingSlots--;
    }

    setImages(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      alert('Please enter a message to submit your feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrls = [];

      // 1. Upload Images to Supabase Storage
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('feedback')
            .upload(fileName, file);

          if (error) {
            console.error('Upload Error:', error);
            throw new Error(`Failed to upload image: ${file.name}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('feedback')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        }
      }

      // 2. Insert into user_feedback
      const { error } = await supabase.from('user_feedback').insert([{
        student_id: user.id,
        student_email: user.email,
        message: message.trim(),
        image_urls: uploadedUrls,
        status: 'Pending'
      }]);

      if (error) throw error;

      setIsSuccess(true);
      
      // Auto close after 3s
      setTimeout(() => {
        closeAndReset();
      }, 3000);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setMessage('');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setImages([]);
    setPreviewUrls([]);
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAndReset}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl bg-theme-card border border-theme-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {isSuccess ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <Send className="w-10 h-10 ml-1" />
              </div>
              <h2 className="text-3xl font-black text-theme-text mb-4">Feedback Submitted!</h2>
              <p className="text-theme-text-muted text-lg mb-8">Thank you for helping improve RISE. We'll look into it right away.</p>
              <button onClick={closeAndReset} className="px-8 py-3 bg-theme-glass hover:bg-theme-border text-white font-bold rounded-xl transition-colors">
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-theme-border bg-theme-card-alt/50">
                <div>
                  <h2 className="text-2xl font-bold text-theme-text">Submit Feedback</h2>
                  <p className="text-sm text-theme-text-muted mt-1">Report bugs, issues, suggestions, or share screenshots.</p>
                </div>
                <button onClick={closeAndReset} className="p-2 hover:bg-white/10 rounded-full transition-colors text-theme-text-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Message Field */}
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-2">Issue / Message <span className="text-red-400">*</span></label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or suggestion... (e.g. Mock test timer is not working properly)"
                    rows="5"
                    className="w-full bg-brand-bg border border-theme-border focus:border-brand-primary rounded-xl py-3 px-4 text-theme-text outline-none resize-none"
                  />
                </div>

                {/* File Upload Field */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold text-theme-text-muted uppercase tracking-wider">Upload Images</label>
                    <span className="text-xs text-theme-text-muted font-mono">{images.length} / 5</span>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    multiple 
                  />

                  {images.length < 5 && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-theme-border hover:border-brand-primary/50 rounded-xl flex flex-col items-center justify-center text-theme-text-muted hover:text-brand-primary transition-colors bg-theme-glass hover:bg-brand-primary/5 group"
                    >
                      <UploadCloud className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">Click to upload screenshots</span>
                      <span className="text-xs opacity-70 mt-1">Supports PNG, JPG, WEBP</span>
                    </button>
                  )}

                  {/* Image Previews */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mt-4">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg border border-theme-border overflow-hidden bg-brand-bg">
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => removeImage(idx)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {images.length < 5 && (
                        <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-theme-border border-dashed flex flex-col items-center justify-center text-theme-text-muted hover:text-white hover:bg-theme-glass transition-colors">
                          <Plus className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold uppercase">Add</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-theme-border bg-theme-card-alt/50 flex justify-end gap-3">
                <button onClick={closeAndReset} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-theme-text-muted hover:text-white transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !message.trim()} 
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-colors min-w-[160px] shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Feedback</>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
