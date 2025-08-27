export const API_BASE = import.meta.env.VITE_API_BASE as string // e.g., https://...execute-api.../prod

export async function presign(file: File, category: string, inviteToken?: string){
  const body: any = { filename: file.name, contentType: file.type, category }
  if (inviteToken) body.inviteToken = inviteToken
  const res = await fetch(`${API_BASE}/presign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if(!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ url: string; key: string }>
}

export async function submit(payload: any){
  const res = await fetch(`${API_BASE}/submit`,{
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if(!res.ok) throw new Error(await res.text())
  return res.json()
}
