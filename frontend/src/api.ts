export const API_BASE = import.meta.env.VITE_API_BASE as string;

const SIMPLE_JSON = { 'Content-Type': 'text/plain;charset=UTF-8' }; // simple request, no preflight

export async function presign(file: File, category: string, inviteToken?: string){
  const body: any = { filename: file.name, contentType: file.type, category };
  if (inviteToken) body.inviteToken = inviteToken;
  const res = await fetch(`${API_BASE}/presign`, {
    method: 'POST',
    headers: SIMPLE_JSON,
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ url: string; key: string }>;
}

export async function submit(payload: any){
  const res = await fetch(`${API_BASE}/submit`,{
    method: 'POST',
    headers: SIMPLE_JSON,
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
