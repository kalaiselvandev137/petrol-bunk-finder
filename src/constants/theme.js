// Tailwind classes: icon colors, spinners, shadows, overlays.
export const COLORS = {
  navy: '#0B2559',
  blue: '#0A5BFF',
  cyan: '#00E5FF',
  mint: '#00E0C6',
  mintSoft: '#7DF3E6',
  teal: '#0A8F8F',
  success: '#00C9B1',
  warning: '#F5A524',
  danger: '#D93036',
  mist: '#F4F7FB',
  border: '#E3EBF6',
  muted: '#5B6B8C',
  soft: '#7A8AA8',
  faint: '#9AA9C2',
  disabled: '#C5D0E3',
};

// Shadows are set with `style` (not shadow-* classes) because NativeWind v4 +
// Expo Router can throw "Couldn't find a navigation context" on shadow classes.
export const CARD_SHADOW = {
  shadowColor: '#0B2559',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const SOFT_SHADOW = {
  shadowColor: '#0B2559',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const BUTTON_SHADOW = {
  shadowColor: '#0A5BFF',
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

// Transparent colors (instead of bg-black/40 style classes)
export const OVERLAY = 'rgba(11,37,89,0.55)';
export const GLASS = 'rgba(255,255,255,0.14)';