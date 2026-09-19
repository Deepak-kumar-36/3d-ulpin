import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Keep form data as strings to prevent NaN on clear
  const [formData, setFormData] = useState({
    name: 'New Cadastral Project',
    parcel_id: 'DL-9821-2024',
    floor_count: '5',
    floor_height: '3.6',
    basement_count: '1',
  });

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const VALID_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

  const validateAndAddFiles = (newFiles: FileList | File[]) => {
    setError(null);
    const validFiles: File[] = [];
    
    Array.from(newFiles).forEach(file => {
      if (!VALID_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only PNG, JPG, and PDF are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Max 50MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input so same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    // Parse to numbers here
    const parsedData = {
      name: formData.name,
      parcel_id: formData.parcel_id,
      floor_count: parseInt(formData.floor_count) || 0,
      floor_height: parseFloat(formData.floor_height) || 0,
      basement_count: parseInt(formData.basement_count) || 0,
    };
    
    // In a real app, this would POST to API with files.
    // For now, pass project name in state to processing page.
    navigate('/project/new/processing', { state: { projectName: parsedData.name, files } });
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
          <div className="flex items-center gap-2 text-on-surface-variant text-label-caps uppercase">
            <Link to="/projects" className="hover:text-primary">Projects</Link>
            <span className="material-icon text-[14px]">chevron_right</span>
            <span className="text-primary">New Registration</span>
          </div>
          <h1 className="font-headline text-headline-md text-primary tracking-tight">Register 3D Parcel</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Upload verified 2D architectural plans for automated unit boundary detection and 3D extrusion.
          </p>
        </div>
      </ScrollReveal>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Upload Zone */}
        <ScrollReveal direction="up" delay={100} className="flex flex-col h-full">
          <div 
            className={`flex-1 min-h-[400px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors relative ${
              isDragging ? 'border-primary bg-primary-fixed-dim/20' : 'border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => files.length === 0 && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              accept="image/png,image/jpeg,application/pdf"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {files.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-primary">
                  <span className="material-icon text-[32px]">cloud_upload</span>
                </div>
                <h3 className="font-headline text-headline-sm text-on-surface mb-2">Upload Floor Plans</h3>
                <p className="text-body-sm text-on-surface-variant mb-6 pointer-events-none">
                  Drag & drop CAD exports or high-resolution blueprints.<br/>
                  Supported formats: PNG, JPG, PDF (max 50MB)
                </p>
                <button type="button" className="cadastre-btn-secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse Files
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-start text-left overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                <div className="flex justify-between w-full items-center mb-4">
                  <span className="text-body-sm text-on-surface-variant">{files.length} file(s) selected</span>
                  <button type="button" className="text-primary text-body-sm hover:underline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>+ Add More</button>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center gap-3 bg-surface p-2 rounded border border-outline-variant/30">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-10 h-10 object-cover rounded bg-surface-container" />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-surface-container rounded">
                          <span className="material-icon text-secondary">description</span>
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="text-body-sm text-on-surface truncate">{file.name}</p>
                        <p className="text-xs text-on-surface-variant">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="p-1 hover:bg-error/20 hover:text-error rounded transition-colors text-on-surface-variant">
                        <span className="material-icon text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="text-error text-body-sm mt-2">{error}</p>}
        </ScrollReveal>

        {/* Right: Metadata Form */}
        <ScrollReveal direction="left" delay={200} className="flex flex-col">
          <div className="cadastre-card p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-4 border-b border-outline-variant/30">
               <span className="material-icon text-secondary text-[20px]">assignment</span>
               <h2 className="font-headline text-headline-sm text-primary">Parcel Metadata</h2>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta_name" className="text-label-caps text-on-surface-variant uppercase">Project Name</label>
              <input 
                id="meta_name"
                type="text" 
                className="cadastre-input font-body text-body-md" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta_parcel_id" className="text-label-caps text-on-surface-variant uppercase">Parent Parcel ULPIN</label>
              <input 
                id="meta_parcel_id"
                type="text" 
                className="cadastre-input" 
                value={formData.parcel_id}
                onChange={e => setFormData({...formData, parcel_id: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meta_floor_count" className="text-label-caps text-on-surface-variant uppercase">Total Floors</label>
                <input 
                  id="meta_floor_count"
                  type="text" 
                  className="cadastre-input" 
                  value={formData.floor_count}
                  onChange={e => setFormData({...formData, floor_count: e.target.value})}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meta_basement_count" className="text-label-caps text-on-surface-variant uppercase">Basement Levels</label>
                <input 
                  id="meta_basement_count"
                  type="text" 
                  className="cadastre-input" 
                  value={formData.basement_count}
                  onChange={e => setFormData({...formData, basement_count: e.target.value})}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta_floor_height" className="text-label-caps text-on-surface-variant uppercase">Standard Floor Height (m)</label>
              <input 
                id="meta_floor_height"
                type="text" 
                className="cadastre-input" 
                value={formData.floor_height}
                onChange={e => setFormData({...formData, floor_height: e.target.value})}
              />
            </div>

            <div className="mt-4 pt-6 border-t border-outline-variant/30 flex justify-end">
              <button type="submit" disabled={files.length === 0} className={`w-full justify-center py-3 ${files.length === 0 ? 'cadastre-btn-secondary opacity-50 cursor-not-allowed' : 'cadastre-btn-primary'}`}>
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
