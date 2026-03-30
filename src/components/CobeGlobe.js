import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export default function CobeGlobe({ className }) {
  const canvasRef = useRef();

  useEffect(() => {
    let phi = 0;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 1400 * 2,
      height: 1400 * 2,
      phi: 0,
      theta: 0.15,
      dark: 1,
      diffuse: 1.5,
      mapSamples: 20000,
      mapBrightness: 6,
      baseColor: [0.2, 0.3, 0.6], 
      markerColor: [0.1, 0.8, 1],    
      glowColor: [0.1, 0.4, 0.8], 
      markers: [],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.002; 
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: 1400,
          height: 1400,
          maxWidth: '100%',
          aspectRatio: '1/1',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
