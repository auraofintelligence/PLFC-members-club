const form=document.querySelector('#form'),status=document.querySelector('#status');
const token=new URLSearchParams(location.hash.slice(1)).get('invite');
if(token)history.replaceState(null,'',location.pathname);
let invitation=null;
async function post(action,data) {
  const response=await fetch('/api/showcase/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await response.json();if(!response.ok)throw new Error(body.error||'Please try again.');return body;
}
document.querySelector('#show-password').onchange=event=>{for(const field of [form.elements.password,form.elements.repeat])field.type=event.target.checked?'text':'password';};
if(token){
  document.querySelector('#title').textContent='Set up your demonstration login';
  document.querySelector('#intro').textContent='Choose a password to use when you return.';
  document.querySelector('#repeat-label').hidden=false;form.elements.repeat.required=true;form.elements.password.autocomplete='new-password';
  form.querySelector('button').textContent='Set up and explore';form.querySelector('button').disabled=true;
  try{invitation=await post('invitation',{token});form.elements.login.value=invitation.login;form.elements.login.readOnly=true;form.querySelector('button').disabled=false;}
  catch(error){status.textContent=error.message;}
}
form.onsubmit=async event=>{
  event.preventDefault();const button=form.querySelector('button');
  if(token&&form.elements.password.value!==form.elements.repeat.value){status.textContent='The passwords need to match.';return;}
  button.disabled=true;status.textContent='Signing in…';
  try{await post(token?'activate':'login',{login:form.elements.login.value,password:form.elements.password.value,...(token?{token}:{})});location.assign('/#committee');}
  catch(error){status.textContent=error.message;button.disabled=false;}
};
