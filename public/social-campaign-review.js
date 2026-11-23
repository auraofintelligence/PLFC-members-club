// Entry point is intentionally external: PLFC's CSP blocks inline scripts.
const mount=document.querySelector('#social-planner-desk');
async function startReview(){
  try{
    const {setupAnnualCampaigns}=await import('./social-campaigns.js?v=20261124-office-signatures');
    if(!mount)throw new Error('The workbench container is missing.');
    const dialog=document.querySelector('#trial-draft');
    const draftBody=document.querySelector('#trial-draft-body');
    const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    let draftText='';
    const key='plfc-social-review-local-settings-v2';
    let stored=null;
    try{
      const data=JSON.parse(localStorage.getItem(key)||'null');
      if(data&&data.version>0&&data.settings&&Array.isArray(data.history))stored=data;
    }catch{}
    let version=stored?.version||0,settings=stored?.settings||null,history=stored?.history||[];
    const reviewStamp=()=>history[0]?.savedAt||null;
    const diffPreview=(before,after)=>{
      const changes=[];
      for(const field of new Set([...Object.keys(before||{}),...Object.keys(after||{})])){
        if(JSON.stringify(before?.[field])!==JSON.stringify(after?.[field]))
          changes.push({field,before:'Earlier browser version',after:'Updated browser version'});
      }
      return {count:changes.length,changes,note:'Browser-only trial settings update'};
    };
    const api=async(path,options={})=>{
      const parsed=new URL(path,location.origin);
      if(parsed.pathname!=='/api/committee/social-campaign-settings')
        throw new Error('This review does not contact club APIs.');
      if(options.method==='POST'){
        const value=JSON.parse(options.body);
        if(value.version!==version)throw Object.assign(new Error('Reload the saved browser version before trying again.'),{status:409});
        const updated=structuredClone(value.settings),time=new Date().toISOString(),next=version+1;
        const entry={version:next,actorId:'preview-browser',actorName:'This browser',
          actorOffice:'Browser preview',actorRole:'local preview',savedAt:time,
          changes:diffPreview(settings,updated),settings:updated};
        const newHistory=[entry,...history].slice(0,80);
        try{localStorage.setItem(key,JSON.stringify({version:next,settings:updated,history:newHistory}));}
        catch{throw Object.assign(new Error('Your browser blocked local storage. The trial settings could not be saved.'),{status:507});}
        settings=updated;version=next;history=newHistory;
        return {version,settings:structuredClone(settings),updatedAt:time,updatedByName:'This browser',updatedOffice:'Browser preview'};
      }
      if(parsed.searchParams.has('history'))
        return {version,history:history.map(({settings,...entry})=>entry)};
      if(parsed.searchParams.has('version')){
        const item=history.find(record=>record.version===Number(parsed.searchParams.get('version')));
        if(!item)throw Object.assign(new Error('That browser version is unavailable.'),{status:404});
        return {revision:structuredClone(item)};
      }
      return {version,settings:settings?structuredClone(settings):null,updatedAt:reviewStamp(),
        updatedByName:version?'This browser':null,updatedOffice:'Browser preview'};
    };
    const planner=setupAnnualCampaigns({
      mount,api,esc,isActive:()=>true,reviewOnly:true,
      onUse(draft){
        draftText=JSON.stringify(draft,null,2);
        draftBody.textContent=draftText;
        dialog.showModal();
      }
    });
    mount.innerHTML=planner.markup();
    await planner.open();
    if(mount.textContent.includes('Preparing the annual planner'))throw new Error('The planner did not replace its initial loading message.');
    document.querySelector('#trial-draft-close').addEventListener('click',()=>dialog.close());
    document.querySelector('#trial-draft-copy').addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(draftText);
        document.querySelector('#trial-draft-copy').textContent='Copied';
      }catch{
        document.querySelector('#trial-draft-copy').textContent='Select the text to copy';
      }
    });
  }catch(error){
    console.error('PLFC social workbench start failed',error);
    if(mount){
      mount.replaceChildren();
      const message=document.createElement('p');
      message.setAttribute('role','alert');
      message.textContent='The calendar could not start: '+String(error?.message||error)+'. Please reload the page.';
      mount.appendChild(message);
    }
  }
}
void startReview();
