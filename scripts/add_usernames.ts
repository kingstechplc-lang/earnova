import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  await db.user.update({ where: { email: 'kingsley@example.com' }, data: { username: 'kingsley', usernameLower: 'kingsley', bio: 'Content creator based in Accra. Building my first Christmas page.', country: 'Ghana', website: 'https://earnova.com', interests: JSON.stringify(['music', 'photography', 'christmas']) } })
  console.log('Kingsley: username set')
  await db.user.update({ where: { email: 'admin@example.com' }, data: { username: 'admin', usernameLower: 'admin' } })
  console.log('Admin: username set')
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
