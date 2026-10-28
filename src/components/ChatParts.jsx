import React, { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealDuration = (text) => Math.min(900, Math.max(350, text.length * 10));

export const RevealText = ({ text, animate, onProgress }) => {
  const [shown, setShown] = useState(0);
  const shouldAnimate = animate && !prefersReducedMotion();

  useEffect(() => {
    if (!shouldAnimate) return undefined;

    const steps = Math.max(1, Math.round(revealDuration(text) / 20));
    const chunk = Math.max(1, Math.ceil(text.length / steps));
    let count = 0;
    const intervalId = setInterval(() => {
      count = Math.min(text.length, count + chunk);
      setShown(count);
      if (onProgress) onProgress();
      if (count >= text.length) clearInterval(intervalId);
    }, 20);

    return () => clearInterval(intervalId);
  }, [text, shouldAnimate, onProgress]);

  return <>{shouldAnimate ? text.slice(0, shown) : text}</>;
};

export const TypingDots = () => (
  <span className="vantage-typing-dots" role="status" aria-label="Asisten sedang mengetik">
    <span></span>
    <span></span>
    <span></span>
  </span>
);
