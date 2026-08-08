import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export default function Select({ label, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={selectId} className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <select
        id={selectId}
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
