'use client';
import useCanvasCursor from '@/hook/useCanvasCursor';

const CanvasCursor = () => {
  useCanvasCursor();
  
  return (
    <canvas 
      id="canvas-cursor"
      className="pointer-events-none fixed inset-0 z-[-1]"
    />
  );
};

export default CanvasCursor;