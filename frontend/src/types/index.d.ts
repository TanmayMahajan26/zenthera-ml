/// <reference types="vite/client" />

// CSS module declarations
declare module '*.css' {}

// Custom CSS properties for animations
declare module 'react' {
  interface CSSProperties {
    '--rotation'?: string;
    '--duration'?: string;
    '--delay'?: string;
  }
}

export {};
