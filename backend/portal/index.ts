import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const s3 = new S3Client({})
const BUCKET = process.env.BUCKET_NAME!

interface CaseStatus {
  caseId: string
  status: 'Submitted' | 'Screening' | 'RequestInfo' | 'Approved' | 'Declined'
  submittedAt: string
  updatedAt: string
  timeline: Array<{
    status: string
    timestamp: string
    description: string
  }>
  checklist: Array<{
    item: string
    status: 'pending' | 'complete' | 'required'
    description: string
  }>
  rfis: Array<{
    id: string
    title: string
    description: string
    required: boolean
    submitted: boolean
  }>
}

export const handler = async (event: any) => {
  try {
    const { caseId } = event.pathParameters || {}
    
    if (!caseId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Case ID required' })
      }
    }

    // Get case status and information
    const caseStatus = await getCaseStatus(caseId)
    if (!caseStatus) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Case not found' })
      }
    }

    // Get client data
    const clientData = await getClientData(caseId)
    if (!clientData) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Client data not found' })
      }
    }

    // Get uploaded files
    const files = await getUploadedFiles(caseId)

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        caseId,
        client: {
          name: clientData.fullLegalName,
          email: clientData.email,
          type: clientData.clientType
        },
        status: caseStatus,
        files,
        portal: {
          canUpload: caseStatus.status === 'RequestInfo' || caseStatus.status === 'Submitted',
          canView: true,
          nextSteps: getNextSteps(caseStatus.status)
        }
      })
    }

  } catch (error: any) {
    console.error('Portal error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Portal access failed' })
    }
  }
}

async function getCaseStatus(caseId: string): Promise<CaseStatus | null> {
  try {
    // Try to get current status
    const statusResponse = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: `cases/${caseId}/status.json`
    }))
    
    const statusData = await statusResponse.Body?.transformToString()
    if (statusData) {
      const status = JSON.parse(statusData)
      return buildCaseStatus(caseId, status.status)
    }
  } catch (error) {
    // If no status file exists, assume submitted
    return buildCaseStatus(caseId, 'Submitted')
  }
}

function buildCaseStatus(caseId: string, currentStatus: string): CaseStatus {
  const baseTimeline = [
    {
      status: 'Submitted',
      timestamp: new Date().toISOString(),
      description: 'Application submitted successfully'
    }
  ]

  const baseChecklist = [
    {
      item: 'Identity Document',
      status: 'complete' as const,
      description: 'Government-issued ID uploaded'
    },
    {
      item: 'Proof of Address',
      status: 'complete' as const,
      description: 'Address verification document uploaded'
    },
    {
      item: 'Tax Documentation',
      status: 'complete' as const,
      description: 'CRS/FATCA tax form uploaded'
    },
    {
      item: 'Source of Funds',
      status: 'complete' as const,
      description: 'Source of funds documentation uploaded'
    }
  ]

  let timeline = [...baseTimeline]
  let checklist = [...baseChecklist]
  let rfis: any[] = []

  switch (currentStatus) {
    case 'Screening':
      timeline.push({
        status: 'Screening',
        timestamp: new Date().toISOString(),
        description: 'Automated screening in progress'
      })
      break

    case 'RequestInfo':
      timeline.push(
        {
          status: 'Screening',
          timestamp: new Date().toISOString(),
          description: 'Screening completed - additional information required'
        },
        {
          status: 'RequestInfo',
          timestamp: new Date().toISOString(),
          description: 'Request for information sent'
        }
      )
      rfis = [
        {
          id: 'rfi-001',
          title: 'Updated Proof of Address',
          description: 'Please provide a proof of address document dated within the last 3 months',
          required: true,
          submitted: false
        }
      ]
      break

    case 'Approved':
      timeline.push(
        {
          status: 'Screening',
          timestamp: new Date().toISOString(),
          description: 'Screening completed successfully'
        },
        {
          status: 'Approved',
          timestamp: new Date().toISOString(),
          description: 'Account approved and validated'
        }
      )
      break

    case 'Declined':
      timeline.push(
        {
          status: 'Screening',
          timestamp: new Date().toISOString(),
          description: 'Screening completed'
        },
        {
          status: 'Declined',
          timestamp: new Date().toISOString(),
          description: 'Application declined'
        }
      )
      break
  }

  return {
    caseId,
    status: currentStatus as any,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline,
    checklist,
    rfis
  }
}

async function getClientData(caseId: string): Promise<any> {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: `submissions/${caseId}/submission.json`
    }))
    
    const data = await response.Body?.transformToString()
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error getting client data:', error)
    return null
  }
}

async function getUploadedFiles(caseId: string): Promise<any[]> {
  try {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `submissions/${caseId}/files/`
    }))
    
    return response.Contents?.map(file => ({
      name: file.Key?.split('/').pop(),
      size: file.Size,
      uploadedAt: file.LastModified,
      category: getFileCategory(file.Key || '')
    })) || []
  } catch (error) {
    console.error('Error getting files:', error)
    return []
  }
}

function getFileCategory(key: string): string {
  if (key.includes('id')) return 'Identity Document'
  if (key.includes('address')) return 'Proof of Address'
  if (key.includes('tax')) return 'Tax Documentation'
  if (key.includes('source')) return 'Source of Funds'
  if (key.includes('pep')) return 'PEP Documentation'
  if (key.includes('wallet')) return 'Wallet Information'
  return 'Other'
}

function getNextSteps(status: string): string[] {
  switch (status) {
    case 'Submitted':
      return ['Your application is being reviewed', 'You will receive an email update within 24 hours']
    case 'Screening':
      return ['Automated screening in progress', 'This typically takes 5-10 minutes']
    case 'RequestInfo':
      return ['Please provide the requested additional information', 'Upload documents through this portal']
    case 'Approved':
      return ['Your account is ready to use', 'You can now proceed with investments']
    case 'Declined':
      return ['This decision is final', 'Thank you for your interest in DFI Labs']
    default:
      return ['Please wait for further instructions']
  }
}
