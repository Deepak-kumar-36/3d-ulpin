import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BuildingHeroPreview } from '../components/viewer/BuildingHeroPreview';

export default function LandingPage() {
  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.9, ease: "easeOut" }
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] justify-between relative overflow-hidden">
      
      {/* Abstract Background Elements for extra animation */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.05, scale: 1 }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-primary rounded-full blur-[120px] pointer-events-none"
        style={{ pointerEvents: 'none' }}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 0.03, scale: 1 }}
        transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
        className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-[#68a2b8] rounded-full blur-[100px] pointer-events-none"
        style={{ pointerEvents: 'none' }}
      />

      {/* Primary Focused Architectural Section */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Product Definition & Actions */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 flex flex-col gap-6"
        >
          {/* Contextual Label */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase text-primary">
            <motion.span 
              initial={{ scaleX: 0 }} 
              animate={{ scaleX: 1 }} 
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }} 
              className="w-8 h-[2px] bg-primary origin-left shadow-[0_0_10px_rgba(195,221,69,0.8)]" 
            />
            <span>CADASTRE ENGINE // 2D TO 3D STRATIFIED PROPERTY MAPPING</span>
          </motion.div>

          {/* Verta Wordmark Image in Hero for Maximum Visual Impact */}
          <motion.div variants={itemVariants} className="relative py-2">
            <motion.img 
              src="/verta-wordmark.jpg" 
              alt="Verta" 
              className="w-full max-w-[320px] md:max-w-[420px] object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.08)] pointer-events-none"
              whileHover={{ scale: 1.02, filter: 'drop-shadow(0 0 35px rgba(255,255,255,0.15))' }}
              transition={{ duration: 0.4 }}
            />
            {/* Animated Glitch/Glow behind logo */}
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-primary/20 blur-[50px] -z-10 mix-blend-screen rounded-full"
            />
          </motion.div>

          {/* Strong Headline */}
          <motion.h2 variants={itemVariants} className="font-headline text-[24px] md:text-[32px] font-medium tracking-tight text-on-surface leading-snug">
            Automated 3D Vertical Property Mapping from 2D Building Plans.
          </motion.h2>

          {/* Short PRD-Aligned Explanation */}
          <motion.p variants={itemVariants} className="font-body text-[15px] md:text-[17px] text-on-surface-variant leading-relaxed max-w-xl">
            Convert architectural building floor plans into validated, uniquely-identified 3D property units. Bridge flat 2D land parcel footprints with vertical multi-strata ownership volumes.
          </motion.p>

          {/* Core Technical Actions */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-4">
            <Link 
              to="/project/demo/viewer" 
              className="px-8 py-4 bg-primary text-on-primary font-mono text-sm tracking-widest uppercase font-bold rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center gap-3 shadow-[0_0_20px_rgba(195,221,69,0.3)] hover:shadow-[0_0_35px_rgba(195,221,69,0.5)] hover:-translate-y-1 cursor-pointer group/cta relative overflow-hidden"
            >
              {/* Shine effect on button */}
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
              />
              <span className="relative z-10">ENTER 3D CADASTRE</span>
              <span className="material-icon text-[18px] relative z-10 group-hover/cta:translate-x-1 transition-transform">arrow_forward</span>
            </Link>

            <Link 
              to="/project/demo/upload" 
              className="px-8 py-4 bg-surface/80 backdrop-blur-md border border-outline hover:border-primary/50 text-on-surface font-mono text-sm tracking-widest uppercase rounded-lg hover:bg-surface-container-highest transition-all duration-300 flex items-center gap-3 cursor-pointer group/upload hover:-translate-y-1 hover:shadow-cadastre"
            >
              <span>UPLOAD PLAN</span>
              <span className="material-icon text-[18px] group-hover/upload:-translate-y-1 transition-transform">upload_file</span>
            </Link>
          </motion.div>

          {/* Key Pipeline Stages */}
          <motion.div variants={itemVariants} className="pt-8 border-t border-outline/30 grid grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">01 / DETECT</span>
              <span className="font-body text-xs text-on-surface-variant">2D Room Boundary Polygons</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">02 / EXTRUDE</span>
              <span className="font-body text-xs text-on-surface-variant">3D Volumes & Elevation Stacking</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">03 / VALIDATE</span>
              <span className="font-body text-xs text-on-surface-variant">Overlap & Containment Checks</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column: Live Interactive 3D Architectural Cutaway */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 h-[480px] md:h-[560px] w-full"
        >
          <BuildingHeroPreview />
        </motion.div>
      </section>

      {/* Minimal Technical Telemetry Bar */}
      <footer className="w-full border-t border-outline/30 bg-surface/80 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between font-mono text-[10px] tracking-wider uppercase text-on-surface-variant">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-on-surface">DEMO PARCEL: DL-9821-2024</span>
          </span>
          <span className="hidden sm:inline">COORDINATE SYSTEM: LOCAL CARTESIAN</span>
          <span className="hidden md:inline">STRATA: B01 TO F05</span>
        </div>
        <div className="flex items-center gap-4">
          <span>29 3D VOLUMES DETECTED</span>
          <span className="text-primary font-semibold">1 VALIDATION ANOMALY</span>
        </div>
      </footer>
    </div>
  );
}
