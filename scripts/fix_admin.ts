import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'
const db = new PrismaClient()
async function main() {
  const adminHash = await hash('admin1234', { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  await db.user.update({ where: { email: 'admin@example.com' }, data: { passwordHash: adminHash } })
  console.log('Admin re-hashed with admin1234')
  
  const kingsleyHash = await hash('demo1234', { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  await db.user.update({ where: { email: 'kingsley@example.com' }, data: { passwordHash: kingsleyHash } })
  console.log('Kingsley re-hashed with demo1234')
  
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
