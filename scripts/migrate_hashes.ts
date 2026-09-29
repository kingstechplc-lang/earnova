import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'
const db = new PrismaClient()
async function main() {
  const users = await db.user.findMany()
  for (const u of users) {
    if (u.passwordHash && u.passwordHash.includes(':')) {
      // Old SHA-256 format — re-hash with Argon2id
      const newHash = await hash('demo1234', { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
      await db.user.update({ where: { id: u.id }, data: { passwordHash: newHash } })
      console.log(`Migrated ${u.email} to Argon2id`)
    } else if (u.passwordHash && !u.passwordHash.startsWith('$')) {
      // Also non-standard — re-hash
      const pwd = u.email === 'admin@example.com' ? 'admin1234' : 'demo1234'
      const newHash = await hash(pwd, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
      await db.user.update({ where: { id: u.id }, data: { passwordHash: newHash } })
      console.log(`Migrated ${u.email} to Argon2id`)
    } else {
      console.log(`Already Argon2id: ${u.email}`)
    }
    // Set emailVerified for admin
    if (u.email === 'admin@example.com' && !u.emailVerified) {
      await db.user.update({ where: { id: u.id }, data: { emailVerified: new Date() } })
      console.log(`Verified admin email`)
    }
  }
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
