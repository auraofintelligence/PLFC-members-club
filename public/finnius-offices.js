const printOwn={label:'Open my printable to-do list',href:'#committee/todos'};
const printTeam={label:'Print an officer’s to-do list',href:'#committee/todos'};
const tours={
  secretary:{
    name:'At the Secretary’s desk',
    steps:[
      'Got a meeting coming up? Open Meetings, choose the date and check the agenda and unfinished jobs.',
      'To welcome someone back, find their old club record and send the free-year offer to the Treasurer for approval.',
      'For a paper copy of anyone’s jobs, open To-do lists, choose the officer under Whose list and select Print list.'
    ],
    links:[{label:'Prepare a club meeting',href:'#committee/meetings'},{label:'Invite a returning member',href:'#committee/returning'},printTeam]
  },
  assistantsecretary:{
    name:'At the Assistant Secretary’s desk',
    steps:[
      'Open the newsletter desk with the Secretary. Check the monthly birthdays and see which officers still owe you a story.',
      'When someone hands in their paper list, choose their name under Whose list and record the jobs they ticked.',
      'Choose Print list to give that officer an updated copy. The same menu opens your own list.'
    ],
    links:[{label:'Open the newsletter desk',href:'#committee/news'},printTeam]
  },
  president:{
    name:'At the President’s desk',
    steps:[
      'Chairing a meeting? Open the agenda with the Secretary. Check who is present and work through each item in order.',
      'For the newsletter, open the President’s message, write a few lines for the club and choose Send to newsletter.',
      'Prefer paper? Open your to-do list, choose Print list and tick off your jobs as you go.'
    ],
    links:[{label:'Open the meeting agenda',href:'#committee/meetings'},{label:'Write the President’s message',href:'#committee/news'},printOwn]
  },
  vicepresident:{
    name:'At the Vice President’s desk',
    steps:[
      'For a local meet, barbecue or invitational, open Events and fundraising and choose the event you’re helping with.',
      'Check the jobs that still need a volunteer. Agree who is taking each one so everyone knows what to bring.',
      'Open your to-do list and choose Print list to take your own jobs along on the day.'
    ],
    links:[{label:'Open events and fundraising',href:'#committee/events'},printOwn]
  },
  treasurer:{
    name:'At the Treasurer’s desk',
    steps:[
      'Choose Shop listings to add merchandise, tickets, donations or services. Open the existing Club shirt to add its colours and sizes.',
      'For the committee figures, open Stock and sales reports, choose the reporting period and download the spreadsheet.',
      'Open your to-do list and choose Print list for a paper copy of the jobs still on your desk.'
    ],
    links:[{label:'Manage shop listings',href:'@#shop-listing-office'},{label:'Review membership fee waivers',href:'#stock/returning'},{label:'Open stock and sales reports',href:'#stock/reports'},printOwn]
  },
  webmaster:{
    name:'At the Webmaster’s desk',
    steps:[
      'Open Manage club access. Under Pending invitations, find the officer and choose Copy invitation. If their office is missing, use Invite someone new.',
      'Pass the setup link directly to that officer so they can choose their own password.',
      'Open your to-do list and choose Print list for a paper copy of your follow-ups.'
    ],
    links:[{label:'Manage club access',href:'#committee/access'},printOwn]
  }
};

export function getOfficerTour(session,path){
  if(!session?.authenticated||!session.storageReady||session.role!=='committee'||!['#committee','#stock'].includes(path))return null;
  if(path==='#stock'&&!session.canManageStock)return null;
  if(session.accountRole==='administrator'&&session.administrator)return tours.webmaster;
  if(session.accountRole==='treasurer'&&session.canManageStock)return tours.treasurer;
  const seat=session.identity?.name;
  return session.accountRole==='committee'&&['secretary','assistantsecretary','president','vicepresident'].includes(seat)?tours[seat]:null;
}
