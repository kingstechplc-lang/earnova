import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'
const db = new PrismaClient()
async function main() {
  const adminHash = await hash('admin1234', { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  await db.user.update({ where: { email: 'admin@example.com' }, data: { passwordHash: adminHash } })
  console.log('Admin password reset to admin1234')
  await db.$disconnect()
}
main()
