export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{allow:'GET, HEAD'}});
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
