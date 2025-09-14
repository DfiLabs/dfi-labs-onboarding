import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const s3 = new S3Client({ region: 'eu-west-3' })
const ses = new SESClient({ region: 'eu-west-3' })

const BUCKET = process.env.BUCKET_NAME || 'dfi-onboarding-dossiers-4d48c1e4662b'
const RECIPIENT = process.env.RECIPIENT_EMAIL || 'hello@dfi-labs.com'

interface DecisionData {
  caseId: string
  action: 'approve' | 'request' | 'reject'
  token: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

export const handler = async (event: any) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2))
    
    const { case: caseId, action, token } = event.queryStringParameters || {}
    
    console.log('Parsed parameters:', { caseId, action, token })
    
    if (!caseId || !action || !token) {
      console.log('Missing parameters:', { caseId, action, token })
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required parameters: caseId, action, token' })
      }
    }

    console.log(`Processing decision: ${action} for case ${caseId}`)

    // Get the screening results to find client email
    let clientEmail = ''
    let clientName = ''
    let clientType = ''
    
    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: `screening/${caseId}/results.json`
      }))
      
      const resultsData = await response.Body?.transformToString()
      if (resultsData) {
        const results = JSON.parse(resultsData)
        clientName = results.clientName
        clientType = results.clientType
      }
    } catch (error) {
      console.error('Failed to get screening results:', error)
    }

    // Get the original submission to find client email
    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: `submissions/${caseId}/submission.json`
      }))
      
      const submissionData = await response.Body?.transformToString()
      if (submissionData) {
        const submission = JSON.parse(submissionData)
        clientEmail = submission.email
        clientName = submission.fullLegalName || clientName
        clientType = submission.clientType || clientType
      }
    } catch (error) {
      console.error('Failed to get submission data:', error)
    }

    console.log('Found client info:', { clientEmail, clientName, clientType })

    if (!clientEmail) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Client email not found' })
      }
    }

    // Record the decision
    const decisionData: DecisionData = {
      caseId,
      action,
      token,
      timestamp: new Date().toISOString(),
      ipAddress: event.requestContext?.identity?.sourceIp,
      userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent']
    }

    // Store decision in S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `decisions/${caseId}/${action}-${Date.now()}.json`,
      ContentType: 'application/json',
      Body: JSON.stringify(decisionData, null, 2)
    }))

    // Send appropriate email based on action using DFI Labs theme
    let emailSubject = ''
    let emailContent = ''

    switch (action) {
      case 'approve':
        emailSubject = `✅ Account Validated - ${clientName}`
        emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); }
    .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); backdrop-filter: blur(10px); }
    .header { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 300; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .content { padding: 30px; }
    .success-icon { text-align: center; font-size: 48px; margin: 20px 0; }
    .message { background: rgba(39, 174, 96, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60; }
    .message p { color: #e0e0e0; margin: 10px 0; }
    .message strong { color: #ffffff; }
    .footer { background: rgba(0,0,0,0.2); padding: 20px; text-align: center; color: #b0b0b0; font-size: 12px; border-radius: 8px; }
    h2, h3 { color: #ffffff; }
    ul { color: #e0e0e0; }
    p { color: #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DFI LABS</div>
      <h1>🎉 Account Validated</h1>
    </div>
    
    <div class="content">
      <div class="success-icon">✅</div>
      
      <h2>Congratulations, ${clientName}!</h2>
      
      <div class="message">
        <p><strong>Your account has been successfully validated.</strong></p>
        <p>We have completed our KYC/AML screening process and are pleased to inform you that your account is now active and ready for use.</p>
      </div>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Your account is fully operational</li>
        <li>You can now access all services</li>
        <li>If you have any questions, please contact our support team</li>
      </ul>
      
      <p><strong>Case ID:</strong> ${caseId}</p>
      <p><strong>Validated:</strong> ${new Date().toISOString()}</p>
    </div>
    
    <div class="footer">
      <p><strong>DFI Labs</strong></p>
      <p>For support, contact: hello@dfi-labs.com</p>
    </div>
  </div>
</body>
</html>
        `
        break

      case 'request':
        emailSubject = `📋 Additional Information Required - ${clientName}`
        emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); }
    .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); backdrop-filter: blur(10px); }
    .header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 300; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .content { padding: 30px; }
    .info-icon { text-align: center; font-size: 48px; margin: 20px 0; }
    .message { background: rgba(243, 156, 18, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12; }
    .message p { color: #e0e0e0; margin: 10px 0; }
    .message strong { color: #ffffff; }
    .footer { background: rgba(0,0,0,0.2); padding: 20px; text-align: center; color: #b0b0b0; font-size: 12px; border-radius: 8px; }
    h2, h3 { color: #ffffff; }
    ul { color: #e0e0e0; }
    p { color: #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DFI LABS</div>
      <h1>📋 Additional Information Required</h1>
    </div>
    
    <div class="content">
      <div class="info-icon">ℹ️</div>
      
      <h2>Hello ${clientName},</h2>
      
      <div class="message">
        <p><strong>We need some additional information to complete your account validation.</strong></p>
        <p>Our KYC/AML screening process has identified some areas where we need clarification or additional documentation.</p>
      </div>
      
      <h3>Next Steps:</h3>
      <ul>
        <li>Please review your client portal for specific requirements</li>
        <li>Upload any requested documents</li>
        <li>Our team will review the additional information promptly</li>
      </ul>
      
      <p><strong>Case ID:</strong> ${caseId}</p>
      <p><strong>Requested:</strong> ${new Date().toISOString()}</p>
    </div>
    
    <div class="footer">
      <p><strong>DFI Labs</strong></p>
      <p>For support, contact: hello@dfi-labs.com</p>
    </div>
  </div>
</body>
</html>
        `
        break

      case 'reject':
        emailSubject = `❌ Account Application Update - ${clientName}`
        emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); }
    .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); backdrop-filter: blur(10px); }
    .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 300; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .content { padding: 30px; }
    .reject-icon { text-align: center; font-size: 48px; margin: 20px 0; }
    .message { background: rgba(231, 76, 60, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }
    .message p { color: #e0e0e0; margin: 10px 0; }
    .message strong { color: #ffffff; }
    .footer { background: rgba(0,0,0,0.2); padding: 20px; text-align: center; color: #b0b0b0; font-size: 12px; border-radius: 8px; }
    h2, h3 { color: #ffffff; }
    ul { color: #e0e0e0; }
    p { color: #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DFI LABS</div>
      <h1>Account Application Update</h1>
    </div>
    
    <div class="content">
      <div class="reject-icon">❌</div>
      
      <h2>Hello ${clientName},</h2>
      
      <div class="message">
        <p><strong>We regret to inform you that we are unable to approve your account application at this time.</strong></p>
        <p>After careful review of your application and our KYC/AML screening process, we have determined that we cannot proceed with account activation.</p>
      </div>
      
      <p>This decision is final and we are unable to provide further details about the specific reasons.</p>
      
      <p><strong>Case ID:</strong> ${caseId}</p>
      <p><strong>Decision Date:</strong> ${new Date().toISOString()}</p>
    </div>
    
    <div class="footer">
      <p><strong>DFI Labs</strong></p>
      <p>For support, contact: hello@dfi-labs.com</p>
    </div>
  </div>
</body>
</html>
        `
        break

      default:
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Invalid action. Must be approve, request, or reject' })
        }
    }

    // Send email to client
    try {
      await ses.send(new SendEmailCommand({
        Source: RECIPIENT,
        Destination: { ToAddresses: [clientEmail] },
        Message: { 
          Subject: { Data: emailSubject }, 
          Body: { 
            Html: { Data: emailContent },
            Text: { Data: `DFI Labs Account Update\n\nCase ID: ${caseId}\nClient: ${clientName}\nAction: ${action}\n\nPlease check the full email for details.` }
          }
        }
      }))
      console.log(`Email sent successfully to ${clientEmail}`)
    } catch (emailError) {
      console.error('Failed to send email to client:', emailError)
    }

    // Send notification to admin
    try {
      await ses.send(new SendEmailCommand({
        Source: RECIPIENT,
        Destination: { ToAddresses: [RECIPIENT] },
        Message: { 
          Subject: { Data: `Decision Made: ${action.toUpperCase()} - ${clientName} (${caseId})` }, 
          Body: { 
            Text: { Data: `Decision: ${action}\nCase ID: ${caseId}\nClient: ${clientName} (${clientEmail})\nTimestamp: ${new Date().toISOString()}\nIP: ${decisionData.ipAddress}\nUser Agent: ${decisionData.userAgent}` }
          }
        }
      }))
      console.log(`Notification sent to admin`)
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError)
    }

    console.log(`Decision processed: ${action} for case ${caseId}, email sent to ${clientEmail}`)

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true, 
        caseId, 
        action,
        clientEmail,
        message: `Decision ${action} processed and email sent to client`
      })
    }

  } catch (error: any) {
    console.error('Decision processing error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Decision processing failed', details: error.message })
    }
  }
}