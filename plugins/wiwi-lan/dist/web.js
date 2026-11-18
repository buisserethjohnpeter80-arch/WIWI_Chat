import { WebPlugin } from '@capacitor/core';
export class WIWILanWeb extends WebPlugin {
  async start() { throw new Error('Wi-Fi LAN requires the installed Android/iOS app; Chrome preview has no TCP/mDNS API.'); }
  async stop() { return {}; }
  async send() { throw new Error('LAN messages cannot be sent from a browser preview.'); }
}
