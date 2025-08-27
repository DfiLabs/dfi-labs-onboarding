import React, { useMemo, useState } from 'react'
import { presign, submit } from './api'
import { getInviteToken } from './invite'

// Define types for clarity
export default function App() {
  const [email, setEmail] = useState('')
  const [type, setType] = useState<'individual' | 'entity'>('individual')
  const [country, setCountry] = useState('')
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const inviteToken = getInviteToken()

  const cats = useMemo(() => {
    if (type === 'individual') {
      return [
        { key: 'id', label: 'Government photo ID' },
        { key: 'address', label: 'Proof of address (≤3 months)' },
        { key: 'tax', label: 'Tax residency & TIN (CRS/FATCA)' },
        { key: 'pep', label: 'PEP declaration' },
        { key: 'source', label: 'Source of funds/wealth statement' },
        { key: 'wallet', label: 'Intended wallet addresses / exchange accounts (optional)' }
      ]
    }
    return [
      { key: 'incorp', label: 'Certificate of incorporation / K-bis' },
      { key: 'articles', label: 'Articles / statutes' },
      { key: 'register', label: 'Register of directors & shareholders/UBOs' },
      { key: 'resolution', label: 'Board resolution / authorization' },
      { key: 'ubo', label: 'UBOs ID + proof of address' },
      { key: 'tax', label: 'Tax classification (CRS/FATCA)' },
      { key: 'aml', label: 'AML policy or license (if applicable)' },
      { key: 'lei', label: 'LEI (optional)' }
    ]
  }, [type])

  const onPick = (category: string, selected: FileList | null) => {
    if (!selected) return
    setFiles(prev => ({
      ...prev,
      [category]: Array.from(selected)
    }))
  }

  const onSubmit = async () => {
    if (!inviteToken) {
      setStatus('error')
      setMsg('Invalid or missing invite token.')
      return
    }
    if (!email) {
      setStatus('error')
      setMsg('Please enter your email.')
      return
    }
    setStatus('uploading')
    setMsg('Uploading files...')
    try {
      const uploaded: { filename: string; key: string; category: string }[] = []
      for (const c of cats) {
        const list = files[c.key] || []
        for (const f of list) {
          const { url, key } = await presign(f, c.key, inviteToken)
          await fetch(url, {
            method: 'PUT',
            body: f
          })
          uploaded.push({ filename: f.name, key, category: c.key })
        }
      }
      setMsg('Submitting dossier...')
      await submit({
        email,
        clientType: type,
        country,
        files: uploaded,
        inviteToken,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      })
      setStatus('done')
      setMsg('Your dossier has been submitted successfully.')
      setFiles({})
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setMsg(err?.message || 'Submission failed.')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>DFI Labs — Secure Onboarding</h1>
        <p className="muted">Please provide your details and upload the required documents.</p>

        <div className="step">
          <label>Contact email</label>
          <input
            type="text"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="step">
          <label>Client type</label>
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name="type"
                checked={type === 'individual'}
                onChange={() => setType('individual')}
              />
              {' '}Individual
            </label>
            <label>
              <input
                type="radio"
                name="type"
                checked={type === 'entity'}
                onChange={() => setType('entity')}
              />
              {' '}Entity
            </label>
          </div>
        </div>

        <div className="step">
          <label>Country of residence / incorporation</label>
          <input
            type="text"
            placeholder="France"
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
        </div>

        <div className="step">
          <label>Uploads</label>
          {cats.map(c => (
            <div key={c.key} style={{ marginBottom: 12 }}>
              <div className="uploader">
                <div><strong>{c.label}</strong></div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => onPick(c.key, e.target.files)}
                />
              </div>
              <div className="filelist">
                {(files[c.key] || []).map(f => (
                  <div key={f.name}>• {f.name} ({Math.ceil(f.size / 1024)} KB)</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr />
        <div className="step">
          <button className="btn" onClick={onSubmit} disabled={status === 'uploading'}>
            Submit dossier
          </button>
          {status === 'uploading' && <p className="muted">{msg}</p>}
          {status === 'done' && <p className="success">{msg}</p>}
          {status === 'error' && <p className="error">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
