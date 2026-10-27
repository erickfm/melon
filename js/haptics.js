/**
 * Haptics: navigator.vibrate where it exists (Android). On iOS Safari 18+,
 * clicking the label of an <input type="checkbox" switch> fires a system
 * haptic tick; this works inside user gestures, and may be ignored outside them.
 */

let label = null, last = 0;

function iosTick() {
  if (!label) {
    label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
  }
  label.click();
}

// strength: 0 light tick, 1 medium, 2 heavy
export function haptic(strength = 0) {
  const now = performance.now();
  if (now - last < 50) return;
  last = now;
  if (navigator.vibrate) {
    navigator.vibrate([8, 16, 35][strength] ?? 8);
    return;
  }
  iosTick();
  if (strength >= 1) setTimeout(iosTick, 60);
  if (strength >= 2) setTimeout(iosTick, 130);
}
