import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'

const s3 = new S3Client({})
const BUCKET = process.env.BUCKET_NAME!
const SIGNED_TTL = Number(process.env.SIGNED_URL_TTL_SECONDS || 600)
const INVITE_SECRET = process.env.INVITE_SECRET!

function ok(body: any) {
  return { statusCode: 200, headers: cors(), body: JSON.stringify(body) }
}
function bad(status: number, msg: string) {
  return { statusCode: status, headers: cors(), body: msg }
}
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return ok({})
  const body = JSON.parse(event.body || '{}')
  const { filename, contentType, category, inviteToken } = body
  if (!filename || !contentType || !category) return bad(400, 'Missing fields')
  try {
    jwt.verify(inviteToken, INVITE_SECRET)
  } catch {
    return bad(401, 'Invalid invite token')
  }

  const id = randomUUID()
  const key = `uploads/${id}/${filename}`
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType
  })
  const url = await getSignedUrl(s3, cmd, {
    expiresIn: Math.min(SIGNED_TTL, 3600)
  })
  return ok({ url, key })
}
