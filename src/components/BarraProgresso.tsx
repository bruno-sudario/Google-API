interface Props {
  msg: string;
  pct: number;
}

export default function BarraProgresso({ msg, pct }: Props) {
  const valor = Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{msg || 'Processando…'}</span>
        <span className="tabular-nums text-slate-500">{valor}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-slate-900 transition-[width] duration-300 ease-out"
          style={{ width: `${valor}%` }}
        />
      </div>
    </div>
  );
}
