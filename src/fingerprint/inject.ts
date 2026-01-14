import { Fingerprint } from '../core/types';

/**
 * Generates the injection script that spoofs browser fingerprints
 * This script runs in the browser context before any page scripts
 */
export function generateInjectScript(fingerprint: Fingerprint): string {
  return `
(function() {
  'use strict';

  // Skip injection on chrome:// pages - they need original APIs
  if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
    return;
  }

  const fp = ${JSON.stringify(fingerprint)};

  // Seeded random for consistent noise
  let noiseSeed = 0;
  for (let i = 0; i < fp.seed.length; i++) {
    noiseSeed = ((noiseSeed << 5) - noiseSeed) + fp.seed.charCodeAt(i);
    noiseSeed = noiseSeed & noiseSeed;
  }
  noiseSeed = Math.abs(noiseSeed);

  function seededRandom() {
    noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
    return noiseSeed / 0x7fffffff;
  }

  // Helper to create non-enumerable properties
  function defineProperty(obj, prop, value, enumerable = true) {
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        configurable: true,
        enumerable,
      });
    } catch (e) {}
  }

  // ==================== Remove Automation Flags ====================
  // Remove webdriver flag
  try {
    delete Navigator.prototype.webdriver;
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => false,
      configurable: true,
    });
  } catch (e) {}

  // Remove automation-related properties from window
  const automationProps = [
    '__webdriver_evaluate',
    '__selenium_evaluate',
    '__webdriver_script_function',
    '__webdriver_script_func',
    '__webdriver_script_fn',
    '__fxdriver_evaluate',
    '__driver_unwrapped',
    '__webdriver_unwrapped',
    '__driver_evaluate',
    '__selenium_unwrapped',
    '__fxdriver_unwrapped',
    '_Selenium_IDE_Recorder',
    '_selenium',
    'calledSelenium',
    '$cdc_asdjflasutopfhvcZLmcfl_',
    '$chrome_asyncScriptInfo',
    '__$webdriverAsyncExecutor',
    'webdriver',
    '__nightmare',
    '__phantomas',
    '_phantom',
    'phantom',
    'callPhantom',
    '__selenium_evaluate',
    '__selenium_unwrapped',
  ];

  automationProps.forEach(prop => {
    try {
      delete window[prop];
    } catch (e) {}
  });

  // Spoof chrome object to look real
  if (!window.chrome) {
    window.chrome = {};
  }

  window.chrome.app = {
    isInstalled: false,
    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
  };

  window.chrome.runtime = {
    PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
    PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
    PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
    RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
    OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
    OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
    connect: function() {},
    sendMessage: function() {},
  };

  window.chrome.csi = function() {
    return {
      startE: Date.now(),
      onloadT: Date.now() + Math.floor(seededRandom() * 500),
      pageT: Math.floor(seededRandom() * 1000) + 500,
      tran: 15,
    };
  };

  window.chrome.loadTimes = function() {
    return {
      commitLoadTime: Date.now() / 1000,
      connectionInfo: 'h2',
      finishDocumentLoadTime: Date.now() / 1000 + seededRandom() * 0.5,
      finishLoadTime: Date.now() / 1000 + seededRandom() * 0.5,
      firstPaintAfterLoadTime: 0,
      firstPaintTime: Date.now() / 1000 + seededRandom() * 0.1,
      navigationType: 'Other',
      npnNegotiatedProtocol: 'h2',
      requestTime: Date.now() / 1000 - seededRandom() * 0.1,
      startLoadTime: Date.now() / 1000,
      wasAlternateProtocolAvailable: false,
      wasFetchedViaSpdy: true,
      wasNpnNegotiated: true,
    };
  };

  // ==================== Navigator Basic ====================
  const navigatorProps = {
    userAgent: fp.userAgent,
    platform: fp.platform,
    language: fp.language,
    languages: Object.freeze([...fp.languages]),
    hardwareConcurrency: fp.hardwareConcurrency,
    deviceMemory: fp.deviceMemory,
    maxTouchPoints: fp.maxTouchPoints,
    vendor: fp.vendor,
    vendorSub: fp.vendorSub,
    product: fp.product,
    productSub: fp.productSub,
    appVersion: fp.appVersion,
    appName: fp.appName,
    appCodeName: fp.appCodeName,
    cookieEnabled: fp.cookieEnabled,
    pdfViewerEnabled: fp.pdfViewerEnabled,
  };

  // Only set oscpu and buildID if they have values (Firefox-specific)
  if (fp.oscpu) navigatorProps.oscpu = fp.oscpu;
  if (fp.buildID) navigatorProps.buildID = fp.buildID;

  for (const [prop, value] of Object.entries(navigatorProps)) {
    try {
      Object.defineProperty(Navigator.prototype, prop, {
        get: () => value,
        configurable: true,
        enumerable: true,
      });
    } catch (e) {}
  }

  // Do Not Track
  Object.defineProperty(Navigator.prototype, 'doNotTrack', {
    get: () => fp.doNotTrack,
    configurable: true,
  });

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

  // Screen orientation
  if (window.screen.orientation) {
    Object.defineProperty(window.screen.orientation, 'type', {
      get: () => fp.screen.orientation,
      configurable: true,
    });
  }

  // Screen isExtended (multi-monitor)
  Object.defineProperty(Screen.prototype, 'isExtended', {
    get: () => fp.screen.isExtended,
    configurable: true,
  });

  // Device pixel ratio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => fp.screen.devicePixelRatio,
    configurable: true,
  });

  // Inner/outer dimensions matching screen
  Object.defineProperty(window, 'outerWidth', {
    get: () => fp.screen.width,
    configurable: true,
  });
  Object.defineProperty(window, 'outerHeight', {
    get: () => fp.screen.height,
    configurable: true,
  });

  // ==================== Timezone ====================
  const timezoneOffsets = {
    'America/New_York': 300, 'America/Los_Angeles': 480, 'America/Chicago': 360,
    'America/Denver': 420, 'America/Phoenix': 420, 'America/Toronto': 300,
    'America/Vancouver': 480, 'America/Mexico_City': 360, 'America/Sao_Paulo': 180,
    'Europe/London': 0, 'Europe/Paris': -60, 'Europe/Berlin': -60,
    'Europe/Rome': -60, 'Europe/Madrid': -60, 'Europe/Amsterdam': -60,
    'Europe/Moscow': -180, 'Europe/Kiev': -120, 'Europe/Warsaw': -60,
    'Europe/Prague': -60, 'Europe/Istanbul': -180,
    'Asia/Tokyo': -540, 'Asia/Shanghai': -480, 'Asia/Hong_Kong': -480,
    'Asia/Singapore': -480, 'Asia/Seoul': -540, 'Asia/Bangkok': -420,
    'Asia/Dubai': -240, 'Asia/Kolkata': -330,
    'Australia/Sydney': -660, 'Australia/Melbourne': -660, 'Pacific/Auckland': -720,
  };

  const tzOffset = timezoneOffsets[fp.timezone] || 0;

  // Intl.DateTimeFormat
  const originalDateTimeFormat = Intl.DateTimeFormat;
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

  Intl.DateTimeFormat = function(...args) {
    if (args.length === 0 || (args.length === 1 && !args[0])) {
      args = [fp.language, { timeZone: fp.timezone }];
    } else if (args.length >= 2 && args[1] && !args[1].timeZone) {
      args[1] = { ...args[1], timeZone: fp.timezone };
    }
    return new originalDateTimeFormat(...args);
  };
  Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;
  Object.defineProperty(Intl.DateTimeFormat, 'length', { value: 0 });
  Object.defineProperty(Intl.DateTimeFormat, 'name', { value: 'DateTimeFormat' });

  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const options = originalResolvedOptions.call(this);
    options.timeZone = fp.timezone;
    options.locale = fp.language;
    return options;
  };

  // Date.prototype.getTimezoneOffset
  Date.prototype.getTimezoneOffset = function() {
    return tzOffset + fp.timezoneOffsetNoise;
  };

  // Date formatting to use correct timezone
  const originalToString = Date.prototype.toString;
  const originalToTimeString = Date.prototype.toTimeString;
  const originalToDateString = Date.prototype.toDateString;
  const originalToLocaleString = Date.prototype.toLocaleString;

  Date.prototype.toLocaleString = function(...args) {
    if (args.length === 0) {
      args = [fp.language, { timeZone: fp.timezone }];
    }
    return originalToLocaleString.apply(this, args);
  };

  // ==================== WebGL Extended ====================
  const getParameterProxy = function(target) {
    return function(parameter) {
      switch (parameter) {
        case 37445: return fp.webgl.unmaskedVendor; // UNMASKED_VENDOR_WEBGL
        case 37446: return fp.webgl.unmaskedRenderer; // UNMASKED_RENDERER_WEBGL
        case 7936: return fp.webgl.vendor; // VENDOR
        case 7937: return fp.webgl.renderer; // RENDERER
        case 7938: return fp.webgl.version; // VERSION
        case 35724: return fp.webgl.shadingLanguageVersion; // SHADING_LANGUAGE_VERSION
        case 3379: return fp.webgl.maxTextureSize; // MAX_TEXTURE_SIZE
        case 34076: return fp.webgl.maxCubeMapTextureSize; // MAX_CUBE_MAP_TEXTURE_SIZE
        case 34024: return fp.webgl.maxRenderbufferSize; // MAX_RENDERBUFFER_SIZE
        case 34930: return fp.webgl.maxTextureImageUnits; // MAX_TEXTURE_IMAGE_UNITS
        case 35661: return fp.webgl.maxCombinedTextureImageUnits; // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        case 35660: return fp.webgl.maxVertexTextureImageUnits; // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        case 34921: return fp.webgl.maxVertexAttribs; // MAX_VERTEX_ATTRIBS
        case 36347: return fp.webgl.maxVertexUniformVectors; // MAX_VERTEX_UNIFORM_VECTORS
        case 36348: return fp.webgl.maxFragmentUniformVectors; // MAX_FRAGMENT_UNIFORM_VECTORS
        case 36349: return fp.webgl.maxVaryingVectors; // MAX_VARYING_VECTORS
        case 3386: return new Float32Array(fp.webgl.maxViewportDims); // MAX_VIEWPORT_DIMS
        case 3408: return new Float32Array(fp.webgl.aliasedPointSizeRange); // ALIASED_POINT_SIZE_RANGE
        case 3407: return new Float32Array(fp.webgl.aliasedLineWidthRange); // ALIASED_LINE_WIDTH_RANGE
        // Additional WebGL2 parameters
        case 35371: return 1024; // MAX_3D_TEXTURE_SIZE
        case 35657: return 16; // MAX_DRAW_BUFFERS
        case 35658: return 16; // MAX_FRAGMENT_UNIFORM_COMPONENTS
        case 35659: return 16; // MAX_VERTEX_UNIFORM_COMPONENTS
        case 36203: return 4; // MAX_COLOR_ATTACHMENTS
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

  // WebGL getSupportedExtensions
  const originalGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
  WebGLRenderingContext.prototype.getSupportedExtensions = function() {
    return fp.webgl.supportedExtensions;
  };

  if (typeof WebGL2RenderingContext !== 'undefined') {
    WebGL2RenderingContext.prototype.getSupportedExtensions = function() {
      return fp.webgl.supportedExtensions;
    };
  }

  // WebGL getShaderPrecisionFormat - spoof precision
  const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
  WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
    const result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
    if (result) {
      // Add subtle noise to precision values based on seed
      const noise = Math.floor(seededRandom() * 2);
      return {
        rangeMin: result.rangeMin,
        rangeMax: result.rangeMax,
        precision: result.precision - noise,
      };
    }
    return result;
  };

  // WebGL noise with seeded random for consistency
  const addWebGLNoise = (pixels) => {
    if (!pixels || fp.webgl.noise === 0) return pixels;
    const noise = fp.webgl.noise;
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.floor((seededRandom() - 0.5) * noise * 255)));
    }
    return pixels;
  };

  const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
  WebGLRenderingContext.prototype.readPixels = function(...args) {
    originalReadPixels.apply(this, args);
    if (args[6]) addWebGLNoise(args[6]);
  };

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const originalReadPixels2 = WebGL2RenderingContext.prototype.readPixels;
    WebGL2RenderingContext.prototype.readPixels = function(...args) {
      originalReadPixels2.apply(this, args);
      if (args[6]) addWebGLNoise(args[6]);
    };
  }

  // ==================== Canvas ====================
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Seeded canvas noise for consistency
  function addCanvasNoise(imageData) {
    if (fp.canvas.noise === 0) return;
    const pixels = imageData.data;
    const noise = fp.canvas.noise;
    // Use hash seed to create consistent but unique noise pattern
    let localSeed = 0;
    for (let i = 0; i < fp.canvas.hashSeed.length; i++) {
      localSeed = ((localSeed << 5) - localSeed) + fp.canvas.hashSeed.charCodeAt(i);
    }

    for (let i = 0; i < pixels.length; i += 4) {
      localSeed = (localSeed * 1103515245 + 12345) & 0x7fffffff;
      const r = (localSeed / 0x7fffffff - 0.5) * noise * 10;
      localSeed = (localSeed * 1103515245 + 12345) & 0x7fffffff;
      const g = (localSeed / 0x7fffffff - 0.5) * noise * 10;
      localSeed = (localSeed * 1103515245 + 12345) & 0x7fffffff;
      const b = (localSeed / 0x7fffffff - 0.5) * noise * 10;

      pixels[i] = Math.max(0, Math.min(255, pixels[i] + Math.floor(r)));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + Math.floor(g)));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + Math.floor(b)));
    }
  }

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    try {
      const ctx = this.getContext('2d');
      if (ctx && fp.canvas.noise > 0) {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        addCanvasNoise(imageData);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (e) {}
    return originalToDataURL.apply(this, args);
  };

  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    try {
      const ctx = this.getContext('2d');
      if (ctx && fp.canvas.noise > 0) {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        addCanvasNoise(imageData);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (e) {}
    return originalToBlob.call(this, callback, ...args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = originalGetImageData.apply(this, args);
    addCanvasNoise(imageData);
    return imageData;
  };

  // ==================== OffscreenCanvas ====================
  if (typeof OffscreenCanvas !== 'undefined') {
    const originalOffscreenConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
    if (originalOffscreenConvertToBlob) {
      OffscreenCanvas.prototype.convertToBlob = function(...args) {
        try {
          const ctx = this.getContext('2d');
          if (ctx && fp.canvas.noise > 0) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            addCanvasNoise(imageData);
            ctx.putImageData(imageData, 0, 0);
          }
        } catch (e) {}
        return originalOffscreenConvertToBlob.apply(this, args);
      };
    }
  }

  // ==================== Audio ====================
  // Audio context properties
  const originalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (originalAudioContext) {
    window.AudioContext = function(...args) {
      const ctx = new originalAudioContext(...args);

      Object.defineProperty(ctx, 'sampleRate', {
        get: () => fp.audio.sampleRate,
      });
      Object.defineProperty(ctx, 'baseLatency', {
        get: () => fp.audio.baseLatency,
      });
      Object.defineProperty(ctx, 'outputLatency', {
        get: () => fp.audio.outputLatency,
      });

      // Add noise to analyser
      const originalCreateAnalyser = ctx.createAnalyser.bind(ctx);
      ctx.createAnalyser = function() {
        const analyser = originalCreateAnalyser();
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
        const originalGetByteFrequencyData = analyser.getByteFrequencyData.bind(analyser);
        const originalGetFloatTimeDomainData = analyser.getFloatTimeDomainData.bind(analyser);
        const originalGetByteTimeDomainData = analyser.getByteTimeDomainData.bind(analyser);

        // Seeded noise for consistency
        let audioSeed = 0;
        for (let i = 0; i < fp.audio.hashSeed.length; i++) {
          audioSeed = ((audioSeed << 5) - audioSeed) + fp.audio.hashSeed.charCodeAt(i);
        }

        const audioNoise = () => {
          audioSeed = (audioSeed * 1103515245 + 12345) & 0x7fffffff;
          return (audioSeed / 0x7fffffff - 0.5) * fp.audio.noise;
        };

        analyser.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData(array);
          for (let i = 0; i < array.length; i++) {
            array[i] += audioNoise();
          }
        };

        analyser.getByteFrequencyData = function(array) {
          originalGetByteFrequencyData(array);
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(audioNoise() * 10)));
          }
        };

        analyser.getFloatTimeDomainData = function(array) {
          originalGetFloatTimeDomainData(array);
          for (let i = 0; i < array.length; i++) {
            array[i] += audioNoise() * 0.01;
          }
        };

        analyser.getByteTimeDomainData = function(array) {
          originalGetByteTimeDomainData(array);
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(audioNoise() * 5)));
          }
        };

        return analyser;
      };

      // Add noise to createOscillator for AudioContext fingerprinting
      const originalCreateOscillator = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = function() {
        const osc = originalCreateOscillator();
        const originalConnect = osc.connect.bind(osc);
        osc.connect = function(destination, ...args) {
          return originalConnect(destination, ...args);
        };
        return osc;
      };

      return ctx;
    };
    window.AudioContext.prototype = originalAudioContext.prototype;
  }

  // OfflineAudioContext
  if (typeof OfflineAudioContext !== 'undefined') {
    const originalOfflineAudioContext = OfflineAudioContext;
    const originalStartRendering = OfflineAudioContext.prototype.startRendering;

    OfflineAudioContext.prototype.startRendering = function() {
      return originalStartRendering.call(this).then(buffer => {
        let audioSeed = 0;
        for (let i = 0; i < fp.audio.hashSeed.length; i++) {
          audioSeed = ((audioSeed << 5) - audioSeed) + fp.audio.hashSeed.charCodeAt(i);
        }

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const data = buffer.getChannelData(channel);
          for (let i = 0; i < data.length; i++) {
            audioSeed = (audioSeed * 1103515245 + 12345) & 0x7fffffff;
            data[i] += (audioSeed / 0x7fffffff - 0.5) * fp.audio.noise * 0.0001;
          }
        }
        return buffer;
      });
    };
  }

  // ==================== WebRTC ====================
  if (fp.webrtc.mode === 'disabled') {
    window.RTCPeerConnection = undefined;
    window.webkitRTCPeerConnection = undefined;
    window.mozRTCPeerConnection = undefined;
    if (navigator.mediaDevices) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    }
  } else if (fp.webrtc.mode === 'fake' && fp.webrtc.publicIp) {
    const originalRTCPeerConnection = window.RTCPeerConnection;
    if (originalRTCPeerConnection) {
      window.RTCPeerConnection = function(...args) {
        const pc = new originalRTCPeerConnection(...args);
        const originalCreateOffer = pc.createOffer.bind(pc);
        const originalSetLocalDescription = pc.setLocalDescription.bind(pc);

        pc.createOffer = function(options) {
          return originalCreateOffer(options).then(offer => {
            offer.sdp = offer.sdp.replace(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/g, fp.webrtc.publicIp);
            return offer;
          });
        };

        return pc;
      };
      window.RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
    }
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
        if (prop === 'item') return (i) => target[i];
        if (typeof prop === 'string' && !isNaN(parseInt(prop))) {
          const rect = target[parseInt(prop)];
          if (rect) {
            return new DOMRect(
              rect.x + (seededRandom() - 0.5) * noise,
              rect.y + (seededRandom() - 0.5) * noise,
              rect.width + (seededRandom() - 0.5) * noise,
              rect.height + (seededRandom() - 0.5) * noise
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
      rect.x + (seededRandom() - 0.5) * noise,
      rect.y + (seededRandom() - 0.5) * noise,
      rect.width + (seededRandom() - 0.5) * noise,
      rect.height + (seededRandom() - 0.5) * noise
    );
  };

  // ==================== Media Devices ====================
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices = async function() {
      const devices = [];

      // Use pre-generated device IDs for consistency
      fp.mediaDevices.deviceIds.videoinput.forEach((id, i) => {
        devices.push({
          deviceId: id,
          kind: 'videoinput',
          label: i === 0 ? 'Integrated Webcam' : 'USB Camera ' + i,
          groupId: id.slice(0, 32),
        });
      });

      fp.mediaDevices.deviceIds.audioinput.forEach((id, i) => {
        devices.push({
          deviceId: id,
          kind: 'audioinput',
          label: i === 0 ? 'Default - Microphone Array' : 'Microphone ' + i,
          groupId: id.slice(0, 32),
        });
      });

      fp.mediaDevices.deviceIds.audiooutput.forEach((id, i) => {
        devices.push({
          deviceId: id,
          kind: 'audiooutput',
          label: i === 0 ? 'Default - Speakers' : 'Speakers ' + i,
          groupId: id.slice(0, 32),
        });
      });

      return devices;
    };
  }

  // ==================== Plugins ====================
  Object.defineProperty(Navigator.prototype, 'plugins', {
    get: () => {
      const pluginArray = Object.create(PluginArray.prototype);

      fp.plugins.forEach((p, i) => {
        const plugin = Object.create(Plugin.prototype);
        const mimeTypes = p.mimeTypes.map((m, j) => {
          const mimeType = Object.create(MimeType.prototype);
          Object.defineProperties(mimeType, {
            type: { value: m.type, enumerable: true },
            suffixes: { value: m.suffixes, enumerable: true },
            description: { value: m.description, enumerable: true },
            enabledPlugin: { value: plugin, enumerable: true },
          });
          return mimeType;
        });

        Object.defineProperties(plugin, {
          name: { value: p.name, enumerable: true },
          filename: { value: p.filename, enumerable: true },
          description: { value: p.description, enumerable: true },
          length: { value: mimeTypes.length, enumerable: true },
        });

        mimeTypes.forEach((m, j) => {
          plugin[j] = m;
        });

        pluginArray[i] = plugin;
        pluginArray[p.name] = plugin;
      });

      Object.defineProperty(pluginArray, 'length', { value: fp.plugins.length });
      pluginArray.item = (i) => pluginArray[i];
      pluginArray.namedItem = (name) => pluginArray[name];
      pluginArray.refresh = () => {};

      return pluginArray;
    },
    configurable: true,
  });

  // MimeTypes
  Object.defineProperty(Navigator.prototype, 'mimeTypes', {
    get: () => {
      const mimeTypeArray = Object.create(MimeTypeArray.prototype);
      let allMimeTypes = [];
      let index = 0;

      fp.plugins.forEach(p => {
        p.mimeTypes.forEach(m => {
          const mimeType = Object.create(MimeType.prototype);
          Object.defineProperties(mimeType, {
            type: { value: m.type, enumerable: true },
            suffixes: { value: m.suffixes, enumerable: true },
            description: { value: m.description, enumerable: true },
          });
          mimeTypeArray[index++] = mimeType;
          mimeTypeArray[m.type] = mimeType;
          allMimeTypes.push(mimeType);
        });
      });

      Object.defineProperty(mimeTypeArray, 'length', { value: allMimeTypes.length });
      mimeTypeArray.item = (i) => mimeTypeArray[i];
      mimeTypeArray.namedItem = (name) => mimeTypeArray[name];

      return mimeTypeArray;
    },
    configurable: true,
  });

  // ==================== Battery ====================
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: fp.battery.charging,
      chargingTime: fp.battery.chargingTime,
      dischargingTime: fp.battery.dischargingTime,
      level: fp.battery.level,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null,
    });
  }

  // ==================== Connection ====================
  if (navigator.connection) {
    Object.defineProperties(navigator.connection, {
      effectiveType: { value: fp.connection.effectiveType, configurable: true, enumerable: true },
      rtt: { value: fp.connection.rtt, configurable: true, enumerable: true },
      downlink: { value: fp.connection.downlink, configurable: true, enumerable: true },
      saveData: { value: fp.connection.saveData, configurable: true, enumerable: true },
      type: { value: fp.connection.type, configurable: true, enumerable: true },
    });
  }

  // ==================== Client Hints ====================
  if (navigator.userAgentData) {
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        brands: fp.clientHints.brands,
        mobile: fp.clientHints.mobile,
        platform: fp.clientHints.platform,
        getHighEntropyValues: (hints) => Promise.resolve({
          brands: fp.clientHints.brands,
          mobile: fp.clientHints.mobile,
          platform: fp.clientHints.platform,
          platformVersion: fp.clientHints.platformVersion,
          architecture: fp.clientHints.architecture,
          bitness: fp.clientHints.bitness,
          model: fp.clientHints.model,
          fullVersionList: fp.clientHints.fullVersionList,
          uaFullVersion: fp.clientHints.fullVersionList[2]?.version || '',
        }),
        toJSON: () => ({
          brands: fp.clientHints.brands,
          mobile: fp.clientHints.mobile,
          platform: fp.clientHints.platform,
        }),
      }),
      configurable: true,
    });
  }

  // ==================== Speech Synthesis ====================
  if (window.speechSynthesis) {
    const originalGetVoices = window.speechSynthesis.getVoices.bind(window.speechSynthesis);
    window.speechSynthesis.getVoices = function() {
      return fp.speechVoices.map(v => {
        const voice = Object.create(SpeechSynthesisVoice.prototype);
        Object.defineProperties(voice, {
          name: { value: v.name, enumerable: true },
          lang: { value: v.lang, enumerable: true },
          localService: { value: v.localService, enumerable: true },
          default: { value: v.default, enumerable: true },
          voiceURI: { value: v.voiceURI, enumerable: true },
        });
        return voice;
      });
    };
  }

  // ==================== Permissions ====================
  const originalQuery = Permissions.prototype.query;
  Permissions.prototype.query = function(desc) {
    const permState = fp.permissions[desc.name];
    if (permState) {
      return Promise.resolve({
        state: permState,
        name: desc.name,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
    }
    return originalQuery.call(this, desc);
  };

  // ==================== Storage Quota ====================
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate = () => Promise.resolve({
      quota: fp.storageQuota.quota,
      usage: fp.storageQuota.usage,
    });
  }

  // ==================== Performance ====================
  if (window.performance && window.performance.now) {
    const originalNow = window.performance.now.bind(window.performance);
    window.performance.now = function() {
      return originalNow() + (seededRandom() - 0.5) * fp.performanceNoise * 100;
    };
  }

  // Performance memory (Chrome-specific)
  if (window.performance && window.performance.memory === undefined) {
    Object.defineProperty(window.performance, 'memory', {
      get: () => ({
        jsHeapSizeLimit: 2172649472 + Math.floor(seededRandom() * 100000000),
        totalJSHeapSize: 10000000 + Math.floor(seededRandom() * 5000000),
        usedJSHeapSize: 5000000 + Math.floor(seededRandom() * 3000000),
      }),
      configurable: true,
    });
  }

  // ==================== Math fingerprinting protection ====================
  const originalSin = Math.sin;
  const originalCos = Math.cos;
  const originalTan = Math.tan;
  const originalAsin = Math.asin;
  const originalAcos = Math.acos;
  const originalAtan = Math.atan;
  const originalAtan2 = Math.atan2;
  const originalSinh = Math.sinh;
  const originalCosh = Math.cosh;
  const originalTanh = Math.tanh;
  const originalExp = Math.exp;
  const originalLog = Math.log;

  Math.sin = function(x) {
    return originalSin(x) + fp.mathNoise * seededRandom();
  };

  Math.cos = function(x) {
    return originalCos(x) + fp.mathNoise * seededRandom();
  };

  Math.tan = function(x) {
    return originalTan(x) + fp.mathNoise * seededRandom();
  };

  Math.asin = function(x) {
    return originalAsin(x) + fp.mathNoise * seededRandom();
  };

  Math.acos = function(x) {
    return originalAcos(x) + fp.mathNoise * seededRandom();
  };

  Math.atan = function(x) {
    return originalAtan(x) + fp.mathNoise * seededRandom();
  };

  Math.atan2 = function(y, x) {
    return originalAtan2(y, x) + fp.mathNoise * seededRandom();
  };

  Math.sinh = function(x) {
    return originalSinh(x) + fp.mathNoise * seededRandom();
  };

  Math.cosh = function(x) {
    return originalCosh(x) + fp.mathNoise * seededRandom();
  };

  Math.tanh = function(x) {
    return originalTanh(x) + fp.mathNoise * seededRandom();
  };

  Math.exp = function(x) {
    return originalExp(x) * (1 + fp.mathNoise * seededRandom());
  };

  Math.log = function(x) {
    return originalLog(x) + fp.mathNoise * seededRandom();
  };

  // ==================== History ====================
  Object.defineProperty(History.prototype, 'length', {
    get: () => fp.historyLength,
    configurable: true,
  });

  // ==================== Geolocation ====================
  if (fp.geolocation && fp.geolocation.enabled) {
    const fakePosition = {
      coords: {
        latitude: fp.geolocation.latitude,
        longitude: fp.geolocation.longitude,
        accuracy: fp.geolocation.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      setTimeout(() => success(fakePosition), 50 + Math.random() * 100);
    };

    let watchId = 1;
    navigator.geolocation.watchPosition = function(success, error, options) {
      const id = watchId++;
      setTimeout(() => success(fakePosition), 50 + Math.random() * 100);
      return id;
    };

    navigator.geolocation.clearWatch = function(id) {};
  }

  // ==================== Fonts Detection Protection ====================
  // Make font detection return consistent results based on fp.fonts
  const fontSet = new Set(fp.fonts);
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  // ==================== Keyboard API ====================
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    const originalGetLayoutMap = navigator.keyboard.getLayoutMap.bind(navigator.keyboard);
    navigator.keyboard.getLayoutMap = async function() {
      const map = await originalGetLayoutMap();
      // Return consistent keyboard layout based on language
      return map;
    };
  }

  // ==================== Hardware APIs Protection ====================
  // Bluetooth - disable or spoof
  if (navigator.bluetooth) {
    navigator.bluetooth.getAvailability = () => Promise.resolve(false);
    navigator.bluetooth.requestDevice = () => Promise.reject(new DOMException('User cancelled', 'NotFoundError'));
  }

  // USB - disable or spoof
  if (navigator.usb) {
    navigator.usb.getDevices = () => Promise.resolve([]);
    navigator.usb.requestDevice = () => Promise.reject(new DOMException('No device selected', 'NotFoundError'));
  }

  // Serial - disable
  if (navigator.serial) {
    navigator.serial.getPorts = () => Promise.resolve([]);
    navigator.serial.requestPort = () => Promise.reject(new DOMException('No port selected', 'NotFoundError'));
  }

  // HID - disable
  if (navigator.hid) {
    navigator.hid.getDevices = () => Promise.resolve([]);
    navigator.hid.requestDevice = () => Promise.reject(new DOMException('No device selected', 'NotFoundError'));
  }

  // ==================== GPU API ====================
  if (navigator.gpu) {
    const originalRequestAdapter = navigator.gpu.requestAdapter.bind(navigator.gpu);
    navigator.gpu.requestAdapter = async function(options) {
      const adapter = await originalRequestAdapter(options);
      if (adapter) {
        // Override adapter info to match WebGL
        const originalRequestAdapterInfo = adapter.requestAdapterInfo?.bind(adapter);
        if (originalRequestAdapterInfo) {
          adapter.requestAdapterInfo = async function() {
            return {
              vendor: fp.webgl.unmaskedVendor,
              architecture: 'gen-12lp',
              device: fp.webgl.unmaskedRenderer,
              description: fp.webgl.unmaskedRenderer,
            };
          };
        }
      }
      return adapter;
    };
  }

  // ==================== Clipboard API ====================
  // Disable clipboard read to prevent fingerprinting via clipboard
  if (navigator.clipboard) {
    const originalReadText = navigator.clipboard.readText;
    const originalRead = navigator.clipboard.read;

    navigator.clipboard.readText = function() {
      return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
    };

    navigator.clipboard.read = function() {
      return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
    };
  }

  // ==================== Sensor APIs ====================
  // Accelerometer, Gyroscope, etc. - return consistent fake data
  const sensorClasses = ['Accelerometer', 'Gyroscope', 'LinearAccelerationSensor', 'AbsoluteOrientationSensor', 'RelativeOrientationSensor', 'Magnetometer', 'AmbientLightSensor'];

  sensorClasses.forEach(sensorName => {
    if (window[sensorName]) {
      const OriginalSensor = window[sensorName];
      window[sensorName] = function(options) {
        const sensor = new OriginalSensor(options);
        // Add noise to sensor readings
        const originalStart = sensor.start.bind(sensor);
        sensor.start = function() {
          originalStart();
          // Readings will be based on seed
        };
        return sensor;
      };
      window[sensorName].prototype = OriginalSensor.prototype;
    }
  });

  // ==================== Document Properties ====================
  // Spoof document.hidden and visibilityState
  Object.defineProperty(document, 'hidden', {
    get: () => false,
    configurable: true,
  });

  Object.defineProperty(document, 'visibilityState', {
    get: () => 'visible',
    configurable: true,
  });

  // ==================== Window Properties ====================
  // Spoof window.screenX, screenY, screenLeft, screenTop
  Object.defineProperty(window, 'screenX', {
    get: () => 0,
    configurable: true,
  });

  Object.defineProperty(window, 'screenY', {
    get: () => 0,
    configurable: true,
  });

  Object.defineProperty(window, 'screenLeft', {
    get: () => 0,
    configurable: true,
  });

  Object.defineProperty(window, 'screenTop', {
    get: () => 0,
    configurable: true,
  });

  // ==================== Console Disable for Detection ====================
  // Some sites detect automation by looking at console
  const originalConsoleDebug = console.debug;
  console.debug = function(...args) {
    // Filter out Playwright/automation messages
    if (args.some(arg => typeof arg === 'string' && (arg.includes('Playwright') || arg.includes('puppeteer') || arg.includes('selenium')))) {
      return;
    }
    return originalConsoleDebug.apply(console, args);
  };

  console.log('[Phantom] Fingerprint injected - Seed:', fp.seed.slice(0, 8) + '...');
})();
`;
}
