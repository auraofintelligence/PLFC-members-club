// Called only inside the private review server's local SQLite transaction.
export function seedReviewNewsletter(sql,roles) {
  const existing=sql.prepare(`SELECT EXISTS(SELECT 1 FROM newsletter_editions)
    OR EXISTS(SELECT 1 FROM member_bulletins WHERE kind='newsletter') AS found`).get();
  if(existing.found)return;
  const {month}=sql.prepare("SELECT strftime('%Y-%m','now','+10 hours','start of month','-1 month') AS month").get();
  const at=month+'-20T00:00:00.000Z';
  const title='Example edition · Around the island';
  const body='Welcome to this private example of the club newsletter. The five officers’ stories below show how a finished edition reads. All activities described here are examples.'+
    '\n\nJoke of the month\nWhy did the whiting bring a ruler? It wanted to see how it measured up.'+
    '\n\nCall for volunteers\nFancy lending a hand at our next local meet? A ten-minute welcome shift would make a new family feel right at home. Let the assistant secretary know if a cuppa and a chat sound like your sort of job.';
  sql.prepare(`INSERT INTO newsletter_editions(month,bulletin_id,title,body,updated_by,updated_at)
    VALUES(?,?,?,?,?,?)`).run(month,'local-review-example-'+month,title,body,roles.secretary.id,at);

  const articles=[
    ['president','A welcome for every angler','A member’s first morning can start with a name and a spare spot on the jetty. For our example local meet, the first job is to welcome new faces.'],
    ['vicepresident','Keeping an invitational friendly','A small catch-and-release invitational starts with agreeing how to photograph a fish on a brag mat. Both clubs can share the same example photo before the day.'],
    ['secretary','Finding the minutes','Looking for a past decision? Open Minutes & documents in the member room, choose the meeting date and read the approved copy.'],
    ['assistant','A welcome table anyone can run','A welcome table needs a pencil, a sign and somebody ready to say g’day. In this example, two volunteers share the shift so both get time for a cast.'],
    ['treasurer','Counting shirts by size','A shelf full of shirts looks reassuring until somebody asks for a particular size. At our next stocktake, we’ll count each size separately, including the sizes with an empty box.'],
  ];
  const save=sql.prepare(`INSERT INTO newsletter_contributions(month,office,title,body,status,version,updated_at,updated_by,last_key)
    VALUES(?,?,?,?,'submitted',1,?,?,?)`);
  const include=sql.prepare(`UPDATE newsletter_contributions SET status='included',version=2,updated_by=?,last_key=?
    WHERE month=? AND office=?`);
  for(const [seat,headline,article] of articles) {
    const officer=roles[seat];
    save.run(month,officer.login,'Example · '+headline,article,at,officer.id,'example-submit');
    include.run(roles.secretary.id,'example-include',month,officer.login);
  }
  const advance=sql.prepare('UPDATE newsletter_editions SET status=?,version=version+1,updated_at=?,updated_by=? WHERE month=?');
  advance.run('review',at,roles.secretary.id,month);
  sql.prepare(`UPDATE newsletter_editions SET status='approved',version=version+1,updated_at=?,updated_by=?,approved_at=?,approved_by=?
    WHERE month=?`).run(at,roles.president.id,at,roles.president.id,month);
  sql.prepare(`UPDATE newsletter_editions SET status='published',version=version+1,updated_at=?,updated_by=?,published_at=?
    WHERE month=?`).run(at,roles.secretary.id,at,month);
}
