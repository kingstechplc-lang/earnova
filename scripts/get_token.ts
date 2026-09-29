import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const tokens = await db.emailVerificationToken.findMany({ take: 1, orderBy: { createdAt: 'desc' } })
  if (tokens.length > 0) {
    console.log('Token:', tokens[0].token)
  } else {
    console.log('No tokens found')
  }
  await db.$disconnect()
}
main()
