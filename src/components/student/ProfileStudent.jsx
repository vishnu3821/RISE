import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Mail, Lock, Shield, CheckCircle2, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileStudent() {
  const { user } = useAuth();
  const { isLightMode, toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Validate file size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select an image under 5MB.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // 2. Upload to Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 3. Get the public URL for the uploaded image
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 4. Update the user metadata with the short URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      
      // Force reload to update context and UI across the app
      window.location.reload();
    } catch (err) {
      alert(`Error uploading image: ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setMessage('Password updated successfully!');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h2 className="text-3xl font-bold text-theme-text tracking-tight mb-2">My Profile</h2>
        <p className="text-theme-text-muted">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* User Info Card */}
        <div className="md:col-span-1 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-3xl bg-theme-card/60 border border-theme-border text-center">
            <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()}>
              <div className="w-24 h-24 mx-auto rounded-full bg-linear-to-tr from-brand-primary to-brand-secondary p-1 mb-4 overflow-hidden relative">
                <div className="w-full h-full bg-theme-card rounded-full flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-brand-primary" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full m-1">
                  <span className="text-xs text-theme-text font-bold">Edit</span>
                </div>
              </div>
              <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-1">
              {user?.email?.split('@')[0] || 'Student User'}
            </h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-glass text-xs font-bold text-theme-text-muted">
              <Mail className="w-3 h-3" /> {user?.email}
            </div>
          </motion.div>
        </div>

        {/* Security Settings */}
        <div className="md:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-theme-border">
              <div className="p-2 bg-brand-primary/20 rounded-lg">
                <Shield className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-theme-text">Security Settings</h3>
                <p className="text-sm text-theme-text-muted">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-2 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-[#15203b] border border-theme-border rounded-xl py-3 pl-10 pr-4 text-sm text-theme-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/25"
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>

              {message && (
                <div className={`p-4 rounded-xl text-sm flex items-start gap-3 ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {message.includes('Error') ? <Shield className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  <p>{message}</p>
                </div>
              )}
            </form>
          </motion.div>

          {/* Preferences */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8 rounded-3xl bg-theme-card/40 border border-theme-border mt-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-theme-border">
              <div className="p-2 bg-brand-primary/20 rounded-lg">
                {isLightMode ? <Sun className="w-5 h-5 text-brand-primary" /> : <Moon className="w-5 h-5 text-brand-primary" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-theme-text">Preferences</h3>
                <p className="text-sm text-theme-text-muted">Customize your experience</p>
              </div>
            </div>

            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-theme-text font-bold">Theme</p>
                <p className="text-xs text-theme-text-muted">Switch between light and dark mode</p>
              </div>
              <button 
                onClick={toggleTheme}
                className="w-14 h-8 bg-theme-bg rounded-full p-1 relative transition-colors shadow-inner"
              >
                <motion.div 
                  className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-md"
                  animate={{ x: isLightMode ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {isLightMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                </motion.div>
              </button>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
