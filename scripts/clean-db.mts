import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const dreams = await db.dreamNote.findMany();
  console.log('dreams before:', dreams.length);
  await db.dreamNote.deleteMany({});
  await db.sleepSession.deleteMany({});
  await db.profile.updateMany({ data: { streak: 0, totalMinutes: 0, lastSessionDay: null } });
  const p = await db.profile.findFirst();
  console.log('after -> dreams:', await db.dreamNote.count(), 'sessions:', await db.sleepSession.count(), 'profile:', JSON.stringify(p));
  await db.$disconnect();
}
main();
