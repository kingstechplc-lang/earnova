import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // Update existing Adsterra integration with CDN + zone key
  const adsterra = await db.adNetwork.findUnique({ where: { code: 'adsterra' } })
  const monetag = await db.adNetwork.findUnique({ where: { code: 'monetag' } })
  if (!adsterra || !monetag) { console.log('Networks not found'); return }

  const platAdsterra = await db.platformAdNetworkIntegration.findFirst({ where: { adNetworkId: adsterra.id } })
  if (platAdsterra && !platAdsterra.cdnUrl) {
    await db.platformAdNetworkIntegration.update({
      where: { id: platAdsterra.id },
      data: {
        zoneKey: 'YOUR_ADSTERRA_ZONE_KEY',
        cdnUrl: 'www.highperformanceformat.com',
        formatOptions: JSON.stringify({ width: 300, height: 250, format: 'iframe' }),
      },
    })
    console.log('Updated Adsterra integration with CDN + zone key')
  }

  const platMonetag = await db.platformAdNetworkIntegration.findFirst({ where: { adNetworkId: monetag.id } })
  if (platMonetag && !platMonetag.cdnUrl) {
    await db.platformAdNetworkIntegration.update({
      where: { id: platMonetag.id },
      data: {
        zoneKey: 'YOUR_MONETAG_ZONE_ID',
        cdnUrl: 'YOUR_MONETAG_CDN_DOMAIN',
        formatOptions: null,
      },
    })
    console.log('Updated Monetag integration with CDN + zone key')
  }

  console.log('Done')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
