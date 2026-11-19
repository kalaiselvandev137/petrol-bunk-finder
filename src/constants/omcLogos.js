// constants/omcLogos.js
const LOGOS = {
  iocl:   require('../../assets/images/petrol-maps/omc/iocl.jpg'),
  bpcl:   require('../../assets/images/petrol-maps/omc/bpcl.webp'),
  hpcl:   require('../../assets/images/petrol-maps/omc/hpcl.webp'),
  nayara: require('../../assets/images/petrol-maps/omc/nayara.jpg'),
  jiobp:  require('../../assets/images/petrol-maps/omc/jiobp.png'),
  shell:  require('../../assets/images/petrol-maps/omc/shell.png'),
};

// Maps whatever is typed in the dealer's OMC field to a logo key
const ALIASES = [
  [/iocl|indian\s*oil|indianoil/i, 'iocl'],
  [/bpcl|bharat/i, 'bpcl'],
  [/hpcl|hindustan|^hp$/i, 'hpcl'],
  [/nayara|essar/i, 'nayara'],
  [/jio|reliance|^rbml$/i, 'jiobp'],
  [/shell/i, 'shell'],
];

export function getOmcLogo(omc) {
  const text = String(omc || '').trim();
  if (!text) return null;
  const hit = ALIASES.find(([re]) => re.test(text));
  return hit ? LOGOS[hit[1]] : null; // null → fall back to the pump icon
}