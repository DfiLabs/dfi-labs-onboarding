import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const s3 = new S3Client({});
const ses = new SESv2Client({});
const BUCKET = process.env.BUCKET_NAME!;
const RECIPIENT = process.env.RECIPIENT_EMAIL!;
const SIGNED_TTL = Number(process.env.SIGNED_URL_TTL_SECONDS || 600);
const INVITE_SECRET = process.env.INVITE_SECRET!;

function ok(body: any){ return { statusCode: 200, headers: cors(), body: JSON.stringify(body) }; }
function bad(status: number, msg: string){ return { statusCode: status, headers: cors(), body: msg }; }
function cors(){ return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS' }; }

export const handler = async (event: any) => {
  if(event.httpMethod === 'OPTIONS') return ok({});
  const data = JSON.parse(event.body || '{}');
  const { email, clientType, country, files, inviteToken, userAgent } = data;
  if(!email || !clientType || !files || !Array.isArray(files)) {
    return bad(400, 'Invalid payload');
  }
  try {
    jwt.verify(inviteToken, INVITE_SECRET);
  } catch {
    return bad(401, 'Invalid invite token');
  }

  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  const record = { id, email, clientType, country, files, submittedAt, userAgent };

  // Write JSON summary to S3
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `submissions/${id}/submission.json`,
    ContentType: 'application/json',
    Body: JSON.stringify(record, null, 2),
  }));

  // Pre-sign GET links for email (valid 7 days)
  const links: string[] = [];
  for(const f of files){
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: f.key }), { expiresIn: Math.min(SIGNED_TTL, 7*24*3600) });
    links.push(`${f.filename} (${f.category}) → ${url}`);
  }

  const subject = `DFI Labs — Onboarding dossier: ${email} [${clientType}]`;
  const textLines = [
    `Client: ${email}`,
    `Type: ${clientType}`,
    `Country: ${country || 'n/a'}`,
    `Submitted: ${submittedAt}`,
    `Files:`,
    ...links.map(l => ' - ' + l),
    '',
    `This message was sent by the onboarding system.`,
  ];
  const text = textLines.join('\n');

  await ses.send(new SendEmailCommand({
    FromEmailAddress: RECIPIENT,
    Destination: { ToAddresses: [RECIPIENT] },
    Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
  }));

  return ok({ id, status: 'submitted' });
};
