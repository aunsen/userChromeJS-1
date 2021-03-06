// ==UserScript==
// @name            redirector_ui.uc.js
// @namespace       redirector@haoutil.com
// @description     Redirect your requests.
// @include         chrome://browser/content/browser.xul
// @author          harv.c
// @homepage        http://haoutil.com
// @downloadURL     https://raw.githubusercontent.com/Harv/userChromeJS/master/redirector_ui.uc.js
// @startup         Redirector.init();
// @shutdown        Redirector.destroy(true);
// @version         1.5.5.6
// ==/UserScript==
(function() {
    Cu.import("resource://gre/modules/XPCOMUtils.jsm");
    Cu.import("resource://gre/modules/Services.jsm");
    Cu.import("resource://gre/modules/NetUtil.jsm");

    function RedirectorUI() {
        this.rules = "local/_redirector.js".split("/"); // 規則文件路徑
        this.addIcon = true; // 是否添加按鈕/選單
        this.iconStyle = 1; // 0 按鈕，1 選單
        this.state = true; // 是否啟用腳本
        this.enableIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAeUlEQVQ4je2SQQqAMAwEPfUzeYLOvs/e9KH1Ca2XCrZEKHgSDOQ2GZIlk5kFSTuQgCRpN7MwdfXISdokla7XXvDIVVtZajlQ03cOSI0AmEcEFwckdzUgjpwAxHs4GcgDIfrcZe0HnU187sOC1yH+n9h84gEcAyE23AmfDQAU98LFlwAAAABJRU5ErkJggg==";
        this.disableIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAyUlEQVQ4jdWSwQ2FIBBEPdkMJegsNwsw7Nb0vWlxlvDxBA2Y4L+gUcTI9W8yCYfHwE6mUkrVRDQBcAAcEU1KqbpK5pEjopGItkSf1OCRi25bGycDXXTmALiLAYCmxGDnALjs1wAMJSsAGM7hBADhLcRO67XTer1xu2t6MZ1FZFtE7twfG5SGODPX1phpYQ4Lc7DGTDNzeRMt87i/fsiYfBM7rdcbHGWZW8vcxnO+iW8G375vDoPSJmZXELk00QPwbyFaEW9F/B7iD60oLMm8clpxAAAAAElFTkSuQmCC";
    }
    RedirectorUI.prototype = {
        hash: new Date().getTime(),
        _mm: null,
        _ppmm: null,
        get mm() {
            if (!this._mm) {
                this._mm = Cc["@mozilla.org/childprocessmessagemanager;1"].getService(Ci.nsISyncMessageSender);
            }
            return this._mm;
        },
        get ppmm() {
            if (!this._ppmm) {
                this._ppmm = Cc["@mozilla.org/parentprocessmessagemanager;1"].getService(Ci.nsIMessageBroadcaster);
            }
            return this._ppmm;
        },
        get redirector() {
            if (!Services.redirector) {
                let state = this.state;
                XPCOMUtils.defineLazyGetter(Services, "redirector", function() {
                    Redirector.prototype.rules = [];
                    Redirector.prototype.state = state;
                    Redirector.prototype.clearCache = function() {
                        // clear cache
                        this._cache = {
                            redirectUrl: {},
                            clickUrl: {}
                        };
                    };
                    return new Redirector();
                });
            }
            return Services.redirector;
        },
        init: function() {
            this.state = this.redirector.state;
            if (this.state) {
                this.redirector.init(window);
            }
            this.drawUI();
            // register self as a messagelistener
            this.mm.addMessageListener("redirector:toggle", this);
            this.mm.addMessageListener("redirector:toggle-item", this);
            this.mm.addMessageListener("redirector:reload", this);
        },
        destroy: function(shouldDestoryUI) {
            this.redirector.destroy(window);
            if (shouldDestoryUI) {
                this.destoryUI();
            }
            // this.mm.removeMessageListener("redirector:toggle", this);
            // this.mm.removeMessageListener("redirector:toggle-item", this);
            // this.mm.removeMessageListener("redirector:reload", this);
        },
        drawUI: function() {
            if (this.addIcon && !$("redirector-icon")) {
                // add menu
                let mp = $("mainPopupSet").appendChild($C("menupopup", {
                    id: "redirector-menupopup",
                    onclick: "event.preventDefault(); event.stopPropagation();",
                }));
                mp.appendChild($C("menuitem", {
                    id: "redirector-toggle",
                    label: "重定向已啟用",
                    type: "checkbox",
                    autocheck: "false",
                    key: "redirector-toggle-key",
                    checked: this.state,
                    oncommand: "Redirector.toggle();",
                    onclick: "if (event.button !== 0) {Redirector.toggle();}",
                }));
                mp.appendChild($C("menuitem", {
                    id: "redirector-reload",
                    class: "menuitem-iconic",
                    label: "重載/編輯規則",
                    tooltiptext: "左鍵：重載\n右鍵：編輯規則",
                    oncommand: "Redirector.reload();",
                    onclick: "if (event.button !== 0) {Redirector.edit();}",
                    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACmElEQVQ4y61TXUhTYRiWqItAJIKoi6KuAukioosgb7srizb/qv1ZOzvbdO78bZ3t/Oxszv25mnNzWhliZZYJIkm1C6OkIpGKogjMCAlK6qpEmJq+vcdyDknqog8evo/vfZ/n/d6fr6jof63jp4hSrd6SOnG64aHRxr6vrXN9xf0L3o2ibf1fBQBgS3OyI8PKURDCrSBF0+D2x0EJJ4bRtk6jMx+oMJDvNDpC+0eBCj1pqef9oMTbIdhyaQlu/znIdF4JIbHYZOemGCkMJCMuanVEzarnm3cQlDcnRtIo0AHepiRIkdSM46wf+gaGDhtJ+hDJCHNiJAVCqBUIp2caOVvzAjpLQ0R9ukp2KXG41jdwe+LDZLC2npsZeTK6HVPYNfrsRZrzRXK+5nZQfU8SjlhewEqJ40IoBSKiKd72Cgn7ESXZ4ZF23Df8rtG2RNvl+55gElRfGy1NrAgwQs4XywDni0LX1ZvhgsLuLEy1+/otmsU6qL5WVp7LG0hGnpPxkhZDEE1kDGt1KhhLVjmFEMi/BObzBtob+KQWDnMEi5O/UEgqrzTsWz6bHa4eVo4tFZnyBD6vKMdbh1gpCp5gC1go7+zRalNZvr06Yqy82rj7WE2t1sqIC6oPhyKNsWQ2L/D85WtNHSfl+MB5UIX0Fmq2vMqkRaESPUnPY9umrKy46FKal4LYOfnH8INHhsIpLL7RP9iDhkXaGwLSyX97/HTsYI3JxtVzCriVGPA4VGoAhzsA6YtdWeRsXj3Ke/oH7/Q6XNLHN2/HgzSv7DWRzLRadS9G9TQmgBEj0Nndexd9y9b6D6WIM4hNRpKi7IwwaWfFnI2Rwc5KCzZa+E44XPeOVBo2/svnUofJjOARPoSEYBGa5eFS1085Y5JNBegPyAAAAABJRU5ErkJggg=="
                }));
                mp.appendChild($C('menuseparator'));
                // add icon
                if (this.iconStyle == 0) {
                    let icon = $("urlbar-icons").appendChild($C("image"));
                    icon.setAttribute("id", "redirector-icon");
                    icon.setAttribute("context", "redirector-menupopup");
                    icon.setAttribute("onclick", "Redirector.iconClick(event);");
                    icon.setAttribute("tooltiptext", "中鍵：Redirector 啟用 / 禁用");
                    icon.setAttribute("style", "padding: 0px 2px; list-style-image: url(" + (this.state ? this.enableIcon : this.disableIcon) + ")");
                } else if (this.iconStyle == 1) {
                    let menu = $("menu_preferences").parentNode.appendChild($C("menu"));
                    menu.setAttribute("id", "redirector-icon");
                    menu.setAttribute("class", "menu-iconic");
                    menu.setAttribute("label", "Redirector");
                    menu.setAttribute("tooltiptext", "左鍵：Redirector 啟用 / 禁用\n中鍵：重載規則\n右鍵：編輯規則");
                    menu.setAttribute("onclick", "Redirector.miconClick(event);");
                    menu.setAttribute("style", "list-style-image: url(" + (this.state ? this.enableIcon : this.disableIcon) + ")");
                    menu.appendChild($("redirector-menupopup"));
                }
                // add rule items
                this.buildItems();
            }
            if (!$("redirector-toggle-key")) {
                // add shortcuts
                let key = $("mainKeyset").appendChild($C("key"));
                key.setAttribute("id", "redirector-toggle-key");
                key.setAttribute("oncommand", "Redirector.toggle();");
                key.setAttribute("key", "r");
                key.setAttribute("modifiers", "shift");
            }
        },
        destoryUI: function() {
            let icon = $("redirector-icon");
            if (icon) {
                icon.parentNode.removeChild(icon);
                delete icon;
            }
            let menu = $("redirector-menupopup");
            if (menu) {
                menu.parentNode.removeChild(menu);
                delete menu;
            }
            let key = $("redirector-toggle-key");
            if (key) {
                key.parentNode.removeChild(key);
                delete key;
            }
        },
        buildItems: function(forceLoadRule) {
            if (forceLoadRule || this.redirector.rules.length == 0) {
                this.loadRule();
            }
            let menu = $("redirector-menupopup");
            if (!menu) return;
            for (let i = 0; i < this.redirector.rules.length; i++) {
                let menuitem = menu.appendChild($C("menuitem"));
                menuitem.setAttribute("label", this.redirector.rules[i].name);
                menuitem.setAttribute("id", "redirector-item-" + i);
                menuitem.setAttribute("class", "redirector-item");
                menuitem.setAttribute("type", "checkbox");
                menuitem.setAttribute("autocheck", "false");
                menuitem.setAttribute("checked", typeof this.redirector.rules[i].state == "undefined" ? true : this.redirector.rules[i].state);
                menuitem.setAttribute("oncommand", "Redirector.toggle('" + i + "');");
                menuitem.setAttribute("disabled", !this.state);
            }
        },
        clearItems: function() {
            let menu = $("redirector-menupopup");
            let menuitems = document.querySelectorAll("menuitem[id^='redirector-item-']");
            if (!menu || !menuitems) return;
            for (let menuitem of menuitems) {
                menu.removeChild(menuitem);
            }
        },
        loadRule: function() {
            var aFile = FileUtils.getFile("UChrm", this.rules, false);
            if (!aFile.exists() || !aFile.isFile()) return null;
            var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
            var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
            fstream.init(aFile, -1, 0, 0);
            sstream.init(fstream);
            var data = sstream.read(sstream.available());
            try {
                data = decodeURIComponent(escape(data));
            } catch (e) {}
            sstream.close();
            fstream.close();
            if (!data) return;
            var sandbox = new Cu.Sandbox(new XPCNativeWrapper(window));
            try {
                Cu.evalInSandbox(data, sandbox, "1.8");
            } catch (e) {
                return;
            }
            this.redirector.rules = sandbox.rules;
        },
        toggle: function(i, callfromMessage) {
            if (i) {
                // update checkbox state
                let item = $("redirector-item-" + i);
                if (!callfromMessage) {
                    this.redirector.rules[i].state = !this.redirector.rules[i].state;
                }
                if (item) item.setAttribute("checked", this.redirector.rules[i].state);
                // clear cache
                this.redirector.clearCache();
                if (!callfromMessage) {
                    // notify other windows to update
                    this.ppmm.broadcastAsyncMessage("redirector:toggle-item", {
                        hash: this.hash,
                        item: i
                    });
                }
            } else {
                let menuitems = document.querySelectorAll("menuitem[id^='redirector-item-']");
                this.state = !this.state;
                this.redirector.state = this.state;
                if (this.state) {
                    this.init();
                    Object.keys(menuitems).forEach(function(n){ menuitems[n].setAttribute("disabled", false)});
                } else {
                    this.destroy();
                    Object.keys(menuitems).forEach(function(n){ menuitems[n].setAttribute("disabled", true)});
                }
                // update checkbox state
                let toggle = $("redirector-toggle");
                if (toggle) {
                    toggle.setAttribute("checked", this.state);
                    toggle.label = "重定向已" + (this.state ? "啟" : "停") + "用";
                }
                // update icon state
                let icon = $("redirector-icon");
                if (icon) {
                    icon.style.listStyleImage = "url(" + (this.state ? this.enableIcon : this.disableIcon) + ")";
                }
                if (!callfromMessage) {
                    // notify other windows to update
                    this.ppmm.broadcastAsyncMessage("redirector:toggle", {
                        hash: this.hash
                    });
                }
            }
        },
        reload: function(callfromMessage) {
            if (!callfromMessage) {
                this.redirector.clearCache();
            }
            this.clearItems();
            this.buildItems(true);
            Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService).showAlertNotification("", "Redirector", "規則已重新載入", false, "", null);
            if (!callfromMessage) {
                // notify other windows to update
                this.ppmm.broadcastAsyncMessage("redirector:reload", {
                    hash: this.hash
                });
            }
        },
        edit: function() {
            let aFile = FileUtils.getFile("UChrm", this.rules, false);
            if (!aFile || !aFile.exists() || !aFile.isFile()) return;
            var editor;
            try {
                editor = Services.prefs.getComplexValue("view_source.editor.path", Ci.nsILocalFile);
            } catch (e) {
                alert("請設置編輯器的路徑。\nview_source.editor.path");
                toOpenWindowByType('pref:pref', 'about:config?filter=view_source.editor.path');
                return;
            }
            var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
            UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0 ? "gbk" : "UTF-8";
            var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
            try {
                var path = UI.ConvertFromUnicode(aFile.path);
                var args = [path];
                process.init(editor);
                process.run(false, args, args.length);
            } catch (e) {
                alert("編輯器不正確！")
            }
        },
        iconClick: function(event) {
            switch (event.button) {
                case 1:
                    $("redirector-toggle").doCommand();
                    break;
                default:
                    $("redirector-menupopup").openPopup(null, null, event.clientX, event.clientY);
            }
            event.preventDefault();
        },
        miconClick: function(event) {
            switch (event.button) {
                case 0:
                    this.toggle();
                    break;
                case 1:
                    this.reload();
                    break;
                case 2:
                    this.edit();
                    break;
            }
            event.preventDefault();
        },
        // nsIMessageListener interface implementation
        receiveMessage: function(message) {
            if (this.hash == message.data.hash) {
                return;
            }
            switch (message.name) {
                case "redirector:toggle":
                    this.toggle(null, true);
                    break;
                case "redirector:toggle-item":
                    this.toggle(message.data.item, true);
                    break;
                case "redirector:reload":
                    this.reload(true);
                    break;
            }
        }
    };

    function Redirector() {
        this.rules = [];
    }
    Redirector.prototype = {
        _cache: {
            redirectUrl: {},
            clickUrl: {}
        },
        classDescription: "Redirector content policy",
        classID: Components.ID("{1d5903f0-6b5b-4229-8673-76b4048c6675}"),
        contractID: "@haoutil.com/redirector/policy;1",
        xpcom_categories: ["content-policy", "net-channel-event-sinks"],
        init: function(window) {
            window.addEventListener("click", this, false);
            let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
            if (!registrar.isCIDRegistered(this.classID)) {
                registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
                let catMan = XPCOMUtils.categoryManager;
                for (let category of this.xpcom_categories)
                    catMan.addCategoryEntry(category, this.contractID, this.contractID, false, true);
                Services.obs.addObserver(this, "http-on-modify-request", false);
                Services.obs.addObserver(this, "http-on-examine-response", false);
            }
        },
        destroy: function(window) {
            window.removeEventListener("click", this, false);
            let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
            if (registrar.isCIDRegistered(this.classID)) {
                registrar.unregisterFactory(this.classID, this);
                let catMan = XPCOMUtils.categoryManager;
                for (let category of this.xpcom_categories)
                    catMan.deleteCategoryEntry(category, this.contractID, false);
                Services.obs.removeObserver(this, "http-on-modify-request", false);
                Services.obs.removeObserver(this, "http-on-examine-response", false);
            }
        },
        getRedirectUrl: function(originUrl) {
            let redirectUrl = this._cache.redirectUrl[originUrl];
            if (typeof redirectUrl != "undefined") {
                return redirectUrl;
            }
            redirectUrl = null;
            let url, redirect;
            let regex, from, to, exclude, decode;
            for (let rule of this.rules) {
                if (typeof rule.state == "undefined") rule.state = true;
                if (!rule.state) continue;
                if (rule.computed) {
                    regex = rule.computed.regex;
                    from = rule.computed.from;
                    to = rule.computed.to;
                    exclude = rule.computed.exclude;
                    decode = rule.computed.decode;
                } else {
                    regex = rule.regex || rule.wildcard;
                    from = rule.from;
                    to = rule.to;
                    exclude = rule.exclude;
                    decode = rule.decode;
                    if (rule.wildcard) {
                        from = this.wildcardToRegex(rule.from);
                        exclude = this.wildcardToRegex(rule.exclude);
                    }
                    rule.computed = {
                        regex: regex,
                        from: from,
                        to: to,
                        exclude: exclude,
                        decode: decode
                    };
                }
                url = decode ? this.decodeUrl(originUrl) : originUrl;
                redirect = regex ?
                    from.test(url) ? !(exclude && exclude.test(url)) : false :
                    from == url ? !(exclude && exclude == url) : false;
                if (redirect) {
                    url = typeof to == "function" ?
                        regex ? to(url.match(from)) : to(from) :
                        regex ? url.replace(from, to) : to;
                    redirectUrl = {
                        url: decode ? url : this.decodeUrl(url), // 避免二次解码
                        resp: rule.resp
                    };
                    break;
                }
            }
            this._cache.redirectUrl[originUrl] = redirectUrl;
            return redirectUrl;
        },
        decodeUrl: function(encodedUrl) {
            let decodedUrl;
            try {
                decodedUrl = decodeURIComponent(encodedUrl);
            } catch (e) {
                decodedUrl = encodedUrl;
            }
            return decodedUrl;
        },
        wildcardToRegex: function(wildcard) {
            if (!wildcard)
                return null;
            return new RegExp((wildcard + "").replace(new RegExp("[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]", "g"), "\\$&").replace(/\\\*/g, "(.*)").replace(/\\\?/g, "."), "i");
        },
        getTarget: function(redirectUrl, callback) {
            NetUtil.asyncFetch(redirectUrl.url, function(inputStream, status) {
                let binaryOutputStream = Cc['@mozilla.org/binaryoutputstream;1'].createInstance(Ci['nsIBinaryOutputStream']);
                let storageStream = Cc['@mozilla.org/storagestream;1'].createInstance(Ci['nsIStorageStream']);
                let count = inputStream.available();
                let data = NetUtil.readInputStreamToString(inputStream, count);
                storageStream.init(512, count, null);
                binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
                binaryOutputStream.writeBytes(data, count);
                redirectUrl.storageStream = storageStream;
                redirectUrl.count = count;
                if (typeof callback === 'function')
                    callback();
            });
        },
        // nsIDOMEventListener interface implementation
        handleEvent: function(event) {
            if (!event.ctrlKey && "click" === event.type && 1 === event.which) {
                let target = event.target;
                while (target) {
                    if (target.tagName && "BODY" === target.tagName.toUpperCase()) break;
                    if (target.tagName && "A" === target.tagName.toUpperCase() &&
                        target.target && "_BLANK" === target.target.toUpperCase() &&
                        target.href) {
                        this._cache.clickUrl[target.href] = true;
                        break;
                    }
                    target = target.parentNode;
                }
            }
        },
        // nsIContentPolicy interface implementation
        shouldLoad: function(contentType, contentLocation, requestOrigin, context, mimeTypeGuess, extra) {
            // don't redirect clicking links with "_blank" target attribute
            // cause links will be loaded in current tab/window
            if (this._cache.clickUrl[contentLocation.spec]) {
                this._cache.clickUrl[contentLocation.spec] = false;
                return Ci.nsIContentPolicy.ACCEPT;
            }
            // only redirect documents
            if (contentType != Ci.nsIContentPolicy.TYPE_DOCUMENT)
                return Ci.nsIContentPolicy.ACCEPT;
            if (!context || !context.loadURI)
                return Ci.nsIContentPolicy.ACCEPT;
            let redirectUrl = this.getRedirectUrl(contentLocation.spec);
            if (redirectUrl && !redirectUrl.resp) {
                context.loadURI(redirectUrl.url, requestOrigin, null);
                return Ci.nsIContentPolicy.REJECT_REQUEST;
            }
            return Ci.nsIContentPolicy.ACCEPT;
        },
        shouldProcess: function(contentType, contentLocation, requestOrigin, context, mimeTypeGuess, extra) {
            return Ci.nsIContentPolicy.ACCEPT;
        },
        // nsIChannelEventSink interface implementation
        asyncOnChannelRedirect: function(oldChannel, newChannel, flags, redirectCallback) {
            this.onChannelRedirect(oldChannel, newChannel, flags);
            redirectCallback.onRedirectVerifyCallback(Cr.NS_OK);
        },
        onChannelRedirect: function(oldChannel, newChannel, flags) {
            // only redirect documents
            if (!(newChannel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI))
                return;
            let newLocation = newChannel.URI.spec;
            if (!newLocation)
                return;
            let callbacks = [];
            if (newChannel.notificationCallbacks)
                callbacks.push(newChannel.notificationCallbacks);
            if (newChannel.loadGroup && newChannel.loadGroup.notificationCallbacks)
                callbacks.push(newChannel.loadGroup.notificationCallbacks);
            let win, webNav;
            for (let callback of callbacks) {
                try {
                    win = callback.getInterface(Ci.nsILoadContext).associatedWindow;
                    webNav = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
                    break;
                } catch (e) {}
            }
            if (!webNav)
                return;
            let redirectUrl = this.getRedirectUrl(newLocation);
            if (redirectUrl && !redirectUrl.resp) {
                webNav.loadURI(redirectUrl.url, null, null, null, null);
            }
        },
        // nsIObserver interface implementation
        observe: function(subject, topic, data, additional) {
            switch (topic) {
                case "http-on-modify-request":
                    {
                        let http = subject.QueryInterface(Ci.nsIHttpChannel);
                        let redirectUrl = this.getRedirectUrl(http.URI.spec);
                        if (redirectUrl && !redirectUrl.resp)
                            if (http.redirectTo)
                            // firefox 20+
                                http.redirectTo(Services.io.newURI(redirectUrl.url, null, null));
                            else
                            // others replace response body
                                redirectUrl.resp = true;
                        break;
                    }
                case "http-on-examine-response":
                    {
                        let http = subject.QueryInterface(Ci.nsIHttpChannel);
                        let redirectUrl = this.getRedirectUrl(http.URI.spec);
                        if (redirectUrl && redirectUrl.resp) {
                            if (!http.redirectTo)
                                redirectUrl.resp = false;
                            if (!redirectUrl.storageStream || !redirectUrl.count) {
                                http.suspend();
                                this.getTarget(redirectUrl, function() {
                                    http.resume();
                                });
                            }
                            let newListener = new TrackingListener();
                            subject.QueryInterface(Ci.nsITraceableChannel);
                            newListener.originalListener = subject.setNewListener(newListener);
                            newListener.redirectUrl = redirectUrl;
                        }
                        break;
                    }
            }
        },
        // nsIFactory interface implementation
        createInstance: function(outer, iid) {
            if (outer)
                throw Cr.NS_ERROR_NO_AGGREGATION;
            return this.QueryInterface(iid);
        },
        // nsISupports interface implementation
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIChannelEventSink, Ci.nsIObserver, Ci.nsIFactory, Ci.nsISupports])
    };

    function TrackingListener() {
        this.originalListener = null;
        this.redirectUrl = null;
    }
    TrackingListener.prototype = {
        // nsITraceableChannel interface implementation
        onStartRequest: function(request, context) {
            this.originalListener.onStartRequest(request, context);
        },
        onStopRequest: function(request, context) {
            this.originalListener.onStopRequest(request, context, Cr.NS_OK);
        },
        onDataAvailable: function(request, context) {
            this.originalListener.onDataAvailable(request, context, this.redirectUrl.storageStream.newInputStream(0), 0, this.redirectUrl.count);
        },
        // nsISupports interface implementation
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener, Ci.nsISupports])
    };

    if (window.Redirector) {
        window.Redirector.destroy();
        delete window.Redirector;
    }

    window.Redirector = new RedirectorUI();
    window.Redirector.init();

    function $(id) {
        return document.getElementById(id);
    }

    function $C(name, attr) {
        var el = document.createElement(name);
        if (attr) Object.keys(attr).forEach(function(n){ el.setAttribute(n, attr[n])});
        return el;
    }
})();