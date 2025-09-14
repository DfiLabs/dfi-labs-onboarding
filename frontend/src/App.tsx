import React, { useMemo, useState } from 'react'
import './styles.css'
import { presign, submit } from './api'
import { getInviteToken } from './invite'

const CATEGORIES_INDIV = [
  {key:'id', label:'Government photo ID'},
  {key:'proof_address', label:'Proof of address (≤3 months)'},
  {key:'tax', label:'Tax residency & TIN (CRS/FATCA)'},
  {key:'pep', label:'PEP declaration'},
  {key:'source_wealth', label:'Source of funds/wealth statement'},
  {key:'wallets', label:'Intended wallet addresses / exchange accounts (optional)'},
]

const CATEGORIES_ENTITY = [
  {key:'incorp', label:'Certificate of incorporation / K-bis'},
  {key:'articles', label:'Articles / statutes'},
  {key:'directors', label:'Register of directors & shareholders/UBOs'},
  {key:'board_resolution', label:'Board resolution / authorization'},
  {key:'ubo_ids', label:'UBOs ID + proof of address'},
  {key:'tax_class', label:'Tax classification (CRS/FATCA)'},
  {key:'aml', label:'AML policy or license (if applicable)'},
  {key:'lei', label:'LEI (optional)'},
]

export default function App(){
  const [type, setType] = useState<'individual'|'entity'>('individual')
  const [country, setCountry] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [status, setStatus] = useState<'idle'|'uploading'|'done'|'error'>('idle')
  const [msg, setMsg] = useState('')

  // Universal fields
  const [fullLegalName, setFullLegalName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [taxResidencyCountry, setTaxResidencyCountry] = useState('')
  const [tin, setTin] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [pepStatus, setPepStatus] = useState<'yes'|'no'>('no')
  const [pepDetails, setPepDetails] = useState('')
  const [subscriptionBand, setSubscriptionBand] = useState('')

  // Individual only fields
  const [nationality, setNationality] = useState('')

  // Entity only fields
  const [registeredLegalName, setRegisteredLegalName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [uboList, setUboList] = useState('')
  const [authorizedSignatoryName, setAuthorizedSignatoryName] = useState('')
  const [authorizedSignatoryTitle, setAuthorizedSignatoryTitle] = useState('')
  const [lei, setLei] = useState('')

  // OPEN MODE: token is optional
  const token = getInviteToken() || ''
  const cats = useMemo(()=> type==='individual'? CATEGORIES_INDIV : CATEGORIES_ENTITY, [type])

  function onPick(category: string, picked: FileList | null){
    if(!picked || picked.length===0) return
    setFiles(prev=> ({...prev, [category]: Array.from(picked)}))
  }

  async function onSubmit(){
    try{
      // Validation
      if(!email) { setStatus('error'); setMsg('Please enter your email.'); return }
      if(!fullLegalName) { setStatus('error'); setMsg('Please enter your full legal name.'); return }
      if(!dateOfBirth) { setStatus('error'); setMsg('Please enter your date of birth/incorporation.'); return }
      if(!fullAddress) { setStatus('error'); setMsg('Please enter your full address.'); return }
      if(!taxResidencyCountry) { setStatus('error'); setMsg('Please enter your tax residency country.'); return }
      if(!tin) { setStatus('error'); setMsg('Please enter your TIN (Tax Identification Number).'); return }
      if(!mobileNumber) { setStatus('error'); setMsg('Please enter your mobile number.'); return }
      if(!subscriptionBand) { setStatus('error'); setMsg('Please enter your expected subscription band.'); return }
      
      if(type === 'individual' && !nationality) { 
        setStatus('error'); setMsg('Please enter your nationality.'); return 
      }
      
      if(type === 'entity') {
        if(!registrationNumber) { setStatus('error'); setMsg('Please enter your registration number.'); return }
        if(!uboList) { setStatus('error'); setMsg('Please enter your UBO list.'); return }
        if(!authorizedSignatoryName) { setStatus('error'); setMsg('Please enter authorized signatory name.'); return }
        if(!authorizedSignatoryTitle) { setStatus('error'); setMsg('Please enter authorized signatory title.'); return }
      }

      setStatus('uploading'); setMsg('Processing submission…')

      // Skip file uploads for now to test the core functionality
      const uploaded: any[] = []
      // for(const [category, list] of Object.entries(files)){
      //   for(const f of list){
      //     const { url, key } = await presign(f, category, token || undefined)
      //     const put = await fetch(url, { method:'PUT', headers:{'Content-Type': f.type}, body:f })
      //     if(!put.ok) throw new Error(`Upload failed for ${f.name}`)
      //     uploaded.push({ key, filename: f.name, category, sizeBytes: f.size, contentType: f.type })
      //   }
      // }

      setMsg('Finalizing submission…')
      const payload: any = {
        email,
        clientType: type,
        country,
        files: uploaded,
        userAgent: navigator.userAgent,
        // Universal fields
        fullLegalName,
        dateOfBirth,
        fullAddress,
        taxResidencyCountry,
        tin,
        mobileNumber,
        pepStatus,
        pepDetails: pepStatus === 'yes' ? pepDetails : '',
        subscriptionBand,
        // Individual fields
        ...(type === 'individual' && { nationality }),
        // Entity fields
        ...(type === 'entity' && {
          registeredLegalName: registeredLegalName || fullLegalName,
          registrationNumber,
          uboList,
          authorizedSignatoryName,
          authorizedSignatoryTitle,
          lei
        })
      }
      if (token) payload.inviteToken = token   // optional

      await submit(payload)
      setStatus('done'); setMsg('Submitted. We’ll be in touch soon.')
    }catch(err:any){
      setStatus('error'); setMsg(err?.message || 'Submission failed')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>DFI Labs — Secure Onboarding</h1>
        <p className="muted">Please provide your details and upload the required documents.</p>

        <div className="step">
          <label>Contact email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div className="step">
          <label>Client type</label>
          <div className="radio-row">
            <label><input type="radio" name="type" checked={type==='individual'} onChange={()=>setType('individual')} /> Individual</label>
            <label><input type="radio" name="type" checked={type==='entity'} onChange={()=>setType('entity')} /> Entity</label>
          </div>
        </div>

        <h3>Universal Information</h3>
        
        <div className="step">
          <label>Full legal name (exact, as on ID/registry)</label>
          <input type="text" placeholder="Full legal name" value={fullLegalName} onChange={e=>setFullLegalName(e.target.value)} />
        </div>

        <div className="step">
          <label>Date of birth / incorporation (YYYY-MM-DD)</label>
          <input type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} />
        </div>

        <div className="step">
          <label>Full address (street, postcode, city, country)</label>
          <textarea 
            placeholder="Street address, postcode, city, country" 
            value={fullAddress} 
            onChange={e=>setFullAddress(e.target.value)}
            rows={3}
          />
        </div>

        <div className="step">
          <label>Tax residency country</label>
          <input type="text" placeholder="e.g., France" value={taxResidencyCountry} onChange={e=>setTaxResidencyCountry(e.target.value)} />
        </div>

        <div className="step">
          <label>TIN (Tax Identification Number)</label>
          <input type="text" placeholder="Tax identification number" value={tin} onChange={e=>setTin(e.target.value)} />
        </div>

        <div className="step">
          <label>Mobile number (for OTP; proves channel control)</label>
          <input type="tel" placeholder="+33 6 12 34 56 78" value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} />
        </div>

        <div className="step">
          <label>PEP status (Politically Exposed Person)</label>
          <div className="radio-row">
            <label><input type="radio" name="pep" checked={pepStatus==='no'} onChange={()=>setPepStatus('no')} /> No</label>
            <label><input type="radio" name="pep" checked={pepStatus==='yes'} onChange={()=>setPepStatus('yes')} /> Yes</label>
          </div>
          {pepStatus === 'yes' && (
            <div style={{marginTop: 8}}>
              <input 
                type="text" 
                placeholder="Role/country details" 
                value={pepDetails} 
                onChange={e=>setPepDetails(e.target.value)} 
              />
            </div>
          )}
        </div>

        <div className="step">
          <label>Expected subscription band & currency</label>
          <input type="text" placeholder="e.g., €250k–€500k, Oct 2025" value={subscriptionBand} onChange={e=>setSubscriptionBand(e.target.value)} />
        </div>

        {type === 'individual' && (
          <>
            <h3>Individual Information</h3>
            <div className="step">
              <label>Nationality</label>
              <input type="text" placeholder="e.g., French" value={nationality} onChange={e=>setNationality(e.target.value)} />
            </div>
          </>
        )}

        {type === 'entity' && (
          <>
            <h3>Entity Information</h3>
            <div className="step">
              <label>Registered legal name (if different from contact)</label>
              <input type="text" placeholder="Leave blank if same as full legal name" value={registeredLegalName} onChange={e=>setRegisteredLegalName(e.target.value)} />
            </div>

            <div className="step">
              <label>Registration number (e.g., SIREN/SIRET in FR)</label>
              <input type="text" placeholder="Registration number" value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value)} />
            </div>

            <div className="step">
              <label>UBO list (Ultimate Beneficial Owners)</label>
              <textarea 
                placeholder="Name | DOB | % (one line each)&#10;e.g., John Doe | 1980-01-15 | 25%&#10;Jane Smith | 1975-03-22 | 75%" 
                value={uboList} 
                onChange={e=>setUboList(e.target.value)}
                rows={4}
              />
            </div>

            <div className="step">
              <label>Authorized signatory name</label>
              <input type="text" placeholder="Signatory name" value={authorizedSignatoryName} onChange={e=>setAuthorizedSignatoryName(e.target.value)} />
            </div>

            <div className="step">
              <label>Authorized signatory title</label>
              <input type="text" placeholder="e.g., CEO, Managing Director" value={authorizedSignatoryTitle} onChange={e=>setAuthorizedSignatoryTitle(e.target.value)} />
            </div>

            <div className="step">
              <label>LEI (Legal Entity Identifier) - Optional</label>
              <input type="text" placeholder="20-character LEI code" value={lei} onChange={e=>setLei(e.target.value)} />
            </div>
          </>
        )}

        <div className="step">
          <label>Country of residence / incorporation</label>
          <input type="text" placeholder="France" value={country} onChange={e=>setCountry(e.target.value)} />
        </div>

        <div className="step">
          <label>Uploads</label>
          {cats.map(c=> (
            <div key={c.key} style={{marginBottom:12}}>
              <div className="uploader">
                <div><strong>{c.label}</strong></div>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e=>onPick(c.key, e.target.files)} />
              </div>
              <div className="filelist">{(files[c.key]||[]).map(f=> <div key={f.name}>• {f.name} ({Math.ceil(f.size/1024)} KB)</div>)}</div>
            </div>
          ))}
        </div>

        <hr />
        <div className="step">
          <button className="btn" onClick={onSubmit} disabled={status==='uploading'}>Submit dossier</button>
          {status==='uploading' && <p className="muted">{msg}</p>}
          {status==='done' && <p className="success">{msg}</p>}
          {status==='error' && <p className="error">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
