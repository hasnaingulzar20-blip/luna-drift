import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const profile = await db.profile.findFirst();
  if (!profile) throw new Error('no profile');
  const mk = (daysAgo: number, minutes: number, soundscape: string) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(23, 10, 0, 0);
    return { profileId: profile.id, minutes, soundscape, completed: true, endedAt: d };
  };
  await db.sleepSession.createMany({ data: [mk(0, 45, 'rain'), mk(3, 30, 'ocean'), mk(7, 60, 'fireplace'), mk(14, 25, 'piano'), mk(21, 40, 'train'), mk(28, 35, 'forest')] });
  console.log('seeded 6 sessions across the month');
  await db.$disconnect();
}
main();
