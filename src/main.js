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
import { loadAppSettings, saveAppSettings } from './appSettings.js';
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
let appSettings = loadAppSettings();
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
// Every icon in the app is an inline SVG (official Ionicons paths):
// in the native APK several <ion-icon> elements never rendered
// (back arrow, folder, nav icons, FAB), so nothing here depends on
// the icon web component loading. <ion-icon> stays only as a fallback
// for a name that has no inline path.
const icon = (n, cl = '') => SICON[n]
  ? `<svg class="sicon ${cl}" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">${SICON[n]}</svg>`
  : `<ion-icon class="${cl}" name="${n}" aria-hidden="true"></ion-icon>`;

// Inline SVG icons (official Ionicons paths) for the bottom nav, the FAB and
// Groups: they always render, even where <ion-icon> fails to load in the
// native app (Contacts/Settings nav icons and the FAB showed up empty).
const SICON = {
  'chatbubbles': `<path d="M60.44 389.17c0 .07 0 .2-.08.38.03-.12.05-.25.08-.38M439.9 405.6a26.8 26.8 0 0 1-9.59-2l-56.78-20.13-.42-.17a9.9 9.9 0 0 0-3.91-.76 10.3 10.3 0 0 0-3.62.66c-1.38.52-13.81 5.19-26.85 8.77-7.07 1.94-31.68 8.27-51.43 8.27-50.48 0-97.68-19.4-132.89-54.63A183.38 183.38 0 0 1 100.3 215.1a176 176 0 0 1 4.06-37.58c8.79-40.62 32.07-77.57 65.55-104A194.76 194.76 0 0 1 290.3 32c52.21 0 100.86 20 137 56.18 34.16 34.27 52.88 79.33 52.73 126.87a177.86 177.86 0 0 1-30.3 99.15l-.19.28-.74 1c-.17.23-.34.45-.5.68l-.15.27a22 22 0 0 0-1.08 2.09l15.74 55.94a26.4 26.4 0 0 1 1.12 7.11 24 24 0 0 1-24.03 24.03"/><path d="M299.87 425.39a15.74 15.74 0 0 0-10.29-8.1c-5.78-1.53-12.52-1.27-17.67-1.65a201.78 201.78 0 0 1-128.82-58.75A199.2 199.2 0 0 1 86.4 244.16C85 234.42 85 232 85 232a16 16 0 0 0-28-10.58s-7.88 8.58-11.6 17.19a162.09 162.09 0 0 0 11 150.06C59 393 59 395 58.42 399.5c-2.73 14.11-7.51 39-10 51.91a24 24 0 0 0 8 22.92l.46.39A24.34 24.34 0 0 0 72 480a23.4 23.4 0 0 0 9-1.79l53.51-20.65a8.05 8.05 0 0 1 5.72 0c21.07 7.84 43 12 63.78 12a176 176 0 0 0 74.91-16.66c5.46-2.56 14-5.34 19-11.12a15 15 0 0 0 1.95-16.39"/>`,
  'chatbubblesOutline': `<path d="M431 320.6c-1-3.6 1.2-8.6 3.3-12.2a34 34 0 0 1 2.1-3.1A162 162 0 0 0 464 215c.3-92.2-77.5-167-173.7-167-83.9 0-153.9 57.1-170.3 132.9a160.7 160.7 0 0 0-3.7 34.2c0 92.3 74.8 169.1 171 169.1 15.3 0 35.9-4.6 47.2-7.7s22.5-7.2 25.4-8.3a26.4 26.4 0 0 1 9.3-1.7 26 26 0 0 1 10.1 2l56.7 20.1a13.5 13.5 0 0 0 3.9 1 8 8 0 0 0 8-8 13 13 0 0 0-.5-2.7Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/><path d="M66.46 232a146.23 146.23 0 0 0 6.39 152.67c2.31 3.49 3.61 6.19 3.21 8s-11.93 61.87-11.93 61.87a8 8 0 0 0 2.71 7.68A8.17 8.17 0 0 0 72 464a7.3 7.3 0 0 0 2.91-.6l56.21-22a15.7 15.7 0 0 1 12 .2c18.94 7.38 39.88 12 60.83 12A159.2 159.2 0 0 0 284 432.11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'people': `<path d="M336 256c-20.56 0-40.44-9.18-56-25.84-15.13-16.25-24.37-37.92-26-61-1.74-24.62 5.77-47.26 21.14-63.76S312 80 336 80c23.83 0 45.38 9.06 60.7 25.52 15.47 16.62 23 39.22 21.26 63.63-1.67 23.11-10.9 44.77-26 61C376.44 246.82 356.57 256 336 256M467.83 432H204.18a27.71 27.71 0 0 1-22-10.67 30.22 30.22 0 0 1-5.26-25.79c8.42-33.81 29.28-61.85 60.32-81.08C264.79 297.4 299.86 288 336 288c36.85 0 71 9 98.71 26.05 31.11 19.13 52 47.33 60.38 81.55a30.27 30.27 0 0 1-5.32 25.78A27.68 27.68 0 0 1 467.83 432M147 260c-35.19 0-66.13-32.72-69-72.93-1.42-20.6 5-39.65 18-53.62 12.86-13.83 31-21.45 51-21.45s38 7.66 50.93 21.57c13.1 14.08 19.5 33.09 18 53.52-2.87 40.2-33.8 72.91-68.93 72.91M212.66 291.45c-17.59-8.6-40.42-12.9-65.65-12.9-29.46 0-58.07 7.68-80.57 21.62-25.51 15.83-42.67 38.88-49.6 66.71a27.39 27.39 0 0 0 4.79 23.36A25.32 25.32 0 0 0 41.72 400h111a8 8 0 0 0 7.87-6.57c.11-.63.25-1.26.41-1.88 8.48-34.06 28.35-62.84 57.71-83.82a8 8 0 0 0-.63-13.39c-1.57-.92-3.37-1.89-5.42-2.89"/>`,
  'peopleOutline': `<path d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.37-72 66-72s69 30.46 66 72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 335.36 401.18 304 336 304Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M200 185.94c-2.34 32.48-26.72 58.06-53 58.06s-50.7-25.57-53-58.06C91.61 152.15 115.34 128 147 128s55.39 24.77 53 57.94" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M206 306c-18.05-8.27-37.93-11.45-59-11.45-52 0-102.1 25.85-114.65 76.2-1.65 6.66 2.53 13.25 9.37 13.25H154" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'settingsOutline': `<path d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64.13 64.13 0 0 0-57.4-57.4M416.39 256a154 154 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.5 164.5 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22 155 155 0 0 1-21.46-12.57 16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.5 164.5 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22 155 155 0 0 1 21.46 12.57 16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'settings': `<circle cx="256" cy="256" r="48"/><path d="m470.39 300-.47-.38-31.56-24.75a16.11 16.11 0 0 1-6.1-13.33v-11.56a16 16 0 0 1 6.11-13.22L469.92 212l.47-.38a26.68 26.68 0 0 0 5.9-34.06l-42.71-73.9a1.6 1.6 0 0 1-.13-.22A26.86 26.86 0 0 0 401 92.14l-.35.13-37.1 14.93a15.94 15.94 0 0 1-14.47-1.29q-4.92-3.1-10-5.86a15.94 15.94 0 0 1-8.19-11.82l-5.59-39.59-.12-.72A27.22 27.22 0 0 0 298.76 26h-85.52a26.92 26.92 0 0 0-26.45 22.39l-.09.56-5.57 39.67a16 16 0 0 1-8.13 11.82 175 175 0 0 0-10 5.82 15.92 15.92 0 0 1-14.43 1.27l-37.13-15-.35-.14a26.87 26.87 0 0 0-32.48 11.34l-.13.22-42.77 73.95a26.71 26.71 0 0 0 5.9 34.1l.47.38 31.56 24.75a16.11 16.11 0 0 1 6.1 13.33v11.56a16 16 0 0 1-6.11 13.22L42.08 300l-.47.38a26.68 26.68 0 0 0-5.9 34.06l42.71 73.9a1.6 1.6 0 0 1 .13.22 26.86 26.86 0 0 0 32.45 11.3l.35-.13 37.07-14.93a15.94 15.94 0 0 1 14.47 1.29q4.92 3.11 10 5.86a15.94 15.94 0 0 1 8.19 11.82l5.56 39.59.12.72A27.22 27.22 0 0 0 213.24 486h85.52a26.92 26.92 0 0 0 26.45-22.39l.09-.56 5.57-39.67a16 16 0 0 1 8.18-11.82c3.42-1.84 6.76-3.79 10-5.82a15.92 15.92 0 0 1 14.43-1.27l37.13 14.95.35.14a26.85 26.85 0 0 0 32.48-11.34 3 3 0 0 1 .13-.22l42.71-73.89a26.7 26.7 0 0 0-5.89-34.11m-134.48-40.24a80 80 0 1 1-83.66-83.67 80.21 80.21 0 0 1 83.66 83.67"/>`,
  'searchOutline': `<path d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M338.29 338.29 448 448" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'ellipsisVertical': `<circle cx="256" cy="256" r="48"/><circle cx="256" cy="416" r="48"/><circle cx="256" cy="96" r="48"/>`,
  'add': `<path d="M256 112v288M400 256H112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'arrowBack': `<path d="M244 400 100 256l144-144M120 256h292" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48px"/>`,
  'send': `<path d="m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/>`,
  'attachOutline': `<path d="M216.08 192v143.85a40.08 40.08 0 0 0 80.15 0l.13-188.55a67.94 67.94 0 1 0-135.87 0v189.82a95.51 95.51 0 1 0 191 0V159.74" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'documentTextOutline': `<path d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32px"/><path d="M256 56v120a32 32 0 0 0 32 32h120M176 288h160M176 368h160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'imageOutline': `<rect width="416" height="352" x="48" y="80" rx="48" ry="48" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32px"/><circle cx="336" cy="176" r="32" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="m304 335.79-90.66-90.49a32 32 0 0 0-43.87-1.3L48 352M224 432l123.34-123.34a32 32 0 0 1 43.11-2L464 368" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'cameraOutline': `<path d="m350.54 148.68-26.62-42.06C318.31 100.08 310.62 96 302 96h-92c-8.62 0-16.31 4.08-21.92 10.62l-26.62 42.06C155.85 155.23 148.62 160 140 160H80a32 32 0 0 0-32 32v192a32 32 0 0 0 32 32h352a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32h-59c-8.65 0-16.85-4.77-22.46-11.32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><circle cx="256" cy="272" r="80" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M124 158v-22h-24v22" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'headsetOutline': `<path d="M83 384c-13-33-35-93.37-35-128C48 141.12 149.33 48 256 48s208 93.12 208 208c0 34.63-23 97-35 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="m108.39 270.13-13.69 8c-30.23 17.7-31.7 72.41-3.38 122.2s75.87 75.81 106.1 58.12l13.69-8a16.16 16.16 0 0 0 5.78-21.87L130 276a15.74 15.74 0 0 0-21.61-5.87ZM403.61 270.13l13.69 8c30.23 17.69 31.74 72.4 3.38 122.19s-75.87 75.81-106.1 58.12l-13.69-8a16.16 16.16 0 0 1-5.78-21.87L382 276a15.74 15.74 0 0 1 21.61-5.87Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/>`,
  'folderOutline': `<path d="M440 432H72a40 40 0 0 1-40-40V120a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H440a40 40 0 0 1 40 40v240a40 40 0 0 1-40 40M32 192h448" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'wifiOutline': `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M318.586 363.5 256 424l-62.586-60.5S212 336 256 336s62.586 27.5 62.586 27.5M407.31 278 372 312s-41-46-116-46-116 46-116 46l-35.31-34S142.5 214 256 214s151.31 64 151.31 64"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m496 192-36.69 35.5S386.5 141 256 141 52.69 227.5 52.69 227.5L16 192S88 88 256 88s240 104 240 104"/>`,
  'checkmarkDone': `<path d="M464 128 240 384l-96-96M144 384l-96-96M368 128 232 284" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'checkmark': `<path d="M416 128 192 384l-96-96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'checkmarkCircle': `<path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48m108.25 138.29-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32 122.59-145.91a16 16 0 0 1 24.5 20.58"/>`,
  'chevronForward': `<path d="m184 112 144 144-144 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48px"/>`,
  'personOutline': `<path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/>`,
  'notificationsOutline': `<path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57M320 384v16a64 64 0 0 1-128 0v-16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'informationCircleOutline': `<path d="M248 64C146.39 64 64 146.39 64 248s82.39 184 184 184 184-82.39 184-184S349.61 64 248 64Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M220 220h32v116" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M208 340h88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/><path fill="currentColor" d="M248 130a26 26 0 1 0 26 26 26 26 0 0 0-26-26"/>`,
  'createOutline': `<path d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90 218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/>`,
  'closeOutline': `<path d="M368 368 144 144M368 144 144 368" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'personAddOutline': `<path d="M376 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M288 304c-87 0-175.3 48-191.64 138.6-2 10.92 4.21 21.4 15.65 21.4H464c11.44 0 17.62-10.48 15.65-21.4C463.3 352 375 304 288 304Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M88 176v112M144 232H32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'shieldCheckmarkOutline': `<path d="M336 176 225.2 304 176 255.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'moonOutline': `<path d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'sunnyOutline': `<path d="M256 48v48M256 416v48M403.08 108.92l-33.94 33.94M142.86 369.14l-33.94 33.94M464 256h-48M96 256H48M403.08 403.08l-33.94-33.94M142.86 142.86l-33.94-33.94" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/><circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'arrowForward': `<path d="m268 112 144 144-144 144M392 256H100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48px"/>`,
  'cloudOfflineOutline': `<path d="M93.72 183.25C49.49 198.05 16 233.1 16 288c0 66 54 112 120 112h184.37M467.82 377.74C485.24 363.3 496 341.61 496 312c0-59.82-53-85.76-96-88-8.89-89.54-71-144-144-144-26.16 0-48.79 6.93-67.6 18.14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M448 448 64 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/>`,
  'radioOutline': `<circle cx="256" cy="256.02" r="32"/><path d="M184.25 192.25a96 96 0 0 0 0 127.52M327.77 319.77a96 96 0 0 0 0-127.52M133.28 141.28a168 168 0 0 0 0 229.44M378.72 370.72a168 168 0 0 0 0-229.44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M435 416a240.34 240.34 0 0 0 0-320M77 96a240.34 240.34 0 0 0 0 320" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'checkmarkCircleOutline': `<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32px"/><path d="M352 176 217.6 336 160 272" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`,
  'trashOutline': `<path d="m112 112 20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/><path d="M80 112h352" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32px"/><path d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40M256 176v224M184 176l8 224M328 176l-8 224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32px"/>`
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
// Short alert beep for an incoming message (Notifications setting).
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch { /* audio unavailable on this device */ }
}

const received = (frame) => {
  const newMessage = { id: frame.id, mine: false, text: frame.text, time: prettyTime(frame.sentAt), sentAt: frame.sentAt, status: 'received' };
  const visible = state.page === 'conversation' && state.active === `lan:${frame.fromId}`;
  const wasAdded = history.add(frame.fromId, frame.fromName, newMessage, { unread: !visible });
  if (wasAdded) {
    render();
    if (!visible && appSettings.notifications) {
      toast(`New LAN message from ${frame.fromName}`);
      if (appSettings.sound) beep();
      if (appSettings.vibrate && navigator.vibrate) navigator.vibrate(100);
    }
  }
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

// ---- Settings sub-pages: every row opens real logic, not a dead end. ----
function subPage() {
  const back = (title) => header(title, true, false);
  switch (state.page) {
    case 'lan': {
      const p = profile || {};
      return `${back('Wi-Fi LAN')}<main class="scroll settings-scroll"><div class="settings-card"><div class="setting-row">${icon('wifiOutline')}<span><strong>Status</strong><small>${esc(lanStatus)}</small></span></div><div class="setting-row">${icon('peopleOutline')}<span><strong>Devices nearby</strong><small>${onlinePeers.size} found on this Wi-Fi network</small></span></div><div class="setting-row">${icon('personOutline')}<span><strong>Your device</strong><small>${esc(p.displayName || '')} · ${esc(p.peerId || '')}</small></span></div></div><button class="primary-btn" data-action="scan" style="margin:18px 16px 0;width:calc(100% - 32px)">Rescan nearby devices</button>${native ? '' : '<p class="info-text">Chrome preview: real LAN discovery needs the installed Android/iOS app on the same Wi-Fi network.</p>'}</main>${nav()}`;
    }
    case 'direct':
      return `${back('Wi-Fi Direct')}<main class="scroll settings-scroll"><div class="settings-card"><div class="setting-row">${icon('radioOutline')}<span><strong>Emergency mode</strong><small>Not available yet</small></span><span class="coming">Later</span></div></div><p class="info-text">Wi-Fi Direct will let two phones chat without a Wi-Fi router, for emergencies when there is no network. It is planned for a later version — nothing is faked here, so this page stays honest until it is built.</p></main>${nav()}`;
    case 'appearance': {
      const row = (value, label) => `<button class="setting-row" data-action="set-theme" data-theme="${value}">${icon(value === 'dark' ? 'moonOutline' : 'sunnyOutline')}<span><strong>${label}</strong></span><span class="radio ${state.theme === value ? 'active' : ''}"></span></button>`;
      return `${back('Appearance')}<main class="scroll settings-scroll"><div class="settings-card">${row('dark', 'Dark')}${row('light', 'Light')}</div><p class="info-text">Your choice is saved on this device and applies immediately.</p></main>${nav()}`;
    }
    case 'notifications': {
      const row = (key, label, hint) => `<button class="setting-row" data-action="toggle-notif" data-key="${key}">${icon('notificationsOutline')}<span><strong>${label}</strong><small>${hint}</small></span><span class="toggle ${appSettings[key] ? 'on' : ''}" aria-label="${label} ${appSettings[key] ? 'on' : 'off'}"></span></button>`;
      return `${back('Notifications')}<main class="scroll settings-scroll"><div class="settings-card">${row('notifications', 'New message alerts', 'Show an alert when a LAN message arrives')}${row('sound', 'Sound', 'Play a short beep with the alert')}${row('vibrate', 'Vibrate', 'Vibrate the phone with the alert')}</div><p class="info-text">Alerts are in-app only. There is no server and no push notification.</p></main>${nav()}`;
    }
    case 'files':
      return `${back('Received files')}<main class="scroll settings-scroll"><div class="empty-state">${icon('folderOutline', 'empty-icon')}<h2>No files received yet</h2><p>File transfer is not available in v0.2 yet. When it arrives, files people send you over LAN will appear here.</p></div></main>${nav()}`;
    case 'privacy': {
      const p = profile || {};
      return `${back('Privacy & security')}<main class="scroll settings-scroll"><div class="settings-card"><div class="setting-row">${icon('personOutline')}<span><strong>Your device ID</strong><small>${esc(p.peerId || '')}</small></span></div><div class="setting-row">${icon('shieldCheckmarkOutline')}<span><strong>Encryption</strong><small>Messages are not end-to-end encrypted yet</small></span></div></div><p class="info-text">WIWIchat has no account and no server: your name and messages stay on this phone and on the local Wi-Fi network. Only chat on a Wi-Fi network you trust.</p><button class="danger-btn" data-action="clear-history">${state.confirmClear ? 'Tap again to delete all conversations' : 'Clear all conversations'}</button></main>${nav()}`;
    }
    case 'about':
      return `${back('About WIWIchat')}<main class="scroll settings-scroll"><div class="settings-card"><div class="setting-row">${icon('informationCircleOutline')}<span><strong>WIWIchat</strong><small>Version 0.2.0 · Local network prototype</small></span></div><div class="setting-row">${icon('wifiOutline')}<span><strong>Works now</strong><small>Wi-Fi LAN discovery, 1-to-1 chat, onboarding, empty states</small></span></div><div class="setting-row">${icon('radioOutline')}<span><strong>Planned</strong><small>Wi-Fi Direct, file transfer, groups, encryption</small></span></div></div><p class="info-text">Chat with people nearby, even without internet. No account, no server, no phone number — just the same Wi-Fi network.</p></main>${nav()}`;
    default:
      return '';
  }
}

function settingsPage() {
  const p = profile || draft;
  return `${header('Settings', false, false)}<main class="scroll settings-scroll"><div class="profile-card">${avatar({ name: p.displayName || 'W', photo: p.photo, color: '#0b78ea' }, 'profile-avatar')}<div><strong>${esc(p.displayName || T.myDevice)}</strong><small>${esc(p.peerId || '')}</small></div><button class="inline-button" data-action="edit-profile">${T.editProfile}</button></div>${state.editingProfile ? `<form id="profile-form" class="profile-form"><label>${T.displayName}<input name="displayName" maxlength="32" value="${esc(p.displayName)}" required autocomplete="off"></label><label>${T.profilePhoto} <span class="coming">${T.profilePhotoOptional}</span><span class="photo-row">${p.photo ? `<img class="photo-preview" src="${esc(p.photo)}" alt="">` : ''}<span><button type="button" class="inline-button" data-action="choose-photo">${T.choosePhoto}</button>${p.photo ? ` <button type="button" class="inline-button" data-action="remove-photo">${T.removePhoto}</button>` : ''}</span></span><input id="photo-input" type="file" accept="image/*" hidden></label><label>${T.deviceName}<input name="deviceName" maxlength="32" value="${esc(p.deviceName)}" autocomplete="off"></label><span class="profile-form-actions"><button class="primary-btn" type="submit">${T.save}</button><button type="button" class="inline-button" data-action="cancel-edit-profile">${T.cancel}</button></span></form>` : ''}<h3 class="settings-label">CONNECTION</h3><div class="settings-card"><button class="setting-row" data-action="lan">${icon('wifiOutline')}<span><strong>${T.wifiLan}</strong><small>${esc(lanStatus)} · ${onlinePeers.size} nearby</small></span>${icon('chevronForward')}</button><button class="setting-row" data-action="direct">${icon('radioOutline')}<span><strong>${T.wifiDirect}</strong><small>${T.wifiDirectLater}</small></span><span class="coming">Later</span></button></div><h3 class="settings-label">PREFERENCES</h3><div class="settings-card">${[['moonOutline', 'Appearance', 'appearance'], ['notificationsOutline', 'Notifications', 'notifications'], ['folderOutline', 'Received files', 'files'], ['shieldCheckmarkOutline', 'Privacy & security', 'privacy'], ['informationCircleOutline', 'About WIWIchat', 'about']].map(([ic, label, action]) => `<button class="setting-row compact" data-action="${action}">${icon(ic)}<span><strong>${label}</strong></span>${icon('chevronForward')}</button>`).join('')}</div><p class="version">WIWIchat v0.2 · Local network prototype · Messages are not encrypted yet</p></main>${nav()}`;
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
  $('#app').innerHTML = `<div class="shell">${state.page === 'conversation' ? conversation() : ['lan', 'direct', 'appearance', 'notifications', 'files', 'privacy', 'about'].includes(state.page) ? subPage() : state.tab === 'contacts' ? contactsPage() : state.tab === 'settings' ? settingsPage() : chatsPage()}${modal()}</div>`;
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
  if (tab) { state.tab = tab.dataset.tab; state.page = 'home'; state.search = ''; state.confirmClear = false; render(); return; }
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
    case 'lan': case 'direct': case 'appearance': case 'notifications': case 'files': case 'privacy': case 'about':
      state.page = action.dataset.action; state.confirmClear = false; render(); break;
    case 'set-theme': {
      state.theme = action.dataset.theme === 'light' ? 'light' : 'dark';
      localStorage.setItem('wiwi-theme', state.theme);
      render();
      break;
    }
    case 'toggle-notif': {
      const key = action.dataset.key;
      if (key && key in appSettings) {
        appSettings = saveAppSettings({ ...appSettings, [key]: !appSettings[key] });
        render();
      }
      break;
    }
    case 'clear-history': {
      if (!state.confirmClear) { state.confirmClear = true; render(); break; }
      history.clearAll();
      state.confirmClear = false;
      state.page = 'home';
      state.tab = 'chats';
      render();
      toast('All conversations deleted');
      break;
    }
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
