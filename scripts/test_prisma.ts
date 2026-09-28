import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const id = 'cmulhrrwm000hq4wd98angf72'
async function main() {
  const updated = await db.platformAdNetworkIntegration.update({
    where: { id },
    data: {
      lastTestedAt: new Date(),
      lastTestResult: JSON.stringify({ ok: true, message: 'test' }),
    },
  })
  console.log('Updated:', JSON.stringify(updated, null, 2))
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
