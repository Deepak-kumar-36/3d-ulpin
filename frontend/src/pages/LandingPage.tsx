import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScrollReveal from '../components/ui/ScrollReveal';

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full">
      {/* SECTION 1: HERO (Slide 1) */}
      <section className="relative w-full min-h-[calc(100vh-64px)] flex flex-col border-b border-outline">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 relative">
          
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 md:p-12 border-r border-outline relative z-10 bg-surface/50 backdrop-blur-sm">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.8 }}
              className="flex items-center gap-4 text-on-surface-variant font-mono text-[10px] tracking-widest uppercase mb-12"
            >
              <span className="w-8 h-[1px] bg-outline"></span>
              <span>TRACK 02</span>
              <span className="text-on-surface font-semibold">URBAN PLANNING</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 2.4, duration: 1 }}
              className="flex flex-col gap-8 mb-auto"
            >
              <div className="relative w-fit">
                <h1 className="font-display text-[100px] md:text-[180px] font-bold leading-[0.85] tracking-tighter text-on-surface">
                  Verta
                </h1>
                <span className="absolute top-2 -right-6 font-mono text-[12px] text-on-surface-variant">TM</span>
              </div>
              
              <div className="flex flex-col gap-6 mt-4">
                <h2 className="font-headline text-[24px] md:text-[32px] tracking-[0.2em] leading-snug font-medium text-on-surface">
                  BEYOND PARCELS.<br />INTO POSSIBILITIES.
                </h2>
                <p className="font-body text-[18px] md:text-[22px] text-on-surface-variant max-w-xl font-light">
                  Automated 3D Vertical Property Mapping<br />from 2D Building Plans.
                </p>
                
                <div className="flex items-center gap-4 mt-4">
                  <Link to="/project/demo/viewer" className="px-8 py-4 bg-on-surface text-surface font-semibold tracking-wider hover:bg-tertiary hover:shadow-[0_0_20px_rgba(195,221,69,0.5)] hover:-translate-y-1 transition-all duration-300">
                    ENTER 3D CADASTRE
                  </Link>
                  <Link to="/project/new/upload" className="px-8 py-4 border border-outline hover:bg-surface-container-high hover:border-on-surface hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-1 transition-all duration-300 tracking-wider text-on-surface">
                    UPLOAD PLAN
                  </Link>
                </div>
              </div>
            </motion.div>



          </div>

          {/* Right Column (3D Visual) */}
          <div className="lg:col-span-5 relative flex items-center justify-center p-8 bg-surface-container overflow-hidden border-l border-outline/30">
            {/* The wireframe/building graphic would go here. We use an abstract CSS representation for now */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.5, duration: 1.5, ease: 'easeOut' }}
              className="w-full h-[600px] border border-outline/50 flex items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-center"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10" />
              
              <div className="flex flex-col gap-12 z-20 absolute right-8 font-mono text-[10px] tracking-widest text-on-surface-variant uppercase items-end">
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>ROOFTOP</span>
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>F3</span>
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>F2</span>
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>F1</span>
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>G</span>
                <span className="flex items-center gap-4"><span className="w-16 border-t border-dotted border-outline"></span>B1</span>
              </div>

              <div className="absolute bottom-12 right-12 text-right z-20">
                <p className="font-mono text-[12px] tracking-[0.15em] leading-loose text-on-surface">
                  SAME<br/>FOOTPRINT.<br/>A HIGHER<br/>PERSPECTIVE.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full h-16 border-t border-outline flex items-center justify-between px-6 font-mono text-[10px] tracking-widest uppercase text-on-surface-variant">
          <div className="flex items-center gap-8">
            <span className="material-icon text-[16px]">arrow_forward</span>
            <span>IDEAS</span>
            <span>PEOPLE</span>
            <span>IMPACT</span>
          </div>
          <span className="hidden md:inline">COMPUTATIONAL PROPERTY REGISTRY</span>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM (Slide 2) */}
      <section className="w-full min-h-screen flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Typography */}
          <div className="lg:col-span-5 flex flex-col p-8 md:p-12 border-r border-outline relative">
            <ScrollReveal direction="up" delay={0}>
              <div className="flex items-center gap-4 text-on-surface-variant font-mono text-[10px] tracking-widest uppercase mb-16">
                <span className="w-8 h-[1px] bg-outline"></span>
                <span>01 / 08</span>
                <span className="text-on-surface font-semibold">THE PROBLEM</span>
              </div>

              <div className="flex flex-col gap-6">
                <h2 className="font-display text-[64px] md:text-[100px] font-bold leading-[0.9] tracking-tight">
                  CITIES <br/>ARE <span className="text-tertiary">3D.</span>
                </h2>
                <h3 className="font-headline text-[20px] md:text-[24px] tracking-[0.15em] leading-snug font-medium text-on-surface mt-4">
                  BUT PROPERTY RECORDS<br/>ARE STILL MOSTLY 2D.
                </h3>
                <p className="font-body text-[18px] text-on-surface-variant leading-relaxed max-w-md mt-6">
                  Traditional land records capture where the property is, but not which property unit exists on which floor, at which elevation.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200} className="mt-auto pt-16">
              <div className="flex items-center gap-4 mb-4">
                 <span className="w-8 h-[1px] bg-outline"></span>
              </div>
              <p className="font-mono text-[14px] tracking-widest uppercase text-on-surface-variant">THE RESULT?</p>
              <p className="font-mono text-[16px] tracking-widest uppercase text-on-surface mt-2">A CRITICAL REPRESENTATION GAP.</p>
            </ScrollReveal>
          </div>

          {/* Middle Column: 2D */}
          <div className="lg:col-span-3 flex flex-col p-8 md:p-12 border-r border-outline bg-surface-container-low">
             <ScrollReveal direction="up" delay={100} className="flex flex-col h-full">
               <h3 className="font-display text-[64px] font-bold leading-none mb-4">2D</h3>
               <p className="font-mono text-[12px] tracking-widest uppercase text-on-surface mb-2">A FLAT VIEW</p>
               <p className="font-mono text-[10px] tracking-widest uppercase text-on-surface-variant mb-12">SHOWS THE PARCEL.<br/>NOT THE PEOPLE.</p>
               
               <div className="flex-1 w-full border border-outline relative bg-surface-container flex items-center justify-center overflow-hidden grayscale opacity-70">
                 {/* Fake Satellite Map */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] mix-blend-overlay"></div>
                 {/* 2D Polygon */}
                 <div className="w-48 h-48 border-2 border-tertiary bg-tertiary/20 transform rotate-12 z-10 rounded-sm shadow-[0_0_20px_rgba(141,163,153,0.3)]"></div>
               </div>

               <div className="mt-8">
                 <p className="font-mono text-[12px] tracking-widest uppercase text-on-surface mb-2">PARCEL BOUNDARY</p>
                 <p className="font-mono text-[10px] tracking-widest uppercase text-on-surface-variant">A SINGLE SHAPE FOR A COMPLEX REALITY.</p>
               </div>
             </ScrollReveal>
          </div>

          {/* Right Column: 3D */}
          <div className="lg:col-span-4 flex flex-col p-8 md:p-12 bg-surface-container-low relative">
            <div className="absolute top-8 right-8 text-right font-mono text-[10px] tracking-widest uppercase text-on-surface-variant">
              TRACK 02<br/><span className="text-on-surface">URBAN PLANNING</span>
            </div>

            <ScrollReveal direction="up" delay={200} className="flex flex-col h-full mt-16 md:mt-0">
               <h3 className="font-display text-[64px] font-bold leading-none mb-4 text-on-surface">3D</h3>
               <p className="font-mono text-[12px] tracking-widest uppercase text-on-surface mb-2">A TRUE PICTURE</p>
               <p className="font-mono text-[10px] tracking-widest uppercase text-on-surface-variant mb-12">SHOWS EVERY UNIT.<br/>ON EVERY FLOOR.</p>
               
               <div className="flex-1 w-full border border-outline relative bg-surface-container flex items-center justify-center overflow-hidden">
                 {/* Exploded 3D view abstract representation */}
                 <div className="relative w-full h-full flex flex-col justify-center items-center gap-8 py-12">
                   {[
                     { label: 'ROOFTOP', type: '' },
                     { label: 'F3', type: 'Residential' },
                     { label: 'F2', type: 'Residential' },
                     { label: 'F1', type: 'Commercial' },
                     { label: 'B1', type: 'Parking / Storage' },
                   ].map((f, i) => (
                     <div key={i} className="relative w-48 h-12 border border-tertiary/40 bg-surface flex items-center justify-center transform -skew-y-12 hover:bg-tertiary/10 transition-colors cursor-pointer group">
                       <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col">
                         <span className="font-mono text-[10px] tracking-widest uppercase text-on-surface flex items-center gap-2">
                           <span className="w-8 border-t border-dotted border-outline group-hover:border-tertiary"></span>
                           {f.label}
                         </span>
                         {f.type && <span className="font-mono text-[8px] tracking-widest text-on-surface-variant ml-10 mt-1">{f.type}</span>}
                       </div>
                     </div>
                   ))}
                   {/* Ghosting connecting lines */}
                   <div className="absolute top-1/4 bottom-1/4 left-1/2 w-48 -ml-24 border-x border-dashed border-outline-variant/30 transform -skew-y-12 pointer-events-none"></div>
                 </div>
               </div>

               <div className="mt-8">
                 <p className="font-mono text-[12px] tracking-widest uppercase text-on-surface mb-2">VERTICAL PROPERTY UNITS</p>
                 <p className="font-mono text-[10px] tracking-widest uppercase text-on-surface-variant">A CLEARER, FAIRER, SMARTER URBAN FUTURE.</p>
               </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full h-16 border-t border-outline flex items-center justify-between px-6 font-mono text-[10px] tracking-widest uppercase text-on-surface-variant bg-surface">
          <div className="flex items-center gap-8">
            <span className="material-icon text-[16px]">arrow_forward</span>
            <span className="hover:text-on-surface cursor-pointer">PROBLEM</span>
            <span className="hover:text-on-surface cursor-pointer">SOLUTION</span>
            <span className="hover:text-on-surface cursor-pointer">PROTOTYPE</span>
            <span className="hover:text-on-surface cursor-pointer">IMPACT</span>
          </div>
          <span className="hidden md:inline">VERTA</span>
        </div>
      </section>
    </div>
  );
}
