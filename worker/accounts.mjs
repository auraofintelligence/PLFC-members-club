import {issueApplicationInvite} from './applications.mjs';
import {pendingInvitations,preserveNewInvite,preserveHandoffInvite} from './pending-invitations.mjs';

const enc = new TextEncoder();
const sessionName = '__Host-plfc_session';
const duration = 8 * 3600;
const roles = ['member', 'committee', 'treasurer'];
const now = () => Math.floor(Date.now() / 1000);
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const random = size => hex(crypto.getRandomValues(new Uint8Array(size)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
const cookie = (value, age) => sessionName + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + age;
const readCookie = req => (req.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-plfc_session=([a-f0-9]{64})(?:;|$)/)?.[1];
const loginName = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validLogin = login => /^[a-z0-9][a-z0-9._@+-]{2,79}$/.test(login);
const validSecret = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const validInvite = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const brisbaneDate=()=>new Date(Date.now()+10*3600000).toISOString().slice(0,10);
function paidDate(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<brisbaneDate() || value>'2100-12-31')return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}

async function verifier(password, salt, secret) {
  const pepper = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const input = await crypto.subtle.sign('HMAC', pepper, enc.encode(password));
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:enc.encode(salt), iterations:100000}, key, 256));
}

function equalHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordIdentity(req, env) {
  const token = readCookie(req);
  if (!token || !env.DB || !env.PRIVATE_AUTH_KEY) return null;
  const row = await env.DB.prepare('SELECT a.id,a.login,a.role,a.paid_through FROM club_sessions s JOIN club_accounts a ON a.id=s.account_id WHERE s.digest=? AND s.expires>? AND a.disabled=0').bind(await digest(token), now()).first();
  if (!row) return null;
  return {id:row.id, name:row.login, paidThrough:row.paid_through, role:row.role === 'member' ? (row.paid_through>=brisbaneDate()?'member':'signed_in') : 'committee', accountRole:row.role,
    administrator:row.role === 'administrator', canManageStock:['treasurer','administrator'].includes(row.role)};
}

async function rateCheck(req, login, env) {
  const bucket = Math.floor(now()/900);
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const keys = await Promise.all(['ip/'+ip, 'name/'+login].map(value => digest(env.PRIVATE_AUTH_KEY + '/attempt/' + bucket + '/' + value)));
  await env.DB.prepare('DELETE FROM club_auth_attempts WHERE expires<?').bind(now()).run();
  const counts = await env.DB.batch(keys.map(key => env.DB.prepare('INSERT INTO club_auth_attempts(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*900)));
  return counts[0].results[0].count <= 50 && counts[1].results[0].count <= 10;
}

export async function accountEndpoint(path, req, env, {json,bodyJson,HttpError}) {
  const fail = (status,msg,code) => { throw new HttpError(status,msg,code); };
  if (!env.DB || !env.PRIVATE_AUTH_KEY) fail(503,'Club sign-in is being set up. Please try again shortly.','setup_required');
  const db=env.DB;
  const audit=(actor,role,action,entity) => db.prepare('INSERT INTO audit_log(id,actor_id,actor_role,action,entity_id,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,role,action,entity,new Date().toISOString());
  if(path==='/api/accounts/invitations')return pendingInvitations(req,env,await passwordIdentity(req,env),{json,bodyJson,HttpError});
  if (path === '/api/accounts' && req.method === 'GET') {
    const user = await passwordIdentity(req,env);
    if (!user?.canManageStock) fail(user?403:401,'Webmaster or Treasurer access is required.','not_authorised');
    const rows = await db.prepare('SELECT id,login,role,disabled,paid_through AS paidThrough FROM club_accounts WHERE role=\'member\' OR ?=1 ORDER BY login').bind(user.administrator?1:0).all();
    return json({accounts:rows.results});
  }
  if (req.method !== 'POST') fail(405,'Use the club form to continue.','method_not_allowed');
  const data = await bodyJson(req);
  if(path==='/api/auth/invitation') {
    const key=validInvite(data.token)&&await digest(data.token);
    const invite=key && await db.prepare('SELECT login,role,reset_id IS NOT NULL AS resetting FROM club_invites WHERE digest=? AND used_by IS NULL AND expires>?')
      .bind(key,now()).first();
    if(!invite) fail(400,'This private link has expired or has already been used. If you have set your password, sign in. Otherwise ask the Webmaster for a fresh link.','invalid_invite');
    const destination=invite.role==='treasurer'?'stock':invite.role==='member'?'members':'committee';
    const saved=data.keepForWebmaster===true&&await preserveHandoffInvite(env,key,data.token);
    return json({login:invite.login,destination,resetting:Boolean(invite.resetting),...(saved?{savedForWebmaster:true}:{}),...(!invite.login&&invite.role==='administrator'?{suggestedLogin:'webmaster'}:{})});
  }
  if (path === '/api/auth/logout') {
    const token=readCookie(req);
    if (token) await db.prepare('DELETE FROM club_sessions WHERE digest=?').bind(await digest(token)).run();
    return json({ok:true},200,{'Set-Cookie':cookie('',0)});
  }
  const login=loginName(data.login);
  if (path === '/api/auth/login' || path === '/api/auth/activate') {
    if (!validLogin(login) || typeof data.password!=='string' || data.password.length>128) fail(400,'Enter your club username and password.','invalid_input');
    if (!await rateCheck(req,login,env)) fail(429,'Too many attempts. Please try again in 15 minutes.','try_later');
    const session=random(32);
    const sid=await digest(session);
    const addSession=id=>db.prepare('INSERT INTO club_sessions(digest,account_id,expires) VALUES(?,?,?)').bind(sid,id,now()+duration);
    if (path === '/api/auth/login') {
      const user=await db.prepare('SELECT id,salt,verifier,disabled FROM club_accounts WHERE login=?').bind(login).first();
      const hash=await verifier(data.password,user?.salt || 'invalid-club-account',env.PRIVATE_AUTH_KEY);
      if (!equalHash(hash,user?.verifier || '0'.repeat(64)) || !user || user.disabled) fail(401,'The username or password did not match an active club account.','invalid_credentials');
      await addSession(user.id).run();
    } else {
      if (!validSecret(data.password)) fail(400,'Enter a password to continue.','invalid_password');
      if (!validInvite(data.token)) fail(400,'Use the full invitation from your Webmaster.','invalid_invite');
      const invHash=await digest(data.token);
      const invitation=await db.prepare('SELECT login,role,reset_id,paid_through FROM club_invites WHERE digest=? AND used_by IS NULL AND expires>?').bind(invHash,now()).first();
      if (!invitation || (invitation.login && invitation.login!==login)) fail(400,'This invitation is invalid, expired or belongs to another username.','invalid_invite');
      const salt=random(16), hash=await verifier(data.password,salt,env.PRIVATE_AUTH_KEY);
      const id=invitation.reset_id || crypto.randomUUID();
      const marker=invitation.reset_id ? crypto.randomUUID() : id;
      const stamp=now();
      const reservedSql='SELECT 1 FROM club_invites reserved WHERE reserved.login=? AND reserved.used_by IS NULL AND reserved.expires>?';
      const claim=db.prepare('UPDATE club_invites SET used_by=? WHERE digest=? AND used_by IS NULL AND expires>? AND (login IS NOT NULL OR NOT EXISTS('+reservedSql+'))').bind(marker,invHash,stamp,login,stamp);
      const eligible='EXISTS (SELECT 1 FROM club_invites WHERE digest=? AND used_by=?)';
      const write=invitation.reset_id
        ? db.prepare('UPDATE club_accounts SET salt=?,verifier=? WHERE id=? AND login=? AND disabled=0 AND '+eligible).bind(salt,hash,id,login,invHash,marker)
        : db.prepare('INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) SELECT ?,?,?,?,?,?,? WHERE '+eligible).bind(id,login,invitation.role,salt,hash,now(),invitation.paid_through,invHash,marker);
      // Each side effect uses the winning claim marker. A replay cannot create a session.
      const statements=[claim,write,
        db.prepare('DELETE FROM club_sessions WHERE account_id=? AND '+eligible).bind(id,invHash,marker),
        db.prepare('INSERT INTO club_sessions(digest,account_id,expires) SELECT ?,id,? FROM club_accounts WHERE id=? AND disabled=0 AND '+eligible).bind(sid,now()+duration,id,invHash,marker),
        db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE '+eligible).bind(crypto.randomUUID(),id,invitation.role,invitation.reset_id?'password_reset':'invitation_claimed',id,new Date().toISOString(),invHash,marker)];
      try {
        if(!invitation.login)statements.push(db.prepare(reservedSql).bind(login,stamp));
        const result=await db.batch(statements);
        if(!invitation.login && !result[0].meta.changes && result.at(-1).results.length)fail(409,'That username is unavailable. Choose another username and try again.','login_taken');
        if (!result[1].meta.changes || !result[3].meta.changes) fail(409,'This invitation can no longer be used. Ask the Webmaster for a new link.','invalid_invite');
      } catch(error) {
        if (String(error.message).includes('UNIQUE')) fail(409,'That username is unavailable. Choose another username and try again.','login_taken');
        throw error;
      }
    }
    return json({ok:true},200,{'Set-Cookie':cookie(session,duration)});
  }
  const admin = await passwordIdentity(req,env);
  if(path==='/api/accounts/renew'){
    if(!admin?.canManageStock)fail(admin?403:401,'Treasurer or Webmaster access is required.','not_authorised');
    if(data.verified!==true || !paidDate(data.paidThrough))fail(400,'Check the payment and enter the paid-through date.','invalid_payment');
    const target=await db.prepare("SELECT id FROM club_accounts WHERE id=? AND role='member' AND disabled=0").bind(String(data.id||'')).first();
    if(!target)fail(404,'Member account unavailable.','invalid_account');
    const [renewed]=await db.batch([db.prepare("UPDATE club_accounts SET paid_through=? WHERE id=? AND disabled=0 AND (paid_through IS NULL OR paid_through<=?)").bind(data.paidThrough,target.id,data.paidThrough),
      db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),admin.id,admin.accountRole,'payment_verified_through_'+data.paidThrough,target.id,new Date().toISOString())]);
    if(!renewed.meta.changes)fail(409,'The member already has a later membership end date or their account changed. Refresh before recording this payment.','renewal_changed');
    return json({ok:true});
  }
  const invitingMember=path==='/api/accounts/invite' && data.role==='member' && !data.reset && admin?.canManageStock;
  if (!admin?.administrator && !invitingMember) fail(admin?403:401,'Webmaster access is required.','not_authorised');
  if (path === '/api/accounts/disable') {
    const target=await db.prepare('SELECT id,role FROM club_accounts WHERE id=?').bind(String(data.id || '')).first();
    if (!target || target.role==='administrator') fail(400,'Choose a member or committee account.','invalid_account');
    await db.batch([db.prepare('UPDATE club_accounts SET disabled=1 WHERE id=?').bind(target.id),
      db.prepare('DELETE FROM club_sessions WHERE account_id=?').bind(target.id),
      db.prepare('DELETE FROM club_invites WHERE reset_id=? AND used_by IS NULL').bind(target.id),
      audit(admin.id,'administrator','access_revoked',target.id)]);
    return json({ok:true});
  }
  if (path !== '/api/accounts/invite') fail(404,'This service was not found.','not_found');
  if (!validLogin(login)) fail(400,'Use 3 to 80 letters, numbers or email characters for the username.','invalid_login');
  const user=await db.prepare('SELECT id,role,disabled FROM club_accounts WHERE login=?').bind(login).first();
  const reset=data.reset===true;
  if (reset && (!user || user.disabled || user.role==='administrator')) fail(400,'Choose an active member or committee account to reset.','invalid_account');
  if (!reset && (user || !roles.includes(data.role))) fail(400,'Choose an unused username and a club role.','invalid_invite');
  if(!reset && data.role==='member' && (data.verified!==true || !paidDate(data.paidThrough)))fail(400,'Check the membership payment and enter its paid-through date before inviting this member.','invalid_payment');
  const role=reset?user.role:data.role, token=random(32), key=await digest(token), expires=now()+86400;
  const copy=reset?[]:await preserveNewInvite(env,key,token);
  if(data.applicationId && !reset) {
    if(role!=='member') fail(400,'Applications are for member accounts.','invalid_input');
    return await issueApplicationInvite({db,id:data.applicationId,login,admin,key,token,expires,paidThrough:data.paidThrough,json,HttpError,copy});
  }
  const issued=await db.batch([
    db.prepare('DELETE FROM club_invites WHERE login=? AND used_by IS NULL AND (expires<=? OR (? IS NOT NULL AND reset_id=?))').bind(login,now(),reset?user.id:null,reset?user.id:null),
    db.prepare(`INSERT INTO club_invites(digest,login,role,created_by,expires,reset_id,paid_through) SELECT ?,?,?,?,?,?,?
      WHERE NOT EXISTS(SELECT 1 FROM club_invites WHERE login=? AND used_by IS NULL AND expires>?)
      AND (?=1 OR NOT EXISTS(SELECT 1 FROM club_accounts WHERE login=?))`).bind(key,login,role,admin.id,expires,reset?user.id:null,!reset&&role==='member'?data.paidThrough:null,login,now(),reset?1:0,login),
    db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),admin.id,admin.accountRole,reset?'reset_issued':role==='member'?'paid_invitation_through_'+data.paidThrough:'invitation_created',login,new Date().toISOString()),...copy]);
  if(!issued[1].meta.changes)fail(409,'There is already a current private invitation for this username. Use that invitation or wait until it expires.','pending_invite');
  return json({token,login,role,expires},201);
}
