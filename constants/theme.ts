const tintColorLight = '#007AFF'; // A strong, trustworthy blue
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#f4f6fa', // A softer white
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Add more colors
    primary: '#007AFF',
    secondary: '#5856D6',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    card: '#FFFFFF',
    border: '#E0E0E0',
  },
  dark: {
    // ... define dark mode colors similarly
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    // ...
  },
};

export const Sizing = {
  borderRadius: 12,
  padding: 16,
  margin: 16,
  h1: 28,
  h2: 22,
  body: 16,
};