require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'LiveTvNativePlayer'
  s.version          = '1.0.0'
  s.summary          = 'Live TV native player (AVPlayer) plugin'
  s.license          = 'MIT'
  s.homepage         = 'https://example.com/livetv'
  s.author           = 'Live TV'
  s.source           = { :git => '', :tag => s.version.to_s }
  s.source_files     = 'NativePlayerPlugin.swift'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.swift_version    = '5.1'
end
