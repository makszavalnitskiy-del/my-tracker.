/* MY RHYTHM — theme, personal library and suburban train search */
(()=>{
 const $=id=>document.getElementById(id),THEME_KEY="myRhythmThemeV1",DB_NAME="myRhythmLibrary",STORE="files";
 const API_BASE=(window.MY_RHYTHM_RASP_API_BASE||"").replace(/\/$/,"");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const status=(message,type="")=>{const el=$("trainSearchStatus");if(el){el.textContent=message;el.className="train-status "+type}};
 const applyTheme=t=>{t=["dark","light","rhythm"].includes(t)?t:"rhythm";document.body.dataset.theme=t;try{localStorage.setItem(THEME_KEY,t)}catch(e){}document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===t))};
 let theme="rhythm";try{theme=localStorage.getItem(THEME_KEY)||"rhythm"}catch(e){}applyTheme(theme);
 document.querySelectorAll("[data-theme-choice]").forEach(b=>b.addEventListener("click",()=>applyTheme(b.dataset.themeChoice)));

 // Local-only personal file library. No account or shared server storage.
 let db,records=[];
 const openDb=()=>new Promise((res,rej)=>{if(!("indexedDB"in window)){rej(Error("IndexedDB unavailable"));return}const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:"id"})};q.onsuccess=()=>{db=q.result;res()};q.onerror=()=>rej(q.error)});
 const run=(mode,fn)=>new Promise((res,rej)=>{const t=db.transaction(STORE,mode),q=fn(t.objectStore(STORE));t.oncomplete=()=>res(q?.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)});
 const fileSize=n=>n<1048576?Math.max(1,Math.round(n/1024))+" КБ":(n/1048576).toFixed(1)+" МБ";
 const ext=n=>(n.split(".").pop()||"FILE").toUpperCase().slice(0,5);
 const renderFiles=()=>{
  const host=$("libraryList");if(!host)return;
  const query=($("librarySearch")?.value||"").toLowerCase(),filter=$("libraryFilter")?.value||"";
  const subjects=[...new Set(records.map(x=>x.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  const sel=$("libraryFilter"),old=sel.value;sel.innerHTML='<option value="">Все предметы</option>'+subjects.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");sel.value=subjects.includes(old)?old:"";
  const rows=records.filter(x=>(!filter||x.subject===filter)&&(!query||(x.name+" "+x.subject).toLowerCase().includes(query))).sort((a,b)=>b.createdAt-a.createdAt);
  if(!rows.length){host.innerHTML='<div class="empty">'+(records.length?"Ничего не найдено.":"Здесь пока пусто. Нажми «+» и добавь первый файл.")+'</div>';return}
  host.innerHTML=rows.map(x=>'<article class="library-item" data-file-id="'+esc(x.id)+'"><div class="library-file-icon">'+esc(ext(x.name))+'</div><div class="library-file-meta"><div class="library-file-name">'+esc(x.name)+'</div><div class="library-file-sub">'+esc(x.subject||"Без предмета")+' · '+fileSize(x.size)+(x.favorite?" · ★ Избранное":"")+'</div></div><div class="library-item-actions"><button data-action="open" title="Открыть">↗</button><button data-action="favorite" title="Избранное">'+(x.favorite?"★":"☆")+'</button><button data-action="download" title="Скачать">↓</button><button data-action="delete" title="Удалить">×</button></div></article>').join("");
 };
 const loadFiles=async()=>{records=(await run("readonly",s=>s.getAll()))||[];renderFiles()};
 const fileInput=$("libraryFiles");
 const addFiles=async files=>{
  for(const file of files){if(file.size>50*1024*1024){alert("Файл «"+file.name+"» больше 50 МБ и не добавлен.");continue}
   await run("readwrite",s=>s.put({id:"f_"+Date.now()+"_"+Math.random().toString(36).slice(2),name:file.name,size:file.size,type:file.type,subject:"",favorite:false,createdAt:Date.now(),blob:file}));
  }await loadFiles();
 };
 fileInput?.addEventListener("change",async e=>{try{await addFiles([...e.target.files])}catch(err){alert("Не удалось сохранить файлы. Возможно, в браузере закончилось место.")}e.target.value=""});
 $("libraryQuickAdd")?.addEventListener("click",()=>fileInput?.click());
 $("librarySearch")?.addEventListener("input",renderFiles);$("libraryFilter")?.addEventListener("change",renderFiles);
 $("libraryList")?.addEventListener("click",async e=>{
  const b=e.target.closest("button[data-action]");if(!b)return;const id=b.closest("[data-file-id]")?.dataset.fileId,x=records.find(v=>v.id===id);if(!x)return;const action=b.dataset.action;
  if(action==="delete"){if(!confirm("Удалить «"+x.name+"» из этого браузера?"))return;await run("readwrite",s=>s.delete(id));await loadFiles();return}
  if(action==="favorite"){x.favorite=!x.favorite;await run("readwrite",s=>s.put(x));await loadFiles();return}
  const url=URL.createObjectURL(x.blob);
  if(action==="open"&&(/\.pdf$/i.test(x.name)||x.type==="application/pdf")){const w=window.open(url,"_blank");if(!w)alert("Разреши открытие новой вкладки.");setTimeout(()=>URL.revokeObjectURL(url),60000)}
  else{const a=document.createElement("a");a.href=url;a.download=x.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);if(action==="open")alert("Для этого формата пока доступно скачивание.")}
 });
 openDb().then(loadFiles).catch(()=>{if($("libraryList"))$("libraryList").innerHTML='<div class="empty">Локальная библиотека недоступна в этом браузере.</div>'});

 // Train search uses station IDs returned by the server, never text-derived or hand-built IDs.
 const stationState={from:null,to:null},controllers={from:null,to:null},timers={from:null,to:null};
 const fields={from:$("trainFrom"),to:$("trainTo")};
 const normalize=s=>String(s||"").trim().toLocaleLowerCase("ru").replace(/ё/g,"е");
 const renderSelected=side=>{const el=$(side==="from"?"trainFromSelected":"trainToSelected"),st=stationState[side];if(el)el.textContent=st?"✓ Выбрана станция: "+st.title+(st.subtitle?" · "+st.subtitle:""):""};
 const hideSuggestions=side=>$(side==="from"?"trainFromSuggestions":"trainToSuggestions")?.classList.remove("open");
 const pickStation=(side,station)=>{
  stationState[side]=station;fields[side].value=station.title;renderSelected(side);hideSuggestions(side);
 };
 async function suggest(side,query){
  if(!API_BASE){status("Поиск станций подготовлен, но сервер Яндекс Расписаний ещё не подключён. Нужен защищённый API-сервис; ключ нельзя размещать в открытом коде.","error");return}
  if(controllers[side])controllers[side].abort();const controller=new AbortController();controllers[side]=controller;
  const box=$(side==="from"?"trainFromSuggestions":"trainToSuggestions");
  try{
   const url=API_BASE+"/api/stations?q="+encodeURIComponent(query);
   const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error("Сервис станций ответил "+response.status);
   const payload=await response.json(),items=Array.isArray(payload.stations)?payload.stations:[];
   box.innerHTML="";
   if(!items.length){box.innerHTML='<div class="station-suggestion"><strong>Станции не найдены</strong><small>Уточни название или попробуй ближайший крупный пункт</small></div>'}
   items.forEach(st=>{
    if(!st.id||!st.title)return;
    const b=document.createElement("button");b.type="button";b.className="station-suggestion";b.innerHTML="<strong>"+esc(st.title)+"</strong><small>"+esc(st.subtitle||"Железнодорожная станция")+"</small>";
    b.addEventListener("click",()=>pickStation(side,st));box.appendChild(b);
   });
   box.classList.add("open");
  }catch(err){if(err.name!=="AbortError")status("Не удалось найти станции. Проверь подключение сервиса и попробуй ещё раз.","error")}
 }
 ["from","to"].forEach(side=>{
  fields[side]?.addEventListener("input",()=>{
   stationState[side]=null;renderSelected(side);
   const q=fields[side].value.trim();if(timers[side])clearTimeout(timers[side]);
   if(q.length<2){hideSuggestions(side);return}
   timers[side]=setTimeout(()=>suggest(side,q),280);
  });
  fields[side]?.addEventListener("focus",()=>{if(fields[side].value.trim().length>=2&&!stationState[side])suggest(side,fields[side].value.trim())});
 });
 document.addEventListener("click",e=>{if(!e.target.closest(".station-field-wrap")){hideSuggestions("from");hideSuggestions("to")}});
 $("swapTrainStations")?.addEventListener("click",()=>{
  const a=stationState.from,b=stationState.to;stationState.from=b;stationState.to=a;
  fields.from.value=b?.title||"";fields.to.value=a?.title||"";renderSelected("from");renderSelected("to");
 });
 const localISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
 const dateInput=$("trainDate");if(dateInput&&!dateInput.value)dateInput.value=localISO();
 const clock=s=>{const m=String(s||"").match(/T(\d{2}:\d{2})/);return m?m[1]:"—"};
 const duration=s=>{const n=Math.max(0,Math.round(Number(s||0)/60)),h=Math.floor(n/60),m=n%60;return h?h+" ч "+(m?m+" мин":""):m+" мин"};
 const resultsHost=$("trainResults");
 function showResults(segments,from,to){
  if(!resultsHost)return;resultsHost.innerHTML="";
  if(!segments.length){resultsHost.innerHTML='<div class="empty">На эту дату прямые электрички не найдены. Проверь дату или станции.</div>';return}
  segments.forEach(seg=>{
   const dep=clock(seg.departure),arr=clock(seg.arrival),fromTitle=seg.from?.title||from.title,toTitle=seg.to?.title||to.title;
   const thread=seg.thread?.title||seg.thread?.short_title||"Пригородный поезд",number=seg.thread?.number||"",d=duration(seg.duration);
   const card=document.createElement("article");card.className="train-result";
   card.innerHTML='<div class="train-result-top"><div class="train-result-time">'+esc(dep)+' <span style="color:var(--muted);font-size:13px">→</span> '+esc(arr)+'</div><div class="train-result-duration">'+esc(d)+'</div></div><div class="train-result-line"><div class="train-result-rail"><i></i><i></i></div><div class="train-result-stations"><strong>'+esc(fromTitle)+'</strong><strong>'+esc(toTitle)+'</strong></div></div><div class="train-result-meta"><span>'+esc(thread)+(number?" · № "+esc(number):"")+'</span><button type="button" class="train-save">☆ Сохранить маршрут</button></div>';
   card.querySelector(".train-save").addEventListener("click",()=>{
    const route={id:"route_"+Date.now()+"_"+Math.random().toString(36).slice(2,6),from:from.title,to:to.title,fromStation:from,toStation:to,date:dateInput.value};
    const app=window.MyRhythmAppData;
    if(!app?.saveRoute){status("Не удалось сохранить маршрут. Обнови страницу и попробуй ещё раз.","error");return}
    app.saveRoute(route);card.querySelector(".train-save").textContent="✓ Сохранено";
   });
   resultsHost.appendChild(card);
  });
 }
 $("trainSearchForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const from=stationState.from,to=stationState.to,date=dateInput.value;
  if(!from||!to){status("Выбери обе станции из выпадающих подсказок. Просто введённого текста недостаточно.","error");return}
  if(from.id===to.id){status("Станции отправления и прибытия совпадают. Выбери разные станции.","error");return}
  if(!date){status("Выбери дату поездки.","error");return}
  if(!API_BASE){status("Поисковая форма готова, но для реального расписания нужно подключить защищённый API-сервис и ключ Яндекс Расписаний.","error");return}
  const button=$("trainSearchButton");button.disabled=true;button.textContent="Ищем электрички…";resultsHost.innerHTML="";
  try{
   const params=new URLSearchParams({from:from.id,to:to.id,date});
   const response=await fetch(API_BASE+"/api/search?"+params.toString());const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Ошибка поиска: "+response.status);
   const segments=Array.isArray(payload.segments)?payload.segments:[];
   showResults(segments,from,to);
   status(segments.length?"Найдено рейсов: "+segments.length+".":"Подходящих прямых рейсов не найдено.",segments.length?"success":"");
  }catch(err){status(err.message||"Не удалось получить расписание. Попробуй позже.","error")}
  finally{button.disabled=false;button.innerHTML='Найти электрички <span>→</span>'}
 });
 window.MyRhythmTrains={
  restore(route){pickStation("from",route.fromStation);pickStation("to",route.toStation);dateInput.value=route.date||localISO();},
  setApiBase(url){window.MY_RHYTHM_RASP_API_BASE=String(url||"").replace(/\/$/,"");location.reload()}
 };
 if(!API_BASE)status("Поиск станций и рейсов появится после подключения API-сервиса. Поля и выбор даты уже готовы.");
})();
