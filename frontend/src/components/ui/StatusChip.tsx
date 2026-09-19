interface Props {
  status: 'pass' | 'warning' | 'fail';
  label?: string;
  size?: 'sm' | 'md';
}

const STYLES = {
  pass: { bg: 'bg-primary-fixed/60', text: 'text-primary', icon: 'check_circle', defaultLabel: 'Pass' },
  warning: { bg: 'bg-tertiary-fixed/40', text: 'text-on-tertiary-fixed-variant', icon: 'warning', defaultLabel: 'Warning' },
  fail: { bg: 'bg-error-container', text: 'text-on-error-container', icon: 'error', defaultLabel: 'Fail' },
};

export default function StatusChip({ status, label, size = 'sm' }: Props) {
  const s = STYLES[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-data-mono-sm gap-1' : 'px-3 py-1 text-data-mono gap-1.5';
  return (
    <span className={`cadastre-chip ${s.bg} ${s.text} ${sizeClass} rounded font-semibold`}>
      <span className="material-icon text-[14px]">{s.icon}</span>
      {label || s.defaultLabel}
    </span>
  );
}
