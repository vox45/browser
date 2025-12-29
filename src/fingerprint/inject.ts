import { Fingerprint } from '../core/types';

/**
 * Generates the injection script that spoofs browser fingerprints
 * This script runs in the browser context before any page scripts
 */
export function generateInjectScript(fingerprint: Fingerprint): string {
  return `
(function() {
  'use strict';

  const fp = ${JSON.stringify(fingerprint)};

  // ==================== Navigator ====================
  const navigatorProps = {
    userAgent: { value: fp.userAgent },
    platform: { value: fp.platform },
    language: { value: fp.language },
    languages: { value: Object.freeze([...fp.languages]) },
    hardwareConcurrency: { value: fp.hardwareConcurrency },
    deviceMemory: { value: fp.deviceMemory },
    maxTouchPoints: { value: fp.maxTouchPoints },
  };

  for (const [prop, descriptor] of Object.entries(navigatorProps)) {
    try {
      Object.defineProperty(Navigator.prototype, prop, {
        get: () => descriptor.value,
        configurable: true,
      });
    } catch (e) {}
  }

  // ==================== Screen ====================
  const screenProps = {
    width: fp.screen.width,
    height: fp.screen.height,
    availWidth: fp.screen.availWidth,
    availHeight: fp.screen.availHeight,
    colorDepth: fp.screen.colorDepth,
    pixelDepth: fp.screen.pixelDepth,
  };

  for (const [prop, value] of Object.entries(screenProps)) {
    try {
      Object.defineProperty(Screen.prototype, prop, {
        get: () => value,
        configurable: true,
      });
    } catch (e) {}
  }

  // Device pixel ratio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => fp.screen.devicePixelRatio,
    configurable: true,
  });

  // ==================== Timezone ====================
  const originalDateTimeFormat = Intl.DateTimeFormat;
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

  Intl.DateTimeFormat = function(...args) {
    const instance = new originalDateTimeFormat(...args);
    return instance;
  };
  Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const options = originalResolvedOptions.call(this);
    options.timeZone = fp.timezone;
    return options;
  };

  // Date.prototype.getTimezoneOffset
  const tzOffset = getTimezoneOffset(fp.timezone);
  Date.prototype.getTimezoneOffset = function() {
    return tzOffset;
  };

  function getTimezoneOffset(tz) {
    const offsets = {
      'America/New_York': 300,
      'America/Los_Angeles': 480,
      'America/Chicago': 360,
      'America/Denver': 420,
      'Europe/London': 0,
      'Europe/Paris': -60,
      'Europe/Berlin': -60,
      'Europe/Moscow': -180,
      'Asia/Tokyo': -540,
      'Asia/Shanghai': -480,
      'Asia/Singapore': -480,
      'Australia/Sydney': -660,
    };
    return offsets[tz] || 0;
  }

  // ==================== WebGL ====================
  const getParameterProxy = function(target) {
    return function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) {
        return fp.webgl.unmaskedVendor;
      }
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) {
        return fp.webgl.unmaskedRenderer;
      }
      return target.call(this, parameter);
    };
  };

  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = getParameterProxy(originalGetParameter);

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = getParameterProxy(originalGetParameter2);
  }

  // WebGL noise
  const addWebGLNoise = (pixels) => {
    if (!pixels || fp.webgl.noise === 0) return pixels;
    const noise = fp.webgl.noise;
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.floor((Math.random() - 0.5) * noise * 255)));
    }
    return pixels;
  };

  const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
  WebGLRenderingContext.prototype.readPixels = function(...args) {
    originalReadPixels.apply(this, args);
    if (args[6]) {
      addWebGLNoise(args[6]);
    }
  };

  // ==================== Canvas ====================
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Add noise to canvas
  function addCanvasNoise(canvas) {
    if (fp.canvas.noise === 0) return;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = originalGetImageData.call(ctx, 0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const noise = fp.canvas.noise;

      for (let i = 0; i < pixels.length; i += 4) {
        // Add subtle noise to RGB channels
        pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.floor((Math.random() - 0.5) * noise * 10)));
        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + Math.floor((Math.random() - 0.5) * noise * 10)));
        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + Math.floor((Math.random() - 0.5) * noise * 10)));
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {}
  }

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    addCanvasNoise(this);
    return originalToDataURL.apply(this, args);
  };

  HTMLCanvasElement.prototype.toBlob = function(...args) {
    addCanvasNoise(this);
    return originalToBlob.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = originalGetImageData.apply(this, args);
    if (fp.canvas.noise > 0) {
      const pixels = imageData.data;
      const noise = fp.canvas.noise;
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.floor((Math.random() - 0.5) * noise * 10)));
        pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + Math.floor((Math.random() - 0.5) * noise * 10)));
        pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + Math.floor((Math.random() - 0.5) * noise * 10)));
      }
    }
    return imageData;
  };

  // ==================== Audio ====================
  if (fp.audio.noise > 0) {
    const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function() {
      const analyser = originalCreateAnalyser.call(this);
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
      const originalGetByteFrequencyData = analyser.getByteFrequencyData.bind(analyser);

      analyser.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData(array);
        for (let i = 0; i < array.length; i++) {
          array[i] += (Math.random() - 0.5) * fp.audio.noise;
        }
      };

      analyser.getByteFrequencyData = function(array) {
        originalGetByteFrequencyData(array);
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.max(0, Math.min(255, array[i] + Math.floor((Math.random() - 0.5) * fp.audio.noise * 10)));
        }
      };

      return analyser;
    };

    // OfflineAudioContext
    if (typeof OfflineAudioContext !== 'undefined') {
      const originalStartRendering = OfflineAudioContext.prototype.startRendering;
      OfflineAudioContext.prototype.startRendering = function() {
        return originalStartRendering.call(this).then(buffer => {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
              data[i] += (Math.random() - 0.5) * fp.audio.noise * 0.0001;
            }
          }
          return buffer;
        });
      };
    }
  }

  // ==================== WebRTC ====================
  if (fp.webrtc.mode === 'disabled') {
    // Disable WebRTC entirely
    window.RTCPeerConnection = undefined;
    window.webkitRTCPeerConnection = undefined;
    window.mozRTCPeerConnection = undefined;
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('getUserMedia is not supported'));
    }
  } else if (fp.webrtc.mode === 'fake') {
    // Fake WebRTC - return fake IPs
    const originalRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const pc = new originalRTCPeerConnection(...args);
      const originalCreateOffer = pc.createOffer.bind(pc);
      const originalCreateAnswer = pc.createAnswer.bind(pc);
      const originalSetLocalDescription = pc.setLocalDescription.bind(pc);

      pc.createOffer = function(options) {
        return originalCreateOffer(options).then(offer => {
          if (fp.webrtc.publicIp) {
            offer.sdp = offer.sdp.replace(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/g, fp.webrtc.publicIp);
          }
          return offer;
        });
      };

      return pc;
    };
    window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
  }

  // ==================== ClientRects ====================
  const originalGetClientRects = Element.prototype.getClientRects;
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  Element.prototype.getClientRects = function() {
    const rects = originalGetClientRects.call(this);
    const noise = fp.clientRectsNoise;

    return new Proxy(rects, {
      get(target, prop) {
        if (prop === 'length') return target.length;
        if (typeof prop === 'string' && !isNaN(parseInt(prop))) {
          const rect = target[parseInt(prop)];
          if (rect) {
            return new DOMRect(
              rect.x + (Math.random() - 0.5) * noise,
              rect.y + (Math.random() - 0.5) * noise,
              rect.width + (Math.random() - 0.5) * noise,
              rect.height + (Math.random() - 0.5) * noise
            );
          }
        }
        return target[prop];
      }
    });
  };

  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);
    const noise = fp.clientRectsNoise;

    return new DOMRect(
      rect.x + (Math.random() - 0.5) * noise,
      rect.y + (Math.random() - 0.5) * noise,
      rect.width + (Math.random() - 0.5) * noise,
      rect.height + (Math.random() - 0.5) * noise
    );
  };

  // ==================== Media Devices ====================
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = async function() {
      const devices = [];

      // Video inputs
      for (let i = 0; i < fp.mediaDevices.videoinput; i++) {
        devices.push({
          deviceId: crypto.randomUUID(),
          kind: 'videoinput',
          label: i === 0 ? 'Integrated Camera' : 'USB Camera ' + i,
          groupId: crypto.randomUUID(),
        });
      }

      // Audio inputs
      for (let i = 0; i < fp.mediaDevices.audioinput; i++) {
        devices.push({
          deviceId: crypto.randomUUID(),
          kind: 'audioinput',
          label: i === 0 ? 'Default - Microphone' : 'Microphone ' + i,
          groupId: crypto.randomUUID(),
        });
      }

      // Audio outputs
      for (let i = 0; i < fp.mediaDevices.audiooutput; i++) {
        devices.push({
          deviceId: crypto.randomUUID(),
          kind: 'audiooutput',
          label: i === 0 ? 'Default - Speakers' : 'Speakers ' + i,
          groupId: crypto.randomUUID(),
        });
      }

      return devices;
    };
  }

  // ==================== Plugins ====================
  Object.defineProperty(Navigator.prototype, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];

      const pluginArray = Object.create(PluginArray.prototype);
      plugins.forEach((p, i) => {
        const plugin = Object.create(Plugin.prototype);
        Object.defineProperties(plugin, {
          name: { value: p.name },
          filename: { value: p.filename },
          description: { value: p.description },
          length: { value: 1 },
        });
        pluginArray[i] = plugin;
      });

      Object.defineProperty(pluginArray, 'length', { value: plugins.length });
      return pluginArray;
    },
    configurable: true,
  });

  // ==================== Permissions ====================
  const originalQuery = Permissions.prototype.query;
  Permissions.prototype.query = function(desc) {
    if (desc.name === 'notifications') {
      return Promise.resolve({ state: 'prompt', onchange: null });
    }
    return originalQuery.call(this, desc);
  };

  // ==================== Battery ====================
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  // ==================== Connection ====================
  if (navigator.connection) {
    Object.defineProperties(navigator.connection, {
      effectiveType: { value: '4g', configurable: true },
      rtt: { value: 50, configurable: true },
      downlink: { value: 10, configurable: true },
      saveData: { value: false, configurable: true },
    });
  }

  console.log('[Antidetect] Fingerprint injected successfully');
})();
`;
}
