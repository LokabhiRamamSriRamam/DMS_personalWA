import { X, Smartphone, Globe, Settings } from 'lucide-react';

/**
 * MicPermissionHelp
 * Shows platform-specific instructions for enabling the microphone.
 *
 * Props:
 *   isOpen   — boolean
 *   onClose  — fn
 *   errorCode — string from useMicRecorder
 */
export default function MicPermissionHelp({ isOpen, onClose, errorCode }) {
  if (!isOpen) return null;

  const isIOS     = /ipad|iphone|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isSafari  = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const steps = getSteps(errorCode, isIOS, isAndroid, isSafari);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Settings size={15} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{headingFor(errorCode)}</p>
              <p className="text-xs text-slate-400">Follow the steps below</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#137fec]/10 text-[#137fec] text-xs font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Platform badge */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {isIOS || isAndroid
              ? <Smartphone size={12} />
              : <Globe size={12} />
            }
            <span>
              {isIOS ? 'Instructions for iOS Safari'
                : isAndroid ? 'Instructions for Android Chrome'
                : 'Instructions for desktop browsers'}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Got it — I'll enable the microphone
          </button>
        </div>

      </div>
    </div>
  );
}

function headingFor(errorCode) {
  switch (errorCode) {
    case 'permission-denied':   return 'Enable microphone access';
    case 'no-microphone':       return 'No microphone detected';
    case 'in-use':              return 'Microphone is busy';
    case 'browser-unsupported': return 'Browser not supported';
    case 'interrupted':         return 'Recording interrupted';
    default:                    return 'Microphone unavailable';
  }
}

function getSteps(errorCode, isIOS, isAndroid) {
  if (errorCode === 'no-microphone') {
    if (isIOS)     return ['Make sure your iPhone/iPad is not in Silent Mode.', 'Check that no headset or Bluetooth device has disconnected.', 'Restart Safari and try again.'];
    if (isAndroid) return ['Check that your phone\'s microphone is not blocked by a case.', 'Restart Chrome and try again.'];
    return ['Check that a microphone is connected to your device.', 'Refresh the page and try again.'];
  }

  if (errorCode === 'in-use') {
    if (isIOS)     return ['Close any other app that may be using the microphone (Voice Memos, Phone, etc.).', 'Return to Safari and try again.'];
    if (isAndroid) return ['Close any other app using the mic (voice recorder, call app, etc.).', 'Return to Chrome and try again.'];
    return ['Another application is using the microphone.', 'Close it, then try again.'];
  }

  if (errorCode === 'interrupted') {
    return [
      'The microphone was interrupted — likely due to an incoming call or notification.',
      'Dismiss any active calls or alerts.',
      'Tap the mic button again to start a new recording.',
    ];
  }

  if (errorCode === 'browser-unsupported') {
    if (isIOS)     return ['Audio recording requires iOS 14.3 or later.', 'Open Settings → General → Software Update to upgrade.', 'Make sure you\'re using Safari (Chrome on iOS does not support recording).'];
    if (isAndroid) return ['Open this page in Google Chrome (not Samsung Internet or another browser).', 'Make sure Chrome is up to date: Chrome menu → Help → Update Chrome.'];
    return ['Try opening this page in Google Chrome or Safari.', 'Make sure your browser is up to date.'];
  }

  // Default: permission-denied
  if (isIOS) {
    return [
      'Tap the "aA" icon in the Safari address bar.',
      'Tap "Website Settings".',
      'Set Microphone to "Allow".',
      'Reload the page and try again.',
    ];
  }
  if (isAndroid) {
    return [
      'Tap the lock icon in Chrome\'s address bar.',
      'Tap "Permissions".',
      'Set Microphone to "Allow".',
      'Reload the page and try again.',
    ];
  }
  return [
    'Click the lock/info icon in your browser\'s address bar.',
    'Find "Microphone" in the permissions list.',
    'Change it from "Block" to "Allow".',
    'Reload the page and try again.',
  ];
}
