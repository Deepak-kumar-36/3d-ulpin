import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createProject, uploadFloorPlan } from '../api/client';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate a random parcel ID like DL-4812-2024
  const generateParcelId = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    return `DL-${randomDigits}-${year}`;
  };

  const [formData, setFormData] = useState({
    name: 'New Cadastral Project',
    parcel_id: generateParcelId(),
    floor_count: 3,
    floor_height: 3.0,
    basement_count: 0,
  });

  // ── File validation ────────────────────────────────────────────────────────

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return `Invalid file type "${f.type}". Only PNG and JPG files are accepted.`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      setErrorMessage(err);
      setUploadState('error');
      return;
    }
    setFile(f);
    setErrorMessage(null);
    setUploadState('selected');

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, [validateFile]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  }, [handleFileSelect]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a floor plan image before submitting.');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // 1. Create project
      const { project_id } = await createProject(formData);

      // 2. Upload the floor plan image
      await uploadFloorPlan(project_id, file, 0, (pct) => {
        setUploadProgress(pct);
      });

      setUploadState('success');
      setUploadProgress(100);

      // 3. Navigate to processing
      setTimeout(() => {
        navigate(`/project/${project_id}/processing`);
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMessage(msg);
      setUploadState('error');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto p-6 pt-12 pb-24"
    >
      {/* Breadcrumb + Title */}
      <div className="flex flex-col gap-2 mb-10">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-caps uppercase">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span className="material-icon text-[14px]">chevron_right</span>
          <span className="text-primary">New Project</span>
        </div>
        <h1 className="font-headline text-headline-lg text-primary tracking-tight">
          Upload Floor Plan
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Upload a 2D floor plan image. The AI will detect unit boundaries, validate geometry, and generate the 3D cadastre model.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── Left: Upload Zone ────────────────────────────────────────── */}
        <div className="flex flex-col h-full">
          {uploadState === 'idle' || uploadState === 'error' ? (
            /* Drop zone */
            <div
              className={`flex-1 min-h-[400px] border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-surface-container-high'
                  : 'border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 bg-surface-container flex items-center justify-center mb-4 text-primary">
                <span className="material-icon text-[32px]">cloud_upload</span>
              </div>
              <h3 className="font-headline text-headline-sm text-on-surface mb-2">
                Upload Floor Plan
              </h3>
              <p className="text-body-sm text-on-surface-variant mb-4">
                Drag & drop or click to browse<br />
                PNG, JPG — max 50 MB
              </p>
              <button type="button" className="cadastre-btn-secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse Files
              </button>
            </div>
          ) : (
            /* Preview / Progress */
            <div className="flex-1 min-h-[400px] border border-outline bg-surface-container-lowest flex flex-col">
              {/* Image preview */}
              {preview && (
                <div className="flex-1 relative overflow-hidden bg-surface-container flex items-center justify-center">
                  <img
                    src={preview}
                    alt="Floor plan preview"
                    className="max-w-full max-h-[320px] object-contain"
                  />
                  {uploadState === 'uploading' && (
                    <div className="absolute inset-0 bg-surface/60 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-icon text-[32px] text-primary animate-pulse">cloud_upload</span>
                        <span className="font-mono text-data-mono text-on-surface">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                  {uploadState === 'success' && (
                    <div className="absolute inset-0 bg-surface/60 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-icon text-[32px] text-tertiary">check_circle</span>
                        <span className="font-mono text-data-mono text-tertiary">Uploaded</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* File info bar */}
              <div className="p-4 border-t border-outline flex items-center justify-between">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-data-mono text-on-surface truncate">{file?.name}</span>
                  <span className="font-mono text-data-mono-sm text-on-surface-variant">
                    {file ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                  </span>
                </div>
                {uploadState === 'selected' && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="cadastre-btn-ghost text-on-surface-variant hover:text-error"
                  >
                    <span className="material-icon text-[18px]">close</span>
                    Remove
                  </button>
                )}
              </div>

              {/* Upload progress bar */}
              {uploadState === 'uploading' && (
                <div className="px-4 pb-4">
                  <div className="h-1 w-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="mt-3 p-3 border border-error/30 bg-error/5 text-error text-body-sm flex items-start gap-2">
              <span className="material-icon text-[16px] mt-0.5">error</span>
              <span>{errorMessage}</span>
              {uploadState === 'error' && file === null && (
                <button
                  type="button"
                  onClick={() => { setErrorMessage(null); setUploadState('idle'); }}
                  className="ml-auto text-on-surface-variant hover:text-on-surface"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Metadata Form ─────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="cadastre-card p-6 flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-4 border-b border-outline-variant/30">
              <span className="material-icon text-secondary text-[20px]">assignment</span>
              <h2 className="font-headline text-headline-sm text-primary">Project Details</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Project Name</label>
              <input
                type="text"
                className="cadastre-input font-body text-body-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Parent Parcel ID</label>
              <input
                type="text"
                className="cadastre-input"
                value={formData.parcel_id}
                onChange={(e) => setFormData({ ...formData, parcel_id: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-on-surface-variant uppercase">Total Floors</label>
                <input
                  type="number"
                  min={1}
                  className="cadastre-input"
                  value={formData.floor_count}
                  onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps text-on-surface-variant uppercase">Basement Levels</label>
                <input
                  type="number"
                  min={0}
                  className="cadastre-input"
                  value={formData.basement_count}
                  onChange={(e) => setFormData({ ...formData, basement_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-on-surface-variant uppercase">Floor Height (m)</label>
              <input
                type="number"
                step="0.1"
                min={2}
                className="cadastre-input"
                value={formData.floor_height}
                onChange={(e) => setFormData({ ...formData, floor_height: parseFloat(e.target.value) || 3.0 })}
              />
            </div>

            {/* Pipeline overview */}
            <div className="pt-4 border-t border-outline-variant/30">
              <p className="font-label-caps text-on-surface-variant uppercase mb-3">Processing Pipeline</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { icon: 'upload_file', label: 'Upload floor plan' },
                  { icon: 'search', label: 'AI/CV unit detection' },
                  { icon: 'verified', label: 'Geometry validation' },
                  { icon: 'view_in_ar', label: '3D extrusion' },
                  { icon: 'fingerprint', label: 'ULPIN assignment' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-icon text-[14px]">{step.icon}</span>
                    <span className="font-mono text-data-mono-sm">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-outline-variant/30 flex gap-3">
              <button
                type="submit"
                disabled={uploadState === 'uploading'}
                className="cadastre-btn-primary flex-1 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadState === 'uploading' ? (
                  <>
                    <span className="material-icon text-[20px] animate-pulse">hourglass_top</span>
                    Uploading…
                  </>
                ) : (
                  <>
                    <span className="material-icon text-[20px]">play_arrow</span>
                    Start Processing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Demo shortcut */}
      <div className="mt-8 pt-8 border-t border-outline-variant/20 text-center">
        <p className="text-body-sm text-on-surface-variant mb-3">
          No floor plan handy? Run the full pipeline with synthetic demo data.
        </p>
        <button
          type="button"
          className="cadastre-btn-secondary"
          onClick={() => navigate('/project/demo/processing')}
        >
          <span className="material-icon text-[16px]">science</span>
          Run Demo Pipeline
        </button>
      </div>
    </motion.div>
  );
}
