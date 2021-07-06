var sketch = require("sketch/dom");

export function saveLocale(context) {
    var localeContext = getLocaleContext(context);

    if (localeContext["folder_path"]) {
        if (!localeContext["current_locale"]) {
            var newLocaleByUser = getNewLocaleByUser();
            if (newLocaleByUser) {
                localeContext["current_locale"] = newLocaleByUser;
                saveConfigFile(localeContext);
            }
        }

        if (localeContext["current_locale"]) {
            var textLayersContent = getTexts();
            if (saveLocaleToFile(localeContext, textLayersContent)) context.document.showMessage("'" + localeContext["current_locale"] + "' locale saved.");
        }
    }
}

export function changeLocale(context) {
    var localeContext = getLocaleContext(context);

    if (localeContext["folder_path"]) {
        var window = NSWindow.alloc().init();
        window.setTitle("Change locale");
        window.setFrame_display(NSMakeRect(0, 0, 600, 170), false);

        var promptField = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 0, 0));
        promptField.setEditable(false);
        promptField.setBordered(false);
        promptField.setDrawsBackground(false);
        promptField.setStringValue("Select locale from list or create a new one:");
        promptField.sizeToFit();
        promptField.setFrame(NSMakeRect(20, 100, promptField.frame().size.width, promptField.frame().size.height));
        window.contentView().addSubview(promptField);

        var inputField = NSComboBox.alloc().initWithFrame(NSMakeRect(promptField.frame().size.width + 30, 95, 180, 25));
        inputField.addItemsWithObjectValues(localeContext["locales"]);
        inputField.setEditable(false);
        window.contentView().addSubview(inputField);
        if (localeContext["current_locale"]) inputField.selectItemWithObjectValue(localeContext["current_locale"]);

        var okButton = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 0, 0));
        okButton.setTitle("  Change  ");
        okButton.setBezelStyle(NSRoundedBezelStyle);
        okButton.sizeToFit();
        okButton.setFrame(
            NSMakeRect(window.frame().size.width - okButton.frame().size.width - 20, 14, okButton.frame().size.width, okButton.frame().size.height)
        );
        okButton.setKeyEquivalent("\r"); // return key
        okButton.setCOSJSTargetFunction(function(sender) {
            if (updateTextsFromLocale(localeContext, inputField.stringValue())) {
                context.document.showMessage("Changed to locale '" + localeContext["current_locale"] + "'.");
                window.orderOut(null);
                NSApp.stopModal();
            } else {
                context.document.showMessage("It has been an error, please try again.");
            }
        });
        window.contentView().addSubview(okButton);

        var cancelButton = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 0, 0));
        cancelButton.setTitle("  Cancel  ");
        cancelButton.setBezelStyle(NSRoundedBezelStyle);
        cancelButton.sizeToFit();
        cancelButton.setFrame(
            NSMakeRect(okButton.frame().origin.x - cancelButton.frame().size.width, 14, cancelButton.frame().size.width, cancelButton.frame().size.height)
        );
        cancelButton.setKeyEquivalent("\u{1b}"); // escape key
        cancelButton.setCOSJSTargetFunction(function(sender) {
            window.orderOut(null);
            NSApp.stopModal();
        });
        window.contentView().addSubview(cancelButton);

        var newLocaleButton = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 0, 0));
        newLocaleButton.setTitle("  Add new locale  ");
        newLocaleButton.setBezelStyle(NSRoundedBezelStyle);
        newLocaleButton.sizeToFit();
        newLocaleButton.setFrame(NSMakeRect(20, okButton.frame().size.height + 14, 560, newLocaleButton.frame().size.height));
        newLocaleButton.setCOSJSTargetFunction(function(sender) {
            var newLocaleName = getNewLocaleByUser();
            if (newLocaleName) {
                localeContext["current_locale"] = newLocaleName;
                saveConfigFile(localeContext);
                var textLayersContent = getTexts();
                if (saveLocaleToFile(localeContext, textLayersContent)) {
                    context.document.showMessage("'" + localeContext["current_locale"] + "' locale created.");
                    window.orderOut(null);
                    NSApp.stopModal();
                }
            }
        });
        window.contentView().addSubview(newLocaleButton);

        var saveLocaleButton = NSButton.alloc().initWithFrame(NSMakeRect(0, 0, 0, 0));
        var saveLocaleButtonTitle = "  Save current locale  ";
        if (localeContext["current_locale"]) saveLocaleButtonTitle = "  Save current locale '" + localeContext["current_locale"] + "'  ";
        saveLocaleButton.setTitle(saveLocaleButtonTitle);
        saveLocaleButton.setBezelStyle(NSRoundedBezelStyle);
        saveLocaleButton.sizeToFit();
        saveLocaleButton.setFrame(NSMakeRect(20, 14, saveLocaleButton.frame().size.width, saveLocaleButton.frame().size.height));
        saveLocaleButton.setCOSJSTargetFunction(function(sender) {
            saveLocale(context);
        });
        window.contentView().addSubview(saveLocaleButton);

        NSApp.runModalForWindow(window);
    }
}

function saveConfigFile(localeContext) {
    var currentLocaleFile = localeContext["current_locale"];
    if (
        !NSString.stringWithString(currentLocaleFile).writeToFile_atomically_encoding_error(localeContext["config_file_path"], true, NSUTF8StringEncoding, null)
    ) {
        context.document.showMessage("It has been an error when saving config file.");
    }
}

function getLocaleTextFromFile(localeContext, locale) {
    var file = localeContext["folder_path"] + locale + ".json";
    var fileContent = NSString.stringWithContentsOfFile_encoding_error(file, NSUTF8StringEncoding, null);
    var arrayContent = JSON.parse(fileContent, undefined, 2);

    return arrayContent;
}

function saveLocaleToFile(localeContext, textLayersContent) {
    var currentLocaleContent = JSON.stringify(textLayersContent, undefined, 2);
    var currentLocaleFilePath = localeContext["folder_path"] + localeContext["current_locale"] + ".json";
    return NSString.stringWithString(currentLocaleContent).writeToFile_atomically_encoding_error(currentLocaleFilePath, true, NSUTF8StringEncoding, null)
        ? true
        : false;
}

function updateTextsFromLocale(localeContext, selected_locale) {
    var document = sketch.getSelectedDocument();

    if (localeIsAvailable(localeContext, selected_locale)) {
        var newTexts = getLocaleTextFromFile(localeContext, selected_locale);

        Object.keys(newTexts).forEach((layerId) => {
            var layer = document.getLayerWithID(layerId);
            if (layer.type === "Text") {
                layer.text = newTexts[layerId].value;
            } else if (layer.type === "SymbolInstance") {
                newTexts[layerId].overrides.forEach((newOverride) => {
                    var override = layer.overrides.find((o) => o.id === newOverride._id);
                    if (override !== undefined) {
                        override.value = newOverride.value;
                    }
                });
            }
        });

        localeContext["current_locale"] = selected_locale;
        saveConfigFile(localeContext);

        return true;
    } else {
        return false;
    }
}

function localeIsAvailable(localeContext, selected_locale) {
    var response = false;

    for (var i = 0; i < localeContext["locales"].length; i++) {
        if (String(localeContext["locales"][i]) == String(selected_locale)) response = true;
    }
    return response;
}

function getNewLocaleByUser() {
    var response = null;

    var accessory = NSView.alloc().initWithFrame(NSMakeRect(0, 0, 300, 50));
    var input = NSTextField.alloc().initWithFrame(NSMakeRect(0, 25, 300, 25));
    input.editable = true;
    accessory.addSubview(input);
    var alert = NSAlert.alloc().init();
    alert.setMessageText("Set locale name");
    alert.setInformativeText("Recomended naming: es_ES, en_EN, es, en, es_CO...");
    alert.setAccessoryView(accessory);
    alert.addButtonWithTitle("Save");
    alert.addButtonWithTitle("Cancel");

    var responseCode = alert.runModal();
    var selected_locale_input = input.stringValue();

    if (responseCode == 1000 && selected_locale_input != "") response = selected_locale_input;

    return response;
}

function getTexts() {
    var texts = {};
    var sketch = require("sketch/dom");
    var document = sketch.getSelectedDocument();
    sketch.find("Text", document).forEach((textLayer) => {
        if (texts[textLayer.id]) {
            throw "Already processed layer with id " + textLayer.id;
        }
        texts[textLayer.id] = {
            _type: "Text",
            value: textLayer.text,
        };
    });
    sketch.find("SymbolInstance", document).forEach((symbolInstance) => {
        if (texts[symbolInstance.id]) {
            throw "Already processed layer with id " + symbolInstance.id;
        }
        texts[symbolInstance.id] = {
            _type: "SymbolInstance",
            overrides: symbolInstance.overrides
                .filter((o) => o.property === "stringValue")
                .map((override) => {
                    return {
                        _id: override.id,
                        value: override.value,
                    };
                }),
        };
    });
    return texts;
}

function getLocaleContext(context) {
    var document = context.document;
    var app = NSApplication.sharedApplication();
    var localeContext = new Array();
    localeContext["folder_path"] = null;
    localeContext["config_file_path"] = null;
    localeContext["locales"] = new Array();
    localeContext["current_locale"] = null;

    // Check if document is saved
    if (document.fileURL() == null)
        app.displayDialog_withTitle("You need to save the document in your computer in order to save texts translations.", "Document required");
    else {
        var documentName = document.displayName();
        var documentFolderPath = decodeURIComponent(document.fileURL())
            .replace("file://", "")
            .replace(documentName, "")
            .replace(".sketch", "");
        var translationsFolderName = documentName.replace(".sketch", "") + "_translations";
        var translationsFolderPath = documentFolderPath + translationsFolderName + "/";

        var fileManager = NSFileManager.defaultManager();

        // Create translations folder if does not exists
        if (fileManager.fileExistsAtPath(translationsFolderPath)) {
            // translation folder exists
        } else {
            if (fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(translationsFolderPath, true, null, null)) {
                context.document.showMessage("Translations folder created.");
            } else {
                app.displayDialog_withTitle("It has been an error when creating translations folder.", "Error");
            }
        }

        // Check translations folder
        if (fileManager.fileExistsAtPath(translationsFolderPath)) {
            localeContext["folder_path"] = translationsFolderPath;

            // Check if config file (with current_locale) exists
            localeContext["config_file_path"] = translationsFolderPath + ".config";
            if (fileManager.fileExistsAtPath(localeContext["config_file_path"]))
                var configFileContent = NSString.stringWithContentsOfFile_encoding_error(localeContext["config_file_path"], NSUTF8StringEncoding, null);

            // Check translations folder files
            var dirContents = fileManager.contentsOfDirectoryAtPath_error(translationsFolderPath, null);

            for (var i = 0; i < dirContents.count(); i++)
                if (dirContents[i].includes(".json")) {
                    var locale = dirContents[i].replace(".json", "");
                    localeContext["locales"].push(locale);
                    if (String(configFileContent) == String(locale)) localeContext["current_locale"] = locale;
                }
        }
    }
    return localeContext;
}
