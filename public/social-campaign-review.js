// Entry point is intentionally external: PLFC's CSP blocks inline scripts.
const mount=document.querySelector('#social-planner-desk');
async function startReview(){
  try{
    const {setupAnnualCampaigns}=await import('./social-campaigns.js?v=20261123-day-limits');
    if(!mount)throw new Error('The workbench container is missing.');
    const dialog=document.querySelector('#trial-draft');
    const draftBody=document.querySelector('#trial-draft-body');
    const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    let version=0,settings=null,draftText='';
    const api=async(path,options={})=>{
      if(path!=='/api/committee/social-campaign-settings')throw new Error('This review does not contact club APIs.');
      if(options.method==='POST'){
        const value=JSON.parse(options.body);
        if(value.version!==version)throw Object.assign(new Error('Your trial settings changed; refresh the page.'),{status:409});
        settings=structuredClone(value.settings);
        version++;
        return {version,settings:structuredClone(settings),updatedAt:null,updatedBy:'trial'};
      }
      return {version,settings:settings?structuredClone(settings):null,updatedAt:null,updatedBy:null};
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
