import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'

const s3 = new S3Client({})
const ses = new SESv2Client({})
const BUCKET = process.env.BUCKET_NAME!
const RECIPIENT = process.env.RECIPIENT_EMAIL!
const SIGNED_TTL = Number(process.env.SIGNED_URL_TTL_SECONDS || 604800)
const INVITE_SECRET = process.env.INVITE_SECRET!

function cors(){ return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS' } }
function ok(body: any){ return { statusCode: 200, headers: cors(), body: JSON.stringify(body) } }
function bad(status: number, msg: string){ return { statusCode: status, headers: cors(), body: msg } }

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({})

    const data = JSON.parse(event.body||'{}')
    const { email, clientType, country, files, inviteToken, userAgent } = data
    if (!email || !clientType || !Array.isArray(files)) return bad(400, 'Invalid payload')

    // token optional
    if (inviteToken) { try { jwt.verify(inviteToken, INVITE_SECRET) } catch { /* ignore */ } }

    const id = randomUUID()
    const submittedAt = new Date().toISOString()
    const record = { id, email, clientType, country, files, submittedAt, userAgent }

    // store submission record
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `submissions/${id}/submission.json`,
      ContentType: 'application/json',
      Body: JSON.stringify(record, null, 2)
    }))

    // signed links for email (optional)
    const links: string[] = []
    for (const f of files) {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.key }),
        { expiresIn: Math.min(SIGNED_TTL, 7*24*3600) })
      links.push(`${f.filename} (${f.category}) → ${url}`)
    }

    // try email, but don't fail the request if SES is not ready
    try {
      const subject = `DFI Labs — Onboarding dossier: ${email} [${clientType}]`
      const text = [
        `Client: ${email}`,
        `Type: ${clientType}`,
        `Country: ${country || 'n/a'}`,
        `Submitted: ${submittedAt}`,
        `Files:`,
        ...links.map((l,i)=>` ${i+1}. ${l}`),
        '',
        `This message was sent by the onboarding system.`
      ].join('\n')

      await ses.send(new SendEmailCommand({
        FromEmailAddress: RECIPIENT,
        Destination: { ToAddresses: [RECIPIENT] },
        Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } }
      }))
    } catch (e) {
      console.error('SES send failed (continuing):', e)
    }

    return ok({ id, status: 'submitted' })
  } catch (e:any) {
    console.error('submit error:', e)
    return bad(500, 'Internal error')
  }
}
