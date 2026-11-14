// constants/visitOutcomes.js
// Colors come from the FuelPay theme. `strip` feeds StripCard, `bg`/`text` feed the pill.
import { COLORS } from './theme';

export const VISIT_OUTCOMES = [
  { id: 'Onboarded',      label: 'Onboarded',      icon: 'checkmark-circle', strip: COLORS.success, bg: '#D9F7F1', text: '#0A8F8F' },
  { id: 'Interested',     label: 'Interested',     icon: 'thumbs-up',        strip: COLORS.blue,    bg: '#E8F0FF', text: '#0A5BFF' },
  { id: 'Follow-up',      label: 'Follow-up',      icon: 'time',             strip: COLORS.warning, bg: '#FFF4D6', text: '#9A6B00' },
  { id: 'Not Interested', label: 'Not Interested', icon: 'close-circle',     strip: COLORS.danger,  bg: '#FDECEC', text: '#D93036' },
  { id: 'Not Available',  label: 'Not Available',  icon: 'person-remove',    strip: COLORS.faint,   bg: '#E8EEF8', text: '#5B6B8C' },
];

const FALLBACK = { id: 'Unknown', label: '—', icon: 'help-circle', strip: COLORS.faint, bg: '#E8EEF8', text: '#5B6B8C' };

export function outcomeMeta(id) {
  return VISIT_OUTCOMES.find((o) => o.id === id) || FALLBACK;
}