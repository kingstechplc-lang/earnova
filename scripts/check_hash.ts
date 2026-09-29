import { PrismaClient } from '@prisma/client'
import { verify } from '@node-rs/argon2'
const db = new PrismaClient()
async function main() {
  const user = await db.user.findUnique({ where: { email: 'admin@example.com' } })
  console.log('Hash starts with $:', user?.passwordHash?.startsWith('$'))
  console.log('Hash length:', user?.passwordHash?.length)
  console.log('Hash prefix:', user?.passwordHash?.substring(0, 30))
  if (user?.passwordHash) {
    const valid = await verify(user.passwordHash, 'admin1234')
    console.log('Verify result:', valid)
  }
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
