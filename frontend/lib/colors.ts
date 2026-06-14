/**
 * Design System Color Tokens
 * Lexical Feedback Learning Platform
 */

export const colors = {
  primary: '#2C5AA0', // Navy blue
  secondary: '#6B7280', // Gray
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceSecondary: '#F3F4F6',
    border: '#E5E7EB',
    text: '#1F2937',
    textSecondary: '#6B7280',
  },
  
  dark: {
    background: '#0F172A',
    surface: '#1F2937',
    surfaceSecondary: '#374151',
    border: '#4B5563',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
  },
} as const;

export type Color = typeof colors;
