/**
 * Renders a shareable "night card" (1200×675 PNG) of the user's sleep stats
 * and triggers a download. Pure canvas 2D — no dependencies.
 */

export interface NightCardData {
  streak: number;
  totalMinutes: number;
  topSoundscape: string | null;
  week: { day: string; minutes: number }[];
}

const W = 1200;
const H = 675;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function drawCrescent(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // halo
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.4);
  halo.addColorStop(0, "rgba(236, 226, 200, 0.32)");
  halo.addColorStop(0.45, "rgba(205, 180, 124, 0.10)");
  halo.addColorStop(1, "rgba(205, 180, 124, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r * 1.15);
  body.addColorStop(0, "#f9f4e6");
  body.addColorStop(0.6, "#ece2c8");
  body.addColorStop(1, "#cdb47c");
  ctx.fillStyle = body;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // shadow bite
  ctx.fillStyle = "#0a0f22";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.62, y - r * 0.28, r * 0.92, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function downloadNightCard(data: NightCardData) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ── sky ──
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#04060f");
  sky.addColorStop(0.55, "#070c1d");
  sky.addColorStop(1, "#0a1024");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // horizon glow
  const glow = ctx.createRadialGradient(W * 0.5, H * 1.15, 60, W * 0.5, H * 1.15, H * 0.95);
  glow.addColorStop(0, "rgba(36, 52, 96, 0.5)");
  glow.addColorStop(1, "rgba(36, 52, 96, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // stars (seeded so the card is stable per render call)
  const rand = seededRandom(Math.floor(Date.now() / 60000));
  for (let i = 0; i < 130; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.86;
    const r = rand() * 1.5 + 0.3;
    const a = 0.25 + rand() * 0.6;
    ctx.fillStyle = `rgba(230, 236, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCrescent(ctx, W - 170, 140, 52);

  // ── words ──
  const serif = '"Cormorant Garamond", Georgia, serif';
  const sans = '"Manrope", system-ui, sans-serif';

  ctx.fillStyle = "rgba(221, 205, 164, 0.85)";
  ctx.font = `600 17px ${sans}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("LUNA DRIFT", 90, 120);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#f6f1e2";
  ctx.font = `300 76px ${serif}`;
  ctx.fillText("Another night,", 88, 230);
  ctx.font = `italic 300 76px ${serif}`;
  ctx.fillText("kept like a pressed flower", 88, 318);

  // ── stat blocks ──
  const hours = Math.floor(data.totalMinutes / 60);
  const mins = data.totalMinutes % 60;
  const stats: { label: string; value: string }[] = [
    { label: "NIGHT STREAK", value: `${data.streak}` },
    { label: "TIME ASLEEP WITH SOUND", value: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` },
    {
      label: "MOST HEARD",
      value: data.topSoundscape ?? "—",
    },
  ];
  const blockX = [90, 470, 850];
  stats.forEach((s, i) => {
    ctx.fillStyle = "rgba(143, 161, 196, 0.9)";
    ctx.font = `600 15px ${sans}`;
    ctx.letterSpacing = "4px";
    ctx.fillText(s.label, blockX[i], 430);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ece2c8";
    ctx.font = `300 52px ${serif}`;
    ctx.fillText(s.value, blockX[i], 496);
  });

  // ── week bars ──
  const bw = 46;
  const gap = 26;
  const chartX = 90;
  const chartBase = H - 90;
  const chartH = 74;
  const max = Math.max(30, ...data.week.map((d) => d.minutes));
  data.week.forEach((d, i) => {
    const h = d.minutes > 0 ? Math.max(6, (d.minutes / max) * chartH) : 3;
    const x = chartX + i * (bw + gap);
    if (d.minutes > 0) {
      const g = ctx.createLinearGradient(0, chartBase - h, 0, chartBase);
      g.addColorStop(0, "#ece2c8");
      g.addColorStop(1, "rgba(184, 154, 92, 0.45)");
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "rgba(159, 173, 216, 0.16)";
    }
    ctx.beginPath();
    ctx.roundRect(x, chartBase - h, bw, h, 8);
    ctx.fill();

    ctx.fillStyle = "rgba(103, 119, 156, 0.9)";
    ctx.font = `600 13px ${sans}`;
    ctx.textAlign = "center";
    ctx.fillText(d.day, x + bw / 2, chartBase + 26);
    ctx.textAlign = "left";
  });

  // footer
  ctx.fillStyle = "rgba(103, 119, 156, 0.75)";
  ctx.font = `400 15px ${sans}`;
  ctx.fillText("sleep well — the moon keeps watch", 90, H - 28);

  // border
  ctx.strokeStyle = "rgba(159, 173, 216, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // download
  const link = document.createElement("a");
  link.download = "luna-night-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
