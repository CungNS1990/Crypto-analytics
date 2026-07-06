interface RsiGaugeProps {
  value: number;
}

export default function RsiGauge({ value }: RsiGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const rotation = (clamped / 100) * 180 - 90;

  let zone = "Trung tính";
  let zoneColor = "text-gray-400";
  if (clamped < 30) {
    zone = "Quá bán";
    zoneColor = "text-green-400";
  } else if (clamped > 70) {
    zone = "Quá mua";
    zoneColor = "text-red-400";
  } else if (clamped < 45) {
    zone = "Hơi yếu";
    zoneColor = "text-emerald-400";
  } else if (clamped > 55) {
    zone = "Hơi mạnh";
    zoneColor = "text-orange-400";
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 flex flex-col items-center">
      <p className="text-xs text-gray-400 mb-2 self-start">RSI (14)</p>
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-[6px] border-gray-700 border-b-0" />
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-14 origin-bottom transition-transform duration-500"
          style={{
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            background: "linear-gradient(to top, #22c55e, #eab308, #ef4444)",
          }}
        />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-white border-2 border-gray-900" />
      </div>
      <p className="text-2xl font-bold mt-2">{clamped.toFixed(1)}</p>
      <p className={`text-sm ${zoneColor}`}>{zone}</p>
      <div className="flex justify-between w-full text-[10px] text-gray-600 mt-2 px-1">
        <span>0</span>
        <span>30</span>
        <span>70</span>
        <span>100</span>
      </div>
    </div>
  );
}
