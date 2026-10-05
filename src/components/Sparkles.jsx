import React, { useId } from 'react';

// Random helper within range
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

// Individual Sparkle Star SVG
const SparkleInstance = ({ size, color, style }) => {
  return (
    <span
      className="absolute pointer-events-none block animate-sparkle"
      style={{
        ...style,
        width: size,
        height: size,
        willChange: 'transform, opacity'
      }}
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          d="M80 0C80 44.1828 44.1828 80 0 80C44.1828 80 80 115.817 80 160C80 115.817 115.817 80 160 80C115.817 80 80 44.1828 80 0Z"
          fill={color}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`
          }}
        />
      </svg>
    </span>
  );
};

export default function Sparkles({
  color = '#00f0ff',
  count = 14,
  children,
  className = '',
  overflow = false
}) {
  const instanceId = useId();

  // Generate deterministic sparkle positions for high-performance rendering
  const sparkles = React.useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `${instanceId}-${i}`,
      size: random(8, 22),
      top: `${random(0, 100)}%`,
      left: `${random(0, 100)}%`,
      delay: `${random(0, 3000)}ms`,
      duration: `${random(1400, 2800)}ms`,
      color: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#ffffff' : color
    }));
  }, [count, color, instanceId]);

  return (
    <div className={`relative inline-block ${overflow ? 'overflow-visible' : 'overflow-hidden'} ${className}`}>
      {sparkles.map((sp) => (
        <SparkleInstance
          key={sp.id}
          size={sp.size}
          color={sp.color}
          style={{
            top: sp.top,
            left: sp.left,
            animationDelay: sp.delay,
            animationDuration: sp.duration
          }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
