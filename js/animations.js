/**
 * DayFlow Native Micro-Animation Engine (WAAPI + CSS Compositor)
 * Zero dependencies, pure 60-120 FPS GPU-accelerated motion physics.
 * Tactile, responsive, and elegant (Linear / Apple inspired).
 */

/**
 * Creates a micro particle burst around an element (e.g., when completing a task or saving an item)
 * @param {HTMLElement} originEl 
 * @param {string} color 
 */
export function particleBurst(originEl, color = 'var(--accent-primary)') {
  if (!originEl || typeof document === 'undefined') return;

  // Respect system battery saver / reduced motion settings
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const rect = originEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const count = 7;
  const container = document.createElement('div');
  container.className = 'df-burst-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';

  const fragment = document.createDocumentFragment();
  const promises = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * (Math.PI * 2) + (Math.random() * 0.2 - 0.1);
    const distance = 24 + Math.random() * 16;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;

    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = `${centerX}px`;
    dot.style.top = `${centerY}px`;
    dot.style.width = '4px';
    dot.style.height = '4px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = color;
    dot.style.transform = 'translate(-50%, -50%) scale(1)';
    dot.style.willChange = 'transform, opacity';
    fragment.appendChild(dot);

    const anim = dot.animate([
      {
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1
      },
      {
        transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0.3)`,
        opacity: 0
      }
    ], {
      duration: 360,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });

    promises.push(new Promise(resolve => anim.onfinish = resolve));
  }

  container.appendChild(fragment);
  document.body.appendChild(container);

  let cleaned = false;
  const cleanup = () => {
    if (!cleaned) {
      cleaned = true;
      container.remove();
    }
  };

  Promise.all(promises).then(cleanup).catch(cleanup);
  setTimeout(cleanup, 450);
}

/**
 * Tactile spring bounce feedback on click/action
 * @param {HTMLElement} element 
 */
export function springBounce(element) {
  if (!element) return;
  element.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(0.88)' },
    { transform: 'scale(1.08)' },
    { transform: 'scale(0.98)' },
    { transform: 'scale(1)' }
  ], {
    duration: 320,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  });
}

/**
 * Gentle validation shake for invalid inputs
 * @param {HTMLElement} element 
 */
export function shakeElement(element) {
  if (!element) return;
  element.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(3px)' },
    { transform: 'translateX(0)' }
  ], {
    duration: 320,
    easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)'
  });
}
