import { TripError, safeUrl } from '../../js/trip-contract.js';
export async function researchQueries(queries, env, fetcher = fetch) {
  if (!env.BOOKTRIP_SEARCH_KEY) return [];
  const results = [];
  for (const query of queries.slice(0,2)) {
    const response = await fetcher('https://api.tavily.com/search', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
      headers:{ Authorization:`Bearer ${env.BOOKTRIP_SEARCH_KEY}`, 'Content-Type':'application/json' },
      body:JSON.stringify({ query, search_depth:'basic', max_results:3, include_answer:false, include_raw_content:false }),
    });
    if (!response.ok) throw new TripError('No pudimos investigar los lugares ahora. Tu borrador anterior sigue disponible.',502,'research_unavailable');
    const body = await response.json();
    for (const item of body.results || []) {
      if (safeUrl(item.url) && !results.some(result => result.url === item.url)) results.push({ title:String(item.title || '').slice(0,200), url:item.url.slice(0,1000), content:String(item.content || '').slice(0,2200) });
    }
  }
  return results;
}
