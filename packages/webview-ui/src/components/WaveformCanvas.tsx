import React, { useEffect, useRef } from 'react';

interface WaveformCanvasProps {
  active: boolean;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      // Create gradient for glowing effect
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      if (active) {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.5, '#34d399');
        gradient.addColorStop(1, '#059669');
      } else {
        gradient.addColorStop(0, 'var(--text-muted)');
        gradient.addColorStop(1, 'var(--border-color)');
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = active ? 6 : 0;
      ctx.shadowColor = active ? 'rgba(16, 185, 129, 0.4)' : 'transparent';
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        // Draw normal wave if active, otherwise flat line with minor noise
        const amplitude = active ? (h / 3.5) * (0.7 + 0.3 * Math.sin(phase * 0.08)) : 1.5;
        const frequency = active ? 0.025 : 0.015;
        const y = h / 2 + Math.sin(x * frequency + phase) * amplitude + (active ? (Math.random() - 0.5) * 1.5 : 0);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      phase += active ? 0.06 : 0.012;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="health-waveform-canvas" />;
};
