import { useEffect, useMemo, useRef } from 'react';

/**
 * Advanced cursor-reactive background.
 * - Aurora blobs that parallax toward the mouse
 * - A soft cursor glow with staggered ghost trails
 * - A starfield that shifts with depth as you move
 * - Spotlight highlight on glass cards under the cursor
 * - Ripple bursts on click
 */
export default function LiveBackground() {
  const layerRef = useRef(null);
  const starWrapRef = useRef(null);

  const stars = useMemo(() => {
    const n = 80;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.2,
        depth: 0.3 + Math.random() * 0.7,
        opacity: 0.2 + Math.random() * 0.5,
        delay: Math.random() * 3,
        dur: 2.5 + Math.random() * 3,
      });
    }
    return out;
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    const spot = layer.querySelector('[data-spot]');
    const ghosts = Array.from(layer.querySelectorAll('[data-ghost]'));
    const blobs = Array.from(layer.querySelectorAll('[data-blob]'));
    const starNodes = Array.from(starWrapRef.current.children);

    // Chase chain positions: [cursorTarget, spot, g1, g2, g3]
    const factors = [0.16, 0.1, 0.065, 0.042];
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    const pos = [0, 1, 2, 3].map(() => ({ x: tx, y: ty }));

    let raf = 0;

    const render = () => {
      pos[0].x += (tx - pos[0].x) * factors[0];
      pos[0].y += (ty - pos[0].y) * factors[0];
      for (let i = 1; i < pos.length; i++) {
        pos[i].x += (pos[i - 1].x - pos[i].x) * factors[i];
        pos[i].y += (pos[i - 1].y - pos[i].y) * factors[i];
      }

      const dx = tx - window.innerWidth / 2;
      const dy = ty - window.innerHeight / 2;

      spot.style.transform = `translate3d(${pos[0].x - 220}px, ${pos[0].y - 220}px, 0)`;
      ghosts.forEach((g, i) => {
        g.style.transform = `translate3d(${pos[i + 1].x - 130 - i * 14}px, ${pos[i + 1].y - 130 - i * 14}px, 0)`;
        g.style.opacity = String(0.16 - i * 0.045);
      });
      blobs[0].style.transform = `translate3d(${dx * 0.03}px, ${dy * 0.03}px, 0)`;
      blobs[1].style.transform = `translate3d(${dx * -0.045}px, ${dy * -0.045}px, 0)`;
      blobs[2].style.transform = `translate3d(${dx * 0.06}px, ${dy * 0.06}px, 0)`;

      for (let i = 0; i < starNodes.length; i++) {
        const s = stars[i];
        starNodes[i].style.transform = `translate3d(${dx * (1 - s.depth) * 0.12}px, ${dy * (1 - s.depth) * 0.12}px, 0)`;
      }

      raf = Math.max(Math.abs(tx - pos[pos.length - 1].x), Math.abs(ty - pos[pos.length - 1].y)) > 0.4
        ? requestAnimationFrame(render)
        : 0;
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(render);

      // Per-card spotlight (local coords)
      const card = e.target.closest('.glass-card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--lx', `${e.clientX - r.left}px`);
        card.style.setProperty('--ly', `${e.clientY - r.top}px`);
      }
    };

    const onClick = (e) => {
      const ripple = document.createElement('div');
      ripple.className = 'live-bg-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      layer.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    render();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stars]);

  return (
    <div className="live-bg" ref={layerRef} aria-hidden="true">
      <div ref={starWrapRef} className="live-bg-stars">
        {stars.map((s, i) => (
          <span
            key={i}
            className="live-bg-star"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
          >
            <i
              style={{
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          </span>
        ))}
      </div>
      <div data-blob className="live-bg-blob live-bg-blob-1" />
      <div data-blob className="live-bg-blob live-bg-blob-2" />
      <div data-blob className="live-bg-blob live-bg-blob-3" />
      <div className="live-bg-grid" />
      <div data-spot className="live-bg-spot" />
      <div data-ghost className="live-bg-ghost g1" />
      <div data-ghost className="live-bg-ghost g2" />
      <div data-ghost className="live-bg-ghost g3" />
    </div>
  );
}