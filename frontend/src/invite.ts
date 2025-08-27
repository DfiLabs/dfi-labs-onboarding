export function getInviteToken(){
  const url = new URL(window.location.href)
  return url.searchParams.get('t') || ''
}
