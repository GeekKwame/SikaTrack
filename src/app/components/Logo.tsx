import { useState } from "react";

export function Logo({ size = 32 }: { size?: number }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          background: "var(--gradient-primary)",
        }}
      >
        {!imageError ? (
          <img
            src="/images/SikaTrack logo.png"
            alt="SikaTrack Logo"
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <span
            className="text-white font-extrabold"
            style={{ fontSize: size * 0.55, lineHeight: 1 }}
          >
            ₵
          </span>
        )}
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-extrabold text-foreground tracking-tight"
          style={{ fontSize: size * 0.55 }}
        >
          Sika
          <span className="text-primary">Track</span>
        </span>
      </div>
    </div>
  );
}
