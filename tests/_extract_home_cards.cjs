const fs=require('fs');
const s=fs.readFileSync('/home/ubuntu/Apservice-/customer/customer-app.js','utf8');
for(const name of ['home']){
 const i=s.indexOf(`async function ${name}`); if(i>=0) console.log(`\n=== ${name} @ ${i} ===\n`+s.slice(i,Math.min(s.length,i+18000)));
}
for(const token of ['customerHome.services','services.map','serviceCards','service-card','customer-services']){
 let start=0; let n=0; while((start=s.indexOf(token,start))>=0&&n<10){console.log(`TOKEN ${token} @ ${start}: `+s.slice(Math.max(0,start-500),start+1200));start+=token.length;n++;}
}
