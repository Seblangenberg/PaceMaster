import React from 'react';

interface RideReleaseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RideReleaseLogo({ className = '', size = 'md' }: RideReleaseLogoProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document/Form base */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
            fill="currentColor" 
            opacity="0.8" />
      
      {/* Folded corner */}
      <polyline points="14,2 14,8 20,8" 
                fill="currentColor" 
                opacity="0.6" />
      
      {/* Horse silhouette integrated into document */}
      <path d="M8 12c0-.5.2-1 .6-1.4.4-.4.9-.6 1.4-.6s1 .2 1.4.6c.4.4.6.9.6 1.4 0 .3-.1.6-.2.8l.7.7c.3-.5.5-1 .5-1.5 0-.8-.3-1.5-.9-2.1S10.8 9 10 9s-1.5.3-2.1.9S7 11.2 7 12c0 .5.2 1 .5 1.5l.7-.7c-.1-.2-.2-.5-.2-.8z" 
            fill="white" 
            opacity="0.9" />
      
      {/* Document lines representing forms/waivers */}
      <line x1="8" y1="16" x2="16" y2="16" 
            stroke="white" 
            strokeWidth="1" 
            opacity="0.7" />
      <line x1="8" y1="18" x2="14" y2="18" 
            stroke="white" 
            strokeWidth="1" 
            opacity="0.7" />
    </svg>
  );
}

// Simple horse icon alternative
export function HorseIcon({ className = '' }: { className?: string }) {
  return (
    <span className={`${className}`} role="img" aria-label="Horse">🐎</span>
  );
}