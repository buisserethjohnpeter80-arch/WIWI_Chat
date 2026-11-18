import { LanService, loadIdentity, nativeLanSupported } from './lanService.js';
import { LanChatStore } from './lanStore.js';
import { MAX_MESSAGE_LENGTH } from './lanProtocol.js';
import '@ionic/core/css/core.css';
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
import { addIcons } from 'ionicons';
import { chatbubbles,chatbubblesOutline,people,peopleOutline,settingsOutline,settings,searchOutline,ellipsisVertical,add,arrowBack,send,attachOutline,documentTextOutline,imageOutline,cameraOutline,headsetOutline,folderOutline,wifiOutline,checkmarkDone,checkmark,checkmarkCircle,chevronForward,personOutline,notificationsOutline,informationCircleOutline,createOutline,closeOutline,personAddOutline,shieldCheckmarkOutline,moonOutline,sunnyOutline,arrowForward,cloudOfflineOutline,radioOutline,checkmarkCircleOutline,trashOutline } from 'ionicons/icons';
import './style.css';
addIcons({chatbubbles,chatbubblesOutline,people,peopleOutline,settingsOutline,settings,searchOutline,ellipsisVertical,add,arrowBack,send,attachOutline,documentTextOutline,imageOutline,cameraOutline,headsetOutline,folderOutline,wifiOutline,checkmarkDone,checkmark,checkmarkCircle,chevronForward,personOutline,notificationsOutline,informationCircleOutline,createOutline,closeOutline,personAddOutline,shieldCheckmarkOutline,moonOutline,sunnyOutline,arrowForward,cloudOfflineOutline,radioOutline,checkmarkCircleOutline,trashOutline});
(async()=>{const ionicPath='/ionic.esm.js';try{await import(/* @vite-ignore */ ionicPath)}catch(e){console.warn('Ionic elements could not initialize',e)}})();
const $=s=>document.querySelector(s);const icon=(n,cl='')=>`<ion-icon class="${cl}" name="${n}" aria-hidden="true"></ion-icon>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seed=[{id:'sarah',name:'Sarah',color:'#9654ea',online:true,unread:2,messages:[{mine:false,text:'Bonjou! Ou la nan lekòl la?',time:'10:10'},{mine:true,text:'Wi, mwen la.',time:'10:12'},{mine:false,text:'N ap rankontre demen a 10è?',time:'10:13'},{mine:true,text:'Dakò, n ap la.',time:'10:14'}]},{id:'david',name:'David',color:'#2588fa',online:true,messages:[{mine:false,text:'Dokiman.pdf',time:'09:32'}]},{id:'group12',name:'Gwoup Klas 12',color:'#0cae9d',group:true,messages:[{mine:false,text:'Reyinyon a 2è PM.',time:'08:50'}]},{id:'peter',name:'Peter',color:'#f6a229',online:true,messages:[{mine:false,text:'Mèsi anpil!',time:'Yè'}]},{id:'admin',name:'Admin Lekòl',color:'#ec438a',online:true,messages:[{mine:false,text:'Anons: Egzamen vandredi.',time:'Yè'}]},{id:'math',name:'Tèm Matematik',color:'#7958e7',group:true,messages:[]}];
const storeKey='wiwichat-demo-v1';let chats;try{const saved=JSON.parse(localStorage.getItem(storeKey));chats=Array.isArray(saved)?saved:structuredClone(seed)}catch{chats=structuredClone(seed)};
const native = nativeLanSupported();
const identity = loadIdentity();
const history = new LanChatStore();
const onlinePeers = new Map();
const drafts = new Map();
let lanStatus = native ? 'Starting Wi-Fi LAN…' : 'Chrome preview · Native app required for LAN';
let lan;
const state={tab:'chats',page:'home',active:null,search:'',connection:'lan',theme:localStorage.getItem('wiwi-theme')||'dark',menu:false,attachments:false};
const activeLan = () => state.active?.startsWith('lan:');
const peerChat = c => ({...c,kind:'lan',online:onlinePeers.has(c.id)});
const allChats = () => [...history.chats.map(peerChat), ...chats];
const currentChat = () => activeLan() ? (history.get(state.active.slice(4)) ? peerChat(history.get(state.active.slice(4))) : null) : chats.find(x=>x.id===state.active);
const prettyTime = stamp => {const t=new Date(stamp);return Number.isNaN(+t)?'':t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
const received = frame => {
  const newMessage={id:frame.id,mine:false,text:frame.text,time:prettyTime(frame.sentAt),sentAt:frame.sentAt,status:'received'};
  const visible=state.page==='conversation'&&state.active===`lan:${frame.fromId}`;
  const wasAdded=history.add(frame.fromId,frame.fromName,newMessage,{unread:!visible});
  if(wasAdded){render();if(!visible)toast(`New LAN message from ${frame.fromName}`)}
};
const startLan = async () => {
  if(!native){lanStatus='Chrome preview · LAN requires the installed Android/iOS app';render();return}
  if(!lan){
    lan=new LanService(undefined,{
      onPeers:peers=>{onlinePeers.clear();for(const p of peers){onlinePeers.set(p.id,p);history.ensure(p.id,p.name)}render()},
      onMessage:received,
      onStatus:status=>{lanStatus=status.running?'Connected to LAN · Searching nearby devices':status.reason||'Wi-Fi LAN is offline';render()}
    });
  }
  lanStatus='Starting Wi-Fi LAN…';render();
  await lan.start(identity);
};

const save=()=>localStorage.setItem(storeKey,JSON.stringify(chats));
const last=c=>c.messages.at(-1)||{};const initials=n=>n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const avatar=(c,sz='')=>`<div class="avatar ${sz}" style="--avatar:${c.color}">${c.group?icon('people'):esc(initials(c.name))}${c.online?'<i class="presence"></i>':''}</div>`;
const header=(title,back=false,more=true)=>`<header class="header">${back?`<button class="icon-btn" data-action="back" aria-label="Back">${icon('arrowBack')}</button>`:''}<div class="header-title">${title}</div><div class="header-actions">${!back?`<button class="icon-btn" data-action="search" aria-label="Search">${icon('searchOutline')}</button>`:''}${more?`<button class="icon-btn" data-action="menu" aria-label="More options">${icon('ellipsisVertical')}</button>`:''}</div></header>`;
const nav=()=>`<nav class="bottom-nav" aria-label="Main navigation">${[['chats','chatbubblesOutline','Chats'],['contacts','peopleOutline','Contacts'],['settings','settingsOutline','Settings']].map(([id,ic,label])=>`<button data-tab="${id}" class="nav-item ${state.tab===id?'selected':''}" aria-label="${label}" aria-current="${state.tab===id?'page':'false'}"><span class="nav-icon">${icon(state.tab===id?ic.replace('Outline',''):ic)}</span><span>${label}</span></button>`).join('')}</nav>`;
const chatRow=c=>`<button class="chat-row" data-open="${c.kind==='lan'?`lan:${esc(c.id)}`:esc(c.id)}">${avatar({...c,online:c.kind==='lan'?c.online:false})}<span class="chat-meta"><span class="chat-top"><strong>${esc(c.name)}</strong><small>${esc(last(c).time||'')}</small></span><span class="chat-bottom"><span>${esc(last(c).text|| (c.kind==='lan'?(c.online?'Available on Wi-Fi LAN':'Offline · Messages stored locally'):'Demo conversation'))}</span>${c.unread?`<b class="unread">${c.unread}</b>`:''}</span></span>${c.kind==='lan'?'<span class="lan-pill">LAN</span>':''}</button>`;
const peerRows=()=> [...onlinePeers.values()].map(p=>`<button class="contact-row" data-open="lan:${esc(p.id)}">${avatar({name:p.name,color:'#168fff',online:true})}<span><strong>${esc(p.name)}</strong><small>Wi-Fi LAN · Device found</small></span>${icon('chevronForward')}</button>`).join('');
const chatsPage=()=>`${header('<span class="brand-mark">W<span class="brand-signal">⌁</span></span><span class="brand-name">WIWI<span>chat</span></span>')}<main class="scroll"><button class="connection-strip" data-action="connection">${icon('wifiOutline')}<span><b>${state.connection==='lan'?'Wi-Fi LAN':'Wi-Fi Direct'}</b><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span>${icon('chevronForward')}</button><label class="search-box">${icon('searchOutline')}<input id="search" type="search" placeholder="Search conversations" value="${esc(state.search)}" autocomplete="off" aria-label="Search conversations"></label><div class="section-heading">Messages <span>${history.chats.length} LAN · ${chats.length} demo</span></div><section class="chat-list">${allChats().filter(c=>c.name.toLowerCase().includes(state.search.toLowerCase())).map(chatRow).join('')||'<p class="empty">No conversations yet</p>'}</section><p class="demo-disclaimer">Demo contacts like Sarah are examples only. LAN chats are marked LAN.</p></main><button class="fab" data-action="new" aria-label="New conversation">${icon('createOutline')}</button>${nav()}`;
const contactsPage=()=>`${header('Contacts')}<main class="scroll"><div class="section-heading"><span class="online-dot"></span> Devices on Wi-Fi LAN <span>${onlinePeers.size} found</span></div>${peerRows()||`<div class="empty"><p>${esc(lanStatus)}</p><p>Connect two phones to the same Wi-Fi, open WIWIchat on both, and allow local network access.</p><button class="inline-button" data-action="scan">Try scanning again</button></div>`}<div class="section-heading">Demo contacts <span>Not real devices</span></div>${chats.filter(c=>c.online&&!c.group).map(c=>`<button class="contact-row" data-open="${esc(c.id)}">${avatar({...c,online:false})}<span><strong>${esc(c.name)}</strong><small>Demo contact · Not connected</small></span>${icon('chevronForward')}</button>`).join('')}<div class="section-heading">Demo groups</div>${chats.filter(c=>c.group).map(c=>`<button class="contact-row" data-open="${esc(c.id)}">${avatar(c)}<span><strong>${esc(c.name)}</strong><small>Group demonstration</small></span>${icon('chevronForward')}</button>`).join('')}</main><button class="fab" data-action="scan" aria-label="Rescan devices">${icon('wifiOutline')}</button>${nav()}`;
const settingsPage=()=>`${header('Settings',false,false)}<main class="scroll settings-scroll"><div class="profile-card"><div class="avatar profile-avatar">W</div><div><strong>My device</strong><small>${esc(identity.id)}</small></div>${icon('chevronForward')}</div><h3 class="settings-label">YOUR NAME</h3><form class="nickname-form" id="nickname"><input name="nickname" aria-label="Display name" maxlength="32" value="${esc(identity.name)}" required><button type="submit">Save</button></form><h3 class="settings-label">CONNECTION</h3><div class="settings-card"><button class="setting-row" data-action="scan">${icon('wifiOutline')}<span><strong>Wi-Fi LAN</strong><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span>${icon('chevronForward')}</button><button class="setting-row" data-action="direct">${icon('radioOutline')}<span><strong>Wi-Fi Direct</strong><small>Emergency mode · Not available yet</small></span><span class="coming">Later</span></button></div><h3 class="settings-label">PREFERENCES</h3><div class="settings-card">${[['moonOutline','Appearance','appearance'],['notificationsOutline','Notifications','notifications'],['folderOutline','Received files','files'],['shieldCheckmarkOutline','Privacy & security','privacy'],['informationCircleOutline','About WIWIchat','about']].map(([ic,label,action])=>`<button class="setting-row compact" data-action="${action}">${icon(ic)}<span><strong>${label}</strong></span>${icon('chevronForward')}</button>`).join('')}</div><p class="version">WIWIchat v0.2 · Local network prototype · Messages are not encrypted yet</p></main>${nav()}`;
const conversation=()=>{
  const c=currentChat();if(!c){state.page='home';return chatsPage()}
  const isLan=c.kind==='lan';
  return `<header class="header conversation-header"><button class="icon-btn" data-action="back" aria-label="Back">${icon('arrowBack')}</button>${avatar(c,'small')}<div class="person-title"><strong>${esc(c.name)}</strong><small>${isLan?(c.online?'Online via Wi-Fi LAN':'Offline · Cannot send now'):'Demo contact · No network connection'}</small></div><button class="icon-btn" data-action="menu" aria-label="More">${icon('ellipsisVertical')}</button></header><main class="messages" id="messages"><div class="day-label">${isLan?'Local Wi-Fi chat · Unencrypted prototype':'Demo messages'}</div>${c.messages.map(m=>`<div class="message-line ${m.mine?'mine':''}"><div class="bubble">${esc(m.text)}<div class="message-time">${esc(m.time)} ${m.mine?`<span>${m.status==='failed'?'Failed':m.status==='pending'?'Sending':m.status==='sent'?'Accepted':'Demo'}</span>`:''} ${m.mine&&m.status==='sent'?icon('checkmarkDone'):''}</div>${m.status==='failed'?`<button class="retry" data-action="retry" data-message-id="${esc(m.id)}">Retry</button>`:''}</div></div>`).join('')}</main>${state.attachments?`<div class="attachment-menu">${[['imageOutline','Photo'],['documentTextOutline','Document'],['cameraOutline','Camera'],['headsetOutline','Audio'],['folderOutline','Other files']].map(([ic,l])=>`<button data-action="file" data-kind="${l}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`:''}<form class="composer" id="compose"><button type="button" class="plus-btn" data-action="attach" aria-label="Attach file">${icon(state.attachments?'closeOutline':'add')}</button><input id="draft" name="message" maxlength="${MAX_MESSAGE_LENGTH}" value="${esc(drafts.get(state.active)||'')}" placeholder="${isLan&&!c.online?'Device offline': 'Write a message...'}" ${isLan&&!c.online?'disabled':''} autocomplete="off" aria-label="Write a message"><button class="send-btn" aria-label="Send message" type="submit" ${isLan&&!c.online?'disabled':''}>${icon('send')}</button></form><input id="file-input" type="file" hidden>`;
};
const modal=()=>state.menu?`<div class="overlay" data-action="dismiss"><div class="popup" role="dialog" aria-label="Options"><h3>WIWIchat</h3><p>Wi-Fi LAN messages are available only inside installed native apps. Demo contacts remain separate. Messages are not yet end-to-end encrypted.</p><button data-action="reset">Reset demo messages</button><button data-action="dismiss">Close</button></div></div>`:'';
function render(){document.documentElement.dataset.theme=state.theme;$('#app').innerHTML=`<div class="shell">${state.page==='conversation'?conversation():state.tab==='contacts'?contactsPage():state.tab==='settings'?settingsPage():chatsPage()}${modal()}</div>`;const box=$('#messages');if(box)box.scrollTop=box.scrollHeight;}
function openChat(id){
 state.active=id;state.page='conversation';state.attachments=false;
 if(id.startsWith('lan:')) history.clearUnread(id.slice(4));
 else {const c=chats.find(x=>x.id===id);if(c)c.unread=0;save()}
 render();
}
async function sendLanMessage(peerId,message){
 try{
   await lan.send({recipientId:peerId,identity,id:message.id,text:message.text,sentAt:message.sentAt});
   history.updateStatus(peerId,message.id,'sent');
 }catch(error){history.updateStatus(peerId,message.id,'failed');toast(String(error?.message||error))}
 render();
}

function toast(msg){let t=$('.toast');if(t)t.remove();t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2600)}
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;state.page='home';state.search='';render();return}
  const open=e.target.closest('[data-open]');if(open){openChat(open.dataset.open);return}
  const action=e.target.closest('[data-action]');if(!action)return;
  switch(action.dataset.action){
    case 'back':state.page='home';state.attachments=false;render();break;
    case 'search':state.page='home';state.tab='chats';render();$('#search')?.focus();break;
    case 'connection':state.tab='settings';state.page='home';render();break;
    case 'menu':state.menu=true;render();break;
    case 'dismiss':state.menu=false;render();break;
    case 'reset':chats=structuredClone(seed);save();state.menu=false;render();toast('Demo restored. LAN history kept.');break;
    case 'new':state.tab='contacts';state.page='home';render();break;
    case 'scan':
      if(!native){toast('Chrome cannot scan LAN. Install the Android/iOS app.');break}
      void (async()=>{await lan?.stop();await startLan()})();
      break;
    case 'direct':toast('Wi-Fi Direct is not implemented in v0.2');break;
    case 'attach':
      if(activeLan()){toast('File transfer is planned for a later version');break}
      state.attachments=!state.attachments;render();$('#draft')?.focus();break;
    case 'file':$('#file-input')?.click();break;
    case 'retry':{
      if(!activeLan())break;
      const id=state.active.slice(4);
      const msg=history.get(id)?.messages.find(m=>m.id===action.dataset.messageId);
      if(msg&&msg.status==='failed'){msg.status='pending';history.save();render();void sendLanMessage(id,msg)}
      break;
    }
    case 'appearance':state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('wiwi-theme',state.theme);render();break;
    case 'notifications':case 'files':case 'privacy':case 'about':toast('Coming in a future development phase');break;
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='draft'){drafts.set(state.active,e.target.value);return}
  if(e.target.id==='search'){
    state.search=e.target.value;
    const list=$('.chat-list');if(list)list.innerHTML=allChats().filter(c=>c.name.toLowerCase().includes(state.search.toLowerCase())).map(chatRow).join('')||'<p class="empty">No conversations found</p>';
  }
});
document.addEventListener('submit',e=>{
 if(e.target.id==='nickname'){
   e.preventDefault();
   const name=e.target.elements.nickname.value.trim().slice(0,32);
   if(!name){toast('Enter a name');return}
   identity.name=name;localStorage.setItem('wiwi-lan-identity-v1',JSON.stringify(identity));
   if(native){void (async()=>{await lan?.stop();await startLan()})()}
   else render();
   toast('Device name saved');return;
 }
 if(e.target.id!=='compose')return;e.preventDefault();
 const input=$('#draft'),value=input.value.trim();if(!value)return;
 if(activeLan()){
   const peerId=state.active.slice(4);
   if(!onlinePeers.has(peerId)){toast('Device offline');return}
   drafts.delete(state.active);
   const sentAt=new Date().toISOString();
   const msg={id:crypto.randomUUID(),mine:true,text:value,time:prettyTime(sentAt),sentAt,status:'pending'};
   history.add(peerId,onlinePeers.get(peerId)?.name,msg);
   state.attachments=false;render();void sendLanMessage(peerId,msg);
   return;
 }
 const c=chats.find(x=>x.id===state.active);if(!c)return;
 drafts.delete(state.active);
 c.messages.push({mine:true,text:value,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});save();state.attachments=false;render();toast('Saved locally as demo. Not delivered.');
});
document.addEventListener('change',e=>{
 if(e.target.id==='file-input'){
   const f=e.target.files?.[0];if(!f)return;
   if(activeLan()){toast('File transfer is not implemented');return}
   const c=chats.find(x=>x.id===state.active);
   c.messages.push({mine:true,text:`📎 ${f.name} (demo only)`,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
   save();state.attachments=false;render();toast('Filename saved in demo; file not transferred.');
 }
});
render();
void startLan();
