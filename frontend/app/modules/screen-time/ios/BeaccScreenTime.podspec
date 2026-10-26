Pod::Spec.new do |s|
  s.name           = 'BeaccScreenTime'
  s.version        = '1.0.0'
  s.summary        = 'Screen Time authorization and usage for Beacc goals.'
  s.license        = 'UNLICENSED'
  s.author         = 'Beacc'
  s.homepage       = 'https://beacc.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FamilyControls', 'DeviceActivity'

  s.source_files = "**/*.swift"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
