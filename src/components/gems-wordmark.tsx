// "Light / cream sheet" variant of the GEMS wordmark design
// (https://claude.ai/design/p/56e666c4-c1c1-4ba4-91e4-3e9439d001d5) — a
// cream card with a subtle dot-grid, holding the ascending gEMS lockup
// (letters scale up left to right) in a navy-to-orange gradient matching
// this app's own accent colors.
export function GemsWordmark() {
  return (
    <div
      className="inline-block rounded-xl border border-black/5 px-4 py-3"
      style={{
        backgroundColor: '#F7F3EC',
        backgroundImage: 'radial-gradient(rgba(13,27,62,0.08) 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }}
    >
      <span
        className="font-serif font-bold leading-none"
        style={{
          backgroundImage: 'linear-gradient(90deg, #0D1B3E 0%, #0D1B3E 25%, #8B5A6B 55%, #F07B2F 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        <span className="text-base align-baseline">g</span>
        <span className="text-xl align-baseline">E</span>
        <span className="text-2xl align-baseline">M</span>
        <span className="text-3xl align-baseline">S</span>
      </span>
    </div>
  );
}
