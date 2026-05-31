function captionsV03JSONStringify(value) {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return "{\"ok\":false,\"error\":\"JSON stringify failed\"}";
    }
}

function captionsV03Response(ok, dataOrError) {
    if (ok) {
        return captionsV03JSONStringify(dataOrError);
    }
    return captionsV03JSONStringify({
        ok: false,
        error: dataOrError
    });
}

function captionsV03SanitizeName(name) {
    if (!name) {
        return "";
    }
    return String(name).replace(/[\\\/:*?"<>|]/g, "_");
}

function captionsV03GetActiveComp() {
    var item = app.project ? app.project.activeItem : null;
    if (item && item instanceof CompItem) {
        return item;
    }
    return null;
}

function captionsV03GetProjectFolder() {
    if (app.project && app.project.file) {
        return app.project.file.parent.fsName;
    }
    return "";
}

function captionsV03BuildOutputDir(baseDir) {
    if (!baseDir) {
        return "";
    }
    return baseDir + "/_Captions";
}

function captionsV03GetOutputContext(videoPath) {
    try {
        var projectDir = captionsV03GetProjectFolder();
        var videoDir = "";
        if (videoPath) {
            var sourceFile = new File(videoPath);
            if (sourceFile.parent) {
                videoDir = sourceFile.parent.fsName;
            }
        }

        return captionsV03JSONStringify({
            ok: true,
            outputDir: captionsV03BuildOutputDir(projectDir || videoDir || ""),
            projectDir: projectDir,
            videoDir: videoDir,
            hasSavedProject: !!(app.project && app.project.file)
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03EnsureFolder(path) {
    var folder = new Folder(path);
    if (!folder.exists) {
        folder.create();
    }
    return folder;
}

function captionsV03ChooseAudioTemplate(outputModule) {
    var templates = outputModule.templates || [];
    var preferred = [
        "Waveform Audio",
        "WAV",
        "AIFF 48kHz",
        "AIFF"
    ];
    var i;
    var j;

    for (i = 0; i < preferred.length; i += 1) {
        for (j = 0; j < templates.length; j += 1) {
            if (templates[j] === preferred[i]) {
                return templates[j];
            }
        }
    }

    for (j = 0; j < templates.length; j += 1) {
        var templateName = String(templates[j] || "").toLowerCase();
        if (
            templateName.indexOf("wave") !== -1 ||
            templateName.indexOf("wav") !== -1 ||
            templateName.indexOf("aiff") !== -1 ||
            templateName.indexOf("audio") !== -1
        ) {
            return templates[j];
        }
    }

    return "";
}

function captionsV03GuessAudioExtension(outputModule, templateName) {
    var probe = String(templateName || "").toLowerCase();

    try {
        var settings = outputModule.getSettings(GetSettingsFormat.STRING);
        if (settings && settings.Format) {
            probe = String(settings.Format).toLowerCase();
        }
    } catch (error) {}

    if (probe.indexOf("aiff") !== -1 || probe.indexOf("aif") !== -1) {
        return ".aif";
    }
    return ".wav";
}

function captionsV03ResolveRenderedFile(folder, baseName, preferredFile) {
    if (preferredFile && preferredFile.exists) {
        return preferredFile;
    }

    var suffixes = [".wav", ".aif", ".aiff", ".mov"];
    var i;
    for (i = 0; i < suffixes.length; i += 1) {
        var candidate = new File(folder.fsName + "/" + baseName + "_captions" + suffixes[i]);
        if (candidate.exists) {
            return candidate;
        }
    }

    var matches = folder.getFiles(baseName + "_captions*");
    for (i = 0; i < matches.length; i += 1) {
        if (matches[i] instanceof File && matches[i].exists) {
            return matches[i];
        }
    }

    throw new Error("After Effects did not create transcription audio at: " + preferredFile.fsName);
}

function captionsV03ReadJSONFile(path) {
    var file = new File(path);
    if (!file.exists) {
        throw new Error("File not found: " + path);
    }
    file.encoding = "UTF-8";
    if (!file.open("r")) {
        throw new Error("Could not open file: " + path);
    }
    var contents = file.read();
    file.close();
    return JSON.parse(contents);
}

function captionsV03HasSegments(data) {
    return !!(data && data.segments && data.segments.length);
}

function captionsV03ResolveEditorDocument(jsonPath) {
    var data = captionsV03ReadJSONFile(jsonPath);
    var sourcePath = captionsV03TrimText(data && data.sourceCaptionsJsonPath ? data.sourceCaptionsJsonPath : "");
    var sourceData;

    if (sourcePath && sourcePath !== jsonPath) {
        try {
            sourceData = captionsV03ReadJSONFile(sourcePath);
            if (captionsV03HasSegments(sourceData)) {
                return {
                    path: sourcePath,
                    data: sourceData
                };
            }
        } catch (ignoreError) {}
    }

    return {
        path: jsonPath,
        data: data
    };
}

function captionsV03Number(value, fallback) {
    value = Number(value);
    if (isNaN(value)) {
        return fallback;
    }
    return value;
}

function captionsV03Color(value, fallback) {
    if (value && value.length >= 3) {
        return [
            Math.max(0, Math.min(1, Number(value[0]))),
            Math.max(0, Math.min(1, Number(value[1]))),
            Math.max(0, Math.min(1, Number(value[2])))
        ];
    }
    return fallback;
}

function captionsV03DefaultPreset(comp) {
    return {
        version: 2,
        name: "Default",
        style: {
            fontSize: Math.max(42, comp.height * 0.055),
            fillColor: [1, 1, 1],
            strokeColor: [0, 0, 0],
            strokeWidth: 4,
            positionY: 0.82,
            tracking: 0,
            leading: 0,
            maxWordsPerLine: 0,
            allCaps: false
        },
        background: {
            enabled: false
        },
        shadow: {
            enabled: false
        },
        animation: {
            type: "none",
            inDuration: 0.08,
            outDuration: 0.08,
            overshoot: 112
        },
        highlight: {
            enabled: false,
            mode: "none"
        },
        mogrt: {
            enabled: false,
            templatePath: "",
            sourceMogrt: "",
            templateCompName: "",
            copyMode: "text",
            controls: {},
            forceFont: ""
        },
        reveal: {
            type: "none",
            minWordsPerLayer: 3,
            mode: "cumulative"
        }
    };
}

function captionsV03ParsePreset(presetJSON, comp) {
    var preset = captionsV03DefaultPreset(comp);
    if (!presetJSON) {
        return preset;
    }

    try {
        var incoming = typeof presetJSON === "string" ? JSON.parse(presetJSON) : presetJSON;
        if (incoming.name) {
            preset.name = String(incoming.name);
        }
        if (incoming.style) {
            var style = incoming.style;
            preset.style.font = style.font || "";
            preset.style.fontSize = captionsV03Number(style.fontSize, preset.style.fontSize);
            preset.style.fillColor = captionsV03Color(style.fillColor, preset.style.fillColor);
            preset.style.strokeColor = captionsV03Color(style.strokeColor, preset.style.strokeColor);
            preset.style.strokeWidth = captionsV03Number(style.strokeWidth, preset.style.strokeWidth);
            preset.style.positionX = captionsV03Number(style.positionX, 0.5);
            preset.style.positionY = captionsV03Number(style.positionY, preset.style.positionY);
            preset.style.tracking = captionsV03Number(style.tracking, preset.style.tracking);
            preset.style.leading = captionsV03Number(style.leading, preset.style.leading);
            preset.style.maxWordsPerLine = captionsV03Number(style.maxWordsPerLine, preset.style.maxWordsPerLine);
            preset.style.scale = captionsV03Number(style.scale, 100);
            preset.style.allCaps = captionsV03ParseBool(style.allCaps);
        }
        if (incoming.background) {
            preset.background = incoming.background;
        }
        if (incoming.shadow) {
            preset.shadow = incoming.shadow;
        }
        if (incoming.animation) {
            preset.animation = incoming.animation;
        }
        if (incoming.highlight) {
            preset.highlight = incoming.highlight;
        }
        if (incoming.mogrt) {
            preset.mogrt.enabled = incoming.mogrt.enabled === undefined
                ? !!(incoming.mogrt.templatePath || incoming.mogrt.sourceMogrt)
                : captionsV03ParseBool(incoming.mogrt.enabled);
            preset.mogrt.templatePath = incoming.mogrt.templatePath || "";
            preset.mogrt.sourceMogrt = incoming.mogrt.sourceMogrt || "";
            preset.mogrt.templateCompName = incoming.mogrt.templateCompName || "";
            preset.mogrt.copyMode = incoming.mogrt.copyMode || "text";
            preset.mogrt.controls = incoming.mogrt.controls || {};
            preset.mogrt.forceFont = incoming.mogrt.forceFont || "";
        }
        if (incoming.reveal) {
            preset.reveal = incoming.reveal;
        }
    } catch (error) {}

    return preset;
}

function captionsV03PresetFolder() {
    var root = new Folder(Folder.userData.fsName + "/CaptionsV03");
    if (!root.exists) {
        root.create();
    }
    var presets = new Folder(root.fsName + "/presets");
    if (!presets.exists) {
        presets.create();
    }
    return presets;
}

function captionsV03WriteTextFile(path, contents) {
    var file = new File(path);
    file.encoding = "UTF-8";
    if (!file.open("w")) {
        throw new Error("Could not write file: " + path);
    }
    file.write(contents);
    file.close();
}

function captionsV03PresetFileName(name) {
    var safe = captionsV03SanitizeName(name || "preset").replace(/\s+/g, "_");
    if (!safe) {
        safe = "preset";
    }
    return safe + "_" + String(new Date().getTime()) + ".captionpreset.json";
}

function captionsV03LayerPreset(layer, presetName) {
    var comp = layer.containingComp || captionsV03GetActiveComp();
    var textDocument = layer.property("Source Text").value;
    var position = layer.property("Transform").property("Position").value;
    var scale = layer.property("Transform").property("Scale").value;

    var preset = captionsV03DefaultPreset(comp);
    preset.name = presetName || layer.name || "Selected Layer";
    preset.style.font = textDocument.font || "";
    preset.style.fontSize = captionsV03Number(textDocument.fontSize, preset.style.fontSize);
    preset.style.fillColor = captionsV03Color(textDocument.fillColor, preset.style.fillColor);
    preset.style.strokeColor = captionsV03Color(textDocument.strokeColor, preset.style.strokeColor);
    preset.style.strokeWidth = captionsV03Number(textDocument.strokeWidth, 0);
    preset.style.tracking = captionsV03Number(textDocument.tracking, 0);
    preset.style.positionX = comp && comp.width ? captionsV03Number(position[0] / comp.width, 0.5) : 0.5;
    preset.style.positionY = comp && comp.height ? captionsV03Number(position[1] / comp.height, 0.82) : 0.82;
    preset.style.scale = scale && scale.length ? captionsV03Number(scale[0], 100) : 100;
    preset.animation = { type: "none", inDuration: 0.08, outDuration: 0.08, overshoot: 112 };
    preset.highlight = { enabled: false, mode: "none" };
    return preset;
}

function captionsV03ListUserPresets() {
    try {
        var folder = captionsV03PresetFolder();
        var files = folder.getFiles("*.captionpreset.json");
        var presets = [];
        var i;
        for (i = 0; i < files.length; i += 1) {
            if (!(files[i] instanceof File)) {
                continue;
            }
            try {
                var preset = captionsV03ReadJSONFile(files[i].fsName);
                presets.push({
                    id: "user." + files[i].name,
                    source: "user",
                    path: files[i].fsName,
                    preset: preset
                });
            } catch (ignoreError) {}
        }
        return captionsV03JSONStringify({
            ok: true,
            presets: presets
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03SaveSelectedLayerAsPreset(presetName) {
    try {
        var comp = captionsV03GetActiveComp();
        if (!comp || !comp.selectedLayers || comp.selectedLayers.length < 1) {
            throw new Error("Select a text layer first.");
        }

        var layer = null;
        var i;
        for (i = 0; i < comp.selectedLayers.length; i += 1) {
            if (comp.selectedLayers[i].property("Source Text")) {
                layer = comp.selectedLayers[i];
                break;
            }
        }
        if (!layer) {
            throw new Error("Selected layer is not a text layer.");
        }

        var preset = captionsV03LayerPreset(layer, presetName);
        var folder = captionsV03PresetFolder();
        var file = new File(folder.fsName + "/" + captionsV03PresetFileName(preset.name));
        captionsV03WriteTextFile(file.fsName, captionsV03JSONStringify(preset));
        return captionsV03JSONStringify({
            ok: true,
            id: "user." + file.name,
            path: file.fsName,
            preset: preset
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03ImportPresetFromDialog() {
    try {
        var source = File.openDialog("Import caption preset", "*.captionpreset.json;*.json");
        if (!source) {
            return captionsV03JSONStringify({ ok: true, canceled: true });
        }
        var preset = captionsV03ReadJSONFile(source.fsName);
        if (!preset || !preset.name) {
            throw new Error("Preset JSON is missing a name.");
        }
        var folder = captionsV03PresetFolder();
        var file = new File(folder.fsName + "/" + captionsV03PresetFileName(preset.name));
        captionsV03WriteTextFile(file.fsName, captionsV03JSONStringify(preset));
        return captionsV03JSONStringify({
            ok: true,
            id: "user." + file.name,
            path: file.fsName,
            preset: preset
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03ExportPresetToDialog(presetJSON) {
    try {
        var preset = captionsV03ParsePreset(presetJSON, { height: 1080, width: 1920 });
        var target = File.saveDialog("Export caption preset", "*.captionpreset.json");
        if (!target) {
            return captionsV03JSONStringify({ ok: true, canceled: true });
        }
        if (String(target.fsName).indexOf(".captionpreset.json") === -1) {
            target = new File(target.fsName + ".captionpreset.json");
        }
        captionsV03WriteTextFile(target.fsName, captionsV03JSONStringify(preset));
        return captionsV03JSONStringify({
            ok: true,
            path: target.fsName
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03DeletePreset(path) {
    try {
        var file = new File(path);
        if (file.exists) {
            file.remove();
        }
        return captionsV03JSONStringify({ ok: true });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03ApplyLineBreaks(text, maxWordsPerLine) {
    maxWordsPerLine = parseInt(maxWordsPerLine, 10);
    if (!maxWordsPerLine || maxWordsPerLine < 1) {
        return text;
    }

    var words = captionsV03TrimText(text).split(/\s+/);
    if (words.length <= maxWordsPerLine) {
        return text;
    }

    var lines = [];
    var i;
    for (i = 0; i < words.length; i += maxWordsPerLine) {
        lines.push(words.slice(i, i + maxWordsPerLine).join(" "));
    }
    return lines.join("\r");
}

function captionsV03ApplyTextStyle(layer, text, comp, preset, highlightActive) {
    var sourceText = layer.property("Source Text");
    var textDocument = sourceText.value;
    var style = preset.style || {};
    var highlight = preset.highlight || {};
    var displayText = captionsV03ParseBool(style.allCaps) ? String(text).toUpperCase() : text;
    displayText = captionsV03ApplyLineBreaks(displayText, captionsV03Number(style.maxWordsPerLine, 0));
    textDocument.text = displayText;
    if (style.font) {
        try {
            textDocument.font = style.font;
        } catch (fontError) {}
    }
    textDocument.fontSize = captionsV03Number(style.fontSize, Math.max(42, comp.height * 0.055));
    textDocument.applyFill = true;
    textDocument.fillColor = highlightActive
        ? captionsV03Color(highlight.activeFillColor, captionsV03Color(style.fillColor, [1, 1, 1]))
        : captionsV03Color(style.fillColor, [1, 1, 1]);
    textDocument.applyStroke = captionsV03Number(style.strokeWidth, 0) > 0 || (highlightActive && captionsV03Number(highlight.activeStrokeWidth, 0) > 0);
    textDocument.strokeColor = highlightActive
        ? captionsV03Color(highlight.activeStrokeColor, captionsV03Color(style.strokeColor, [0, 0, 0]))
        : captionsV03Color(style.strokeColor, [0, 0, 0]);
    textDocument.strokeWidth = highlightActive
        ? captionsV03Number(highlight.activeStrokeWidth, captionsV03Number(style.strokeWidth, 0))
        : captionsV03Number(style.strokeWidth, 0);
    try {
        textDocument.tracking = captionsV03Number(style.tracking, 0);
    } catch (trackingError) {}
    try {
        var leading = captionsV03Number(style.leading, 0);
        if (leading > 0) {
            textDocument.autoLeading = false;
            textDocument.leading = leading;
        }
    } catch (leadingError) {}
    textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
    sourceText.setValue(textDocument);
}

function captionsV03ResolveComp(destination, compName, documentData) {
    var activeComp = captionsV03GetActiveComp();
    if (destination === "active-comp") {
        if (!activeComp) {
            throw new Error("No active comp found.");
        }
        return activeComp;
    }

    var targetName = captionsV03SanitizeName(compName || documentData.compositionName || "Captions");
    if (!targetName) {
        targetName = "Captions";
    }

    var duration = Math.max(1, Number(documentData.duration || 10));
    var width = 1920;
    var height = 1080;
    var pixelAspect = 1;
    var frameRate = activeComp ? activeComp.frameRate : 30;
    var comp = null;

    if (documentData.sourceVideoPath) {
        var sourceFile = new File(documentData.sourceVideoPath);
        if (sourceFile.exists) {
            var importOptions = new ImportOptions(sourceFile);
            var footage = app.project.importFile(importOptions);
            if (footage) {
                width = footage.width || width;
                height = footage.height || height;
                pixelAspect = footage.pixelAspect || pixelAspect;
                duration = Math.max(duration, footage.duration || duration);
                frameRate = footage.frameRate || frameRate;
                comp = app.project.items.addComp(targetName, width, height, pixelAspect, duration, frameRate);
                var footageLayer = comp.layers.add(footage);
                footageLayer.startTime = 0;
            }
        }
    }

    if (!comp) {
        comp = app.project.items.addComp(targetName, width, height, pixelAspect, duration, frameRate);
    }

    return comp;
}

function captionsV03ChunkWords(words, wordsPerLayer) {
    var chunks = [];
    var index = 0;
    while (index < words.length) {
        chunks.push(words.slice(index, index + wordsPerLayer));
        index += wordsPerLayer;
    }
    return chunks;
}

function captionsV03WordsToText(words) {
    var parts = [];
    var i;
    for (i = 0; i < words.length; i += 1) {
        if (words[i].text) {
            parts.push(words[i].text);
        }
    }
    return parts.join(" ");
}

function captionsV03ApplyShadow(layer, preset) {
    var shadow = preset.shadow || {};
    if (!captionsV03ParseBool(shadow.enabled)) {
        return;
    }
    try {
        var effects = layer.property("ADBE Effect Parade");
        var effect = effects.addProperty("ADBE Drop Shadow");
        effect.property(2).setValue(captionsV03Number(shadow.opacity, 45));
        effect.property(4).setValue(captionsV03Number(shadow.distance, 5));
        effect.property(5).setValue(captionsV03Number(shadow.softness, 18));
    } catch (error) {}
}

function captionsV03CreateBackground(comp, textLayer, preset, start, end) {
    var background = preset.background || {};
    if (!captionsV03ParseBool(background.enabled)) {
        return null;
    }

    try {
        var rect = textLayer.sourceRectAtTime(start, false);
        var textPosition = textLayer.property("Transform").property("Position").value;
        var paddingX = captionsV03Number(background.paddingX, 32);
        var paddingY = captionsV03Number(background.paddingY, 16);
        var bg = comp.layers.addShape();
        bg.name = textLayer.name + " BG";
        captionsV03MarkGeneratedLayer(bg);
        captionsV03SetLayerTiming(bg, Math.max(0, start), Math.max(Math.max(0, start) + 0.04, end));
        bg.property("Transform").property("Position").setValue([
            textPosition[0] + rect.left + rect.width / 2,
            textPosition[1] + rect.top + rect.height / 2
        ]);

        var contents = bg.property("Contents");
        var rectShape = contents.addProperty("ADBE Vector Shape - Rect");
        rectShape.property("ADBE Vector Rect Size").setValue([
            Math.max(1, rect.width + paddingX * 2),
            Math.max(1, rect.height + paddingY * 2)
        ]);
        rectShape.property("ADBE Vector Rect Roundness").setValue(captionsV03Number(background.radius, 18));
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue(captionsV03Color(background.color, [0, 0, 0]));
        fill.property("ADBE Vector Fill Opacity").setValue(captionsV03Number(background.opacity, 75));
        bg.moveAfter(textLayer);
        return bg;
    } catch (error) {
        return null;
    }
}

function captionsV03SetLayerTiming(layer, start, end) {
    start = Math.max(0, Number(start) || 0);
    end = Math.max(start + 0.001, Number(end) || (start + 0.04));

    // Keep startTime at zero for generated text/shape layers. In AE, moving
    // startTime on generated layers can visually stretch the layer bar even
    // when inPoint/outPoint are later set correctly.
    try {
        layer.startTime = 0;
    } catch (startTimeError) {}
    try {
        layer.inPoint = start;
    } catch (inPointError) {}
    try {
        layer.outPoint = end;
    } catch (outPointError) {}

    try {
        if (Math.abs(Number(layer.inPoint) - start) > 0.0005) {
            layer.inPoint = start;
        }
        if (Math.abs(Number(layer.outPoint) - end) > 0.0005) {
            layer.outPoint = end;
        }
    } catch (verifyTimingError) {}
}

function captionsV03LayerTimingMatches(layer, start, end) {
    try {
        return Math.abs(Number(layer.inPoint) - Number(start)) <= 0.001 &&
            Math.abs(Number(layer.outPoint) - Number(end)) <= 0.001;
    } catch (error) {
        return false;
    }
}

function captionsV03GeneratedMarker() {
    return "CaptionsV03 generated";
}

function captionsV03MarkGeneratedLayer(layer) {
    try {
        if (layer) {
            layer.comment = captionsV03GeneratedMarker();
        }
    } catch (error) {}
}

function captionsV03LayerIsGenerated(layer) {
    try {
        return layer && String(layer.comment || "").indexOf(captionsV03GeneratedMarker()) !== -1;
    } catch (error) {
        return false;
    }
}

function captionsV03RemoveGeneratedLayers(comp) {
    var removed = 0;
    var i;
    if (!comp || !(comp instanceof CompItem)) {
        return removed;
    }

    for (i = comp.numLayers; i >= 1; i -= 1) {
        try {
            if (captionsV03LayerIsGenerated(comp.layer(i))) {
                comp.layer(i).remove();
                removed += 1;
            }
        } catch (error) {}
    }
    return removed;
}

function captionsV03EasePropertyKeys(prop, firstKey, lastKey, influence) {
    try {
        influence = Math.max(0.1, Math.min(100, captionsV03Number(influence, 80)));
        var value = prop.value;
        var dimensions = value instanceof Array ? value.length : 1;
        var easeIn = [];
        var easeOut = [];
        var i;
        for (i = 0; i < dimensions; i += 1) {
            easeIn.push(new KeyframeEase(0, influence));
            easeOut.push(new KeyframeEase(0, influence));
        }
        for (i = firstKey; i <= lastKey; i += 1) {
            prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setTemporalEaseAtKey(i, easeIn, easeOut);
        }
    } catch (error) {}
}

function captionsV03SetTextFillAtTime(layer, time, color, fallback) {
    try {
        var sourceText = layer.property("Source Text");
        var textDocument = sourceText.value;
        textDocument.applyFill = true;
        textDocument.fillColor = captionsV03Color(color, fallback || textDocument.fillColor);
        sourceText.setValueAtTime(time, textDocument);
    } catch (error) {}
}

function captionsV03ApplyAnimation(layer, start, end, preset) {
    var animation = preset.animation || {};
    var type = String(animation.type || "none");
    if (type === "none") {
        return;
    }

    var inDuration = Math.max(0.01, captionsV03Number(animation.inDuration, 0.1));
    var outDuration = Math.max(0.01, captionsV03Number(animation.outDuration, 0.08));
    var overshoot = captionsV03Number(animation.overshoot, 112) / 100;
    var scaleProp = layer.property("Transform").property("Scale");
    var opacityProp = layer.property("Transform").property("Opacity");
    var positionProp = layer.property("Transform").property("Position");
    var scale = scaleProp.value;
    var position = positionProp.value;
    var inEnd = Math.min(start + inDuration, end);
    var outStart = Math.max(start, end - outDuration);
    var style = preset.style || {};

    if (type === "fade") {
        opacityProp.setValueAtTime(start, 0);
        opacityProp.setValueAtTime(inEnd, 100);
        opacityProp.setValueAtTime(outStart, 100);
        opacityProp.setValueAtTime(end, 0);
        return;
    }

    if (type === "slide-up") {
        opacityProp.setValueAtTime(start, 0);
        opacityProp.setValueAtTime(inEnd, 100);
        positionProp.setValueAtTime(start, [position[0], position[1] + 36]);
        positionProp.setValueAtTime(inEnd, position);
        return;
    }

    if (type === "rise-color") {
        var fromOffsetY = captionsV03Number(animation.fromOffsetY, 64);
        var fromOpacity = Math.max(0, Math.min(100, captionsV03Number(animation.fromOpacity, 15)));
        var fromScale = captionsV03Number(animation.fromScale, 94) / 100;
        var easeInfluence = captionsV03Number(animation.easeInfluence, 86);
        var toFill = captionsV03Color(animation.toFillColor, captionsV03Color(style.fillColor, [1, 1, 1]));

        positionProp.setValueAtTime(start, [position[0], position[1] + fromOffsetY]);
        positionProp.setValueAtTime(inEnd, position);
        captionsV03EasePropertyKeys(positionProp, 1, 2, easeInfluence);

        opacityProp.setValueAtTime(start, fromOpacity);
        opacityProp.setValueAtTime(inEnd, 100);
        captionsV03EasePropertyKeys(opacityProp, 1, 2, easeInfluence);

        scaleProp.setValueAtTime(start, [scale[0] * fromScale, scale[1] * fromScale]);
        scaleProp.setValueAtTime(inEnd, scale);
        captionsV03EasePropertyKeys(scaleProp, 1, 2, easeInfluence);

        captionsV03SetTextFillAtTime(layer, start, animation.fromFillColor, toFill);
        captionsV03SetTextFillAtTime(layer, inEnd, toFill, toFill);
        return;
    }

    if (type === "bounce") {
        scaleProp.setValueAtTime(start, [scale[0] * 0.72, scale[1] * 0.72]);
        scaleProp.setValueAtTime(start + inDuration * 0.65, [scale[0] * overshoot, scale[1] * overshoot]);
        scaleProp.setValueAtTime(inEnd, scale);
        return;
    }

    scaleProp.setValueAtTime(start, [scale[0] * 0.82, scale[1] * 0.82]);
    scaleProp.setValueAtTime(start + inDuration * 0.7, [scale[0] * overshoot, scale[1] * overshoot]);
    scaleProp.setValueAtTime(inEnd, scale);
}

function captionsV03SnapToFrame(comp, time) {
    var frameDuration = comp && comp.frameDuration ? Number(comp.frameDuration) : 0;
    time = Math.max(0, Number(time) || 0);
    if (!frameDuration || frameDuration <= 0) {
        return time;
    }
    return Math.max(0, Math.round(time / frameDuration) * frameDuration);
}

function captionsV03NormalizeLayerTiming(comp, start, end) {
    var frameDuration = comp && comp.frameDuration ? Number(comp.frameDuration) : 1 / 30;
    var compDuration = comp && comp.duration ? Number(comp.duration) : 0;
    var snappedStart = captionsV03SnapToFrame(comp, start);
    var snappedEnd = captionsV03SnapToFrame(comp, end);

    if (!frameDuration || frameDuration <= 0) {
        frameDuration = 1 / 30;
    }
    if (snappedEnd <= snappedStart) {
        snappedEnd = snappedStart + frameDuration;
    }
    if (compDuration > 0) {
        if (snappedStart >= compDuration) {
            return null;
        }
        if (snappedEnd > compDuration) {
            snappedEnd = compDuration;
        }
        if (snappedEnd <= snappedStart) {
            snappedEnd = Math.min(compDuration, snappedStart + frameDuration);
        }
        if (snappedEnd <= snappedStart) {
            return null;
        }
    }

    return {
        start: Math.max(0, snappedStart),
        end: snappedEnd,
        frameDuration: frameDuration
    };
}

function captionsV03SafeLayerName(text) {
    var name = captionsV03TrimText(text).replace(/[\r\n\t]+/g, " ");
    if (name.length > 120) {
        name = name.substring(0, 117) + "...";
    }
    return name || "Caption";
}

function captionsV03EnsureCompDuration(comp, entries, documentData) {
    var neededDuration = captionsV03Number(documentData.duration, 0);
    var frameDuration = comp && comp.frameDuration ? Number(comp.frameDuration) : 1 / 30;
    var i;
    for (i = 0; i < entries.length; i += 1) {
        neededDuration = Math.max(neededDuration, captionsV03Number(entries[i].end, 0));
    }
    if (!neededDuration || !comp || neededDuration <= Number(comp.duration || 0)) {
        return;
    }
    try {
        comp.duration = neededDuration + Math.max(frameDuration, 0.001);
    } catch (error) {}
}

function captionsV03CreateLayer(comp, text, start, end, preset, highlightActive) {
    text = captionsV03TrimText(text);
    if (!text) {
        return null;
    }

    preset = preset || captionsV03DefaultPreset(comp);
    var style = preset.style || {};
    var layer = comp.layers.addText(text);
    captionsV03MarkGeneratedLayer(layer);
    captionsV03ApplyTextStyle(layer, text, comp, preset, false);

    var layerStart = Math.max(0, Number(start) || 0);
    var layerEnd = Math.max(layerStart + 0.04, Number(end) || (layerStart + 0.04));
    if (comp && comp.duration && layerEnd > comp.duration) {
        layerEnd = comp.duration;
    }
    if (layerEnd <= layerStart) {
        layerEnd = layerStart + 0.04;
    }

    layer.inPoint = layerStart;
    layer.outPoint = layerEnd;
    layer.position.setValue([
        comp.width * captionsV03Number(style.positionX, 0.5),
        comp.height * captionsV03Number(style.positionY, 0.82)
    ]);
    var baseScale = captionsV03Number(style.scale, 100);
    layer.property("Transform").property("Scale").setValue([baseScale, baseScale]);
    try {
        layer.name = captionsV03SafeLayerName(text);
    } catch (nameError) {}
    captionsV03ApplyShadow(layer, preset);
    captionsV03ApplyAnimation(layer, layerStart, layerEnd, preset);
    if (preset.background && captionsV03ParseBool(preset.background.enabled)) {
        captionsV03CreateBackground(comp, layer, preset, layerStart, layerEnd);
    }
    layer.inPoint = layerStart;
    layer.outPoint = layerEnd;
    return layer;
}

function captionsV03PresetUsesMogrt(preset) {
    return !!(preset && preset.mogrt && captionsV03ParseBool(preset.mogrt.enabled) && preset.mogrt.templatePath);
}

function captionsV03ProjectFolder(name) {
    var folderName = String(name || "Captions v03");
    var i;
    for (i = 1; i <= app.project.numItems; i += 1) {
        if (app.project.item(i) instanceof FolderItem && app.project.item(i).name === folderName) {
            return app.project.item(i);
        }
    }
    return app.project.items.addFolder(folderName);
}

function captionsV03CompTextLayerCount(comp) {
    var count = 0;
    var i;
    if (!comp || !(comp instanceof CompItem)) {
        return count;
    }
    for (i = 1; i <= comp.numLayers; i += 1) {
        if (comp.layer(i).property("ADBE Text Properties")) {
            count += 1;
        }
    }
    return count;
}

function captionsV03ChooseTemplateComp(comps) {
    var best = null;
    var bestScore = -1;
    var i;
    for (i = 0; i < comps.length; i += 1) {
        var comp = comps[i];
        var textCount = captionsV03CompTextLayerCount(comp);
        var area = captionsV03Number(comp.width, 0) * captionsV03Number(comp.height, 0);
        var score = (textCount * 1000000000) + area + captionsV03Number(comp.duration, 0);
        if (score > bestScore) {
            best = comp;
            bestScore = score;
        }
    }
    return best;
}

function captionsV03NormalizedName(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function captionsV03FindTemplateCompByName(comps, templateCompName) {
    var target = captionsV03NormalizedName(templateCompName);
    var i;
    if (!target) {
        return null;
    }
    for (i = 0; i < comps.length; i += 1) {
        if (captionsV03NormalizedName(comps[i].name) === target) {
            return comps[i];
        }
    }
    return null;
}

function captionsV03ItemInList(item, list) {
    var i;
    for (i = 0; i < list.length; i += 1) {
        if (item === list[i]) {
            return true;
        }
    }
    return false;
}

function captionsV03LoadMogrtTemplate(preset) {
    var templatePath = preset && preset.mogrt ? String(preset.mogrt.templatePath || "") : "";
    if (!templatePath) {
        return null;
    }

    var file = new File(templatePath);
    if (!file.exists) {
        throw new Error("MOGRT template AEP not found: " + templatePath);
    }

    var existingItems = [];
    var existingIndex;
    for (existingIndex = 1; existingIndex <= app.project.numItems; existingIndex += 1) {
        existingItems.push(app.project.item(existingIndex));
    }

    var importOptions = new ImportOptions(file);
    try {
        if (importOptions.canImportAs && importOptions.canImportAs(ImportAsType.PROJECT)) {
            importOptions.importAs = ImportAsType.PROJECT;
        }
    } catch (importTypeError) {}

    app.project.importFile(importOptions);

    var comps = [];
    var newItems = [];
    var i;
    for (i = 1; i <= app.project.numItems; i += 1) {
        var item = app.project.item(i);
        if (captionsV03ItemInList(item, existingItems)) {
            continue;
        }
        newItems.push(item);
        if (item instanceof CompItem) {
            comps.push(item);
        }
    }

    var importedFolder = captionsV03ProjectFolder("Captions v03 MOGRT Templates");
    for (i = 0; i < newItems.length; i += 1) {
        if (newItems[i] === importedFolder) {
            continue;
        }
        try {
            newItems[i].parentFolder = importedFolder;
        } catch (folderError) {}
    }

    var requestedCompName = preset && preset.mogrt ? String(preset.mogrt.templateCompName || "") : "";
    var templateComp = captionsV03FindTemplateCompByName(comps, requestedCompName) || captionsV03ChooseTemplateComp(comps);
    if (!templateComp) {
        throw new Error("No comp found inside MOGRT template: " + templatePath);
    }
    return templateComp;
}

function captionsV03TextLayerScore(layer) {
    var score = 0;
    try {
        var sourceText = layer.property("Source Text");
        var textDocument = sourceText ? sourceText.value : null;
        var rect = layer.sourceRectAtTime(0, false);
        if (rect) {
            score += Math.max(0, rect.width) * Math.max(0, rect.height);
        }
        if (textDocument && textDocument.fontSize) {
            score += captionsV03Number(textDocument.fontSize, 0) * 10000;
        }
        score += Math.max(0, 1000 - layer.index);
    } catch (error) {}
    return score;
}

function captionsV03FindPrimaryTextLayer(comp, visited) {
    var key = "";
    var bestLayer = null;
    var bestScore = -1;
    var i;

    try {
        key = String(comp.id || comp.name + "_" + comp.index);
    } catch (keyError) {
        key = String(comp.name);
    }
    visited = visited || {};
    if (visited[key]) {
        return null;
    }
    visited[key] = true;

    for (i = 1; i <= comp.numLayers; i += 1) {
        var layer = comp.layer(i);
        if (layer.property("ADBE Text Properties")) {
            var score = captionsV03TextLayerScore(layer);
            if (score > bestScore) {
                bestLayer = layer;
                bestScore = score;
            }
        }
    }

    if (bestLayer) {
        return bestLayer;
    }

    for (i = 1; i <= comp.numLayers; i += 1) {
        try {
            var source = comp.layer(i).source;
            if (source && source instanceof CompItem) {
                bestLayer = captionsV03FindPrimaryTextLayer(source, visited);
                if (bestLayer) {
                    return bestLayer;
                }
            }
        } catch (nestedError) {}
    }

    return null;
}

function captionsV03ForEachProperty(group, callback, path) {
    var i;
    path = path || "";
    if (!group || !group.numProperties) {
        return;
    }
    for (i = 1; i <= group.numProperties; i += 1) {
        var prop = group.property(i);
        if (!prop) {
            continue;
        }
        if (prop.propertyType === PropertyType.PROPERTY) {
            callback(prop, path + "/" + String(prop.name || prop.matchName || i));
        } else {
            captionsV03ForEachProperty(prop, callback, path + "/" + String(prop.name || prop.matchName || i));
        }
    }
}

function captionsV03KeyEaseAt(prop, keyIndex, direction) {
    try {
        return direction === "in" ? prop.keyInTemporalEase(keyIndex) : prop.keyOutTemporalEase(keyIndex);
    } catch (error) {
        return null;
    }
}

function captionsV03ReadPropertyKeys(prop) {
    var keyCount;
    var keys = [];
    var i;
    try {
        keyCount = prop.numKeys || 0;
        if (keyCount < 1 || prop.propertyValueType === PropertyValueType.NO_VALUE) {
            return keys;
        }
        for (i = 1; i <= keyCount; i += 1) {
            keys.push({
                time: prop.keyTime(i),
                value: prop.keyValue(i),
                inType: prop.keyInInterpolationType(i),
                outType: prop.keyOutInterpolationType(i),
                inEase: captionsV03KeyEaseAt(prop, i, "in"),
                outEase: captionsV03KeyEaseAt(prop, i, "out")
            });
        }
    } catch (error) {}
    return keys;
}

function captionsV03ClearPropertyKeys(prop) {
    try {
        while (prop.numKeys > 0) {
            prop.removeKey(1);
        }
    } catch (error) {}
}

function captionsV03SetStaticPropertyValue(prop, value) {
    try {
        captionsV03ClearPropertyKeys(prop);
        prop.setValue(value);
    } catch (error) {}
}

function captionsV03ApplyRetimedKeys(prop, keys, targetStart, targetEnd) {
    var originalStart;
    var originalEnd;
    var originalSpan;
    var targetSpan;
    var usedTimes = {};
    var i;

    if (!keys || !keys.length) {
        return;
    }

    originalStart = keys[0].time;
    originalEnd = keys[0].time;
    for (i = 1; i < keys.length; i += 1) {
        originalStart = Math.min(originalStart, keys[i].time);
        originalEnd = Math.max(originalEnd, keys[i].time);
    }
    originalSpan = Math.max(0.0001, originalEnd - originalStart);
    targetSpan = Math.max(0, Number(targetEnd) - Number(targetStart));

    captionsV03ClearPropertyKeys(prop);
    for (i = 0; i < keys.length; i += 1) {
        var normalized = targetSpan <= 0 ? 1 : (keys[i].time - originalStart) / originalSpan;
        var newTime = Number(targetStart) + (normalized * targetSpan);
        var keyName = newTime.toFixed(5);
        while (usedTimes[keyName]) {
            newTime += 0.00001;
            keyName = newTime.toFixed(5);
        }
        usedTimes[keyName] = true;
        try {
            prop.setValueAtTime(Math.max(0, newTime), keys[i].value);
            try {
                prop.setInterpolationTypeAtKey(i + 1, keys[i].inType, keys[i].outType);
                if (keys[i].inEase && keys[i].outEase) {
                    prop.setTemporalEaseAtKey(i + 1, keys[i].inEase, keys[i].outEase);
                }
            } catch (easeError) {}
        } catch (keyError) {}
    }
}

function captionsV03AnimationBucket(comp, start, end) {
    var frameDuration = comp && comp.frameDuration ? Number(comp.frameDuration) : 1 / 30;
    var duration = Math.max(frameDuration, Number(end) - Number(start));
    var frames = Math.max(1, Math.round(duration / frameDuration));
    var inFrames;
    var outFrames;

    if (frames <= 1) {
        inFrames = 0;
        outFrames = 0;
    } else if (frames <= 3) {
        inFrames = 1;
        outFrames = 0;
    } else if (frames <= 7) {
        inFrames = 1;
        outFrames = 1;
    } else if (frames <= 12) {
        inFrames = 2;
        outFrames = 2;
    } else if (frames <= 24) {
        inFrames = Math.min(4, Math.max(2, Math.round(frames * 0.22)));
        outFrames = Math.min(4, Math.max(2, Math.round(frames * 0.18)));
    } else {
        inFrames = Math.min(8, Math.max(3, Math.round(frames * 0.22)));
        outFrames = Math.min(8, Math.max(3, Math.round(frames * 0.18)));
    }

    return {
        frameDuration: frameDuration,
        frames: frames,
        start: Number(start),
        end: Number(end),
        visibleEnd: Math.max(Number(start), Number(end) - frameDuration),
        inFrames: inFrames,
        outFrames: outFrames
    };
}

function captionsV03ClassifyAnimatedProperty(path, prop) {
    var value = String(path || "").toLowerCase();
    if (prop && prop.matchName === "ADBE Text Document") {
        return "text";
    }
    if (value.indexOf(" out") !== -1 || value.indexOf("/out") !== -1 || value.indexOf("opacity out") !== -1 || value.indexOf("position out") !== -1) {
        return "out";
    }
    if (value.indexOf(" in") !== -1 || value.indexOf("/in") !== -1 || value.indexOf("opacity in") !== -1 || value.indexOf("position in") !== -1) {
        return "in";
    }
    return "full";
}

function captionsV03RetimeLayerKeys(layer, comp, start, end) {
    var bucket = captionsV03AnimationBucket(comp, start, end);
    captionsV03ForEachProperty(layer, function (prop, path) {
        var keys = captionsV03ReadPropertyKeys(prop);
        var type;
        var targetStart;
        var targetEnd;
        if (!keys.length) {
            return;
        }

        type = captionsV03ClassifyAnimatedProperty(path, prop);
        if (type === "text") {
            return;
        }

        if (type === "in") {
            if (bucket.inFrames < 1) {
                captionsV03SetStaticPropertyValue(prop, keys[keys.length - 1].value);
                return;
            }
            targetStart = bucket.start;
            targetEnd = Math.min(bucket.visibleEnd, bucket.start + (bucket.inFrames * bucket.frameDuration));
            captionsV03ApplyRetimedKeys(prop, keys, targetStart, targetEnd);
            return;
        }

        if (type === "out") {
            if (bucket.outFrames < 1) {
                captionsV03SetStaticPropertyValue(prop, keys[0].value);
                return;
            }
            targetEnd = bucket.visibleEnd;
            targetStart = Math.max(bucket.start, targetEnd - (bucket.outFrames * bucket.frameDuration));
            captionsV03ApplyRetimedKeys(prop, keys, targetStart, targetEnd);
            return;
        }

        if (bucket.frames <= 1) {
            captionsV03SetStaticPropertyValue(prop, keys[keys.length - 1].value);
            return;
        }
        captionsV03ApplyRetimedKeys(prop, keys, bucket.start, bucket.visibleEnd);
    }, layer.name);
}

function captionsV03SetTextDocumentText(sourceText, text, fontName) {
    var k;
    try {
        if (sourceText.numKeys && sourceText.numKeys > 0) {
            for (k = 1; k <= sourceText.numKeys; k += 1) {
                var keyedDoc = sourceText.keyValue(k);
                keyedDoc.text = text;
                if (fontName) {
                    keyedDoc.font = fontName;
                }
                sourceText.setValueAtKey(k, keyedDoc);
            }
            return;
        }

        var doc = sourceText.value;
        doc.text = text;
        if (fontName) {
            doc.font = fontName;
        }
        sourceText.setValue(doc);
    } catch (error) {}
}

function captionsV03CopyTemplateTextLayer(comp, templateTextLayer) {
    var beforeCount = comp.numLayers;
    var copiedLayer = null;
    templateTextLayer.copyToComp(comp);
    if (comp.numLayers > beforeCount) {
        copiedLayer = comp.layer(1);
    }
    if (!copiedLayer || !copiedLayer.property("ADBE Text Properties")) {
        throw new Error("Could not copy MOGRT text layer into target comp.");
    }
    return copiedLayer;
}

function captionsV03CopyTemplateLayer(comp, templateLayer) {
    var beforeCount = comp.numLayers;
    templateLayer.copyToComp(comp);
    if (comp.numLayers <= beforeCount) {
        throw new Error("Could not copy MOGRT layer into target comp.");
    }
    return comp.layer(1);
}

function captionsV03SetTextLayerValue(layer, text, fontName) {
    try {
        captionsV03SetTextDocumentText(layer.property("Source Text"), text, fontName || "");
    } catch (error) {}
}

function captionsV03PresetFontName(preset, fallback) {
    if (preset && preset.mogrt && preset.mogrt.forceFont) {
        return String(preset.mogrt.forceFont);
    }
    if (preset && preset.style && preset.style.font) {
        return String(preset.style.font);
    }
    return fallback || "";
}

function captionsV03CopyInfoMatchesName(copyInfo, nameList) {
    var templateName = copyInfo && copyInfo.templateName ? captionsV03NormalizedName(copyInfo.templateName) : "";
    var currentName = copyInfo && copyInfo.layer ? captionsV03NormalizedName(copyInfo.layer.name) : "";
    var i;
    if (!nameList || !nameList.length) {
        return false;
    }
    for (i = 0; i < nameList.length; i += 1) {
        var target = captionsV03NormalizedName(nameList[i]);
        if (target && (templateName === target || currentName === target)) {
            return true;
        }
    }
    return false;
}

function captionsV03FindGroupLayer(copies, preferredNames, textOnly, allowDisabled) {
    var i;
    var best = null;
    var bestScore = -1;

    if (preferredNames && preferredNames.length) {
        for (i = 0; i < copies.length; i += 1) {
            if (!copies[i] || !copies[i].layer) {
                continue;
            }
            if (textOnly && !copies[i].layer.property("ADBE Text Properties")) {
                continue;
            }
            if (!allowDisabled && captionsV03ParseBool(copies[i].disabledByPreset)) {
                continue;
            }
            if (captionsV03CopyInfoMatchesName(copies[i], preferredNames)) {
                return copies[i].layer;
            }
        }
    }

    for (i = 0; i < copies.length; i += 1) {
        var copyInfo = copies[i];
        if (!copyInfo || !copyInfo.layer) {
            continue;
        }
        if (textOnly && !copyInfo.layer.property("ADBE Text Properties")) {
            continue;
        }
        if (!allowDisabled && captionsV03ParseBool(copyInfo.disabledByPreset)) {
            continue;
        }
        var score = textOnly ? captionsV03TextLayerScore(copyInfo.layer) : Math.max(0, 1000 - copyInfo.layer.index);
        if (score > bestScore) {
            best = copyInfo.layer;
            bestScore = score;
        }
    }
    return best;
}

function captionsV03SetLayerEnabled(layer, enabled) {
    try {
        layer.enabled = !!enabled;
    } catch (error) {}
}

function captionsV03SetEffectPropertyValue(prop, value, fontName) {
    var current;
    if (!prop || prop.propertyType !== PropertyType.PROPERTY) {
        return false;
    }

    try {
        if (typeof value === "string") {
            current = prop.value;
            if (current && typeof current === "object" && current.text !== undefined) {
                current.text = value;
                if (fontName) {
                    current.font = fontName;
                }
                prop.setValue(current);
                return true;
            }
        }
    } catch (ignoreError) {}

    try {
        prop.setValue(value);
        return true;
    } catch (setError) {}

    return false;
}

function captionsV03SetNamedEffectValue(layer, effectName, value, fontName) {
    var effects;
    var effect;
    var i;
    if (!layer || !effectName) {
        return false;
    }
    try {
        effects = layer.property("ADBE Effect Parade");
        effect = effects ? effects.property(effectName) : null;
        if (!effect) {
            return false;
        }
        for (i = 1; i <= effect.numProperties; i += 1) {
            if (captionsV03SetEffectPropertyValue(effect.property(i), value, fontName)) {
                return true;
            }
        }
    } catch (error) {}
    return false;
}

function captionsV03ApplyNamedEffectValue(copies, effectNames, value, fontName) {
    var i;
    var j;
    var applied = false;
    if (!effectNames || !effectNames.length) {
        return false;
    }
    for (i = 0; i < copies.length; i += 1) {
        for (j = 0; j < effectNames.length; j += 1) {
            if (captionsV03SetNamedEffectValue(copies[i].layer, effectNames[j], value, fontName)) {
                applied = true;
            }
        }
    }
    return applied;
}

function captionsV03ApplyGroupControls(copies, controls, text, start, end, preset) {
    var duration = Math.max(0.04, Number(end) - Number(start));
    var fontName = captionsV03PresetFontName(preset, "");
    var hiddenLayerNames = controls && controls.hiddenLayerNames ? controls.hiddenLayerNames : [];
    var i;
    var effectName;

    if (controls && captionsV03ParseBool(controls.plainTextLayers)) {
        for (i = 0; i < copies.length; i += 1) {
            if (copies[i].layer && copies[i].layer.property("ADBE Text Properties")) {
                captionsV03SetTextLayerValue(copies[i].layer, text, fontName);
            }
        }
    }

    if (controls && controls.effectTextNames && controls.effectTextNames.length) {
        captionsV03ApplyNamedEffectValue(copies, controls.effectTextNames, text, fontName);
    }

    if (controls && controls.effectPointNames && controls.effectPointNames.length) {
        captionsV03ApplyNamedEffectValue(copies, controls.effectPointNames, [Number(start), duration], fontName);
    }

    if (controls && controls.effectNumberValues) {
        for (effectName in controls.effectNumberValues) {
            if (controls.effectNumberValues.hasOwnProperty(effectName)) {
                captionsV03ApplyNamedEffectValue(copies, [effectName], controls.effectNumberValues[effectName], fontName);
            }
        }
    }

    captionsV03ApplyNamedEffectValue(copies, ["Text Speed"], Math.max(1, (Math.max(1, captionsV03TrimText(text).split(/\s+/).length) / duration) * 10), fontName);

    for (i = 0; i < copies.length; i += 1) {
        if (captionsV03CopyInfoMatchesName(copies[i], hiddenLayerNames)) {
            copies[i].disabledByPreset = true;
            captionsV03SetLayerEnabled(copies[i].layer, false);
        }
    }
}

function captionsV03LayerByName(comp, name) {
    var i;
    for (i = 1; i <= comp.numLayers; i += 1) {
        if (comp.layer(i).name === name) {
            return comp.layer(i);
        }
    }
    return null;
}

function captionsV03ReplaceExpressionLayerNames(layer, nameMap) {
    captionsV03ForEachProperty(layer, function (prop) {
        var expression;
        var oldName;
        try {
            if (!prop.canSetExpression || !prop.expressionEnabled) {
                return;
            }
            expression = prop.expression;
            for (oldName in nameMap) {
                if (nameMap.hasOwnProperty(oldName)) {
                    expression = expression.split('thisComp.layer("' + oldName + '")').join('thisComp.layer("' + nameMap[oldName] + '")');
                }
            }
            expression = expression.split("Math.floor(time*").join("Math.floor(Math.max(0, time - thisLayer.inPoint)*");
            expression = expression.split("time%").join("(time - thisLayer.inPoint)%");
            if (expression.indexOf("if (c < b) {c} else{b-2};") !== -1) {
                expression = expression.split("if (c < b) {c} else{b-2};").join("Math.min(Math.max(c, 0), Math.max(b - 1, 0));");
            }
            prop.expression = expression;
        } catch (error) {}
    }, layer.name);
}

function captionsV03SetSliderEffect(layer, effectName, value) {
    try {
        var effect = layer.property("ADBE Effect Parade").property(effectName);
        if (effect) {
            effect.property(1).setValue(value);
        }
    } catch (error) {}
}

function captionsV03CreateMogrtGroupLayer(comp, text, start, end, preset, templateComp, index) {
    text = captionsV03TrimText(text);
    if (!text) {
        return null;
    }

    var layerStart = Math.max(0, Number(start) || 0);
    var layerEnd = Math.max(layerStart + 0.04, Number(end) || (layerStart + 0.04));
    if (comp && comp.duration && layerEnd > comp.duration) {
        layerEnd = comp.duration;
    }
    if (layerEnd <= layerStart) {
        layerEnd = layerStart + 0.04;
    }

    var originalNames = {};
    var copies = [];
    var fontName = captionsV03PresetFontName(preset, "");
    var controls = preset && preset.mogrt && preset.mogrt.controls ? preset.mogrt.controls : {};
    var i;
    for (i = templateComp.numLayers; i >= 1; i -= 1) {
        var templateLayer = templateComp.layer(i);
        var copiedLayer = captionsV03CopyTemplateLayer(comp, templateLayer);
        var newName = "CAP " + index + " " + templateLayer.name;
        if (templateLayer.name === "Control Layer") {
            newName = "CAP " + index + " Control";
        } else if (templateLayer.name === "Shape Layer 1") {
            newName = "CAP " + index + " Box";
        } else if (templateLayer.name === "Don't enter anything here") {
            newName = captionsV03SafeLayerName(text);
        } else if (templateLayer.property("Source Text")) {
            newName = "CAP " + index + " Input";
        }
        originalNames[templateLayer.name] = newName;
        copiedLayer.name = newName;
        captionsV03MarkGeneratedLayer(copiedLayer);
        copiedLayer.startTime = 0;
        copiedLayer.inPoint = 0;
        copiedLayer.outPoint = Math.max(comp.duration, layerEnd);
        captionsV03RetimeLayerKeys(copiedLayer, comp, layerStart, layerEnd);
        copies.push({
            layer: copiedLayer,
            templateName: templateLayer.name,
            disabledByPreset: false
        });
    }

    for (i = 0; i < copies.length; i += 1) {
        captionsV03ReplaceExpressionLayerNames(copies[i].layer, originalNames);
    }

    captionsV03ApplyGroupControls(copies, controls, text, layerStart, layerEnd, preset);

    var visibleLayer = captionsV03FindGroupLayer(copies, controls.visibleLayerNames || [], true, false);
    if (!visibleLayer) {
        visibleLayer = captionsV03FindGroupLayer(copies, [], true, false);
    }
    if (!visibleLayer) {
        visibleLayer = captionsV03FindGroupLayer(copies, [], false, true);
    }

    if (visibleLayer && visibleLayer.property("ADBE Text Properties")) {
        captionsV03SetTextLayerValue(visibleLayer, text, fontName);
        visibleLayer.name = captionsV03SafeLayerName(text);
    }

    for (i = 0; i < copies.length; i += 1) {
        copies[i].layer.startTime = 0;
        copies[i].layer.inPoint = layerStart;
        copies[i].layer.outPoint = layerEnd;
    }

    return visibleLayer || (copies.length ? copies[0].layer : null);
}

function captionsV03CreateMogrtLayer(comp, text, start, end, preset, templateTextLayer, index) {
    text = captionsV03TrimText(text);
    if (!text) {
        return null;
    }

    var layerStart = Math.max(0, Number(start) || 0);
    var layerEnd = Math.max(layerStart + 0.04, Number(end) || (layerStart + 0.04));
    if (comp && comp.duration && layerEnd > comp.duration) {
        layerEnd = comp.duration;
    }
    if (layerEnd <= layerStart) {
        layerEnd = layerStart + 0.04;
    }

    var layer = captionsV03CopyTemplateTextLayer(comp, templateTextLayer);
    captionsV03MarkGeneratedLayer(layer);
    layer.startTime = 0;
    layer.inPoint = 0;
    layer.outPoint = Math.max(comp.duration, layerEnd);
    captionsV03RetimeLayerKeys(layer, comp, layerStart, layerEnd);
    captionsV03SetTextDocumentText(layer.property("Source Text"), text, captionsV03PresetFontName(preset, ""));
    layer.name = captionsV03SafeLayerName(text);
    layer.startTime = 0;
    layer.inPoint = layerStart;
    layer.outPoint = layerEnd;

    try {
        layer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
    } catch (transformError) {}

    layer.startTime = 0;
    layer.inPoint = layerStart;
    layer.outPoint = layerEnd;
    return layer;
}

function captionsV03ParseBool(value) {
    if (value === true) {
        return true;
    }
    if (value === false || value === undefined || value === null) {
        return false;
    }

    value = String(value).toLowerCase();
    return value === "true" || value === "1" || value === "yes" || value === "on";
}

function captionsV03TrimText(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "");
}

function captionsV03BuildEntries(data, mode, wordsCount) {
    var entries = [];
    var i;
    for (i = 0; i < data.segments.length; i += 1) {
        var segment = data.segments[i];
        var segmentStart = Number(segment.start || 0);
        var segmentEnd = Number(segment.end || (segmentStart + 0.04));

        if (mode === "words" && segment.words && segment.words.length) {
            var chunks = captionsV03ChunkWords(segment.words, wordsCount);
            var j;
            for (j = 0; j < chunks.length; j += 1) {
                var chunk = chunks[j];
                entries.push({
                    text: captionsV03WordsToText(chunk),
                    start: Number(chunk[0].start || segmentStart),
                    end: Number(chunk[chunk.length - 1].end || segmentEnd)
                });
            }
        } else {
            entries.push({
                text: captionsV03TrimText(segment.text),
                start: segmentStart,
                end: segmentEnd
            });
        }
    }
    return entries;
}

function captionsV03BuildHighlightEntries(data) {
    var entries = [];
    var i;
    for (i = 0; i < data.segments.length; i += 1) {
        var segment = data.segments[i];
        if (segment.words && segment.words.length) {
            var j;
            for (j = 0; j < segment.words.length; j += 1) {
                var word = segment.words[j];
                entries.push({
                    text: captionsV03TrimText(word.text),
                    start: Number(word.start || segment.start || 0),
                    end: Number(word.end || segment.end || ((Number(word.start || segment.start || 0)) + 0.04)),
                    highlightActive: true
                });
            }
        } else {
            entries.push({
                text: captionsV03TrimText(segment.text),
                start: Number(segment.start || 0),
                end: Number(segment.end || ((Number(segment.start || 0)) + 0.04)),
                highlightActive: true
            });
        }
    }
    return entries;
}

function captionsV03BuildTypewriterEntries(data, wordsCount, revealMode) {
    var entries = [];
    var i;
    for (i = 0; i < data.segments.length; i += 1) {
        var segment = data.segments[i];
        var segmentStart = Number(segment.start || 0);
        var segmentEnd = Number(segment.end || (segmentStart + 0.04));

        if (!(segment.words && segment.words.length)) {
            entries.push({
                text: captionsV03TrimText(segment.text),
                start: segmentStart,
                end: segmentEnd,
                highlightActive: true
            });
            continue;
        }

        var chunks = captionsV03ChunkWords(segment.words, wordsCount);
        var j;
        for (j = 0; j < chunks.length; j += 1) {
            var chunk = chunks[j];
            var k;
            for (k = 0; k < chunk.length; k += 1) {
                var word = chunk[k];
                var start = Number(word.start || segmentStart);
                var end = k < chunk.length - 1
                    ? Number(chunk[k + 1].start || word.end || segmentEnd)
                    : Number(chunk[chunk.length - 1].end || segmentEnd);
                entries.push({
                    text: revealMode === "active-word" ? captionsV03TrimText(word.text) : captionsV03WordsToText(chunk.slice(0, k + 1)),
                    start: start,
                    end: Math.max(start + 0.04, end),
                    highlightActive: true
                });
            }
        }
    }
    return entries;
}

function captionsV03BuildSpotlightEntries(data, wordsCount, useSegmentChunks) {
    var entries = [];
    var i;
    for (i = 0; i < data.segments.length; i += 1) {
        var segment = data.segments[i];
        var segmentStart = Number(segment.start || 0);
        var segmentEnd = Number(segment.end || (segmentStart + 0.04));

        if (!(segment.words && segment.words.length)) {
            entries.push({
                text: captionsV03TrimText(segment.text),
                start: segmentStart,
                end: segmentEnd,
                highlightActive: false
            });
            continue;
        }

        var chunks = useSegmentChunks ? [segment.words] : captionsV03ChunkWords(segment.words, wordsCount);
        var j;
        for (j = 0; j < chunks.length; j += 1) {
            var chunk = chunks[j];
            if (!chunk.length) {
                continue;
            }
            var chunkStart = Number(chunk[0].start || segmentStart);
            var chunkEnd = Number(chunk[chunk.length - 1].end || segmentEnd);
            entries.push({
                text: captionsV03WordsToText(chunk),
                start: chunkStart,
                end: Math.max(chunkStart + 0.04, chunkEnd),
                highlightActive: false
            });

            var k;
            for (k = 0; k < chunk.length; k += 1) {
                var word = chunk[k];
                var start = Number(word.start || chunkStart);
                var end = k < chunk.length - 1
                    ? Number(chunk[k + 1].start || word.end || chunkEnd)
                    : Number(word.end || chunkEnd);
                entries.push({
                    text: captionsV03TrimText(word.text),
                    start: start,
                    end: Math.max(start + 0.04, end),
                    highlightActive: true
                });
            }
        }
    }
    return entries;
}

function captionsV03MarkEntriesHighlighted(entries) {
    var i;
    for (i = 0; i < entries.length; i += 1) {
        entries[i].highlightActive = true;
    }
    return entries;
}

function captionsV03ApplyLegato(entries) {
    var i;
    for (i = 0; i < entries.length - 1; i += 1) {
        var nextStart = Number(entries[i + 1].start);
        if (nextStart > Number(entries[i].start)) {
            entries[i].end = nextStart;
        }
    }
    return entries;
}

function captionsV03SeparatedOutputPath(jsonPath) {
    var file = new File(jsonPath);
    var parent = file.parent;
    var baseName = file.name || "captions";
    baseName = baseName.replace(/\.captions\.json$/i, "");
    baseName = baseName.replace(/\.smart-[a-f0-9]+$/i, "");
    baseName = captionsV03SanitizeName(baseName) || "captions";
    return parent.fsName + "/" + baseName + "_separated.captions.json";
}

function captionsV03BuildSeparatedPayload(sourcePath, data, entries, mode, wordsCount, legatoEnabled) {
    var segments = [];
    var i;
    for (i = 0; i < entries.length; i += 1) {
        if (!captionsV03TrimText(entries[i].text)) {
            continue;
        }
        segments.push({
            index: segments.length + 1,
            text: captionsV03TrimText(entries[i].text),
            start: Math.max(0, Number(entries[i].start) || 0),
            end: Math.max((Number(entries[i].start) || 0) + 0.04, Number(entries[i].end) || ((Number(entries[i].start) || 0) + 0.04)),
            comment: "",
            isMarker: false,
            markerName: "",
            markerColor: ""
        });
    }

    return {
        version: data.version || "captions.after.v1",
        generatedAt: new Date().toString(),
        sourceCaptionsJsonPath: sourcePath,
        sourceVideoPath: data.sourceVideoPath || "",
        compositionName: data.compositionName || "",
        captionMode: "segments",
        separatedFromMode: mode,
        wordsPerLayer: wordsCount,
        legatoEnabled: !!legatoEnabled,
        segmentCount: segments.length,
        segments: segments
    };
}

function captionsV03WriteSeparatedJSON(sourcePath, data, entries, mode, wordsCount, legatoEnabled) {
    var outputPath = captionsV03SeparatedOutputPath(sourcePath);
    var payload = captionsV03BuildSeparatedPayload(sourcePath, data, entries, mode, wordsCount, legatoEnabled);
    captionsV03WriteTextFile(outputPath, captionsV03JSONStringify(payload));
    return outputPath;
}

function captionsV03FlattenWords(data) {
    var words = [];
    var i;
    var j;
    if (!data || !data.segments) {
        return words;
    }

    for (i = 0; i < data.segments.length; i += 1) {
        var segment = data.segments[i];
        var segmentStart = Number(segment.start || 0);
        var segmentEnd = Number(segment.end || (segmentStart + 0.04));
        if (segment.words && segment.words.length) {
            for (j = 0; j < segment.words.length; j += 1) {
                var word = segment.words[j];
                var wordStart = Number(word.start || segmentStart);
                var wordEnd = Number(word.end || (wordStart + 0.04));
                words.push({
                    index: words.length,
                    text: captionsV03TrimText(word.text || word.word || ""),
                    start: Math.max(0, wordStart),
                    end: Math.max(wordStart + 0.04, wordEnd),
                    segmentIndex: i
                });
            }
        } else {
            var tokens = captionsV03TrimText(segment.text).split(/\s+/);
            var span = Math.max(0.04, segmentEnd - segmentStart);
            for (j = 0; j < tokens.length; j += 1) {
                var start = segmentStart + (span * j / Math.max(1, tokens.length));
                var end = j < tokens.length - 1
                    ? segmentStart + (span * (j + 1) / Math.max(1, tokens.length))
                    : segmentEnd;
                words.push({
                    index: words.length,
                    text: captionsV03TrimText(tokens[j]),
                    start: Math.max(0, start),
                    end: Math.max(start + 0.04, end),
                    segmentIndex: i
                });
            }
        }
    }
    return words;
}

function captionsV03InitialEditorText(data, mode, wordsCount) {
    var entries = captionsV03BuildEntries(data, mode === "smart" ? "phrases" : mode, wordsCount);
    var lines = [];
    var i;
    for (i = 0; i < entries.length; i += 1) {
        if (captionsV03TrimText(entries[i].text)) {
            lines.push(captionsV03TrimText(entries[i].text));
        }
    }
    return lines.join("\n");
}

function captionsV03ReadGeneratedLayersFromActiveComp() {
    try {
        var comp = captionsV03GetActiveComp();
        if (!comp) {
            throw new Error("No active comp available.");
        }

        var items = [];
        var seen = {};
        var i;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var layer = comp.layer(i);
            if (!captionsV03LayerIsGenerated(layer)) {
                continue;
            }
            if (!layer.property("Source Text")) {
                continue;
            }

            var textDocument = layer.property("Source Text").value;
            var text = captionsV03TrimText(textDocument && textDocument.text ? textDocument.text : "");
            if (!text) {
                continue;
            }

            var start = Math.max(0, Number(layer.inPoint) || 0);
            var end = Math.max(start + 0.04, Number(layer.outPoint) || (start + 0.04));
            var key = start.toFixed(4) + "|" + end.toFixed(4) + "|" + text;
            if (seen[key]) {
                continue;
            }
            seen[key] = true;
            items.push({
                text: text,
                start: start,
                end: end,
                name: layer.name || ""
            });
        }

        items.sort(function (a, b) {
            if (a.start === b.start) {
                return a.end - b.end;
            }
            return a.start - b.start;
        });

        return captionsV03JSONStringify({
            ok: true,
            compName: comp.name,
            layerCount: items.length,
            text: items.map(function (item) { return item.text; }).join("\n"),
            layers: items
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03BuildEditorPayload(jsonPath, captionMode, wordsPerLayer) {
    try {
        var resolved = captionsV03ResolveEditorDocument(jsonPath);
        var data = resolved.data;
        if (!captionsV03HasSegments(data)) {
            throw new Error("Captions JSON has no segments.");
        }

        var mode = captionMode || "words";
        var wordsCount = parseInt(wordsPerLayer, 10);
        if (!wordsCount || wordsCount < 1) {
            wordsCount = 1;
        }

        var words = captionsV03FlattenWords(data);
        return captionsV03JSONStringify({
            ok: true,
            jsonPath: resolved.path,
            sourceVideoPath: data.sourceVideoPath || "",
            compositionName: data.compositionName || "",
            text: captionsV03InitialEditorText(data, mode, wordsCount),
            wordCount: words.length,
            words: words
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03NormalizeManualLine(value) {
    return captionsV03TrimText(String(value || "").replace(/\s+/g, " "));
}

function captionsV03NormalizeWordForMatch(value) {
    return captionsV03TrimText(String(value || "").toLowerCase().replace(/[^\w\u00c0-\u017f]+/g, ""));
}

function captionsV03FindManualWordMatch(words, token, startIndex) {
    var target = captionsV03NormalizeWordForMatch(token);
    var i;
    if (!target) {
        return startIndex;
    }

    for (i = startIndex; i < Math.min(words.length, startIndex + 8); i += 1) {
        if (captionsV03NormalizeWordForMatch(words[i].text) === target) {
            return i;
        }
    }

    return startIndex;
}

function captionsV03BuildManualEntriesFromText(data, editorText) {
    var words = captionsV03FlattenWords(data);
    var lines = String(editorText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var entries = [];
    var wordIndex = 0;
    var i;

    for (i = 0; i < lines.length; i += 1) {
        var line = captionsV03NormalizeManualLine(lines[i]);
        if (!line) {
            continue;
        }

        var tokens = line.split(/\s+/);
        var mapped = [];
        var display = [];
        var j;
        for (j = 0; j < tokens.length; j += 1) {
            var token = captionsV03TrimText(tokens[j]);
            if (!token) {
                continue;
            }
            display.push(token);
            if (wordIndex < words.length) {
                var matchedIndex = captionsV03FindManualWordMatch(words, token, wordIndex);
                mapped.push({
                    text: token,
                    start: words[matchedIndex].start,
                    end: words[matchedIndex].end
                });
                wordIndex = matchedIndex + 1;
            }
        }

        if (!mapped.length) {
            continue;
        }

        entries.push({
            text: display.join(" "),
            start: Number(mapped[0].start || 0),
            end: Number(mapped[mapped.length - 1].end || (Number(mapped[0].start || 0) + 0.04)),
            wordStartIndex: wordIndex - mapped.length,
            wordEndIndex: wordIndex - 1
        });
    }

    for (i = 0; i < entries.length; i += 1) {
        if (i < entries.length - 1) {
            entries[i].end = Math.max(Number(entries[i].start) + 0.04, Number(entries[i + 1].start) - 0.001);
        } else {
            entries[i].end = Math.max(Number(entries[i].start) + 0.04, Number(entries[i].end) || (Number(entries[i].start) + 0.04));
        }
    }

    return entries;
}

function captionsV03CreateEntriesInComp(comp, entries, preset, mogrtTemplateComp, mogrtTemplateTextLayer) {
    var created = 0;
    var skipped = 0;
    var warnings = [];
    var i;
    for (i = 0; i < entries.length; i += 1) {
        try {
            var layer = mogrtTemplateComp
                ? (preset.mogrt && preset.mogrt.copyMode === "group"
                    ? captionsV03CreateMogrtGroupLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, mogrtTemplateComp, i + 1)
                    : captionsV03CreateMogrtLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, mogrtTemplateTextLayer, i + 1))
                : captionsV03CreateLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, entries[i].highlightActive);
            if (layer) {
                created += 1;
            } else {
                skipped += 1;
            }
        } catch (layerError) {
            skipped += 1;
            if (warnings.length < 6) {
                warnings.push(
                    "Layer " + (i + 1) + " skipped at " +
                    captionsV03Number(entries[i].start, 0).toFixed(3) + "s: " +
                    layerError.toString() + " (" + captionsV03SafeLayerName(entries[i].text) + ")"
                );
            }
        }
    }

    return {
        created: created,
        skipped: skipped,
        warnings: warnings
    };
}

function captionsV03BakeEditedText(jsonPath, editorText, destination, compName, legatoEnabled, presetJSON, exportSeparatedJSON) {
    try {
        app.beginUndoGroup("Bake Captions V03");

        var data = captionsV03ReadJSONFile(jsonPath);
        if (!data || !data.segments || !data.segments.length) {
            throw new Error("Captions JSON has no segments.");
        }

        var comp = captionsV03ResolveComp(destination, compName, data);
        var preset = captionsV03ParsePreset(presetJSON, comp);
        legatoEnabled = captionsV03ParseBool(legatoEnabled);
        var entries = captionsV03BuildManualEntriesFromText(data, editorText);
        if (!entries.length) {
            throw new Error("Transcript editor has no timed text to burn.");
        }
        if (legatoEnabled) {
            captionsV03ApplyLegato(entries);
        }

        var mogrtTemplateComp = captionsV03PresetUsesMogrt(preset) ? captionsV03LoadMogrtTemplate(preset) : null;
        var mogrtTemplateTextLayer = mogrtTemplateComp ? captionsV03FindPrimaryTextLayer(mogrtTemplateComp, {}) : null;
        if (mogrtTemplateComp && !mogrtTemplateTextLayer) {
            throw new Error("No text layer found inside MOGRT template: " + preset.name);
        }

        var separatedPath = "";
        if (captionsV03ParseBool(exportSeparatedJSON)) {
            separatedPath = captionsV03WriteSeparatedJSON(jsonPath, data, entries, "manual", 0, legatoEnabled);
        }
        captionsV03EnsureCompDuration(comp, entries, data);

        var removed = captionsV03RemoveGeneratedLayers(comp);
        var result = captionsV03CreateEntriesInComp(comp, entries, preset, mogrtTemplateComp, mogrtTemplateTextLayer);
        if (result.created < 1) {
            throw new Error("No subtitle layers could be created. " + (result.warnings.length ? result.warnings.join(" | ") : "Check the comp duration and captions timing."));
        }

        app.endUndoGroup();
        return captionsV03JSONStringify({
            ok: true,
            compName: comp.name,
            layersCreated: result.created,
            layersRemoved: removed,
            skippedLayers: result.skipped,
            warnings: result.warnings,
            legatoEnabled: legatoEnabled,
            separatedCaptionsJsonPath: separatedPath,
            presetName: preset.name,
            mode: "manual"
        });
    } catch (error) {
        try {
            app.endUndoGroup();
        } catch (ignoreError) {}
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03ExportSeparatedJson(jsonPath, captionMode, wordsPerLayer, legatoEnabled) {
    try {
        var data = captionsV03ReadJSONFile(jsonPath);
        if (!data || !data.segments || !data.segments.length) {
            throw new Error("Captions JSON has no segments.");
        }

        var mode = captionMode || "words";
        var wordsCount = parseInt(wordsPerLayer, 10);
        if (!wordsCount || wordsCount < 1) {
            wordsCount = 1;
        }
        legatoEnabled = captionsV03ParseBool(legatoEnabled);

        var entries = captionsV03BuildEntries(data, mode === "smart" ? "phrases" : mode, wordsCount);
        if (legatoEnabled) {
            captionsV03ApplyLegato(entries);
        }

        var outputPath = captionsV03WriteSeparatedJSON(jsonPath, data, entries, mode, wordsCount, legatoEnabled);
        return captionsV03JSONStringify({
            ok: true,
            path: outputPath,
            segments: entries.length
        });
    } catch (error) {
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03ImportFromJson(jsonPath, destination, captionMode, wordsPerLayer, compName, legatoEnabled, presetJSON, exportSeparatedJSON) {
    try {
        app.beginUndoGroup("Import Captions");

        var data = captionsV03ReadJSONFile(jsonPath);
        if (!data || !data.segments || !data.segments.length) {
            throw new Error("Captions JSON has no segments.");
        }

        var comp = captionsV03ResolveComp(destination, compName, data);
        var preset = captionsV03ParsePreset(presetJSON, comp);
        var mode = captionMode || "words";
        var wordsCount = parseInt(wordsPerLayer, 10);
        if (!wordsCount || wordsCount < 1) {
            wordsCount = 1;
        }
        legatoEnabled = captionsV03ParseBool(legatoEnabled);
        var mogrtTemplateComp = captionsV03PresetUsesMogrt(preset) ? captionsV03LoadMogrtTemplate(preset) : null;
        var mogrtTemplateTextLayer = mogrtTemplateComp ? captionsV03FindPrimaryTextLayer(mogrtTemplateComp, {}) : null;
        if (mogrtTemplateComp && !mogrtTemplateTextLayer) {
            throw new Error("No text layer found inside MOGRT template: " + preset.name);
        }

        var entries = captionsV03BuildEntries(data, mode === "smart" ? "phrases" : mode, wordsCount);
        if (legatoEnabled) {
            captionsV03ApplyLegato(entries);
        }
        var separatedPath = "";
        if (captionsV03ParseBool(exportSeparatedJSON)) {
            separatedPath = captionsV03WriteSeparatedJSON(jsonPath, data, entries, mode, wordsCount, legatoEnabled);
        }
        captionsV03EnsureCompDuration(comp, entries, data);

        var created = 0;
        var skipped = 0;
        var warnings = [];
        var i;
        for (i = 0; i < entries.length; i += 1) {
            try {
                var layer = mogrtTemplateComp
                    ? (preset.mogrt && preset.mogrt.copyMode === "group"
                        ? captionsV03CreateMogrtGroupLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, mogrtTemplateComp, i + 1)
                        : captionsV03CreateMogrtLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, mogrtTemplateTextLayer, i + 1))
                    : captionsV03CreateLayer(comp, entries[i].text, entries[i].start, entries[i].end, preset, entries[i].highlightActive);
                if (layer) {
                    created += 1;
                } else {
                    skipped += 1;
                }
            } catch (layerError) {
                skipped += 1;
                if (warnings.length < 6) {
                    warnings.push(
                        "Layer " + (i + 1) + " skipped at " +
                        captionsV03Number(entries[i].start, 0).toFixed(3) + "s: " +
                        layerError.toString() + " (" + captionsV03SafeLayerName(entries[i].text) + ")"
                    );
                }
            }
        }

        if (created < 1) {
            throw new Error("No subtitle layers could be created. " + (warnings.length ? warnings.join(" | ") : "Check the comp duration and captions timing."));
        }

        app.endUndoGroup();
        return captionsV03JSONStringify({
            ok: true,
            compName: comp.name,
            layersCreated: created,
            skippedLayers: skipped,
            warnings: warnings,
            legatoEnabled: legatoEnabled,
            separatedCaptionsJsonPath: separatedPath,
            mogrtTemplate: mogrtTemplateComp ? preset.name : "",
            presetName: preset.name
        });
    } catch (error) {
        try {
            app.endUndoGroup();
        } catch (ignoreError) {}
        return captionsV03Response(false, error.toString());
    }
}

function captionsV03SnapshotRenderQueue() {
    var queue = app.project.renderQueue;
    var snapshot = [];
    var i;
    for (i = 1; i <= queue.numItems; i += 1) {
        snapshot.push({
            item: queue.item(i),
            render: queue.item(i).render
        });
    }
    return snapshot;
}

function captionsV03RestoreRenderQueue(snapshot) {
    var i;
    for (i = 0; i < snapshot.length; i += 1) {
        try {
            snapshot[i].item.render = snapshot[i].render;
        } catch (error) {}
    }
}

function captionsV03ExportActiveCompForTranscription(outputDir) {
    var snapshot = null;
    var renderItem = null;

    try {
        var comp = captionsV03GetActiveComp();
        if (!comp) {
            throw new Error("No active comp available for export.");
        }

        if (!outputDir) {
            outputDir = captionsV03GetProjectFolder();
        }
        if (!outputDir) {
            throw new Error("Save the After Effects project or choose an output folder.");
        }

        var folder = captionsV03EnsureFolder(outputDir);
        var baseName = captionsV03SanitizeName(comp.name || "comp");
        if (!baseName) {
            baseName = "comp";
        }

        snapshot = captionsV03SnapshotRenderQueue();

        renderItem = app.project.renderQueue.items.add(comp);
        try {
            renderItem.applyTemplate("Best Settings");
        } catch (error) {}

        var timelineOffset = Math.max(0, Number(comp.workAreaStart || 0));
        var workAreaDuration = Number(comp.workAreaDuration || 0);
        if (!workAreaDuration || workAreaDuration <= 0) {
            workAreaDuration = comp.duration;
        }
        try {
            renderItem.timeSpanStart = timelineOffset;
            renderItem.timeSpanDuration = workAreaDuration;
        } catch (timeSpanError) {
            timelineOffset = 0;
            workAreaDuration = comp.duration;
        }

        var outputModule = renderItem.outputModule(1);
        var audioTemplate = captionsV03ChooseAudioTemplate(outputModule);
        var outputExtension = ".mov";

        try {
            if (audioTemplate) {
                outputModule.applyTemplate(audioTemplate);
                outputExtension = captionsV03GuessAudioExtension(outputModule, audioTemplate);
            } else {
                outputModule.applyTemplate("Lossless");
            }
        } catch (errorTwo) {}

        var outputFile = new File(folder.fsName + "/" + baseName + "_captions" + outputExtension);
        renderItem.outputModule(1).file = outputFile;

        var i;
        for (i = 0; i < snapshot.length; i += 1) {
            try {
                snapshot[i].item.render = false;
            } catch (ignoreOne) {}
        }
        renderItem.render = true;

        app.project.renderQueue.render();

        outputFile = captionsV03ResolveRenderedFile(folder, baseName, outputFile);

        captionsV03RestoreRenderQueue(snapshot);
        try {
            renderItem.remove();
        } catch (ignoreTwo) {}

        return captionsV03JSONStringify({
            ok: true,
            videoPath: outputFile.fsName,
            deleteSourceWhenDone: true,
            compositionName: comp.name,
            duration: comp.duration,
            timelineOffset: timelineOffset,
            workAreaDuration: workAreaDuration
        });
    } catch (errorThree) {
        if (snapshot) {
            captionsV03RestoreRenderQueue(snapshot);
        }
        try {
            if (renderItem) {
                renderItem.remove();
            }
        } catch (ignoreThree) {}
        return captionsV03Response(false, errorThree.toString());
    }
}
