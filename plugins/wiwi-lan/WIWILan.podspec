Pod::Spec.new do |s|
  s.name = 'WIWILan'
  s.version = '0.2.0'
  s.summary = 'LAN Bonjour discovery and TCP messaging for WIWIchat'
  s.license = { :type => 'Proprietary' }
  s.homepage = 'https://github.com/buisserethjohnpeter80-arch/WIWI_Chat'
  s.author = 'WIWIchat'
  s.source = { :git => 'https://github.com/buisserethjohnpeter80-arch/WIWI_Chat.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.swift_version = '5.9'
  s.dependency 'Capacitor'
  s.framework = 'Network'
end
