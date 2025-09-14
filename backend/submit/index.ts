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

async function triggerScreening(caseId: string, record: any) {
  // In production, this would invoke the screening Lambda function
  // For now, we'll make an HTTP request to the screening endpoint
  const screeningPayload = {
    caseId,
    fullLegalName: record.fullLegalName,
    dateOfBirth: record.dateOfBirth,
    fullAddress: record.fullAddress,
    taxResidencyCountry: record.taxResidencyCountry,
    tin: record.tin,
    mobileNumber: record.mobileNumber,
    pepStatus: record.pepStatus,
    nationality: record.nationality,
    clientType: record.clientType,
    registrationNumber: record.registrationNumber,
    email: record.email
  }

  // This would be an internal Lambda invocation in production
  console.log('Triggering screening for case:', caseId, screeningPayload)
}

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({})

    const data = JSON.parse(event.body||'{}')
    const {
      email, clientType, country, files, inviteToken, userAgent,
      // Universal fields
      fullLegalName, dateOfBirth, fullAddress, taxResidencyCountry, tin,
      mobileNumber, pepStatus, pepDetails, subscriptionBand,
      // Individual fields
      nationality,
      // Entity fields
      registeredLegalName, registrationNumber, uboList,
      authorizedSignatoryName, authorizedSignatoryTitle, lei
    } = data
    
    // Basic validation
    if (!email || !clientType || !Array.isArray(files)) return bad(400, 'Invalid payload')
    
    // Universal field validation
    if (!fullLegalName || !dateOfBirth || !fullAddress || !taxResidencyCountry || 
        !tin || !mobileNumber || !pepStatus || !subscriptionBand) {
      return bad(400, 'Missing required universal KYC fields')
    }
    
    // Individual-specific validation
    if (clientType === 'individual' && !nationality) {
      return bad(400, 'Missing nationality for individual client')
    }
    
    // Entity-specific validation
    if (clientType === 'entity' && (!registeredLegalName || !registrationNumber || 
        !uboList || !authorizedSignatoryName || !authorizedSignatoryTitle)) {
      return bad(400, 'Missing required entity KYC fields')
    }

    // token optional
    if (inviteToken) { try { jwt.verify(inviteToken, INVITE_SECRET) } catch { /* ignore */ } }

    const id = randomUUID()
    const submittedAt = new Date().toISOString()
    const record = {
      id, email, clientType, country, files, submittedAt, userAgent,
      // Universal fields
      fullLegalName, dateOfBirth, fullAddress, taxResidencyCountry, tin,
      mobileNumber, pepStatus, pepDetails, subscriptionBand,
      // Individual fields
      ...(clientType === 'individual' && { nationality }),
      // Entity fields
      ...(clientType === 'entity' && {
        registeredLegalName, registrationNumber, uboList,
        authorizedSignatoryName, authorizedSignatoryTitle, lei
      })
    }

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
      const subject = `DFI Labs — KYC Onboarding: ${fullLegalName} [${clientType}]`
      const text = [
        `=== CLIENT INFORMATION ===`,
        `Email: ${email}`,
        `Client Type: ${clientType}`,
        `Country: ${country || 'n/a'}`,
        `Submitted: ${submittedAt}`,
        '',
        `=== UNIVERSAL KYC FIELDS ===`,
        `Full Legal Name: ${fullLegalName}`,
        `Date of Birth/Incorporation: ${dateOfBirth}`,
        `Full Address: ${fullAddress}`,
        `Tax Residency Country: ${taxResidencyCountry}`,
        `TIN: ${tin}`,
        `Mobile Number: ${mobileNumber}`,
        `PEP Status: ${pepStatus}`,
        ...(pepStatus === 'yes' && pepDetails ? [`PEP Details: ${pepDetails}`] : []),
        `Subscription Band: ${subscriptionBand}`,
        '',
        ...(clientType === 'individual' ? [
          `=== INDIVIDUAL-SPECIFIC FIELDS ===`,
          `Nationality: ${nationality}`
        ] : [
          `=== ENTITY-SPECIFIC FIELDS ===`,
          `Registered Legal Name: ${registeredLegalName}`,
          `Registration Number: ${registrationNumber}`,
          `UBO List: ${uboList}`,
          `Authorized Signatory: ${authorizedSignatoryName} (${authorizedSignatoryTitle})`,
          ...(lei ? [`LEI: ${lei}`] : [])
        ]),
        '',
        `=== UPLOADED FILES ===`,
        ...links.map((l,i)=>` ${i+1}. ${l}`),
        '',
        `This message was sent by the DFI Labs onboarding system.`
      ].join('\n')

      await ses.send(new SendEmailCommand({
        FromEmailAddress: RECIPIENT,
        Destination: { ToAddresses: [RECIPIENT] },
        Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } }
      }))
    } catch (e) {
      console.error('SES send failed (continuing):', e)
    }

    // Note: Screening is triggered separately based on textual form data only
    // Documents are not automatically scanned - they are for manual verification only

    return ok({ id, status: 'submitted', caseId: id })
  } catch (e:any) {
    console.error('submit error:', e)
    return bad(500, 'Internal error')
  }
}
