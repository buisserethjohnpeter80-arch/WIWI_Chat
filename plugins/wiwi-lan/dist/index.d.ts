import type { PluginListenerHandle } from '@capacitor/core';
export interface WIWILanPlugin {
  start(options: {peerId: string; name: string}): Promise<{running: boolean}>;
  stop(): Promise<void>;
  send(options: {peerId: string; v: number; type: 'message'; id: string; fromId: string; fromName: string; text: string; sentAt: string}): Promise<{accepted: boolean}>;
  addListener(eventName: 'peerFound' | 'peerLost' | 'message' | 'status', listenerFunc: (event: any) => void): Promise<PluginListenerHandle>;
}
export declare const WIWILan: WIWILanPlugin;
