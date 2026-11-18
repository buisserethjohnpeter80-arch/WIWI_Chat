// WIWIchat — First Launch Experience + real user management.
//
// Built on the v0.2 Wi-Fi LAN foundation (LanService / LanChatStore /
// native @wiwichat/lan plugin). No demo users, groups or messages
// exist anywhere in this file: the old seed contacts (Sarah, David,
// Peter, Admin, Gwoup Klas 12, Tèm Matematik) were removed, and a
// precise migration in demoMigration.js removes only those exact
// demo ids from localStorage, never a general reset.
//
// User-visible strings live in T so the app can be translated later.
import { LanService, nativeLanSupported } from './lanService.js';
import { LanChatStore } from './lanStore.js';
import { MAX_MESSAGE_LENGTH, makeIdentity } from './lanProtocol.js';
import {
  completeOnboarding,
  createProfile,
  isOnboarded,
  loadProfile,
  saveProfile,
  updateProfile,
  validatePhotoDataUrl,
} from './profile.js';
import { migrateDemoData } from './demoMigration.js';
import { GROUP_CHAT_AVAILABLE, createGroup, listGroups } from './groups.js';
import '@ionic/core/css/core.css';
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
import { addIcons } from 'ionicons';
import {
  chatbubbles, chatbubblesOutline, people, peopleOutline, settingsOutline, settings,
  searchOutline, ellipsisVertical, add, arrowBack, send, attachOutline, documentTextOutline,
  imageOutline, cameraOutline, headsetOutline, folderOutline, wifiOutline, checkmarkDone,
  checkmark, checkmarkCircle, chevronForward, personOutline, notificationsOutline,
  informationCircleOutline, createOutline, closeOutline, personAddOutline,
  shieldCheckmarkOutline, moonOutline, sunnyOutline, arrowForward, cloudOfflineOutline,
  radioOutline, checkmarkCircleOutline, trashOutline,
} from 'ionicons/icons';
import './style.css';

addIcons({
  chatbubbles, chatbubblesOutline, people, peopleOutline, settingsOutline, settings,
  searchOutline, ellipsisVertical, add, arrowBack, send, attachOutline, documentTextOutline,
  imageOutline, cameraOutline, headsetOutline, folderOutline, wifiOutline, checkmarkDone,
  checkmark, checkmarkCircle, chevronForward, personOutline, notificationsOutline,
  informationCircleOutline, createOutline, closeOutline, personAddOutline,
  shieldCheckmarkOutline, moonOutline, sunnyOutline, arrowForward, cloudOfflineOutline,
  radioOutline, checkmarkCircleOutline, trashOutline,
});

(async () => {
  try { await import(/* @vite-ignore */ '/ionic.esm.js'); }
  catch (e) { console.warn('Ionic elements could not initialize', e); }
})();

// ---- Localization-ready strings (English, v1) ----
const T = {
  welcomeTitle: 'Welcome to WIWIchat',
  welcomeText: 'Chat and share with people nearby, even without internet.',
  welcomeLocal: 'Uses your local Wi-Fi connection — no internet needed.',
  getStarted: 'Get Started',
  createProfileTitle: 'Create your profile',
  createProfileText: 'This identity lives only on this device. No email, phone number or password needed.',
  displayName: 'Display Name',
  displayNamePlaceholder: 'Your name',
  profilePhoto: 'Profile Photo',
  profilePhotoOptional: 'Optional',
  deviceName: 'Device Name',
  deviceNameHint: 'Suggested automatically — you can change it.',
  yourDeviceId: 'Your device ID',
  continueBtn: 'Continue',
  backBtn: 'Back',
  connectTitle: 'Connect locally',
  connectText: 'Connect to the same Wi-Fi network as nearby users to start chatting.',
  wifiLan: 'Wi-Fi LAN',
  wifiLanPrimary: 'Primary connection',
  wifiDirect: 'Wi-Fi Direct',
  wifiDirectLater: 'Backup feature — planned, not available yet',
  startApp: 'Start WIWIchat',
  noConversations: 'No conversations yet',
  noConversationsText: 'Find people nearby and start your first conversation.',
  findNearby: 'Find Nearby People',
  noContacts: 'No contacts yet',
  noContactsText: 'Discover nearby users to connect.',
  discoverDevices: 'Discover Devices',
  devicesOnLan: 'Devices on Wi-Fi LAN',
  searching: 'Searching for nearby devices…',
  noDevices: 'No nearby devices found',
  noDevicesText: 'Make sure both devices are using the same Wi-Fi network.',
  retry: 'Retry',
  noGroups: 'No groups yet',
  noGroupsText: 'Create a group to chat with multiple people.',
  createGroup: 'Create Group',
  groupComingSoon: 'Group chat is coming in a later version. It is not available yet, so no group was created.',
  startConversation: 'Start your conversation',
  myDevice: 'My device',
  editProfile: 'Edit profile',
  save: 'Save',
  cancel: 'Cancel',
  removePhoto: 'Remove photo',
  choosePhoto: 'Choose photo',
};

// ---- Startup: migrate demo data, load the real profile ----
migrateDemoData();

let profile = loadProfile();
let onboardingStep = !profile ? 1 : (isOnboarded(profile) ? 0 : 3);
let draft = profile
  ? { ...profile }
  : { displayName: '', deviceName: 'My phone', photo: null, peerId: makeIdentity().id };
let identity = profile ? { id: profile.peerId, name: profile.displayName } : null;

const native = nativeLanSupported();
const history = new LanChatStore();
const onlinePeers = new Map();
const drafts = new Map();
let lanStatus = native ? 'Starting Wi-Fi LAN…' : 'Chrome preview · Native app required for LAN';
let lan;
let scanning = false;

const state = {
  tab: 'chats', page: 'home', active: null, search: '',
  connection: 'lan', theme: localStorage.getItem('wiwi-theme') || 'dark',
  menu: false, attachments: false, info: null, editingProfile: false,
};

const $ = (s) => document.querySelector(s);
const icon = (n, cl = '') => `<ion-icon class="${cl}" name="${n}" aria-hidden="true"></ion-icon>`;

// Inline SVG icons (official Ionicons paths) for the bottom nav, the FAB and
// Groups: they always render, even where <ion-icon> fails to load in the
// native app (Contacts/Settings nav icons and the FAB showed up empty).
const SICON = {
  'chatbubbles-outline': `<path d="M431 320.6c-1-3.6 1.2-8.6 3.3-12.2a34 34 0 0 1 2.1-3.1A162 162 0 0 0 464 215c.3-92.2-77.5-167-173.7-167-83.9 0-153.9 57.1-170.3 132.9a160.7 160.7 0 0 0-3.7 34.2c0 92.3 74.8 169.1 171 169.1 15.3 0 35.9-4.6 47.2-7.7s22.5-7.2 25.4-8.3a26.4 26.4 0 0 1 9.3-1.7 26 26 0 0 1 10.1 2l56.7 20.1a13.5 13.5 0 0 0 3.9 1 8 8 0 0 0 8-8 13 13 0 0 0-.5-2.7Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/><path d="M66.46 232a146.23 146.23 0 0 0 6.39 152.67c2.31 3.49 3.61 6.19 3.21 8s-11.93 61.87-11.93 61.87a8 8 0 0 0 2.71 7.68A8.17 8.17 0 0 0 72 464a7.3 7.3 0 0 0 2.91-.6l56.21-22a15.7 15.7 0 0 1 12 .2c18.94 7.38 39.88 12 60.83 12A159.2 159.2 0 0 0 284 432.11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'chatbubbles': `<path d="M60.44 389.17c0 .07 0 .2-.08.38.03-.12.05-.25.08-.38M439.9 405.6a26.8 26.8 0 0 1-9.59-2l-56.78-20.13-.42-.17a9.9 9.9 0 0 0-3.91-.76 10.3 10.3 0 0 0-3.62.66c-1.38.52-13.81 5.19-26.85 8.77-7.07 1.94-31.68 8.27-51.43 8.27-50.48 0-97.68-19.4-132.89-54.63A183.38 183.38 0 0 1 100.3 215.1a176 176 0 0 1 4.06-37.58c8.79-40.62 32.07-77.57 65.55-104A194.76 194.76 0 0 1 290.3 32c52.21 0 100.86 20 137 56.18 34.16 34.27 52.88 79.33 52.73 126.87a177.86 177.86 0 0 1-30.3 99.15l-.19.28-.74 1c-.17.23-.34.45-.5.68l-.15.27a22 22 0 0 0-1.08 2.09l15.74 55.94a26.4 26.4 0 0 1 1.12 7.11 24 24 0 0 1-24.03 24.03"/><path d="M299.87 425.39a15.74 15.74 0 0 0-10.29-8.1c-5.78-1.53-12.52-1.27-17.67-1.65a201.78 201.78 0 0 1-128.82-58.75A199.2 199.2 0 0 1 86.4 244.16C85 234.42 85 232 85 232a16 16 0 0 0-28-10.58s-7.88 8.58-11.6 17.19a162.09 162.09 0 0 0 11 150.06C59 393 59 395 58.42 399.5c-2.73 14.11-7.51 39-10 51.91a24 24 0 0 0 8 22.92l.46.39A24.34 24.34 0 0 0 72 480a23.4 23.4 0 0 0 9-1.79l53.51-20.65a8.05 8.05 0 0 1 5.72 0c21.07 7.84 43 12 63.78 12a176 176 0 0 0 74.91-16.66c5.46-2.56 14-5.34 19-11.12a15 15 0 0 0 1.95-16.39"/>`,
  'people-outline': `<path d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.37-72 66-72s69 30.46 66 72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 335.36 401.18 304 336 304Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M200 185.94c-2.34 32.48-26.72 58.06-53 58.06s-50.7-25.57-53-58.06C91.61 152.15 115.34 128 147 128s55.39 24.77 53 57.94" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M206 306c-18.05-8.27-37.93-11.45-59-11.45-52 0-102.1 25.85-114.65 76.2-1.65 6.66 2.53 13.25 9.37 13.25H154" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'people': `<path d="M336 256c-20.56 0-40.44-9.18-56-25.84-15.13-16.25-24.37-37.92-26-61-1.74-24.62 5.77-47.26 21.14-63.76S312 80 336 80c23.83 0 45.38 9.06 60.7 25.52 15.47 16.62 23 39.22 21.26 63.63-1.67 23.11-10.9 44.77-26 61C376.44 246.82 356.57 256 336 256M467.83 432H204.18a27.71 27.71 0 0 1-22-10.67 30.22 30.22 0 0 1-5.26-25.79c8.42-33.81 29.28-61.85 60.32-81.08C264.79 297.4 299.86 288 336 288c36.85 0 71 9 98.71 26.05 31.11 19.13 52 47.33 60.38 81.55a30.27 30.27 0 0 1-5.32 25.78A27.68 27.68 0 0 1 467.83 432M147 260c-35.19 0-66.13-32.72-69-72.93-1.42-20.6 5-39.65 18-53.62 12.86-13.83 31-21.45 51-21.45s38 7.66 50.93 21.57c13.1 14.08 19.5 33.09 18 53.52-2.87 40.2-33.8 72.91-68.93 72.91M212.66 291.45c-17.59-8.6-40.42-12.9-65.65-12.9-29.46 0-58.07 7.68-80.57 21.62-25.51 15.83-42.67 38.88-49.6 66.71a27.39 27.39 0 0 0 4.79 23.36A25.32 25.32 0 0 0 41.72 400h111a8 8 0 0 0 7.87-6.57c.11-.63.25-1.26.41-1.88 8.48-34.06 28.35-62.84 57.71-83.82a8 8 0 0 0-.63-13.39c-1.57-.92-3.37-1.89-5.42-2.89"/>`,
  'settings-outline': `<path d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64.13 64.13 0 0 0-57.4-57.4M416.39 256a154 154 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.5 164.5 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22 155 155 0 0 1-21.46-12.57 16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.5 164.5 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22 155 155 0 0 1 21.46 12.57 16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'settings': `<circle cx="256" cy="256" r="48"/><path d="m470.39 300-.47-.38-31.56-24.75a16.11 16.11 0 0 1-6.1-13.33v-11.56a16 16 0 0 1 6.11-13.22L469.92 212l.47-.38a26.68 26.68 0 0 0 5.9-34.06l-42.71-73.9a1.6 1.6 0 0 1-.13-.22A26.86 26.86 0 0 0 401 92.14l-.35.13-37.1 14.93a15.94 15.94 0 0 1-14.47-1.29q-4.92-3.1-10-5.86a15.94 15.94 0 0 1-8.19-11.82l-5.59-39.59-.12-.72A27.22 27.22 0 0 0 298.76 26h-85.52a26.92 26.92 0 0 0-26.45 22.39l-.09.56-5.57 39.67a16 16 0 0 1-8.13 11.82 175 175 0 0 0-10 5.82 15.92 15.92 0 0 1-14.43 1.27l-37.13-15-.35-.14a26.87 26.87 0 0 0-32.48 11.34l-.13.22-42.77 73.95a26.71 26.71 0 0 0 5.9 34.1l.47.38 31.56 24.75a16.11 16.11 0 0 1 6.1 13.33v11.56a16 16 0 0 1-6.11 13.22L42.08 300l-.47.38a26.68 26.68 0 0 0-5.9 34.06l42.71 73.9a1.6 1.6 0 0 1 .13.22 26.86 26.86 0 0 0 32.45 11.3l.35-.13 37.07-14.93a15.94 15.94 0 0 1 14.47 1.29q4.92 3.11 10 5.86a15.94 15.94 0 0 1 8.19 11.82l5.56 39.59.12.72A27.22 27.22 0 0 0 213.24 486h85.52a26.92 26.92 0 0 0 26.45-22.39l.09-.56 5.57-39.67a16 16 0 0 1 8.18-11.82c3.42-1.84 6.76-3.79 10-5.82a15.92 15.92 0 0 1 14.43-1.27l37.13 14.95.35.14a26.85 26.85 0 0 0 32.48-11.34 3 3 0 0 1 .13-.22l42.71-73.89a26.7 26.7 0 0 0-5.89-34.11m-134.48-40.24a80 80 0 1 1-83.66-83.67 80.21 80.21 0 0 1 83.66 83.67"/>`,
  'person-add-outline': `<path d="M376 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M288 304c-87 0-175.3 48-191.64 138.6-2 10.92 4.21 21.4 15.65 21.4H464c11.44 0 17.62-10.48 15.65-21.4C463.3 352 375 304 288 304Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M88 176v112M144 232H32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'wifi-outline': `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M318.586 363.5 256 424l-62.586-60.5S212 336 256 336s62.586 27.5 62.586 27.5M407.31 278 372 312s-41-46-116-46-116 46-116 46l-35.31-34S142.5 214 256 214s151.31 64 151.31 64"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m496 192-36.69 35.5S386.5 141 256 141 52.69 227.5 52.69 227.5L16 192S88 88 256 88s240 104 240 104"/>`
};
const sicon = (n, cl = '') => `<svg class="sicon ${cl}" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">${SICON[n] || ''}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const prettyTime = (stamp) => {
  const t = new Date(stamp);
  return Number.isNaN(+t) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isOnboarding = () => onboardingStep !== 0;
const activeLan = () => typeof state.active === 'string' && state.active.startsWith('lan:');
const peerChat = (c) => ({ ...c, kind: 'lan', online: onlinePeers.has(c.id) });
const allChats = () => history.chats.map(peerChat);
const currentChat = () => {
  if (!activeLan()) return null;
  const found = history.get(state.active.slice(4));
  return found ? peerChat(found) : null;
};
const last = (c) => c.messages.at(-1) || {};
const save = () => {}; // No demo store anymore; LAN history saves itself.

function avatar(c, sz = '') {
  if (c.photo) return `<div class="avatar ${sz} avatar-photo"><img src="${esc(c.photo)}" alt=""></div>`;
  return `<div class="avatar ${sz}" style="--avatar:${c.color || '#168fff'}">${c.group ? icon('people') : esc(initials(c.name))}${c.online ? '<i class="presence"></i>' : ''}</div>`;
}

function toast(msg) {
  let t = $('.toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// ---- LAN ----
const received = (frame) => {
  const newMessage = { id: frame.id, mine: false, text: frame.text, time: prettyTime(frame.sentAt), sentAt: frame.sentAt, status: 'received' };
  const visible = state.page === 'conversation' && state.active === `lan:${frame.fromId}`;
  const wasAdded = history.add(frame.fromId, frame.fromName, newMessage, { unread: !visible });
  if (wasAdded) { render(); if (!visible) toast(`New LAN message from ${frame.fromName}`); }
};

const startLan = async () => {
  if (!native || !identity) {
    lanStatus = 'Chrome preview · LAN requires the installed Android/iOS app';
    scanning = false;
    render();
    return;
  }
  if (!lan) {
    lan = new LanService(undefined, {
      onPeers: (peers) => {
        scanning = false;
        onlinePeers.clear();
        for (const p of peers) { onlinePeers.set(p.id, p); history.ensure(p.id, p.name); }
        render();
      },
      onMessage: received,
      onStatus: (status) => {
        lanStatus = status.running ? 'Connected to LAN · Searching nearby devices' : status.reason || 'Wi-Fi LAN is offline';
        if (!status.running) scanning = false;
        render();
      },
    });
  }
  scanning = true;
  lanStatus = 'Starting Wi-Fi LAN…';
  render();
  await lan.start(identity);
};

async function scanAgain() {
  if (!native) { toast('Chrome cannot scan LAN. Install the Android/iOS app.'); return; }
  if (!identity) { toast('Finish setting up your profile first.'); return; }
  scanning = true;
  render();
  await lan?.stop();
  await startLan();
}

async function sendLanMessage(peerId, message) {
  try {
    await lan.send({ recipientId: peerId, identity, id: message.id, text: message.text, sentAt: message.sentAt });
    history.updateStatus(peerId, message.id, 'sent');
  } catch (error) {
    history.updateStatus(peerId, message.id, 'failed');
    toast(String(error?.message || error));
  }
  render();
}

// ---- Shared chrome ----
const header = (title, back = false, more = true) => `<header class="header">${back ? `<button class="icon-btn" data-action="back" aria-label="Back">${icon('arrowBack')}</button>` : ''}<div class="header-title">${title}</div><div class="header-actions">${!back ? `<button class="icon-btn" data-action="search" aria-label="Search">${icon('searchOutline')}</button>` : ''}${more ? `<button class="icon-btn" data-action="menu" aria-label="More options">${icon('ellipsisVertical')}</button>` : ''}</div></header>`;
const nav = () => `<nav class="bottom-nav" aria-label="Main navigation">${[['chats', 'chatbubblesOutline', 'Chats'], ['contacts', 'peopleOutline', 'Contacts'], ['settings', 'settingsOutline', 'Settings']].map(([id, ic, label]) => `<button data-tab="${id}" class="nav-item ${state.tab === id ? 'selected' : ''}" aria-label="${label}" aria-current="${state.tab === id ? 'page' : 'false'}"><span class="nav-icon">${sicon(state.tab === id ? ic.replace('Outline', '') : ic)}</span><span>${label}</span></button>`).join('')}</nav>`;

// ---- Onboarding ----
function onboardingPage() {
  if (onboardingStep === 1) {
    return `<div class="onboarding"><div class="onboarding-hero"><img class="brand-icon onboarding-mark" src="/logo-icon.svg" alt="WIWIchat"><h1>${T.welcomeTitle}</h1><p>${T.welcomeText}</p><p class="onboarding-local">${icon('wifiOutline')} ${T.welcomeLocal}</p></div><button class="primary-btn" data-action="onboarding-next">${T.getStarted}</button><p class="onboarding-steps">Step 1 of 3</p></div>`;
  }
  if (onboardingStep === 2) {
    return `<div class="onboarding"><button class="icon-btn onboarding-back" data-action="onboarding-back" aria-label="Back">${icon('arrowBack')}</button><h1>${T.createProfileTitle}</h1><p>${T.createProfileText}</p><form id="onboarding-profile" class="profile-form"><label>${T.displayName}<input name="displayName" maxlength="32" value="${esc(draft.displayName)}" placeholder="${T.displayNamePlaceholder}" required autocomplete="off"></label><label>${T.profilePhoto} <span class="coming">${T.profilePhotoOptional}</span><span class="photo-row">${draft.photo ? `<img class="photo-preview" src="${esc(draft.photo)}" alt="">` : `<span class="avatar profile-avatar">${esc(initials(draft.displayName || 'W'))}</span>`}<span><button type="button" class="inline-button" data-action="choose-photo">${T.choosePhoto}</button>${draft.photo ? ` <button type="button" class="inline-button" data-action="remove-photo">${T.removePhoto}</button>` : ''}</span></span><input id="photo-input" type="file" accept="image/*" hidden></label><label>${T.deviceName}<input name="deviceName" maxlength="32" value="${esc(draft.deviceName)}" autocomplete="off"><small>${T.deviceNameHint}</small></label><p class="device-id">${T.yourDeviceId}: <code>${esc(draft.peerId)}</code></p><button class="primary-btn" type="submit">${T.continueBtn}</button></form><p class="onboarding-steps">Step 2 of 3</p></div>`;
  }
  return `<div class="onboarding"><button class="icon-btn onboarding-back" data-action="onboarding-back" aria-label="Back">${icon('arrowBack')}</button><h1>${T.connectTitle}</h1><p>${T.connectText}</p><div class="settings-card"><div class="setting-row">${icon('wifiOutline')}<span><strong>${T.wifiLan}</strong><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span></div><div class="setting-row">${icon('radioOutline')}<span><strong>${T.wifiDirect}</strong><small>${T.wifiDirectLater}</small></span><span class="coming">Later</span></div></div>${native ? '' : `<p class="demo-disclaimer">Chrome preview only: LAN discovery needs the installed Android/iOS app. Turn on Wi-Fi and open WIWIchat on both phones.</p>`}<button class="primary-btn" data-action="onboarding-start">${T.startApp}</button><p class="onboarding-steps">Step 3 of 3</p></div>`;
}

// ---- Home pages (no demo data anywhere) ----
const chatRow = (c) => `<button class="chat-row" data-open="lan:${esc(c.id)}">${avatar({ ...c, online: c.online })}<span class="chat-meta"><span class="chat-top"><strong>${esc(c.name)}</strong><small>${esc(last(c).time || '')}</small></span><span class="chat-bottom"><span>${esc(last(c).text || (c.online ? 'Available on Wi-Fi LAN' : 'Offline · Messages stored locally'))}</span>${c.unread ? `<b class="unread">${c.unread}</b>` : ''}</span></span><span class="lan-pill">LAN</span></button>`;

function chatsPage() {
  const chats = allChats().filter((c) => c.name.toLowerCase().includes(state.search.toLowerCase()));
  return `${header('<span class="brand-name">WIWI<span>chat</span></span>')}<main class="scroll"><button class="connection-strip" data-action="connection">${icon('wifiOutline')}<span><b>${T.wifiLan}</b><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span>${icon('chevronForward')}</button><label class="search-box">${icon('searchOutline')}<input id="search" type="search" placeholder="Search conversations" value="${esc(state.search)}" autocomplete="off" aria-label="Search conversations"></label><div class="section-heading">Messages <span>${history.chats.length} LAN</span></div>${chats.length ? `<section class="chat-list">${chats.map(chatRow).join('')}</section>` : `<div class="empty-state">${icon('chatbubblesOutline', 'empty-icon')}<h2>${T.noConversations}</h2><p>${T.noConversationsText}</p><button class="primary-btn" data-action="find-nearby">${T.findNearby}</button></div>`}</main><button class="fab" data-action="find-nearby" aria-label="Find nearby people">${sicon('personAddOutline')}</button>${nav()}`;
}

function contactsPage() {
  const peers = [...onlinePeers.values()];
  return `${header('Contacts')}<main class="scroll"><div class="section-heading"><span class="online-dot"></span> ${T.devicesOnLan} <span>${peers.length} found</span></div>${scanning ? `<div class="empty-state"><ion-spinner></ion-spinner><p>${T.searching}</p></div>` : peers.length ? peers.map((p) => `<button class="contact-row" data-open="lan:${esc(p.id)}">${avatar({ name: p.name, color: '#168fff', online: true })}<span><strong>${esc(p.name)}</strong><small>Wi-Fi LAN · Device found</small></span><span class="lan-pill">LAN</span></button>`).join('') : `<div class="empty-state">${icon('peopleOutline', 'empty-icon')}<h2>${T.noContacts}</h2><p>${T.noContactsText}</p><button class="primary-btn" data-action="scan">${T.discoverDevices}</button></div>`}${!scanning && !peers.length ? `<div class="empty-state"><h2>${T.noDevices}</h2><p>${T.noDevicesText}</p><button class="inline-button" data-action="scan">${T.retry}</button></div>` : ''}<div class="section-heading">${sicon('peopleOutline', 'section-icon')} Groups <span>${GROUP_CHAT_AVAILABLE ? '' : 'Planned'}</span></div><div class="empty-state"><h2>${T.noGroups}</h2><p>${T.noGroupsText}</p><button class="inline-button" data-action="create-group">${T.createGroup}</button></div></main><button class="fab" data-action="scan" aria-label="Rescan devices">${sicon('wifiOutline')}</button>${nav()}`;
}

function settingsPage() {
  const p = profile || draft;
  return `${header('Settings', false, false)}<main class="scroll settings-scroll"><div class="profile-card">${avatar({ name: p.displayName || 'W', photo: p.photo, color: '#0b78ea' }, 'profile-avatar')}<div><strong>${esc(p.displayName || T.myDevice)}</strong><small>${esc(p.peerId || '')}</small></div><button class="inline-button" data-action="edit-profile">${T.editProfile}</button></div>${state.editingProfile ? `<form id="profile-form" class="profile-form"><label>${T.displayName}<input name="displayName" maxlength="32" value="${esc(p.displayName)}" required autocomplete="off"></label><label>${T.profilePhoto} <span class="coming">${T.profilePhotoOptional}</span><span class="photo-row">${p.photo ? `<img class="photo-preview" src="${esc(p.photo)}" alt="">` : ''}<span><button type="button" class="inline-button" data-action="choose-photo">${T.choosePhoto}</button>${p.photo ? ` <button type="button" class="inline-button" data-action="remove-photo">${T.removePhoto}</button>` : ''}</span></span><input id="photo-input" type="file" accept="image/*" hidden></label><label>${T.deviceName}<input name="deviceName" maxlength="32" value="${esc(p.deviceName)}" autocomplete="off"></label><span class="profile-form-actions"><button class="primary-btn" type="submit">${T.save}</button><button type="button" class="inline-button" data-action="cancel-edit-profile">${T.cancel}</button></span></form>` : ''}<h3 class="settings-label">CONNECTION</h3><div class="settings-card"><button class="setting-row" data-action="scan">${icon('wifiOutline')}<span><strong>${T.wifiLan}</strong><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span>${icon('chevronForward')}</button><button class="setting-row" data-action="direct">${icon('radioOutline')}<span><strong>${T.wifiDirect}</strong><small>${T.wifiDirectLater}</small></span><span class="coming">Later</span></button></div><h3 class="settings-label">PREFERENCES</h3><div class="settings-card">${[['moonOutline', 'Appearance', 'appearance'], ['notificationsOutline', 'Notifications', 'notifications'], ['folderOutline', 'Received files', 'files'], ['shieldCheckmarkOutline', 'Privacy & security', 'privacy'], ['informationCircleOutline', 'About WIWIchat', 'about']].map(([ic, label, action]) => `<button class="setting-row compact" data-action="${action}">${icon(ic)}<span><strong>${label}</strong></span>${icon('chevronForward')}</button>`).join('')}</div><p class="version">WIWIchat v0.2 · Local network prototype · Messages are not encrypted yet</p></main>${nav()}`;
}

function conversation() {
  const c = currentChat();
  if (!c) { state.page = 'home'; return chatsPage(); }
  return `<header class="header conversation-header"><button class="icon-btn" data-action="back" aria-label="Back">${icon('arrowBack')}</button>${avatar(c, 'small')}<div class="person-title"><strong>${esc(c.name)}</strong><small>${c.online ? 'Online via Wi-Fi LAN' : 'Offline · Cannot send now'}</small></div><button class="icon-btn" data-action="menu" aria-label="More">More</button></header><main class="messages" id="messages">${c.messages.length ? '' : `<div class="day-label">${T.startConversation}</div>`}${c.messages.map((m) => `<div class="message-line ${m.mine ? 'mine' : ''}"><div class="bubble">${esc(m.text)}<div class="message-time">${esc(m.time)} ${m.mine ? `<span>${m.status === 'failed' ? 'Failed' : m.status === 'pending' ? 'Sending' : m.status === 'sent' ? 'Accepted' : ''}</span>` : ''} ${m.mine && m.status === 'sent' ? icon('checkmarkDone') : ''}</div>${m.status === 'failed' ? `<button class="retry" data-action="retry" data-message-id="${esc(m.id)}">Retry</button>` : ''}</div></div>`).join('')}</main><form class="composer" id="compose"><button type="button" class="plus-btn" data-action="attach" aria-label="Attach file">${icon(state.attachments ? 'closeOutline' : 'add')}</button><input id="draft" name="message" maxlength="${MAX_MESSAGE_LENGTH}" value="${esc(drafts.get(state.active) || '')}" placeholder="${!c.online ? 'Device offline' : 'Write a message...'}" ${!c.online ? 'disabled' : ''} autocomplete="off" aria-label="Write a message"><button class="send-btn" aria-label="Send message" type="submit" ${!c.online ? 'disabled' : ''}>${icon('send')}</button></form><input id="file-input" type="file" hidden>`;
}

const modal = () => {
  if (state.info === 'groups') return `<div class="overlay" data-action="dismiss-info"><div class="popup" role="dialog" aria-label="Groups"><h3>Groups</h3><p>${T.groupComingSoon}</p><button data-action="dismiss-info">Close</button></div></div>`;
  if (!state.menu) return '';
  return `<div class="overlay" data-action="dismiss"><div class="popup" role="dialog" aria-label="Options"><h3>WIWIchat</h3><p>Wi-Fi LAN messages are available only inside installed native apps. Messages are not yet end-to-end encrypted.</p><button data-action="dismiss">Close</button></div></div>`;
};

function render() {
  document.documentElement.dataset.theme = state.theme;
  if (isOnboarding()) {
    $('#app').innerHTML = `<div class="shell">${onboardingPage()}</div>`;
    return;
  }
  $('#app').innerHTML = `<div class="shell">${state.page === 'conversation' ? conversation() : state.tab === 'contacts' ? contactsPage() : state.tab === 'settings' ? settingsPage() : chatsPage()}${modal()}</div>`;
  const box = $('#messages');
  if (box) box.scrollTop = box.scrollHeight;
}

function openChat(id) {
  state.active = id;
  state.page = 'conversation';
  state.attachments = false;
  if (id.startsWith('lan:')) history.clearUnread(id.slice(4));
  render();
}

// ---- Events ----
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { state.tab = tab.dataset.tab; state.page = 'home'; state.search = ''; render(); return; }
  const open = e.target.closest('[data-open]');
  if (open) { openChat(open.dataset.open); return; }
  const action = e.target.closest('[data-action]');
  if (!action) return;
  switch (action.dataset.action) {
    case 'back': state.page = 'home'; state.attachments = false; render(); break;
    case 'search': state.page = 'home'; state.tab = 'chats'; render(); $('#search')?.focus(); break;
    case 'connection': state.tab = 'settings'; state.page = 'home'; render(); break;
    case 'menu': state.menu = true; render(); break;
    case 'dismiss': state.menu = false; render(); break;
    case 'dismiss-info': state.info = null; render(); break;
    case 'find-nearby': state.tab = 'contacts'; state.page = 'home'; render(); void scanAgain(); break;
    case 'scan': void scanAgain(); break;
    case 'direct': toast('Wi-Fi Direct is not implemented in v0.2'); break;
    case 'create-group': {
      const result = createGroup();
      if (!result.ok) { state.info = 'groups'; render(); }
      break;
    }
    case 'edit-profile': state.editingProfile = true; render(); break;
    case 'cancel-edit-profile': state.editingProfile = false; draft = profile ? { ...profile } : draft; render(); break;
    case 'choose-photo': $('#photo-input')?.click(); break;
    case 'remove-photo': draft.photo = null; if (profile && state.editingProfile) draft = { ...profile, photo: null }; render(); break;
    case 'onboarding-next': onboardingStep = 2; render(); break;
    case 'onboarding-back': onboardingStep = Math.max(1, onboardingStep - 1); render(); break;
    case 'onboarding-start': {
      if (!profile) break;
      profile = completeOnboarding();
      identity = { id: profile.peerId, name: profile.displayName };
      onboardingStep = 0;
      render();
      void startLan();
      break;
    }
    case 'attach': toast('File transfer is planned for a later version'); break;
    case 'file': $('#file-input')?.click(); break;
    case 'retry': {
      if (!activeLan()) break;
      const id = state.active.slice(4);
      const msg = history.get(id)?.messages.find((m) => m.id === action.dataset.messageId);
      if (msg && msg.status === 'failed') { msg.status = 'pending'; history.save(); render(); void sendLanMessage(id, msg); }
      break;
    }
    case 'appearance': state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('wiwi-theme', state.theme); render(); break;
    case 'notifications': case 'files': case 'privacy': case 'about': toast('Coming in a future development phase'); break;
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'draft') { drafts.set(state.active, e.target.value); return; }
  if (e.target.id === 'search') {
    state.search = e.target.value;
    const list = $('.chat-list');
    if (list) list.innerHTML = allChats().filter((c) => c.name.toLowerCase().includes(state.search.toLowerCase())).map(chatRow).join('') || '<p class="empty">No conversations found</p>';
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'onboarding-profile') {
    e.preventDefault();
    const name = e.target.elements.displayName.value.trim();
    const device = e.target.elements.deviceName.value.trim();
    if (!name) { toast('Enter a display name'); return; }
    try {
      profile = profile
        ? saveProfile({ ...profile, displayName: name, deviceName: device || 'My phone', photo: draft.photo })
        : createProfile({ displayName: name, deviceName: device || 'My phone', photo: draft.photo, peerId: draft.peerId });
      draft = { ...profile };
      identity = { id: profile.peerId, name: profile.displayName };
      onboardingStep = 3;
      render();
      void startLan();
    } catch (err) { toast(String(err?.message || err)); }
    return;
  }
  if (e.target.id === 'profile-form') {
    e.preventDefault();
    const name = e.target.elements.displayName.value.trim();
    const device = e.target.elements.deviceName.value.trim();
    if (!name) { toast('Enter a display name'); return; }
    try {
      profile = updateProfile({ displayName: name, deviceName: device || 'My phone', photo: draft.photo });
      draft = { ...profile };
      identity = { id: profile.peerId, name: profile.displayName };
      state.editingProfile = false;
      render();
      toast('Profile saved');
      if (native) { void (async () => { await lan?.stop(); await startLan(); })(); }
    } catch (err) { toast(String(err?.message || err)); }
    return;
  }
  if (e.target.id !== 'compose') return;
  e.preventDefault();
  const input = $('#draft');
  const value = input.value.trim();
  if (!value || !activeLan()) return;
  const peerId = state.active.slice(4);
  if (!onlinePeers.has(peerId)) { toast('Device offline'); return; }
  drafts.delete(state.active);
  const sentAt = new Date().toISOString();
  const msg = { id: crypto.randomUUID(), mine: true, text: value, time: prettyTime(sentAt), sentAt, status: 'pending' };
  history.add(peerId, onlinePeers.get(peerId)?.name, msg);
  state.attachments = false;
  render();
  void sendLanMessage(peerId, msg);
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'photo-input') {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        draft.photo = validatePhotoDataUrl(String(reader.result));
        render();
      } catch (err) { toast(String(err?.message || err)); }
    };
    reader.readAsDataURL(f);
    return;
  }
  if (e.target.id === 'file-input') {
    toast('File transfer is not implemented');
  }
});

render();
if (!isOnboarding()) void startLan();
else if (onboardingStep === 3 && profile) void startLan();
