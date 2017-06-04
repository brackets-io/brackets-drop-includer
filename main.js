define(function(require, exports, module) {

    'use strict';

    // Brackets modules
    var DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        KeyEvent = brackets.getModule("utils/KeyEvent"),
        AppInit = brackets.getModule("utils/AppInit"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils");

    //var modalHTML = require("text!modal.html");

    var commandID = "jzmstrjp.drop_includer.drop_includer_open";

    var currentDoc,
        editor;

    var dropZone;




    ExtensionUtils.loadStyleSheet(module, "main.less");

    CommandManager.register("Open Drop Includer", commandID, openDialog);
    KeyBindingManager.addBinding(commandID, "Ctrl-.");



    /*****************************
     * init
     */
    function init() {
        initDropDialog();
    }



    function drag_and_move(dropZone, obj) {
        var x,
            y,
            dropZoneStyle,
            dropZoneX,
            dropZoneY,
            dragZone = dropZone,
            dragMode = false;

        if (obj && obj.dragZone) {
            dragZone = document.querySelector(obj.dragZone);
            dragZone.style.cursor = "move";
        }

        if (obj && obj.resizer === true) {
            var resizer = document.createElement("div");
            resizer.style.width = 0;
            resizer.style.height = 0;
            resizer.style.cursor = "se-resize";
            resizer.style.position = "absolute";
            resizer.style.right = 0;
            resizer.style.bottom = 0;
            resizer.style.zIndex = 5;
            resizer.style.borderStyle = "solid";
            resizer.style.borderWidth = "15px";
            resizer.style.borderColor = "transparent #000 #000 transparent";
            resizer.style.opacity = 0.6;
            resizer.style.boxSizing = "border-box";
            

            dropZone.appendChild(resizer);
            var dropZoneW,
        	    dropZoneH,
        	    dropZoneX,
          		dropZoneY,
            	resizeMode = false;

            resizer.addEventListener("mousedown", function(e) {
            	e.stopPropagation();
                resizeMode = true;
                x = e.clientX;
                y = e.clientY;

                dropZoneStyle = window.getComputedStyle(dropZone);
                dropZoneW = parseFloat(dropZoneStyle.width);
                dropZoneH = parseFloat(dropZoneStyle.height);
                dropZoneX = parseFloat(dropZoneStyle.left);
            	dropZoneY = parseFloat(dropZoneStyle.top);
            });

            document.body.addEventListener("mouseup", function() {
                resizeMode = false;
            });

            document.body.addEventListener("mousemove", function(e) {
                if (resizeMode) {
                    var plusX = e.clientX - x;
                    var plusY = e.clientY - y;
                    dropZone.style.width = dropZoneW + plusX + "px";
                    dropZone.style.height = dropZoneH + plusY + "px";
                    dropZone.style.left = dropZoneX + plusX / 2 + "px";
                	dropZone.style.top = dropZoneY + plusY / 2 + "px";
                }
            });
        }


        dragZone.addEventListener("mousedown", function(e) {
            dragMode = true;
            x = e.clientX;
            y = e.clientY;

            dropZoneStyle = window.getComputedStyle(dropZone);
            dropZoneX = parseFloat(dropZoneStyle.left);
            dropZoneY = parseFloat(dropZoneStyle.top);
        });

        document.body.addEventListener("mouseup", function() {
            dragMode = false;
        });

        document.body.addEventListener("mousemove", function(e) {
            if (dragMode) {
                var plusX = e.clientX - x;
                var plusY = e.clientY - y;
                dropZone.style.left = dropZoneX + plusX + "px";
                dropZone.style.top = dropZoneY + plusY + "px";
            }
        });
    }


    /*****************************
     * drop dialog initialize
     */
    function initDropDialog() {
        dropZone = document.createElement("div");
        dropZone.id = "tagInserterDropZone";
        document.body.appendChild(dropZone);
        dropZone.innerHTML = '<div class="tagInserterWaku" id="tagInserterRoot"><p class="tagInserterP">Root Path</p></div><p id="tagInserterClose"><span>Close</span></p><div class="tagInserterWaku" id="tagInserterRel"><p class="tagInserterP">Relative Path</p></div><p class="tagInserterCenterP"><span>Drop the files.</span></p>';
        var $dropZoneChild = $("#tagInserterDropZone .tagInserterWaku");
        $dropZoneChild.on('dragenter', _handleDragEnter);
        $dropZoneChild.on('dragleave', _handleDragLeave);
        $dropZoneChild.on('drop', _handleDrop);
        document.getElementById("tagInserterClose").addEventListener("click", function() {
            dropZone.style.display = "none";
        });

        drag_and_move(dropZone, { dragZone: ".tagInserterCenterP", resizer: true });
    }

    function openDialog() {
        if (dropZone && dropZone.style.display !== "block") {
            dropZone.style.display = "block";
        } else {
            dropZone.style.display = "none";
        }
    }


    /******************************
     * drag and drop handle
     */
    function _handleDrop(e) {
        var root = false;
        if (this.id === "tagInserterRoot") {
            root = true;
        }

        currentDoc = DocumentManager.getCurrentDocument();
        if (!currentDoc) return false;

        editor = EditorManager.getCurrentFullEditor();
        if (!editor) return false;


        var files = e.originalEvent.dataTransfer.files,
            docPath = currentDoc.file._parentPath;


        if (files && files.length) {
            e.stopPropagation();
            e.preventDefault();

            brackets.app.getDroppedFiles(function(err, paths) {
                if (!err) {
                    paths.forEach(function(elm) {
                        var relativeFilename = abspath2rel(docPath, elm, root);
                        relativeFilename = tagMaker(relativeFilename, root, editor);
                        doInsert({ text: relativeFilename });
                        if (files.length > 1) {
                            editor.getSelections().forEach(function(elme, i, array) {
                                editor.document.replaceRange("\n", editor.getSelections()[i]["start"]);
                            });
                        }
                    });
                }
            });

        }

        //dropZone.style.display = "none";
    }

    function getMode(editor) {
        var mode = editor.getModeForSelection();
        return mode;
    }

    function tagMaker(path, root, editor) {
        var mode = getMode(editor);
        var phpStart = '<?php ';
        var phpEnd = '?>';
        if (mode === "clike") {
            phpStart = '';
            phpEnd = '';
        }
        var rtn;
        var pathArr = path.split(".");
        var ex = pathArr[pathArr.length - 1];
        var noEx = path.replace(new RegExp("." + ex + "$"), "");
        switch (ex) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "svg":
                switch (mode) {
                    case "text/x-less":
                    case "text/x-scss":
                    case "css":
                        rtn = 'background-image: url(' + path + ');';
                        break;
                    default:
                        rtn = '<img src="' + path + '" alt="xxxxx">';
                }
                break;
            case "css":
            case "scss":
            case "less":
                switch (mode) {
                    case "text/x-" + ex:
                        rtn = '@import "' + path + '";';
                        break;
                    case "text/x-scss":
                    case "text/x-less":
                    case "css":
                        rtn = '@import "' + noEx + '.css";';
                        break;
                    default:
                        rtn = '<link rel="stylesheet" href="' + noEx + '.css">';
                }
                break;
            case "js":
                rtn = '<script src="' + path + '"></script>';
                break;
            case "mp3":
            case "wav":
                rtn = '<audio src="' + path + '"></audio>';
                break;
            case "mp4":
                rtn = '<video src="' + path + '"></video>';
                break;

            case "php":
                if (root) {
                    rtn = phpStart + 'include $_SERVER["DOCUMENT_ROOT"]."' + path + '";' + phpEnd;
                } else {
                    rtn = phpStart + 'include dirname(__FILE__)."/' + path + '";' + phpEnd;
                }
                break;
            default:
                rtn = path;
        }
        return rtn;
    }

    function _handleDragEnter(e) {
        //console.log("_handleDragEnter");
        e.stopPropagation();
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'copy';
    }

    function _handleDragLeave(e) {
        //console.log("_handleDragLeave");
        e.stopPropagation();
        e.preventDefault();
    }


    function abspath2rel(base_path, target_path, root) {
        if (root) {
            var projectRootPath = ProjectManager.getInitialProjectPath();
            var rootPathFileName = "/" + target_path.replace(projectRootPath, "");
            return rootPathFileName;
        }

        var tmp_str = '';
        base_path = base_path.split('/');
        base_path.pop();
        target_path = target_path.split('/');
        while (base_path[0] === target_path[0]) {
            base_path.shift();
            target_path.shift();
        }
        for (var i = 0; i < base_path.length; i++) {
            tmp_str += '../';
        }
        return tmp_str + target_path.join('/');
    }



    /*****************************
     * insert
     */
    function doInsert(insertItem) {
        var selections = editor.getSelections(),
            edits = [];

        selections.forEach(function(sel) {
            queueEdits(edits, getEdits(sel, insertItem));
        });

        // batch for single undo
        currentDoc.batchOperation(function() {
            // perform edits
            selections = editor.document.doMultipleEdits(edits);
            editor.setSelections(selections);

            // indent lines with selections
            selections.forEach(function(sel) {
                if (!sel.end || sel.start.line === sel.end.line) {
                    // The document is the one that batches operations, but we want to use
                    // CodeMirror's indent operation. So we need to use the document's own
                    // backing editor's CodeMirror to do the indentation.
                    currentDoc._masterEditor._codeMirror.indentLine(sel.start.line);
                }
            });
        });
    }

    function getEdits(sel, insertItem) {
        var newTagPair = insertItem.text.split("|");

        var selText = currentDoc.getRange(sel.start, sel.end),
            openTag = newTagPair[0],
            closeTag = newTagPair.length === 2 ? newTagPair[1] : "",
            insertString = openTag + selText + closeTag,
            replSelEnd = $.extend({}, sel.end);

        // reset selection
        var selNewStart = $.extend({}, sel.start),
            selNewEnd = $.extend({}, sel.end);

        selNewStart.ch += openTag.length;
        if (sel.start.line === sel.end.line) {
            selNewEnd.ch += openTag.length;
        }

        return {
            edit: { text: insertString, start: sel.start, end: replSelEnd },
            selection: { start: selNewStart, end: selNewEnd, primary: sel.primary, isBeforeEdit: false }
        };
    }

    function queueEdits(edits, val) {
        if (val) {
            if (Array.isArray(val)) {
                val.forEach(function(v) {
                    edits.push(v);
                });
            } else {
                edits.push(val);
            }
        }
    }

    // Initialize extension
    AppInit.appReady(function() {
        init();
    });



});
