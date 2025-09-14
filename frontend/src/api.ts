export const API_BASE = import.meta.env.VITE_API_BASE || 'https://uy9omnj0u7.execute-api.eu-west-3.amazonaws.com/prod';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function presign(file: File, category: string, inviteToken?: string){
  const body: any = { filename: file.name, contentType: file.type, category };
  if (inviteToken) body.inviteToken = inviteToken;
  const res = await fetch(`${API_BASE}/presign`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ url: string; key: string }>;
}

export async function submit(payload: any){
  console.log('Submitting to:', `${API_BASE}/submit`);
  console.log('Payload:', payload);
  
  const res = await fetch(`${API_BASE}/submit`,{
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  });
  
  console.log('Response status:', res.status);
  console.log('Response headers:', Object.fromEntries(res.headers.entries()));
  
  if(!res.ok) {
    const errorText = await res.text();
    console.error('Error response:', errorText);
    throw new Error(errorText);
  }
  
  const result = await res.json();
  console.log('Success result:', result);
  return result;
}
