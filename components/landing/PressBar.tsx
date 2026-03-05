const PRESS_LOGO_URLS = [
  "https://thisisneverstrangers.com/wp-content/uploads/2026/02/1.png",
  "https://thisisneverstrangers.com/wp-content/uploads/2026/02/2.png",
  "https://thisisneverstrangers.com/wp-content/uploads/2026/02/3.png",
  "https://thisisneverstrangers.com/wp-content/uploads/2026/02/4.png",
  "https://thisisneverstrangers.com/wp-content/uploads/2026/02/5.png",
];

export default function PressBar() {
  return (
    <div
      className="w-full flex items-stretch overflow-hidden"
      style={{ backgroundColor: "#080808", minHeight: "64px" }}
    >
      <style>{`
        @keyframes ptick {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .press-track {
          display: flex;
          align-items: center;
          animation: ptick 20s linear infinite;
          will-change: transform;
        }
        .press-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Label */}
      <div
        className="flex-shrink-0 flex items-center px-6 sm:px-10"
        style={{
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          AS SEEN IN
        </span>
      </div>

      {/* Scrolling logos */}
      <div className="flex-1 overflow-hidden flex items-center">
        <div className="press-track">
          {/* Duplicate twice for seamless loop */}
          {[...PRESS_LOGO_URLS, ...PRESS_LOGO_URLS].map((url, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-8 flex items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Press logo"
                style={{
                  height: "36px",
                  width: "auto",
                  filter: "brightness(0) invert(1)",
                  opacity: 0.6,
                  objectFit: "contain",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
