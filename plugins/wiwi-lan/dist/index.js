import { registerPlugin } from '@capacitor/core';
export const WIWILan = registerPlugin('WIWILan', {
  web: () => import('./web.js').then(({ WIWILanWeb }) => new WIWILanWeb()),
});
