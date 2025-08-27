export const API_BASE = import.meta.env.VITE_API_BASE as string // e.g., https://abc123.execute-api.eu-west-3.amazonaws.com/prod

export async function presign(file: File, category: string, inviteToken: string){
  const res = await fetch(`${API_BASE}/presign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, category, inviteToken })
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
