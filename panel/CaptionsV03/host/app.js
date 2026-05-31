(function () {
  var HELPER_URL = "http://127.0.0.1:17777";
  var cs = new CSInterface();
  var EXTENSION_ROOT = "";
  var JSX_PATH = "";

  function resolveExtensionRoot() {
    var path;
    try {
      if (cs && typeof cs.getSystemPath === "function" && typeof SystemPath !== "undefined" && SystemPath.EXTENSION) {
        return cs.getSystemPath(SystemPath.EXTENSION);
      }
    } catch (errorOne) {}

    try {
      path = decodeURI(window.location.pathname || "");
      if (path.indexOf("/host/") !== -1) {
        return path.split("/host/")[0];
      }
    } catch (errorTwo) {}

    return "";
  }

  EXTENSION_ROOT = resolveExtensionRoot();
  JSX_PATH = EXTENSION_ROOT ? (EXTENSION_ROOT + "/jsx/captions.jsx") : "";
  function cloneJSON(value) {
    if (!value) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function mergeSpec(target, source) {
    var key;
    if (!source) {
      return target;
    }
    for (key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = cloneJSON(source[key]);
      }
    }
    return target;
  }

  function padPresetIndex(value) {
    return value < 10 ? ("0" + value) : String(value);
  }

  function captionsPackSpec(index, overrides) {
    var padded = padPresetIndex(index);
    return mergeSpec({
      id: "builtin.mogrt.captions_" + padded,
      name: "Captions Style " + padded,
      sourceMogrt: "Captions / Caption Animation Style " + index,
      templatePath: "mogrts/captions_pack/template.aep",
      previewImage: "mogrts/captions_pack/preview_" + padded + ".png",
      previewAnimation: "mogrts/captions_pack/preview_" + padded + ".mp4",
      templateCompName: "Caption Animation Style " + index,
      copyMode: "group",
      description: "Converted AE caption style from the Captions pack.",
      previewWords: ["Lorem", "ipsum", "dolor", "sit", "amet"],
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Main Text", "Text Layer", "Text 1", "Text"]
      }
    }, overrides || {});
  }

  function subverticalSpec(index, overrides) {
    var padded = padPresetIndex(index);
    return mergeSpec({
      id: "builtin.mogrt.subvertical_" + padded,
      name: "Subtitles Vertical " + index,
      sourceMogrt: "Subtitle " + index + ".mogrt",
      templatePath: "mogrts/subvertical_" + padded + "/template.aep",
      previewImage: "mogrts/subvertical_" + padded + "/thumb.png",
      copyMode: "group",
      description: "Converted MOGRT subtitle preset from the Subtitles Vertical pack.",
      previewWords: ["Lorem", "ipsum", "dolor", "sit", "amet"],
      controls: {
        plainTextLayers: true,
        visibleLayerNames: ["Main Text", "Text Layer", "Text 1", "Text"],
        hiddenLayerNames: ["Control Pannel", "Control Panel", "Globe Control", "Icon Placeholder"]
      }
    }, overrides || {});
  }

  var LEGACY_MOGRT_PRESETS = [
    { id: "builtin.mogrt.wahla_01", name: "Wahla VFX 01", sourceMogrt: "Text Preset - Wahla VFX (1).mogrt", templatePath: "mogrts/wahla_01/template.aep", previewImage: "mogrts/wahla_01/thumb.png", previewAnimation: "mogrts/wahla_01/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_02", name: "Wahla VFX 02", sourceMogrt: "Text Preset - Wahla VFX (2).mogrt", templatePath: "mogrts/wahla_02/template.aep", previewImage: "mogrts/wahla_02/thumb.png", previewAnimation: "mogrts/wahla_02/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_03", name: "Wahla VFX 03", sourceMogrt: "Text Preset - Wahla VFX (3).mogrt", templatePath: "mogrts/wahla_03/template.aep", previewImage: "mogrts/wahla_03/thumb.png", previewAnimation: "mogrts/wahla_03/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_04", name: "Wahla VFX 04", sourceMogrt: "Text Preset - Wahla VFX (4).mogrt", templatePath: "mogrts/wahla_04/template.aep", previewImage: "mogrts/wahla_04/thumb.png", previewAnimation: "mogrts/wahla_04/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_05", name: "Wahla VFX 05", sourceMogrt: "Text Preset - Wahla VFX (5).mogrt", templatePath: "mogrts/wahla_05/template.aep", previewImage: "mogrts/wahla_05/thumb.png", previewAnimation: "mogrts/wahla_05/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_06", name: "Wahla VFX 06", sourceMogrt: "Text Preset - Wahla VFX (6).mogrt", templatePath: "mogrts/wahla_06/template.aep", previewImage: "mogrts/wahla_06/thumb.png", previewAnimation: "mogrts/wahla_06/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_07", name: "Wahla VFX 07", sourceMogrt: "Text Preset - Wahla VFX (7).mogrt", templatePath: "mogrts/wahla_07/template.aep", previewImage: "mogrts/wahla_07/thumb.png", previewAnimation: "mogrts/wahla_07/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_08", name: "Wahla VFX 08", sourceMogrt: "Text Preset - Wahla VFX (8).mogrt", templatePath: "mogrts/wahla_08/template.aep", previewImage: "mogrts/wahla_08/thumb.png", previewAnimation: "mogrts/wahla_08/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_09", name: "Wahla VFX 09", sourceMogrt: "Text Preset - Wahla VFX (9).mogrt", templatePath: "mogrts/wahla_09/template.aep", previewImage: "mogrts/wahla_09/thumb.png", previewAnimation: "mogrts/wahla_09/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_10", name: "Wahla VFX 10", sourceMogrt: "Text Preset - Wahla VFX (10).mogrt", templatePath: "mogrts/wahla_10/template.aep", previewImage: "mogrts/wahla_10/thumb.png", previewAnimation: "mogrts/wahla_10/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.wahla_11", name: "Wahla VFX 11", sourceMogrt: "Text Preset - Wahla VFX (11).mogrt", templatePath: "mogrts/wahla_11/template.aep", previewImage: "mogrts/wahla_11/thumb.png", previewAnimation: "mogrts/wahla_11/preview.gif", forceFont: "Poppins-Bold" },
    { id: "builtin.mogrt.tiktok_caps", name: "TikTokCaps", sourceMogrt: "TikTokCaps.mogrt", templatePath: "mogrts/tiktok_caps/template.aep", previewImage: "mogrts/tiktok_caps/thumb.png", previewAnimation: "mogrts/tiktok_caps/preview.gif", copyMode: "group", forceFont: "Poppins-Bold" }
  ];

  var CAPTIONS_PACK_PRESETS = [
    captionsPackSpec(1, {
      description: "Stacked highlight caption with line accent.",
      previewWords: ["Ready", "for", "the", "motor", "show"],
      style: { fontSize: 74, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -1 },
      shadow: { enabled: true, opacity: 38, distance: 6, softness: 22 },
      animation: { type: "pop", inDuration: 0.12, outDuration: 0.06 }
    }),
    captionsPackSpec(2, {
      description: "Boxy lower-third subtitle with cleaner blocks.",
      previewWords: ["Work", "hard", "for", "what", "you", "like"],
      style: { fontSize: 70, fillColor: [0.08, 0.08, 0.1], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [1, 1, 1], opacity: 100, paddingX: 34, paddingY: 22, radius: 26 },
      animation: { type: "slide-up", inDuration: 0.14, outDuration: 0.06 }
    }),
    captionsPackSpec(3, {
      description: "Large bold caption with more contrast and shadow.",
      previewWords: ["Get", "ready", "for", "the", "show"],
      style: { fontSize: 92, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -2 },
      shadow: { enabled: true, opacity: 48, distance: 0, softness: 42 },
      animation: { type: "bounce", inDuration: 0.14, outDuration: 0.08 }
    }),
    captionsPackSpec(4, {
      description: "Gradient highlight caption with stronger animated emphasis.",
      previewWords: ["The", "best", "deal", "lands", "today"],
      style: { fontSize: 78, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -1 },
      shadow: { enabled: true, opacity: 40, distance: 0, softness: 36 },
      animation: { type: "rise-color", inDuration: 0.16, outDuration: 0.06, fromFillColor: [0.74, 0.16, 1], toFillColor: [1, 1, 1] },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Main Text", "Text Layer", "Text 1", "Text"],
        effectTextNames: ["Text", "Gradient FG Text (Change font only)"],
        effectPointNames: ["Animation Start Time, Duration", "Start Time, Duration(Automated)"],
        effectNumberValues: { "Animation Type": 4, "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    captionsPackSpec(5, {
      description: "Tighter minimal subtitle with grounded positioning.",
      previewWords: ["Short", "clean", "subtitle", "layout"],
      style: { fontSize: 68, fillColor: [1, 1, 1], strokeWidth: 0, tracking: 0 },
      animation: { type: "fade", inDuration: 0.12, outDuration: 0.08 }
    }),
    captionsPackSpec(6, {
      description: "Centered subtitle style with stronger reveal.",
      previewWords: ["Big", "caption", "moment"],
      style: { fontSize: 88, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -3 },
      shadow: { enabled: true, opacity: 46, distance: 0, softness: 46 },
      animation: { type: "pop", inDuration: 0.14, outDuration: 0.08 }
    }),
    captionsPackSpec(7, {
      description: "Offset subtitle style with softer accent motion.",
      previewWords: ["Watch", "the", "spotlight", "move"],
      style: { fontSize: 74, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -1 },
      animation: { type: "slide-up", inDuration: 0.14, outDuration: 0.06 }
    }),
    captionsPackSpec(8, {
      description: "Punchier caption style with bolder contrast.",
      previewWords: ["Strong", "words", "hit", "faster"],
      style: { fontSize: 82, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -2 },
      shadow: { enabled: true, opacity: 42, distance: 4, softness: 18 },
      animation: { type: "bounce", inDuration: 0.16, outDuration: 0.08 }
    }),
    captionsPackSpec(9, {
      description: "Final captions pack style with wider spacing and lift.",
      previewWords: ["Lorem", "ipsum", "dolor", "amet"],
      style: { fontSize: 76, fillColor: [1, 1, 1], strokeWidth: 0, tracking: 1 },
      animation: { type: "slide-up", inDuration: 0.15, outDuration: 0.07 }
    })
  ];

  var SUBVERTICAL_PRESETS = [
    subverticalSpec(1, {
      description: "Word-highlight subtitle with shadow and box control.",
      previewWords: ["Being", "an", "artist"],
      style: { fontSize: 72, fillColor: [1, 0.98, 0.98], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [0, 0, 0], opacity: 60, paddingX: 36, paddingY: 18, radius: 0 },
      animation: { type: "pop", inDuration: 0.12, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 0, 0], activeScale: 100 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Main Text", "Text Layer"],
        effectTextNames: ["Text"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(2, {
      description: "Clean white block subtitle with duration-based animation.",
      previewWords: ["Behind", "the", "account"],
      style: { fontSize: 68, fillColor: [0, 0, 0], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [1, 1, 1], opacity: 100, paddingX: 28, paddingY: 18, radius: 22 },
      animation: { type: "fade", inDuration: 0.12, outDuration: 0.08 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(3, {
      description: "Green highlight subtitle with enlarged active word.",
      previewWords: ["People", "rent", "online"],
      style: { fontSize: 74, fillColor: [1, 1, 1], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [0, 0, 0], opacity: 100, paddingX: 24, paddingY: 18, radius: 28 },
      animation: { type: "pop", inDuration: 0.12, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [0.16, 1, 0], activeScale: 120 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(4, {
      description: "Gradient highlight subtitle with dual timing controls.",
      previewWords: ["Exactly", "the", "right", "offer"],
      style: { fontSize: 76, fillColor: [1, 1, 1], strokeWidth: 0, tracking: -1 },
      animation: { type: "rise-color", inDuration: 0.16, outDuration: 0.06, fromFillColor: [0.8, 0, 1], toFillColor: [1, 1, 1] },
      highlight: { enabled: true, mode: "word", activeFillColor: [0.8, 0, 1], activeScale: 100 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text", "Gradient FG Text (Change font only)"],
        effectPointNames: ["Animation Start Time, Duration", "Start Time, Duration(Automated)"],
        effectNumberValues: { "Animation Type": 4, "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(5, {
      description: "Highlighted box subtitle with per-word block emphasis.",
      previewWords: ["Lorem", "ipsum", "dolor", "sit", "amet"],
      style: { fontSize: 72, fillColor: [1, 1, 1], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [0.47, 0.99, 0.73], opacity: 100, paddingX: 18, paddingY: 12, radius: 12 },
      animation: { type: "pop", inDuration: 0.12, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [0, 0, 0], activeScale: 100 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text 1"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(6, {
      description: "Yellow highlight box subtitle variant.",
      previewWords: ["Lorem", "ipsum", "dolor", "sit", "amet"],
      style: { fontSize: 72, fillColor: [1, 1, 1], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [1, 0.87, 0], opacity: 100, paddingX: 18, paddingY: 12, radius: 12 },
      animation: { type: "pop", inDuration: 0.12, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [0, 0, 0], activeScale: 100 },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text 1"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 2, "Word Index (Manual)": 0 }
      }
    }),
    subverticalSpec(7, {
      description: "Typewriter subtitle with blinking cursor timing.",
      previewWords: ["Good", "afternoon", "chances", "are"],
      style: { fontSize: 68, fillColor: [0, 0, 0], strokeWidth: 0, tracking: 0 },
      background: { enabled: true, color: [1, 1, 1], opacity: 100, paddingX: 24, paddingY: 18, radius: 0 },
      animation: { type: "none", inDuration: 0, outDuration: 0 },
      reveal: { type: "typewriter", minWordsPerLayer: 1, mode: "cumulative" },
      controls: {
        plainTextLayers: true,
        hiddenLayerNames: ["Control Pannel", "Globe Control", "Icon Placeholder"],
        visibleLayerNames: ["Text Layer", "Main Text", "Text"],
        effectTextNames: ["Text", "Enter the Same Text"],
        effectPointNames: ["Start Time, Duration(Automated)"],
        effectNumberValues: { "Type": 4, "Word/Char Index (Manual)": 0 }
      }
    })
  ];

  var MOGRT_PRESETS = LEGACY_MOGRT_PRESETS.concat(CAPTIONS_PACK_PRESETS, SUBVERTICAL_PRESETS);

  function assetURI(path) {
    var fullPath;
    if (!path || /^file:|^https?:/i.test(path)) {
      return path || "";
    }
    fullPath = path.charAt(0) === "/" ? path : (EXTENSION_ROOT ? (EXTENSION_ROOT + "/" + path) : path);
    fullPath = fullPath.replace(/\\/g, "/");
    return "file://" + encodeURI(fullPath);
  }

  function mogrtPresetRecord(spec) {
    var style = mergeSpec({
      font: spec.forceFont || "",
      fontSize: 72,
      fillColor: [1, 1, 1],
      strokeColor: [0, 0, 0],
      strokeWidth: 0,
      positionY: 0.82,
      tracking: 0,
      leading: 0,
      maxWordsPerLine: 0,
      allCaps: false
    }, spec.style || {});
    var background = mergeSpec({ enabled: false }, spec.background || {});
    var shadow = mergeSpec({ enabled: false }, spec.shadow || {});
    var animation = mergeSpec({ type: "mogrt", inDuration: 0, outDuration: 0 }, spec.animation || {});
    var highlight = mergeSpec({ enabled: false, mode: "none" }, spec.highlight || {});
    var reveal = mergeSpec({ type: "none", minWordsPerLayer: 3, mode: "cumulative" }, spec.reveal || {});
    return {
      id: spec.id,
      source: "mogrt",
      preset: {
        version: 2,
        name: spec.name,
        description: spec.description || "Original MOGRT template.",
        previewImage: assetURI(spec.previewImage),
        previewAnimation: assetURI(spec.previewAnimation),
        previewWords: cloneJSON(spec.previewWords) || ["MOGRT", "caption", "style"],
        style: style,
        background: background,
        shadow: shadow,
        animation: animation,
        highlight: highlight,
        reveal: reveal,
        mogrt: {
          enabled: true,
          sourceMogrt: spec.sourceMogrt,
          templatePath: spec.templatePath,
          templateCompName: spec.templateCompName || "",
          copyMode: spec.copyMode || "text",
          controls: cloneJSON(spec.controls) || {},
          forceFont: spec.forceFont || ""
        }
      }
    };
  }

  var MODE_CONFIG = {
    one: {
      captionMode: "words",
      wordsPerLayer: 1,
      hint: "One word per layer with exact timing."
    },
    two: {
      captionMode: "words",
      wordsPerLayer: 2,
      hint: "Two words per layer with tighter pacing."
    },
    three: {
      captionMode: "words",
      wordsPerLayer: 3,
      hint: "Three words per layer, fast pace."
    },
    smart: {
      captionMode: "smart",
      wordsPerLayer: 5,
      hint: "AI groups words by meaning into short subtitle parts."
    },
    custom: {
      captionMode: "words",
      wordsPerLayer: 6,
      hint: "Choose your own words-per-layer count."
    },
    sentences: {
      captionMode: "phrases",
      wordsPerLayer: 3,
      hint: "Use transcript phrase blocks instead of word chunks."
    }
  };
  var BUILTIN_PRESETS = [
    {
      id: "builtin.basic",
      source: "builtin",
      preset: {
        version: 2,
        name: "Basic / No Style",
        description: "Clean Poppins Bold text with no animation.",
        style: {
          font: "Poppins-Bold",
          fontSize: 72,
          fillColor: [1, 1, 1],
          strokeColor: [0, 0, 0],
          strokeWidth: 0,
          positionY: 0.82,
          tracking: 0,
          leading: 0,
          maxWordsPerLine: 0,
          allCaps: false
        },
        background: { enabled: false },
        shadow: { enabled: false },
        animation: { type: "none", inDuration: 0, outDuration: 0, overshoot: 100 },
        highlight: { enabled: false, mode: "none" },
        previewWords: ["Basic", "clean", "text"]
      }
    },
    {
      id: "builtin.typewriter-clean",
      source: "builtin",
      preset: {
        version: 2,
        name: "Typewriter Clean",
        style: {
          fontSize: 76,
          fillColor: [1, 1, 1],
          strokeColor: [0.02, 0.02, 0.03],
          strokeWidth: 5,
          positionY: 0.78,
          tracking: -2,
          leading: 72,
          maxWordsPerLine: 3,
          allCaps: false
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 46, distance: 4, softness: 16 },
        animation: { type: "none", inDuration: 0.06, outDuration: 0.04 },
        highlight: { enabled: false, mode: "none" },
        reveal: { type: "typewriter", minWordsPerLayer: 3, mode: "cumulative" }
      }
    },
    {
      id: "builtin.typewriter-glow",
      source: "builtin",
      preset: {
        version: 2,
        name: "Typewriter Glow",
        style: {
          fontSize: 104,
          fillColor: [0.94, 0.96, 1],
          strokeColor: [0.03, 0.03, 0.06],
          strokeWidth: 0,
          positionY: 0.48,
          tracking: -5,
          leading: 96,
          maxWordsPerLine: 3,
          allCaps: true
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 80, distance: 0, softness: 52 },
        animation: { type: "pop", inDuration: 0.07, outDuration: 0.04, overshoot: 108 },
        highlight: {
          enabled: true,
          mode: "word",
          activeFillColor: [0.9, 0.18, 1],
          activeStrokeColor: [0.04, 0.01, 0.08],
          activeStrokeWidth: 0,
          activeScale: 100
        },
        reveal: { type: "typewriter", minWordsPerLayer: 3, mode: "cumulative" }
      }
    },
    {
      id: "builtin.typewriter-rise-color",
      source: "builtin",
      preset: {
        version: 2,
        name: "Typewriter Rise Color",
        style: {
          fontSize: 86,
          fillColor: [1, 1, 1],
          strokeColor: [0.02, 0.02, 0.04],
          strokeWidth: 4,
          positionY: 0.70,
          tracking: -3,
          leading: 82,
          maxWordsPerLine: 3,
          allCaps: false
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 54, distance: 4, softness: 18 },
        animation: {
          type: "rise-color",
          inDuration: 0.16,
          outDuration: 0.04,
          fromOffsetY: 72,
          fromScale: 94,
          fromOpacity: 15,
          fromFillColor: [0.72, 0.2, 1],
          toFillColor: [1, 1, 1],
          easeInfluence: 86
        },
        highlight: { enabled: false, mode: "none" },
        reveal: { type: "typewriter", minWordsPerLayer: 1, mode: "cumulative" }
      }
    },
    {
      id: "builtin.typewriter-word-box",
      source: "builtin",
      preset: {
        version: 2,
        name: "Typewriter Word Box",
        style: {
          fontSize: 72,
          fillColor: [1, 1, 1],
          strokeColor: [0.12, 0.02, 0.18],
          strokeWidth: 0,
          positionY: 0.34,
          tracking: -2,
          leading: 68,
          maxWordsPerLine: 1,
          allCaps: false
        },
        background: { enabled: true, color: [0.76, 0.22, 0.96], opacity: 90, paddingX: 14, paddingY: 7, radius: 4 },
        shadow: { enabled: true, opacity: 38, distance: 3, softness: 12 },
        animation: { type: "pop", inDuration: 0.08, outDuration: 0.04, overshoot: 108 },
        highlight: { enabled: false, mode: "none" },
        reveal: { type: "typewriter", minWordsPerLayer: 3, mode: "active-word" }
      }
    },
    {
      id: "builtin.spotlight",
      source: "builtin",
      preset: {
        version: 2,
        name: "Spotlight Box",
        style: {
          fontSize: 82,
          fillColor: [0.88, 0.9, 0.95],
          strokeColor: [0.02, 0.02, 0.04],
          strokeWidth: 4,
          positionY: 0.72,
          tracking: -3,
          leading: 78,
          maxWordsPerLine: 5,
          allCaps: false
        },
        background: {
          enabled: true,
          applyTo: "active",
          color: [0.98, 0.82, 0.16],
          opacity: 96,
          paddingX: 18,
          paddingY: 8,
          radius: 8
        },
        shadow: { enabled: true, opacity: 48, distance: 4, softness: 18 },
        animation: { type: "pop", inDuration: 0.08, outDuration: 0.04, overshoot: 110 },
        highlight: {
          enabled: true,
          mode: "word",
          activeFillColor: [0.05, 0.04, 0.02],
          activeStrokeColor: [0.05, 0.04, 0.02],
          activeStrokeWidth: 0,
          activeScale: 108
        },
        reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
      }
    },
    {
      id: "builtin.purple-tag",
      source: "builtin",
      preset: {
        version: 2,
        name: "Purple Tag",
        style: {
          fontSize: 68,
          fillColor: [1, 1, 1],
          strokeColor: [0.12, 0.02, 0.18],
          strokeWidth: 0,
          positionY: 0.34,
          tracking: -2,
          leading: 68,
          maxWordsPerLine: 4,
          allCaps: false
        },
        background: { enabled: true, color: [0.75, 0.23, 0.96], opacity: 86, paddingX: 12, paddingY: 5, radius: 3 },
        shadow: { enabled: true, opacity: 35, distance: 3, softness: 10 },
        animation: { type: "pop", inDuration: 0.10, outDuration: 0.06, overshoot: 108 },
        highlight: { enabled: false, mode: "none" }
      }
    },
    {
      id: "builtin.magenta-marker",
      source: "builtin",
      preset: {
        version: 2,
        name: "Magenta Marker",
        style: {
          fontSize: 64,
          fillColor: [1, 1, 1],
          strokeColor: [0.2, 0.02, 0.12],
          strokeWidth: 0,
          positionY: 0.30,
          tracking: 8,
          leading: 62,
          maxWordsPerLine: 7,
          allCaps: false
        },
        background: { enabled: true, color: [1, 0.14, 0.49], opacity: 90, paddingX: 16, paddingY: 7, radius: 0 },
        shadow: { enabled: false },
        animation: { type: "slide-up", inDuration: 0.12, outDuration: 0.08 },
        highlight: { enabled: false, mode: "none" }
      }
    },
    {
      id: "builtin.motor-glow",
      source: "builtin",
      preset: {
        version: 2,
        name: "Motor Glow",
        style: {
          fontSize: 122,
          fillColor: [0.95, 0.97, 1],
          strokeColor: [1, 1, 1],
          strokeWidth: 0,
          positionY: 0.45,
          tracking: -6,
          leading: 112,
          maxWordsPerLine: 3,
          allCaps: false
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 72, distance: 0, softness: 46 },
        animation: { type: "fade", inDuration: 0.14, outDuration: 0.10 },
        highlight: {
          enabled: true,
          mode: "word",
          activeFillColor: [0.86, 0.22, 1],
          activeStrokeColor: [0.86, 0.22, 1],
          activeStrokeWidth: 0,
          activeScale: 104
        }
      }
    },
    {
      id: "builtin.stacked-kinetic",
      source: "builtin",
      preset: {
        version: 2,
        name: "Stacked Kinetic",
        style: {
          fontSize: 88,
          fillColor: [1, 1, 1],
          strokeColor: [0.04, 0.04, 0.06],
          strokeWidth: 0,
          positionY: 0.50,
          tracking: 2,
          leading: 78,
          maxWordsPerLine: 2,
          allCaps: true
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 68, distance: 0, softness: 40 },
        animation: { type: "bounce", inDuration: 0.14, outDuration: 0.08, overshoot: 118 },
        highlight: {
          enabled: true,
          mode: "word",
          activeFillColor: [0.79, 0.19, 1],
          activeStrokeColor: [0.05, 0.02, 0.08],
          activeStrokeWidth: 0,
          activeScale: 110
        }
      }
    },
    {
      id: "builtin.creator-punch",
      source: "builtin",
      preset: {
        version: 2,
        name: "Creator Punch",
        style: {
          fontSize: 84,
          fillColor: [1, 1, 1],
          strokeColor: [0.03, 0.03, 0.04],
          strokeWidth: 7,
          positionY: 0.76,
          tracking: -5,
          leading: 82,
          maxWordsPerLine: 4,
          allCaps: true
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 48, distance: 6, softness: 18 },
        animation: { type: "pop", inDuration: 0.10, outDuration: 0.06, overshoot: 116 },
        highlight: { enabled: false, mode: "none" }
      }
    },
    {
      id: "builtin.neon-word",
      source: "builtin",
      preset: {
        version: 2,
        name: "Neon Word",
        style: {
          fontSize: 90,
          fillColor: [0.92, 0.94, 1],
          strokeColor: [0.03, 0.03, 0.05],
          strokeWidth: 5,
          positionY: 0.68,
          tracking: -4,
          leading: 84,
          maxWordsPerLine: 3,
          allCaps: false
        },
        background: { enabled: false },
        shadow: { enabled: true, opacity: 58, distance: 0, softness: 26 },
        animation: { type: "pop", inDuration: 0.08, outDuration: 0.05, overshoot: 112 },
        highlight: {
          enabled: true,
          mode: "word",
          activeFillColor: [0.93, 0.15, 1],
          activeStrokeColor: [0.05, 0.01, 0.08],
          activeStrokeWidth: 6,
          activeScale: 112
        }
      }
    }
  ];

  var AUTOCAPTION_STYLE_SPECS = [
    {
      key: "minimal-words",
      name: "Minimal",
      category: "basic",
      description: "Scale + fade",
      words: ["Cool", "It"],
      style: { fontSize: 78, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.74, tracking: -3, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 30, distance: 3, softness: 10 },
      animation: { type: "pop", inDuration: 0.10, outDuration: 0.08, overshoot: 112 }
    },
    {
      key: "neon",
      name: "Neon",
      category: "basic",
      description: "Glow pulse",
      words: ["Glow", "Up"],
      style: { fontSize: 84, fillColor: [0, 1, 1], strokeColor: [0.02, 0.04, 0.08], strokeWidth: 4, positionY: 0.72, tracking: -4, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 90, distance: 0, softness: 42 },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.06, overshoot: 110 }
    },
    {
      key: "typewriter",
      name: "Typewriter",
      category: "basic",
      description: "Char reveal",
      words: ["Type", "It", "Now"],
      style: { fontSize: 70, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.72, tracking: 0, maxWordsPerLine: 3 },
      animation: { type: "none", inDuration: 0.05, outDuration: 0.04 },
      reveal: { type: "typewriter", minWordsPerLayer: 3, mode: "cumulative" }
    },
    {
      key: "glitch",
      name: "Horror",
      category: "animated",
      description: "Horror glitch effect",
      words: ["No", "Fear"],
      style: { fontSize: 86, fillColor: [1, 0.18, 0.18], strokeColor: [0.02, 0, 0], strokeWidth: 6, positionY: 0.70, tracking: -4, maxWordsPerLine: 3, allCaps: true },
      shadow: { enabled: true, opacity: 75, distance: 0, softness: 24 },
      animation: { type: "pop", inDuration: 0.05, outDuration: 0.05, overshoot: 116 }
    },
    {
      key: "rotate3d",
      name: "3D Flip",
      category: "animated",
      description: "Horizontal unfold",
      words: ["Flip", "It"],
      style: { fontSize: 84, fillColor: [0.92, 0.96, 1], strokeColor: [0.05, 0.05, 0.08], strokeWidth: 4, positionY: 0.70, tracking: -4, maxWordsPerLine: 3, allCaps: true },
      shadow: { enabled: true, opacity: 45, distance: 5, softness: 16 },
      animation: { type: "bounce", inDuration: 0.16, outDuration: 0.08, overshoot: 122 }
    },
    {
      key: "bounce",
      name: "Bounce",
      category: "animated",
      description: "Spring in",
      words: ["Jump", "Now"],
      style: { fontSize: 90, fillColor: [1, 1, 1], strokeColor: [0.02, 0.02, 0.04], strokeWidth: 5, positionY: 0.72, tracking: -5, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 48, distance: 5, softness: 18 },
      animation: { type: "bounce", inDuration: 0.14, outDuration: 0.07, overshoot: 126 }
    },
    {
      key: "slide-scale",
      name: "Slide & Scale",
      category: "animated",
      description: "Slide from side",
      words: ["Slide", "Fast"],
      style: { fontSize: 78, fillColor: [1, 1, 1], strokeColor: [0.02, 0.02, 0.04], strokeWidth: 4, positionY: 0.76, tracking: -3, maxWordsPerLine: 4 },
      shadow: { enabled: true, opacity: 36, distance: 6, softness: 16 },
      animation: { type: "slide-up", inDuration: 0.13, outDuration: 0.08 }
    },
    {
      key: "blur-focus",
      name: "Blur Focus",
      category: "animated",
      description: "Blur to sharp",
      words: ["Focus", "In"],
      style: { fontSize: 82, fillColor: [0.95, 0.97, 1], strokeWidth: 0, positionY: 0.70, tracking: 1, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 70, distance: 0, softness: 34 },
      animation: { type: "fade", inDuration: 0.18, outDuration: 0.12 }
    },
    {
      key: "elastic-snap",
      name: "Elastic Snap",
      category: "animated",
      description: "Elastic bounce",
      words: ["Snap", "Back"],
      style: { fontSize: 88, fillColor: [1, 0.95, 0.2], strokeColor: [0.08, 0.06, 0], strokeWidth: 5, positionY: 0.72, tracking: -5, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 42, distance: 6, softness: 16 },
      animation: { type: "bounce", inDuration: 0.18, outDuration: 0.08, overshoot: 132 }
    },
    {
      key: "fade-lift",
      name: "Fade & Lift",
      category: "animated",
      description: "Rise up softly",
      words: ["Rise", "Soft"],
      style: { fontSize: 76, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.74, tracking: -2, maxWordsPerLine: 4 },
      shadow: { enabled: true, opacity: 40, distance: 4, softness: 18 },
      animation: { type: "slide-up", inDuration: 0.18, outDuration: 0.10 }
    },
    {
      key: "wiggle-words",
      name: "Wiggle Words",
      category: "animated",
      description: "Playful shake",
      words: ["Wiggle", "This"],
      style: { fontSize: 82, fillColor: [1, 0.88, 0.2], strokeColor: [0.1, 0.05, 0], strokeWidth: 5, positionY: 0.72, tracking: -3, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 45, distance: 5, softness: 16 },
      animation: { type: "pop", inDuration: 0.07, outDuration: 0.05, overshoot: 120 }
    },
    {
      key: "flicker",
      name: "Flicker",
      category: "animated",
      description: "Flickering light",
      words: ["Lights", "Out"],
      style: { fontSize: 84, fillColor: [1, 0.96, 0.72], strokeColor: [0.05, 0.03, 0], strokeWidth: 4, positionY: 0.70, tracking: -2, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 85, distance: 0, softness: 34 },
      animation: { type: "fade", inDuration: 0.07, outDuration: 0.05 }
    },
    {
      key: "wave-motion",
      name: "Wave Motion",
      category: "animated",
      description: "Sine wave movement",
      words: ["Wave", "Motion"],
      style: { fontSize: 82, fillColor: [0.5, 0.92, 1], strokeColor: [0.02, 0.05, 0.08], strokeWidth: 4, positionY: 0.68, tracking: -2, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 48, distance: 0, softness: 24 },
      animation: { type: "slide-up", inDuration: 0.14, outDuration: 0.08 }
    },
    {
      key: "double-vision",
      name: "Double Vision",
      category: "animated",
      description: "Dual offset effect",
      words: ["Double", "Take"],
      style: { fontSize: 84, fillColor: [1, 1, 1], strokeColor: [0, 0.92, 1], strokeWidth: 5, positionY: 0.70, tracking: -3, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 62, distance: 7, softness: 0 },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.06, overshoot: 110 }
    },
    {
      key: "scramble-reveal",
      name: "Scramble",
      category: "animated",
      description: "Decode from random chars",
      words: ["Decode", "Me", "Now"],
      style: { fontSize: 72, fillColor: [0.78, 1, 0.28], strokeColor: [0.02, 0.05, 0.01], strokeWidth: 4, positionY: 0.70, tracking: 4, maxWordsPerLine: 3, allCaps: true },
      shadow: { enabled: true, opacity: 55, distance: 0, softness: 18 },
      animation: { type: "none", inDuration: 0.05, outDuration: 0.04 },
      reveal: { type: "typewriter", minWordsPerLayer: 3, mode: "cumulative" }
    },
    {
      key: "split-flap",
      name: "Split Flap",
      category: "animated",
      description: "Airport board effect",
      words: ["Board", "Now"],
      style: { fontSize: 70, fillColor: [0.93, 0.95, 1], strokeWidth: 0, positionY: 0.64, tracking: 6, maxWordsPerLine: 3, allCaps: true },
      background: { enabled: true, color: [0.03, 0.035, 0.05], opacity: 94, paddingX: 16, paddingY: 8, radius: 4 },
      shadow: { enabled: true, opacity: 35, distance: 4, softness: 14 },
      animation: { type: "bounce", inDuration: 0.10, outDuration: 0.06, overshoot: 108 }
    },
    {
      key: "color-pop",
      name: "Color Pop",
      category: "animated",
      description: "Colorful word pop",
      words: ["Color", "Pop"],
      style: { fontSize: 86, fillColor: [1, 1, 1], strokeColor: [0.03, 0.03, 0.05], strokeWidth: 4, positionY: 0.72, tracking: -4, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 48, distance: 4, softness: 16 },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.05, overshoot: 118 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 0.22, 0.66], activeStrokeColor: [0.08, 0, 0.04], activeStrokeWidth: 3, activeScale: 112 }
    },
    {
      key: "stomp",
      name: "Stomp",
      category: "animated",
      description: "Heavy impact per word",
      words: ["Hit", "Hard"],
      style: { fontSize: 96, fillColor: [1, 1, 1], strokeColor: [0.02, 0.02, 0.02], strokeWidth: 8, positionY: 0.72, tracking: -6, maxWordsPerLine: 2, allCaps: true },
      shadow: { enabled: true, opacity: 55, distance: 7, softness: 8 },
      animation: { type: "bounce", inDuration: 0.10, outDuration: 0.06, overshoot: 128 }
    },
    {
      key: "karaoke-wipe",
      name: "Karaoke",
      category: "animated",
      description: "Word-by-word color fill",
      words: ["Sing", "It", "Now"],
      style: { fontSize: 84, fillColor: [0.35, 0.35, 0.42], strokeWidth: 0, positionY: 0.72, tracking: -3, maxWordsPerLine: 4 },
      shadow: { enabled: true, opacity: 42, distance: 4, softness: 18 },
      animation: { type: "fade", inDuration: 0.08, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 0.88, 0.16], activeStrokeColor: [1, 0.88, 0.16], activeStrokeWidth: 0, activeScale: 106 },
      reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
    },
    {
      key: "cinema",
      name: "Cinema",
      category: "basic",
      description: "Letterbox cinematic",
      words: ["Coming", "Soon"],
      style: { fontSize: 74, fillColor: [1, 0.94, 0.78], strokeColor: [0.08, 0.05, 0.02], strokeWidth: 2, positionY: 0.80, tracking: 3, maxWordsPerLine: 6, allCaps: true },
      shadow: { enabled: true, opacity: 58, distance: 5, softness: 20 },
      animation: { type: "fade", inDuration: 0.22, outDuration: 0.16 }
    },
    {
      key: "bold-outline",
      name: "Bold Outline",
      category: "animated",
      description: "Thick stroke pop-in",
      words: ["Bold", "Move"],
      style: { fontSize: 92, fillColor: [1, 1, 1], strokeColor: [0, 0, 0], strokeWidth: 10, positionY: 0.72, tracking: -5, maxWordsPerLine: 3, allCaps: true },
      shadow: { enabled: false },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.05, overshoot: 116 }
    },
    {
      key: "gradient-text",
      name: "Gradient Text",
      category: "basic",
      description: "Rainbow gradient fill",
      words: ["Rainbow", "Text"],
      style: { fontSize: 88, fillColor: [0.95, 0.22, 1], strokeColor: [0.04, 0.02, 0.08], strokeWidth: 3, positionY: 0.70, tracking: -4, maxWordsPerLine: 3, allCaps: true },
      shadow: { enabled: true, opacity: 60, distance: 0, softness: 28 },
      animation: { type: "fade", inDuration: 0.12, outDuration: 0.08 }
    },
    {
      key: "gravity-drop",
      name: "Gravity Drop",
      category: "animated",
      description: "Fall + bounce physics",
      words: ["Drop", "Down"],
      style: { fontSize: 90, fillColor: [1, 1, 1], strokeColor: [0.03, 0.03, 0.04], strokeWidth: 5, positionY: 0.72, tracking: -4, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 48, distance: 8, softness: 16 },
      animation: { type: "bounce", inDuration: 0.16, outDuration: 0.08, overshoot: 124 }
    },
    {
      key: "gradient-pill",
      name: "Gradient Pill",
      category: "basic",
      description: "Gradient background box",
      words: ["Pill", "Style"],
      style: { fontSize: 70, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.74, tracking: -2, maxWordsPerLine: 4 },
      background: { enabled: true, color: [0.48, 0.26, 1], opacity: 92, paddingX: 22, paddingY: 10, radius: 28 },
      shadow: { enabled: true, opacity: 38, distance: 4, softness: 16 },
      animation: { type: "pop", inDuration: 0.10, outDuration: 0.06, overshoot: 108 }
    },
    {
      key: "letter-rise",
      name: "Letter Rise",
      category: "animated",
      description: "Characters float up one by one",
      words: ["Rise", "Letters"],
      style: { fontSize: 84, fillColor: [1, 1, 1], strokeColor: [0.02, 0.02, 0.04], strokeWidth: 4, positionY: 0.70, tracking: -2, maxWordsPerLine: 3 },
      shadow: { enabled: true, opacity: 45, distance: 4, softness: 18 },
      animation: { type: "rise-color", inDuration: 0.16, outDuration: 0.06, fromOffsetY: 68, fromScale: 94, fromOpacity: 12, fromFillColor: [0.72, 0.2, 1], toFillColor: [1, 1, 1], easeInfluence: 86 }
    },
    {
      key: "progress-bar",
      name: "Word Fill",
      category: "animated",
      description: "Background fills up word by word",
      words: ["Word", "Fill"],
      style: { fontSize: 78, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.74, tracking: -3, maxWordsPerLine: 4 },
      background: { enabled: true, applyTo: "active", color: [0.18, 0.48, 1], opacity: 90, paddingX: 14, paddingY: 7, radius: 4 },
      shadow: { enabled: true, opacity: 34, distance: 4, softness: 12 },
      animation: { type: "fade", inDuration: 0.06, outDuration: 0.05 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 1, 1], activeStrokeColor: [1, 1, 1], activeStrokeWidth: 0, activeScale: 106 },
      reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
    },
    {
      key: "bubble",
      name: "Bubble",
      category: "basic",
      description: "Speech bubble",
      words: ["Say", "This"],
      style: { fontSize: 70, fillColor: [0.05, 0.05, 0.07], strokeWidth: 0, positionY: 0.72, tracking: -2, maxWordsPerLine: 4 },
      background: { enabled: true, color: [1, 1, 1], opacity: 96, paddingX: 24, paddingY: 12, radius: 26 },
      shadow: { enabled: true, opacity: 30, distance: 5, softness: 18 },
      animation: { type: "bounce", inDuration: 0.12, outDuration: 0.07, overshoot: 112 }
    },
    {
      key: "outline-box",
      name: "Outline Box",
      category: "basic",
      description: "Clean stroke border",
      words: ["Clean", "Box"],
      style: { fontSize: 72, fillColor: [1, 1, 1], strokeColor: [0.08, 0.1, 0.16], strokeWidth: 4, positionY: 0.74, tracking: -2, maxWordsPerLine: 4 },
      background: { enabled: true, color: [0.02, 0.025, 0.04], opacity: 40, paddingX: 20, paddingY: 9, radius: 4 },
      shadow: { enabled: false },
      animation: { type: "fade", inDuration: 0.10, outDuration: 0.08 }
    },
    {
      key: "shadow-box",
      name: "Shadow Box",
      category: "basic",
      description: "3D sticker with offset shadow",
      words: ["Sticker", "Box"],
      style: { fontSize: 74, fillColor: [0.05, 0.04, 0.08], strokeWidth: 0, positionY: 0.74, tracking: -3, maxWordsPerLine: 3, allCaps: true },
      background: { enabled: true, color: [1, 0.95, 0.1], opacity: 96, paddingX: 20, paddingY: 9, radius: 8 },
      shadow: { enabled: true, opacity: 55, distance: 8, softness: 0 },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.05, overshoot: 112 }
    },
    {
      key: "word-bubble",
      name: "Word Bubble",
      category: "basic",
      description: "Highlights each word with animated bubble",
      words: ["Word", "Bubble"],
      style: { fontSize: 78, fillColor: [0.55, 0.56, 0.64], strokeWidth: 0, positionY: 0.72, tracking: -3, maxWordsPerLine: 4 },
      background: { enabled: true, applyTo: "active", color: [1, 1, 1], opacity: 96, paddingX: 16, paddingY: 8, radius: 22 },
      shadow: { enabled: true, opacity: 35, distance: 4, softness: 14 },
      animation: { type: "pop", inDuration: 0.08, outDuration: 0.05, overshoot: 110 },
      highlight: { enabled: true, mode: "word", activeFillColor: [0.05, 0.05, 0.08], activeStrokeColor: [0.05, 0.05, 0.08], activeStrokeWidth: 0, activeScale: 108 },
      reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
    },
    {
      key: "underline-track",
      name: "Underline",
      category: "animated",
      description: "Line follows each word",
      words: ["Track", "This"],
      style: { fontSize: 78, fillColor: [1, 1, 1], strokeWidth: 0, positionY: 0.70, tracking: -3, maxWordsPerLine: 4 },
      background: { enabled: true, applyTo: "active", color: [0.9, 0.18, 1], opacity: 92, paddingX: 10, paddingY: 2, radius: 2 },
      shadow: { enabled: true, opacity: 34, distance: 3, softness: 12 },
      animation: { type: "fade", inDuration: 0.06, outDuration: 0.05 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 1, 1], activeStrokeColor: [1, 1, 1], activeStrokeWidth: 0, activeScale: 104 },
      reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
    },
    {
      key: "word-spotlight",
      name: "Spotlight",
      category: "animated",
      description: "Active word lights up, rest dimmed",
      words: ["Watch", "Me"],
      style: { fontSize: 82, fillColor: [0.34, 0.34, 0.4], strokeWidth: 0, positionY: 0.72, tracking: -3, maxWordsPerLine: 4 },
      shadow: { enabled: true, opacity: 42, distance: 4, softness: 18 },
      animation: { type: "fade", inDuration: 0.08, outDuration: 0.06 },
      highlight: { enabled: true, mode: "word", activeFillColor: [1, 1, 1], activeStrokeColor: [1, 1, 1], activeStrokeWidth: 0, activeScale: 108 },
      reveal: { type: "spotlight", minWordsPerLayer: 1, mode: "active-word" }
    }
  ];

  var state = {
    busy: false,
    pollTimer: null,
    progressTimer: null,
    currentJobId: "",
    lastCaptionsPath: "",
    outputsDir: "",
    modelCacheDir: "",
    autoOutputDir: "",
    activeTab: "transcribe",
    selectedMode: "three",
    precisionAvailable: false,
    timingModeInitialized: false,
    presets: [],
    selectedPresetId: "builtin.basic",
    exportSeparatedJSON: true,
    editorSourcePath: "",
    editorLoaded: false,
    editorWords: [],
    manualMode: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function list(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  function log(message, isError) {
    if (!window.console) {
      return;
    }
    if (isError && console.error) {
      console.error("[Captions] " + message);
      return;
    }
    if (console.log) {
      console.log("[Captions] " + message);
    }
  }

  function setBusy(nextBusy) {
    var wasBusy = state.busy;
    state.busy = nextBusy;
    $("runTranscription").disabled = nextBusy;
    $("importCaptions").disabled = nextBusy;
    $("savePresetFromLayer").disabled = nextBusy;
    $("importPreset").disabled = nextBusy;
    $("exportPreset").disabled = nextBusy;
    $("deletePreset").disabled = nextBusy;
    if (nextBusy && !wasBusy) {
      setProgressState("running", 1);
    }
    if (!nextBusy) {
      updatePresetMeta();
    }
  }

  function setHelperStatus(mode, text) {
    var node = $("helperStatus");
    node.className = "status-chip";
    if (mode === "ok") {
      node.className += " status-ok";
    } else if (mode === "error") {
      node.className += " status-error";
    } else {
      node.className += " status-warn";
    }
    node.textContent = text;
  }

  function updateJobSummary(text) {
    if ($("helperStatus")) {
      $("helperStatus").title = text || "";
    }
  }

  function errorMessage(error, fallback) {
    var message = error && error.message ? error.message : String(error || "");
    message = message.replace(/^Error:\s*/i, "");
    return message || fallback || "Something went wrong.";
  }

  function showEditorLoadError(error, fallback) {
    var message = errorMessage(error, fallback);
    state.editorLoaded = false;
    state.editorWords = [];
    $("editorStats").textContent = message;
    $("editorStats").title = message;
    if (!$("transcriptEditor").value) {
      $("transcriptEditor").placeholder = message;
    }
    renderTimestampGutter();
    updateJobSummary(message);
    log(message, true);
  }

  function shouldRetryLatestAnalysis(error) {
    var message = errorMessage(error, "");
    return /no segments|file not found|could not open/i.test(message);
  }

  function forgetCaptionsPath() {
    state.lastCaptionsPath = "";
    state.editorSourcePath = "";
    state.editorLoaded = false;
    if ($("captionsJsonPath")) {
      $("captionsJsonPath").value = "";
    }
  }

  function clearProgressTimer() {
    if (!state.progressTimer) {
      return;
    }
    clearTimeout(state.progressTimer);
    state.progressTimer = null;
  }

  function setProgressState(mode, progress) {
    var node = $("jobProgress");
    clearProgressTimer();

    if (!node) {
      return;
    }

    progress = clamp(Number(progress) || 0, 0, 100);
    node.style.setProperty("--progress", progress / 100);
    node.className = "progress-line";
    if (!mode || mode === "idle") {
      return;
    }

    if (mode === "running") {
      node.classList.add("is-running");
      return;
    }

    if (mode === "complete") {
      node.style.setProperty("--progress", 1);
      node.classList.add("is-complete");
    } else if (mode === "error") {
      node.style.setProperty("--progress", 1);
      node.classList.add("is-error");
    }

    state.progressTimer = setTimeout(function () {
      if (!state.busy) {
        node.className = "progress-line";
      }
    }, 1500);
  }

  function openSettings() {
    $("settingsModal").classList.remove("is-hidden");
  }

  function closeSettings() {
    $("settingsModal").classList.add("is-hidden");
  }

  function openStyles() {
    $("stylesModal").classList.remove("is-hidden");
    renderStyleGrid();
    applyPresetPreview(selectedPresetRecord());
  }

  function closeStyles() {
    $("stylesModal").classList.add("is-hidden");
  }

  function activateTab(tabName) {
    state.activeTab = tabName;

    list(".main-tab").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-tab") === tabName);
    });

    list(".panel").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.getAttribute("data-panel") === tabName);
    });

    if (tabName === "editor" && !state.editorLoaded && !state.busy) {
      loadTranscriptEditor();
    }
  }

  function request(method, path, payload, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, HELPER_URL + path, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }

      var data = null;
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch (error) {
          callback(new Error("Invalid JSON response from helper"));
          return;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        callback(null, data);
        return;
      }

      callback(new Error(data && data.error ? data.error : ("HTTP " + xhr.status)));
    };
    xhr.onerror = function () {
      callback(new Error("Could not connect to helper at " + HELPER_URL));
    };
    xhr.send(payload ? JSON.stringify(payload) : null);
  }

  function jsxString(value) {
    return "'" + String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n") + "'";
  }

  function evalHost(functionName, args, callback) {
    var payload = [];
    var i;
    var script;
    for (i = 0; i < args.length; i += 1) {
      payload.push(jsxString(args[i]));
    }
    script = functionName + "(" + payload.join(", ") + ")";
    if (JSX_PATH) {
      script = "$.evalFile(new File(" + jsxString(JSX_PATH) + "));" + script;
    }
    cs.evalScript(script, function (result) {
      if (result === "EvalScript error.") {
        callback(new Error("ExtendScript returned an error"));
        return;
      }

      try {
        callback(null, JSON.parse(result));
      } catch (error) {
        callback(new Error(result || "Invalid ExtendScript response"));
      }
    });
  }

  function readDialogPath(dialogResult) {
    if (!dialogResult || dialogResult.err) {
      return "";
    }
    if (!dialogResult.data || !dialogResult.data.length) {
      return "";
    }
    return dialogResult.data[0];
  }

  function dirname(path) {
    var normalized = String(path || "").replace(/\\/g, "/");
    var index = normalized.lastIndexOf("/");
    if (index <= 0) {
      return "";
    }
    return normalized.slice(0, index);
  }

  function formatBytes(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    if (bytes >= 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return bytes + " B";
  }

  function formatTimestamp(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    var minutes = Math.floor(seconds / 60);
    var rest = seconds - minutes * 60;
    var whole = Math.floor(rest);
    var centis = Math.floor((rest - whole) * 100);
    return String(minutes).padStart(2, "0") + ":" +
      String(whole).padStart(2, "0") + "." +
      String(centis).padStart(2, "0");
  }

  function summarizeJobError(message) {
    var text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return "Job failed";
    }
    if (text.indexOf("LocalEntryNotFoundError") !== -1 || text.indexOf("local_files_only") !== -1) {
      return "Model cache missing";
    }
    if (text.indexOf("No space left on device") !== -1) {
      return "Disk full";
    }
    if (text.indexOf("ffmpeg") !== -1 || text.indexOf("audio extraction") !== -1) {
      return "Audio export failed";
    }
    return "Job failed";
  }

  function loadAISettings() {
    var savedProvider = "";
    var savedModel = "";
    try {
      savedProvider = window.localStorage ? localStorage.getItem("captionsV03.aiProvider") : "";
      savedModel = window.localStorage ? localStorage.getItem("captionsV03.aiModel") : "";
    } catch (error) {}
    if (savedProvider && $("aiProvider")) {
      $("aiProvider").value = savedProvider;
    }
    if (savedModel && $("aiModel")) {
      $("aiModel").setAttribute("data-preferred-model", savedModel);
    }
  }

  function saveAISettings() {
    try {
      if (!window.localStorage) {
        return;
      }
      localStorage.setItem("captionsV03.aiProvider", $("aiProvider").value);
      localStorage.setItem("captionsV03.aiModel", $("aiModel").value);
    } catch (error) {}
  }

  function activeSourceType() {
    var selected = document.querySelector("input[name='sourceType']:checked");
    return selected ? selected.value : "file";
  }

  function destinationType() {
    var selected = document.querySelector("input[name='destinationType']:checked");
    return selected ? selected.value : "active-comp";
  }

  function selectedWordsPerLayer() {
    if (state.selectedMode === "custom") {
      return clamp(parseInt($("customWordsPerLayer").value, 10) || 6, 1, 20);
    }
    return MODE_CONFIG[state.selectedMode].wordsPerLayer;
  }

  function selectedCaptionConfig() {
    var config = MODE_CONFIG[state.selectedMode];
    return {
      captionMode: config.captionMode,
      wordsPerLayer: selectedWordsPerLayer()
    };
  }

  function legatoEnabled() {
    return !!$("legatoToggle").checked;
  }

  function exportSeparatedEnabled() {
    return !!state.exportSeparatedJSON;
  }

  function loadExportSeparatedSetting() {
    var saved = "";
    try {
      saved = window.localStorage ? localStorage.getItem("captionsV03.exportSeparatedJSON") : "";
    } catch (error) {}

    state.exportSeparatedJSON = saved === null || saved === "" ? true : saved !== "false";
    syncExportSeparatedToggles();
  }

  function saveExportSeparatedSetting(value) {
    state.exportSeparatedJSON = !!value;
    try {
      if (window.localStorage) {
        localStorage.setItem("captionsV03.exportSeparatedJSON", state.exportSeparatedJSON ? "true" : "false");
      }
    } catch (error) {}
    syncExportSeparatedToggles();
  }

  function syncExportSeparatedToggles() {
    if ($("exportSeparatedToggle")) {
      $("exportSeparatedToggle").checked = state.exportSeparatedJSON;
    }
    if ($("settingsExportSeparatedToggle")) {
      $("settingsExportSeparatedToggle").checked = state.exportSeparatedJSON;
    }
  }

  function clonePreset(preset) {
    return JSON.parse(JSON.stringify(preset || {}));
  }

  function mergeObject(base, override) {
    var output = {};
    var key;
    base = base || {};
    override = override || {};
    for (key in base) {
      if (base.hasOwnProperty(key)) {
        output[key] = base[key];
      }
    }
    for (key in override) {
      if (override.hasOwnProperty(key)) {
        output[key] = override[key];
      }
    }
    return output;
  }

  function autoCaptionPresetRecord(spec) {
    var defaultStyle = {
      fontSize: 76,
      fillColor: [1, 1, 1],
      strokeColor: [0, 0, 0],
      strokeWidth: 0,
      positionY: 0.74,
      tracking: 0,
      leading: 0,
      maxWordsPerLine: 3,
      allCaps: false
    };
    var preset = {
      version: 2,
      name: spec.name,
      description: spec.description || "",
      category: spec.category || "basic",
      previewWords: spec.words || [],
      autoCaptionStyle: spec.key,
      style: mergeObject(defaultStyle, spec.style),
      background: mergeObject({ enabled: false }, spec.background),
      shadow: mergeObject({ enabled: false }, spec.shadow),
      animation: mergeObject({ type: "none", inDuration: 0.08, outDuration: 0.06 }, spec.animation),
      highlight: mergeObject({ enabled: false, mode: "none" }, spec.highlight)
    };

    if (spec.reveal) {
      preset.reveal = spec.reveal;
    }

    return normalizePresetRecord({
      id: "builtin.autocaption." + spec.key,
      source: "builtin",
      preset: preset
    });
  }

  function autoCaptionPresetRecords() {
    var records = [];
    var i;
    for (i = 0; i < AUTOCAPTION_STYLE_SPECS.length; i += 1) {
      records.push(autoCaptionPresetRecord(AUTOCAPTION_STYLE_SPECS[i]));
    }
    return records;
  }

  function normalizePresetRecord(record) {
    if (!record || !record.preset) {
      return null;
    }
    var preset = record.preset;
    if (!preset.name) {
      preset.name = "Untitled Preset";
    }
    return {
      id: record.id || ("user." + preset.name),
      source: record.source || "user",
      path: record.path || "",
      preset: preset
    };
  }

  function selectedPresetRecord() {
    var i;
    for (i = 0; i < state.presets.length; i += 1) {
      if (state.presets[i].id === state.selectedPresetId) {
        return state.presets[i];
      }
    }
    return state.presets.length ? state.presets[0] : null;
  }

  function selectedPresetJSON() {
    var record = selectedPresetRecord();
    var preset;
    if (!record) {
      return "{}";
    }
    preset = clonePreset(record.preset);
    if (preset.mogrt && preset.mogrt.templatePath && EXTENSION_ROOT && preset.mogrt.templatePath.indexOf("/") !== 0) {
      preset.mogrt.templatePath = EXTENSION_ROOT + "/" + preset.mogrt.templatePath;
    }
    return JSON.stringify(preset);
  }

  function colorToCSS(color, fallback) {
    if (!color || color.length < 3) {
      return fallback;
    }
    return "rgb(" +
      clamp(Math.round(Number(color[0]) * 255), 0, 255) + ", " +
      clamp(Math.round(Number(color[1]) * 255), 0, 255) + ", " +
      clamp(Math.round(Number(color[2]) * 255), 0, 255) + ")";
  }

  function colorToRGBA(color, opacity, fallback) {
    if (!color || color.length < 3) {
      return fallback;
    }
    return "rgba(" +
      clamp(Math.round(Number(color[0]) * 255), 0, 255) + ", " +
      clamp(Math.round(Number(color[1]) * 255), 0, 255) + ", " +
      clamp(Math.round(Number(color[2]) * 255), 0, 255) + ", " +
      clamp(Number(opacity) || 0, 0, 100) / 100 + ")";
  }

  function presetAnimationType(preset) {
    return preset && preset.animation && preset.animation.type ? preset.animation.type : "none";
  }

  function presetHighlightOn(preset) {
    return !!(preset && preset.highlight && preset.highlight.enabled);
  }

  function presetHasBox(preset) {
    return !!(preset && preset.background && preset.background.enabled);
  }

  function presetPreviewAsset(record) {
    if (!record || !record.preset) {
      return "";
    }
    return record.preset.previewAnimation || record.preset.previewImage || "";
  }

  function presetPreviewAnimationAsset(record) {
    return record && record.preset ? (record.preset.previewAnimation || "") : "";
  }

  function presetPreviewStillAsset(record) {
    return record && record.preset ? (record.preset.previewImage || "") : "";
  }

  function presetCardPreviewAsset(record) {
    return presetPreviewStillAsset(record) || presetPreviewAnimationAsset(record) || "";
  }

  function presetStagePreviewAsset(record) {
    return presetPreviewAnimationAsset(record) || presetPreviewStillAsset(record) || "";
  }

  function previewAssetType(asset) {
    var normalized = String(asset || "").split("?")[0].toLowerCase();
    if (/\.mp4$|\.webm$|\.mov$|\.m4v$/.test(normalized)) {
      return "video";
    }
    return "image";
  }

  function clearPreviewMedia(imageNode, videoNode) {
    if (imageNode) {
      imageNode.removeAttribute("src");
      imageNode.classList.add("is-hidden");
    }
    if (videoNode) {
      try {
        videoNode.pause();
      } catch (pauseError) {}
      videoNode.removeAttribute("src");
      videoNode.load();
      videoNode.classList.add("is-hidden");
    }
  }

  function setPreviewMedia(imageNode, videoNode, asset, alt) {
    clearPreviewMedia(imageNode, videoNode);
    if (!asset) {
      return false;
    }
    if (previewAssetType(asset) === "video") {
      if (!videoNode) {
        return false;
      }
      videoNode.src = asset;
      videoNode.setAttribute("aria-label", alt || "Preset preview");
      videoNode.classList.remove("is-hidden");
      try {
        videoNode.currentTime = 0;
        videoNode.play();
      } catch (playError) {}
      return true;
    }
    if (!imageNode) {
      return false;
    }
    imageNode.src = asset;
    imageNode.alt = alt || "Preset preview";
    imageNode.classList.remove("is-hidden");
    return true;
  }

  function presetIsMogrt(record) {
    return !!(record && record.preset && record.preset.mogrt && record.preset.mogrt.enabled);
  }

  function presetIsBasic(record) {
    return !!record && record.id === "builtin.basic";
  }

  function presetReveal(record) {
    return record && record.preset && record.preset.reveal ? record.preset.reveal : {};
  }

  function presetIsTypewriter(record) {
    return presetReveal(record).type === "typewriter";
  }

  function presetIsSpotlight(record) {
    return presetReveal(record).type === "spotlight";
  }

  function presetTypewriterMinWords(record) {
    return parseInt(presetReveal(record).minWordsPerLayer, 10) || 3;
  }

  function presetTypewriterAvailable(record) {
    if (record && record.preset && presetAnimationType(record.preset) === "rise-color") {
      return true;
    }
    return presetIsTypewriter(record) && state.selectedMode !== "sentences" && previewWordCount() >= presetTypewriterMinWords(record);
  }

  function previewWordCount() {
    if (state.selectedMode === "sentences") {
      return 6;
    }
    return selectedWordsPerLayer();
  }

  function previewWordCountLabel() {
    if (state.selectedMode === "sentences") {
      return "Sentence";
    }
    return previewWordCount() + (previewWordCount() === 1 ? " word" : " words");
  }

  function applyPreviewLineBreaks(text, record) {
    var preset = record && record.preset ? record.preset : {};
    var style = preset.style || {};
    var maxWordsPerLine = parseInt(style.maxWordsPerLine, 10) || 0;
    if (maxWordsPerLine < 1) {
      return text;
    }

    var words = String(text || "").split(/\s+/);
    var lines = [];
    var i;
    for (i = 0; i < words.length; i += maxWordsPerLine) {
      lines.push(words.slice(i, i + maxWordsPerLine).join(" "));
    }
    return lines.join("\n");
  }

  function sampleTextForPreset(record) {
    var count = Math.max(1, Math.min(previewWordCount(), 7));
    var pool = presetIsBasic(record)
      ? ["Lorem", "ipsum", "dolor", "sit", "amet"]
      : ["Lorem", "ipsum", "dolor", "sit", "amet", "nunc"];
    if (presetIsTypewriter(record)) {
      pool = ["Words", "show", "up", "with", "real", "timing", "now"];
    }
    if (presetIsSpotlight(record)) {
      pool = ["Your", "best", "offer", "wins", "today"];
    }
    if (record && record.preset && record.preset.previewWords && record.preset.previewWords.length) {
      pool = record.preset.previewWords;
    }
    if (presetHasBox(record && record.preset)) {
      pool = ["Work", "hard", "to", "get", "what", "you", "like"];
    }
    if (presetIsSpotlight(record)) {
      return applyPreviewLineBreaks("Spotlight", record);
    }
    if (presetIsTypewriter(record) && presetReveal(record).mode === "active-word") {
      return applyPreviewLineBreaks(count < 3 ? "3+ words" : "Pro", record);
    }
    if (presetIsBasic(record)) {
      return applyPreviewLineBreaks(pool.slice(0, Math.min(count, 3)).join(" "), record);
    }
    if (presetHasBox(record && record.preset) && count === 1) {
      return applyPreviewLineBreaks("Lorem", record);
    }
    return applyPreviewLineBreaks(pool.slice(0, count).join(" "), record);
  }

  function presetMetaText(record) {
    var preset = record ? record.preset : {};
    var animationType = presetAnimationType(preset);
    var parts = [];
    if (presetIsMogrt(record)) {
      parts.push("MOGRT template");
      if (preset.mogrt && preset.mogrt.sourceMogrt) {
        parts.push(preset.mogrt.sourceMogrt);
      }
      parts.push(preset.mogrt && preset.mogrt.forceFont ? "Poppins Bold" : "Template font");
      parts.push(preset.previewAnimation ? "Animated preview" : (preset.previewImage ? "Static preview" : "Live text preview"));
      return parts.join(". ") + ".";
    }
    parts.push(presetIsBasic(record) ? "Original clean text" : (record && record.source === "builtin" ? "Built-in style" : "User style"));
    if (preset.description) {
      parts.push(preset.description);
    }
    if (animationType === "rise-color") {
      parts.push("Rise color works in all modes");
    } else if (presetIsSpotlight(record)) {
      parts.push("Spotlight active word");
    } else if (presetIsTypewriter(record)) {
      parts.push(presetTypewriterAvailable(record) ? "Typewriter reveal" : "Typewriter requires 3+ words");
    }
    parts.push(animationType === "none" ? "No motion" : animationType + " motion");
    parts.push(presetHighlightOn(preset) ? "Word highlight" : "No highlight");
    return parts.join(". ") + ".";
  }

  function resetPreviewAnimation(node) {
    node.classList.remove("anim-pop");
    node.classList.remove("anim-bounce");
    node.classList.remove("anim-slide-up");
    node.classList.remove("anim-fade");
    node.classList.remove("anim-typewriter");
    node.classList.remove("anim-rise-color");
  }

  function previewAnimationClass(animationType) {
    if (animationType === "pop" || animationType === "bounce" || animationType === "slide-up" || animationType === "fade" || animationType === "rise-color") {
      return "anim-" + animationType;
    }
    return "";
  }

  function applyPreviewStyle(node, record, scale, animate) {
    var preset = record && record.preset ? record.preset : {};
    var style = preset.style || {};
    var background = preset.background || {};
    var shadow = preset.shadow || {};
    var animation = preset.animation || {};
    var strokeWidth = Math.max(0, Math.round((Number(style.strokeWidth) || 0) * (scale || 0.2)));
    var fontSize = Math.min(54, Math.max(16, Math.round((Number(style.fontSize) || 72) * (scale || 0.58))));
    var tracking = Math.max(-3, Math.min(5, (Number(style.tracking) || 0) / 18));
    var backgroundPadY = Math.max(3, Math.round((Number(background.paddingY) || 14) * 0.24));
    var backgroundPadX = Math.max(7, Math.round((Number(background.paddingX) || 28) * 0.24));
    var backgroundRadius = Math.max(4, Math.round((Number(background.radius) || 18) * 0.36));
    var shadowOpacity = clamp(Number(shadow.opacity) || 0, 0, 100) / 100;
    var shadowDistance = Math.max(1, Math.round((Number(shadow.distance) || 4) * 0.5));
    var shadowSoftness = Math.max(2, Math.round((Number(shadow.softness) || 12) * 0.45));
    var animationType = presetAnimationType(preset);
    var animationClass = presetIsTypewriter(record) ? "anim-typewriter" : previewAnimationClass(animationType);
    if (animationType === "rise-color") {
      animationClass = "anim-rise-color";
    }

    node.style.setProperty("--preview-fill", colorToCSS(style.fillColor, "#ffffff"));
    node.style.setProperty("--preview-rise-fill", colorToCSS(animation.fromFillColor, "#b866ff"));
    node.style.setProperty("--preview-stroke", colorToCSS(style.strokeColor, "#000000"));
    node.style.setProperty("--preview-stroke-width", strokeWidth + "px");
    node.style.setProperty("--preview-size", fontSize + "px");
    node.style.setProperty("--preview-transform", style.allCaps ? "uppercase" : "none");
    node.style.setProperty("--preview-tracking", tracking + "px");
    node.style.setProperty("--preview-box-bg", background.enabled ? colorToRGBA(background.color, background.opacity, "rgba(0, 0, 0, 0.78)") : "transparent");
    node.style.setProperty("--preview-box-padding", background.enabled ? backgroundPadY + "px " + backgroundPadX + "px" : "0");
    node.style.setProperty("--preview-box-radius", background.enabled ? backgroundRadius + "px" : "0");
    node.style.setProperty("--preview-shadow", shadow.enabled ? "0 " + shadowDistance + "px " + shadowSoftness + "px rgba(0, 0, 0, " + shadowOpacity + ")" : "none");

    resetPreviewAnimation(node);
    if (animate && animationClass) {
      node.classList.add(animationClass);
    }
  }

  function setStyleBadges(container, record) {
    var preset = record ? record.preset : {};
    var animationType = presetAnimationType(preset);
    var highlightOn = presetHighlightOn(preset);
    var badges = [
      { text: presetIsMogrt(record) ? "MOGRT" : (presetIsBasic(record) ? "Basic" : (record && record.source === "builtin" ? "Built-in" : "User")), on: true },
      { text: previewWordCountLabel(), on: false },
      { text: presetIsMogrt(record) ? "Template" : (animationType === "rise-color" ? "Rise Color" : (presetIsTypewriter(record) ? (presetTypewriterAvailable(record) ? "Typewriter" : "Needs " + presetTypewriterMinWords(record) + "+") : "")), on: presetIsMogrt(record) || animationType === "rise-color" || presetTypewriterAvailable(record) },
      { text: presetIsMogrt(record) ? "Original Motion" : (animationType === "none" ? "No Motion" : animationType), on: presetIsMogrt(record) || animationType !== "none" },
      { text: highlightOn ? "Highlight" : "No Highlight", on: highlightOn }
    ];

    if (presetHasBox(preset)) {
      badges.push({ text: "Box", on: true });
    }

    container.innerHTML = "";
    badges.forEach(function (badge) {
      if (!badge.text) {
        return;
      }
      var node = document.createElement("span");
      node.textContent = badge.text;
      if (badge.on) {
        node.className = "is-on";
      }
      container.appendChild(node);
    });
  }

  function applyPresetPreview(record) {
    var nameNode = $("selectedStyleName");
    var metaNode = $("selectedStyleMeta");
    var sampleNode = $("selectedStyleSample");
    var previewNode = $("stylePreviewText");
    var previewImageNode = $("stylePreviewImage");
    var previewVideoNode = $("stylePreviewVideo");
    var previewBadges = $("stylePreviewBadges");
    var sampleText = sampleTextForPreset(record);
    var hasMedia = false;

    if (nameNode) {
      nameNode.textContent = record && record.preset ? record.preset.name : "No Style";
    }
    if (metaNode) {
      metaNode.textContent = presetMetaText(record);
    }
    if (sampleNode) {
      sampleNode.textContent = sampleText;
      applyPreviewStyle(sampleNode, record, 0.22, false);
    }
    if (previewNode) {
      previewNode.textContent = sampleText;
      applyPreviewStyle(previewNode, record, 0.62, true);
      hasMedia = setPreviewMedia(previewImageNode, previewVideoNode, presetStagePreviewAsset(record), record && record.preset ? record.preset.name : "Preset preview");
      previewNode.classList.toggle("is-hidden", hasMedia);
    }
    if (previewBadges) {
      setStyleBadges(previewBadges, record);
    }
  }

  function selectPreset(recordId) {
    state.selectedPresetId = recordId;
    if ($("presetSelect")) {
      $("presetSelect").value = recordId;
    }
    updatePresetMeta();
    renderStyleGrid();
  }

  function renderStyleGrid() {
    var grid = $("styleGrid");
    if (!grid) {
      return;
    }

    grid.innerHTML = "";
    state.presets.forEach(function (record) {
      var button = document.createElement("button");
      var preview = document.createElement("span");
      var previewText = document.createElement("span");
      var previewMedia = null;
      var title = document.createElement("strong");
      var badges = document.createElement("span");
      var cardPreviewAsset = presetCardPreviewAsset(record);

      button.type = "button";
      button.className = "style-card";
      if (record.id === state.selectedPresetId) {
        button.classList.add("is-active");
      }
      button.setAttribute("data-preset-id", record.id);
      button.addEventListener("click", function () {
        selectPreset(record.id);
        applyPresetPreview(record);
      });

      preview.className = "style-card-preview";
      previewText.textContent = sampleTextForPreset(record);
      applyPreviewStyle(previewText, record, 0.28, false);
      if (cardPreviewAsset) {
        preview.classList.add("has-media");
        previewText.classList.add("is-hidden");
        previewMedia = document.createElement(previewAssetType(cardPreviewAsset) === "video" ? "video" : "img");
        previewMedia.className = "style-card-preview-media";
        if (previewMedia.tagName === "VIDEO") {
          previewMedia.src = cardPreviewAsset;
          previewMedia.autoplay = true;
          previewMedia.loop = true;
          previewMedia.muted = true;
          previewMedia.playsInline = true;
        } else {
          previewMedia.src = cardPreviewAsset;
          previewMedia.alt = record.preset.name + " preview";
        }
        preview.appendChild(previewMedia);
      }
      preview.appendChild(previewText);

      title.textContent = record.preset.name;
      badges.className = "style-card-badges";
      setStyleBadges(badges, record);

      button.appendChild(preview);
      button.appendChild(title);
      button.appendChild(badges);
      grid.appendChild(button);
    });
  }

  function updatePresetMeta() {
    var record = selectedPresetRecord();
    var preset = record ? record.preset : {};
    var labels = $("presetMeta") ? $("presetMeta").getElementsByTagName("span") : [];
    var animationType = preset.animation && preset.animation.type ? preset.animation.type : "none";
    var highlightOn = !!(preset.highlight && preset.highlight.enabled);
    if (labels.length >= 3) {
      labels[0].textContent = preset.name ? "Style" : "No Preset";
      labels[0].className = preset.name ? "is-on" : "";
      labels[1].textContent = animationType === "none" ? "No Motion" : animationType;
      labels[1].className = animationType === "none" ? "" : "is-on";
      labels[2].textContent = highlightOn ? "Highlight" : "No Highlight";
      labels[2].className = highlightOn ? "is-on" : "";
    }
    if ($("presetHint")) {
      $("presetHint").textContent = presetIsMogrt(record)
        ? "MOGRT template. Creates direct text layers with adaptive keyframes and real media preview."
        : presetIsBasic(record)
        ? "Clean Poppins Bold text with no motion."
        : (record && record.source === "builtin"
          ? "Built-in visual preset. Open Styles to preview or export."
          : "User preset stored in Captions v03.");
    }
    if ($("deletePreset")) {
      $("deletePreset").disabled = !record || record.source !== "user";
    }
    applyPresetPreview(record);
  }

  function renderPresets() {
    var select = $("presetSelect");
    var i;
    if (!select) {
      updatePresetMeta();
      renderStyleGrid();
      return;
    }
    select.innerHTML = "";
    for (i = 0; i < state.presets.length; i += 1) {
      var record = state.presets[i];
      var option = document.createElement("option");
      option.value = record.id;
      option.textContent = (record.source === "mogrt" ? "MOGRT: " : (record.source === "builtin" ? "Built-in: " : "User: ")) + record.preset.name;
      option.selected = record.id === state.selectedPresetId;
      select.appendChild(option);
    }
    if (!selectedPresetRecord() && state.presets.length) {
      state.selectedPresetId = state.presets[0].id;
      select.value = state.selectedPresetId;
    }
    updatePresetMeta();
    renderStyleGrid();
  }

  function builtinPresetRecords() {
    var records = [normalizePresetRecord(JSON.parse(JSON.stringify(BUILTIN_PRESETS[0])))];
    var i;
    for (i = 0; i < MOGRT_PRESETS.length; i += 1) {
      records.push(normalizePresetRecord(mogrtPresetRecord(MOGRT_PRESETS[i])));
    }
    return records;
  }

  function loadPresets() {
    state.presets = builtinPresetRecords();
    renderPresets();
  }

  function savePresetFromLayer() {
    var name = window.prompt ? window.prompt("Preset name", "My Caption Preset") : "My Caption Preset";
    if (!name) {
      return;
    }
    evalHost("captionsV03SaveSelectedLayerAsPreset", [name], function (error, data) {
      if (error || !data || !data.ok) {
        log((error && error.message) || (data && data.error) || "Could not save preset.", true);
        return;
      }
      state.selectedPresetId = data.id || state.selectedPresetId;
      loadPresets();
      log("Preset saved: " + name);
    });
  }

  function importPreset() {
    evalHost("captionsV03ImportPresetFromDialog", [], function (error, data) {
      if (error || !data || !data.ok) {
        log((error && error.message) || (data && data.error) || "Could not import preset.", true);
        return;
      }
      state.selectedPresetId = data.id || state.selectedPresetId;
      loadPresets();
      log("Preset imported.");
    });
  }

  function exportPreset() {
    var record = selectedPresetRecord();
    if (!record) {
      return;
    }
    evalHost("captionsV03ExportPresetToDialog", [JSON.stringify(record.preset)], function (error, data) {
      if (error || !data || !data.ok) {
        log((error && error.message) || (data && data.error) || "Could not export preset.", true);
        return;
      }
      log("Preset exported.");
    });
  }

  function deletePreset() {
    var record = selectedPresetRecord();
    if (!record || record.source !== "user" || !record.path) {
      return;
    }
    if (window.confirm && !window.confirm("Delete preset '" + record.preset.name + "'?")) {
      return;
    }
    evalHost("captionsV03DeletePreset", [record.path], function (error, data) {
      if (error || !data || !data.ok) {
        log((error && error.message) || (data && data.error) || "Could not delete preset.", true);
        return;
      }
      state.selectedPresetId = "builtin.basic";
      loadPresets();
      log("Preset deleted.");
    });
  }

  function selectedTimingMode() {
    var selected = document.querySelector("input[name='timingMode']:checked");
    return selected ? selected.value : "fast";
  }

  function updateTimingHint() {
    if (!$("timingHint")) {
      return;
    }

    if (selectedTimingMode() === "precision") {
      $("timingHint").textContent = state.precisionAvailable
        ? "Precision uses WhisperX forced alignment for the tightest timings."
        : "Precision backend is unavailable on this helper.";
      return;
    }

    $("timingHint").textContent = "Fast uses whisper.cpp and keeps turnaround low.";
  }

  function setTimingMode(modeName) {
    list("input[name='timingMode']").forEach(function (input) {
      input.checked = input.value === modeName;
    });
    updateTimingHint();
  }

  function syncTimingAvailability(isAvailable, status, defaultTimingMode) {
    state.precisionAvailable = !!isAvailable;

    if ($("precisionTimingMode")) {
      $("precisionTimingMode").disabled = !state.precisionAvailable;
    }
    if ($("precisionStatus")) {
      $("precisionStatus").textContent = status || (state.precisionAvailable
        ? "Precision ready."
        : "Precision unavailable on this helper.");
    }

    if (!state.timingModeInitialized) {
      setTimingMode(state.precisionAvailable ? (defaultTimingMode || "precision") : "fast");
      state.timingModeInitialized = true;
      return;
    }

    if (!state.precisionAvailable && selectedTimingMode() === "precision") {
      setTimingMode("fast");
      return;
    }

    updateTimingHint();
  }

  function setMode(modeName) {
    state.selectedMode = modeName;
    state.editorLoaded = false;
    setManualMode(false);

    list(".mode-card").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-mode") === modeName);
    });

    $("customWordsWrap").classList.toggle("is-hidden", modeName !== "custom");

    if (modeName === "custom") {
      $("modeHint").textContent = selectedWordsPerLayer() + " custom words per layer.";
      updatePresetMeta();
      renderStyleGrid();
      if (state.activeTab === "editor") {
        loadTranscriptEditor();
      }
      return;
    }

    $("modeHint").textContent = MODE_CONFIG[modeName].hint;
    updatePresetMeta();
    renderStyleGrid();
    if (state.activeTab === "editor") {
      loadTranscriptEditor();
    }
  }

  function syncDestinationUI() {
    $("compositionNameWrap").classList.toggle("is-hidden", destinationType() !== "new-comp");
  }

  function updateOutputHint(message) {
    $("outputHint").textContent = message;
  }

  function setAutoOutputDir(nextDir) {
    if (!nextDir) {
      return false;
    }
    if (!$("outputDir").value.trim() || $("outputDir").value.trim() === state.autoOutputDir) {
      $("outputDir").value = nextDir;
      state.autoOutputDir = nextDir;
      return true;
    }
    return false;
  }

  function rememberCaptionsPath(path) {
    path = String(path || "").trim();
    if (!path) {
      return;
    }
    state.lastCaptionsPath = path;
    $("captionsJsonPath").value = path;
    state.editorSourcePath = "";
    state.editorLoaded = false;
  }

  function requestLatestCaptions(outputDir, callback) {
    outputDir = String(outputDir || "").trim();
    if (!outputDir) {
      callback(null, null);
      return;
    }

    request("POST", "/latest-captions", {
      outputDir: outputDir,
      includeGlobal: false
    }, function (error, data) {
      if (error) {
        callback(error);
        return;
      }
      if (!data || !data.found || !data.captionsJsonPath) {
        callback(null, null);
        return;
      }
      callback(null, data);
    });
  }

  function hydrateLatestCaptions(outputDir, force) {
    if (!force && ($("captionsJsonPath").value.trim() || state.lastCaptionsPath)) {
      return;
    }

    requestLatestCaptions(outputDir, function (error, data) {
      if (error || !data || !data.captionsJsonPath) {
        return;
      }
      rememberCaptionsPath(data.captionsJsonPath);
      updateOutputHint("Cached analysis loaded. Burn Text can rebuild layers without retranscribing.");
    });
  }

  function requestOutputContext(videoPath, callback) {
    evalHost("captionsV03GetOutputContext", [videoPath || ""], function (error, data) {
      if (error) {
        callback(error);
        return;
      }
      if (!data.ok) {
        callback(new Error(data.error || "Could not resolve output context."));
        return;
      }
      callback(null, data);
    });
  }

  function syncOutputContext(videoPath) {
    requestOutputContext(videoPath, function (error, data) {
      if (error) {
        if (state.outputsDir) {
          setAutoOutputDir(state.outputsDir);
        }
        updateOutputHint("Auto output falls back to the helper workspace folder.");
        return;
      }

      setAutoOutputDir(data.outputDir || state.outputsDir || dirname(videoPath));
      hydrateLatestCaptions($("outputDir").value.trim() || data.outputDir || state.outputsDir || dirname(videoPath), false);

      if (data.projectDir) {
        updateOutputHint("Auto output uses the _Captions folder inside the saved project.");
        return;
      }

      if (data.videoDir) {
        updateOutputHint("Auto output uses the _Captions folder inside the media folder.");
        return;
      }

      updateOutputHint("Auto output falls back to the helper workspace folder.");
    });
  }

  function ensureOutputDir(videoPath, callback) {
    var outputDir = $("outputDir").value.trim();
    if (outputDir) {
      callback(null, outputDir);
      return;
    }

    requestOutputContext(videoPath, function (error, data) {
      var resolved = "";
      if (!error && data && data.outputDir) {
        resolved = data.outputDir;
      } else if (state.outputsDir) {
        resolved = state.outputsDir;
      } else if (videoPath) {
        resolved = dirname(videoPath);
      }

      if (!resolved) {
        callback(new Error("Save the After Effects project or choose an output folder."));
        return;
      }

      $("outputDir").value = resolved;
      state.autoOutputDir = resolved;
      callback(null, resolved);
    });
  }

  function browseVideo() {
    if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialogEx) {
      log("CEP file dialog is not available.", true);
      return;
    }

    var response = window.cep.fs.showOpenDialogEx(
      false,
      false,
      "Select video or audio",
      "",
      ["mp4:mov:m4v:mp3:wav:aiff:aif:flac:ogg"]
    );
    var path = readDialogPath(response);
    if (!path) {
      return;
    }

    $("videoPath").value = path;
    syncOutputContext(path);
  }

  function browseFolder() {
    if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialogEx) {
      log("CEP file dialog is not available.", true);
      return;
    }

    var response = window.cep.fs.showOpenDialogEx(
      false,
      true,
      "Select folder",
      $("outputDir").value || state.outputsDir || "",
      []
    );
    var path = readDialogPath(response);
    if (!path) {
      return;
    }

    $("outputDir").value = path;
    state.autoOutputDir = "";
    updateOutputHint("Manual output folder selected.");
  }

  function browseCaptionsJSON() {
    if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialogEx) {
      log("CEP file dialog is not available.", true);
      return;
    }

    var response = window.cep.fs.showOpenDialogEx(
      false,
      false,
      "Select captions JSON",
      $("outputDir").value || state.outputsDir || "",
      ["json"]
    );
    var path = readDialogPath(response);
    if (!path) {
      return;
    }

    $("captionsJsonPath").value = path;
    rememberCaptionsPath(path);
  }

  function clearCache() {
    if (window.confirm && !window.confirm("Clear generated Captions temp files for this project? Models, presets, media, and .aep files will be kept.")) {
      return;
    }

    function runCleanup(outputDir) {
      var payload = {
        outputDir: outputDir || $("outputDir").value.trim() || state.autoOutputDir || "",
        captionsJsonPath: $("captionsJsonPath").value.trim() || state.lastCaptionsPath || "",
        includeGlobal: true
      };

      setProgressState("running", 8);
      setHelperStatus("ok", "Cleaning");
      updateOutputHint("Clearing generated Captions temp files...");
      request("POST", "/cleanup", payload, function (error, data) {
        if (error) {
          setProgressState("error", 100);
          setHelperStatus("error", "Cleanup failed");
          updateOutputHint(error.message);
          log(error.message, true);
          return;
        }

        setProgressState("complete", 100);
        setHelperStatus("ok", "Helper ready");
        state.lastCaptionsPath = "";
        $("captionsJsonPath").value = "";
        updateOutputHint("Cleared " + (data.deletedFiles || 0) + " files (" + formatBytes(data.deletedBytes || 0) + ").");
        log("Cleanup complete: " + (data.deletedFiles || 0) + " files, " + formatBytes(data.deletedBytes || 0) + ".");
      });
    }

    if ($("outputDir").value.trim() || state.autoOutputDir) {
      runCleanup($("outputDir").value.trim() || state.autoOutputDir);
      return;
    }

    requestOutputContext(activeSourceType() === "comp" ? "" : $("videoPath").value.trim(), function (error, data) {
      runCleanup(!error && data ? data.outputDir : state.outputsDir);
    });
  }

  function syncSourceUI() {
    var isComp = activeSourceType() === "comp";
    $("videoPath").disabled = isComp;
    $("browseVideo").disabled = isComp;
    $("mediaField").classList.toggle("is-hidden", isComp);
    syncOutputContext(isComp ? "" : $("videoPath").value.trim());
  }

  function populateModels(models, defaultModel) {
    var select = $("modelSelect");
    select.innerHTML = "";

    models.filter(function (model) {
      return model.available;
    }).forEach(function (model) {
      var option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.displayName;
      if (model.id === defaultModel) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function populateAIModels(models) {
    var select = $("aiModel");
    var preferred = select.getAttribute("data-preferred-model") || select.value || "";
    select.innerHTML = "";

    (models || []).forEach(function (model) {
      var option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name + (model.size ? " · " + model.size : "");
      if (model.id === preferred) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    if (!select.value && select.options.length) {
      select.options[0].selected = true;
    }
    if (select.value) {
      select.setAttribute("data-preferred-model", select.value);
    }
    saveAISettings();
  }

  function refreshAIModels() {
    if (!$("aiModelStatus")) {
      return;
    }
    $("aiModelStatus").textContent = "Checking Ollama models...";
    request("GET", "/ai-models", null, function (error, data) {
      if (error) {
        $("aiModelStatus").textContent = "Could not load AI models.";
        log(error.message, true);
        return;
      }
      populateAIModels(data.models || []);
      $("aiModelStatus").textContent = data.available
        ? ((data.models || []).length + " Ollama models available.")
        : (data.message || "No Ollama models available.");
    });
  }

  function pingHelper() {
    request("GET", "/health", null, function (error, data) {
      if (error) {
        setHelperStatus("error", "Helper offline");
        setProgressState("error");
        log(error.message, true);
        return;
      }

      state.outputsDir = data.outputsDir || "";
      state.modelCacheDir = data.modelCacheDir || "";
      setHelperStatus("ok", "Helper ready");
      populateModels(data.models || [], data.defaultModel || "");
      syncTimingAvailability(data.precisionAvailable, data.precisionStatus, data.defaultTimingMode || "fast");
      syncOutputContext(activeSourceType() === "comp" ? "" : $("videoPath").value.trim());
      refreshAIModels();
      log("Helper ready. Available models: " + (data.models || []).length);
      if (state.modelCacheDir) {
        log("Model cache: " + state.modelCacheDir);
      }
      log(data.precisionStatus || (data.precisionAvailable ? "Precision ready." : "Precision unavailable."));
    });
  }

  function collectRequest(videoPath, compositionName, deleteSourceWhenDone, timelineOffset) {
    var buildConfig = selectedCaptionConfig();
    return {
      videoPath: videoPath,
      outputDir: $("outputDir").value.trim(),
      model: $("modelSelect").value,
      language: $("language").value.trim() || "auto",
      timingMode: selectedTimingMode(),
      deleteSourceWhenDone: !!deleteSourceWhenDone,
      destination: destinationType(),
      captionMode: buildConfig.captionMode === "smart" ? "words" : buildConfig.captionMode,
      wordsPerLayer: buildConfig.wordsPerLayer,
      compositionName: compositionName || $("compositionName").value.trim(),
      timelineOffset: Number(timelineOffset) || 0
    };
  }

  function pollJob(jobId) {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }

    request("GET", "/jobs/" + encodeURIComponent(jobId), null, function (error, data) {
      if (error) {
        setBusy(false);
        updateJobSummary("Could not read job.");
        setProgressState("error", 100);
        setHelperStatus("error", "Job failed");
        log(error.message, true);
        return;
      }

      updateJobSummary("Job " + data.id + " status: " + data.status);
      if (data.status === "queued" || data.status === "running") {
        var jobProgress = clamp(Number(data.progress) || (data.status === "queued" ? 0 : 1), 0, 99);
        setProgressState("running", jobProgress);
        setHelperStatus("ok", jobProgress + "%");
        updateJobSummary(data.message || ("Job " + data.id + " status: " + data.status));
      }

      if (data.status === "queued" || data.status === "running") {
        state.pollTimer = setTimeout(function () {
          pollJob(jobId);
        }, 1250);
        return;
      }

      setBusy(false);

      if (data.status === "failed") {
        var errorSummary = summarizeJobError(data.error);
        setProgressState("error", 100);
        setHelperStatus("error", errorSummary);
        updateJobSummary(data.error || errorSummary);
        log("Job failed: " + data.error, true);
        return;
      }

      setProgressState("complete", 100);
      setHelperStatus("ok", "Helper ready");
      rememberCaptionsPath(data.result.captionsJsonPath);
      activateTab("editor");
      updateJobSummary("Transcription ready. Edit text rhythm.");
      log("Transcription ready at: " + state.lastCaptionsPath);
      if (data.result && data.result.backend) {
        log("Backend used: " + data.result.backend + " (" + (data.result.timingMode || "fast") + ")");
      }
    });
  }

  function startJob(videoPath, compositionName, deleteSourceWhenDone, timelineOffset) {
    ensureOutputDir(videoPath, function (contextError) {
      var payload;
      if (contextError) {
        setProgressState("error", 100);
        log(contextError.message, true);
        return;
      }

      payload = collectRequest(videoPath, compositionName, deleteSourceWhenDone, timelineOffset);
      setBusy(true);
      setProgressState("running", 2);
      setHelperStatus("ok", "2%");
      updateJobSummary(selectedTimingMode() === "precision"
        ? "Creating precision transcription job..."
        : "Creating transcription job...");
      request("POST", "/jobs", payload, function (error, data) {
        if (error) {
          setBusy(false);
          setProgressState("error", 100);
          setHelperStatus("error", "Job failed");
          updateJobSummary("Could not create job.");
          log(error.message, true);
          return;
        }

        state.currentJobId = data.id;
        log("Job created: " + data.id);
        pollJob(data.id);
      });
    });
  }

  function runTranscription() {
    if (activeSourceType() === "file") {
      var videoPath = $("videoPath").value.trim();
      if (!videoPath) {
        log("Choose a video or audio file.", true);
        return;
      }
      startJob(videoPath, $("compositionName").value.trim(), false, 0);
      return;
    }

    ensureOutputDir("", function (contextError, outputDir) {
      if (contextError) {
        setProgressState("error", 100);
        log(contextError.message, true);
        return;
      }

      setBusy(true);
      setProgressState("running", 1);
      setHelperStatus("ok", "1%");
      updateJobSummary("Rendering active comp...");
      evalHost("captionsV03ExportActiveCompForTranscription", [outputDir], function (error, data) {
        if (error) {
          setBusy(false);
          setProgressState("error", 100);
          setHelperStatus("error", "Export failed");
          updateJobSummary("Could not export active comp.");
          log(error.message, true);
          return;
        }
        if (!data.ok) {
          setBusy(false);
          setProgressState("error", 100);
          setHelperStatus("error", "Export failed");
          updateJobSummary("Could not export active comp.");
          log(data.error || "Error exporting active comp.", true);
          return;
        }

        log("Active comp exported to: " + data.videoPath);
        setProgressState("running", 8);
        setHelperStatus("ok", "8%");
        startJob(
          data.videoPath,
          data.compositionName || $("compositionName").value.trim(),
          !!data.deleteSourceWhenDone,
          Number(data.timelineOffset) || 0
        );
      });
    });
  }

  function resolveCaptionsJsonPath(callback) {
    var captionsJsonPath = $("captionsJsonPath").value.trim() || state.lastCaptionsPath;
    var videoPath;
    if (captionsJsonPath) {
      callback(null, captionsJsonPath, false);
      return;
    }

    videoPath = activeSourceType() === "comp" ? "" : $("videoPath").value.trim();
    ensureOutputDir(videoPath, function (contextError, outputDir) {
      if (contextError) {
        callback(contextError);
        return;
      }

      requestLatestCaptions(outputDir, function (error, data) {
        if (error) {
          callback(error);
          return;
        }
        if (!data || !data.captionsJsonPath) {
          callback(new Error("No cached captions analysis found. Run Transcribe once first."));
          return;
        }

        rememberCaptionsPath(data.captionsJsonPath);
        callback(null, data.captionsJsonPath, true);
      });
    });
  }

  function prepareCaptionsForImport(captionsJsonPath, buildConfig, callback) {
    if (buildConfig.captionMode !== "smart") {
      callback(null, captionsJsonPath, buildConfig.captionMode);
      return;
    }

    setProgressState("running", 12);
    setHelperStatus("ok", "AI");
    updateJobSummary("Smart Parts: grouping words with " + $("aiModel").value + "...");
    request("POST", "/smart-parts", {
      captionsJsonPath: captionsJsonPath,
      provider: $("aiProvider").value || "ollama",
      model: $("aiModel").value || "",
      minWords: 2,
      maxWords: 5,
      maxChars: 34,
      force: false
    }, function (error, data) {
      if (error) {
        callback(error);
        return;
      }
      if (!data || !data.ok || !data.captionsJsonPath) {
        callback(new Error("Smart Parts failed."));
        return;
      }
      log((data.cached ? "Using cached Smart Parts: " : "Smart Parts ready: ") + data.captionsJsonPath);
      if (data.warnings && data.warnings.length) {
        log("Smart Parts warnings: " + data.warnings.join(" | "), true);
      }
      callback(null, data.captionsJsonPath, "smart");
    });
  }

  function normalizeEditorToken(value) {
    return String(value || "").toLowerCase().replace(/[^\w\u00c0-\u017f]+/g, "");
  }

  function findEditorWordMatch(token, startIndex) {
    var target = normalizeEditorToken(token);
    var i;
    if (!target) {
      return startIndex;
    }
    for (i = startIndex; i < Math.min(state.editorWords.length, startIndex + 8); i += 1) {
      if (normalizeEditorToken(state.editorWords[i].text) === target) {
        return i;
      }
    }
    return startIndex;
  }

  function renderTimestampGutter() {
    var editor = $("transcriptEditor");
    var gutter = $("timestampGutter");
    var lines = String(editor.value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var wordIndex = 0;
    var gutterLines = [];
    var i;

    for (i = 0; i < lines.length; i += 1) {
      var line = lines[i].replace(/^\s+|\s+$/g, "");
      if (!line) {
        gutterLines.push("");
        continue;
      }

      var tokens = line.split(/\s+/);
      var firstMatched = null;
      var j;
      for (j = 0; j < tokens.length; j += 1) {
        if (wordIndex >= state.editorWords.length) {
          break;
        }
        var matchedIndex = findEditorWordMatch(tokens[j], wordIndex);
        if (firstMatched === null) {
          firstMatched = matchedIndex;
        }
        wordIndex = matchedIndex + 1;
      }
      gutterLines.push(firstMatched !== null && state.editorWords[firstMatched]
        ? formatTimestamp(state.editorWords[firstMatched].start)
        : "--:--.--");
    }

    gutter.textContent = gutterLines.join("\n");
    gutter.scrollTop = editor.scrollTop;
  }

  function updateEditorStats(path) {
    var lineCount = 0;
    String($("transcriptEditor").value || "").split(/\r\n|\r|\n/).forEach(function (line) {
      if (line.replace(/^\s+|\s+$/g, "")) {
        lineCount += 1;
      }
    });
    $("editorStats").textContent = (state.manualMode ? "Manual Mode: " : "Draft: ") +
      lineCount + " layers planned from " + state.editorWords.length + " timed words.";
    if (path) {
      $("editorStats").title = path;
    }
  }

  function setManualMode(enabled) {
    state.manualMode = !!enabled;
    if ($("manualModeBanner")) {
      $("manualModeBanner").classList.toggle("is-hidden", !state.manualMode);
    }
    updateEditorStats(state.editorSourcePath);
  }

  function loadTranscriptEditor(callback, retriedLatest) {
    var buildConfig = selectedCaptionConfig();
    setProgressState("running", 8);
    setHelperStatus("ok", "Loading");
    updateJobSummary("Loading editable transcript...");

    resolveCaptionsJsonPath(function (resolveError, captionsJsonPath) {
      if (resolveError) {
        setProgressState("error", 100);
        setHelperStatus("error", "No analysis");
        showEditorLoadError(resolveError, "Run Transcribe once before editing text.");
        if (callback) {
          callback(resolveError);
        }
        return;
      }

      prepareCaptionsForImport(captionsJsonPath, buildConfig, function (prepareError, editorJsonPath, editorMode) {
        if (prepareError) {
          if (!retriedLatest && shouldRetryLatestAnalysis(prepareError)) {
            forgetCaptionsPath();
            loadTranscriptEditor(callback, true);
            return;
          }
          setProgressState("error", 100);
          setHelperStatus("error", "Load failed");
          showEditorLoadError(prepareError, "Could not load transcript.");
          if (callback) {
            callback(prepareError);
          }
          return;
        }

        evalHost(
          "captionsV03BuildEditorPayload",
          [
            editorJsonPath,
            editorMode,
            String(buildConfig.wordsPerLayer)
          ],
          function (error, data) {
            if (error || !data || !data.ok) {
              var finalError = error || new Error(data && data.error ? data.error : "Could not load transcript editor.");
              if (!retriedLatest && shouldRetryLatestAnalysis(finalError)) {
                forgetCaptionsPath();
                loadTranscriptEditor(callback, true);
                return;
              }
              setProgressState("error", 100);
              setHelperStatus("error", "Load failed");
              showEditorLoadError(finalError, "Could not load transcript.");
              if (callback) {
                callback(finalError);
              }
              return;
            }

            state.editorSourcePath = data.jsonPath || editorJsonPath;
            state.editorWords = data.words || [];
            state.editorLoaded = true;
            $("transcriptEditor").value = data.text || "";
            $("transcriptEditor").placeholder = "Transcript will appear here with word timestamps preserved internally. Break lines manually to control layer timing.";
            setManualMode(false);
            renderTimestampGutter();
            updateEditorStats(state.editorSourcePath);
            setProgressState("complete", 100);
            setHelperStatus("ok", "Helper ready");
            updateJobSummary("Transcript loaded. Break lines, then Burn Text.");
            if (callback) {
              callback(null, data);
            }
          }
        );
      });
    });
  }

  function syncEditorFromActiveComp() {
    function readCompLayers() {
      setProgressState("running", 12);
      setHelperStatus("ok", "Sync");
      updateJobSummary("Reading existing V03 text layers from active comp...");

      evalHost("captionsV03ReadGeneratedLayersFromActiveComp", [], function (error, data) {
        if (error || !data || !data.ok) {
          var finalError = error || new Error(data && data.error ? data.error : "Could not read active comp layers.");
          setProgressState("error", 100);
          setHelperStatus("error", "Sync failed");
          updateJobSummary("Sync failed.");
          log(finalError.message, true);
          return;
        }

        if (!data.text) {
          setProgressState("error", 100);
          setHelperStatus("error", "No V03 layers");
          updateJobSummary("No generated Captions V03 text layers found in the active comp.");
          return;
        }

        $("transcriptEditor").value = data.text;
        setManualMode(true);
        renderTimestampGutter();
        updateEditorStats(state.editorSourcePath);
        setProgressState("complete", 100);
        setHelperStatus("ok", "Helper ready");
        updateJobSummary("Synced " + data.layerCount + " V03 layers from " + data.compName + ".");
      });
    }

    if (!state.editorLoaded) {
      loadTranscriptEditor(function (error) {
        if (!error) {
          readCompLayers();
        }
      });
      return;
    }

    readCompLayers();
  }

  function bakeEditorText() {
    var buildConfig = selectedCaptionConfig();
    var applyLegato = legatoEnabled();
    var exportSeparated = exportSeparatedEnabled();
    var text = $("transcriptEditor").value;

    if (!state.editorSourcePath || !text.replace(/\s+/g, "")) {
      setBusy(false);
      setProgressState("error", 100);
      setHelperStatus("error", "No text");
      updateJobSummary("Load or edit a transcript before burning text.");
      return;
    }

    setProgressState("running", 34);
    setHelperStatus("ok", "34%");
    updateJobSummary("Burning edited text to After Effects layers...");
    evalHost(
      "captionsV03BakeEditedText",
      [
        state.editorSourcePath,
        text,
        destinationType(),
        $("compositionName").value.trim(),
        String(applyLegato),
        selectedPresetJSON(),
        String(exportSeparated)
      ],
      function (error, data) {
        setBusy(false);
        if (error) {
          setProgressState("error", 100);
          setHelperStatus("error", "Burn failed");
          updateJobSummary("Burn failed.");
          log(error.message, true);
          return;
        }
        if (!data.ok) {
          setProgressState("error", 100);
          setHelperStatus("error", "Burn failed");
          updateJobSummary("Burn failed.");
          log(data.error || "Could not burn captions.", true);
          return;
        }

        setProgressState("complete", 100);
        setHelperStatus("ok", "Helper ready");
        updateJobSummary("Burned " + data.layersCreated + " layers. Replaced " + (data.layersRemoved || 0) + " old V03 layers.");
        log("Burn complete in comp: " + data.compName + (applyLegato ? " (legato on)" : ""));
        if (data.separatedCaptionsJsonPath) {
          log("Separated ReelScript JSON: " + data.separatedCaptionsJsonPath);
        }
        if (data.skippedLayers) {
          log("Skipped " + data.skippedLayers + " captions outside the comp or with invalid timing.");
        }
        if (data.warnings && data.warnings.length) {
          log("Burn warnings: " + data.warnings.join(" | "), true);
        }
        updateEditorStats(state.editorSourcePath);
      }
    );
  }

  function importCaptions() {
    setBusy(true);
    setProgressState("running", 3);
    setHelperStatus("ok", "3%");
    updateJobSummary("Preparing edited transcript...");

    if (state.editorLoaded && state.editorSourcePath) {
      bakeEditorText();
      return;
    }

    loadTranscriptEditor(function (error) {
      if (error) {
        setBusy(false);
        return;
      }
      bakeEditorText();
    });
  }

  function exportSeparatedNow() {
    var buildConfig = selectedCaptionConfig();
    var applyLegato = legatoEnabled();

    setBusy(true);
    setProgressState("running", 12);
    setHelperStatus("ok", "12%");
    updateJobSummary("Exporting separated JSON...");

    resolveCaptionsJsonPath(function (resolveError, captionsJsonPath, fromCache) {
      if (resolveError) {
        setBusy(false);
        setProgressState("error", 100);
        setHelperStatus("error", "Export failed");
        updateJobSummary("Export failed.");
        log(resolveError.message, true);
        return;
      }

      if (fromCache) {
        log("Using cached analysis: " + captionsJsonPath);
      }

      prepareCaptionsForImport(captionsJsonPath, buildConfig, function (prepareError, exportJsonPath, exportMode) {
        if (prepareError) {
          setBusy(false);
          setProgressState("error", 100);
          setHelperStatus("error", "Export failed");
          updateJobSummary("Export failed.");
          log(prepareError.message, true);
          return;
        }

        evalHost(
          "captionsV03ExportSeparatedJson",
          [
            exportJsonPath,
            exportMode,
            String(buildConfig.wordsPerLayer),
            String(applyLegato)
          ],
          function (error, data) {
            setBusy(false);
            if (error || !data || !data.ok) {
              setProgressState("error", 100);
              setHelperStatus("error", "Export failed");
              updateJobSummary("Export failed.");
              log((error && error.message) || (data && data.error) || "Could not export separated JSON.", true);
              return;
            }

            setProgressState("complete", 100);
            setHelperStatus("ok", "Helper ready");
            updateJobSummary("Separated JSON exported.");
            log("Separated ReelScript JSON: " + data.path);
          }
        );
      });
    });
  }

  function bindEvents() {
    list(".main-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        activateTab(button.getAttribute("data-tab"));
      });
    });

    list(".mode-card").forEach(function (button) {
      button.addEventListener("click", function () {
        setMode(button.getAttribute("data-mode"));
      });
    });

    $("browseVideo").addEventListener("click", browseVideo);
    $("browseOutput").addEventListener("click", browseFolder);
    $("browseCaptionsJson").addEventListener("click", browseCaptionsJSON);
    $("presetSelect").addEventListener("change", function () {
      selectPreset($("presetSelect").value);
    });
    $("savePresetFromLayer").addEventListener("click", savePresetFromLayer);
    $("importPreset").addEventListener("click", importPreset);
    $("exportPreset").addEventListener("click", exportPreset);
    $("deletePreset").addEventListener("click", deletePreset);
    $("openStyles").addEventListener("click", openStyles);
    $("closeStyles").addEventListener("click", closeStyles);
    $("closeStylesBackdrop").addEventListener("click", closeStyles);
    $("openSettings").addEventListener("click", openSettings);
    $("closeSettings").addEventListener("click", closeSettings);
    $("closeSettingsBackdrop").addEventListener("click", closeSettings);
    $("clearCache").addEventListener("click", clearCache);
    $("refreshHelper").addEventListener("click", pingHelper);
    $("refreshAiModels").addEventListener("click", refreshAIModels);
    $("exportSeparatedNow").addEventListener("click", exportSeparatedNow);
    $("exportSeparatedToggle").addEventListener("change", function () {
      saveExportSeparatedSetting($("exportSeparatedToggle").checked);
    });
    $("settingsExportSeparatedToggle").addEventListener("change", function () {
      saveExportSeparatedSetting($("settingsExportSeparatedToggle").checked);
    });
    $("aiProvider").addEventListener("change", function () {
      saveAISettings();
      refreshAIModels();
    });
    $("aiModel").addEventListener("change", saveAISettings);
    $("runTranscription").addEventListener("click", runTranscription);
    $("importCaptions").addEventListener("click", importCaptions);
    $("continueToStyle").addEventListener("click", function () {
      activateTab("build");
    });
    $("reloadTranscriptEditor").addEventListener("click", function () {
      state.editorLoaded = false;
      loadTranscriptEditor();
    });
    $("syncActiveCompText").addEventListener("click", syncEditorFromActiveComp);
    $("transcriptEditor").addEventListener("input", function () {
      setManualMode(true);
      renderTimestampGutter();
      updateEditorStats(state.editorSourcePath);
    });
    $("transcriptEditor").addEventListener("scroll", function () {
      $("timestampGutter").scrollTop = $("transcriptEditor").scrollTop;
    });

    $("videoPath").addEventListener("change", function () {
      if (activeSourceType() === "file") {
        syncOutputContext($("videoPath").value.trim());
      }
    });

    $("outputDir").addEventListener("input", function () {
      if ($("outputDir").value.trim() !== state.autoOutputDir) {
        state.autoOutputDir = "";
      }
    });

    $("customWordsPerLayer").addEventListener("input", function () {
      state.editorLoaded = false;
      setManualMode(false);
      if (state.selectedMode === "custom") {
        $("modeHint").textContent = selectedWordsPerLayer() + " custom words per layer.";
        updatePresetMeta();
        renderStyleGrid();
        if (state.activeTab === "editor") {
          loadTranscriptEditor();
        }
      }
    });

    list("input[name='sourceType']").forEach(function (radio) {
      radio.addEventListener("change", syncSourceUI);
    });

    list("input[name='destinationType']").forEach(function (radio) {
      radio.addEventListener("change", syncDestinationUI);
    });

    list("input[name='timingMode']").forEach(function (radio) {
      radio.addEventListener("change", updateTimingHint);
    });
  }

  bindEvents();
  loadExportSeparatedSetting();
  loadAISettings();
  activateTab("transcribe");
  setMode("three");
  syncSourceUI();
  syncDestinationUI();
  updateTimingHint();
  loadPresets();
  pingHelper();
})();
