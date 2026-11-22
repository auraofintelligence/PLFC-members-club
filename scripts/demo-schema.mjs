import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// List the reviewed schema migrations explicitly. Historical stock and private
// archive imports are intentionally outside the public officer rehearsal.
const schemaFiles=['0000_clubhouse','0001_access_and_meetings','0002_stock','0004_archive',
  '0005_meeting_register','0006_minute_usage','0007_members_and_conversation','0008_member_lifecycle',
  '0009_handoffs','0010_applications','0011_meeting_reminders','0012_operating_authority','0013_reminder_snapshots'];

function practiceDocument(id,title,level,lines) {
  const quote=text=>text.replace(/[()\\]/g,ch=>'\\'+ch);
  const content='BT /F1 18 Tf 54 744 Td ('+quote(title)+') Tj /F1 11 Tf 0 -35 Td '+
    lines.map(line=>'('+quote(line)+') Tj 0 -18 Td').join(' ')+' ET\n';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+content.length+' >>\nstream\n'+content+'endstream',
  ];
  let pdf='%PDF-1.4\n';
  const starts=[0];
  for(let i=0;i<objects.length;i++){starts.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
  const xref=pdf.length;
  pdf+='xref\n0 6\n0000000000 65535 f \n'+starts.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  const bytes=Buffer.from(pdf,'ascii'),digest=createHash('sha256').update(bytes).digest('hex');
  return "INSERT INTO library_parts VALUES('"+digest+"',0,'"+bytes.toString('base64')+"');\n"+
    "INSERT INTO library_documents(id,title,source_date,document_type,status,access_level,digest,byte_length,part_count) "+
    "VALUES('"+id+"','"+title+"',date('now','+10 hours'),'Practice guide','Demo copy','"+level+"','"+digest+"',"+bytes.length+",1);";
}

export async function loadDemoSchema() {
  const parts=await Promise.all(schemaFiles.map(async file=>{
    let sql=await readFile(new URL('../drizzle/'+file+'.sql',import.meta.url),'utf8');
    if(file==='0005_meeting_register') {
      const seed=/^INSERT INTO meeting_register VALUES \([^\n]+;\r?$/gm;
      if(sql.match(seed)?.length!==1)throw Error('Review the meeting schema before rebuilding the officer demo.');
      sql=sql.replace(seed,'');
    }
    return sql;
  }));
  parts.push(await readFile(new URL('./officer-demo-seed.sql',import.meta.url),'utf8'),
    practiceDocument('demo-member-guide','Practice member welcome','member',['Fictional officer demonstration.','Add a practice catch to your journal.','Open the club calendar and read the example member minutes.']),
    practiceDocument('demo-officer-checklist','Practice officer meeting checklist','committee',['Fictional officer demonstration.','Open the agenda and check the meeting place.','Review each decision and assign a date to each job.','Approve the minutes, then prepare a separate member copy.']));
  return parts.join('\n');
}
