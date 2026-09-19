import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function UploadPage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  
  const [formData, setFormData] = useState({
    name: 'New Cadastral Project',
    parcel_id: 'DL-9821-2024',
    floor_count: 5,
    floor_height: 3.6,
    basement_count: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would POST to the API.
    // For now, redirect to the mock processing flow.
    navigate('/project/new/processing');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto p-6 pt-12 pb-24"
    >
      <ScrollReveal direction="up" delay={0}>
        <div className="flex flex-col gap-2 mb-10">
          <div className="flex items-center gap-2 text-on-surface-variant font-label-caps uppercase">
            <Link to="/projects" className="hover:text-primary">Projects</Link>
            <span className="material-icon text-[14px]">chevron_right</span>
            <span className="text-primary">New Registration</span>
          </div>
          <h1 className="font-headline text-headline-lg text-primary tracking-tight">Register 3D Parcel</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Upload verified 2D architectural plans for automated unit boundary detection and 3D extrusion.
          </p>
        </div>
      </ScrollReveal>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Upload Zone */}
        <ScrollReveal direction="up" delay={100} className="flex flex-col h-full">
          <div 
            className={`flex-1 min-h-[400px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary-fixed-dim/20' : 'border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
          >
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-primary">
              <span className="material-icon text-[32px]">cloud_upload</span>
            </div>
            <h3 className="font-headline text-headline-sm text-on-surface mb-2">Upload Floor Plans</h3>
            <p className="text-body-sm text-on-surface-variant mb-6">
              Drag & drop CAD exports or high-resolution blueprints.<br/>
              Supported formats: PNG, JPG, PDF (max 50MB)
            </p>
            <button type="button" className="cadastre-btn-secondary">
              Browse Files
            </button>
          </div>
        </ScrollReveal>

        {/* Right: Metadata Form */}
        <ScrollReveal direction="left" delay={200} className="flex flex-col">
          <div className="cadastre-card p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-4 border-b border-outline-variant/30">
               <span className="material-icon text-secondary text-[20px]">assignment</span>
               <h2 className="font-headline text-headline-sm text-primary">Parcel Metadata</h2>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Project Name</label>
              <input 
                type="text" 
                className="cadastre-input font-body text-body-md" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Parent Parcel ULPIN</label>
              <input 
                type="text" 
                className="cadastre-input" 
                value={formData.parcel_id}
                onChange={e => setFormData({...formData, parcel_id: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-on-surface-variant uppercase">Total Floors</label>
                <input 
                  type="number" 
                  className="cadastre-input" 
                  value={formData.floor_count}
                  onChange={e => setFormData({...formData, floor_count: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-on-surface-variant uppercase">Basement Levels</label>
                <input 
                  type="number" 
                  className="cadastre-input" 
                  value={formData.basement_count}
                  onChange={e => setFormData({...formData, basement_count: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Standard Floor Height (m)</label>
              <input 
                type="number" 
                step="0.1"
                className="cadastre-input" 
                value={formData.floor_height}
                onChange={e => setFormData({...formData, floor_height: parseFloat(e.target.value)})}
              />
            </div>

            <div className="mt-4 pt-6 border-t border-outline-variant/30 flex justify-end">
              <button type="submit" className="cadastre-btn-primary w-full justify-center py-3">
                <span className="material-icon text-[20px]">account_tree</span>
                Begin Detection Pipeline
              </button>
            </div>
          </div>
        </ScrollReveal>

      </form>
    </motion.div>
  );
}
