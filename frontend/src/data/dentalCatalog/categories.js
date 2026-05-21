export const DENTAL_CATEGORIES = [
  { id: 'preventive',    label: 'Preventive',        color: 'emerald' },
  { id: 'restorative',   label: 'Restorative',       color: 'blue'    },
  { id: 'endodontic',    label: 'Endodontic',        color: 'amber'   },
  { id: 'periodontal',   label: 'Periodontal',       color: 'rose'    },
  { id: 'prosthodontic', label: 'Prosthodontic',     color: 'violet'  },
  { id: 'orthodontic',   label: 'Orthodontic',       color: 'cyan'    },
  { id: 'oral_surgery',  label: 'Oral Surgery',      color: 'red'     },
  { id: 'pediatric',     label: 'Pediatric',         color: 'pink'    },
  { id: 'cosmetic',      label: 'Cosmetic',          color: 'fuchsia' },
  { id: 'diagnostic',    label: 'Diagnostic / Misc.', color: 'slate'  },
];

export const CATEGORY_COLOR_MAP = Object.fromEntries(
  DENTAL_CATEGORIES.map(c => [c.id, c.color])
);
