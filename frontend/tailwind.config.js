/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色调 - 更柔和的蓝紫色系
        primary: {
          DEFAULT: '#6366f1', // Indigo-500
          dark: '#4f46e5',    // Indigo-600
          light: '#818cf8'    // Indigo-400
        },
        secondary: {
          DEFAULT: '#8b5cf6', // Violet-500
          dark: '#7c3aed',    // Violet-600
          light: '#a78bfa'    // Violet-400
        },
        // 深色模式颜色
        dark: {
          DEFAULT: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        // 功能色
        success: {
          DEFAULT: '#10b981',   // Emerald-500
          light: '#34d399',     // Emerald-400
          dark: '#059669'       // Emerald-600
        },
        warning: {
          DEFAULT: '#f59e0b',   // Amber-500
          light: '#fbbf24',     // Amber-400
          dark: '#d97706'       // Amber-600
        },
        danger: {
          DEFAULT: '#ef4444',   // Red-500
          light: '#f87171',     // Red-400
          dark: '#dc2626'       // Red-600
        },
        info: {
          DEFAULT: '#3b82f6',   // Blue-500
          light: '#60a5fa',     // Blue-400
          dark: '#2563eb'       // Blue-600
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}