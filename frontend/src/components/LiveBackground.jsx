import { useEffect, useRef } from 'react';

/**
 * Cursor-reactive animated background.
 * Aurora blobs drift subtly, a soft glow follows the mouse with smooth easing.
 */
export default function LiveBackground() {
  const spotRef = useRef(null);
  const b1Ref = useRef(null);
  const b2Ref = useRef(null);
  const b3Ref = useRef(null);

  useEffect(() => {
    const spot = spotRef.current;
    const b1 = b1Ref.current;
    const b2 = b2Ref.current;
    const b3 = b3Ref.current;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;

    const render = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;

      const dx = x - window.innerWidth / 2;
      const dy = y - window.innerHeight / 2;

      spot.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      b1.style.transform = `translate3d(${dx * 0.03}px, ${dy * 0.03}px, 0)`;
      b2.style.transform = `translate3d(${dx * -0.045}px, ${dy * -0.045}px, 0)`;
      b3.style.transform = `translate3d(${dx * 0.06}px, ${dy * 0.06}px, 0)`;

      raf =
        Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4
          ? requestAnimationFrame(render)
          : 0;
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    render();
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="live-bg" aria-hidden="true">
      <div ref={b1Ref} className="live-bg-blob live-bg-blob-1" />
      <div ref={b2Ref} className="live-bg-blob live-bg-blob-2" />
      <div ref={b3Ref} className="live-bg-blob live-bg-blob-3" />
      <div className="live-bg-grid" />
      <div ref={spotRef} className="live-bg-spot" />
    </div>
  );
}