import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './d1-fixture.mjs';
import { lifecycleEndpoint, runMemberCycle } from '../worker/member-lifecycle.mjs';

const migrations=['0000_clubhouse.sql','0001_access_and_meetings.sql','0007_members_and_conversation.sql','0008_member_lifecycle.sql','0046_notice_email_choices.sql','0053_pause_member_sms.sql'];
const admin={id:'admin',role:'committee',administrator:true,canManageStock:true};
const committee={id:'committee',role:'committee'};
const member=id=>({id,role:'member'});
const day=new Date(Date.now()+10*3600000).toISOString().slice(0,10);
const nextYear=String(+day.slice(0,4)+1)+'-12-31';
const prefs={action:'preferences',revision:0,birthdayEnabled:false,newsletters:true,meetings:true,competitions:true,workingBees:true,emailEnabled:false,email:'',mobile:''};
function fixture(t){
  const DB=database(t,migrations),env={DB};
  async function add(id,paid=nextYear){
    return DB.prepare("INSERT INTO club_accounts(id,login,role,salt,verifier,created_at,paid_through) VALUES(?,?,'member','s','v',?,?)").bind(id,id,Math.floor(Date.now()/1000),paid).run();
  }
  async function api(who,body,staff=false){
    const path=staff?'/api/committee/lifecycle':'/api/member/lifecycle';
    const request=new Request('https://club.example'+path,body?{method:'POST',body:JSON.stringify(body)}:{});
    class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
    return lifecycleEndpoint(path,request,env,who,{json:x=>x,requireDb:()=>DB,HttpError,bodyJson:r=>r.json()});
  }
  return {DB,env,add,api};
}
const status=code=>err=>err.status===code;

test('older clients cannot restart text alerts and a phone number stays a contact detail',async t=>{
  const {DB,add,api}=fixture(t);
  await add('pat');
  await api(member('pat'),{...prefs,emailEnabled:true,email:'pat@example.test',smsEnabled:true});
  await api(member('pat'),{...prefs,revision:1,emailEnabled:true,email:'pat@example.test',mobile:'0400 000 000'});
  await DB.prepare("UPDATE member_profiles SET pref_sms=1 WHERE account_id='pat'").run();
  await api(committee,{action:'pack',accountId:'pat',stage:'ready'},true);
  assert.ok((await api(member('pat'))).notices.some(n=>n.kind==='pack'));
  assert.equal((await api(member('pat'))).profile.mobile,'0400 000 000');
  assert.deepEqual((await api(admin,{action:'queue'},true)).rows.map(r=>[r.channel,r.destination]),[['email','pat@example.test']]);
  assert.equal((await DB.prepare("SELECT count(*) AS total FROM member_delivery_queue WHERE channel='sms'").first()).total,0);
});
test('activation, optional birthday, approved benefit, scoped contact queue and one-time redemption',async t=>{
  const {DB,add,api}=fixture(t);
  await add('kelly');await add('rae');
  await assert.rejects(api(null),status(401));
  await assert.rejects(api(member('kelly'),undefined,true),status(403));
  let data=await api(member('kelly'));
  assert.equal(data.profile.packStage,'prepare');assert.equal(data.notices[0].kind,'welcome');assert.equal(data.profile.number,null);
  data=await api(member('kelly'),{...prefs,birthdayEnabled:true,birthday:day.slice(5),emailEnabled:true,email:'kelly@example.test'});
  assert.equal(data.notices.filter(n=>n.kind==='birthday').length,1);assert.equal(data.gifts.length,0);
  await assert.rejects(api(member('kelly'),prefs),status(409));
  await assert.rejects(api(committee,{action:'offer',approved:true},true),status(403));
  await api(admin,{action:'offer',approved:true,kind:'percent',value:15,days:7,terms:'One club shirt.',reference:'Test minute'},true);
  data=await api(member('kelly'));const gift=data.gifts[0];
  assert.match(gift.code,/^[0-9A-F]{16}$/);assert.equal(gift.value,15);assert.equal((await api(member('rae'))).gifts.length,0);
  const queued=(await api(admin,{action:'queue'},true)).rows;
  assert.equal(queued.length,1);assert.equal(queued[0].destination,'kelly@example.test');assert.match(queued[0].body,new RegExp(gift.code));
  const quote={action:'lookup-gift',code:gift.code,cents:1999};
  await assert.rejects(api(committee,quote,true),status(403));assert.equal((await api(admin,quote,true)).gift.discountCents,300);
  assert.equal((await api(admin,{...quote,action:'redeem',checked:true},true)).gift.discountCents,300);
  await assert.rejects(api(admin,{...quote,action:'redeem',checked:true},true),status(409));
  await api(member('kelly'),{...prefs,revision:1});
  assert.equal((await api(admin,{action:'queue'},true)).rows.length,0);
  assert.equal((await DB.prepare('SELECT count(*) n FROM member_birthday_gifts WHERE redeemed_at IS NOT NULL').first()).n,1);
});
test('number register, cancellation, three calendar months, Brisbane dates and scheduled retries',async t=>{
  const {DB,env,add,api}=fixture(t);
  await add('al');await add('pat');
  await api(admin,{action:'existing-number',accountId:'pat',number:40},true);
  await api(admin,{action:'enable-numbers',checked:true,start:50,reference:'Checked original register'},true);
  assert.equal((await api(member('al'))).profile.number,50);
  await add('jo');assert.equal((await api(member('jo'))).profile.number,51);
  await DB.prepare("UPDATE club_accounts SET disabled=1 WHERE id='pat'").run();
  await add('rue');assert.equal((await api(member('rue'))).profile.number,40);
  await DB.prepare("UPDATE club_accounts SET paid_through='2031-01-31' WHERE id='al'").run();
  for(const [date,stage] of [['2031-01-01','thirty'],['2031-01-24','seven'],['2031-01-31','expiry'],['2031-02-01','lapsed'],['2031-02-28','first-month'],['2031-03-31','second-month'],['2031-04-30','window-closed']]){
    const at=new Date(date+'T00:00:00Z');await runMemberCycle(env,at);await runMemberCycle(env,at);
    assert.ok(await DB.prepare('SELECT id FROM member_notices WHERE id=?').bind('renew:al:2031-01-31:'+stage).first(),stage);
    assert.equal((await DB.prepare('SELECT account_id FROM member_numbers WHERE number=50').first()).account_id,stage==='window-closed'?null:'al');
  }
  await runMemberCycle(env,new Date('2031-04-30T14:01:00Z'));
  assert.equal((await DB.prepare('SELECT completed_day FROM member_cycle_clock').first()).completed_day,'2031-05-01');
  await DB.prepare("UPDATE club_accounts SET paid_through='2032-04-30' WHERE id='al'").run();
  assert.equal((await DB.prepare("SELECT count(*) n FROM member_notices WHERE account_id='al' AND kind='renewal'").first()).n,0);
  await runMemberCycle(env,new Date('2031-05-02T00:00:00Z'));
  assert.ok(await DB.prepare("SELECT number FROM member_numbers WHERE account_id='al'").first());
});
test('ordered pack workflow and approved monthly newsletters respect individual and group preferences',async t=>{
  const {DB,add,api}=fixture(t);
  for (const [id,type] of [['alex','adult'],['jack','cadet'],['kim','social'],['liz','social']]){
    await add(id);await api(committee,{action:'member-type',accountId:id,type},true);
  }
  await api(member('liz'),{...prefs,revision:1});
  await assert.rejects(api(committee,{action:'pack',accountId:'alex',stage:'posted'},true),status(409));
  await api(committee,{action:'pack',accountId:'alex',stage:'ready'},true);
  await api(committee,{action:'pack',accountId:'alex',stage:'posted'},true);
  assert.equal((await api(member('alex'))).notices.filter(n=>n.kind==='pack').length,2);
  await DB.prepare("UPDATE member_profiles SET pack_method='collect',contact_email='parent@example.test' WHERE account_id='jack'").run();
  await assert.rejects(api(member('jack'),{...prefs,revision:1,email:'replacement@example.test'}),status(403));
  await api(committee,{action:'pack',accountId:'jack',stage:'ready'},true);
  await assert.rejects(api(committee,{action:'pack',accountId:'jack',stage:'posted'},true),status(409));
  await api(committee,{action:'pack',accountId:'jack',stage:'collected'},true);
  assert.ok((await api(member('jack'))).notices.some(n=>n.body.includes('collected')));
  const bulletin={action:'publish',kind:'newsletter',audience:'all',id:crypto.randomUUID(),title:'Club news',message:'Monthly fishing round-up.',approved:true};
  await assert.rejects(api(committee,bulletin,true),status(409));
  // Editions issued before the newsletter desk remain in their original members' inboxes.
  await DB.prepare('INSERT INTO member_bulletins(id,kind,audience,title,body,issue_day,created_by) VALUES(?,?,?,?,?,?,?)')
    .bind(bulletin.id,bulletin.kind,bulletin.audience,bulletin.title,bulletin.message,day,committee.id).run();
  assert.deepEqual((await DB.prepare("SELECT account_id FROM member_notices WHERE kind='newsletter' ORDER BY account_id").all()).results.map(x=>x.account_id),['alex','jack','liz']);
  const myNotice=(await api(member('alex'))).notices.find(n=>n.kind==='newsletter');
  assert.ok(!(await api({id:'alex',role:'signed_in'})).notices.some(n=>n.kind==='newsletter'));
  await api(member('liz'),{action:'read',id:myNotice.id});assert.equal((await api(member('alex'))).notices.find(n=>n.id===myNotice.id).readAt,null);
  await api(member('alex'),{action:'read',id:myNotice.id});assert.ok((await api(member('alex'))).notices.find(n=>n.id===myNotice.id).readAt);
});
