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

  // OPEN MODE: token is optional
  const token = getInviteToken() || ''
  const cats = useMemo(()=> type==='individual'? CATEGORIES_INDIV : CATEGORIES_ENTITY, [type])

  function onPick(category: string, picked: FileList | null){
    if(!picked || picked.length===0) return
    setFiles(prev=> ({...prev, [category]: Array.from(picked)}))
  }

  async function onSubmit(){
    try{
      if(!email) { setStatus('error'); setMsg('Please enter your email.'); return }
      setStatus('uploading'); setMsg('Uploading files…')

      const uploaded: any[] = []
      for(const [category, list] of Object.entries(files)){
        for(const f of list){
          const { url, key } = await presign(f, category, token || undefined)
          const put = await fetch(url, { method:'PUT', headers:{'Content-Type': f.type}, body:f })
          if(!put.ok) throw new Error(`Upload failed for ${f.name}`)
          uploaded.push({ key, filename: f.name, category, sizeBytes: f.size, contentType: f.type })
        }
      }

      setMsg('Finalizing submission…')
      const payload: any = {
        email,
        clientType: type,
        country,
        files: uploaded,
        userAgent: navigator.userAgent
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
          <input type="text" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div className="step">
          <label>Client type</label>
          <div className="radio-row">
            <label><input type="radio" name="type" checked={type==='individual'} onChange={()=>setType('individual')} /> Individual</label>
            <label><input type="radio" name="type" checked={type==='entity'} onChange={()=>setType('entity')} /> Entity</label>
          </div>
        </div>

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
