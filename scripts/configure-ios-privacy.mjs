import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const file = 'ios/App/App/Info.plist';
if (!existsSync(file)) {
  console.error(`Missing ${file}. Run npx cap add ios first on a Mac.`);
  process.exitCode = 1;
} else {
  let xml = readFileSync(file, 'utf8');
  const original = xml;
  if (!xml.includes('<key>NSLocalNetworkUsageDescription</key>')) {
    xml = xml.replace(/<\/dict>\s*<\/plist>/, `\t<key>NSLocalNetworkUsageDescription</key>\n\t<string>WIWIchat finds nearby phones and exchanges messages on your local Wi-Fi network.</string>\n</dict>\n</plist>`);
  }
  if (!xml.includes('<key>NSBonjourServices</key>')) {
    xml = xml.replace(/<\/dict>\s*<\/plist>/, `\t<key>NSBonjourServices</key>\n\t<array><string>_wiwichat._tcp</string></array>\n</dict>\n</plist>`);
  } else if (!xml.includes('<string>_wiwichat._tcp</string>')) {
    console.error('NSBonjourServices already exists. Add _wiwichat._tcp to the existing list manually.');
    process.exitCode = 1;
  }
  if (!xml.includes('<key>NSBonjourServices</key>') || !xml.includes('<key>NSLocalNetworkUsageDescription</key>')) {
    console.error('Could not update Info.plist. Check XML structure.');
    process.exitCode = 1;
  } else {
    if (xml !== original) writeFileSync(file, xml);
    console.log('iOS Bonjour privacy declarations checked.');
  }
}
