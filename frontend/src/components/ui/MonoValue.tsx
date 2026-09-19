interface Props {
  value: string | number;
  label?: string;
  unit?: string;
  className?: string;
}

export default function MonoValue({ value, label, unit, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {label && (
        <span className="font-mono text-[10px] font-semibold tracking-[0.08em] uppercase text-on-surface-variant">
          {label}
        </span>
      )}
      <span className="font-mono text-data-mono text-primary font-medium">
        {value}{unit && <span className="text-on-surface-variant font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}
