const API="https://api.rasp.yandex-net.ru/v3.0";
let stationIndex=null,stationIndexAt=0;
const cors=origin=>({
 "Access-Control-Allow-Origin":origin||"*",
 "Access-Control-Allow-Methods":"GET, OPTIONS",
 "Access-Control-Allow-Headers":"Content-Type",
 "Access-Control-Max-Age":"86400",
 "Vary":"Origin"
});
const json=(data,status=200,origin="*")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}});
const norm=s=>String(s||"").toLocaleLowerCase("ru").replace(/ё/g,"е").trim();
function collectStations(node,path=[],out=[]){
 if(Array.isArray(node)){for(const item of node)collectStations(item,path,out);return out}
 if(!node||typeof node!=="object")return out;
 const own=node.title&&!node.codes?[String(node.title)]:[];
 const next=own.length?[...path,...own]:path;
 if(Array.isArray(node.stations)){
  for(const st of node.stations){
   const id=String(st.codes?.yandex_code||st.code||"").trim();
   const title=String(st.title||st.popular_title||st.short_title||"").trim();
   const transport=String(st.transport_type||"");
   if(id&&title&&(transport==="suburban"||transport.includes("suburban"))){
    out.push({id,title,subtitle:[...next,st.direction].filter(Boolean).join(" · "),transportType:transport,codeSystem:"yandex"});
   }
  }
 }
 for(const [key,value] of Object.entries(node)){
  if(key==="stations")continue;
  if(Array.isArray(value)||value&&typeof value==="object")collectStations(value,next,out);
 }
 return out;
}
async function getStationIndex(env){
 if(stationIndex&&Date.now()-stationIndexAt<6*60*60*1000)return stationIndex;
 if(!env.YANDEX_RASP_API_KEY)throw new Error("На сервере не настроен YANDEX_RASP_API_KEY");
 const req=new Request("https://my-rhythm-internal/stations-list-v3");
 const cache=caches.default;
 let response=await cache.match(req);
 if(!response){
  response=await fetch(API+"/stations_list/?lang=ru_RU&format=json",{headers:{Authorization:env.YANDEX_RASP_API_KEY}});
  if(!response.ok)throw new Error("Яндекс Расписания: не удалось загрузить список станций ("+response.status+")");
  const copy=response.clone();
  await cache.put(req,new Response(copy.body,{headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=21600"}}));
 }
 const raw=await response.json();
 stationIndex=collectStations(raw);
 stationIndexAt=Date.now();
 return stationIndex;
}
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin")||"*";
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(env.APP_ORIGIN||origin)});
  if(request.method!=="GET")return json({error:"Method not allowed"},405,env.APP_ORIGIN||origin);
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,"");
  try{
   if(path==="/api/health")return json({ok:true,provider:"Yandex Schedule",keyConfigured:!!env.YANDEX_RASP_API_KEY},200,env.APP_ORIGIN||origin);
   if(path==="/api/stations"){
    const q=norm(url.searchParams.get("q"));
    if(q.length<2)return json({stations:[]},200,env.APP_ORIGIN||origin);
    const all=await getStationIndex(env);
    const found=all.filter(s=>norm(s.title).includes(q)||norm(s.subtitle).includes(q)).slice(0,15);
    return json({stations:found},200,env.APP_ORIGIN||origin);
   }
   if(path==="/api/search"){
    const from=String(url.searchParams.get("from")||"").trim(),to=String(url.searchParams.get("to")||"").trim(),date=String(url.searchParams.get("date")||"").trim();
    if(!from||!to||!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:"Укажи две выбранные станции и дату в формате YYYY-MM-DD"},400,env.APP_ORIGIN||origin);
    const all=await getStationIndex(env),byId=new Map(all.map(s=>[s.id,s]));
    if(!byId.has(from)||!byId.has(to))return json({error:"Станция не найдена в актуальном справочнике. Выбери её из подсказок ещё раз."},400,env.APP_ORIGIN||origin);
    if(from===to)return json({error:"Станции отправления и прибытия должны отличаться"},400,env.APP_ORIGIN||origin);
    if(!env.YANDEX_RASP_API_KEY)throw new Error("На сервере не настроен YANDEX_RASP_API_KEY");
    const params=new URLSearchParams({from,to,date,transport_types:"suburban",format:"json",lang:"ru_RU",limit:"100"});
    const response=await fetch(API+"/search/?"+params.toString(),{headers:{Authorization:env.YANDEX_RASP_API_KEY}});
    const payload=await response.json();
    if(!response.ok)return json({error:payload.message||"Поставщик расписания вернул ошибку "+response.status},response.status,env.APP_ORIGIN||origin);
    const segments=Array.isArray(payload.segments)?payload.segments:[];
    return json({date,from:byId.get(from),to:byId.get(to),segments},200,env.APP_ORIGIN||origin);
   }
   return json({error:"Not found"},404,env.APP_ORIGIN||origin);
  }catch(error){return json({error:error?.message||"Внутренняя ошибка сервера"},500,env.APP_ORIGIN||origin)}
 }
};
