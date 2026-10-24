import {readFileSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const count=value=>{if(typeof value==='string'&&/^\d+$/.test(value))value=Number(value);if(!Number.isSafeInteger(value)||value<0)throw Error('Missing or invalid observed tokens; do not substitute zero');return value}
export function observedCost(packet,rates){
 if(packet.status!=='REQUIRES_HUMAN_ACADEMIC_REVIEW'||!/^resp_[A-Za-z0-9_-]+$/.test(packet.provider_response_id||'')||/TEST|fixture/i.test(packet.provider_response_id||''))throw Error('Use an actual saved provider review packet')
 if(![packet.configured_model,packet.reported_model].includes(rates.model))throw Error('Price model differs from observed request')
 const source=new URL(rates.source_url);if(source.protocol!=='https:'||source.username||source.password||!['openai.com','developers.openai.com','platform.openai.com'].includes(source.hostname))throw Error('Record the official provider pricing source')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(rates.checked_on)||Number.isNaN(Date.parse(rates.checked_on))||Date.parse(rates.checked_on)>Date.now())throw Error('Record a valid pricing review date')
 for(const key of ['input_usd_per_million','cached_input_usd_per_million','output_usd_per_million'])if(typeof rates[key]!=='number'||!Number.isFinite(rates[key])||rates[key]<0)throw Error('Supply actual reviewed rates')
 const input=count(packet.tokens.input_tokens),output=count(packet.tokens.output_tokens),cacheUnknown=packet.tokens.cached_tokens===null||packet.tokens.cached_tokens===undefined,cached=cacheUnknown?0:count(packet.tokens.cached_tokens)
 if(cached>input)throw Error('Cached tokens exceed total input')
 const usd=((input-cached)*rates.input_usd_per_million+cached*rates.cached_input_usd_per_million+output*rates.output_usd_per_million)/1e6
 return{operation_id:packet.operation_id,case_id:packet.case_id,usd,kind:cacheUnknown?'input-cost upper bound; cached detail missing':'reported-token estimate',pricing_checked_on:rates.checked_on,pricing_source:rates.source_url,excludes:['taxes','FX conversion','payment fees','hosting','unobserved request/feature costs']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==4)throw Error('Usage: node tests/academic/cost.mjs PRIVATE_PACKETS_DIRECTORY REVIEWED_RATES_JSON')
  const rates=JSON.parse(readFileSync(process.argv[3])),rows=readdirSync(process.argv[2]).filter(f=>f.endsWith('.json')).map(f=>observedCost(JSON.parse(readFileSync(resolve(process.argv[2],f))),rates))
  if(!rows.length)throw Error('No observed provider packets; no cost or value claim can be made')
  console.log(JSON.stringify({rates_are_operator_inputs:true,real_source_verification_by_this_tool:false,operations:rows,total_observed_usd:rows.reduce((n,r)=>n+r.usd,0),launch_margin_verified:false},null,2))
 }catch(error){console.error(error.message);process.exitCode=2}
}
