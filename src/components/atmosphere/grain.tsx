/**
 * A whisper of film grain over the whole night — makes the deep navy feel
 * photographed rather than rendered. Pure SVG turbulence, no assets.
 */
export default function Grain() {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/></svg>`
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[65] opacity-[0.045] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: "180px 180px",
      }}
    />
  );
}
