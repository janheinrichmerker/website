/* http://prismjs.com/download.html?themes=prism-okaidia&languages=markup+css+clike+javascript+apacheconf+bash+c+cpp+ruby+css-extras+diff+git+groovy+handlebars+java+json+kotlin+latex+markdown+php+php-extras+python+scss+sql&plugins=line-highlight+autolinker+wpd+file-highlight+previewer-base+previewer-color+previewer-gradient+previewer-easing+previewer-time+previewer-angle */
var _self = (typeof window !== 'undefined')
    ? window   // if in browser
    : (
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
        ? self // if in worker
        : {}   // if in node js
);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function(){

// Private helper vars
    var lang = /\blang(?:uage)?-(\w+)\b/i;
    var uniqueId = 0;

    var _ = _self.Prism = {
        util: {
            encode: function (tokens) {
                if (tokens instanceof Token) {
                    return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
                } else if (_.util.type(tokens) === 'Array') {
                    return tokens.map(_.util.encode);
                } else {
                    return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
                }
            },

            type: function (o) {
                return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
            },

            objId: function (obj) {
                if (!obj['__id']) {
                    Object.defineProperty(obj, '__id', { value: ++uniqueId });
                }
                return obj['__id'];
            },

            // Deep clone a language definition (e.g. to extend it)
            clone: function (o) {
                var type = _.util.type(o);

                switch (type) {
                    case 'Object':
                        var clone = {};

                        for (var key in o) {
                            if (o.hasOwnProperty(key)) {
                                clone[key] = _.util.clone(o[key]);
                            }
                        }

                        return clone;

                    case 'Array':
                        // Check for existence for IE8
                        return o.map && o.map(function(v) { return _.util.clone(v); });
                }

                return o;
            }
        },

        languages: {
            extend: function (id, redef) {
                var lang = _.util.clone(_.languages[id]);

                for (var key in redef) {
                    lang[key] = redef[key];
                }

                return lang;
            },

            /**
             * Insert a token before another token in a language literal
             * As this needs to recreate the object (we cannot actually insert before keys in object literals),
             * we cannot just provide an object, we need anobject and a key.
             * @param inside The key (or language id) of the parent
             * @param before The key to insert before. If not provided, the function appends instead.
             * @param insert Object with the key/value pairs to insert
             * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
             */
            insertBefore: function (inside, before, insert, root) {
                root = root || _.languages;
                var grammar = root[inside];

                if (arguments.length == 2) {
                    insert = arguments[1];

                    for (var newToken in insert) {
                        if (insert.hasOwnProperty(newToken)) {
                            grammar[newToken] = insert[newToken];
                        }
                    }

                    return grammar;
                }

                var ret = {};

                for (var token in grammar) {

                    if (grammar.hasOwnProperty(token)) {

                        if (token == before) {

                            for (var newToken in insert) {

                                if (insert.hasOwnProperty(newToken)) {
                                    ret[newToken] = insert[newToken];
                                }
                            }
                        }

                        ret[token] = grammar[token];
                    }
                }

                // Update references in other language definitions
                _.languages.DFS(_.languages, function(key, value) {
                    if (value === root[inside] && key != inside) {
                        this[key] = ret;
                    }
                });

                return root[inside] = ret;
            },

            // Traverse a language definition with Depth First Search
            DFS: function(o, callback, type, visited) {
                visited = visited || {};
                for (var i in o) {
                    if (o.hasOwnProperty(i)) {
                        callback.call(o, i, o[i], type || i);

                        if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
                            visited[_.util.objId(o[i])] = true;
                            _.languages.DFS(o[i], callback, null, visited);
                        }
                        else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
                            visited[_.util.objId(o[i])] = true;
                            _.languages.DFS(o[i], callback, i, visited);
                        }
                    }
                }
            }
        },
        plugins: {},

        highlightAll: function(async, callback) {
            var env = {
                callback: callback,
                selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
            };

            _.hooks.run("before-highlightall", env);

            var elements = env.elements || document.querySelectorAll(env.selector);

            for (var i=0, element; element = elements[i++];) {
                _.highlightElement(element, async === true, env.callback);
            }
        },

        highlightElement: function(element, async, callback) {
            // Find language
            var language, grammar, parent = element;

            while (parent && !lang.test(parent.className)) {
                parent = parent.parentNode;
            }

            if (parent) {
                language = (parent.className.match(lang) || [,''])[1];
                grammar = _.languages[language];
            }

            // Set language on the element, if not present
            element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

            // Set language on the parent, for styling
            parent = element.parentNode;

            if (/pre/i.test(parent.nodeName)) {
                parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
            }

            var code = element.textContent;

            var env = {
                element: element,
                language: language,
                grammar: grammar,
                code: code
            };

            _.hooks.run('before-sanity-check', env);

            if (!env.code || !env.grammar) {
                _.hooks.run('complete', env);
                return;
            }

            _.hooks.run('before-highlight', env);

            if (async && _self.Worker) {
                var worker = new Worker(_.filename);

                worker.onmessage = function(evt) {
                    env.highlightedCode = evt.data;

                    _.hooks.run('before-insert', env);

                    env.element.innerHTML = env.highlightedCode;

                    callback && callback.call(env.element);
                    _.hooks.run('after-highlight', env);
                    _.hooks.run('complete', env);
                };

                worker.postMessage(JSON.stringify({
                    language: env.language,
                    code: env.code,
                    immediateClose: true
                }));
            }
            else {
                env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

                _.hooks.run('before-insert', env);

                env.element.innerHTML = env.highlightedCode;

                callback && callback.call(element);

                _.hooks.run('after-highlight', env);
                _.hooks.run('complete', env);
            }
        },

        highlight: function (text, grammar, language) {
            var tokens = _.tokenize(text, grammar);
            return Token.stringify(_.util.encode(tokens), language);
        },

        tokenize: function(text, grammar, language) {
            var Token = _.Token;

            var strarr = [text];

            var rest = grammar.rest;

            if (rest) {
                for (var token in rest) {
                    grammar[token] = rest[token];
                }

                delete grammar.rest;
            }

            tokenloop: for (var token in grammar) {
                if(!grammar.hasOwnProperty(token) || !grammar[token]) {
                    continue;
                }

                var patterns = grammar[token];
                patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

                for (var j = 0; j < patterns.length; ++j) {
                    var pattern = patterns[j],
                        inside = pattern.inside,
                        lookbehind = !!pattern.lookbehind,
                        greedy = !!pattern.greedy,
                        lookbehindLength = 0,
                        alias = pattern.alias;

                    pattern = pattern.pattern || pattern;

                    for (var i=0; i<strarr.length; i++) { // Don’t cache length as it changes during the loop

                        var str = strarr[i];

                        if (strarr.length > text.length) {
                            // Something went terribly wrong, ABORT, ABORT!
                            break tokenloop;
                        }

                        if (str instanceof Token) {
                            continue;
                        }

                        pattern.lastIndex = 0;

                        var match = pattern.exec(str),
                            delNum = 1;

                        // Greedy patterns can override/remove up to two previously matched tokens
                        if (!match && greedy && i != strarr.length - 1) {
                            // Reconstruct the original text using the next two tokens
                            var nextToken = strarr[i + 1].matchedStr || strarr[i + 1],
                                combStr = str + nextToken;

                            if (i < strarr.length - 2) {
                                combStr += strarr[i + 2].matchedStr || strarr[i + 2];
                            }

                            // Try the pattern again on the reconstructed text
                            pattern.lastIndex = 0;
                            match = pattern.exec(combStr);
                            if (!match) {
                                continue;
                            }

                            var from = match.index + (lookbehind ? match[1].length : 0);
                            // To be a valid candidate, the new match has to start inside of str
                            if (from >= str.length) {
                                continue;
                            }
                            var to = match.index + match[0].length,
                                len = str.length + nextToken.length;

                            // Number of tokens to delete and replace with the new match
                            delNum = 3;

                            if (to <= len) {
                                if (strarr[i + 1].greedy) {
                                    continue;
                                }
                                delNum = 2;
                                combStr = combStr.slice(0, len);
                            }
                            str = combStr;
                        }

                        if (!match) {
                            continue;
                        }

                        if(lookbehind) {
                            lookbehindLength = match[1].length;
                        }

                        var from = match.index + lookbehindLength,
                            match = match[0].slice(lookbehindLength),
                            to = from + match.length,
                            before = str.slice(0, from),
                            after = str.slice(to);

                        var args = [i, delNum];

                        if (before) {
                            args.push(before);
                        }

                        var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

                        args.push(wrapped);

                        if (after) {
                            args.push(after);
                        }

                        Array.prototype.splice.apply(strarr, args);
                    }
                }
            }

            return strarr;
        },

        hooks: {
            all: {},

            add: function (name, callback) {
                var hooks = _.hooks.all;

                hooks[name] = hooks[name] || [];

                hooks[name].push(callback);
            },

            run: function (name, env) {
                var callbacks = _.hooks.all[name];

                if (!callbacks || !callbacks.length) {
                    return;
                }

                for (var i=0, callback; callback = callbacks[i++];) {
                    callback(env);
                }
            }
        }
    };

    var Token = _.Token = function(type, content, alias, matchedStr, greedy) {
        this.type = type;
        this.content = content;
        this.alias = alias;
        // Copy of the full string this token was created from
        this.matchedStr = matchedStr || null;
        this.greedy = !!greedy;
    };

    Token.stringify = function(o, language, parent) {
        if (typeof o == 'string') {
            return o;
        }

        if (_.util.type(o) === 'Array') {
            return o.map(function(element) {
                return Token.stringify(element, language, o);
            }).join('');
        }

        var env = {
            type: o.type,
            content: Token.stringify(o.content, language, parent),
            tag: 'span',
            classes: ['token', o.type],
            attributes: {},
            language: language,
            parent: parent
        };

        if (env.type == 'comment') {
            env.attributes['spellcheck'] = 'true';
        }

        if (o.alias) {
            var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
            Array.prototype.push.apply(env.classes, aliases);
        }

        _.hooks.run('wrap', env);

        var attributes = '';

        for (var name in env.attributes) {
            attributes += (attributes ? ' ' : '') + name + '="' + (env.attributes[name] || '') + '"';
        }

        return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';

    };

    if (!_self.document) {
        if (!_self.addEventListener) {
            // in Node.js
            return _self.Prism;
        }
        // In worker
        _self.addEventListener('message', function(evt) {
            var message = JSON.parse(evt.data),
                lang = message.language,
                code = message.code,
                immediateClose = message.immediateClose;

            _self.postMessage(_.highlight(code, _.languages[lang], lang));
            if (immediateClose) {
                _self.close();
            }
        }, false);

        return _self.Prism;
    }

//Get current script and highlight
    var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

    if (script) {
        _.filename = script.src;

        if (document.addEventListener && !script.hasAttribute('data-manual')) {
            document.addEventListener('DOMContentLoaded', _.highlightAll);
        }
    }

    return _self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
    global.Prism = Prism;
}
;
Prism.languages.markup = {
    'comment': /<!--[\w\W]*?-->/,
    'prolog': /<\?[\w\W]+?\?>/,
    'doctype': /<!DOCTYPE[\w\W]+?>/,
    'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
    'tag': {
        pattern: /<\/?(?!\d)[^\s>\/=.$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
        inside: {
            'tag': {
                pattern: /^<\/?[^\s>\/]+/i,
                inside: {
                    'punctuation': /^<\/?/,
                    'namespace': /^[^\s>\/:]+:/
                }
            },
            'attr-value': {
                pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
                inside: {
                    'punctuation': /[=>"']/
                }
            },
            'punctuation': /\/?>/,
            'attr-name': {
                pattern: /[^\s>\/]+/,
                inside: {
                    'namespace': /^[^\s>\/:]+:/
                }
            }

        }
    },
    'entity': /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

    if (env.type === 'entity') {
        env.attributes['title'] = env.content.replace(/&amp;/, '&');
    }
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.css = {
    'comment': /\/\*[\w\W]*?\*\//,
    'atrule': {
        pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
        inside: {
            'rule': /@[\w-]+/
            // See rest below
        }
    },
    'url': /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
    'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
    'string': /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
    'property': /(\b|\B)[\w-]+(?=\s*:)/i,
    'important': /\B!important\b/i,
    'function': /[-a-z0-9]+(?=\()/i,
    'punctuation': /[(){};:]/
};

Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
    Prism.languages.insertBefore('markup', 'tag', {
        'style': {
            pattern: /(<style[\w\W]*?>)[\w\W]*?(?=<\/style>)/i,
            lookbehind: true,
            inside: Prism.languages.css,
            alias: 'language-css'
        }
    });

    Prism.languages.insertBefore('inside', 'attr-value', {
        'style-attr': {
            pattern: /\s*style=("|').*?\1/i,
            inside: {
                'attr-name': {
                    pattern: /^\s*style/i,
                    inside: Prism.languages.markup.tag.inside
                },
                'punctuation': /^\s*=\s*['"]|['"]\s*$/,
                'attr-value': {
                    pattern: /.+/i,
                    inside: Prism.languages.css
                }
            },
            alias: 'language-css'
        }
    }, Prism.languages.markup.tag);
};
Prism.languages.clike = {
    'comment': [
        {
            pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
            lookbehind: true
        },
        {
            pattern: /(^|[^\\:])\/\/.*/,
            lookbehind: true
        }
    ],
    'string': {
        pattern: /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
        greedy: true
    },
    'class-name': {
        pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
        lookbehind: true,
        inside: {
            punctuation: /(\.|\\)/
        }
    },
    'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
    'boolean': /\b(true|false)\b/,
    'function': /[a-z0-9_]+(?=\()/i,
    'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
    'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
    'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
    'keyword': /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,
    'number': /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
    // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i
});

Prism.languages.insertBefore('javascript', 'keyword', {
    'regex': {
        pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
        lookbehind: true,
        greedy: true
    }
});

Prism.languages.insertBefore('javascript', 'class-name', {
    'template-string': {
        pattern: /`(?:\\\\|\\?[^\\])*?`/,
        greedy: true,
        inside: {
            'interpolation': {
                pattern: /\$\{[^}]+\}/,
                inside: {
                    'interpolation-punctuation': {
                        pattern: /^\$\{|\}$/,
                        alias: 'punctuation'
                    },
                    rest: Prism.languages.javascript
                }
            },
            'string': /[\s\S]+/
        }
    }
});

if (Prism.languages.markup) {
    Prism.languages.insertBefore('markup', 'tag', {
        'script': {
            pattern: /(<script[\w\W]*?>)[\w\W]*?(?=<\/script>)/i,
            lookbehind: true,
            inside: Prism.languages.javascript,
            alias: 'language-javascript'
        }
    });
}

Prism.languages.js = Prism.languages.javascript;
Prism.languages.apacheconf = {
    'comment': /#.*/,
    'directive-inline': {
        pattern: /^(\s*)\b(AcceptFilter|AcceptPathInfo|AccessFileName|Action|AddAlt|AddAltByEncoding|AddAltByType|AddCharset|AddDefaultCharset|AddDescription|AddEncoding|AddHandler|AddIcon|AddIconByEncoding|AddIconByType|AddInputFilter|AddLanguage|AddModuleInfo|AddOutputFilter|AddOutputFilterByType|AddType|Alias|AliasMatch|Allow|AllowCONNECT|AllowEncodedSlashes|AllowMethods|AllowOverride|AllowOverrideList|Anonymous|Anonymous_LogEmail|Anonymous_MustGiveEmail|Anonymous_NoUserID|Anonymous_VerifyEmail|AsyncRequestWorkerFactor|AuthBasicAuthoritative|AuthBasicFake|AuthBasicProvider|AuthBasicUseDigestAlgorithm|AuthDBDUserPWQuery|AuthDBDUserRealmQuery|AuthDBMGroupFile|AuthDBMType|AuthDBMUserFile|AuthDigestAlgorithm|AuthDigestDomain|AuthDigestNonceLifetime|AuthDigestProvider|AuthDigestQop|AuthDigestShmemSize|AuthFormAuthoritative|AuthFormBody|AuthFormDisableNoStore|AuthFormFakeBasicAuth|AuthFormLocation|AuthFormLoginRequiredLocation|AuthFormLoginSuccessLocation|AuthFormLogoutLocation|AuthFormMethod|AuthFormMimetype|AuthFormPassword|AuthFormProvider|AuthFormSitePassphrase|AuthFormSize|AuthFormUsername|AuthGroupFile|AuthLDAPAuthorizePrefix|AuthLDAPBindAuthoritative|AuthLDAPBindDN|AuthLDAPBindPassword|AuthLDAPCharsetConfig|AuthLDAPCompareAsUser|AuthLDAPCompareDNOnServer|AuthLDAPDereferenceAliases|AuthLDAPGroupAttribute|AuthLDAPGroupAttributeIsDN|AuthLDAPInitialBindAsUser|AuthLDAPInitialBindPattern|AuthLDAPMaxSubGroupDepth|AuthLDAPRemoteUserAttribute|AuthLDAPRemoteUserIsDN|AuthLDAPSearchAsUser|AuthLDAPSubGroupAttribute|AuthLDAPSubGroupClass|AuthLDAPUrl|AuthMerging|AuthName|AuthnCacheContext|AuthnCacheEnable|AuthnCacheProvideFor|AuthnCacheSOCache|AuthnCacheTimeout|AuthnzFcgiCheckAuthnProvider|AuthnzFcgiDefineProvider|AuthType|AuthUserFile|AuthzDBDLoginToReferer|AuthzDBDQuery|AuthzDBDRedirectQuery|AuthzDBMType|AuthzSendForbiddenOnFailure|BalancerGrowth|BalancerInherit|BalancerMember|BalancerPersist|BrowserMatch|BrowserMatchNoCase|BufferedLogs|BufferSize|CacheDefaultExpire|CacheDetailHeader|CacheDirLength|CacheDirLevels|CacheDisable|CacheEnable|CacheFile|CacheHeader|CacheIgnoreCacheControl|CacheIgnoreHeaders|CacheIgnoreNoLastMod|CacheIgnoreQueryString|CacheIgnoreURLSessionIdentifiers|CacheKeyBaseURL|CacheLastModifiedFactor|CacheLock|CacheLockMaxAge|CacheLockPath|CacheMaxExpire|CacheMaxFileSize|CacheMinExpire|CacheMinFileSize|CacheNegotiatedDocs|CacheQuickHandler|CacheReadSize|CacheReadTime|CacheRoot|CacheSocache|CacheSocacheMaxSize|CacheSocacheMaxTime|CacheSocacheMinTime|CacheSocacheReadSize|CacheSocacheReadTime|CacheStaleOnError|CacheStoreExpired|CacheStoreNoStore|CacheStorePrivate|CGIDScriptTimeout|CGIMapExtension|CharsetDefault|CharsetOptions|CharsetSourceEnc|CheckCaseOnly|CheckSpelling|ChrootDir|ContentDigest|CookieDomain|CookieExpires|CookieName|CookieStyle|CookieTracking|CoreDumpDirectory|CustomLog|Dav|DavDepthInfinity|DavGenericLockDB|DavLockDB|DavMinTimeout|DBDExptime|DBDInitSQL|DBDKeep|DBDMax|DBDMin|DBDParams|DBDPersist|DBDPrepareSQL|DBDriver|DefaultIcon|DefaultLanguage|DefaultRuntimeDir|DefaultType|Define|DeflateBufferSize|DeflateCompressionLevel|DeflateFilterNote|DeflateInflateLimitRequestBody|DeflateInflateRatioBurst|DeflateInflateRatioLimit|DeflateMemLevel|DeflateWindowSize|Deny|DirectoryCheckHandler|DirectoryIndex|DirectoryIndexRedirect|DirectorySlash|DocumentRoot|DTracePrivileges|DumpIOInput|DumpIOOutput|EnableExceptionHook|EnableMMAP|EnableSendfile|Error|ErrorDocument|ErrorLog|ErrorLogFormat|Example|ExpiresActive|ExpiresByType|ExpiresDefault|ExtendedStatus|ExtFilterDefine|ExtFilterOptions|FallbackResource|FileETag|FilterChain|FilterDeclare|FilterProtocol|FilterProvider|FilterTrace|ForceLanguagePriority|ForceType|ForensicLog|GprofDir|GracefulShutdownTimeout|Group|Header|HeaderName|HeartbeatAddress|HeartbeatListen|HeartbeatMaxServers|HeartbeatStorage|HeartbeatStorage|HostnameLookups|IdentityCheck|IdentityCheckTimeout|ImapBase|ImapDefault|ImapMenu|Include|IncludeOptional|IndexHeadInsert|IndexIgnore|IndexIgnoreReset|IndexOptions|IndexOrderDefault|IndexStyleSheet|InputSed|ISAPIAppendLogToErrors|ISAPIAppendLogToQuery|ISAPICacheFile|ISAPIFakeAsync|ISAPILogNotSupported|ISAPIReadAheadBuffer|KeepAlive|KeepAliveTimeout|KeptBodySize|LanguagePriority|LDAPCacheEntries|LDAPCacheTTL|LDAPConnectionPoolTTL|LDAPConnectionTimeout|LDAPLibraryDebug|LDAPOpCacheEntries|LDAPOpCacheTTL|LDAPReferralHopLimit|LDAPReferrals|LDAPRetries|LDAPRetryDelay|LDAPSharedCacheFile|LDAPSharedCacheSize|LDAPTimeout|LDAPTrustedClientCert|LDAPTrustedGlobalCert|LDAPTrustedMode|LDAPVerifyServerCert|LimitInternalRecursion|LimitRequestBody|LimitRequestFields|LimitRequestFieldSize|LimitRequestLine|LimitXMLRequestBody|Listen|ListenBackLog|LoadFile|LoadModule|LogFormat|LogLevel|LogMessage|LuaAuthzProvider|LuaCodeCache|LuaHookAccessChecker|LuaHookAuthChecker|LuaHookCheckUserID|LuaHookFixups|LuaHookInsertFilter|LuaHookLog|LuaHookMapToStorage|LuaHookTranslateName|LuaHookTypeChecker|LuaInherit|LuaInputFilter|LuaMapHandler|LuaOutputFilter|LuaPackageCPath|LuaPackagePath|LuaQuickHandler|LuaRoot|LuaScope|MaxConnectionsPerChild|MaxKeepAliveRequests|MaxMemFree|MaxRangeOverlaps|MaxRangeReversals|MaxRanges|MaxRequestWorkers|MaxSpareServers|MaxSpareThreads|MaxThreads|MergeTrailers|MetaDir|MetaFiles|MetaSuffix|MimeMagicFile|MinSpareServers|MinSpareThreads|MMapFile|ModemStandard|ModMimeUsePathInfo|MultiviewsMatch|Mutex|NameVirtualHost|NoProxy|NWSSLTrustedCerts|NWSSLUpgradeable|Options|Order|OutputSed|PassEnv|PidFile|PrivilegesMode|Protocol|ProtocolEcho|ProxyAddHeaders|ProxyBadHeader|ProxyBlock|ProxyDomain|ProxyErrorOverride|ProxyExpressDBMFile|ProxyExpressDBMType|ProxyExpressEnable|ProxyFtpDirCharset|ProxyFtpEscapeWildcards|ProxyFtpListOnWildcard|ProxyHTMLBufSize|ProxyHTMLCharsetOut|ProxyHTMLDocType|ProxyHTMLEnable|ProxyHTMLEvents|ProxyHTMLExtended|ProxyHTMLFixups|ProxyHTMLInterp|ProxyHTMLLinks|ProxyHTMLMeta|ProxyHTMLStripComments|ProxyHTMLURLMap|ProxyIOBufferSize|ProxyMaxForwards|ProxyPass|ProxyPassInherit|ProxyPassInterpolateEnv|ProxyPassMatch|ProxyPassReverse|ProxyPassReverseCookieDomain|ProxyPassReverseCookiePath|ProxyPreserveHost|ProxyReceiveBufferSize|ProxyRemote|ProxyRemoteMatch|ProxyRequests|ProxySCGIInternalRedirect|ProxySCGISendfile|ProxySet|ProxySourceAddress|ProxyStatus|ProxyTimeout|ProxyVia|ReadmeName|ReceiveBufferSize|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp|ReflectorHeader|RemoteIPHeader|RemoteIPInternalProxy|RemoteIPInternalProxyList|RemoteIPProxiesHeader|RemoteIPTrustedProxy|RemoteIPTrustedProxyList|RemoveCharset|RemoveEncoding|RemoveHandler|RemoveInputFilter|RemoveLanguage|RemoveOutputFilter|RemoveType|RequestHeader|RequestReadTimeout|Require|RewriteBase|RewriteCond|RewriteEngine|RewriteMap|RewriteOptions|RewriteRule|RLimitCPU|RLimitMEM|RLimitNPROC|Satisfy|ScoreBoardFile|Script|ScriptAlias|ScriptAliasMatch|ScriptInterpreterSource|ScriptLog|ScriptLogBuffer|ScriptLogLength|ScriptSock|SecureListen|SeeRequestTail|SendBufferSize|ServerAdmin|ServerAlias|ServerLimit|ServerName|ServerPath|ServerRoot|ServerSignature|ServerTokens|Session|SessionCookieName|SessionCookieName2|SessionCookieRemove|SessionCryptoCipher|SessionCryptoDriver|SessionCryptoPassphrase|SessionCryptoPassphraseFile|SessionDBDCookieName|SessionDBDCookieName2|SessionDBDCookieRemove|SessionDBDDeleteLabel|SessionDBDInsertLabel|SessionDBDPerUser|SessionDBDSelectLabel|SessionDBDUpdateLabel|SessionEnv|SessionExclude|SessionHeader|SessionInclude|SessionMaxAge|SetEnv|SetEnvIf|SetEnvIfExpr|SetEnvIfNoCase|SetHandler|SetInputFilter|SetOutputFilter|SSIEndTag|SSIErrorMsg|SSIETag|SSILastModified|SSILegacyExprParser|SSIStartTag|SSITimeFormat|SSIUndefinedEcho|SSLCACertificateFile|SSLCACertificatePath|SSLCADNRequestFile|SSLCADNRequestPath|SSLCARevocationCheck|SSLCARevocationFile|SSLCARevocationPath|SSLCertificateChainFile|SSLCertificateFile|SSLCertificateKeyFile|SSLCipherSuite|SSLCompression|SSLCryptoDevice|SSLEngine|SSLFIPS|SSLHonorCipherOrder|SSLInsecureRenegotiation|SSLOCSPDefaultResponder|SSLOCSPEnable|SSLOCSPOverrideResponder|SSLOCSPResponderTimeout|SSLOCSPResponseMaxAge|SSLOCSPResponseTimeSkew|SSLOCSPUseRequestNonce|SSLOpenSSLConfCmd|SSLOptions|SSLPassPhraseDialog|SSLProtocol|SSLProxyCACertificateFile|SSLProxyCACertificatePath|SSLProxyCARevocationCheck|SSLProxyCARevocationFile|SSLProxyCARevocationPath|SSLProxyCheckPeerCN|SSLProxyCheckPeerExpire|SSLProxyCheckPeerName|SSLProxyCipherSuite|SSLProxyEngine|SSLProxyMachineCertificateChainFile|SSLProxyMachineCertificateFile|SSLProxyMachineCertificatePath|SSLProxyProtocol|SSLProxyVerify|SSLProxyVerifyDepth|SSLRandomSeed|SSLRenegBufferSize|SSLRequire|SSLRequireSSL|SSLSessionCache|SSLSessionCacheTimeout|SSLSessionTicketKeyFile|SSLSRPUnknownUserSeed|SSLSRPVerifierFile|SSLStaplingCache|SSLStaplingErrorCacheTimeout|SSLStaplingFakeTryLater|SSLStaplingForceURL|SSLStaplingResponderTimeout|SSLStaplingResponseMaxAge|SSLStaplingResponseTimeSkew|SSLStaplingReturnResponderErrors|SSLStaplingStandardCacheTimeout|SSLStrictSNIVHostCheck|SSLUserName|SSLUseStapling|SSLVerifyClient|SSLVerifyDepth|StartServers|StartThreads|Substitute|Suexec|SuexecUserGroup|ThreadLimit|ThreadsPerChild|ThreadStackSize|TimeOut|TraceEnable|TransferLog|TypesConfig|UnDefine|UndefMacro|UnsetEnv|Use|UseCanonicalName|UseCanonicalPhysicalPort|User|UserDir|VHostCGIMode|VHostCGIPrivs|VHostGroup|VHostPrivs|VHostSecure|VHostUser|VirtualDocumentRoot|VirtualDocumentRootIP|VirtualScriptAlias|VirtualScriptAliasIP|WatchdogInterval|XBitHack|xml2EncAlias|xml2EncDefault|xml2StartParse)\b/mi,
        lookbehind: true,
        alias: 'property'
    },
    'directive-block': {
        pattern: /<\/?\b(AuthnProviderAlias|AuthzProviderAlias|Directory|DirectoryMatch|Else|ElseIf|Files|FilesMatch|If|IfDefine|IfModule|IfVersion|Limit|LimitExcept|Location|LocationMatch|Macro|Proxy|RequireAll|RequireAny|RequireNone|VirtualHost)\b *.*>/i,
        inside: {
            'directive-block': {
                pattern: /^<\/?\w+/,
                inside: {
                    'punctuation': /^<\/?/
                },
                alias: 'tag'
            },
            'directive-block-parameter': {
                pattern: /.*[^>]/,
                inside: {
                    'punctuation': /:/,
                    'string': {
                        pattern: /("|').*\1/,
                        inside: {
                            'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/
                        }
                    }
                },
                alias: 'attr-value'
            },
            'punctuation': />/
        },
        alias: 'tag'
    },
    'directive-flags': {
        pattern: /\[(\w,?)+\]/,
        alias: 'keyword'
    },
    'string': {
        pattern: /("|').*\1/,
        inside: {
            'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/
        }
    },
    'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/,
    'regex': /\^?.*\$|\^.*\$?/
};

(function(Prism) {
    var insideString = {
        variable: [
            // Arithmetic Environment
            {
                pattern: /\$?\(\([\w\W]+?\)\)/,
                inside: {
                    // If there is a $ sign at the beginning highlight $(( and )) as variable
                    variable: [{
                        pattern: /(^\$\(\([\w\W]+)\)\)/,
                        lookbehind: true
                    },
                        /^\$\(\(/,
                    ],
                    number: /\b-?(?:0x[\dA-Fa-f]+|\d*\.?\d+(?:[Ee]-?\d+)?)\b/,
                    // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
                    operator: /--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/,
                    // If there is no $ sign at the beginning highlight (( and )) as punctuation
                    punctuation: /\(\(?|\)\)?|,|;/
                }
            },
            // Command Substitution
            {
                pattern: /\$\([^)]+\)|`[^`]+`/,
                inside: {
                    variable: /^\$\(|^`|\)$|`$/
                }
            },
            /\$(?:[a-z0-9_#\?\*!@]+|\{[^}]+\})/i
        ],
    };

    Prism.languages.bash = {
        'shebang': {
            pattern: /^#!\s*\/bin\/bash|^#!\s*\/bin\/sh/,
            alias: 'important'
        },
        'comment': {
            pattern: /(^|[^"{\\])#.*/,
            lookbehind: true
        },
        'string': [
            //Support for Here-Documents https://en.wikipedia.org/wiki/Here_document
            {
                pattern: /((?:^|[^<])<<\s*)(?:"|')?(\w+?)(?:"|')?\s*\r?\n(?:[\s\S])*?\r?\n\2/g,
                lookbehind: true,
                greedy: true,
                inside: insideString
            },
            {
                pattern: /(["'])(?:\\\\|\\?[^\\])*?\1/g,
                greedy: true,
                inside: insideString
            }
        ],
        'variable': insideString.variable,
        // Originally based on http://ss64.com/bash/
        'function': {
            pattern: /(^|\s|;|\||&)(?:alias|apropos|apt-get|aptitude|aspell|awk|basename|bash|bc|bg|builtin|bzip2|cal|cat|cd|cfdisk|chgrp|chmod|chown|chroot|chkconfig|cksum|clear|cmp|comm|command|cp|cron|crontab|csplit|cut|date|dc|dd|ddrescue|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|enable|env|ethtool|eval|exec|expand|expect|export|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|getopts|git|grep|groupadd|groupdel|groupmod|groups|gzip|hash|head|help|hg|history|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|jobs|join|kill|killall|less|link|ln|locate|logname|logout|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|make|man|mkdir|mkfifo|mkisofs|mknod|more|most|mount|mtools|mtr|mv|mmv|nano|netstat|nice|nl|nohup|notify-send|nslookup|open|op|passwd|paste|pathchk|ping|pkill|popd|pr|printcap|printenv|printf|ps|pushd|pv|pwd|quota|quotacheck|quotactl|ram|rar|rcp|read|readarray|readonly|reboot|rename|renice|remsync|rev|rm|rmdir|rsync|screen|scp|sdiff|sed|seq|service|sftp|shift|shopt|shutdown|sleep|slocate|sort|source|split|ssh|stat|strace|su|sudo|sum|suspend|sync|tail|tar|tee|test|time|timeout|times|touch|top|traceroute|trap|tr|tsort|tty|type|ulimit|umask|umount|unalias|uname|unexpand|uniq|units|unrar|unshar|uptime|useradd|userdel|usermod|users|uuencode|uudecode|v|vdir|vi|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yes|zip)(?=$|\s|;|\||&)/,
            lookbehind: true
        },
        'keyword': {
            pattern: /(^|\s|;|\||&)(?:let|:|\.|if|then|else|elif|fi|for|break|continue|while|in|case|function|select|do|done|until|echo|exit|return|set|declare)(?=$|\s|;|\||&)/,
            lookbehind: true
        },
        'boolean': {
            pattern: /(^|\s|;|\||&)(?:true|false)(?=$|\s|;|\||&)/,
            lookbehind: true
        },
        'operator': /&&?|\|\|?|==?|!=?|<<<?|>>|<=?|>=?|=~/,
        'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];]/
    };

    var inside = insideString.variable[1].inside;
    inside['function'] = Prism.languages.bash['function'];
    inside.keyword = Prism.languages.bash.keyword;
    inside.boolean = Prism.languages.bash.boolean;
    inside.operator = Prism.languages.bash.operator;
    inside.punctuation = Prism.languages.bash.punctuation;
})(Prism);
Prism.languages.c = Prism.languages.extend('clike', {
    'keyword': /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
    'operator': /\-[>-]?|\+\+?|!=?|<<?=?|>>?=?|==?|&&?|\|?\||[~^%?*\/]/,
    'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)[ful]*\b/i
});

Prism.languages.insertBefore('c', 'string', {
    'macro': {
        // allow for multiline macro definitions
        // spaces after the # character compile fine with gcc
        pattern: /(^\s*)#\s*[a-z]+([^\r\n\\]|\\.|\\(?:\r\n?|\n))*/im,
        lookbehind: true,
        alias: 'property',
        inside: {
            // highlight the path of the include statement as a string
            'string': {
                pattern: /(#\s*include\s*)(<.+?>|("|')(\\?.)+?\3)/,
                lookbehind: true
            },
            // highlight macro directives as keywords
            'directive': {
                pattern: /(#\s*)\b(define|elif|else|endif|error|ifdef|ifndef|if|import|include|line|pragma|undef|using)\b/,
                lookbehind: true,
                alias: 'keyword'
            }
        }
    },
    // highlight predefined macros as constants
    'constant': /\b(__FILE__|__LINE__|__DATE__|__TIME__|__TIMESTAMP__|__func__|EOF|NULL|stdin|stdout|stderr)\b/
});

delete Prism.languages.c['class-name'];
delete Prism.languages.c['boolean'];

Prism.languages.cpp = Prism.languages.extend('c', {
    'keyword': /\b(alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|nullptr|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/,
    'boolean': /\b(true|false)\b/,
    'operator': /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|:{1,2}|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|\b(and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/
});

Prism.languages.insertBefore('cpp', 'keyword', {
    'class-name': {
        pattern: /(class\s+)[a-z0-9_]+/i,
        lookbehind: true
    }
});
/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 * 		constant, builtin, variable, symbol, regex
 */
(function(Prism) {
    Prism.languages.ruby = Prism.languages.extend('clike', {
        'comment': /#(?!\{[^\r\n]*?\}).*/,
        'keyword': /\b(alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|false|for|if|in|module|new|next|nil|not|or|raise|redo|require|rescue|retry|return|self|super|then|throw|true|undef|unless|until|when|while|yield)\b/
    });

    var interpolation = {
        pattern: /#\{[^}]+\}/,
        inside: {
            'delimiter': {
                pattern: /^#\{|\}$/,
                alias: 'tag'
            },
            rest: Prism.util.clone(Prism.languages.ruby)
        }
    };

    Prism.languages.insertBefore('ruby', 'keyword', {
        'regex': [
            {
                pattern: /%r([^a-zA-Z0-9\s\{\(\[<])(?:[^\\]|\\[\s\S])*?\1[gim]{0,3}/,
                inside: {
                    'interpolation': interpolation
                }
            },
            {
                pattern: /%r\((?:[^()\\]|\\[\s\S])*\)[gim]{0,3}/,
                inside: {
                    'interpolation': interpolation
                }
            },
            {
                // Here we need to specifically allow interpolation
                pattern: /%r\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}[gim]{0,3}/,
                inside: {
                    'interpolation': interpolation
                }
            },
            {
                pattern: /%r\[(?:[^\[\]\\]|\\[\s\S])*\][gim]{0,3}/,
                inside: {
                    'interpolation': interpolation
                }
            },
            {
                pattern: /%r<(?:[^<>\\]|\\[\s\S])*>[gim]{0,3}/,
                inside: {
                    'interpolation': interpolation
                }
            },
            {
                pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/,
                lookbehind: true
            }
        ],
        'variable': /[@$]+[a-zA-Z_][a-zA-Z_0-9]*(?:[?!]|\b)/,
        'symbol': /:[a-zA-Z_][a-zA-Z_0-9]*(?:[?!]|\b)/
    });

    Prism.languages.insertBefore('ruby', 'number', {
        'builtin': /\b(Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Stat|File|Fixnum|Fload|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|TMS|Symbol|ThreadGroup|Thread|Time|TrueClass)\b/,
        'constant': /\b[A-Z][a-zA-Z_0-9]*(?:[?!]|\b)/
    });

    Prism.languages.ruby.string = [
        {
            pattern: /%[qQiIwWxs]?([^a-zA-Z0-9\s\{\(\[<])(?:[^\\]|\\[\s\S])*?\1/,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%[qQiIwWxs]?\((?:[^()\\]|\\[\s\S])*\)/,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            // Here we need to specifically allow interpolation
            pattern: /%[qQiIwWxs]?\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}/,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%[qQiIwWxs]?\[(?:[^\[\]\\]|\\[\s\S])*\]/,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /%[qQiIwWxs]?<(?:[^<>\\]|\\[\s\S])*>/,
            inside: {
                'interpolation': interpolation
            }
        },
        {
            pattern: /("|')(#\{[^}]+\}|\\(?:\r?\n|\r)|\\?.)*?\1/,
            inside: {
                'interpolation': interpolation
            }
        }
    ];
}(Prism));
Prism.languages.css.selector = {
    pattern: /[^\{\}\s][^\{\}]*(?=\s*\{)/,
    inside: {
        'pseudo-element': /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/,
        'pseudo-class': /:[-\w]+(?:\(.*\))?/,
        'class': /\.[-:\.\w]+/,
        'id': /#[-:\.\w]+/
    }
};

Prism.languages.insertBefore('css', 'function', {
    'hexcode': /#[\da-f]{3,6}/i,
    'entity': /\\[\da-f]{1,8}/i,
    'number': /[\d%\.]+/
});
Prism.languages.diff = {
    'coord': [
        // Match all kinds of coord lines (prefixed by "+++", "---" or "***").
        /^(?:\*{3}|-{3}|\+{3}).*$/m,
        // Match "@@ ... @@" coord lines in unified diff.
        /^@@.*@@$/m,
        // Match coord lines in normal diff (starts with a number).
        /^\d+.*$/m
    ],

    // Match inserted and deleted lines. Support both +/- and >/< styles.
    'deleted': /^[-<].+$/m,
    'inserted': /^[+>].+$/m,

    // Match "different" lines (prefixed with "!") in context diff.
    'diff': {
        'pattern': /^!(?!!).+$/m,
        'alias': 'important'
    }
};
Prism.languages.git = {
    /*
     * A simple one line comment like in a git status command
     * For instance:
     * $ git status
     * # On branch infinite-scroll
     * # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
     * # and have 1 and 2 different commits each, respectively.
     * nothing to commit (working directory clean)
     */
    'comment': /^#.*/m,

    /*
     * Regexp to match the changed lines in a git diff output. Check the example below.
     */
    'deleted': /^[-–].*/m,
    'inserted': /^\+.*/m,

    /*
     * a string (double and simple quote)
     */
    'string': /("|')(\\?.)*?\1/m,

    /*
     * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
     * For instance:
     * $ git add file.txt
     */
    'command': {
        pattern: /^.*\$ git .*$/m,
        inside: {
            /*
             * A git command can contain a parameter starting by a single or a double dash followed by a string
             * For instance:
             * $ git diff --cached
             * $ git log -p
             */
            'parameter': /\s(--|-)\w+/m
        }
    },

    /*
     * Coordinates displayed in a git diff command
     * For instance:
     * $ git diff
     * diff --git file.txt file.txt
     * index 6214953..1d54a52 100644
     * --- file.txt
     * +++ file.txt
     * @@ -1 +1,2 @@
     * -Here's my tetx file
     * +Here's my text file
     * +And this is the second line
     */
    'coord': /^@@.*@@$/m,

    /*
     * Match a "commit [SHA1]" line in a git log output.
     * For instance:
     * $ git log
     * commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
     * Author: lgiraudel
     * Date:   Mon Feb 17 11:18:34 2014 +0100
     *
     *     Add of a new line
     */
    'commit_sha1': /^commit \w{40}$/m
};

Prism.languages.groovy = Prism.languages.extend('clike', {
    'keyword': /\b(as|def|in|abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|trait|transient|try|void|volatile|while)\b/,
    'string': [
        {
            pattern: /("""|''')[\W\w]*?\1|(\$\/)(\$\/\$|[\W\w])*?\/\$/,
            greedy: true
        },
        {
            pattern: /("|'|\/)(?:\\?.)*?\1/,
            greedy: true
        },
    ],
    'number': /\b(?:0b[01_]+|0x[\da-f_]+(?:\.[\da-f_p\-]+)?|[\d_]+(?:\.[\d_]+)?(?:e[+-]?[\d]+)?)[glidf]?\b/i,
    'operator': {
        pattern: /(^|[^.])(~|==?~?|\?[.:]?|\*(?:[.=]|\*=?)?|\.[@&]|\.\.<|\.{1,2}(?!\.)|-[-=>]?|\+[+=]?|!=?|<(?:<=?|=>?)?|>(?:>>?=?|=)?|&[&=]?|\|[|=]?|\/=?|\^=?|%=?)/,
        lookbehind: true
    },
    'punctuation': /\.+|[{}[\];(),:$]/
});

Prism.languages.insertBefore('groovy', 'string', {
    'shebang': {
        pattern: /#!.+/,
        alias: 'comment'
    }
});

Prism.languages.insertBefore('groovy', 'punctuation', {
    'spock-block': /\b(setup|given|when|then|and|cleanup|expect|where):/
});

Prism.languages.insertBefore('groovy', 'function', {
    'annotation': {
        alias: 'punctuation',
        pattern: /(^|[^.])@\w+/,
        lookbehind: true
    }
});

// Handle string interpolation
Prism.hooks.add('wrap', function(env) {
    if (env.language === 'groovy' && env.type === 'string') {
        var delimiter = env.content[0];

        if (delimiter != "'") {
            var pattern = /([^\\])(\$(\{.*?\}|[\w\.]+))/;
            if (delimiter === '$') {
                pattern = /([^\$])(\$(\{.*?\}|[\w\.]+))/;
            }

            // To prevent double HTML-ecoding we have to decode env.content first
            env.content = env.content.replace(/&amp;/g, '&').replace(/&lt;/g, '<');

            env.content = Prism.highlight(env.content, {
                'expression': {
                    pattern: pattern,
                    lookbehind: true,
                    inside: Prism.languages.groovy
                }
            });

            env.classes.push(delimiter === '/' ? 'regex' : 'gstring');
        }
    }
});

(function(Prism) {

    var handlebars_pattern = /\{\{\{[\w\W]+?\}\}\}|\{\{[\w\W]+?\}\}/g;

    Prism.languages.handlebars = Prism.languages.extend('markup', {
        'handlebars': {
            pattern: handlebars_pattern,
            inside: {
                'delimiter': {
                    pattern: /^\{\{\{?|\}\}\}?$/i,
                    alias: 'punctuation'
                },
                'string': /(["'])(\\?.)*?\1/,
                'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee][+-]?\d+)?)\b/,
                'boolean': /\b(true|false)\b/,
                'block': {
                    pattern: /^(\s*~?\s*)[#\/]\S+?(?=\s*~?\s*$|\s)/i,
                    lookbehind: true,
                    alias: 'keyword'
                },
                'brackets': {
                    pattern: /\[[^\]]+\]/,
                    inside: {
                        punctuation: /\[|\]/,
                        variable: /[\w\W]+/
                    }
                },
                'punctuation': /[!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]/,
                'variable': /[^!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~\s]+/
            }
        }
    });

    // Comments are inserted at top so that they can
    // surround markup
    Prism.languages.insertBefore('handlebars', 'tag', {
        'handlebars-comment': {
            pattern: /\{\{![\w\W]*?\}\}/,
            alias: ['handlebars','comment']
        }
    });

    // Tokenize all inline Handlebars expressions that are wrapped in {{ }} or {{{ }}}
    // This allows for easy Handlebars + markup highlighting
    Prism.hooks.add('before-highlight', function(env) {
        if (env.language !== 'handlebars') {
            return;
        }

        env.tokenStack = [];

        env.backupCode = env.code;
        env.code = env.code.replace(handlebars_pattern, function(match) {
            env.tokenStack.push(match);

            return '___HANDLEBARS' + env.tokenStack.length + '___';
        });
    });

    // Restore env.code for other plugins (e.g. line-numbers)
    Prism.hooks.add('before-insert', function(env) {
        if (env.language === 'handlebars') {
            env.code = env.backupCode;
            delete env.backupCode;
        }
    });

    // Re-insert the tokens after highlighting
    // and highlight them with defined grammar
    Prism.hooks.add('after-highlight', function(env) {
        if (env.language !== 'handlebars') {
            return;
        }

        for (var i = 0, t; t = env.tokenStack[i]; i++) {
            // The replace prevents $$, $&, $`, $', $n, $nn from being interpreted as special patterns
            env.highlightedCode = env.highlightedCode.replace('___HANDLEBARS' + (i + 1) + '___', Prism.highlight(t, env.grammar, 'handlebars').replace(/\$/g, '$$$$'));
        }

        env.element.innerHTML = env.highlightedCode;
    });

}(Prism));

Prism.languages.java = Prism.languages.extend('clike', {
    'keyword': /\b(abstract|continue|for|new|switch|assert|default|goto|package|synchronized|boolean|do|if|private|this|break|double|implements|protected|throw|byte|else|import|public|throws|case|enum|instanceof|return|transient|catch|extends|int|short|try|char|final|interface|static|void|class|finally|long|strictfp|volatile|const|float|native|super|while)\b/,
    'number': /\b0b[01]+\b|\b0x[\da-f]*\.?[\da-fp\-]+\b|\b\d*\.?\d+(?:e[+-]?\d+)?[df]?\b/i,
    'operator': {
        pattern: /(^|[^.])(?:\+[+=]?|-[-=]?|!=?|<<?=?|>>?>?=?|==?|&[&=]?|\|[|=]?|\*=?|\/=?|%=?|\^=?|[?:~])/m,
        lookbehind: true
    }
});

Prism.languages.insertBefore('java','function', {
    'annotation': {
        alias: 'punctuation',
        pattern: /(^|[^.])@\w+/,
        lookbehind: true
    }
});

Prism.languages.json = {
    'property': /".*?"(?=\s*:)/ig,
    'string': /"(?!:)(\\?[^"])*?"(?!:)/g,
    'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
    'punctuation': /[{}[\]);,]/g,
    'operator': /:/g,
    'boolean': /\b(true|false)\b/gi,
    'null': /\bnull\b/gi,
};

Prism.languages.jsonp = Prism.languages.json;

(function (Prism) {
    Prism.languages.kotlin = Prism.languages.extend('clike', {
        'keyword': {
            // The lookbehind prevents wrong highlighting of e.g. kotlin.properties.get
            pattern: /(^|[^.])\b(?:abstract|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|else|enum|final|finally|for|fun|get|if|import|in|init|inline|inner|interface|internal|is|lateinit|noinline|null|object|open|out|override|package|private|protected|public|reified|return|sealed|set|super|tailrec|this|throw|to|try|val|var|when|where|while)\b/,
            lookbehind: true
        },
        'function': [
            /\w+(?=\s*\()/,
            {
                pattern: /(\.)\w+(?=\s*\{)/,
                lookbehind: true
            }
        ],
        'number': /\b(?:0[bx][\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?[fFL]?)\b/,
        'operator': /\+[+=]?|-[-=>]?|==?=?|!(?:!|==?)?|[\/*%<>]=?|[?:]:?|\.\.|&&|\|\||\b(?:and|inv|or|shl|shr|ushr|xor)\b/
    });

    delete Prism.languages.kotlin["class-name"];

    Prism.languages.insertBefore('kotlin', 'string', {
        'raw-string': {
            pattern: /(["'])\1\1[\s\S]*?\1{3}/,
            alias: 'string'
            // See interpolation below
        }
    });
    Prism.languages.insertBefore('kotlin', 'keyword', {
        'annotation': {
            pattern: /\B@(?:\w+:)?(?:[A-Z]\w*|\[[^\]]+\])/,
            alias: 'builtin'
        }
    });
    Prism.languages.insertBefore('kotlin', 'function', {
        'label': {
            pattern: /\w+@|@\w+/,
            alias: 'symbol'
        }
    });

    var interpolation = [
        {
            pattern: /\$\{[^}]+\}/,
            inside: {
                delimiter: {
                    pattern: /^\$\{|\}$/,
                    alias: 'variable'
                },
                rest: Prism.util.clone(Prism.languages.kotlin)
            }
        },
        {
            pattern: /\$\w+/,
            alias: 'variable'
        }
    ];

    Prism.languages.kotlin['string'].inside = Prism.languages.kotlin['raw-string'].inside = {
        interpolation: interpolation
    };

}(Prism));
(function(Prism) {
    var funcPattern = /\\([^a-z()[\]]|[a-z\*]+)/i,
        insideEqu = {
            'equation-command': {
                pattern: funcPattern,
                alias: 'regex'
            }
        };

    Prism.languages.latex = {
        'comment': /%.*/m,
        // the verbatim environment prints whitespace to the document
        'cdata':  {
            pattern: /(\\begin\{((?:verbatim|lstlisting)\*?)\})([\w\W]*?)(?=\\end\{\2\})/,
            lookbehind: true
        },
        /*
         * equations can be between $ $ or \( \) or \[ \]
         * (all are multiline)
         */
        'equation': [
            {
                pattern: /\$(?:\\?[\w\W])*?\$|\\\((?:\\?[\w\W])*?\\\)|\\\[(?:\\?[\w\W])*?\\\]/,
                inside: insideEqu,
                alias: 'string'
            },
            {
                pattern: /(\\begin\{((?:equation|math|eqnarray|align|multline|gather)\*?)\})([\w\W]*?)(?=\\end\{\2\})/,
                lookbehind: true,
                inside: insideEqu,
                alias: 'string'
            }
        ],
        /*
         * arguments which are keywords or references are highlighted
         * as keywords
         */
        'keyword': {
            pattern: /(\\(?:begin|end|ref|cite|label|usepackage|documentclass)(?:\[[^\]]+\])?\{)[^}]+(?=\})/,
            lookbehind: true
        },
        'url': {
            pattern: /(\\url\{)[^}]+(?=\})/,
            lookbehind: true
        },
        /*
         * section or chapter headlines are highlighted as bold so that
         * they stand out more
         */
        'headline': {
            pattern: /(\\(?:part|chapter|section|subsection|frametitle|subsubsection|paragraph|subparagraph|subsubparagraph|subsubsubparagraph)\*?(?:\[[^\]]+\])?\{)[^}]+(?=\}(?:\[[^\]]+\])?)/,
            lookbehind: true,
            alias: 'class-name'
        },
        'function': {
            pattern: funcPattern,
            alias: 'selector'
        },
        'punctuation': /[[\]{}&]/
    };
})(Prism);

Prism.languages.markdown = Prism.languages.extend('markup', {});
Prism.languages.insertBefore('markdown', 'prolog', {
    'blockquote': {
        // > ...
        pattern: /^>(?:[\t ]*>)*/m,
        alias: 'punctuation'
    },
    'code': [
        {
            // Prefixed by 4 spaces or 1 tab
            pattern: /^(?: {4}|\t).+/m,
            alias: 'keyword'
        },
        {
            // `code`
            // ``code``
            pattern: /``.+?``|`[^`\n]+`/,
            alias: 'keyword'
        }
    ],
    'title': [
        {
            // title 1
            // =======

            // title 2
            // -------
            pattern: /\w+.*(?:\r?\n|\r)(?:==+|--+)/,
            alias: 'important',
            inside: {
                punctuation: /==+$|--+$/
            }
        },
        {
            // # title 1
            // ###### title 6
            pattern: /(^\s*)#+.+/m,
            lookbehind: true,
            alias: 'important',
            inside: {
                punctuation: /^#+|#+$/
            }
        }
    ],
    'hr': {
        // ***
        // ---
        // * * *
        // -----------
        pattern: /(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m,
        lookbehind: true,
        alias: 'punctuation'
    },
    'list': {
        // * item
        // + item
        // - item
        // 1. item
        pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
        lookbehind: true,
        alias: 'punctuation'
    },
    'url-reference': {
        // [id]: http://example.com "Optional title"
        // [id]: http://example.com 'Optional title'
        // [id]: http://example.com (Optional title)
        // [id]: <http://example.com> "Optional title"
        pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
        inside: {
            'variable': {
                pattern: /^(!?\[)[^\]]+/,
                lookbehind: true
            },
            'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
            'punctuation': /^[\[\]!:]|[<>]/
        },
        alias: 'url'
    },
    'bold': {
        // **strong**
        // __strong__

        // Allow only one line break
        pattern: /(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
        lookbehind: true,
        inside: {
            'punctuation': /^\*\*|^__|\*\*$|__$/
        }
    },
    'italic': {
        // *em*
        // _em_

        // Allow only one line break
        pattern: /(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
        lookbehind: true,
        inside: {
            'punctuation': /^[*_]|[*_]$/
        }
    },
    'url': {
        // [example](http://example.com "Optional title")
        // [example] [id]
        pattern: /!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,
        inside: {
            'variable': {
                pattern: /(!?\[)[^\]]+(?=\]$)/,
                lookbehind: true
            },
            'string': {
                pattern: /"(?:\\.|[^"\\])*"(?=\)$)/
            }
        }
    }
});

Prism.languages.markdown['bold'].inside['url'] = Prism.util.clone(Prism.languages.markdown['url']);
Prism.languages.markdown['italic'].inside['url'] = Prism.util.clone(Prism.languages.markdown['url']);
Prism.languages.markdown['bold'].inside['italic'] = Prism.util.clone(Prism.languages.markdown['italic']);
Prism.languages.markdown['italic'].inside['bold'] = Prism.util.clone(Prism.languages.markdown['bold']);
/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 *
 * Supports the following:
 * 		- Extends clike syntax
 * 		- Support for PHP 5.3+ (namespaces, traits, generators, etc)
 * 		- Smarter constant and function matching
 *
 * Adds the following new token classes:
 * 		constant, delimiter, variable, function, package
 */

Prism.languages.php = Prism.languages.extend('clike', {
    'keyword': /\b(and|or|xor|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|for|foreach|function|include|include_once|global|if|new|return|static|switch|use|require|require_once|var|while|abstract|interface|public|implements|private|protected|parent|throw|null|echo|print|trait|namespace|final|yield|goto|instanceof|finally|try|catch)\b/i,
    'constant': /\b[A-Z0-9_]{2,}\b/,
    'comment': {
        pattern: /(^|[^\\])(?:\/\*[\w\W]*?\*\/|\/\/.*)/,
        lookbehind: true
    }
});

// Shell-like comments are matched after strings, because they are less
// common than strings containing hashes...
Prism.languages.insertBefore('php', 'class-name', {
    'shell-comment': {
        pattern: /(^|[^\\])#.*/,
        lookbehind: true,
        alias: 'comment'
    }
});

Prism.languages.insertBefore('php', 'keyword', {
    'delimiter': /\?>|<\?(?:php)?/i,
    'variable': /\$\w+\b/i,
    'package': {
        pattern: /(\\|namespace\s+|use\s+)[\w\\]+/,
        lookbehind: true,
        inside: {
            punctuation: /\\/
        }
    }
});

// Must be defined after the function pattern
Prism.languages.insertBefore('php', 'operator', {
    'property': {
        pattern: /(->)[\w]+/,
        lookbehind: true
    }
});

// Add HTML support of the markup language exists
if (Prism.languages.markup) {

    // Tokenize all inline PHP blocks that are wrapped in <?php ?>
    // This allows for easy PHP + markup highlighting
    Prism.hooks.add('before-highlight', function(env) {
        if (env.language !== 'php') {
            return;
        }

        env.tokenStack = [];

        env.backupCode = env.code;
        env.code = env.code.replace(/(?:<\?php|<\?)[\w\W]*?(?:\?>)/ig, function(match) {
            env.tokenStack.push(match);

            return '{{{PHP' + env.tokenStack.length + '}}}';
        });
    });

    // Restore env.code for other plugins (e.g. line-numbers)
    Prism.hooks.add('before-insert', function(env) {
        if (env.language === 'php') {
            env.code = env.backupCode;
            delete env.backupCode;
        }
    });

    // Re-insert the tokens after highlighting
    Prism.hooks.add('after-highlight', function(env) {
        if (env.language !== 'php') {
            return;
        }

        for (var i = 0, t; t = env.tokenStack[i]; i++) {
            // The replace prevents $$, $&, $`, $', $n, $nn from being interpreted as special patterns
            env.highlightedCode = env.highlightedCode.replace('{{{PHP' + (i + 1) + '}}}', Prism.highlight(t, env.grammar, 'php').replace(/\$/g, '$$$$'));
        }

        env.element.innerHTML = env.highlightedCode;
    });

    // Wrap tokens in classes that are missing them
    Prism.hooks.add('wrap', function(env) {
        if (env.language === 'php' && env.type === 'markup') {
            env.content = env.content.replace(/(\{\{\{PHP[0-9]+\}\}\})/g, "<span class=\"token php\">$1</span>");
        }
    });

    // Add the rules before all others
    Prism.languages.insertBefore('php', 'comment', {
        'markup': {
            pattern: /<[^?]\/?(.*?)>/,
            inside: Prism.languages.markup
        },
        'php': /\{\{\{PHP[0-9]+\}\}\}/
    });
}
;
Prism.languages.insertBefore('php', 'variable', {
    'this': /\$this\b/,
    'global': /\$(?:_(?:SERVER|GET|POST|FILES|REQUEST|SESSION|ENV|COOKIE)|GLOBALS|HTTP_RAW_POST_DATA|argc|argv|php_errormsg|http_response_header)/,
    'scope': {
        pattern: /\b[\w\\]+::/,
        inside: {
            keyword: /(static|self|parent)/,
            punctuation: /(::|\\)/
        }
    }
});
Prism.languages.python= {
    'triple-quoted-string': {
        pattern: /"""[\s\S]+?"""|'''[\s\S]+?'''/,
        alias: 'string'
    },
    'comment': {
        pattern: /(^|[^\\])#.*/,
        lookbehind: true
    },
    'string': {
        pattern: /("|')(?:\\\\|\\?[^\\\r\n])*?\1/,
        greedy: true
    },
    'function' : {
        pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_][a-zA-Z0-9_]*(?=\()/g,
        lookbehind: true
    },
    'class-name': {
        pattern: /(\bclass\s+)[a-z0-9_]+/i,
        lookbehind: true
    },
    'keyword' : /\b(?:as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|pass|print|raise|return|try|while|with|yield)\b/,
    'boolean' : /\b(?:True|False)\b/,
    'number' : /\b-?(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
    'operator' : /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not)\b/,
    'punctuation' : /[{}[\];(),.:]/
};

Prism.languages.scss = Prism.languages.extend('css', {
    'comment': {
        pattern: /(^|[^\\])(?:\/\*[\w\W]*?\*\/|\/\/.*)/,
        lookbehind: true
    },
    'atrule': {
        pattern: /@[\w-]+(?:\([^()]+\)|[^(])*?(?=\s+[{;])/,
        inside: {
            'rule': /@[\w-]+/
            // See rest below
        }
    },
    // url, compassified
    'url': /(?:[-a-z]+-)*url(?=\()/i,
    // CSS selector regex is not appropriate for Sass
    // since there can be lot more things (var, @ directive, nesting..)
    // a selector must start at the end of a property or after a brace (end of other rules or nesting)
    // it can contain some characters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
    // the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
    // can "pass" as a selector- e.g: proper#{$erty})
    // this one was hard to do, so please be careful if you edit this one :)
    'selector': {
        // Initial look-ahead is used to prevent matching of blank selectors
        pattern: /(?=\S)[^@;\{\}\(\)]?([^@;\{\}\(\)]|&|#\{\$[-_\w]+\})+(?=\s*\{(\}|\s|[^\}]+(:|\{)[^\}]+))/m,
        inside: {
            'placeholder': /%[-_\w]+/
        }
    }
});

Prism.languages.insertBefore('scss', 'atrule', {
    'keyword': [
        /@(?:if|else(?: if)?|for|each|while|import|extend|debug|warn|mixin|include|function|return|content)/i,
        {
            pattern: /( +)(?:from|through)(?= )/,
            lookbehind: true
        }
    ]
});

Prism.languages.insertBefore('scss', 'property', {
    // var and interpolated vars
    'variable': /\$[-_\w]+|#\{\$[-_\w]+\}/
});

Prism.languages.insertBefore('scss', 'function', {
    'placeholder': {
        pattern: /%[-_\w]+/,
        alias: 'selector'
    },
    'statement': /\B!(?:default|optional)\b/i,
    'boolean': /\b(?:true|false)\b/,
    'null': /\bnull\b/,
    'operator': {
        pattern: /(\s)(?:[-+*\/%]|[=!]=|<=?|>=?|and|or|not)(?=\s)/,
        lookbehind: true
    }
});

Prism.languages.scss['atrule'].inside.rest = Prism.util.clone(Prism.languages.scss);
Prism.languages.sql= {
    'comment': {
        pattern: /(^|[^\\])(?:\/\*[\w\W]*?\*\/|(?:--|\/\/|#).*)/,
        lookbehind: true
    },
    'string' : {
        pattern: /(^|[^@\\])("|')(?:\\?[\s\S])*?\2/,
        lookbehind: true
    },
    'variable': /@[\w.$]+|@("|'|`)(?:\\?[\s\S])+?\1/,
    'function': /\b(?:COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|UCASE|LCASE|MID|LEN|ROUND|NOW|FORMAT)(?=\s*\()/i, // Should we highlight user defined functions too?
    'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR VARYING|CHARACTER (?:SET|VARYING)|CHARSET|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMN|COLUMNS|COMMENT|COMMIT|COMMITTED|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|DATA(?:BASES?)?|DATETIME|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE(?: PRECISION)?|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE KEY|ELSE|ENABLE|ENCLOSED BY|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPE(?:D BY)?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTO|INVOKER|ISOLATION LEVEL|JOIN|KEYS?|KILL|LANGUAGE SQL|LAST|LEFT|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MODIFIES SQL DATA|MODIFY|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL(?: CHAR VARYING| CHARACTER(?: VARYING)?| VARCHAR)?|NATURAL|NCHAR(?: VARCHAR)?|NEXT|NO(?: SQL|CHECK|CYCLE)?|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READ(?:S SQL DATA|TEXT)?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEATABLE|REPLICATION|REQUIRE|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE MODE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|START(?:ING BY)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED BY|TEXT(?:SIZE)?|THEN|TIMESTAMP|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNPIVOT|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?)\b/i,
    'boolean': /\b(?:TRUE|FALSE|NULL)\b/i,
    'number': /\b-?(?:0x)?\d*\.?[\da-f]+\b/,
    'operator': /[-+*\/=%^~]|&&?|\|?\||!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
    'punctuation': /[;[\]()`,.]/
};
(function(){

    if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
        return;
    }

    function $$(expr, con) {
        return Array.prototype.slice.call((con || document).querySelectorAll(expr));
    }

    function hasClass(element, className) {
        className = " " + className + " ";
        return (" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1
    }

// Some browsers round the line-height, others don't.
// We need to test for it to position the elements properly.
    var isLineHeightRounded = (function() {
        var res;
        return function() {
            if(typeof res === 'undefined') {
                var d = document.createElement('div');
                d.style.fontSize = '13px';
                d.style.lineHeight = '1.5';
                d.style.padding = 0;
                d.style.border = 0;
                d.innerHTML = '&nbsp;<br />&nbsp;';
                document.body.appendChild(d);
                // Browsers that round the line-height should have offsetHeight === 38
                // The others should have 39.
                res = d.offsetHeight === 38;
                document.body.removeChild(d);
            }
            return res;
        }
    }());

    function highlightLines(pre, lines, classes) {
        var ranges = lines.replace(/\s+/g, '').split(','),
            offset = +pre.getAttribute('data-line-offset') || 0;

        var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
        var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);

        for (var i=0, range; range = ranges[i++];) {
            range = range.split('-');

            var start = +range[0],
                end = +range[1] || start;

            var line = document.createElement('div');

            line.textContent = Array(end - start + 2).join(' \n');
            line.className = (classes || '') + ' line-highlight';

            //if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
            if(!hasClass(pre, 'line-numbers')) {
                line.setAttribute('data-start', start);

                if(end > start) {
                    line.setAttribute('data-end', end);
                }
            }

            line.style.top = (start - offset - 1) * lineHeight + 'px';

            //allow this to play nicely with the line-numbers plugin
            if(hasClass(pre, 'line-numbers')) {
                //need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
                pre.appendChild(line);
            } else {
                (pre.querySelector('code') || pre).appendChild(line);
            }
        }
    }

    function applyHash() {
        var hash = location.hash.slice(1);

        // Remove pre-existing temporary lines
        $$('.temporary.line-highlight').forEach(function (line) {
            line.parentNode.removeChild(line);
        });

        var range = (hash.match(/\.([\d,-]+)$/) || [,''])[1];

        if (!range || document.getElementById(hash)) {
            return;
        }

        var id = hash.slice(0, hash.lastIndexOf('.')),
            pre = document.getElementById(id);

        if (!pre) {
            return;
        }

        if (!pre.hasAttribute('data-line')) {
            pre.setAttribute('data-line', '');
        }

        highlightLines(pre, range, 'temporary ');

        document.querySelector('.temporary.line-highlight').scrollIntoView();
    }

    var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

    Prism.hooks.add('complete', function(env) {
        var pre = env.element.parentNode;
        var lines = pre && pre.getAttribute('data-line');

        if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
            return;
        }

        clearTimeout(fakeTimer);

        $$('.line-highlight', pre).forEach(function (line) {
            line.parentNode.removeChild(line);
        });

        highlightLines(pre, lines);

        fakeTimer = setTimeout(applyHash, 1);
    });

    if(window.addEventListener) {
        window.addEventListener('hashchange', applyHash);
    }

})();

(function(){

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var url = /\b([a-z]{3,7}:\/\/|tel:)[\w\-+%~/.:#=?&amp;]+/,
        email = /\b\S+@[\w.]+[a-z]{2}/,
        linkMd = /\[([^\]]+)]\(([^)]+)\)/,

    // Tokens that may contain URLs and emails
        candidates = ['comment', 'url', 'attr-value', 'string'];

    Prism.hooks.add('before-highlight', function(env) {
        // Abort if grammar has already been processed
        if (!env.grammar || env.grammar['url-link']) {
            return;
        }
        Prism.languages.DFS(env.grammar, function (key, def, type) {
            if (candidates.indexOf(type) > -1 && Prism.util.type(def) !== 'Array') {
                if (!def.pattern) {
                    def = this[key] = {
                        pattern: def
                    };
                }

                def.inside = def.inside || {};

                if (type == 'comment') {
                    def.inside['md-link'] = linkMd;
                }
                if (type == 'attr-value') {
                    Prism.languages.insertBefore('inside', 'punctuation', { 'url-link': url }, def);
                }
                else {
                    def.inside['url-link'] = url;
                }

                def.inside['email-link'] = email;
            }
        });
        env.grammar['url-link'] = url;
        env.grammar['email-link'] = email;
    });

    Prism.hooks.add('wrap', function(env) {
        if (/-link$/.test(env.type)) {
            env.tag = 'a';

            var href = env.content;

            if (env.type == 'email-link' && href.indexOf('mailto:') != 0) {
                href = 'mailto:' + href;
            }
            else if (env.type == 'md-link') {
                // Markdown
                var match = env.content.match(linkMd);

                href = match[2];
                env.content = match[1];
            }

            env.attributes.href = href;
        }
    });

})();
(function(){

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    if (Prism.languages.css) {
        Prism.languages.css.atrule.inside['atrule-id'] = /^@[\w-]+/;

        // check whether the selector is an advanced pattern before extending it
        if (Prism.languages.css.selector.pattern)
        {
            Prism.languages.css.selector.inside['pseudo-class'] = /:[\w-]+/;
            Prism.languages.css.selector.inside['pseudo-element'] = /::[\w-]+/;
        }
        else
        {
            Prism.languages.css.selector = {
                pattern: Prism.languages.css.selector,
                inside: {
                    'pseudo-class': /:[\w-]+/,
                    'pseudo-element': /::[\w-]+/
                }
            };
        }
    }

    if (Prism.languages.markup) {
        Prism.languages.markup.tag.inside.tag.inside['tag-id'] = /[\w-]+/;

        var Tags = {
            HTML: {
                'a': 1, 'abbr': 1, 'acronym': 1, 'b': 1, 'basefont': 1, 'bdo': 1, 'big': 1, 'blink': 1, 'cite': 1, 'code': 1, 'dfn': 1, 'em': 1, 'kbd': 1,  'i': 1,
                'rp': 1, 'rt': 1, 'ruby': 1, 's': 1, 'samp': 1, 'small': 1, 'spacer': 1, 'strike': 1, 'strong': 1, 'sub': 1, 'sup': 1, 'time': 1, 'tt': 1,  'u': 1,
                'var': 1, 'wbr': 1, 'noframes': 1, 'summary': 1, 'command': 1, 'dt': 1, 'dd': 1, 'figure': 1, 'figcaption': 1, 'center': 1, 'section': 1, 'nav': 1,
                'article': 1, 'aside': 1, 'hgroup': 1, 'header': 1, 'footer': 1, 'address': 1, 'noscript': 1, 'isIndex': 1, 'main': 1, 'mark': 1, 'marquee': 1,
                'meter': 1, 'menu': 1
            },
            SVG: {
                'animateColor': 1, 'animateMotion': 1, 'animateTransform': 1, 'glyph': 1, 'feBlend': 1, 'feColorMatrix': 1, 'feComponentTransfer': 1,
                'feFuncR': 1, 'feFuncG': 1, 'feFuncB': 1, 'feFuncA': 1, 'feComposite': 1, 'feConvolveMatrix': 1, 'feDiffuseLighting': 1, 'feDisplacementMap': 1,
                'feFlood': 1, 'feGaussianBlur': 1, 'feImage': 1, 'feMerge': 1, 'feMergeNode': 1, 'feMorphology': 1, 'feOffset': 1, 'feSpecularLighting': 1,
                'feTile': 1, 'feTurbulence': 1, 'feDistantLight': 1, 'fePointLight': 1, 'feSpotLight': 1, 'linearGradient': 1, 'radialGradient': 1, 'altGlyph': 1,
                'textPath': 1, 'tref': 1, 'altglyph': 1, 'textpath': 1, 'altglyphdef': 1, 'altglyphitem': 1, 'clipPath': 1, 'color-profile': 1, 'cursor': 1,
                'font-face': 1, 'font-face-format': 1, 'font-face-name': 1, 'font-face-src': 1, 'font-face-uri': 1, 'foreignObject': 1, 'glyphRef': 1,
                'hkern': 1, 'vkern': 1
            },
            MathML: {}
        }
    }

    var language;

    Prism.hooks.add('wrap', function(env) {
        if ((env.type == 'tag-id'
                || (env.type == 'property' && env.content.indexOf('-') != 0)
                || (env.type == 'atrule-id'&& env.content.indexOf('@-') != 0)
                || (env.type == 'pseudo-class'&& env.content.indexOf(':-') != 0)
                || (env.type == 'pseudo-element'&& env.content.indexOf('::-') != 0)
                || (env.type == 'attr-name' && env.content.indexOf('data-') != 0)
            ) && env.content.indexOf('<') === -1
        ) {
            var searchURL = 'w/index.html?fulltext&search=';

            env.tag = 'a';

            var href = 'http://docs.webplatform.org/';

            if (env.language == 'css' || env.language == 'scss') {
                href += 'wiki/css/';

                if (env.type == 'property') {
                    href += 'properties/';
                }
                else if (env.type == 'atrule-id') {
                    href += 'atrules/';
                }
                else if (env.type == 'pseudo-class') {
                    href += 'selectors/pseudo-classes/';
                }
                else if (env.type == 'pseudo-element') {
                    href += 'selectors/pseudo-elements/';
                }
            }
            else if (env.language == 'markup') {
                if (env.type == 'tag-id') {
                    // Check language
                    language = getLanguage(env.content) || language;

                    if (language) {
                        href += 'wiki/' + language + '/elements/';
                    }
                    else {
                        href += searchURL;
                    }
                }
                else if (env.type == 'attr-name') {
                    if (language) {
                        href += 'wiki/' + language + '/attributes/';
                    }
                    else {
                        href += searchURL;
                    }
                }
            }

            href += env.content;

            env.attributes.href = href;
            env.attributes.target = '_blank';
        }
    });

    function getLanguage(tag) {
        var tagL = tag.toLowerCase();

        if (Tags.HTML[tagL]) {
            return 'html';
        }
        else if (Tags.SVG[tag]) {
            return 'svg';
        }
        else if (Tags.MathML[tag]) {
            return 'mathml';
        }

        // Not in dictionary, perform check
        if (Tags.HTML[tagL] !== 0 && typeof document !== 'undefined') {
            var htmlInterface = (document.createElement(tag).toString().match(/\[object HTML(.+)Element\]/) || [])[1];

            if (htmlInterface && htmlInterface != 'Unknown') {
                Tags.HTML[tagL] = 1;
                return 'html';
            }
        }

        Tags.HTML[tagL] = 0;

        if (Tags.SVG[tag] !== 0 && typeof document !== 'undefined') {
            var svgInterface = (document.createElementNS('http://www.w3.org/2000/svg', tag).toString().match(/\[object SVG(.+)Element\]/) || [])[1];

            if (svgInterface && svgInterface != 'Unknown') {
                Tags.SVG[tag] = 1;
                return 'svg';
            }
        }

        Tags.SVG[tag] = 0;

        // Lame way to detect MathML, but browsers don’t expose interface names there :(
        if (Tags.MathML[tag] !== 0) {
            if (tag.indexOf('m') === 0) {
                Tags.MathML[tag] = 1;
                return 'mathml';
            }
        }

        Tags.MathML[tag] = 0;

        return null;
    }

})();
(function () {
    if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
        return;
    }

    self.Prism.fileHighlight = function() {

        var Extensions = {
            'js': 'javascript',
            'py': 'python',
            'rb': 'ruby',
            'ps1': 'powershell',
            'psm1': 'powershell',
            'sh': 'bash',
            'bat': 'batch',
            'h': 'c',
            'tex': 'latex'
        };

        if(Array.prototype.forEach) { // Check to prevent error in IE8
            Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function (pre) {
                var src = pre.getAttribute('data-src');

                var language, parent = pre;
                var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
                while (parent && !lang.test(parent.className)) {
                    parent = parent.parentNode;
                }

                if (parent) {
                    language = (pre.className.match(lang) || [, ''])[1];
                }

                if (!language) {
                    var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
                    language = Extensions[extension] || extension;
                }

                var code = document.createElement('code');
                code.className = 'language-' + language;

                pre.textContent = '';

                code.textContent = 'Loading…';

                pre.appendChild(code);

                var xhr = new XMLHttpRequest();

                xhr.open('GET', src, true);

                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4) {

                        if (xhr.status < 400 && xhr.responseText) {
                            code.textContent = xhr.responseText;

                            Prism.highlightElement(code);
                        }
                        else if (xhr.status >= 400) {
                            code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
                        }
                        else {
                            code.textContent = '✖ Error: File does not exist or is empty';
                        }
                    }
                };

                xhr.send(null);
            });
        }

    };

    document.addEventListener('DOMContentLoaded', self.Prism.fileHighlight);

})();

(function() {

    if (typeof self === 'undefined' || !self.Prism || !self.document || !Function.prototype.bind) {
        return;
    }

    /**
     * Returns the absolute X, Y offsets for an element
     * @param {HTMLElement} element
     * @returns {{top: number, right: number, bottom: number, left: number}}
     */
    var getOffset = function (element) {
        var left = 0, top = 0, el = element;

        if (el.parentNode) {
            do {
                left += el.offsetLeft;
                top += el.offsetTop;
            } while ((el = el.offsetParent) && el.nodeType < 9);

            el = element;

            do {
                left -= el.scrollLeft;
                top -= el.scrollTop;
            } while ((el = el.parentNode) && !/body/i.test(el.nodeName));
        }

        return {
            top: top,
            right: innerWidth - left - element.offsetWidth,
            bottom: innerHeight - top - element.offsetHeight,
            left: left
        };
    };

    var tokenRegexp = /(?:^|\s)token(?=$|\s)/;
    var activeRegexp = /(?:^|\s)active(?=$|\s)/g;
    var flippedRegexp = /(?:^|\s)flipped(?=$|\s)/g;

    /**
     * Previewer constructor
     * @param {string} type Unique previewer type
     * @param {function} updater Function that will be called on mouseover.
     * @param {string[]|string=} supportedLanguages Aliases of the languages this previewer must be enabled for. Defaults to "*", all languages.
     * @constructor
     */
    var Previewer = function (type, updater, supportedLanguages, initializer) {
        this._elt = null;
        this._type = type;
        this._clsRegexp = RegExp('(?:^|\\s)' + type + '(?=$|\\s)');
        this._token = null;
        this.updater = updater;
        this._mouseout = this.mouseout.bind(this);
        this.initializer = initializer;

        var self = this;

        if (!supportedLanguages) {
            supportedLanguages = ['*'];
        }
        if (Prism.util.type(supportedLanguages) !== 'Array') {
            supportedLanguages = [supportedLanguages];
        }
        supportedLanguages.forEach(function (lang) {
            if (typeof lang !== 'string') {
                lang = lang.lang;
            }
            if (!Previewer.byLanguages[lang]) {
                Previewer.byLanguages[lang] = [];
            }
            if (Previewer.byLanguages[lang].indexOf(self) < 0) {
                Previewer.byLanguages[lang].push(self);
            }
        });
        Previewer.byType[type] = this;
    };

    /**
     * Creates the HTML element for the previewer.
     */
    Previewer.prototype.init = function () {
        if (this._elt) {
            return;
        }
        this._elt = document.createElement('div');
        this._elt.className = 'prism-previewer prism-previewer-' + this._type;
        document.body.appendChild(this._elt);
        if(this.initializer) {
            this.initializer();
        }
    };

    /**
     * Checks the class name of each hovered element
     * @param token
     */
    Previewer.prototype.check = function (token) {
        do {
            if (tokenRegexp.test(token.className) && this._clsRegexp.test(token.className)) {
                break;
            }
        } while(token = token.parentNode);

        if (token && token !== this._token) {
            this._token = token;
            this.show();
        }
    };

    /**
     * Called on mouseout
     */
    Previewer.prototype.mouseout = function() {
        this._token.removeEventListener('mouseout', this._mouseout, false);
        this._token = null;
        this.hide();
    };

    /**
     * Shows the previewer positioned properly for the current token.
     */
    Previewer.prototype.show = function () {
        if (!this._elt) {
            this.init();
        }
        if (!this._token) {
            return;
        }

        if (this.updater.call(this._elt, this._token.textContent)) {
            this._token.addEventListener('mouseout', this._mouseout, false);

            var offset = getOffset(this._token);
            this._elt.className += ' active';

            if (offset.top - this._elt.offsetHeight > 0) {
                this._elt.className = this._elt.className.replace(flippedRegexp, '');
                this._elt.style.top = offset.top + 'px';
                this._elt.style.bottom = '';
            } else {
                this._elt.className +=  ' flipped';
                this._elt.style.bottom = offset.bottom + 'px';
                this._elt.style.top = '';
            }

            this._elt.style.left = offset.left + Math.min(200, this._token.offsetWidth / 2) + 'px';
        } else {
            this.hide();
        }
    };

    /**
     * Hides the previewer.
     */
    Previewer.prototype.hide = function () {
        this._elt.className = this._elt.className.replace(activeRegexp, '');
    };

    /**
     * Map of all registered previewers by language
     * @type {{}}
     */
    Previewer.byLanguages = {};

    /**
     * Map of all registered previewers by type
     * @type {{}}
     */
    Previewer.byType = {};

    /**
     * Initializes the mouseover event on the code block.
     * @param {HTMLElement} elt The code block (env.element)
     * @param {string} lang The language (env.language)
     */
    Previewer.initEvents = function (elt, lang) {
        var previewers = [];
        if (Previewer.byLanguages[lang]) {
            previewers = previewers.concat(Previewer.byLanguages[lang]);
        }
        if (Previewer.byLanguages['*']) {
            previewers = previewers.concat(Previewer.byLanguages['*']);
        }
        elt.addEventListener('mouseover', function (e) {
            var target = e.target;
            previewers.forEach(function (previewer) {
                previewer.check(target);
            });
        }, false);
    };
    Prism.plugins.Previewer = Previewer;

    // Initialize the previewers only when needed
    Prism.hooks.add('after-highlight', function (env) {
        if(Previewer.byLanguages['*'] || Previewer.byLanguages[env.language]) {
            Previewer.initEvents(env.element, env.language);
        }
    });

}());
(function() {

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var languages = {
        'css': true,
        'less': true,
        'markup': {
            lang: 'markup',
            before: 'punctuation',
            inside: 'inside',
            root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
        },
        'sass': [
            {
                lang: 'sass',
                before: 'punctuation',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['variable-line']
            },
            {
                lang: 'sass',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['property-line']
            }
        ],
        'scss': true,
        'stylus': [
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
            },
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
            }
        ]
    };

    Prism.hooks.add('before-highlight', function (env) {
        if (env.language && languages[env.language] && !languages[env.language].initialized) {
            var lang = languages[env.language];
            if (Prism.util.type(lang) !== 'Array') {
                lang = [lang];
            }
            lang.forEach(function(lang) {
                var before, inside, root, skip;
                if (lang === true) {
                    before = 'important';
                    inside = env.language;
                    lang = env.language;
                } else {
                    before = lang.before || 'important';
                    inside = lang.inside || lang.lang;
                    root = lang.root || Prism.languages;
                    skip = lang.skip;
                    lang = env.language;
                }

                if (!skip && Prism.languages[lang]) {
                    Prism.languages.insertBefore(inside, before, {
                        'color': /\B#(?:[0-9a-f]{3}){1,2}\b|\b(?:rgb|hsl)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:rgb|hsl)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B|\b(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGray|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGray|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGray|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gray|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGray|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGray|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGray|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)\b/i
                    }, root);
                    env.grammar = Prism.languages[lang];

                    languages[env.language] = {initialized: true};
                }
            });
        }
    });

    if (Prism.plugins.Previewer) {
        new Prism.plugins.Previewer('color', function(value) {
            this.style.backgroundColor = '';
            this.style.backgroundColor = value;
            return !!this.style.backgroundColor;
        });
    }

}());
(function() {

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var languages = {
        'css': true,
        'less': true,
        'sass': [
            {
                lang: 'sass',
                before: 'punctuation',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['variable-line']
            },
            {
                lang: 'sass',
                before: 'punctuation',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['property-line']
            }
        ],
        'scss': true,
        'stylus': [
            {
                lang: 'stylus',
                before: 'func',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
            },
            {
                lang: 'stylus',
                before: 'func',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
            }
        ]
    };

    Prism.hooks.add('before-highlight', function (env) {
        if (env.language && languages[env.language] && !languages[env.language].initialized) {
            var lang = languages[env.language];
            if (Prism.util.type(lang) !== 'Array') {
                lang = [lang];
            }
            lang.forEach(function(lang) {
                var before, inside, root, skip;
                if (lang === true) {
                    // Insert before color previewer if it exists
                    before = Prism.plugins.Previewer && Prism.plugins.Previewer.byType['color'] ? 'color' : 'important';
                    inside = env.language;
                    lang = env.language;
                } else {
                    before = lang.before || 'important';
                    inside = lang.inside || lang.lang;
                    root = lang.root || Prism.languages;
                    skip = lang.skip;
                    lang = env.language;
                }

                if (!skip && Prism.languages[lang]) {
                    Prism.languages.insertBefore(inside, before, {
                        'gradient': {
                            pattern: /(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\((?:(?:rgb|hsl)a?\(.+?\)|[^\)])+\)/gi,
                            inside: {
                                'function': /[\w-]+(?=\()/,
                                'punctuation': /[(),]/
                            }
                        }
                    }, root);
                    env.grammar = Prism.languages[lang];

                    languages[env.language] = {initialized: true};
                }
            });
        }
    });

    // Stores already processed gradients so that we don't
    // make the conversion every time the previewer is shown
    var cache = {};

    /**
     * Returns a W3C-valid linear gradient
     * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
     * @param {string} func Gradient function name ("linear-gradient")
     * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
     */
    var convertToW3CLinearGradient = function(prefix, func, values) {
        // Default value for angle
        var angle = '180deg';

        if (/^(?:-?\d*\.?\d+(?:deg|rad)|to\b|top|right|bottom|left)/.test(values[0])) {
            angle = values.shift();
            if (angle.indexOf('to ') < 0) {
                // Angle uses old keywords
                // W3C syntax uses "to" + opposite keywords
                if (angle.indexOf('top') >= 0) {
                    if (angle.indexOf('left') >= 0) {
                        angle = 'to bottom right';
                    } else if (angle.indexOf('right') >= 0) {
                        angle = 'to bottom left';
                    } else {
                        angle = 'to bottom';
                    }
                } else if (angle.indexOf('bottom') >= 0) {
                    if (angle.indexOf('left') >= 0) {
                        angle = 'to top right';
                    } else if (angle.indexOf('right') >= 0) {
                        angle = 'to top left';
                    } else {
                        angle = 'to top';
                    }
                } else if (angle.indexOf('left') >= 0) {
                    angle = 'to right';
                } else if (angle.indexOf('right') >= 0) {
                    angle = 'to left';
                } else if (prefix) {
                    // Angle is shifted by 90deg in prefixed gradients
                    if (angle.indexOf('deg') >= 0) {
                        angle = (90 - parseFloat(angle)) + 'deg';
                    } else if (angle.indexOf('rad') >= 0) {
                        angle = (Math.PI / 2 - parseFloat(angle)) + 'rad';
                    }
                }
            }
        }

        return func + '(' + angle + ',' + values.join(',') + ')';
    };

    /**
     * Returns a W3C-valid radial gradient
     * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
     * @param {string} func Gradient function name ("linear-gradient")
     * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
     */
    var convertToW3CRadialGradient = function(prefix, func, values) {
        if (values[0].indexOf('at') < 0) {
            // Looks like old syntax

            // Default values
            var position = 'center';
            var shape = 'ellipse';
            var size = 'farthest-corner';

            if (/\bcenter|top|right|bottom|left\b|^\d+/.test(values[0])) {
                // Found a position
                // Remove angle value, if any
                position = values.shift().replace(/\s*-?\d+(?:rad|deg)\s*/, '');
            }
            if (/\bcircle|ellipse|closest|farthest|contain|cover\b/.test(values[0])) {
                // Found a shape and/or size
                var shapeSizeParts = values.shift().split(/\s+/);
                if (shapeSizeParts[0] && (shapeSizeParts[0] === 'circle' || shapeSizeParts[0] === 'ellipse')) {
                    shape = shapeSizeParts.shift();
                }
                if (shapeSizeParts[0]) {
                    size = shapeSizeParts.shift();
                }

                // Old keywords are converted to their synonyms
                if (size === 'cover') {
                    size = 'farthest-corner';
                } else if (size === 'contain') {
                    size = 'clothest-side';
                }
            }

            return func + '(' + shape + ' ' + size + ' at ' + position + ',' + values.join(',') + ')';
        }
        return func + '(' + values.join(',') + ')';
    };

    /**
     * Converts a gradient to a W3C-valid one
     * Does not support old webkit syntax (-webkit-gradient(linear...) and -webkit-gradient(radial...))
     * @param {string} gradient The CSS gradient
     */
    var convertToW3CGradient = function(gradient) {
        if (cache[gradient]) {
            return cache[gradient];
        }
        var parts = gradient.match(/^(\b|\B-[a-z]{1,10}-)((?:repeating-)?(?:linear|radial)-gradient)/);
        // "", "-moz-", etc.
        var prefix = parts && parts[1];
        // "linear-gradient", "radial-gradient", etc.
        var func = parts && parts[2];

        var values = gradient.replace(/^(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\(|\)$/g, '').split(/\s*,\s*/);

        if (func.indexOf('linear') >= 0) {
            return cache[gradient] = convertToW3CLinearGradient(prefix, func, values);
        } else if (func.indexOf('radial') >= 0) {
            return cache[gradient] = convertToW3CRadialGradient(prefix, func, values);
        }
        return cache[gradient] = func + '(' + values.join(',') + ')';
    };



    if (Prism.plugins.Previewer) {
        new Prism.plugins.Previewer('gradient', function(value) {
            this.firstChild.style.backgroundImage = '';
            this.firstChild.style.backgroundImage = convertToW3CGradient(value);
            return !!this.firstChild.style.backgroundImage;
        }, '*', function () {
            this._elt.innerHTML = '<div></div>';
        });
    }

}());
(function() {

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var languages = {
        'css': true,
        'less': true,
        'sass': [
            {
                lang: 'sass',
                inside: 'inside',
                before: 'punctuation',
                root: Prism.languages.sass && Prism.languages.sass['variable-line']
            },
            {
                lang: 'sass',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['property-line']
            }
        ],
        'scss': true,
        'stylus': [
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
            },
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
            }
        ]
    };

    Prism.hooks.add('before-highlight', function (env) {
        if (env.language && languages[env.language] && !languages[env.language].initialized) {
            var lang = languages[env.language];
            if (Prism.util.type(lang) !== 'Array') {
                lang = [lang];
            }
            lang.forEach(function(lang) {
                var before, inside, root, skip;
                if (lang === true) {
                    before = 'important';
                    inside = env.language;
                    lang = env.language;
                } else {
                    before = lang.before || 'important';
                    inside = lang.inside || lang.lang;
                    root = lang.root || Prism.languages;
                    skip = lang.skip;
                    lang = env.language;
                }

                if (!skip && Prism.languages[lang]) {
                    Prism.languages.insertBefore(inside, before, {
                        'easing': /\bcubic-bezier\((?:-?\d*\.?\d+,\s*){3}-?\d*\.?\d+\)\B|\b(?:linear|ease(?:-in)?(?:-out)?)(?=\s|[;}]|$)/i
                    }, root);
                    env.grammar = Prism.languages[lang];

                    languages[env.language] = {initialized: true};
                }
            });
        }
    });

    if (Prism.plugins.Previewer) {
        new Prism.plugins.Previewer('easing', function (value) {

            value = {
                    'linear': '0,0,1,1',
                    'ease': '.25,.1,.25,1',
                    'ease-in': '.42,0,1,1',
                    'ease-out': '0,0,.58,1',
                    'ease-in-out':'.42,0,.58,1'
                }[value] || value;

            var p = value.match(/-?\d*\.?\d+/g);

            if(p.length === 4) {
                p = p.map(function(p, i) { return (i % 2? 1 - p : p) * 100; });

                this.querySelector('path').setAttribute('d', 'M0,100 C' + p[0] + ',' + p[1] + ', ' + p[2] + ',' + p[3] + ', 100,0');

                var lines = this.querySelectorAll('line');
                lines[0].setAttribute('x2', p[0]);
                lines[0].setAttribute('y2', p[1]);
                lines[1].setAttribute('x2', p[2]);
                lines[1].setAttribute('y2', p[3]);

                return true;
            }

            return false;
        }, '*', function () {
            this._elt.innerHTML = '<svg viewBox="-20 -20 140 140" width="100" height="100">' +
                '<defs>' +
                '<marker id="prism-previewer-easing-marker" viewBox="0 0 4 4" refX="2" refY="2" markerUnits="strokeWidth">' +
                '<circle cx="2" cy="2" r="1.5" />' +
                '</marker>' +
                '</defs>' +
                '<path d="M0,100 C20,50, 40,30, 100,0" />' +
                '<line x1="0" y1="100" x2="20" y2="50" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
                '<line x1="100" y1="0" x2="40" y2="30" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
                '</svg>';
        });
    }

}());
(function() {

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var languages = {
        'css': true,
        'less': true,
        'markup': {
            lang: 'markup',
            before: 'punctuation',
            inside: 'inside',
            root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
        },
        'sass': [
            {
                lang: 'sass',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['property-line']
            },
            {
                lang: 'sass',
                before: 'operator',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['variable-line']
            }
        ],
        'scss': true,
        'stylus': [
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
            },
            {
                lang: 'stylus',
                before: 'hexcode',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
            }
        ]
    };

    Prism.hooks.add('before-highlight', function (env) {
        if (env.language && languages[env.language] && !languages[env.language].initialized) {
            var lang = languages[env.language];
            if (Prism.util.type(lang) !== 'Array') {
                lang = [lang];
            }
            lang.forEach(function(lang) {
                var before, inside, root, skip;
                if (lang === true) {
                    before = 'important';
                    inside = env.language;
                    lang = env.language;
                } else {
                    before = lang.before || 'important';
                    inside = lang.inside || lang.lang;
                    root = lang.root || Prism.languages;
                    skip = lang.skip;
                    lang = env.language;
                }

                if (!skip && Prism.languages[lang]) {
                    Prism.languages.insertBefore(inside, before, {
                        'time': /(?:\b|\B-|(?=\B\.))\d*\.?\d+m?s\b/i
                    }, root);
                    env.grammar = Prism.languages[lang];

                    languages[env.language] = {initialized: true};
                }
            });
        }
    });

    if (Prism.plugins.Previewer) {
        new Prism.plugins.Previewer('time', function(value) {
            var num = parseFloat(value);
            var unit = value.match(/[a-z]+$/i);
            if (!num || !unit) {
                return false;
            }
            unit = unit[0];
            this.querySelector('circle').style.animationDuration = 2 * num + unit;
            return true;
        }, '*', function () {
            this._elt.innerHTML = '<svg viewBox="0 0 64 64">' +
                '<circle r="16" cy="32" cx="32"></circle>' +
                '</svg>';
        });
    }

}());
(function() {

    if (
        typeof self !== 'undefined' && !self.Prism ||
        typeof global !== 'undefined' && !global.Prism
    ) {
        return;
    }

    var languages = {
        'css': true,
        'less': true,
        'markup': {
            lang: 'markup',
            before: 'punctuation',
            inside: 'inside',
            root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
        },
        'sass': [
            {
                lang: 'sass',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['property-line']
            },
            {
                lang: 'sass',
                before: 'operator',
                inside: 'inside',
                root: Prism.languages.sass && Prism.languages.sass['variable-line']
            }
        ],
        'scss': true,
        'stylus': [
            {
                lang: 'stylus',
                before: 'func',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
            },
            {
                lang: 'stylus',
                before: 'func',
                inside: 'rest',
                root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
            }
        ]
    };

    Prism.hooks.add('before-highlight', function (env) {
        if (env.language && languages[env.language] && !languages[env.language].initialized) {
            var lang = languages[env.language];
            if (Prism.util.type(lang) !== 'Array') {
                lang = [lang];
            }
            lang.forEach(function(lang) {
                var before, inside, root, skip;
                if (lang === true) {
                    before = 'important';
                    inside = env.language;
                    lang = env.language;
                } else {
                    before = lang.before || 'important';
                    inside = lang.inside || lang.lang;
                    root = lang.root || Prism.languages;
                    skip = lang.skip;
                    lang = env.language;
                }

                if (!skip && Prism.languages[lang]) {
                    Prism.languages.insertBefore(inside, before, {
                        'angle': /(?:\b|\B-|(?=\B\.))\d*\.?\d+(?:deg|g?rad|turn)\b/i
                    }, root);
                    env.grammar = Prism.languages[lang];

                    languages[env.language] = {initialized: true};
                }
            });
        }
    });

    if (Prism.plugins.Previewer) {
        new Prism.plugins.Previewer('angle', function(value) {
            var num = parseFloat(value);
            var unit = value.match(/[a-z]+$/i);
            var max, percentage;
            if (!num || !unit) {
                return false;
            }
            unit = unit[0];

            switch(unit) {
                case 'deg':
                    max = 360;
                    break;
                case 'grad':
                    max = 400;
                    break;
                case 'rad':
                    max = 2 * Math.PI;
                    break;
                case 'turn':
                    max = 1;
            }

            percentage = 100 * num/max;
            percentage %= 100;

            this[(num < 0? 'set' : 'remove') + 'Attribute']('data-negative', '');
            this.querySelector('circle').style.strokeDasharray = Math.abs(percentage) + ',500';
            return true;
        }, '*', function () {
            this._elt.innerHTML = '<svg viewBox="0 0 64 64">' +
                '<circle r="16" cy="32" cx="32"></circle>' +
                '</svg>';
        });
    }

}());
