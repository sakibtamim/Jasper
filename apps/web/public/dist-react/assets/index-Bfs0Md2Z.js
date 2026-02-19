function jf(o, c) {
    for (var s = 0; s < c.length; s++) {
        const p = c[s];
        if (typeof p != 'string' && !Array.isArray(p)) {
            for (const h in p)
                if (h !== 'default' && !(h in o)) {
                    const w = Object.getOwnPropertyDescriptor(p, h);
                    w &&
                        Object.defineProperty(
                            o,
                            h,
                            w.get ? w : { enumerable: !0, get: () => p[h] },
                        );
                }
        }
    }
    return Object.freeze(Object.defineProperty(o, Symbol.toStringTag, { value: 'Module' }));
}
(function () {
    const c = document.createElement('link').relList;
    if (c && c.supports && c.supports('modulepreload')) return;
    for (const h of document.querySelectorAll('link[rel="modulepreload"]')) p(h);
    new MutationObserver((h) => {
        for (const w of h)
            if (w.type === 'childList')
                for (const x of w.addedNodes)
                    x.tagName === 'LINK' && x.rel === 'modulepreload' && p(x);
    }).observe(document, { childList: !0, subtree: !0 });
    function s(h) {
        const w = {};
        return (
            h.integrity && (w.integrity = h.integrity),
            h.referrerPolicy && (w.referrerPolicy = h.referrerPolicy),
            h.crossOrigin === 'use-credentials'
                ? (w.credentials = 'include')
                : h.crossOrigin === 'anonymous'
                  ? (w.credentials = 'omit')
                  : (w.credentials = 'same-origin'),
            w
        );
    }
    function p(h) {
        if (h.ep) return;
        h.ep = !0;
        const w = s(h);
        fetch(h.href, w);
    }
})();
function pc(o) {
    return o && o.__esModule && Object.prototype.hasOwnProperty.call(o, 'default') ? o.default : o;
}
var $o = { exports: {} },
    _r = {},
    Ao = { exports: {} },
    J = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Gu;
function Ef() {
    if (Gu) return J;
    Gu = 1;
    var o = Symbol.for('react.element'),
        c = Symbol.for('react.portal'),
        s = Symbol.for('react.fragment'),
        p = Symbol.for('react.strict_mode'),
        h = Symbol.for('react.profiler'),
        w = Symbol.for('react.provider'),
        x = Symbol.for('react.context'),
        j = Symbol.for('react.forward_ref'),
        N = Symbol.for('react.suspense'),
        T = Symbol.for('react.memo'),
        I = Symbol.for('react.lazy'),
        S = Symbol.iterator;
    function O(g) {
        return g === null || typeof g != 'object'
            ? null
            : ((g = (S && g[S]) || g['@@iterator']), typeof g == 'function' ? g : null);
    }
    var z = {
            isMounted: function () {
                return !1;
            },
            enqueueForceUpdate: function () {},
            enqueueReplaceState: function () {},
            enqueueSetState: function () {},
        },
        K = Object.assign,
        $ = {};
    function D(g, C, G) {
        ((this.props = g), (this.context = C), (this.refs = $), (this.updater = G || z));
    }
    ((D.prototype.isReactComponent = {}),
        (D.prototype.setState = function (g, C) {
            if (typeof g != 'object' && typeof g != 'function' && g != null)
                throw Error(
                    'setState(...): takes an object of state variables to update or a function which returns an object of state variables.',
                );
            this.updater.enqueueSetState(this, g, C, 'setState');
        }),
        (D.prototype.forceUpdate = function (g) {
            this.updater.enqueueForceUpdate(this, g, 'forceUpdate');
        }));
    function ie() {}
    ie.prototype = D.prototype;
    function oe(g, C, G) {
        ((this.props = g), (this.context = C), (this.refs = $), (this.updater = G || z));
    }
    var ne = (oe.prototype = new ie());
    ((ne.constructor = oe), K(ne, D.prototype), (ne.isPureReactComponent = !0));
    var ae = Array.isArray,
        je = Object.prototype.hasOwnProperty,
        Oe = { current: null },
        Fe = { key: !0, ref: !0, __self: !0, __source: !0 };
    function Ze(g, C, G) {
        var Z,
            b = {},
            ee = null,
            se = null;
        if (C != null)
            for (Z in (C.ref !== void 0 && (se = C.ref), C.key !== void 0 && (ee = '' + C.key), C))
                je.call(C, Z) && !Fe.hasOwnProperty(Z) && (b[Z] = C[Z]);
        var re = arguments.length - 2;
        if (re === 1) b.children = G;
        else if (1 < re) {
            for (var fe = Array(re), Ke = 0; Ke < re; Ke++) fe[Ke] = arguments[Ke + 2];
            b.children = fe;
        }
        if (g && g.defaultProps)
            for (Z in ((re = g.defaultProps), re)) b[Z] === void 0 && (b[Z] = re[Z]);
        return { $$typeof: o, type: g, key: ee, ref: se, props: b, _owner: Oe.current };
    }
    function Lt(g, C) {
        return { $$typeof: o, type: g.type, key: C, ref: g.ref, props: g.props, _owner: g._owner };
    }
    function xt(g) {
        return typeof g == 'object' && g !== null && g.$$typeof === o;
    }
    function bt(g) {
        var C = { '=': '=0', ':': '=2' };
        return (
            '$' +
            g.replace(/[=:]/g, function (G) {
                return C[G];
            })
        );
    }
    var ft = /\/+/g;
    function Qe(g, C) {
        return typeof g == 'object' && g !== null && g.key != null
            ? bt('' + g.key)
            : C.toString(36);
    }
    function lt(g, C, G, Z, b) {
        var ee = typeof g;
        (ee === 'undefined' || ee === 'boolean') && (g = null);
        var se = !1;
        if (g === null) se = !0;
        else
            switch (ee) {
                case 'string':
                case 'number':
                    se = !0;
                    break;
                case 'object':
                    switch (g.$$typeof) {
                        case o:
                        case c:
                            se = !0;
                    }
            }
        if (se)
            return (
                (se = g),
                (b = b(se)),
                (g = Z === '' ? '.' + Qe(se, 0) : Z),
                ae(b)
                    ? ((G = ''),
                      g != null && (G = g.replace(ft, '$&/') + '/'),
                      lt(b, C, G, '', function (Ke) {
                          return Ke;
                      }))
                    : b != null &&
                      (xt(b) &&
                          (b = Lt(
                              b,
                              G +
                                  (!b.key || (se && se.key === b.key)
                                      ? ''
                                      : ('' + b.key).replace(ft, '$&/') + '/') +
                                  g,
                          )),
                      C.push(b)),
                1
            );
        if (((se = 0), (Z = Z === '' ? '.' : Z + ':'), ae(g)))
            for (var re = 0; re < g.length; re++) {
                ee = g[re];
                var fe = Z + Qe(ee, re);
                se += lt(ee, C, G, fe, b);
            }
        else if (((fe = O(g)), typeof fe == 'function'))
            for (g = fe.call(g), re = 0; !(ee = g.next()).done; )
                ((ee = ee.value), (fe = Z + Qe(ee, re++)), (se += lt(ee, C, G, fe, b)));
        else if (ee === 'object')
            throw (
                (C = String(g)),
                Error(
                    'Objects are not valid as a React child (found: ' +
                        (C === '[object Object]'
                            ? 'object with keys {' + Object.keys(g).join(', ') + '}'
                            : C) +
                        '). If you meant to render a collection of children, use an array instead.',
                )
            );
        return se;
    }
    function pt(g, C, G) {
        if (g == null) return g;
        var Z = [],
            b = 0;
        return (
            lt(g, Z, '', '', function (ee) {
                return C.call(G, ee, b++);
            }),
            Z
        );
    }
    function Ue(g) {
        if (g._status === -1) {
            var C = g._result;
            ((C = C()),
                C.then(
                    function (G) {
                        (g._status === 0 || g._status === -1) && ((g._status = 1), (g._result = G));
                    },
                    function (G) {
                        (g._status === 0 || g._status === -1) && ((g._status = 2), (g._result = G));
                    },
                ),
                g._status === -1 && ((g._status = 0), (g._result = C)));
        }
        if (g._status === 1) return g._result.default;
        throw g._result;
    }
    var ge = { current: null },
        M = { transition: null },
        Y = { ReactCurrentDispatcher: ge, ReactCurrentBatchConfig: M, ReactCurrentOwner: Oe };
    function B() {
        throw Error('act(...) is not supported in production builds of React.');
    }
    return (
        (J.Children = {
            map: pt,
            forEach: function (g, C, G) {
                pt(
                    g,
                    function () {
                        C.apply(this, arguments);
                    },
                    G,
                );
            },
            count: function (g) {
                var C = 0;
                return (
                    pt(g, function () {
                        C++;
                    }),
                    C
                );
            },
            toArray: function (g) {
                return (
                    pt(g, function (C) {
                        return C;
                    }) || []
                );
            },
            only: function (g) {
                if (!xt(g))
                    throw Error(
                        'React.Children.only expected to receive a single React element child.',
                    );
                return g;
            },
        }),
        (J.Component = D),
        (J.Fragment = s),
        (J.Profiler = h),
        (J.PureComponent = oe),
        (J.StrictMode = p),
        (J.Suspense = N),
        (J.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Y),
        (J.act = B),
        (J.cloneElement = function (g, C, G) {
            if (g == null)
                throw Error(
                    'React.cloneElement(...): The argument must be a React element, but you passed ' +
                        g +
                        '.',
                );
            var Z = K({}, g.props),
                b = g.key,
                ee = g.ref,
                se = g._owner;
            if (C != null) {
                if (
                    (C.ref !== void 0 && ((ee = C.ref), (se = Oe.current)),
                    C.key !== void 0 && (b = '' + C.key),
                    g.type && g.type.defaultProps)
                )
                    var re = g.type.defaultProps;
                for (fe in C)
                    je.call(C, fe) &&
                        !Fe.hasOwnProperty(fe) &&
                        (Z[fe] = C[fe] === void 0 && re !== void 0 ? re[fe] : C[fe]);
            }
            var fe = arguments.length - 2;
            if (fe === 1) Z.children = G;
            else if (1 < fe) {
                re = Array(fe);
                for (var Ke = 0; Ke < fe; Ke++) re[Ke] = arguments[Ke + 2];
                Z.children = re;
            }
            return { $$typeof: o, type: g.type, key: b, ref: ee, props: Z, _owner: se };
        }),
        (J.createContext = function (g) {
            return (
                (g = {
                    $$typeof: x,
                    _currentValue: g,
                    _currentValue2: g,
                    _threadCount: 0,
                    Provider: null,
                    Consumer: null,
                    _defaultValue: null,
                    _globalName: null,
                }),
                (g.Provider = { $$typeof: w, _context: g }),
                (g.Consumer = g)
            );
        }),
        (J.createElement = Ze),
        (J.createFactory = function (g) {
            var C = Ze.bind(null, g);
            return ((C.type = g), C);
        }),
        (J.createRef = function () {
            return { current: null };
        }),
        (J.forwardRef = function (g) {
            return { $$typeof: j, render: g };
        }),
        (J.isValidElement = xt),
        (J.lazy = function (g) {
            return { $$typeof: I, _payload: { _status: -1, _result: g }, _init: Ue };
        }),
        (J.memo = function (g, C) {
            return { $$typeof: T, type: g, compare: C === void 0 ? null : C };
        }),
        (J.startTransition = function (g) {
            var C = M.transition;
            M.transition = {};
            try {
                g();
            } finally {
                M.transition = C;
            }
        }),
        (J.unstable_act = B),
        (J.useCallback = function (g, C) {
            return ge.current.useCallback(g, C);
        }),
        (J.useContext = function (g) {
            return ge.current.useContext(g);
        }),
        (J.useDebugValue = function () {}),
        (J.useDeferredValue = function (g) {
            return ge.current.useDeferredValue(g);
        }),
        (J.useEffect = function (g, C) {
            return ge.current.useEffect(g, C);
        }),
        (J.useId = function () {
            return ge.current.useId();
        }),
        (J.useImperativeHandle = function (g, C, G) {
            return ge.current.useImperativeHandle(g, C, G);
        }),
        (J.useInsertionEffect = function (g, C) {
            return ge.current.useInsertionEffect(g, C);
        }),
        (J.useLayoutEffect = function (g, C) {
            return ge.current.useLayoutEffect(g, C);
        }),
        (J.useMemo = function (g, C) {
            return ge.current.useMemo(g, C);
        }),
        (J.useReducer = function (g, C, G) {
            return ge.current.useReducer(g, C, G);
        }),
        (J.useRef = function (g) {
            return ge.current.useRef(g);
        }),
        (J.useState = function (g) {
            return ge.current.useState(g);
        }),
        (J.useSyncExternalStore = function (g, C, G) {
            return ge.current.useSyncExternalStore(g, C, G);
        }),
        (J.useTransition = function () {
            return ge.current.useTransition();
        }),
        (J.version = '18.3.1'),
        J
    );
}
var Ju;
function Go() {
    return (Ju || ((Ju = 1), (Ao.exports = Ef())), Ao.exports);
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Zu;
function Cf() {
    if (Zu) return _r;
    Zu = 1;
    var o = Go(),
        c = Symbol.for('react.element'),
        s = Symbol.for('react.fragment'),
        p = Object.prototype.hasOwnProperty,
        h = o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
        w = { key: !0, ref: !0, __self: !0, __source: !0 };
    function x(j, N, T) {
        var I,
            S = {},
            O = null,
            z = null;
        (T !== void 0 && (O = '' + T),
            N.key !== void 0 && (O = '' + N.key),
            N.ref !== void 0 && (z = N.ref));
        for (I in N) p.call(N, I) && !w.hasOwnProperty(I) && (S[I] = N[I]);
        if (j && j.defaultProps)
            for (I in ((N = j.defaultProps), N)) S[I] === void 0 && (S[I] = N[I]);
        return { $$typeof: c, type: j, key: O, ref: z, props: S, _owner: h.current };
    }
    return ((_r.Fragment = s), (_r.jsx = x), (_r.jsxs = x), _r);
}
var qu;
function Pf() {
    return (qu || ((qu = 1), ($o.exports = Cf())), $o.exports);
}
var u = Pf(),
    L = Go();
const mc = pc(L),
    _f = jf({ __proto__: null, default: mc }, [L]);
var Wl = {},
    Wo = { exports: {} },
    He = {},
    Vo = { exports: {} },
    Ho = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var bu;
function Lf() {
    return (
        bu ||
            ((bu = 1),
            (function (o) {
                function c(M, Y) {
                    var B = M.length;
                    M.push(Y);
                    e: for (; 0 < B; ) {
                        var g = (B - 1) >>> 1,
                            C = M[g];
                        if (0 < h(C, Y)) ((M[g] = Y), (M[B] = C), (B = g));
                        else break e;
                    }
                }
                function s(M) {
                    return M.length === 0 ? null : M[0];
                }
                function p(M) {
                    if (M.length === 0) return null;
                    var Y = M[0],
                        B = M.pop();
                    if (B !== Y) {
                        M[0] = B;
                        e: for (var g = 0, C = M.length, G = C >>> 1; g < G; ) {
                            var Z = 2 * (g + 1) - 1,
                                b = M[Z],
                                ee = Z + 1,
                                se = M[ee];
                            if (0 > h(b, B))
                                ee < C && 0 > h(se, b)
                                    ? ((M[g] = se), (M[ee] = B), (g = ee))
                                    : ((M[g] = b), (M[Z] = B), (g = Z));
                            else if (ee < C && 0 > h(se, B)) ((M[g] = se), (M[ee] = B), (g = ee));
                            else break e;
                        }
                    }
                    return Y;
                }
                function h(M, Y) {
                    var B = M.sortIndex - Y.sortIndex;
                    return B !== 0 ? B : M.id - Y.id;
                }
                if (typeof performance == 'object' && typeof performance.now == 'function') {
                    var w = performance;
                    o.unstable_now = function () {
                        return w.now();
                    };
                } else {
                    var x = Date,
                        j = x.now();
                    o.unstable_now = function () {
                        return x.now() - j;
                    };
                }
                var N = [],
                    T = [],
                    I = 1,
                    S = null,
                    O = 3,
                    z = !1,
                    K = !1,
                    $ = !1,
                    D = typeof setTimeout == 'function' ? setTimeout : null,
                    ie = typeof clearTimeout == 'function' ? clearTimeout : null,
                    oe = typeof setImmediate < 'u' ? setImmediate : null;
                typeof navigator < 'u' &&
                    navigator.scheduling !== void 0 &&
                    navigator.scheduling.isInputPending !== void 0 &&
                    navigator.scheduling.isInputPending.bind(navigator.scheduling);
                function ne(M) {
                    for (var Y = s(T); Y !== null; ) {
                        if (Y.callback === null) p(T);
                        else if (Y.startTime <= M)
                            (p(T), (Y.sortIndex = Y.expirationTime), c(N, Y));
                        else break;
                        Y = s(T);
                    }
                }
                function ae(M) {
                    if ((($ = !1), ne(M), !K))
                        if (s(N) !== null) ((K = !0), Ue(je));
                        else {
                            var Y = s(T);
                            Y !== null && ge(ae, Y.startTime - M);
                        }
                }
                function je(M, Y) {
                    ((K = !1), $ && (($ = !1), ie(Ze), (Ze = -1)), (z = !0));
                    var B = O;
                    try {
                        for (
                            ne(Y), S = s(N);
                            S !== null && (!(S.expirationTime > Y) || (M && !bt()));
                        ) {
                            var g = S.callback;
                            if (typeof g == 'function') {
                                ((S.callback = null), (O = S.priorityLevel));
                                var C = g(S.expirationTime <= Y);
                                ((Y = o.unstable_now()),
                                    typeof C == 'function' ? (S.callback = C) : S === s(N) && p(N),
                                    ne(Y));
                            } else p(N);
                            S = s(N);
                        }
                        if (S !== null) var G = !0;
                        else {
                            var Z = s(T);
                            (Z !== null && ge(ae, Z.startTime - Y), (G = !1));
                        }
                        return G;
                    } finally {
                        ((S = null), (O = B), (z = !1));
                    }
                }
                var Oe = !1,
                    Fe = null,
                    Ze = -1,
                    Lt = 5,
                    xt = -1;
                function bt() {
                    return !(o.unstable_now() - xt < Lt);
                }
                function ft() {
                    if (Fe !== null) {
                        var M = o.unstable_now();
                        xt = M;
                        var Y = !0;
                        try {
                            Y = Fe(!0, M);
                        } finally {
                            Y ? Qe() : ((Oe = !1), (Fe = null));
                        }
                    } else Oe = !1;
                }
                var Qe;
                if (typeof oe == 'function')
                    Qe = function () {
                        oe(ft);
                    };
                else if (typeof MessageChannel < 'u') {
                    var lt = new MessageChannel(),
                        pt = lt.port2;
                    ((lt.port1.onmessage = ft),
                        (Qe = function () {
                            pt.postMessage(null);
                        }));
                } else
                    Qe = function () {
                        D(ft, 0);
                    };
                function Ue(M) {
                    ((Fe = M), Oe || ((Oe = !0), Qe()));
                }
                function ge(M, Y) {
                    Ze = D(function () {
                        M(o.unstable_now());
                    }, Y);
                }
                ((o.unstable_IdlePriority = 5),
                    (o.unstable_ImmediatePriority = 1),
                    (o.unstable_LowPriority = 4),
                    (o.unstable_NormalPriority = 3),
                    (o.unstable_Profiling = null),
                    (o.unstable_UserBlockingPriority = 2),
                    (o.unstable_cancelCallback = function (M) {
                        M.callback = null;
                    }),
                    (o.unstable_continueExecution = function () {
                        K || z || ((K = !0), Ue(je));
                    }),
                    (o.unstable_forceFrameRate = function (M) {
                        0 > M || 125 < M
                            ? console.error(
                                  'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
                              )
                            : (Lt = 0 < M ? Math.floor(1e3 / M) : 5);
                    }),
                    (o.unstable_getCurrentPriorityLevel = function () {
                        return O;
                    }),
                    (o.unstable_getFirstCallbackNode = function () {
                        return s(N);
                    }),
                    (o.unstable_next = function (M) {
                        switch (O) {
                            case 1:
                            case 2:
                            case 3:
                                var Y = 3;
                                break;
                            default:
                                Y = O;
                        }
                        var B = O;
                        O = Y;
                        try {
                            return M();
                        } finally {
                            O = B;
                        }
                    }),
                    (o.unstable_pauseExecution = function () {}),
                    (o.unstable_requestPaint = function () {}),
                    (o.unstable_runWithPriority = function (M, Y) {
                        switch (M) {
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                                break;
                            default:
                                M = 3;
                        }
                        var B = O;
                        O = M;
                        try {
                            return Y();
                        } finally {
                            O = B;
                        }
                    }),
                    (o.unstable_scheduleCallback = function (M, Y, B) {
                        var g = o.unstable_now();
                        switch (
                            (typeof B == 'object' && B !== null
                                ? ((B = B.delay), (B = typeof B == 'number' && 0 < B ? g + B : g))
                                : (B = g),
                            M)
                        ) {
                            case 1:
                                var C = -1;
                                break;
                            case 2:
                                C = 250;
                                break;
                            case 5:
                                C = 1073741823;
                                break;
                            case 4:
                                C = 1e4;
                                break;
                            default:
                                C = 5e3;
                        }
                        return (
                            (C = B + C),
                            (M = {
                                id: I++,
                                callback: Y,
                                priorityLevel: M,
                                startTime: B,
                                expirationTime: C,
                                sortIndex: -1,
                            }),
                            B > g
                                ? ((M.sortIndex = B),
                                  c(T, M),
                                  s(N) === null &&
                                      M === s(T) &&
                                      ($ ? (ie(Ze), (Ze = -1)) : ($ = !0), ge(ae, B - g)))
                                : ((M.sortIndex = C), c(N, M), K || z || ((K = !0), Ue(je))),
                            M
                        );
                    }),
                    (o.unstable_shouldYield = bt),
                    (o.unstable_wrapCallback = function (M) {
                        var Y = O;
                        return function () {
                            var B = O;
                            O = Y;
                            try {
                                return M.apply(this, arguments);
                            } finally {
                                O = B;
                            }
                        };
                    }));
            })(Ho)),
        Ho
    );
}
var ec;
function Rf() {
    return (ec || ((ec = 1), (Vo.exports = Lf())), Vo.exports);
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var tc;
function Tf() {
    if (tc) return He;
    tc = 1;
    var o = Go(),
        c = Rf();
    function s(e) {
        for (
            var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, n = 1;
            n < arguments.length;
            n++
        )
            t += '&args[]=' + encodeURIComponent(arguments[n]);
        return (
            'Minified React error #' +
            e +
            '; visit ' +
            t +
            ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
        );
    }
    var p = new Set(),
        h = {};
    function w(e, t) {
        (x(e, t), x(e + 'Capture', t));
    }
    function x(e, t) {
        for (h[e] = t, e = 0; e < t.length; e++) p.add(t[e]);
    }
    var j = !(
            typeof window > 'u' ||
            typeof window.document > 'u' ||
            typeof window.document.createElement > 'u'
        ),
        N = Object.prototype.hasOwnProperty,
        T =
            /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
        I = {},
        S = {};
    function O(e) {
        return N.call(S, e) ? !0 : N.call(I, e) ? !1 : T.test(e) ? (S[e] = !0) : ((I[e] = !0), !1);
    }
    function z(e, t, n, r) {
        if (n !== null && n.type === 0) return !1;
        switch (typeof t) {
            case 'function':
            case 'symbol':
                return !0;
            case 'boolean':
                return r
                    ? !1
                    : n !== null
                      ? !n.acceptsBooleans
                      : ((e = e.toLowerCase().slice(0, 5)), e !== 'data-' && e !== 'aria-');
            default:
                return !1;
        }
    }
    function K(e, t, n, r) {
        if (t === null || typeof t > 'u' || z(e, t, n, r)) return !0;
        if (r) return !1;
        if (n !== null)
            switch (n.type) {
                case 3:
                    return !t;
                case 4:
                    return t === !1;
                case 5:
                    return isNaN(t);
                case 6:
                    return isNaN(t) || 1 > t;
            }
        return !1;
    }
    function $(e, t, n, r, l, i, a) {
        ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
            (this.attributeName = r),
            (this.attributeNamespace = l),
            (this.mustUseProperty = n),
            (this.propertyName = e),
            (this.type = t),
            (this.sanitizeURL = i),
            (this.removeEmptyString = a));
    }
    var D = {};
    ('children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
        .split(' ')
        .forEach(function (e) {
            D[e] = new $(e, 0, !1, e, null, !1, !1);
        }),
        [
            ['acceptCharset', 'accept-charset'],
            ['className', 'class'],
            ['htmlFor', 'for'],
            ['httpEquiv', 'http-equiv'],
        ].forEach(function (e) {
            var t = e[0];
            D[t] = new $(t, 1, !1, e[1], null, !1, !1);
        }),
        ['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (e) {
            D[e] = new $(e, 2, !1, e.toLowerCase(), null, !1, !1);
        }),
        ['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(
            function (e) {
                D[e] = new $(e, 2, !1, e, null, !1, !1);
            },
        ),
        'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
            .split(' ')
            .forEach(function (e) {
                D[e] = new $(e, 3, !1, e.toLowerCase(), null, !1, !1);
            }),
        ['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
            D[e] = new $(e, 3, !0, e, null, !1, !1);
        }),
        ['capture', 'download'].forEach(function (e) {
            D[e] = new $(e, 4, !1, e, null, !1, !1);
        }),
        ['cols', 'rows', 'size', 'span'].forEach(function (e) {
            D[e] = new $(e, 6, !1, e, null, !1, !1);
        }),
        ['rowSpan', 'start'].forEach(function (e) {
            D[e] = new $(e, 5, !1, e.toLowerCase(), null, !1, !1);
        }));
    var ie = /[\-:]([a-z])/g;
    function oe(e) {
        return e[1].toUpperCase();
    }
    ('accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
        .split(' ')
        .forEach(function (e) {
            var t = e.replace(ie, oe);
            D[t] = new $(t, 1, !1, e, null, !1, !1);
        }),
        'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
            .split(' ')
            .forEach(function (e) {
                var t = e.replace(ie, oe);
                D[t] = new $(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1);
            }),
        ['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
            var t = e.replace(ie, oe);
            D[t] = new $(t, 1, !1, e, 'http://www.w3.org/XML/1998/namespace', !1, !1);
        }),
        ['tabIndex', 'crossOrigin'].forEach(function (e) {
            D[e] = new $(e, 1, !1, e.toLowerCase(), null, !1, !1);
        }),
        (D.xlinkHref = new $(
            'xlinkHref',
            1,
            !1,
            'xlink:href',
            'http://www.w3.org/1999/xlink',
            !0,
            !1,
        )),
        ['src', 'href', 'action', 'formAction'].forEach(function (e) {
            D[e] = new $(e, 1, !1, e.toLowerCase(), null, !0, !0);
        }));
    function ne(e, t, n, r) {
        var l = D.hasOwnProperty(t) ? D[t] : null;
        (l !== null
            ? l.type !== 0
            : r ||
              !(2 < t.length) ||
              (t[0] !== 'o' && t[0] !== 'O') ||
              (t[1] !== 'n' && t[1] !== 'N')) &&
            (K(t, n, l, r) && (n = null),
            r || l === null
                ? O(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, '' + n))
                : l.mustUseProperty
                  ? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : '') : n)
                  : ((t = l.attributeName),
                    (r = l.attributeNamespace),
                    n === null
                        ? e.removeAttribute(t)
                        : ((l = l.type),
                          (n = l === 3 || (l === 4 && n === !0) ? '' : '' + n),
                          r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
    }
    var ae = o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
        je = Symbol.for('react.element'),
        Oe = Symbol.for('react.portal'),
        Fe = Symbol.for('react.fragment'),
        Ze = Symbol.for('react.strict_mode'),
        Lt = Symbol.for('react.profiler'),
        xt = Symbol.for('react.provider'),
        bt = Symbol.for('react.context'),
        ft = Symbol.for('react.forward_ref'),
        Qe = Symbol.for('react.suspense'),
        lt = Symbol.for('react.suspense_list'),
        pt = Symbol.for('react.memo'),
        Ue = Symbol.for('react.lazy'),
        ge = Symbol.for('react.offscreen'),
        M = Symbol.iterator;
    function Y(e) {
        return e === null || typeof e != 'object'
            ? null
            : ((e = (M && e[M]) || e['@@iterator']), typeof e == 'function' ? e : null);
    }
    var B = Object.assign,
        g;
    function C(e) {
        if (g === void 0)
            try {
                throw Error();
            } catch (n) {
                var t = n.stack.trim().match(/\n( *(at )?)/);
                g = (t && t[1]) || '';
            }
        return (
            `
` +
            g +
            e
        );
    }
    var G = !1;
    function Z(e, t) {
        if (!e || G) return '';
        G = !0;
        var n = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        try {
            if (t)
                if (
                    ((t = function () {
                        throw Error();
                    }),
                    Object.defineProperty(t.prototype, 'props', {
                        set: function () {
                            throw Error();
                        },
                    }),
                    typeof Reflect == 'object' && Reflect.construct)
                ) {
                    try {
                        Reflect.construct(t, []);
                    } catch (k) {
                        var r = k;
                    }
                    Reflect.construct(e, [], t);
                } else {
                    try {
                        t.call();
                    } catch (k) {
                        r = k;
                    }
                    e.call(t.prototype);
                }
            else {
                try {
                    throw Error();
                } catch (k) {
                    r = k;
                }
                e();
            }
        } catch (k) {
            if (k && r && typeof k.stack == 'string') {
                for (
                    var l = k.stack.split(`
`),
                        i = r.stack.split(`
`),
                        a = l.length - 1,
                        d = i.length - 1;
                    1 <= a && 0 <= d && l[a] !== i[d];
                )
                    d--;
                for (; 1 <= a && 0 <= d; a--, d--)
                    if (l[a] !== i[d]) {
                        if (a !== 1 || d !== 1)
                            do
                                if ((a--, d--, 0 > d || l[a] !== i[d])) {
                                    var f =
                                        `
` + l[a].replace(' at new ', ' at ');
                                    return (
                                        e.displayName &&
                                            f.includes('<anonymous>') &&
                                            (f = f.replace('<anonymous>', e.displayName)),
                                        f
                                    );
                                }
                            while (1 <= a && 0 <= d);
                        break;
                    }
            }
        } finally {
            ((G = !1), (Error.prepareStackTrace = n));
        }
        return (e = e ? e.displayName || e.name : '') ? C(e) : '';
    }
    function b(e) {
        switch (e.tag) {
            case 5:
                return C(e.type);
            case 16:
                return C('Lazy');
            case 13:
                return C('Suspense');
            case 19:
                return C('SuspenseList');
            case 0:
            case 2:
            case 15:
                return ((e = Z(e.type, !1)), e);
            case 11:
                return ((e = Z(e.type.render, !1)), e);
            case 1:
                return ((e = Z(e.type, !0)), e);
            default:
                return '';
        }
    }
    function ee(e) {
        if (e == null) return null;
        if (typeof e == 'function') return e.displayName || e.name || null;
        if (typeof e == 'string') return e;
        switch (e) {
            case Fe:
                return 'Fragment';
            case Oe:
                return 'Portal';
            case Lt:
                return 'Profiler';
            case Ze:
                return 'StrictMode';
            case Qe:
                return 'Suspense';
            case lt:
                return 'SuspenseList';
        }
        if (typeof e == 'object')
            switch (e.$$typeof) {
                case bt:
                    return (e.displayName || 'Context') + '.Consumer';
                case xt:
                    return (e._context.displayName || 'Context') + '.Provider';
                case ft:
                    var t = e.render;
                    return (
                        (e = e.displayName),
                        e ||
                            ((e = t.displayName || t.name || ''),
                            (e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
                        e
                    );
                case pt:
                    return ((t = e.displayName || null), t !== null ? t : ee(e.type) || 'Memo');
                case Ue:
                    ((t = e._payload), (e = e._init));
                    try {
                        return ee(e(t));
                    } catch {}
            }
        return null;
    }
    function se(e) {
        var t = e.type;
        switch (e.tag) {
            case 24:
                return 'Cache';
            case 9:
                return (t.displayName || 'Context') + '.Consumer';
            case 10:
                return (t._context.displayName || 'Context') + '.Provider';
            case 18:
                return 'DehydratedFragment';
            case 11:
                return (
                    (e = t.render),
                    (e = e.displayName || e.name || ''),
                    t.displayName || (e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')
                );
            case 7:
                return 'Fragment';
            case 5:
                return t;
            case 4:
                return 'Portal';
            case 3:
                return 'Root';
            case 6:
                return 'Text';
            case 16:
                return ee(t);
            case 8:
                return t === Ze ? 'StrictMode' : 'Mode';
            case 22:
                return 'Offscreen';
            case 12:
                return 'Profiler';
            case 21:
                return 'Scope';
            case 13:
                return 'Suspense';
            case 19:
                return 'SuspenseList';
            case 25:
                return 'TracingMarker';
            case 1:
            case 0:
            case 17:
            case 2:
            case 14:
            case 15:
                if (typeof t == 'function') return t.displayName || t.name || null;
                if (typeof t == 'string') return t;
        }
        return null;
    }
    function re(e) {
        switch (typeof e) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'undefined':
                return e;
            case 'object':
                return e;
            default:
                return '';
        }
    }
    function fe(e) {
        var t = e.type;
        return (
            (e = e.nodeName) && e.toLowerCase() === 'input' && (t === 'checkbox' || t === 'radio')
        );
    }
    function Ke(e) {
        var t = fe(e) ? 'checked' : 'value',
            n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
            r = '' + e[t];
        if (
            !e.hasOwnProperty(t) &&
            typeof n < 'u' &&
            typeof n.get == 'function' &&
            typeof n.set == 'function'
        ) {
            var l = n.get,
                i = n.set;
            return (
                Object.defineProperty(e, t, {
                    configurable: !0,
                    get: function () {
                        return l.call(this);
                    },
                    set: function (a) {
                        ((r = '' + a), i.call(this, a));
                    },
                }),
                Object.defineProperty(e, t, { enumerable: n.enumerable }),
                {
                    getValue: function () {
                        return r;
                    },
                    setValue: function (a) {
                        r = '' + a;
                    },
                    stopTracking: function () {
                        ((e._valueTracker = null), delete e[t]);
                    },
                }
            );
        }
    }
    function zr(e) {
        e._valueTracker || (e._valueTracker = Ke(e));
    }
    function ta(e) {
        if (!e) return !1;
        var t = e._valueTracker;
        if (!t) return !0;
        var n = t.getValue(),
            r = '';
        return (
            e && (r = fe(e) ? (e.checked ? 'true' : 'false') : e.value),
            (e = r),
            e !== n ? (t.setValue(e), !0) : !1
        );
    }
    function Ir(e) {
        if (((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')) return null;
        try {
            return e.activeElement || e.body;
        } catch {
            return e.body;
        }
    }
    function Kl(e, t) {
        var n = t.checked;
        return B({}, t, {
            defaultChecked: void 0,
            defaultValue: void 0,
            value: void 0,
            checked: n ?? e._wrapperState.initialChecked,
        });
    }
    function na(e, t) {
        var n = t.defaultValue == null ? '' : t.defaultValue,
            r = t.checked != null ? t.checked : t.defaultChecked;
        ((n = re(t.value != null ? t.value : n)),
            (e._wrapperState = {
                initialChecked: r,
                initialValue: n,
                controlled:
                    t.type === 'checkbox' || t.type === 'radio'
                        ? t.checked != null
                        : t.value != null,
            }));
    }
    function ra(e, t) {
        ((t = t.checked), t != null && ne(e, 'checked', t, !1));
    }
    function Yl(e, t) {
        ra(e, t);
        var n = re(t.value),
            r = t.type;
        if (n != null)
            r === 'number'
                ? ((n === 0 && e.value === '') || e.value != n) && (e.value = '' + n)
                : e.value !== '' + n && (e.value = '' + n);
        else if (r === 'submit' || r === 'reset') {
            e.removeAttribute('value');
            return;
        }
        (t.hasOwnProperty('value')
            ? Xl(e, t.type, n)
            : t.hasOwnProperty('defaultValue') && Xl(e, t.type, re(t.defaultValue)),
            t.checked == null &&
                t.defaultChecked != null &&
                (e.defaultChecked = !!t.defaultChecked));
    }
    function la(e, t, n) {
        if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
            var r = t.type;
            if (!((r !== 'submit' && r !== 'reset') || (t.value !== void 0 && t.value !== null)))
                return;
            ((t = '' + e._wrapperState.initialValue),
                n || t === e.value || (e.value = t),
                (e.defaultValue = t));
        }
        ((n = e.name),
            n !== '' && (e.name = ''),
            (e.defaultChecked = !!e._wrapperState.initialChecked),
            n !== '' && (e.name = n));
    }
    function Xl(e, t, n) {
        (t !== 'number' || Ir(e.ownerDocument) !== e) &&
            (n == null
                ? (e.defaultValue = '' + e._wrapperState.initialValue)
                : e.defaultValue !== '' + n && (e.defaultValue = '' + n));
    }
    var Vn = Array.isArray;
    function hn(e, t, n, r) {
        if (((e = e.options), t)) {
            t = {};
            for (var l = 0; l < n.length; l++) t['$' + n[l]] = !0;
            for (n = 0; n < e.length; n++)
                ((l = t.hasOwnProperty('$' + e[n].value)),
                    e[n].selected !== l && (e[n].selected = l),
                    l && r && (e[n].defaultSelected = !0));
        } else {
            for (n = '' + re(n), t = null, l = 0; l < e.length; l++) {
                if (e[l].value === n) {
                    ((e[l].selected = !0), r && (e[l].defaultSelected = !0));
                    return;
                }
                t !== null || e[l].disabled || (t = e[l]);
            }
            t !== null && (t.selected = !0);
        }
    }
    function Gl(e, t) {
        if (t.dangerouslySetInnerHTML != null) throw Error(s(91));
        return B({}, t, {
            value: void 0,
            defaultValue: void 0,
            children: '' + e._wrapperState.initialValue,
        });
    }
    function ia(e, t) {
        var n = t.value;
        if (n == null) {
            if (((n = t.children), (t = t.defaultValue), n != null)) {
                if (t != null) throw Error(s(92));
                if (Vn(n)) {
                    if (1 < n.length) throw Error(s(93));
                    n = n[0];
                }
                t = n;
            }
            (t == null && (t = ''), (n = t));
        }
        e._wrapperState = { initialValue: re(n) };
    }
    function oa(e, t) {
        var n = re(t.value),
            r = re(t.defaultValue);
        (n != null &&
            ((n = '' + n),
            n !== e.value && (e.value = n),
            t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
            r != null && (e.defaultValue = '' + r));
    }
    function aa(e) {
        var t = e.textContent;
        t === e._wrapperState.initialValue && t !== '' && t !== null && (e.value = t);
    }
    function sa(e) {
        switch (e) {
            case 'svg':
                return 'http://www.w3.org/2000/svg';
            case 'math':
                return 'http://www.w3.org/1998/Math/MathML';
            default:
                return 'http://www.w3.org/1999/xhtml';
        }
    }
    function Jl(e, t) {
        return e == null || e === 'http://www.w3.org/1999/xhtml'
            ? sa(t)
            : e === 'http://www.w3.org/2000/svg' && t === 'foreignObject'
              ? 'http://www.w3.org/1999/xhtml'
              : e;
    }
    var Or,
        ua = (function (e) {
            return typeof MSApp < 'u' && MSApp.execUnsafeLocalFunction
                ? function (t, n, r, l) {
                      MSApp.execUnsafeLocalFunction(function () {
                          return e(t, n, r, l);
                      });
                  }
                : e;
        })(function (e, t) {
            if (e.namespaceURI !== 'http://www.w3.org/2000/svg' || 'innerHTML' in e)
                e.innerHTML = t;
            else {
                for (
                    Or = Or || document.createElement('div'),
                        Or.innerHTML = '<svg>' + t.valueOf().toString() + '</svg>',
                        t = Or.firstChild;
                    e.firstChild;
                )
                    e.removeChild(e.firstChild);
                for (; t.firstChild; ) e.appendChild(t.firstChild);
            }
        });
    function Hn(e, t) {
        if (t) {
            var n = e.firstChild;
            if (n && n === e.lastChild && n.nodeType === 3) {
                n.nodeValue = t;
                return;
            }
        }
        e.textContent = t;
    }
    var Qn = {
            animationIterationCount: !0,
            aspectRatio: !0,
            borderImageOutset: !0,
            borderImageSlice: !0,
            borderImageWidth: !0,
            boxFlex: !0,
            boxFlexGroup: !0,
            boxOrdinalGroup: !0,
            columnCount: !0,
            columns: !0,
            flex: !0,
            flexGrow: !0,
            flexPositive: !0,
            flexShrink: !0,
            flexNegative: !0,
            flexOrder: !0,
            gridArea: !0,
            gridRow: !0,
            gridRowEnd: !0,
            gridRowSpan: !0,
            gridRowStart: !0,
            gridColumn: !0,
            gridColumnEnd: !0,
            gridColumnSpan: !0,
            gridColumnStart: !0,
            fontWeight: !0,
            lineClamp: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            tabSize: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0,
            fillOpacity: !0,
            floodOpacity: !0,
            stopOpacity: !0,
            strokeDasharray: !0,
            strokeDashoffset: !0,
            strokeMiterlimit: !0,
            strokeOpacity: !0,
            strokeWidth: !0,
        },
        Pc = ['Webkit', 'ms', 'Moz', 'O'];
    Object.keys(Qn).forEach(function (e) {
        Pc.forEach(function (t) {
            ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (Qn[t] = Qn[e]));
        });
    });
    function ca(e, t, n) {
        return t == null || typeof t == 'boolean' || t === ''
            ? ''
            : n || typeof t != 'number' || t === 0 || (Qn.hasOwnProperty(e) && Qn[e])
              ? ('' + t).trim()
              : t + 'px';
    }
    function da(e, t) {
        e = e.style;
        for (var n in t)
            if (t.hasOwnProperty(n)) {
                var r = n.indexOf('--') === 0,
                    l = ca(n, t[n], r);
                (n === 'float' && (n = 'cssFloat'), r ? e.setProperty(n, l) : (e[n] = l));
            }
    }
    var _c = B(
        { menuitem: !0 },
        {
            area: !0,
            base: !0,
            br: !0,
            col: !0,
            embed: !0,
            hr: !0,
            img: !0,
            input: !0,
            keygen: !0,
            link: !0,
            meta: !0,
            param: !0,
            source: !0,
            track: !0,
            wbr: !0,
        },
    );
    function Zl(e, t) {
        if (t) {
            if (_c[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
                throw Error(s(137, e));
            if (t.dangerouslySetInnerHTML != null) {
                if (t.children != null) throw Error(s(60));
                if (
                    typeof t.dangerouslySetInnerHTML != 'object' ||
                    !('__html' in t.dangerouslySetInnerHTML)
                )
                    throw Error(s(61));
            }
            if (t.style != null && typeof t.style != 'object') throw Error(s(62));
        }
    }
    function ql(e, t) {
        if (e.indexOf('-') === -1) return typeof t.is == 'string';
        switch (e) {
            case 'annotation-xml':
            case 'color-profile':
            case 'font-face':
            case 'font-face-src':
            case 'font-face-uri':
            case 'font-face-format':
            case 'font-face-name':
            case 'missing-glyph':
                return !1;
            default:
                return !0;
        }
    }
    var bl = null;
    function ei(e) {
        return (
            (e = e.target || e.srcElement || window),
            e.correspondingUseElement && (e = e.correspondingUseElement),
            e.nodeType === 3 ? e.parentNode : e
        );
    }
    var ti = null,
        gn = null,
        vn = null;
    function fa(e) {
        if ((e = pr(e))) {
            if (typeof ti != 'function') throw Error(s(280));
            var t = e.stateNode;
            t && ((t = rl(t)), ti(e.stateNode, e.type, t));
        }
    }
    function pa(e) {
        gn ? (vn ? vn.push(e) : (vn = [e])) : (gn = e);
    }
    function ma() {
        if (gn) {
            var e = gn,
                t = vn;
            if (((vn = gn = null), fa(e), t)) for (e = 0; e < t.length; e++) fa(t[e]);
        }
    }
    function ha(e, t) {
        return e(t);
    }
    function ga() {}
    var ni = !1;
    function va(e, t, n) {
        if (ni) return e(t, n);
        ni = !0;
        try {
            return ha(e, t, n);
        } finally {
            ((ni = !1), (gn !== null || vn !== null) && (ga(), ma()));
        }
    }
    function Kn(e, t) {
        var n = e.stateNode;
        if (n === null) return null;
        var r = rl(n);
        if (r === null) return null;
        n = r[t];
        e: switch (t) {
            case 'onClick':
            case 'onClickCapture':
            case 'onDoubleClick':
            case 'onDoubleClickCapture':
            case 'onMouseDown':
            case 'onMouseDownCapture':
            case 'onMouseMove':
            case 'onMouseMoveCapture':
            case 'onMouseUp':
            case 'onMouseUpCapture':
            case 'onMouseEnter':
                ((r = !r.disabled) ||
                    ((e = e.type),
                    (r = !(e === 'button' || e === 'input' || e === 'select' || e === 'textarea'))),
                    (e = !r));
                break e;
            default:
                e = !1;
        }
        if (e) return null;
        if (n && typeof n != 'function') throw Error(s(231, t, typeof n));
        return n;
    }
    var ri = !1;
    if (j)
        try {
            var Yn = {};
            (Object.defineProperty(Yn, 'passive', {
                get: function () {
                    ri = !0;
                },
            }),
                window.addEventListener('test', Yn, Yn),
                window.removeEventListener('test', Yn, Yn));
        } catch {
            ri = !1;
        }
    function Lc(e, t, n, r, l, i, a, d, f) {
        var k = Array.prototype.slice.call(arguments, 3);
        try {
            t.apply(n, k);
        } catch (P) {
            this.onError(P);
        }
    }
    var Xn = !1,
        Mr = null,
        Dr = !1,
        li = null,
        Rc = {
            onError: function (e) {
                ((Xn = !0), (Mr = e));
            },
        };
    function Tc(e, t, n, r, l, i, a, d, f) {
        ((Xn = !1), (Mr = null), Lc.apply(Rc, arguments));
    }
    function zc(e, t, n, r, l, i, a, d, f) {
        if ((Tc.apply(this, arguments), Xn)) {
            if (Xn) {
                var k = Mr;
                ((Xn = !1), (Mr = null));
            } else throw Error(s(198));
            Dr || ((Dr = !0), (li = k));
        }
    }
    function en(e) {
        var t = e,
            n = e;
        if (e.alternate) for (; t.return; ) t = t.return;
        else {
            e = t;
            do ((t = e), (t.flags & 4098) !== 0 && (n = t.return), (e = t.return));
            while (e);
        }
        return t.tag === 3 ? n : null;
    }
    function ya(e) {
        if (e.tag === 13) {
            var t = e.memoizedState;
            if (
                (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null)
            )
                return t.dehydrated;
        }
        return null;
    }
    function xa(e) {
        if (en(e) !== e) throw Error(s(188));
    }
    function Ic(e) {
        var t = e.alternate;
        if (!t) {
            if (((t = en(e)), t === null)) throw Error(s(188));
            return t !== e ? null : e;
        }
        for (var n = e, r = t; ; ) {
            var l = n.return;
            if (l === null) break;
            var i = l.alternate;
            if (i === null) {
                if (((r = l.return), r !== null)) {
                    n = r;
                    continue;
                }
                break;
            }
            if (l.child === i.child) {
                for (i = l.child; i; ) {
                    if (i === n) return (xa(l), e);
                    if (i === r) return (xa(l), t);
                    i = i.sibling;
                }
                throw Error(s(188));
            }
            if (n.return !== r.return) ((n = l), (r = i));
            else {
                for (var a = !1, d = l.child; d; ) {
                    if (d === n) {
                        ((a = !0), (n = l), (r = i));
                        break;
                    }
                    if (d === r) {
                        ((a = !0), (r = l), (n = i));
                        break;
                    }
                    d = d.sibling;
                }
                if (!a) {
                    for (d = i.child; d; ) {
                        if (d === n) {
                            ((a = !0), (n = i), (r = l));
                            break;
                        }
                        if (d === r) {
                            ((a = !0), (r = i), (n = l));
                            break;
                        }
                        d = d.sibling;
                    }
                    if (!a) throw Error(s(189));
                }
            }
            if (n.alternate !== r) throw Error(s(190));
        }
        if (n.tag !== 3) throw Error(s(188));
        return n.stateNode.current === n ? e : t;
    }
    function wa(e) {
        return ((e = Ic(e)), e !== null ? ka(e) : null);
    }
    function ka(e) {
        if (e.tag === 5 || e.tag === 6) return e;
        for (e = e.child; e !== null; ) {
            var t = ka(e);
            if (t !== null) return t;
            e = e.sibling;
        }
        return null;
    }
    var Sa = c.unstable_scheduleCallback,
        Na = c.unstable_cancelCallback,
        Oc = c.unstable_shouldYield,
        Mc = c.unstable_requestPaint,
        ye = c.unstable_now,
        Dc = c.unstable_getCurrentPriorityLevel,
        ii = c.unstable_ImmediatePriority,
        ja = c.unstable_UserBlockingPriority,
        Fr = c.unstable_NormalPriority,
        Fc = c.unstable_LowPriority,
        Ea = c.unstable_IdlePriority,
        Ur = null,
        mt = null;
    function Uc(e) {
        if (mt && typeof mt.onCommitFiberRoot == 'function')
            try {
                mt.onCommitFiberRoot(Ur, e, void 0, (e.current.flags & 128) === 128);
            } catch {}
    }
    var it = Math.clz32 ? Math.clz32 : Ac,
        Bc = Math.log,
        $c = Math.LN2;
    function Ac(e) {
        return ((e >>>= 0), e === 0 ? 32 : (31 - ((Bc(e) / $c) | 0)) | 0);
    }
    var Br = 64,
        $r = 4194304;
    function Gn(e) {
        switch (e & -e) {
            case 1:
                return 1;
            case 2:
                return 2;
            case 4:
                return 4;
            case 8:
                return 8;
            case 16:
                return 16;
            case 32:
                return 32;
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return e & 4194240;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
                return e & 130023424;
            case 134217728:
                return 134217728;
            case 268435456:
                return 268435456;
            case 536870912:
                return 536870912;
            case 1073741824:
                return 1073741824;
            default:
                return e;
        }
    }
    function Ar(e, t) {
        var n = e.pendingLanes;
        if (n === 0) return 0;
        var r = 0,
            l = e.suspendedLanes,
            i = e.pingedLanes,
            a = n & 268435455;
        if (a !== 0) {
            var d = a & ~l;
            d !== 0 ? (r = Gn(d)) : ((i &= a), i !== 0 && (r = Gn(i)));
        } else ((a = n & ~l), a !== 0 ? (r = Gn(a)) : i !== 0 && (r = Gn(i)));
        if (r === 0) return 0;
        if (
            t !== 0 &&
            t !== r &&
            (t & l) === 0 &&
            ((l = r & -r), (i = t & -t), l >= i || (l === 16 && (i & 4194240) !== 0))
        )
            return t;
        if (((r & 4) !== 0 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
            for (e = e.entanglements, t &= r; 0 < t; )
                ((n = 31 - it(t)), (l = 1 << n), (r |= e[n]), (t &= ~l));
        return r;
    }
    function Wc(e, t) {
        switch (e) {
            case 1:
            case 2:
            case 4:
                return t + 250;
            case 8:
            case 16:
            case 32:
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return t + 5e3;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
                return -1;
            case 134217728:
            case 268435456:
            case 536870912:
            case 1073741824:
                return -1;
            default:
                return -1;
        }
    }
    function Vc(e, t) {
        for (
            var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, i = e.pendingLanes;
            0 < i;
        ) {
            var a = 31 - it(i),
                d = 1 << a,
                f = l[a];
            (f === -1
                ? ((d & n) === 0 || (d & r) !== 0) && (l[a] = Wc(d, t))
                : f <= t && (e.expiredLanes |= d),
                (i &= ~d));
        }
    }
    function oi(e) {
        return ((e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0);
    }
    function Ca() {
        var e = Br;
        return ((Br <<= 1), (Br & 4194240) === 0 && (Br = 64), e);
    }
    function ai(e) {
        for (var t = [], n = 0; 31 > n; n++) t.push(e);
        return t;
    }
    function Jn(e, t, n) {
        ((e.pendingLanes |= t),
            t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
            (e = e.eventTimes),
            (t = 31 - it(t)),
            (e[t] = n));
    }
    function Hc(e, t) {
        var n = e.pendingLanes & ~t;
        ((e.pendingLanes = t),
            (e.suspendedLanes = 0),
            (e.pingedLanes = 0),
            (e.expiredLanes &= t),
            (e.mutableReadLanes &= t),
            (e.entangledLanes &= t),
            (t = e.entanglements));
        var r = e.eventTimes;
        for (e = e.expirationTimes; 0 < n; ) {
            var l = 31 - it(n),
                i = 1 << l;
            ((t[l] = 0), (r[l] = -1), (e[l] = -1), (n &= ~i));
        }
    }
    function si(e, t) {
        var n = (e.entangledLanes |= t);
        for (e = e.entanglements; n; ) {
            var r = 31 - it(n),
                l = 1 << r;
            ((l & t) | (e[r] & t) && (e[r] |= t), (n &= ~l));
        }
    }
    var le = 0;
    function Pa(e) {
        return ((e &= -e), 1 < e ? (4 < e ? ((e & 268435455) !== 0 ? 16 : 536870912) : 4) : 1);
    }
    var _a,
        ui,
        La,
        Ra,
        Ta,
        ci = !1,
        Wr = [],
        Rt = null,
        Tt = null,
        zt = null,
        Zn = new Map(),
        qn = new Map(),
        It = [],
        Qc =
            'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
                ' ',
            );
    function za(e, t) {
        switch (e) {
            case 'focusin':
            case 'focusout':
                Rt = null;
                break;
            case 'dragenter':
            case 'dragleave':
                Tt = null;
                break;
            case 'mouseover':
            case 'mouseout':
                zt = null;
                break;
            case 'pointerover':
            case 'pointerout':
                Zn.delete(t.pointerId);
                break;
            case 'gotpointercapture':
            case 'lostpointercapture':
                qn.delete(t.pointerId);
        }
    }
    function bn(e, t, n, r, l, i) {
        return e === null || e.nativeEvent !== i
            ? ((e = {
                  blockedOn: t,
                  domEventName: n,
                  eventSystemFlags: r,
                  nativeEvent: i,
                  targetContainers: [l],
              }),
              t !== null && ((t = pr(t)), t !== null && ui(t)),
              e)
            : ((e.eventSystemFlags |= r),
              (t = e.targetContainers),
              l !== null && t.indexOf(l) === -1 && t.push(l),
              e);
    }
    function Kc(e, t, n, r, l) {
        switch (t) {
            case 'focusin':
                return ((Rt = bn(Rt, e, t, n, r, l)), !0);
            case 'dragenter':
                return ((Tt = bn(Tt, e, t, n, r, l)), !0);
            case 'mouseover':
                return ((zt = bn(zt, e, t, n, r, l)), !0);
            case 'pointerover':
                var i = l.pointerId;
                return (Zn.set(i, bn(Zn.get(i) || null, e, t, n, r, l)), !0);
            case 'gotpointercapture':
                return ((i = l.pointerId), qn.set(i, bn(qn.get(i) || null, e, t, n, r, l)), !0);
        }
        return !1;
    }
    function Ia(e) {
        var t = tn(e.target);
        if (t !== null) {
            var n = en(t);
            if (n !== null) {
                if (((t = n.tag), t === 13)) {
                    if (((t = ya(n)), t !== null)) {
                        ((e.blockedOn = t),
                            Ta(e.priority, function () {
                                La(n);
                            }));
                        return;
                    }
                } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
                    e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
                    return;
                }
            }
        }
        e.blockedOn = null;
    }
    function Vr(e) {
        if (e.blockedOn !== null) return !1;
        for (var t = e.targetContainers; 0 < t.length; ) {
            var n = fi(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
            if (n === null) {
                n = e.nativeEvent;
                var r = new n.constructor(n.type, n);
                ((bl = r), n.target.dispatchEvent(r), (bl = null));
            } else return ((t = pr(n)), t !== null && ui(t), (e.blockedOn = n), !1);
            t.shift();
        }
        return !0;
    }
    function Oa(e, t, n) {
        Vr(e) && n.delete(t);
    }
    function Yc() {
        ((ci = !1),
            Rt !== null && Vr(Rt) && (Rt = null),
            Tt !== null && Vr(Tt) && (Tt = null),
            zt !== null && Vr(zt) && (zt = null),
            Zn.forEach(Oa),
            qn.forEach(Oa));
    }
    function er(e, t) {
        e.blockedOn === t &&
            ((e.blockedOn = null),
            ci || ((ci = !0), c.unstable_scheduleCallback(c.unstable_NormalPriority, Yc)));
    }
    function tr(e) {
        function t(l) {
            return er(l, e);
        }
        if (0 < Wr.length) {
            er(Wr[0], e);
            for (var n = 1; n < Wr.length; n++) {
                var r = Wr[n];
                r.blockedOn === e && (r.blockedOn = null);
            }
        }
        for (
            Rt !== null && er(Rt, e),
                Tt !== null && er(Tt, e),
                zt !== null && er(zt, e),
                Zn.forEach(t),
                qn.forEach(t),
                n = 0;
            n < It.length;
            n++
        )
            ((r = It[n]), r.blockedOn === e && (r.blockedOn = null));
        for (; 0 < It.length && ((n = It[0]), n.blockedOn === null); )
            (Ia(n), n.blockedOn === null && It.shift());
    }
    var yn = ae.ReactCurrentBatchConfig,
        Hr = !0;
    function Xc(e, t, n, r) {
        var l = le,
            i = yn.transition;
        yn.transition = null;
        try {
            ((le = 1), di(e, t, n, r));
        } finally {
            ((le = l), (yn.transition = i));
        }
    }
    function Gc(e, t, n, r) {
        var l = le,
            i = yn.transition;
        yn.transition = null;
        try {
            ((le = 4), di(e, t, n, r));
        } finally {
            ((le = l), (yn.transition = i));
        }
    }
    function di(e, t, n, r) {
        if (Hr) {
            var l = fi(e, t, n, r);
            if (l === null) (Li(e, t, r, Qr, n), za(e, r));
            else if (Kc(l, e, t, n, r)) r.stopPropagation();
            else if ((za(e, r), t & 4 && -1 < Qc.indexOf(e))) {
                for (; l !== null; ) {
                    var i = pr(l);
                    if (
                        (i !== null && _a(i),
                        (i = fi(e, t, n, r)),
                        i === null && Li(e, t, r, Qr, n),
                        i === l)
                    )
                        break;
                    l = i;
                }
                l !== null && r.stopPropagation();
            } else Li(e, t, r, null, n);
        }
    }
    var Qr = null;
    function fi(e, t, n, r) {
        if (((Qr = null), (e = ei(r)), (e = tn(e)), e !== null))
            if (((t = en(e)), t === null)) e = null;
            else if (((n = t.tag), n === 13)) {
                if (((e = ya(t)), e !== null)) return e;
                e = null;
            } else if (n === 3) {
                if (t.stateNode.current.memoizedState.isDehydrated)
                    return t.tag === 3 ? t.stateNode.containerInfo : null;
                e = null;
            } else t !== e && (e = null);
        return ((Qr = e), null);
    }
    function Ma(e) {
        switch (e) {
            case 'cancel':
            case 'click':
            case 'close':
            case 'contextmenu':
            case 'copy':
            case 'cut':
            case 'auxclick':
            case 'dblclick':
            case 'dragend':
            case 'dragstart':
            case 'drop':
            case 'focusin':
            case 'focusout':
            case 'input':
            case 'invalid':
            case 'keydown':
            case 'keypress':
            case 'keyup':
            case 'mousedown':
            case 'mouseup':
            case 'paste':
            case 'pause':
            case 'play':
            case 'pointercancel':
            case 'pointerdown':
            case 'pointerup':
            case 'ratechange':
            case 'reset':
            case 'resize':
            case 'seeked':
            case 'submit':
            case 'touchcancel':
            case 'touchend':
            case 'touchstart':
            case 'volumechange':
            case 'change':
            case 'selectionchange':
            case 'textInput':
            case 'compositionstart':
            case 'compositionend':
            case 'compositionupdate':
            case 'beforeblur':
            case 'afterblur':
            case 'beforeinput':
            case 'blur':
            case 'fullscreenchange':
            case 'focus':
            case 'hashchange':
            case 'popstate':
            case 'select':
            case 'selectstart':
                return 1;
            case 'drag':
            case 'dragenter':
            case 'dragexit':
            case 'dragleave':
            case 'dragover':
            case 'mousemove':
            case 'mouseout':
            case 'mouseover':
            case 'pointermove':
            case 'pointerout':
            case 'pointerover':
            case 'scroll':
            case 'toggle':
            case 'touchmove':
            case 'wheel':
            case 'mouseenter':
            case 'mouseleave':
            case 'pointerenter':
            case 'pointerleave':
                return 4;
            case 'message':
                switch (Dc()) {
                    case ii:
                        return 1;
                    case ja:
                        return 4;
                    case Fr:
                    case Fc:
                        return 16;
                    case Ea:
                        return 536870912;
                    default:
                        return 16;
                }
            default:
                return 16;
        }
    }
    var Ot = null,
        pi = null,
        Kr = null;
    function Da() {
        if (Kr) return Kr;
        var e,
            t = pi,
            n = t.length,
            r,
            l = 'value' in Ot ? Ot.value : Ot.textContent,
            i = l.length;
        for (e = 0; e < n && t[e] === l[e]; e++);
        var a = n - e;
        for (r = 1; r <= a && t[n - r] === l[i - r]; r++);
        return (Kr = l.slice(e, 1 < r ? 1 - r : void 0));
    }
    function Yr(e) {
        var t = e.keyCode;
        return (
            'charCode' in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
            e === 10 && (e = 13),
            32 <= e || e === 13 ? e : 0
        );
    }
    function Xr() {
        return !0;
    }
    function Fa() {
        return !1;
    }
    function Ye(e) {
        function t(n, r, l, i, a) {
            ((this._reactName = n),
                (this._targetInst = l),
                (this.type = r),
                (this.nativeEvent = i),
                (this.target = a),
                (this.currentTarget = null));
            for (var d in e) e.hasOwnProperty(d) && ((n = e[d]), (this[d] = n ? n(i) : i[d]));
            return (
                (this.isDefaultPrevented = (
                    i.defaultPrevented != null ? i.defaultPrevented : i.returnValue === !1
                )
                    ? Xr
                    : Fa),
                (this.isPropagationStopped = Fa),
                this
            );
        }
        return (
            B(t.prototype, {
                preventDefault: function () {
                    this.defaultPrevented = !0;
                    var n = this.nativeEvent;
                    n &&
                        (n.preventDefault
                            ? n.preventDefault()
                            : typeof n.returnValue != 'unknown' && (n.returnValue = !1),
                        (this.isDefaultPrevented = Xr));
                },
                stopPropagation: function () {
                    var n = this.nativeEvent;
                    n &&
                        (n.stopPropagation
                            ? n.stopPropagation()
                            : typeof n.cancelBubble != 'unknown' && (n.cancelBubble = !0),
                        (this.isPropagationStopped = Xr));
                },
                persist: function () {},
                isPersistent: Xr,
            }),
            t
        );
    }
    var xn = {
            eventPhase: 0,
            bubbles: 0,
            cancelable: 0,
            timeStamp: function (e) {
                return e.timeStamp || Date.now();
            },
            defaultPrevented: 0,
            isTrusted: 0,
        },
        mi = Ye(xn),
        nr = B({}, xn, { view: 0, detail: 0 }),
        Jc = Ye(nr),
        hi,
        gi,
        rr,
        Gr = B({}, nr, {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            getModifierState: yi,
            button: 0,
            buttons: 0,
            relatedTarget: function (e) {
                return e.relatedTarget === void 0
                    ? e.fromElement === e.srcElement
                        ? e.toElement
                        : e.fromElement
                    : e.relatedTarget;
            },
            movementX: function (e) {
                return 'movementX' in e
                    ? e.movementX
                    : (e !== rr &&
                          (rr && e.type === 'mousemove'
                              ? ((hi = e.screenX - rr.screenX), (gi = e.screenY - rr.screenY))
                              : (gi = hi = 0),
                          (rr = e)),
                      hi);
            },
            movementY: function (e) {
                return 'movementY' in e ? e.movementY : gi;
            },
        }),
        Ua = Ye(Gr),
        Zc = B({}, Gr, { dataTransfer: 0 }),
        qc = Ye(Zc),
        bc = B({}, nr, { relatedTarget: 0 }),
        vi = Ye(bc),
        ed = B({}, xn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
        td = Ye(ed),
        nd = B({}, xn, {
            clipboardData: function (e) {
                return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
            },
        }),
        rd = Ye(nd),
        ld = B({}, xn, { data: 0 }),
        Ba = Ye(ld),
        id = {
            Esc: 'Escape',
            Spacebar: ' ',
            Left: 'ArrowLeft',
            Up: 'ArrowUp',
            Right: 'ArrowRight',
            Down: 'ArrowDown',
            Del: 'Delete',
            Win: 'OS',
            Menu: 'ContextMenu',
            Apps: 'ContextMenu',
            Scroll: 'ScrollLock',
            MozPrintableKey: 'Unidentified',
        },
        od = {
            8: 'Backspace',
            9: 'Tab',
            12: 'Clear',
            13: 'Enter',
            16: 'Shift',
            17: 'Control',
            18: 'Alt',
            19: 'Pause',
            20: 'CapsLock',
            27: 'Escape',
            32: ' ',
            33: 'PageUp',
            34: 'PageDown',
            35: 'End',
            36: 'Home',
            37: 'ArrowLeft',
            38: 'ArrowUp',
            39: 'ArrowRight',
            40: 'ArrowDown',
            45: 'Insert',
            46: 'Delete',
            112: 'F1',
            113: 'F2',
            114: 'F3',
            115: 'F4',
            116: 'F5',
            117: 'F6',
            118: 'F7',
            119: 'F8',
            120: 'F9',
            121: 'F10',
            122: 'F11',
            123: 'F12',
            144: 'NumLock',
            145: 'ScrollLock',
            224: 'Meta',
        },
        ad = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' };
    function sd(e) {
        var t = this.nativeEvent;
        return t.getModifierState ? t.getModifierState(e) : (e = ad[e]) ? !!t[e] : !1;
    }
    function yi() {
        return sd;
    }
    var ud = B({}, nr, {
            key: function (e) {
                if (e.key) {
                    var t = id[e.key] || e.key;
                    if (t !== 'Unidentified') return t;
                }
                return e.type === 'keypress'
                    ? ((e = Yr(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
                    : e.type === 'keydown' || e.type === 'keyup'
                      ? od[e.keyCode] || 'Unidentified'
                      : '';
            },
            code: 0,
            location: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            repeat: 0,
            locale: 0,
            getModifierState: yi,
            charCode: function (e) {
                return e.type === 'keypress' ? Yr(e) : 0;
            },
            keyCode: function (e) {
                return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
            },
            which: function (e) {
                return e.type === 'keypress'
                    ? Yr(e)
                    : e.type === 'keydown' || e.type === 'keyup'
                      ? e.keyCode
                      : 0;
            },
        }),
        cd = Ye(ud),
        dd = B({}, Gr, {
            pointerId: 0,
            width: 0,
            height: 0,
            pressure: 0,
            tangentialPressure: 0,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
            pointerType: 0,
            isPrimary: 0,
        }),
        $a = Ye(dd),
        fd = B({}, nr, {
            touches: 0,
            targetTouches: 0,
            changedTouches: 0,
            altKey: 0,
            metaKey: 0,
            ctrlKey: 0,
            shiftKey: 0,
            getModifierState: yi,
        }),
        pd = Ye(fd),
        md = B({}, xn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
        hd = Ye(md),
        gd = B({}, Gr, {
            deltaX: function (e) {
                return 'deltaX' in e ? e.deltaX : 'wheelDeltaX' in e ? -e.wheelDeltaX : 0;
            },
            deltaY: function (e) {
                return 'deltaY' in e
                    ? e.deltaY
                    : 'wheelDeltaY' in e
                      ? -e.wheelDeltaY
                      : 'wheelDelta' in e
                        ? -e.wheelDelta
                        : 0;
            },
            deltaZ: 0,
            deltaMode: 0,
        }),
        vd = Ye(gd),
        yd = [9, 13, 27, 32],
        xi = j && 'CompositionEvent' in window,
        lr = null;
    j && 'documentMode' in document && (lr = document.documentMode);
    var xd = j && 'TextEvent' in window && !lr,
        Aa = j && (!xi || (lr && 8 < lr && 11 >= lr)),
        Wa = ' ',
        Va = !1;
    function Ha(e, t) {
        switch (e) {
            case 'keyup':
                return yd.indexOf(t.keyCode) !== -1;
            case 'keydown':
                return t.keyCode !== 229;
            case 'keypress':
            case 'mousedown':
            case 'focusout':
                return !0;
            default:
                return !1;
        }
    }
    function Qa(e) {
        return ((e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null);
    }
    var wn = !1;
    function wd(e, t) {
        switch (e) {
            case 'compositionend':
                return Qa(t);
            case 'keypress':
                return t.which !== 32 ? null : ((Va = !0), Wa);
            case 'textInput':
                return ((e = t.data), e === Wa && Va ? null : e);
            default:
                return null;
        }
    }
    function kd(e, t) {
        if (wn)
            return e === 'compositionend' || (!xi && Ha(e, t))
                ? ((e = Da()), (Kr = pi = Ot = null), (wn = !1), e)
                : null;
        switch (e) {
            case 'paste':
                return null;
            case 'keypress':
                if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
                    if (t.char && 1 < t.char.length) return t.char;
                    if (t.which) return String.fromCharCode(t.which);
                }
                return null;
            case 'compositionend':
                return Aa && t.locale !== 'ko' ? null : t.data;
            default:
                return null;
        }
    }
    var Sd = {
        color: !0,
        date: !0,
        datetime: !0,
        'datetime-local': !0,
        email: !0,
        month: !0,
        number: !0,
        password: !0,
        range: !0,
        search: !0,
        tel: !0,
        text: !0,
        time: !0,
        url: !0,
        week: !0,
    };
    function Ka(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return t === 'input' ? !!Sd[e.type] : t === 'textarea';
    }
    function Ya(e, t, n, r) {
        (pa(r),
            (t = el(t, 'onChange')),
            0 < t.length &&
                ((n = new mi('onChange', 'change', null, n, r)),
                e.push({ event: n, listeners: t })));
    }
    var ir = null,
        or = null;
    function Nd(e) {
        ds(e, 0);
    }
    function Jr(e) {
        var t = En(e);
        if (ta(t)) return e;
    }
    function jd(e, t) {
        if (e === 'change') return t;
    }
    var Xa = !1;
    if (j) {
        var wi;
        if (j) {
            var ki = 'oninput' in document;
            if (!ki) {
                var Ga = document.createElement('div');
                (Ga.setAttribute('oninput', 'return;'), (ki = typeof Ga.oninput == 'function'));
            }
            wi = ki;
        } else wi = !1;
        Xa = wi && (!document.documentMode || 9 < document.documentMode);
    }
    function Ja() {
        ir && (ir.detachEvent('onpropertychange', Za), (or = ir = null));
    }
    function Za(e) {
        if (e.propertyName === 'value' && Jr(or)) {
            var t = [];
            (Ya(t, or, e, ei(e)), va(Nd, t));
        }
    }
    function Ed(e, t, n) {
        e === 'focusin'
            ? (Ja(), (ir = t), (or = n), ir.attachEvent('onpropertychange', Za))
            : e === 'focusout' && Ja();
    }
    function Cd(e) {
        if (e === 'selectionchange' || e === 'keyup' || e === 'keydown') return Jr(or);
    }
    function Pd(e, t) {
        if (e === 'click') return Jr(t);
    }
    function _d(e, t) {
        if (e === 'input' || e === 'change') return Jr(t);
    }
    function Ld(e, t) {
        return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
    }
    var ot = typeof Object.is == 'function' ? Object.is : Ld;
    function ar(e, t) {
        if (ot(e, t)) return !0;
        if (typeof e != 'object' || e === null || typeof t != 'object' || t === null) return !1;
        var n = Object.keys(e),
            r = Object.keys(t);
        if (n.length !== r.length) return !1;
        for (r = 0; r < n.length; r++) {
            var l = n[r];
            if (!N.call(t, l) || !ot(e[l], t[l])) return !1;
        }
        return !0;
    }
    function qa(e) {
        for (; e && e.firstChild; ) e = e.firstChild;
        return e;
    }
    function ba(e, t) {
        var n = qa(e);
        e = 0;
        for (var r; n; ) {
            if (n.nodeType === 3) {
                if (((r = e + n.textContent.length), e <= t && r >= t))
                    return { node: n, offset: t - e };
                e = r;
            }
            e: {
                for (; n; ) {
                    if (n.nextSibling) {
                        n = n.nextSibling;
                        break e;
                    }
                    n = n.parentNode;
                }
                n = void 0;
            }
            n = qa(n);
        }
    }
    function es(e, t) {
        return e && t
            ? e === t
                ? !0
                : e && e.nodeType === 3
                  ? !1
                  : t && t.nodeType === 3
                    ? es(e, t.parentNode)
                    : 'contains' in e
                      ? e.contains(t)
                      : e.compareDocumentPosition
                        ? !!(e.compareDocumentPosition(t) & 16)
                        : !1
            : !1;
    }
    function ts() {
        for (var e = window, t = Ir(); t instanceof e.HTMLIFrameElement; ) {
            try {
                var n = typeof t.contentWindow.location.href == 'string';
            } catch {
                n = !1;
            }
            if (n) e = t.contentWindow;
            else break;
            t = Ir(e.document);
        }
        return t;
    }
    function Si(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return (
            t &&
            ((t === 'input' &&
                (e.type === 'text' ||
                    e.type === 'search' ||
                    e.type === 'tel' ||
                    e.type === 'url' ||
                    e.type === 'password')) ||
                t === 'textarea' ||
                e.contentEditable === 'true')
        );
    }
    function Rd(e) {
        var t = ts(),
            n = e.focusedElem,
            r = e.selectionRange;
        if (t !== n && n && n.ownerDocument && es(n.ownerDocument.documentElement, n)) {
            if (r !== null && Si(n)) {
                if (((t = r.start), (e = r.end), e === void 0 && (e = t), 'selectionStart' in n))
                    ((n.selectionStart = t), (n.selectionEnd = Math.min(e, n.value.length)));
                else if (
                    ((e = ((t = n.ownerDocument || document) && t.defaultView) || window),
                    e.getSelection)
                ) {
                    e = e.getSelection();
                    var l = n.textContent.length,
                        i = Math.min(r.start, l);
                    ((r = r.end === void 0 ? i : Math.min(r.end, l)),
                        !e.extend && i > r && ((l = r), (r = i), (i = l)),
                        (l = ba(n, i)));
                    var a = ba(n, r);
                    l &&
                        a &&
                        (e.rangeCount !== 1 ||
                            e.anchorNode !== l.node ||
                            e.anchorOffset !== l.offset ||
                            e.focusNode !== a.node ||
                            e.focusOffset !== a.offset) &&
                        ((t = t.createRange()),
                        t.setStart(l.node, l.offset),
                        e.removeAllRanges(),
                        i > r
                            ? (e.addRange(t), e.extend(a.node, a.offset))
                            : (t.setEnd(a.node, a.offset), e.addRange(t)));
                }
            }
            for (t = [], e = n; (e = e.parentNode); )
                e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
            for (typeof n.focus == 'function' && n.focus(), n = 0; n < t.length; n++)
                ((e = t[n]), (e.element.scrollLeft = e.left), (e.element.scrollTop = e.top));
        }
    }
    var Td = j && 'documentMode' in document && 11 >= document.documentMode,
        kn = null,
        Ni = null,
        sr = null,
        ji = !1;
    function ns(e, t, n) {
        var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
        ji ||
            kn == null ||
            kn !== Ir(r) ||
            ((r = kn),
            'selectionStart' in r && Si(r)
                ? (r = { start: r.selectionStart, end: r.selectionEnd })
                : ((r = (
                      (r.ownerDocument && r.ownerDocument.defaultView) ||
                      window
                  ).getSelection()),
                  (r = {
                      anchorNode: r.anchorNode,
                      anchorOffset: r.anchorOffset,
                      focusNode: r.focusNode,
                      focusOffset: r.focusOffset,
                  })),
            (sr && ar(sr, r)) ||
                ((sr = r),
                (r = el(Ni, 'onSelect')),
                0 < r.length &&
                    ((t = new mi('onSelect', 'select', null, t, n)),
                    e.push({ event: t, listeners: r }),
                    (t.target = kn))));
    }
    function Zr(e, t) {
        var n = {};
        return (
            (n[e.toLowerCase()] = t.toLowerCase()),
            (n['Webkit' + e] = 'webkit' + t),
            (n['Moz' + e] = 'moz' + t),
            n
        );
    }
    var Sn = {
            animationend: Zr('Animation', 'AnimationEnd'),
            animationiteration: Zr('Animation', 'AnimationIteration'),
            animationstart: Zr('Animation', 'AnimationStart'),
            transitionend: Zr('Transition', 'TransitionEnd'),
        },
        Ei = {},
        rs = {};
    j &&
        ((rs = document.createElement('div').style),
        'AnimationEvent' in window ||
            (delete Sn.animationend.animation,
            delete Sn.animationiteration.animation,
            delete Sn.animationstart.animation),
        'TransitionEvent' in window || delete Sn.transitionend.transition);
    function qr(e) {
        if (Ei[e]) return Ei[e];
        if (!Sn[e]) return e;
        var t = Sn[e],
            n;
        for (n in t) if (t.hasOwnProperty(n) && n in rs) return (Ei[e] = t[n]);
        return e;
    }
    var ls = qr('animationend'),
        is = qr('animationiteration'),
        os = qr('animationstart'),
        as = qr('transitionend'),
        ss = new Map(),
        us =
            'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
                ' ',
            );
    function Mt(e, t) {
        (ss.set(e, t), w(t, [e]));
    }
    for (var Ci = 0; Ci < us.length; Ci++) {
        var Pi = us[Ci],
            zd = Pi.toLowerCase(),
            Id = Pi[0].toUpperCase() + Pi.slice(1);
        Mt(zd, 'on' + Id);
    }
    (Mt(ls, 'onAnimationEnd'),
        Mt(is, 'onAnimationIteration'),
        Mt(os, 'onAnimationStart'),
        Mt('dblclick', 'onDoubleClick'),
        Mt('focusin', 'onFocus'),
        Mt('focusout', 'onBlur'),
        Mt(as, 'onTransitionEnd'),
        x('onMouseEnter', ['mouseout', 'mouseover']),
        x('onMouseLeave', ['mouseout', 'mouseover']),
        x('onPointerEnter', ['pointerout', 'pointerover']),
        x('onPointerLeave', ['pointerout', 'pointerover']),
        w(
            'onChange',
            'change click focusin focusout input keydown keyup selectionchange'.split(' '),
        ),
        w(
            'onSelect',
            'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
                ' ',
            ),
        ),
        w('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']),
        w(
            'onCompositionEnd',
            'compositionend focusout keydown keypress keyup mousedown'.split(' '),
        ),
        w(
            'onCompositionStart',
            'compositionstart focusout keydown keypress keyup mousedown'.split(' '),
        ),
        w(
            'onCompositionUpdate',
            'compositionupdate focusout keydown keypress keyup mousedown'.split(' '),
        ));
    var ur =
            'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
                ' ',
            ),
        Od = new Set('cancel close invalid load scroll toggle'.split(' ').concat(ur));
    function cs(e, t, n) {
        var r = e.type || 'unknown-event';
        ((e.currentTarget = n), zc(r, t, void 0, e), (e.currentTarget = null));
    }
    function ds(e, t) {
        t = (t & 4) !== 0;
        for (var n = 0; n < e.length; n++) {
            var r = e[n],
                l = r.event;
            r = r.listeners;
            e: {
                var i = void 0;
                if (t)
                    for (var a = r.length - 1; 0 <= a; a--) {
                        var d = r[a],
                            f = d.instance,
                            k = d.currentTarget;
                        if (((d = d.listener), f !== i && l.isPropagationStopped())) break e;
                        (cs(l, d, k), (i = f));
                    }
                else
                    for (a = 0; a < r.length; a++) {
                        if (
                            ((d = r[a]),
                            (f = d.instance),
                            (k = d.currentTarget),
                            (d = d.listener),
                            f !== i && l.isPropagationStopped())
                        )
                            break e;
                        (cs(l, d, k), (i = f));
                    }
            }
        }
        if (Dr) throw ((e = li), (Dr = !1), (li = null), e);
    }
    function ce(e, t) {
        var n = t[Mi];
        n === void 0 && (n = t[Mi] = new Set());
        var r = e + '__bubble';
        n.has(r) || (fs(t, e, 2, !1), n.add(r));
    }
    function _i(e, t, n) {
        var r = 0;
        (t && (r |= 4), fs(n, e, r, t));
    }
    var br = '_reactListening' + Math.random().toString(36).slice(2);
    function cr(e) {
        if (!e[br]) {
            ((e[br] = !0),
                p.forEach(function (n) {
                    n !== 'selectionchange' && (Od.has(n) || _i(n, !1, e), _i(n, !0, e));
                }));
            var t = e.nodeType === 9 ? e : e.ownerDocument;
            t === null || t[br] || ((t[br] = !0), _i('selectionchange', !1, t));
        }
    }
    function fs(e, t, n, r) {
        switch (Ma(t)) {
            case 1:
                var l = Xc;
                break;
            case 4:
                l = Gc;
                break;
            default:
                l = di;
        }
        ((n = l.bind(null, t, n, e)),
            (l = void 0),
            !ri || (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') || (l = !0),
            r
                ? l !== void 0
                    ? e.addEventListener(t, n, { capture: !0, passive: l })
                    : e.addEventListener(t, n, !0)
                : l !== void 0
                  ? e.addEventListener(t, n, { passive: l })
                  : e.addEventListener(t, n, !1));
    }
    function Li(e, t, n, r, l) {
        var i = r;
        if ((t & 1) === 0 && (t & 2) === 0 && r !== null)
            e: for (;;) {
                if (r === null) return;
                var a = r.tag;
                if (a === 3 || a === 4) {
                    var d = r.stateNode.containerInfo;
                    if (d === l || (d.nodeType === 8 && d.parentNode === l)) break;
                    if (a === 4)
                        for (a = r.return; a !== null; ) {
                            var f = a.tag;
                            if (
                                (f === 3 || f === 4) &&
                                ((f = a.stateNode.containerInfo),
                                f === l || (f.nodeType === 8 && f.parentNode === l))
                            )
                                return;
                            a = a.return;
                        }
                    for (; d !== null; ) {
                        if (((a = tn(d)), a === null)) return;
                        if (((f = a.tag), f === 5 || f === 6)) {
                            r = i = a;
                            continue e;
                        }
                        d = d.parentNode;
                    }
                }
                r = r.return;
            }
        va(function () {
            var k = i,
                P = ei(n),
                _ = [];
            e: {
                var E = ss.get(e);
                if (E !== void 0) {
                    var F = mi,
                        A = e;
                    switch (e) {
                        case 'keypress':
                            if (Yr(n) === 0) break e;
                        case 'keydown':
                        case 'keyup':
                            F = cd;
                            break;
                        case 'focusin':
                            ((A = 'focus'), (F = vi));
                            break;
                        case 'focusout':
                            ((A = 'blur'), (F = vi));
                            break;
                        case 'beforeblur':
                        case 'afterblur':
                            F = vi;
                            break;
                        case 'click':
                            if (n.button === 2) break e;
                        case 'auxclick':
                        case 'dblclick':
                        case 'mousedown':
                        case 'mousemove':
                        case 'mouseup':
                        case 'mouseout':
                        case 'mouseover':
                        case 'contextmenu':
                            F = Ua;
                            break;
                        case 'drag':
                        case 'dragend':
                        case 'dragenter':
                        case 'dragexit':
                        case 'dragleave':
                        case 'dragover':
                        case 'dragstart':
                        case 'drop':
                            F = qc;
                            break;
                        case 'touchcancel':
                        case 'touchend':
                        case 'touchmove':
                        case 'touchstart':
                            F = pd;
                            break;
                        case ls:
                        case is:
                        case os:
                            F = td;
                            break;
                        case as:
                            F = hd;
                            break;
                        case 'scroll':
                            F = Jc;
                            break;
                        case 'wheel':
                            F = vd;
                            break;
                        case 'copy':
                        case 'cut':
                        case 'paste':
                            F = rd;
                            break;
                        case 'gotpointercapture':
                        case 'lostpointercapture':
                        case 'pointercancel':
                        case 'pointerdown':
                        case 'pointermove':
                        case 'pointerout':
                        case 'pointerover':
                        case 'pointerup':
                            F = $a;
                    }
                    var W = (t & 4) !== 0,
                        xe = !W && e === 'scroll',
                        v = W ? (E !== null ? E + 'Capture' : null) : E;
                    W = [];
                    for (var m = k, y; m !== null; ) {
                        y = m;
                        var R = y.stateNode;
                        if (
                            (y.tag === 5 &&
                                R !== null &&
                                ((y = R),
                                v !== null && ((R = Kn(m, v)), R != null && W.push(dr(m, R, y)))),
                            xe)
                        )
                            break;
                        m = m.return;
                    }
                    0 < W.length &&
                        ((E = new F(E, A, null, n, P)), _.push({ event: E, listeners: W }));
                }
            }
            if ((t & 7) === 0) {
                e: {
                    if (
                        ((E = e === 'mouseover' || e === 'pointerover'),
                        (F = e === 'mouseout' || e === 'pointerout'),
                        E && n !== bl && (A = n.relatedTarget || n.fromElement) && (tn(A) || A[wt]))
                    )
                        break e;
                    if (
                        (F || E) &&
                        ((E =
                            P.window === P
                                ? P
                                : (E = P.ownerDocument)
                                  ? E.defaultView || E.parentWindow
                                  : window),
                        F
                            ? ((A = n.relatedTarget || n.toElement),
                              (F = k),
                              (A = A ? tn(A) : null),
                              A !== null &&
                                  ((xe = en(A)), A !== xe || (A.tag !== 5 && A.tag !== 6)) &&
                                  (A = null))
                            : ((F = null), (A = k)),
                        F !== A)
                    ) {
                        if (
                            ((W = Ua),
                            (R = 'onMouseLeave'),
                            (v = 'onMouseEnter'),
                            (m = 'mouse'),
                            (e === 'pointerout' || e === 'pointerover') &&
                                ((W = $a),
                                (R = 'onPointerLeave'),
                                (v = 'onPointerEnter'),
                                (m = 'pointer')),
                            (xe = F == null ? E : En(F)),
                            (y = A == null ? E : En(A)),
                            (E = new W(R, m + 'leave', F, n, P)),
                            (E.target = xe),
                            (E.relatedTarget = y),
                            (R = null),
                            tn(P) === k &&
                                ((W = new W(v, m + 'enter', A, n, P)),
                                (W.target = y),
                                (W.relatedTarget = xe),
                                (R = W)),
                            (xe = R),
                            F && A)
                        )
                            t: {
                                for (W = F, v = A, m = 0, y = W; y; y = Nn(y)) m++;
                                for (y = 0, R = v; R; R = Nn(R)) y++;
                                for (; 0 < m - y; ) ((W = Nn(W)), m--);
                                for (; 0 < y - m; ) ((v = Nn(v)), y--);
                                for (; m--; ) {
                                    if (W === v || (v !== null && W === v.alternate)) break t;
                                    ((W = Nn(W)), (v = Nn(v)));
                                }
                                W = null;
                            }
                        else W = null;
                        (F !== null && ps(_, E, F, W, !1),
                            A !== null && xe !== null && ps(_, xe, A, W, !0));
                    }
                }
                e: {
                    if (
                        ((E = k ? En(k) : window),
                        (F = E.nodeName && E.nodeName.toLowerCase()),
                        F === 'select' || (F === 'input' && E.type === 'file'))
                    )
                        var V = jd;
                    else if (Ka(E))
                        if (Xa) V = _d;
                        else {
                            V = Cd;
                            var H = Ed;
                        }
                    else
                        (F = E.nodeName) &&
                            F.toLowerCase() === 'input' &&
                            (E.type === 'checkbox' || E.type === 'radio') &&
                            (V = Pd);
                    if (V && (V = V(e, k))) {
                        Ya(_, V, n, P);
                        break e;
                    }
                    (H && H(e, E, k),
                        e === 'focusout' &&
                            (H = E._wrapperState) &&
                            H.controlled &&
                            E.type === 'number' &&
                            Xl(E, 'number', E.value));
                }
                switch (((H = k ? En(k) : window), e)) {
                    case 'focusin':
                        (Ka(H) || H.contentEditable === 'true') &&
                            ((kn = H), (Ni = k), (sr = null));
                        break;
                    case 'focusout':
                        sr = Ni = kn = null;
                        break;
                    case 'mousedown':
                        ji = !0;
                        break;
                    case 'contextmenu':
                    case 'mouseup':
                    case 'dragend':
                        ((ji = !1), ns(_, n, P));
                        break;
                    case 'selectionchange':
                        if (Td) break;
                    case 'keydown':
                    case 'keyup':
                        ns(_, n, P);
                }
                var Q;
                if (xi)
                    e: {
                        switch (e) {
                            case 'compositionstart':
                                var X = 'onCompositionStart';
                                break e;
                            case 'compositionend':
                                X = 'onCompositionEnd';
                                break e;
                            case 'compositionupdate':
                                X = 'onCompositionUpdate';
                                break e;
                        }
                        X = void 0;
                    }
                else
                    wn
                        ? Ha(e, n) && (X = 'onCompositionEnd')
                        : e === 'keydown' && n.keyCode === 229 && (X = 'onCompositionStart');
                (X &&
                    (Aa &&
                        n.locale !== 'ko' &&
                        (wn || X !== 'onCompositionStart'
                            ? X === 'onCompositionEnd' && wn && (Q = Da())
                            : ((Ot = P),
                              (pi = 'value' in Ot ? Ot.value : Ot.textContent),
                              (wn = !0))),
                    (H = el(k, X)),
                    0 < H.length &&
                        ((X = new Ba(X, e, null, n, P)),
                        _.push({ event: X, listeners: H }),
                        Q ? (X.data = Q) : ((Q = Qa(n)), Q !== null && (X.data = Q)))),
                    (Q = xd ? wd(e, n) : kd(e, n)) &&
                        ((k = el(k, 'onBeforeInput')),
                        0 < k.length &&
                            ((P = new Ba('onBeforeInput', 'beforeinput', null, n, P)),
                            _.push({ event: P, listeners: k }),
                            (P.data = Q))));
            }
            ds(_, t);
        });
    }
    function dr(e, t, n) {
        return { instance: e, listener: t, currentTarget: n };
    }
    function el(e, t) {
        for (var n = t + 'Capture', r = []; e !== null; ) {
            var l = e,
                i = l.stateNode;
            (l.tag === 5 &&
                i !== null &&
                ((l = i),
                (i = Kn(e, n)),
                i != null && r.unshift(dr(e, i, l)),
                (i = Kn(e, t)),
                i != null && r.push(dr(e, i, l))),
                (e = e.return));
        }
        return r;
    }
    function Nn(e) {
        if (e === null) return null;
        do e = e.return;
        while (e && e.tag !== 5);
        return e || null;
    }
    function ps(e, t, n, r, l) {
        for (var i = t._reactName, a = []; n !== null && n !== r; ) {
            var d = n,
                f = d.alternate,
                k = d.stateNode;
            if (f !== null && f === r) break;
            (d.tag === 5 &&
                k !== null &&
                ((d = k),
                l
                    ? ((f = Kn(n, i)), f != null && a.unshift(dr(n, f, d)))
                    : l || ((f = Kn(n, i)), f != null && a.push(dr(n, f, d)))),
                (n = n.return));
        }
        a.length !== 0 && e.push({ event: t, listeners: a });
    }
    var Md = /\r\n?/g,
        Dd = /\u0000|\uFFFD/g;
    function ms(e) {
        return (typeof e == 'string' ? e : '' + e)
            .replace(
                Md,
                `
`,
            )
            .replace(Dd, '');
    }
    function tl(e, t, n) {
        if (((t = ms(t)), ms(e) !== t && n)) throw Error(s(425));
    }
    function nl() {}
    var Ri = null,
        Ti = null;
    function zi(e, t) {
        return (
            e === 'textarea' ||
            e === 'noscript' ||
            typeof t.children == 'string' ||
            typeof t.children == 'number' ||
            (typeof t.dangerouslySetInnerHTML == 'object' &&
                t.dangerouslySetInnerHTML !== null &&
                t.dangerouslySetInnerHTML.__html != null)
        );
    }
    var Ii = typeof setTimeout == 'function' ? setTimeout : void 0,
        Fd = typeof clearTimeout == 'function' ? clearTimeout : void 0,
        hs = typeof Promise == 'function' ? Promise : void 0,
        Ud =
            typeof queueMicrotask == 'function'
                ? queueMicrotask
                : typeof hs < 'u'
                  ? function (e) {
                        return hs.resolve(null).then(e).catch(Bd);
                    }
                  : Ii;
    function Bd(e) {
        setTimeout(function () {
            throw e;
        });
    }
    function Oi(e, t) {
        var n = t,
            r = 0;
        do {
            var l = n.nextSibling;
            if ((e.removeChild(n), l && l.nodeType === 8))
                if (((n = l.data), n === '/$')) {
                    if (r === 0) {
                        (e.removeChild(l), tr(t));
                        return;
                    }
                    r--;
                } else (n !== '$' && n !== '$?' && n !== '$!') || r++;
            n = l;
        } while (n);
        tr(t);
    }
    function Dt(e) {
        for (; e != null; e = e.nextSibling) {
            var t = e.nodeType;
            if (t === 1 || t === 3) break;
            if (t === 8) {
                if (((t = e.data), t === '$' || t === '$!' || t === '$?')) break;
                if (t === '/$') return null;
            }
        }
        return e;
    }
    function gs(e) {
        e = e.previousSibling;
        for (var t = 0; e; ) {
            if (e.nodeType === 8) {
                var n = e.data;
                if (n === '$' || n === '$!' || n === '$?') {
                    if (t === 0) return e;
                    t--;
                } else n === '/$' && t++;
            }
            e = e.previousSibling;
        }
        return null;
    }
    var jn = Math.random().toString(36).slice(2),
        ht = '__reactFiber$' + jn,
        fr = '__reactProps$' + jn,
        wt = '__reactContainer$' + jn,
        Mi = '__reactEvents$' + jn,
        $d = '__reactListeners$' + jn,
        Ad = '__reactHandles$' + jn;
    function tn(e) {
        var t = e[ht];
        if (t) return t;
        for (var n = e.parentNode; n; ) {
            if ((t = n[wt] || n[ht])) {
                if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
                    for (e = gs(e); e !== null; ) {
                        if ((n = e[ht])) return n;
                        e = gs(e);
                    }
                return t;
            }
            ((e = n), (n = e.parentNode));
        }
        return null;
    }
    function pr(e) {
        return (
            (e = e[ht] || e[wt]),
            !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
        );
    }
    function En(e) {
        if (e.tag === 5 || e.tag === 6) return e.stateNode;
        throw Error(s(33));
    }
    function rl(e) {
        return e[fr] || null;
    }
    var Di = [],
        Cn = -1;
    function Ft(e) {
        return { current: e };
    }
    function de(e) {
        0 > Cn || ((e.current = Di[Cn]), (Di[Cn] = null), Cn--);
    }
    function ue(e, t) {
        (Cn++, (Di[Cn] = e.current), (e.current = t));
    }
    var Ut = {},
        Re = Ft(Ut),
        Be = Ft(!1),
        nn = Ut;
    function Pn(e, t) {
        var n = e.type.contextTypes;
        if (!n) return Ut;
        var r = e.stateNode;
        if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
            return r.__reactInternalMemoizedMaskedChildContext;
        var l = {},
            i;
        for (i in n) l[i] = t[i];
        return (
            r &&
                ((e = e.stateNode),
                (e.__reactInternalMemoizedUnmaskedChildContext = t),
                (e.__reactInternalMemoizedMaskedChildContext = l)),
            l
        );
    }
    function $e(e) {
        return ((e = e.childContextTypes), e != null);
    }
    function ll() {
        (de(Be), de(Re));
    }
    function vs(e, t, n) {
        if (Re.current !== Ut) throw Error(s(168));
        (ue(Re, t), ue(Be, n));
    }
    function ys(e, t, n) {
        var r = e.stateNode;
        if (((t = t.childContextTypes), typeof r.getChildContext != 'function')) return n;
        r = r.getChildContext();
        for (var l in r) if (!(l in t)) throw Error(s(108, se(e) || 'Unknown', l));
        return B({}, n, r);
    }
    function il(e) {
        return (
            (e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || Ut),
            (nn = Re.current),
            ue(Re, e),
            ue(Be, Be.current),
            !0
        );
    }
    function xs(e, t, n) {
        var r = e.stateNode;
        if (!r) throw Error(s(169));
        (n
            ? ((e = ys(e, t, nn)),
              (r.__reactInternalMemoizedMergedChildContext = e),
              de(Be),
              de(Re),
              ue(Re, e))
            : de(Be),
            ue(Be, n));
    }
    var kt = null,
        ol = !1,
        Fi = !1;
    function ws(e) {
        kt === null ? (kt = [e]) : kt.push(e);
    }
    function Wd(e) {
        ((ol = !0), ws(e));
    }
    function Bt() {
        if (!Fi && kt !== null) {
            Fi = !0;
            var e = 0,
                t = le;
            try {
                var n = kt;
                for (le = 1; e < n.length; e++) {
                    var r = n[e];
                    do r = r(!0);
                    while (r !== null);
                }
                ((kt = null), (ol = !1));
            } catch (l) {
                throw (kt !== null && (kt = kt.slice(e + 1)), Sa(ii, Bt), l);
            } finally {
                ((le = t), (Fi = !1));
            }
        }
        return null;
    }
    var _n = [],
        Ln = 0,
        al = null,
        sl = 0,
        qe = [],
        be = 0,
        rn = null,
        St = 1,
        Nt = '';
    function ln(e, t) {
        ((_n[Ln++] = sl), (_n[Ln++] = al), (al = e), (sl = t));
    }
    function ks(e, t, n) {
        ((qe[be++] = St), (qe[be++] = Nt), (qe[be++] = rn), (rn = e));
        var r = St;
        e = Nt;
        var l = 32 - it(r) - 1;
        ((r &= ~(1 << l)), (n += 1));
        var i = 32 - it(t) + l;
        if (30 < i) {
            var a = l - (l % 5);
            ((i = (r & ((1 << a) - 1)).toString(32)),
                (r >>= a),
                (l -= a),
                (St = (1 << (32 - it(t) + l)) | (n << l) | r),
                (Nt = i + e));
        } else ((St = (1 << i) | (n << l) | r), (Nt = e));
    }
    function Ui(e) {
        e.return !== null && (ln(e, 1), ks(e, 1, 0));
    }
    function Bi(e) {
        for (; e === al; ) ((al = _n[--Ln]), (_n[Ln] = null), (sl = _n[--Ln]), (_n[Ln] = null));
        for (; e === rn; )
            ((rn = qe[--be]),
                (qe[be] = null),
                (Nt = qe[--be]),
                (qe[be] = null),
                (St = qe[--be]),
                (qe[be] = null));
    }
    var Xe = null,
        Ge = null,
        pe = !1,
        at = null;
    function Ss(e, t) {
        var n = rt(5, null, null, 0);
        ((n.elementType = 'DELETED'),
            (n.stateNode = t),
            (n.return = e),
            (t = e.deletions),
            t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
    }
    function Ns(e, t) {
        switch (e.tag) {
            case 5:
                var n = e.type;
                return (
                    (t =
                        t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase()
                            ? null
                            : t),
                    t !== null ? ((e.stateNode = t), (Xe = e), (Ge = Dt(t.firstChild)), !0) : !1
                );
            case 6:
                return (
                    (t = e.pendingProps === '' || t.nodeType !== 3 ? null : t),
                    t !== null ? ((e.stateNode = t), (Xe = e), (Ge = null), !0) : !1
                );
            case 13:
                return (
                    (t = t.nodeType !== 8 ? null : t),
                    t !== null
                        ? ((n = rn !== null ? { id: St, overflow: Nt } : null),
                          (e.memoizedState = {
                              dehydrated: t,
                              treeContext: n,
                              retryLane: 1073741824,
                          }),
                          (n = rt(18, null, null, 0)),
                          (n.stateNode = t),
                          (n.return = e),
                          (e.child = n),
                          (Xe = e),
                          (Ge = null),
                          !0)
                        : !1
                );
            default:
                return !1;
        }
    }
    function $i(e) {
        return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
    }
    function Ai(e) {
        if (pe) {
            var t = Ge;
            if (t) {
                var n = t;
                if (!Ns(e, t)) {
                    if ($i(e)) throw Error(s(418));
                    t = Dt(n.nextSibling);
                    var r = Xe;
                    t && Ns(e, t)
                        ? Ss(r, n)
                        : ((e.flags = (e.flags & -4097) | 2), (pe = !1), (Xe = e));
                }
            } else {
                if ($i(e)) throw Error(s(418));
                ((e.flags = (e.flags & -4097) | 2), (pe = !1), (Xe = e));
            }
        }
    }
    function js(e) {
        for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
        Xe = e;
    }
    function ul(e) {
        if (e !== Xe) return !1;
        if (!pe) return (js(e), (pe = !0), !1);
        var t;
        if (
            ((t = e.tag !== 3) &&
                !(t = e.tag !== 5) &&
                ((t = e.type), (t = t !== 'head' && t !== 'body' && !zi(e.type, e.memoizedProps))),
            t && (t = Ge))
        ) {
            if ($i(e)) throw (Es(), Error(s(418)));
            for (; t; ) (Ss(e, t), (t = Dt(t.nextSibling)));
        }
        if ((js(e), e.tag === 13)) {
            if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
                throw Error(s(317));
            e: {
                for (e = e.nextSibling, t = 0; e; ) {
                    if (e.nodeType === 8) {
                        var n = e.data;
                        if (n === '/$') {
                            if (t === 0) {
                                Ge = Dt(e.nextSibling);
                                break e;
                            }
                            t--;
                        } else (n !== '$' && n !== '$!' && n !== '$?') || t++;
                    }
                    e = e.nextSibling;
                }
                Ge = null;
            }
        } else Ge = Xe ? Dt(e.stateNode.nextSibling) : null;
        return !0;
    }
    function Es() {
        for (var e = Ge; e; ) e = Dt(e.nextSibling);
    }
    function Rn() {
        ((Ge = Xe = null), (pe = !1));
    }
    function Wi(e) {
        at === null ? (at = [e]) : at.push(e);
    }
    var Vd = ae.ReactCurrentBatchConfig;
    function mr(e, t, n) {
        if (((e = n.ref), e !== null && typeof e != 'function' && typeof e != 'object')) {
            if (n._owner) {
                if (((n = n._owner), n)) {
                    if (n.tag !== 1) throw Error(s(309));
                    var r = n.stateNode;
                }
                if (!r) throw Error(s(147, e));
                var l = r,
                    i = '' + e;
                return t !== null &&
                    t.ref !== null &&
                    typeof t.ref == 'function' &&
                    t.ref._stringRef === i
                    ? t.ref
                    : ((t = function (a) {
                          var d = l.refs;
                          a === null ? delete d[i] : (d[i] = a);
                      }),
                      (t._stringRef = i),
                      t);
            }
            if (typeof e != 'string') throw Error(s(284));
            if (!n._owner) throw Error(s(290, e));
        }
        return e;
    }
    function cl(e, t) {
        throw (
            (e = Object.prototype.toString.call(t)),
            Error(
                s(
                    31,
                    e === '[object Object]'
                        ? 'object with keys {' + Object.keys(t).join(', ') + '}'
                        : e,
                ),
            )
        );
    }
    function Cs(e) {
        var t = e._init;
        return t(e._payload);
    }
    function Ps(e) {
        function t(v, m) {
            if (e) {
                var y = v.deletions;
                y === null ? ((v.deletions = [m]), (v.flags |= 16)) : y.push(m);
            }
        }
        function n(v, m) {
            if (!e) return null;
            for (; m !== null; ) (t(v, m), (m = m.sibling));
            return null;
        }
        function r(v, m) {
            for (v = new Map(); m !== null; )
                (m.key !== null ? v.set(m.key, m) : v.set(m.index, m), (m = m.sibling));
            return v;
        }
        function l(v, m) {
            return ((v = Yt(v, m)), (v.index = 0), (v.sibling = null), v);
        }
        function i(v, m, y) {
            return (
                (v.index = y),
                e
                    ? ((y = v.alternate),
                      y !== null
                          ? ((y = y.index), y < m ? ((v.flags |= 2), m) : y)
                          : ((v.flags |= 2), m))
                    : ((v.flags |= 1048576), m)
            );
        }
        function a(v) {
            return (e && v.alternate === null && (v.flags |= 2), v);
        }
        function d(v, m, y, R) {
            return m === null || m.tag !== 6
                ? ((m = Oo(y, v.mode, R)), (m.return = v), m)
                : ((m = l(m, y)), (m.return = v), m);
        }
        function f(v, m, y, R) {
            var V = y.type;
            return V === Fe
                ? P(v, m, y.props.children, R, y.key)
                : m !== null &&
                    (m.elementType === V ||
                        (typeof V == 'object' &&
                            V !== null &&
                            V.$$typeof === Ue &&
                            Cs(V) === m.type))
                  ? ((R = l(m, y.props)), (R.ref = mr(v, m, y)), (R.return = v), R)
                  : ((R = Ol(y.type, y.key, y.props, null, v.mode, R)),
                    (R.ref = mr(v, m, y)),
                    (R.return = v),
                    R);
        }
        function k(v, m, y, R) {
            return m === null ||
                m.tag !== 4 ||
                m.stateNode.containerInfo !== y.containerInfo ||
                m.stateNode.implementation !== y.implementation
                ? ((m = Mo(y, v.mode, R)), (m.return = v), m)
                : ((m = l(m, y.children || [])), (m.return = v), m);
        }
        function P(v, m, y, R, V) {
            return m === null || m.tag !== 7
                ? ((m = pn(y, v.mode, R, V)), (m.return = v), m)
                : ((m = l(m, y)), (m.return = v), m);
        }
        function _(v, m, y) {
            if ((typeof m == 'string' && m !== '') || typeof m == 'number')
                return ((m = Oo('' + m, v.mode, y)), (m.return = v), m);
            if (typeof m == 'object' && m !== null) {
                switch (m.$$typeof) {
                    case je:
                        return (
                            (y = Ol(m.type, m.key, m.props, null, v.mode, y)),
                            (y.ref = mr(v, null, m)),
                            (y.return = v),
                            y
                        );
                    case Oe:
                        return ((m = Mo(m, v.mode, y)), (m.return = v), m);
                    case Ue:
                        var R = m._init;
                        return _(v, R(m._payload), y);
                }
                if (Vn(m) || Y(m)) return ((m = pn(m, v.mode, y, null)), (m.return = v), m);
                cl(v, m);
            }
            return null;
        }
        function E(v, m, y, R) {
            var V = m !== null ? m.key : null;
            if ((typeof y == 'string' && y !== '') || typeof y == 'number')
                return V !== null ? null : d(v, m, '' + y, R);
            if (typeof y == 'object' && y !== null) {
                switch (y.$$typeof) {
                    case je:
                        return y.key === V ? f(v, m, y, R) : null;
                    case Oe:
                        return y.key === V ? k(v, m, y, R) : null;
                    case Ue:
                        return ((V = y._init), E(v, m, V(y._payload), R));
                }
                if (Vn(y) || Y(y)) return V !== null ? null : P(v, m, y, R, null);
                cl(v, y);
            }
            return null;
        }
        function F(v, m, y, R, V) {
            if ((typeof R == 'string' && R !== '') || typeof R == 'number')
                return ((v = v.get(y) || null), d(m, v, '' + R, V));
            if (typeof R == 'object' && R !== null) {
                switch (R.$$typeof) {
                    case je:
                        return ((v = v.get(R.key === null ? y : R.key) || null), f(m, v, R, V));
                    case Oe:
                        return ((v = v.get(R.key === null ? y : R.key) || null), k(m, v, R, V));
                    case Ue:
                        var H = R._init;
                        return F(v, m, y, H(R._payload), V);
                }
                if (Vn(R) || Y(R)) return ((v = v.get(y) || null), P(m, v, R, V, null));
                cl(m, R);
            }
            return null;
        }
        function A(v, m, y, R) {
            for (
                var V = null, H = null, Q = m, X = (m = 0), Pe = null;
                Q !== null && X < y.length;
                X++
            ) {
                Q.index > X ? ((Pe = Q), (Q = null)) : (Pe = Q.sibling);
                var te = E(v, Q, y[X], R);
                if (te === null) {
                    Q === null && (Q = Pe);
                    break;
                }
                (e && Q && te.alternate === null && t(v, Q),
                    (m = i(te, m, X)),
                    H === null ? (V = te) : (H.sibling = te),
                    (H = te),
                    (Q = Pe));
            }
            if (X === y.length) return (n(v, Q), pe && ln(v, X), V);
            if (Q === null) {
                for (; X < y.length; X++)
                    ((Q = _(v, y[X], R)),
                        Q !== null &&
                            ((m = i(Q, m, X)), H === null ? (V = Q) : (H.sibling = Q), (H = Q)));
                return (pe && ln(v, X), V);
            }
            for (Q = r(v, Q); X < y.length; X++)
                ((Pe = F(Q, v, X, y[X], R)),
                    Pe !== null &&
                        (e && Pe.alternate !== null && Q.delete(Pe.key === null ? X : Pe.key),
                        (m = i(Pe, m, X)),
                        H === null ? (V = Pe) : (H.sibling = Pe),
                        (H = Pe)));
            return (
                e &&
                    Q.forEach(function (Xt) {
                        return t(v, Xt);
                    }),
                pe && ln(v, X),
                V
            );
        }
        function W(v, m, y, R) {
            var V = Y(y);
            if (typeof V != 'function') throw Error(s(150));
            if (((y = V.call(y)), y == null)) throw Error(s(151));
            for (
                var H = (V = null), Q = m, X = (m = 0), Pe = null, te = y.next();
                Q !== null && !te.done;
                X++, te = y.next()
            ) {
                Q.index > X ? ((Pe = Q), (Q = null)) : (Pe = Q.sibling);
                var Xt = E(v, Q, te.value, R);
                if (Xt === null) {
                    Q === null && (Q = Pe);
                    break;
                }
                (e && Q && Xt.alternate === null && t(v, Q),
                    (m = i(Xt, m, X)),
                    H === null ? (V = Xt) : (H.sibling = Xt),
                    (H = Xt),
                    (Q = Pe));
            }
            if (te.done) return (n(v, Q), pe && ln(v, X), V);
            if (Q === null) {
                for (; !te.done; X++, te = y.next())
                    ((te = _(v, te.value, R)),
                        te !== null &&
                            ((m = i(te, m, X)),
                            H === null ? (V = te) : (H.sibling = te),
                            (H = te)));
                return (pe && ln(v, X), V);
            }
            for (Q = r(v, Q); !te.done; X++, te = y.next())
                ((te = F(Q, v, X, te.value, R)),
                    te !== null &&
                        (e && te.alternate !== null && Q.delete(te.key === null ? X : te.key),
                        (m = i(te, m, X)),
                        H === null ? (V = te) : (H.sibling = te),
                        (H = te)));
            return (
                e &&
                    Q.forEach(function (Nf) {
                        return t(v, Nf);
                    }),
                pe && ln(v, X),
                V
            );
        }
        function xe(v, m, y, R) {
            if (
                (typeof y == 'object' &&
                    y !== null &&
                    y.type === Fe &&
                    y.key === null &&
                    (y = y.props.children),
                typeof y == 'object' && y !== null)
            ) {
                switch (y.$$typeof) {
                    case je:
                        e: {
                            for (var V = y.key, H = m; H !== null; ) {
                                if (H.key === V) {
                                    if (((V = y.type), V === Fe)) {
                                        if (H.tag === 7) {
                                            (n(v, H.sibling),
                                                (m = l(H, y.props.children)),
                                                (m.return = v),
                                                (v = m));
                                            break e;
                                        }
                                    } else if (
                                        H.elementType === V ||
                                        (typeof V == 'object' &&
                                            V !== null &&
                                            V.$$typeof === Ue &&
                                            Cs(V) === H.type)
                                    ) {
                                        (n(v, H.sibling),
                                            (m = l(H, y.props)),
                                            (m.ref = mr(v, H, y)),
                                            (m.return = v),
                                            (v = m));
                                        break e;
                                    }
                                    n(v, H);
                                    break;
                                } else t(v, H);
                                H = H.sibling;
                            }
                            y.type === Fe
                                ? ((m = pn(y.props.children, v.mode, R, y.key)),
                                  (m.return = v),
                                  (v = m))
                                : ((R = Ol(y.type, y.key, y.props, null, v.mode, R)),
                                  (R.ref = mr(v, m, y)),
                                  (R.return = v),
                                  (v = R));
                        }
                        return a(v);
                    case Oe:
                        e: {
                            for (H = y.key; m !== null; ) {
                                if (m.key === H)
                                    if (
                                        m.tag === 4 &&
                                        m.stateNode.containerInfo === y.containerInfo &&
                                        m.stateNode.implementation === y.implementation
                                    ) {
                                        (n(v, m.sibling),
                                            (m = l(m, y.children || [])),
                                            (m.return = v),
                                            (v = m));
                                        break e;
                                    } else {
                                        n(v, m);
                                        break;
                                    }
                                else t(v, m);
                                m = m.sibling;
                            }
                            ((m = Mo(y, v.mode, R)), (m.return = v), (v = m));
                        }
                        return a(v);
                    case Ue:
                        return ((H = y._init), xe(v, m, H(y._payload), R));
                }
                if (Vn(y)) return A(v, m, y, R);
                if (Y(y)) return W(v, m, y, R);
                cl(v, y);
            }
            return (typeof y == 'string' && y !== '') || typeof y == 'number'
                ? ((y = '' + y),
                  m !== null && m.tag === 6
                      ? (n(v, m.sibling), (m = l(m, y)), (m.return = v), (v = m))
                      : (n(v, m), (m = Oo(y, v.mode, R)), (m.return = v), (v = m)),
                  a(v))
                : n(v, m);
        }
        return xe;
    }
    var Tn = Ps(!0),
        _s = Ps(!1),
        dl = Ft(null),
        fl = null,
        zn = null,
        Vi = null;
    function Hi() {
        Vi = zn = fl = null;
    }
    function Qi(e) {
        var t = dl.current;
        (de(dl), (e._currentValue = t));
    }
    function Ki(e, t, n) {
        for (; e !== null; ) {
            var r = e.alternate;
            if (
                ((e.childLanes & t) !== t
                    ? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
                    : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
                e === n)
            )
                break;
            e = e.return;
        }
    }
    function In(e, t) {
        ((fl = e),
            (Vi = zn = null),
            (e = e.dependencies),
            e !== null &&
                e.firstContext !== null &&
                ((e.lanes & t) !== 0 && (Ae = !0), (e.firstContext = null)));
    }
    function et(e) {
        var t = e._currentValue;
        if (Vi !== e)
            if (((e = { context: e, memoizedValue: t, next: null }), zn === null)) {
                if (fl === null) throw Error(s(308));
                ((zn = e), (fl.dependencies = { lanes: 0, firstContext: e }));
            } else zn = zn.next = e;
        return t;
    }
    var on = null;
    function Yi(e) {
        on === null ? (on = [e]) : on.push(e);
    }
    function Ls(e, t, n, r) {
        var l = t.interleaved;
        return (
            l === null ? ((n.next = n), Yi(t)) : ((n.next = l.next), (l.next = n)),
            (t.interleaved = n),
            jt(e, r)
        );
    }
    function jt(e, t) {
        e.lanes |= t;
        var n = e.alternate;
        for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
            ((e.childLanes |= t),
                (n = e.alternate),
                n !== null && (n.childLanes |= t),
                (n = e),
                (e = e.return));
        return n.tag === 3 ? n.stateNode : null;
    }
    var $t = !1;
    function Xi(e) {
        e.updateQueue = {
            baseState: e.memoizedState,
            firstBaseUpdate: null,
            lastBaseUpdate: null,
            shared: { pending: null, interleaved: null, lanes: 0 },
            effects: null,
        };
    }
    function Rs(e, t) {
        ((e = e.updateQueue),
            t.updateQueue === e &&
                (t.updateQueue = {
                    baseState: e.baseState,
                    firstBaseUpdate: e.firstBaseUpdate,
                    lastBaseUpdate: e.lastBaseUpdate,
                    shared: e.shared,
                    effects: e.effects,
                }));
    }
    function Et(e, t) {
        return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
    }
    function At(e, t, n) {
        var r = e.updateQueue;
        if (r === null) return null;
        if (((r = r.shared), (q & 2) !== 0)) {
            var l = r.pending;
            return (
                l === null ? (t.next = t) : ((t.next = l.next), (l.next = t)),
                (r.pending = t),
                jt(e, n)
            );
        }
        return (
            (l = r.interleaved),
            l === null ? ((t.next = t), Yi(r)) : ((t.next = l.next), (l.next = t)),
            (r.interleaved = t),
            jt(e, n)
        );
    }
    function pl(e, t, n) {
        if (((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194240) !== 0))) {
            var r = t.lanes;
            ((r &= e.pendingLanes), (n |= r), (t.lanes = n), si(e, n));
        }
    }
    function Ts(e, t) {
        var n = e.updateQueue,
            r = e.alternate;
        if (r !== null && ((r = r.updateQueue), n === r)) {
            var l = null,
                i = null;
            if (((n = n.firstBaseUpdate), n !== null)) {
                do {
                    var a = {
                        eventTime: n.eventTime,
                        lane: n.lane,
                        tag: n.tag,
                        payload: n.payload,
                        callback: n.callback,
                        next: null,
                    };
                    (i === null ? (l = i = a) : (i = i.next = a), (n = n.next));
                } while (n !== null);
                i === null ? (l = i = t) : (i = i.next = t);
            } else l = i = t;
            ((n = {
                baseState: r.baseState,
                firstBaseUpdate: l,
                lastBaseUpdate: i,
                shared: r.shared,
                effects: r.effects,
            }),
                (e.updateQueue = n));
            return;
        }
        ((e = n.lastBaseUpdate),
            e === null ? (n.firstBaseUpdate = t) : (e.next = t),
            (n.lastBaseUpdate = t));
    }
    function ml(e, t, n, r) {
        var l = e.updateQueue;
        $t = !1;
        var i = l.firstBaseUpdate,
            a = l.lastBaseUpdate,
            d = l.shared.pending;
        if (d !== null) {
            l.shared.pending = null;
            var f = d,
                k = f.next;
            ((f.next = null), a === null ? (i = k) : (a.next = k), (a = f));
            var P = e.alternate;
            P !== null &&
                ((P = P.updateQueue),
                (d = P.lastBaseUpdate),
                d !== a &&
                    (d === null ? (P.firstBaseUpdate = k) : (d.next = k), (P.lastBaseUpdate = f)));
        }
        if (i !== null) {
            var _ = l.baseState;
            ((a = 0), (P = k = f = null), (d = i));
            do {
                var E = d.lane,
                    F = d.eventTime;
                if ((r & E) === E) {
                    P !== null &&
                        (P = P.next =
                            {
                                eventTime: F,
                                lane: 0,
                                tag: d.tag,
                                payload: d.payload,
                                callback: d.callback,
                                next: null,
                            });
                    e: {
                        var A = e,
                            W = d;
                        switch (((E = t), (F = n), W.tag)) {
                            case 1:
                                if (((A = W.payload), typeof A == 'function')) {
                                    _ = A.call(F, _, E);
                                    break e;
                                }
                                _ = A;
                                break e;
                            case 3:
                                A.flags = (A.flags & -65537) | 128;
                            case 0:
                                if (
                                    ((A = W.payload),
                                    (E = typeof A == 'function' ? A.call(F, _, E) : A),
                                    E == null)
                                )
                                    break e;
                                _ = B({}, _, E);
                                break e;
                            case 2:
                                $t = !0;
                        }
                    }
                    d.callback !== null &&
                        d.lane !== 0 &&
                        ((e.flags |= 64),
                        (E = l.effects),
                        E === null ? (l.effects = [d]) : E.push(d));
                } else
                    ((F = {
                        eventTime: F,
                        lane: E,
                        tag: d.tag,
                        payload: d.payload,
                        callback: d.callback,
                        next: null,
                    }),
                        P === null ? ((k = P = F), (f = _)) : (P = P.next = F),
                        (a |= E));
                if (((d = d.next), d === null)) {
                    if (((d = l.shared.pending), d === null)) break;
                    ((E = d),
                        (d = E.next),
                        (E.next = null),
                        (l.lastBaseUpdate = E),
                        (l.shared.pending = null));
                }
            } while (!0);
            if (
                (P === null && (f = _),
                (l.baseState = f),
                (l.firstBaseUpdate = k),
                (l.lastBaseUpdate = P),
                (t = l.shared.interleaved),
                t !== null)
            ) {
                l = t;
                do ((a |= l.lane), (l = l.next));
                while (l !== t);
            } else i === null && (l.shared.lanes = 0);
            ((un |= a), (e.lanes = a), (e.memoizedState = _));
        }
    }
    function zs(e, t, n) {
        if (((e = t.effects), (t.effects = null), e !== null))
            for (t = 0; t < e.length; t++) {
                var r = e[t],
                    l = r.callback;
                if (l !== null) {
                    if (((r.callback = null), (r = n), typeof l != 'function'))
                        throw Error(s(191, l));
                    l.call(r);
                }
            }
    }
    var hr = {},
        gt = Ft(hr),
        gr = Ft(hr),
        vr = Ft(hr);
    function an(e) {
        if (e === hr) throw Error(s(174));
        return e;
    }
    function Gi(e, t) {
        switch ((ue(vr, t), ue(gr, e), ue(gt, hr), (e = t.nodeType), e)) {
            case 9:
            case 11:
                t = (t = t.documentElement) ? t.namespaceURI : Jl(null, '');
                break;
            default:
                ((e = e === 8 ? t.parentNode : t),
                    (t = e.namespaceURI || null),
                    (e = e.tagName),
                    (t = Jl(t, e)));
        }
        (de(gt), ue(gt, t));
    }
    function On() {
        (de(gt), de(gr), de(vr));
    }
    function Is(e) {
        an(vr.current);
        var t = an(gt.current),
            n = Jl(t, e.type);
        t !== n && (ue(gr, e), ue(gt, n));
    }
    function Ji(e) {
        gr.current === e && (de(gt), de(gr));
    }
    var me = Ft(0);
    function hl(e) {
        for (var t = e; t !== null; ) {
            if (t.tag === 13) {
                var n = t.memoizedState;
                if (
                    n !== null &&
                    ((n = n.dehydrated), n === null || n.data === '$?' || n.data === '$!')
                )
                    return t;
            } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
                if ((t.flags & 128) !== 0) return t;
            } else if (t.child !== null) {
                ((t.child.return = t), (t = t.child));
                continue;
            }
            if (t === e) break;
            for (; t.sibling === null; ) {
                if (t.return === null || t.return === e) return null;
                t = t.return;
            }
            ((t.sibling.return = t.return), (t = t.sibling));
        }
        return null;
    }
    var Zi = [];
    function qi() {
        for (var e = 0; e < Zi.length; e++) Zi[e]._workInProgressVersionPrimary = null;
        Zi.length = 0;
    }
    var gl = ae.ReactCurrentDispatcher,
        bi = ae.ReactCurrentBatchConfig,
        sn = 0,
        he = null,
        Se = null,
        Ee = null,
        vl = !1,
        yr = !1,
        xr = 0,
        Hd = 0;
    function Te() {
        throw Error(s(321));
    }
    function eo(e, t) {
        if (t === null) return !1;
        for (var n = 0; n < t.length && n < e.length; n++) if (!ot(e[n], t[n])) return !1;
        return !0;
    }
    function to(e, t, n, r, l, i) {
        if (
            ((sn = i),
            (he = t),
            (t.memoizedState = null),
            (t.updateQueue = null),
            (t.lanes = 0),
            (gl.current = e === null || e.memoizedState === null ? Xd : Gd),
            (e = n(r, l)),
            yr)
        ) {
            i = 0;
            do {
                if (((yr = !1), (xr = 0), 25 <= i)) throw Error(s(301));
                ((i += 1),
                    (Ee = Se = null),
                    (t.updateQueue = null),
                    (gl.current = Jd),
                    (e = n(r, l)));
            } while (yr);
        }
        if (
            ((gl.current = wl),
            (t = Se !== null && Se.next !== null),
            (sn = 0),
            (Ee = Se = he = null),
            (vl = !1),
            t)
        )
            throw Error(s(300));
        return e;
    }
    function no() {
        var e = xr !== 0;
        return ((xr = 0), e);
    }
    function vt() {
        var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
        return (Ee === null ? (he.memoizedState = Ee = e) : (Ee = Ee.next = e), Ee);
    }
    function tt() {
        if (Se === null) {
            var e = he.alternate;
            e = e !== null ? e.memoizedState : null;
        } else e = Se.next;
        var t = Ee === null ? he.memoizedState : Ee.next;
        if (t !== null) ((Ee = t), (Se = e));
        else {
            if (e === null) throw Error(s(310));
            ((Se = e),
                (e = {
                    memoizedState: Se.memoizedState,
                    baseState: Se.baseState,
                    baseQueue: Se.baseQueue,
                    queue: Se.queue,
                    next: null,
                }),
                Ee === null ? (he.memoizedState = Ee = e) : (Ee = Ee.next = e));
        }
        return Ee;
    }
    function wr(e, t) {
        return typeof t == 'function' ? t(e) : t;
    }
    function ro(e) {
        var t = tt(),
            n = t.queue;
        if (n === null) throw Error(s(311));
        n.lastRenderedReducer = e;
        var r = Se,
            l = r.baseQueue,
            i = n.pending;
        if (i !== null) {
            if (l !== null) {
                var a = l.next;
                ((l.next = i.next), (i.next = a));
            }
            ((r.baseQueue = l = i), (n.pending = null));
        }
        if (l !== null) {
            ((i = l.next), (r = r.baseState));
            var d = (a = null),
                f = null,
                k = i;
            do {
                var P = k.lane;
                if ((sn & P) === P)
                    (f !== null &&
                        (f = f.next =
                            {
                                lane: 0,
                                action: k.action,
                                hasEagerState: k.hasEagerState,
                                eagerState: k.eagerState,
                                next: null,
                            }),
                        (r = k.hasEagerState ? k.eagerState : e(r, k.action)));
                else {
                    var _ = {
                        lane: P,
                        action: k.action,
                        hasEagerState: k.hasEagerState,
                        eagerState: k.eagerState,
                        next: null,
                    };
                    (f === null ? ((d = f = _), (a = r)) : (f = f.next = _),
                        (he.lanes |= P),
                        (un |= P));
                }
                k = k.next;
            } while (k !== null && k !== i);
            (f === null ? (a = r) : (f.next = d),
                ot(r, t.memoizedState) || (Ae = !0),
                (t.memoizedState = r),
                (t.baseState = a),
                (t.baseQueue = f),
                (n.lastRenderedState = r));
        }
        if (((e = n.interleaved), e !== null)) {
            l = e;
            do ((i = l.lane), (he.lanes |= i), (un |= i), (l = l.next));
            while (l !== e);
        } else l === null && (n.lanes = 0);
        return [t.memoizedState, n.dispatch];
    }
    function lo(e) {
        var t = tt(),
            n = t.queue;
        if (n === null) throw Error(s(311));
        n.lastRenderedReducer = e;
        var r = n.dispatch,
            l = n.pending,
            i = t.memoizedState;
        if (l !== null) {
            n.pending = null;
            var a = (l = l.next);
            do ((i = e(i, a.action)), (a = a.next));
            while (a !== l);
            (ot(i, t.memoizedState) || (Ae = !0),
                (t.memoizedState = i),
                t.baseQueue === null && (t.baseState = i),
                (n.lastRenderedState = i));
        }
        return [i, r];
    }
    function Os() {}
    function Ms(e, t) {
        var n = he,
            r = tt(),
            l = t(),
            i = !ot(r.memoizedState, l);
        if (
            (i && ((r.memoizedState = l), (Ae = !0)),
            (r = r.queue),
            io(Us.bind(null, n, r, e), [e]),
            r.getSnapshot !== t || i || (Ee !== null && Ee.memoizedState.tag & 1))
        ) {
            if (((n.flags |= 2048), kr(9, Fs.bind(null, n, r, l, t), void 0, null), Ce === null))
                throw Error(s(349));
            (sn & 30) !== 0 || Ds(n, t, l);
        }
        return l;
    }
    function Ds(e, t, n) {
        ((e.flags |= 16384),
            (e = { getSnapshot: t, value: n }),
            (t = he.updateQueue),
            t === null
                ? ((t = { lastEffect: null, stores: null }), (he.updateQueue = t), (t.stores = [e]))
                : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
    }
    function Fs(e, t, n, r) {
        ((t.value = n), (t.getSnapshot = r), Bs(t) && $s(e));
    }
    function Us(e, t, n) {
        return n(function () {
            Bs(t) && $s(e);
        });
    }
    function Bs(e) {
        var t = e.getSnapshot;
        e = e.value;
        try {
            var n = t();
            return !ot(e, n);
        } catch {
            return !0;
        }
    }
    function $s(e) {
        var t = jt(e, 1);
        t !== null && dt(t, e, 1, -1);
    }
    function As(e) {
        var t = vt();
        return (
            typeof e == 'function' && (e = e()),
            (t.memoizedState = t.baseState = e),
            (e = {
                pending: null,
                interleaved: null,
                lanes: 0,
                dispatch: null,
                lastRenderedReducer: wr,
                lastRenderedState: e,
            }),
            (t.queue = e),
            (e = e.dispatch = Yd.bind(null, he, e)),
            [t.memoizedState, e]
        );
    }
    function kr(e, t, n, r) {
        return (
            (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
            (t = he.updateQueue),
            t === null
                ? ((t = { lastEffect: null, stores: null }),
                  (he.updateQueue = t),
                  (t.lastEffect = e.next = e))
                : ((n = t.lastEffect),
                  n === null
                      ? (t.lastEffect = e.next = e)
                      : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
            e
        );
    }
    function Ws() {
        return tt().memoizedState;
    }
    function yl(e, t, n, r) {
        var l = vt();
        ((he.flags |= e), (l.memoizedState = kr(1 | t, n, void 0, r === void 0 ? null : r)));
    }
    function xl(e, t, n, r) {
        var l = tt();
        r = r === void 0 ? null : r;
        var i = void 0;
        if (Se !== null) {
            var a = Se.memoizedState;
            if (((i = a.destroy), r !== null && eo(r, a.deps))) {
                l.memoizedState = kr(t, n, i, r);
                return;
            }
        }
        ((he.flags |= e), (l.memoizedState = kr(1 | t, n, i, r)));
    }
    function Vs(e, t) {
        return yl(8390656, 8, e, t);
    }
    function io(e, t) {
        return xl(2048, 8, e, t);
    }
    function Hs(e, t) {
        return xl(4, 2, e, t);
    }
    function Qs(e, t) {
        return xl(4, 4, e, t);
    }
    function Ks(e, t) {
        if (typeof t == 'function')
            return (
                (e = e()),
                t(e),
                function () {
                    t(null);
                }
            );
        if (t != null)
            return (
                (e = e()),
                (t.current = e),
                function () {
                    t.current = null;
                }
            );
    }
    function Ys(e, t, n) {
        return ((n = n != null ? n.concat([e]) : null), xl(4, 4, Ks.bind(null, t, e), n));
    }
    function oo() {}
    function Xs(e, t) {
        var n = tt();
        t = t === void 0 ? null : t;
        var r = n.memoizedState;
        return r !== null && t !== null && eo(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e);
    }
    function Gs(e, t) {
        var n = tt();
        t = t === void 0 ? null : t;
        var r = n.memoizedState;
        return r !== null && t !== null && eo(t, r[1])
            ? r[0]
            : ((e = e()), (n.memoizedState = [e, t]), e);
    }
    function Js(e, t, n) {
        return (sn & 21) === 0
            ? (e.baseState && ((e.baseState = !1), (Ae = !0)), (e.memoizedState = n))
            : (ot(n, t) || ((n = Ca()), (he.lanes |= n), (un |= n), (e.baseState = !0)), t);
    }
    function Qd(e, t) {
        var n = le;
        ((le = n !== 0 && 4 > n ? n : 4), e(!0));
        var r = bi.transition;
        bi.transition = {};
        try {
            (e(!1), t());
        } finally {
            ((le = n), (bi.transition = r));
        }
    }
    function Zs() {
        return tt().memoizedState;
    }
    function Kd(e, t, n) {
        var r = Qt(e);
        if (((n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }), qs(e)))
            bs(t, n);
        else if (((n = Ls(e, t, n, r)), n !== null)) {
            var l = De();
            (dt(n, e, r, l), eu(n, t, r));
        }
    }
    function Yd(e, t, n) {
        var r = Qt(e),
            l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
        if (qs(e)) bs(t, l);
        else {
            var i = e.alternate;
            if (
                e.lanes === 0 &&
                (i === null || i.lanes === 0) &&
                ((i = t.lastRenderedReducer), i !== null)
            )
                try {
                    var a = t.lastRenderedState,
                        d = i(a, n);
                    if (((l.hasEagerState = !0), (l.eagerState = d), ot(d, a))) {
                        var f = t.interleaved;
                        (f === null ? ((l.next = l), Yi(t)) : ((l.next = f.next), (f.next = l)),
                            (t.interleaved = l));
                        return;
                    }
                } catch {
                } finally {
                }
            ((n = Ls(e, t, l, r)), n !== null && ((l = De()), dt(n, e, r, l), eu(n, t, r)));
        }
    }
    function qs(e) {
        var t = e.alternate;
        return e === he || (t !== null && t === he);
    }
    function bs(e, t) {
        yr = vl = !0;
        var n = e.pending;
        (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t));
    }
    function eu(e, t, n) {
        if ((n & 4194240) !== 0) {
            var r = t.lanes;
            ((r &= e.pendingLanes), (n |= r), (t.lanes = n), si(e, n));
        }
    }
    var wl = {
            readContext: et,
            useCallback: Te,
            useContext: Te,
            useEffect: Te,
            useImperativeHandle: Te,
            useInsertionEffect: Te,
            useLayoutEffect: Te,
            useMemo: Te,
            useReducer: Te,
            useRef: Te,
            useState: Te,
            useDebugValue: Te,
            useDeferredValue: Te,
            useTransition: Te,
            useMutableSource: Te,
            useSyncExternalStore: Te,
            useId: Te,
            unstable_isNewReconciler: !1,
        },
        Xd = {
            readContext: et,
            useCallback: function (e, t) {
                return ((vt().memoizedState = [e, t === void 0 ? null : t]), e);
            },
            useContext: et,
            useEffect: Vs,
            useImperativeHandle: function (e, t, n) {
                return (
                    (n = n != null ? n.concat([e]) : null),
                    yl(4194308, 4, Ks.bind(null, t, e), n)
                );
            },
            useLayoutEffect: function (e, t) {
                return yl(4194308, 4, e, t);
            },
            useInsertionEffect: function (e, t) {
                return yl(4, 2, e, t);
            },
            useMemo: function (e, t) {
                var n = vt();
                return ((t = t === void 0 ? null : t), (e = e()), (n.memoizedState = [e, t]), e);
            },
            useReducer: function (e, t, n) {
                var r = vt();
                return (
                    (t = n !== void 0 ? n(t) : t),
                    (r.memoizedState = r.baseState = t),
                    (e = {
                        pending: null,
                        interleaved: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: e,
                        lastRenderedState: t,
                    }),
                    (r.queue = e),
                    (e = e.dispatch = Kd.bind(null, he, e)),
                    [r.memoizedState, e]
                );
            },
            useRef: function (e) {
                var t = vt();
                return ((e = { current: e }), (t.memoizedState = e));
            },
            useState: As,
            useDebugValue: oo,
            useDeferredValue: function (e) {
                return (vt().memoizedState = e);
            },
            useTransition: function () {
                var e = As(!1),
                    t = e[0];
                return ((e = Qd.bind(null, e[1])), (vt().memoizedState = e), [t, e]);
            },
            useMutableSource: function () {},
            useSyncExternalStore: function (e, t, n) {
                var r = he,
                    l = vt();
                if (pe) {
                    if (n === void 0) throw Error(s(407));
                    n = n();
                } else {
                    if (((n = t()), Ce === null)) throw Error(s(349));
                    (sn & 30) !== 0 || Ds(r, t, n);
                }
                l.memoizedState = n;
                var i = { value: n, getSnapshot: t };
                return (
                    (l.queue = i),
                    Vs(Us.bind(null, r, i, e), [e]),
                    (r.flags |= 2048),
                    kr(9, Fs.bind(null, r, i, n, t), void 0, null),
                    n
                );
            },
            useId: function () {
                var e = vt(),
                    t = Ce.identifierPrefix;
                if (pe) {
                    var n = Nt,
                        r = St;
                    ((n = (r & ~(1 << (32 - it(r) - 1))).toString(32) + n),
                        (t = ':' + t + 'R' + n),
                        (n = xr++),
                        0 < n && (t += 'H' + n.toString(32)),
                        (t += ':'));
                } else ((n = Hd++), (t = ':' + t + 'r' + n.toString(32) + ':'));
                return (e.memoizedState = t);
            },
            unstable_isNewReconciler: !1,
        },
        Gd = {
            readContext: et,
            useCallback: Xs,
            useContext: et,
            useEffect: io,
            useImperativeHandle: Ys,
            useInsertionEffect: Hs,
            useLayoutEffect: Qs,
            useMemo: Gs,
            useReducer: ro,
            useRef: Ws,
            useState: function () {
                return ro(wr);
            },
            useDebugValue: oo,
            useDeferredValue: function (e) {
                var t = tt();
                return Js(t, Se.memoizedState, e);
            },
            useTransition: function () {
                var e = ro(wr)[0],
                    t = tt().memoizedState;
                return [e, t];
            },
            useMutableSource: Os,
            useSyncExternalStore: Ms,
            useId: Zs,
            unstable_isNewReconciler: !1,
        },
        Jd = {
            readContext: et,
            useCallback: Xs,
            useContext: et,
            useEffect: io,
            useImperativeHandle: Ys,
            useInsertionEffect: Hs,
            useLayoutEffect: Qs,
            useMemo: Gs,
            useReducer: lo,
            useRef: Ws,
            useState: function () {
                return lo(wr);
            },
            useDebugValue: oo,
            useDeferredValue: function (e) {
                var t = tt();
                return Se === null ? (t.memoizedState = e) : Js(t, Se.memoizedState, e);
            },
            useTransition: function () {
                var e = lo(wr)[0],
                    t = tt().memoizedState;
                return [e, t];
            },
            useMutableSource: Os,
            useSyncExternalStore: Ms,
            useId: Zs,
            unstable_isNewReconciler: !1,
        };
    function st(e, t) {
        if (e && e.defaultProps) {
            ((t = B({}, t)), (e = e.defaultProps));
            for (var n in e) t[n] === void 0 && (t[n] = e[n]);
            return t;
        }
        return t;
    }
    function ao(e, t, n, r) {
        ((t = e.memoizedState),
            (n = n(r, t)),
            (n = n == null ? t : B({}, t, n)),
            (e.memoizedState = n),
            e.lanes === 0 && (e.updateQueue.baseState = n));
    }
    var kl = {
        isMounted: function (e) {
            return (e = e._reactInternals) ? en(e) === e : !1;
        },
        enqueueSetState: function (e, t, n) {
            e = e._reactInternals;
            var r = De(),
                l = Qt(e),
                i = Et(r, l);
            ((i.payload = t),
                n != null && (i.callback = n),
                (t = At(e, i, l)),
                t !== null && (dt(t, e, l, r), pl(t, e, l)));
        },
        enqueueReplaceState: function (e, t, n) {
            e = e._reactInternals;
            var r = De(),
                l = Qt(e),
                i = Et(r, l);
            ((i.tag = 1),
                (i.payload = t),
                n != null && (i.callback = n),
                (t = At(e, i, l)),
                t !== null && (dt(t, e, l, r), pl(t, e, l)));
        },
        enqueueForceUpdate: function (e, t) {
            e = e._reactInternals;
            var n = De(),
                r = Qt(e),
                l = Et(n, r);
            ((l.tag = 2),
                t != null && (l.callback = t),
                (t = At(e, l, r)),
                t !== null && (dt(t, e, r, n), pl(t, e, r)));
        },
    };
    function tu(e, t, n, r, l, i, a) {
        return (
            (e = e.stateNode),
            typeof e.shouldComponentUpdate == 'function'
                ? e.shouldComponentUpdate(r, i, a)
                : t.prototype && t.prototype.isPureReactComponent
                  ? !ar(n, r) || !ar(l, i)
                  : !0
        );
    }
    function nu(e, t, n) {
        var r = !1,
            l = Ut,
            i = t.contextType;
        return (
            typeof i == 'object' && i !== null
                ? (i = et(i))
                : ((l = $e(t) ? nn : Re.current),
                  (r = t.contextTypes),
                  (i = (r = r != null) ? Pn(e, l) : Ut)),
            (t = new t(n, i)),
            (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
            (t.updater = kl),
            (e.stateNode = t),
            (t._reactInternals = e),
            r &&
                ((e = e.stateNode),
                (e.__reactInternalMemoizedUnmaskedChildContext = l),
                (e.__reactInternalMemoizedMaskedChildContext = i)),
            t
        );
    }
    function ru(e, t, n, r) {
        ((e = t.state),
            typeof t.componentWillReceiveProps == 'function' && t.componentWillReceiveProps(n, r),
            typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
                t.UNSAFE_componentWillReceiveProps(n, r),
            t.state !== e && kl.enqueueReplaceState(t, t.state, null));
    }
    function so(e, t, n, r) {
        var l = e.stateNode;
        ((l.props = n), (l.state = e.memoizedState), (l.refs = {}), Xi(e));
        var i = t.contextType;
        (typeof i == 'object' && i !== null
            ? (l.context = et(i))
            : ((i = $e(t) ? nn : Re.current), (l.context = Pn(e, i))),
            (l.state = e.memoizedState),
            (i = t.getDerivedStateFromProps),
            typeof i == 'function' && (ao(e, t, i, n), (l.state = e.memoizedState)),
            typeof t.getDerivedStateFromProps == 'function' ||
                typeof l.getSnapshotBeforeUpdate == 'function' ||
                (typeof l.UNSAFE_componentWillMount != 'function' &&
                    typeof l.componentWillMount != 'function') ||
                ((t = l.state),
                typeof l.componentWillMount == 'function' && l.componentWillMount(),
                typeof l.UNSAFE_componentWillMount == 'function' && l.UNSAFE_componentWillMount(),
                t !== l.state && kl.enqueueReplaceState(l, l.state, null),
                ml(e, n, l, r),
                (l.state = e.memoizedState)),
            typeof l.componentDidMount == 'function' && (e.flags |= 4194308));
    }
    function Mn(e, t) {
        try {
            var n = '',
                r = t;
            do ((n += b(r)), (r = r.return));
            while (r);
            var l = n;
        } catch (i) {
            l =
                `
Error generating stack: ` +
                i.message +
                `
` +
                i.stack;
        }
        return { value: e, source: t, stack: l, digest: null };
    }
    function uo(e, t, n) {
        return { value: e, source: null, stack: n ?? null, digest: t ?? null };
    }
    function co(e, t) {
        try {
            console.error(t.value);
        } catch (n) {
            setTimeout(function () {
                throw n;
            });
        }
    }
    var Zd = typeof WeakMap == 'function' ? WeakMap : Map;
    function lu(e, t, n) {
        ((n = Et(-1, n)), (n.tag = 3), (n.payload = { element: null }));
        var r = t.value;
        return (
            (n.callback = function () {
                (_l || ((_l = !0), (Co = r)), co(e, t));
            }),
            n
        );
    }
    function iu(e, t, n) {
        ((n = Et(-1, n)), (n.tag = 3));
        var r = e.type.getDerivedStateFromError;
        if (typeof r == 'function') {
            var l = t.value;
            ((n.payload = function () {
                return r(l);
            }),
                (n.callback = function () {
                    co(e, t);
                }));
        }
        var i = e.stateNode;
        return (
            i !== null &&
                typeof i.componentDidCatch == 'function' &&
                (n.callback = function () {
                    (co(e, t),
                        typeof r != 'function' &&
                            (Vt === null ? (Vt = new Set([this])) : Vt.add(this)));
                    var a = t.stack;
                    this.componentDidCatch(t.value, { componentStack: a !== null ? a : '' });
                }),
            n
        );
    }
    function ou(e, t, n) {
        var r = e.pingCache;
        if (r === null) {
            r = e.pingCache = new Zd();
            var l = new Set();
            r.set(t, l);
        } else ((l = r.get(t)), l === void 0 && ((l = new Set()), r.set(t, l)));
        l.has(n) || (l.add(n), (e = ff.bind(null, e, t, n)), t.then(e, e));
    }
    function au(e) {
        do {
            var t;
            if (
                ((t = e.tag === 13) &&
                    ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
                t)
            )
                return e;
            e = e.return;
        } while (e !== null);
        return null;
    }
    function su(e, t, n, r, l) {
        return (e.mode & 1) === 0
            ? (e === t
                  ? (e.flags |= 65536)
                  : ((e.flags |= 128),
                    (n.flags |= 131072),
                    (n.flags &= -52805),
                    n.tag === 1 &&
                        (n.alternate === null
                            ? (n.tag = 17)
                            : ((t = Et(-1, 1)), (t.tag = 2), At(n, t, 1))),
                    (n.lanes |= 1)),
              e)
            : ((e.flags |= 65536), (e.lanes = l), e);
    }
    var qd = ae.ReactCurrentOwner,
        Ae = !1;
    function Me(e, t, n, r) {
        t.child = e === null ? _s(t, null, n, r) : Tn(t, e.child, n, r);
    }
    function uu(e, t, n, r, l) {
        n = n.render;
        var i = t.ref;
        return (
            In(t, l),
            (r = to(e, t, n, r, i, l)),
            (n = no()),
            e !== null && !Ae
                ? ((t.updateQueue = e.updateQueue),
                  (t.flags &= -2053),
                  (e.lanes &= ~l),
                  Ct(e, t, l))
                : (pe && n && Ui(t), (t.flags |= 1), Me(e, t, r, l), t.child)
        );
    }
    function cu(e, t, n, r, l) {
        if (e === null) {
            var i = n.type;
            return typeof i == 'function' &&
                !Io(i) &&
                i.defaultProps === void 0 &&
                n.compare === null &&
                n.defaultProps === void 0
                ? ((t.tag = 15), (t.type = i), du(e, t, i, r, l))
                : ((e = Ol(n.type, null, r, t, t.mode, l)),
                  (e.ref = t.ref),
                  (e.return = t),
                  (t.child = e));
        }
        if (((i = e.child), (e.lanes & l) === 0)) {
            var a = i.memoizedProps;
            if (((n = n.compare), (n = n !== null ? n : ar), n(a, r) && e.ref === t.ref))
                return Ct(e, t, l);
        }
        return ((t.flags |= 1), (e = Yt(i, r)), (e.ref = t.ref), (e.return = t), (t.child = e));
    }
    function du(e, t, n, r, l) {
        if (e !== null) {
            var i = e.memoizedProps;
            if (ar(i, r) && e.ref === t.ref)
                if (((Ae = !1), (t.pendingProps = r = i), (e.lanes & l) !== 0))
                    (e.flags & 131072) !== 0 && (Ae = !0);
                else return ((t.lanes = e.lanes), Ct(e, t, l));
        }
        return fo(e, t, n, r, l);
    }
    function fu(e, t, n) {
        var r = t.pendingProps,
            l = r.children,
            i = e !== null ? e.memoizedState : null;
        if (r.mode === 'hidden')
            if ((t.mode & 1) === 0)
                ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
                    ue(Fn, Je),
                    (Je |= n));
            else {
                if ((n & 1073741824) === 0)
                    return (
                        (e = i !== null ? i.baseLanes | n : n),
                        (t.lanes = t.childLanes = 1073741824),
                        (t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }),
                        (t.updateQueue = null),
                        ue(Fn, Je),
                        (Je |= e),
                        null
                    );
                ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
                    (r = i !== null ? i.baseLanes : n),
                    ue(Fn, Je),
                    (Je |= r));
            }
        else
            (i !== null ? ((r = i.baseLanes | n), (t.memoizedState = null)) : (r = n),
                ue(Fn, Je),
                (Je |= r));
        return (Me(e, t, l, n), t.child);
    }
    function pu(e, t) {
        var n = t.ref;
        ((e === null && n !== null) || (e !== null && e.ref !== n)) &&
            ((t.flags |= 512), (t.flags |= 2097152));
    }
    function fo(e, t, n, r, l) {
        var i = $e(n) ? nn : Re.current;
        return (
            (i = Pn(t, i)),
            In(t, l),
            (n = to(e, t, n, r, i, l)),
            (r = no()),
            e !== null && !Ae
                ? ((t.updateQueue = e.updateQueue),
                  (t.flags &= -2053),
                  (e.lanes &= ~l),
                  Ct(e, t, l))
                : (pe && r && Ui(t), (t.flags |= 1), Me(e, t, n, l), t.child)
        );
    }
    function mu(e, t, n, r, l) {
        if ($e(n)) {
            var i = !0;
            il(t);
        } else i = !1;
        if ((In(t, l), t.stateNode === null)) (Nl(e, t), nu(t, n, r), so(t, n, r, l), (r = !0));
        else if (e === null) {
            var a = t.stateNode,
                d = t.memoizedProps;
            a.props = d;
            var f = a.context,
                k = n.contextType;
            typeof k == 'object' && k !== null
                ? (k = et(k))
                : ((k = $e(n) ? nn : Re.current), (k = Pn(t, k)));
            var P = n.getDerivedStateFromProps,
                _ = typeof P == 'function' || typeof a.getSnapshotBeforeUpdate == 'function';
            (_ ||
                (typeof a.UNSAFE_componentWillReceiveProps != 'function' &&
                    typeof a.componentWillReceiveProps != 'function') ||
                ((d !== r || f !== k) && ru(t, a, r, k)),
                ($t = !1));
            var E = t.memoizedState;
            ((a.state = E),
                ml(t, r, a, l),
                (f = t.memoizedState),
                d !== r || E !== f || Be.current || $t
                    ? (typeof P == 'function' && (ao(t, n, P, r), (f = t.memoizedState)),
                      (d = $t || tu(t, n, d, r, E, f, k))
                          ? (_ ||
                                (typeof a.UNSAFE_componentWillMount != 'function' &&
                                    typeof a.componentWillMount != 'function') ||
                                (typeof a.componentWillMount == 'function' &&
                                    a.componentWillMount(),
                                typeof a.UNSAFE_componentWillMount == 'function' &&
                                    a.UNSAFE_componentWillMount()),
                            typeof a.componentDidMount == 'function' && (t.flags |= 4194308))
                          : (typeof a.componentDidMount == 'function' && (t.flags |= 4194308),
                            (t.memoizedProps = r),
                            (t.memoizedState = f)),
                      (a.props = r),
                      (a.state = f),
                      (a.context = k),
                      (r = d))
                    : (typeof a.componentDidMount == 'function' && (t.flags |= 4194308), (r = !1)));
        } else {
            ((a = t.stateNode),
                Rs(e, t),
                (d = t.memoizedProps),
                (k = t.type === t.elementType ? d : st(t.type, d)),
                (a.props = k),
                (_ = t.pendingProps),
                (E = a.context),
                (f = n.contextType),
                typeof f == 'object' && f !== null
                    ? (f = et(f))
                    : ((f = $e(n) ? nn : Re.current), (f = Pn(t, f))));
            var F = n.getDerivedStateFromProps;
            ((P = typeof F == 'function' || typeof a.getSnapshotBeforeUpdate == 'function') ||
                (typeof a.UNSAFE_componentWillReceiveProps != 'function' &&
                    typeof a.componentWillReceiveProps != 'function') ||
                ((d !== _ || E !== f) && ru(t, a, r, f)),
                ($t = !1),
                (E = t.memoizedState),
                (a.state = E),
                ml(t, r, a, l));
            var A = t.memoizedState;
            d !== _ || E !== A || Be.current || $t
                ? (typeof F == 'function' && (ao(t, n, F, r), (A = t.memoizedState)),
                  (k = $t || tu(t, n, k, r, E, A, f) || !1)
                      ? (P ||
                            (typeof a.UNSAFE_componentWillUpdate != 'function' &&
                                typeof a.componentWillUpdate != 'function') ||
                            (typeof a.componentWillUpdate == 'function' &&
                                a.componentWillUpdate(r, A, f),
                            typeof a.UNSAFE_componentWillUpdate == 'function' &&
                                a.UNSAFE_componentWillUpdate(r, A, f)),
                        typeof a.componentDidUpdate == 'function' && (t.flags |= 4),
                        typeof a.getSnapshotBeforeUpdate == 'function' && (t.flags |= 1024))
                      : (typeof a.componentDidUpdate != 'function' ||
                            (d === e.memoizedProps && E === e.memoizedState) ||
                            (t.flags |= 4),
                        typeof a.getSnapshotBeforeUpdate != 'function' ||
                            (d === e.memoizedProps && E === e.memoizedState) ||
                            (t.flags |= 1024),
                        (t.memoizedProps = r),
                        (t.memoizedState = A)),
                  (a.props = r),
                  (a.state = A),
                  (a.context = f),
                  (r = k))
                : (typeof a.componentDidUpdate != 'function' ||
                      (d === e.memoizedProps && E === e.memoizedState) ||
                      (t.flags |= 4),
                  typeof a.getSnapshotBeforeUpdate != 'function' ||
                      (d === e.memoizedProps && E === e.memoizedState) ||
                      (t.flags |= 1024),
                  (r = !1));
        }
        return po(e, t, n, r, i, l);
    }
    function po(e, t, n, r, l, i) {
        pu(e, t);
        var a = (t.flags & 128) !== 0;
        if (!r && !a) return (l && xs(t, n, !1), Ct(e, t, i));
        ((r = t.stateNode), (qd.current = t));
        var d = a && typeof n.getDerivedStateFromError != 'function' ? null : r.render();
        return (
            (t.flags |= 1),
            e !== null && a
                ? ((t.child = Tn(t, e.child, null, i)), (t.child = Tn(t, null, d, i)))
                : Me(e, t, d, i),
            (t.memoizedState = r.state),
            l && xs(t, n, !0),
            t.child
        );
    }
    function hu(e) {
        var t = e.stateNode;
        (t.pendingContext
            ? vs(e, t.pendingContext, t.pendingContext !== t.context)
            : t.context && vs(e, t.context, !1),
            Gi(e, t.containerInfo));
    }
    function gu(e, t, n, r, l) {
        return (Rn(), Wi(l), (t.flags |= 256), Me(e, t, n, r), t.child);
    }
    var mo = { dehydrated: null, treeContext: null, retryLane: 0 };
    function ho(e) {
        return { baseLanes: e, cachePool: null, transitions: null };
    }
    function vu(e, t, n) {
        var r = t.pendingProps,
            l = me.current,
            i = !1,
            a = (t.flags & 128) !== 0,
            d;
        if (
            ((d = a) || (d = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
            d
                ? ((i = !0), (t.flags &= -129))
                : (e === null || e.memoizedState !== null) && (l |= 1),
            ue(me, l & 1),
            e === null)
        )
            return (
                Ai(t),
                (e = t.memoizedState),
                e !== null && ((e = e.dehydrated), e !== null)
                    ? ((t.mode & 1) === 0
                          ? (t.lanes = 1)
                          : e.data === '$!'
                            ? (t.lanes = 8)
                            : (t.lanes = 1073741824),
                      null)
                    : ((a = r.children),
                      (e = r.fallback),
                      i
                          ? ((r = t.mode),
                            (i = t.child),
                            (a = { mode: 'hidden', children: a }),
                            (r & 1) === 0 && i !== null
                                ? ((i.childLanes = 0), (i.pendingProps = a))
                                : (i = Ml(a, r, 0, null)),
                            (e = pn(e, r, n, null)),
                            (i.return = t),
                            (e.return = t),
                            (i.sibling = e),
                            (t.child = i),
                            (t.child.memoizedState = ho(n)),
                            (t.memoizedState = mo),
                            e)
                          : go(t, a))
            );
        if (((l = e.memoizedState), l !== null && ((d = l.dehydrated), d !== null)))
            return bd(e, t, a, r, d, l, n);
        if (i) {
            ((i = r.fallback), (a = t.mode), (l = e.child), (d = l.sibling));
            var f = { mode: 'hidden', children: r.children };
            return (
                (a & 1) === 0 && t.child !== l
                    ? ((r = t.child),
                      (r.childLanes = 0),
                      (r.pendingProps = f),
                      (t.deletions = null))
                    : ((r = Yt(l, f)), (r.subtreeFlags = l.subtreeFlags & 14680064)),
                d !== null ? (i = Yt(d, i)) : ((i = pn(i, a, n, null)), (i.flags |= 2)),
                (i.return = t),
                (r.return = t),
                (r.sibling = i),
                (t.child = r),
                (r = i),
                (i = t.child),
                (a = e.child.memoizedState),
                (a =
                    a === null
                        ? ho(n)
                        : {
                              baseLanes: a.baseLanes | n,
                              cachePool: null,
                              transitions: a.transitions,
                          }),
                (i.memoizedState = a),
                (i.childLanes = e.childLanes & ~n),
                (t.memoizedState = mo),
                r
            );
        }
        return (
            (i = e.child),
            (e = i.sibling),
            (r = Yt(i, { mode: 'visible', children: r.children })),
            (t.mode & 1) === 0 && (r.lanes = n),
            (r.return = t),
            (r.sibling = null),
            e !== null &&
                ((n = t.deletions),
                n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
            (t.child = r),
            (t.memoizedState = null),
            r
        );
    }
    function go(e, t) {
        return (
            (t = Ml({ mode: 'visible', children: t }, e.mode, 0, null)),
            (t.return = e),
            (e.child = t)
        );
    }
    function Sl(e, t, n, r) {
        return (
            r !== null && Wi(r),
            Tn(t, e.child, null, n),
            (e = go(t, t.pendingProps.children)),
            (e.flags |= 2),
            (t.memoizedState = null),
            e
        );
    }
    function bd(e, t, n, r, l, i, a) {
        if (n)
            return t.flags & 256
                ? ((t.flags &= -257), (r = uo(Error(s(422)))), Sl(e, t, a, r))
                : t.memoizedState !== null
                  ? ((t.child = e.child), (t.flags |= 128), null)
                  : ((i = r.fallback),
                    (l = t.mode),
                    (r = Ml({ mode: 'visible', children: r.children }, l, 0, null)),
                    (i = pn(i, l, a, null)),
                    (i.flags |= 2),
                    (r.return = t),
                    (i.return = t),
                    (r.sibling = i),
                    (t.child = r),
                    (t.mode & 1) !== 0 && Tn(t, e.child, null, a),
                    (t.child.memoizedState = ho(a)),
                    (t.memoizedState = mo),
                    i);
        if ((t.mode & 1) === 0) return Sl(e, t, a, null);
        if (l.data === '$!') {
            if (((r = l.nextSibling && l.nextSibling.dataset), r)) var d = r.dgst;
            return ((r = d), (i = Error(s(419))), (r = uo(i, r, void 0)), Sl(e, t, a, r));
        }
        if (((d = (a & e.childLanes) !== 0), Ae || d)) {
            if (((r = Ce), r !== null)) {
                switch (a & -a) {
                    case 4:
                        l = 2;
                        break;
                    case 16:
                        l = 8;
                        break;
                    case 64:
                    case 128:
                    case 256:
                    case 512:
                    case 1024:
                    case 2048:
                    case 4096:
                    case 8192:
                    case 16384:
                    case 32768:
                    case 65536:
                    case 131072:
                    case 262144:
                    case 524288:
                    case 1048576:
                    case 2097152:
                    case 4194304:
                    case 8388608:
                    case 16777216:
                    case 33554432:
                    case 67108864:
                        l = 32;
                        break;
                    case 536870912:
                        l = 268435456;
                        break;
                    default:
                        l = 0;
                }
                ((l = (l & (r.suspendedLanes | a)) !== 0 ? 0 : l),
                    l !== 0 && l !== i.retryLane && ((i.retryLane = l), jt(e, l), dt(r, e, l, -1)));
            }
            return (zo(), (r = uo(Error(s(421)))), Sl(e, t, a, r));
        }
        return l.data === '$?'
            ? ((t.flags |= 128),
              (t.child = e.child),
              (t = pf.bind(null, e)),
              (l._reactRetry = t),
              null)
            : ((e = i.treeContext),
              (Ge = Dt(l.nextSibling)),
              (Xe = t),
              (pe = !0),
              (at = null),
              e !== null &&
                  ((qe[be++] = St),
                  (qe[be++] = Nt),
                  (qe[be++] = rn),
                  (St = e.id),
                  (Nt = e.overflow),
                  (rn = t)),
              (t = go(t, r.children)),
              (t.flags |= 4096),
              t);
    }
    function yu(e, t, n) {
        e.lanes |= t;
        var r = e.alternate;
        (r !== null && (r.lanes |= t), Ki(e.return, t, n));
    }
    function vo(e, t, n, r, l) {
        var i = e.memoizedState;
        i === null
            ? (e.memoizedState = {
                  isBackwards: t,
                  rendering: null,
                  renderingStartTime: 0,
                  last: r,
                  tail: n,
                  tailMode: l,
              })
            : ((i.isBackwards = t),
              (i.rendering = null),
              (i.renderingStartTime = 0),
              (i.last = r),
              (i.tail = n),
              (i.tailMode = l));
    }
    function xu(e, t, n) {
        var r = t.pendingProps,
            l = r.revealOrder,
            i = r.tail;
        if ((Me(e, t, r.children, n), (r = me.current), (r & 2) !== 0))
            ((r = (r & 1) | 2), (t.flags |= 128));
        else {
            if (e !== null && (e.flags & 128) !== 0)
                e: for (e = t.child; e !== null; ) {
                    if (e.tag === 13) e.memoizedState !== null && yu(e, n, t);
                    else if (e.tag === 19) yu(e, n, t);
                    else if (e.child !== null) {
                        ((e.child.return = e), (e = e.child));
                        continue;
                    }
                    if (e === t) break e;
                    for (; e.sibling === null; ) {
                        if (e.return === null || e.return === t) break e;
                        e = e.return;
                    }
                    ((e.sibling.return = e.return), (e = e.sibling));
                }
            r &= 1;
        }
        if ((ue(me, r), (t.mode & 1) === 0)) t.memoizedState = null;
        else
            switch (l) {
                case 'forwards':
                    for (n = t.child, l = null; n !== null; )
                        ((e = n.alternate),
                            e !== null && hl(e) === null && (l = n),
                            (n = n.sibling));
                    ((n = l),
                        n === null
                            ? ((l = t.child), (t.child = null))
                            : ((l = n.sibling), (n.sibling = null)),
                        vo(t, !1, l, n, i));
                    break;
                case 'backwards':
                    for (n = null, l = t.child, t.child = null; l !== null; ) {
                        if (((e = l.alternate), e !== null && hl(e) === null)) {
                            t.child = l;
                            break;
                        }
                        ((e = l.sibling), (l.sibling = n), (n = l), (l = e));
                    }
                    vo(t, !0, n, null, i);
                    break;
                case 'together':
                    vo(t, !1, null, null, void 0);
                    break;
                default:
                    t.memoizedState = null;
            }
        return t.child;
    }
    function Nl(e, t) {
        (t.mode & 1) === 0 &&
            e !== null &&
            ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
    }
    function Ct(e, t, n) {
        if (
            (e !== null && (t.dependencies = e.dependencies),
            (un |= t.lanes),
            (n & t.childLanes) === 0)
        )
            return null;
        if (e !== null && t.child !== e.child) throw Error(s(153));
        if (t.child !== null) {
            for (
                e = t.child, n = Yt(e, e.pendingProps), t.child = n, n.return = t;
                e.sibling !== null;
            )
                ((e = e.sibling), (n = n.sibling = Yt(e, e.pendingProps)), (n.return = t));
            n.sibling = null;
        }
        return t.child;
    }
    function ef(e, t, n) {
        switch (t.tag) {
            case 3:
                (hu(t), Rn());
                break;
            case 5:
                Is(t);
                break;
            case 1:
                $e(t.type) && il(t);
                break;
            case 4:
                Gi(t, t.stateNode.containerInfo);
                break;
            case 10:
                var r = t.type._context,
                    l = t.memoizedProps.value;
                (ue(dl, r._currentValue), (r._currentValue = l));
                break;
            case 13:
                if (((r = t.memoizedState), r !== null))
                    return r.dehydrated !== null
                        ? (ue(me, me.current & 1), (t.flags |= 128), null)
                        : (n & t.child.childLanes) !== 0
                          ? vu(e, t, n)
                          : (ue(me, me.current & 1),
                            (e = Ct(e, t, n)),
                            e !== null ? e.sibling : null);
                ue(me, me.current & 1);
                break;
            case 19:
                if (((r = (n & t.childLanes) !== 0), (e.flags & 128) !== 0)) {
                    if (r) return xu(e, t, n);
                    t.flags |= 128;
                }
                if (
                    ((l = t.memoizedState),
                    l !== null && ((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
                    ue(me, me.current),
                    r)
                )
                    break;
                return null;
            case 22:
            case 23:
                return ((t.lanes = 0), fu(e, t, n));
        }
        return Ct(e, t, n);
    }
    var wu, yo, ku, Su;
    ((wu = function (e, t) {
        for (var n = t.child; n !== null; ) {
            if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
            else if (n.tag !== 4 && n.child !== null) {
                ((n.child.return = n), (n = n.child));
                continue;
            }
            if (n === t) break;
            for (; n.sibling === null; ) {
                if (n.return === null || n.return === t) return;
                n = n.return;
            }
            ((n.sibling.return = n.return), (n = n.sibling));
        }
    }),
        (yo = function () {}),
        (ku = function (e, t, n, r) {
            var l = e.memoizedProps;
            if (l !== r) {
                ((e = t.stateNode), an(gt.current));
                var i = null;
                switch (n) {
                    case 'input':
                        ((l = Kl(e, l)), (r = Kl(e, r)), (i = []));
                        break;
                    case 'select':
                        ((l = B({}, l, { value: void 0 })),
                            (r = B({}, r, { value: void 0 })),
                            (i = []));
                        break;
                    case 'textarea':
                        ((l = Gl(e, l)), (r = Gl(e, r)), (i = []));
                        break;
                    default:
                        typeof l.onClick != 'function' &&
                            typeof r.onClick == 'function' &&
                            (e.onclick = nl);
                }
                Zl(n, r);
                var a;
                n = null;
                for (k in l)
                    if (!r.hasOwnProperty(k) && l.hasOwnProperty(k) && l[k] != null)
                        if (k === 'style') {
                            var d = l[k];
                            for (a in d) d.hasOwnProperty(a) && (n || (n = {}), (n[a] = ''));
                        } else
                            k !== 'dangerouslySetInnerHTML' &&
                                k !== 'children' &&
                                k !== 'suppressContentEditableWarning' &&
                                k !== 'suppressHydrationWarning' &&
                                k !== 'autoFocus' &&
                                (h.hasOwnProperty(k) ? i || (i = []) : (i = i || []).push(k, null));
                for (k in r) {
                    var f = r[k];
                    if (
                        ((d = l != null ? l[k] : void 0),
                        r.hasOwnProperty(k) && f !== d && (f != null || d != null))
                    )
                        if (k === 'style')
                            if (d) {
                                for (a in d)
                                    !d.hasOwnProperty(a) ||
                                        (f && f.hasOwnProperty(a)) ||
                                        (n || (n = {}), (n[a] = ''));
                                for (a in f)
                                    f.hasOwnProperty(a) &&
                                        d[a] !== f[a] &&
                                        (n || (n = {}), (n[a] = f[a]));
                            } else (n || (i || (i = []), i.push(k, n)), (n = f));
                        else
                            k === 'dangerouslySetInnerHTML'
                                ? ((f = f ? f.__html : void 0),
                                  (d = d ? d.__html : void 0),
                                  f != null && d !== f && (i = i || []).push(k, f))
                                : k === 'children'
                                  ? (typeof f != 'string' && typeof f != 'number') ||
                                    (i = i || []).push(k, '' + f)
                                  : k !== 'suppressContentEditableWarning' &&
                                    k !== 'suppressHydrationWarning' &&
                                    (h.hasOwnProperty(k)
                                        ? (f != null && k === 'onScroll' && ce('scroll', e),
                                          i || d === f || (i = []))
                                        : (i = i || []).push(k, f));
                }
                n && (i = i || []).push('style', n);
                var k = i;
                (t.updateQueue = k) && (t.flags |= 4);
            }
        }),
        (Su = function (e, t, n, r) {
            n !== r && (t.flags |= 4);
        }));
    function Sr(e, t) {
        if (!pe)
            switch (e.tailMode) {
                case 'hidden':
                    t = e.tail;
                    for (var n = null; t !== null; )
                        (t.alternate !== null && (n = t), (t = t.sibling));
                    n === null ? (e.tail = null) : (n.sibling = null);
                    break;
                case 'collapsed':
                    n = e.tail;
                    for (var r = null; n !== null; )
                        (n.alternate !== null && (r = n), (n = n.sibling));
                    r === null
                        ? t || e.tail === null
                            ? (e.tail = null)
                            : (e.tail.sibling = null)
                        : (r.sibling = null);
            }
    }
    function ze(e) {
        var t = e.alternate !== null && e.alternate.child === e.child,
            n = 0,
            r = 0;
        if (t)
            for (var l = e.child; l !== null; )
                ((n |= l.lanes | l.childLanes),
                    (r |= l.subtreeFlags & 14680064),
                    (r |= l.flags & 14680064),
                    (l.return = e),
                    (l = l.sibling));
        else
            for (l = e.child; l !== null; )
                ((n |= l.lanes | l.childLanes),
                    (r |= l.subtreeFlags),
                    (r |= l.flags),
                    (l.return = e),
                    (l = l.sibling));
        return ((e.subtreeFlags |= r), (e.childLanes = n), t);
    }
    function tf(e, t, n) {
        var r = t.pendingProps;
        switch ((Bi(t), t.tag)) {
            case 2:
            case 16:
            case 15:
            case 0:
            case 11:
            case 7:
            case 8:
            case 12:
            case 9:
            case 14:
                return (ze(t), null);
            case 1:
                return ($e(t.type) && ll(), ze(t), null);
            case 3:
                return (
                    (r = t.stateNode),
                    On(),
                    de(Be),
                    de(Re),
                    qi(),
                    r.pendingContext && ((r.context = r.pendingContext), (r.pendingContext = null)),
                    (e === null || e.child === null) &&
                        (ul(t)
                            ? (t.flags |= 4)
                            : e === null ||
                              (e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
                              ((t.flags |= 1024), at !== null && (Lo(at), (at = null)))),
                    yo(e, t),
                    ze(t),
                    null
                );
            case 5:
                Ji(t);
                var l = an(vr.current);
                if (((n = t.type), e !== null && t.stateNode != null))
                    (ku(e, t, n, r, l),
                        e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
                else {
                    if (!r) {
                        if (t.stateNode === null) throw Error(s(166));
                        return (ze(t), null);
                    }
                    if (((e = an(gt.current)), ul(t))) {
                        ((r = t.stateNode), (n = t.type));
                        var i = t.memoizedProps;
                        switch (((r[ht] = t), (r[fr] = i), (e = (t.mode & 1) !== 0), n)) {
                            case 'dialog':
                                (ce('cancel', r), ce('close', r));
                                break;
                            case 'iframe':
                            case 'object':
                            case 'embed':
                                ce('load', r);
                                break;
                            case 'video':
                            case 'audio':
                                for (l = 0; l < ur.length; l++) ce(ur[l], r);
                                break;
                            case 'source':
                                ce('error', r);
                                break;
                            case 'img':
                            case 'image':
                            case 'link':
                                (ce('error', r), ce('load', r));
                                break;
                            case 'details':
                                ce('toggle', r);
                                break;
                            case 'input':
                                (na(r, i), ce('invalid', r));
                                break;
                            case 'select':
                                ((r._wrapperState = { wasMultiple: !!i.multiple }),
                                    ce('invalid', r));
                                break;
                            case 'textarea':
                                (ia(r, i), ce('invalid', r));
                        }
                        (Zl(n, i), (l = null));
                        for (var a in i)
                            if (i.hasOwnProperty(a)) {
                                var d = i[a];
                                a === 'children'
                                    ? typeof d == 'string'
                                        ? r.textContent !== d &&
                                          (i.suppressHydrationWarning !== !0 &&
                                              tl(r.textContent, d, e),
                                          (l = ['children', d]))
                                        : typeof d == 'number' &&
                                          r.textContent !== '' + d &&
                                          (i.suppressHydrationWarning !== !0 &&
                                              tl(r.textContent, d, e),
                                          (l = ['children', '' + d]))
                                    : h.hasOwnProperty(a) &&
                                      d != null &&
                                      a === 'onScroll' &&
                                      ce('scroll', r);
                            }
                        switch (n) {
                            case 'input':
                                (zr(r), la(r, i, !0));
                                break;
                            case 'textarea':
                                (zr(r), aa(r));
                                break;
                            case 'select':
                            case 'option':
                                break;
                            default:
                                typeof i.onClick == 'function' && (r.onclick = nl);
                        }
                        ((r = l), (t.updateQueue = r), r !== null && (t.flags |= 4));
                    } else {
                        ((a = l.nodeType === 9 ? l : l.ownerDocument),
                            e === 'http://www.w3.org/1999/xhtml' && (e = sa(n)),
                            e === 'http://www.w3.org/1999/xhtml'
                                ? n === 'script'
                                    ? ((e = a.createElement('div')),
                                      (e.innerHTML = '<script><\/script>'),
                                      (e = e.removeChild(e.firstChild)))
                                    : typeof r.is == 'string'
                                      ? (e = a.createElement(n, { is: r.is }))
                                      : ((e = a.createElement(n)),
                                        n === 'select' &&
                                            ((a = e),
                                            r.multiple
                                                ? (a.multiple = !0)
                                                : r.size && (a.size = r.size)))
                                : (e = a.createElementNS(e, n)),
                            (e[ht] = t),
                            (e[fr] = r),
                            wu(e, t, !1, !1),
                            (t.stateNode = e));
                        e: {
                            switch (((a = ql(n, r)), n)) {
                                case 'dialog':
                                    (ce('cancel', e), ce('close', e), (l = r));
                                    break;
                                case 'iframe':
                                case 'object':
                                case 'embed':
                                    (ce('load', e), (l = r));
                                    break;
                                case 'video':
                                case 'audio':
                                    for (l = 0; l < ur.length; l++) ce(ur[l], e);
                                    l = r;
                                    break;
                                case 'source':
                                    (ce('error', e), (l = r));
                                    break;
                                case 'img':
                                case 'image':
                                case 'link':
                                    (ce('error', e), ce('load', e), (l = r));
                                    break;
                                case 'details':
                                    (ce('toggle', e), (l = r));
                                    break;
                                case 'input':
                                    (na(e, r), (l = Kl(e, r)), ce('invalid', e));
                                    break;
                                case 'option':
                                    l = r;
                                    break;
                                case 'select':
                                    ((e._wrapperState = { wasMultiple: !!r.multiple }),
                                        (l = B({}, r, { value: void 0 })),
                                        ce('invalid', e));
                                    break;
                                case 'textarea':
                                    (ia(e, r), (l = Gl(e, r)), ce('invalid', e));
                                    break;
                                default:
                                    l = r;
                            }
                            (Zl(n, l), (d = l));
                            for (i in d)
                                if (d.hasOwnProperty(i)) {
                                    var f = d[i];
                                    i === 'style'
                                        ? da(e, f)
                                        : i === 'dangerouslySetInnerHTML'
                                          ? ((f = f ? f.__html : void 0), f != null && ua(e, f))
                                          : i === 'children'
                                            ? typeof f == 'string'
                                                ? (n !== 'textarea' || f !== '') && Hn(e, f)
                                                : typeof f == 'number' && Hn(e, '' + f)
                                            : i !== 'suppressContentEditableWarning' &&
                                              i !== 'suppressHydrationWarning' &&
                                              i !== 'autoFocus' &&
                                              (h.hasOwnProperty(i)
                                                  ? f != null && i === 'onScroll' && ce('scroll', e)
                                                  : f != null && ne(e, i, f, a));
                                }
                            switch (n) {
                                case 'input':
                                    (zr(e), la(e, r, !1));
                                    break;
                                case 'textarea':
                                    (zr(e), aa(e));
                                    break;
                                case 'option':
                                    r.value != null && e.setAttribute('value', '' + re(r.value));
                                    break;
                                case 'select':
                                    ((e.multiple = !!r.multiple),
                                        (i = r.value),
                                        i != null
                                            ? hn(e, !!r.multiple, i, !1)
                                            : r.defaultValue != null &&
                                              hn(e, !!r.multiple, r.defaultValue, !0));
                                    break;
                                default:
                                    typeof l.onClick == 'function' && (e.onclick = nl);
                            }
                            switch (n) {
                                case 'button':
                                case 'input':
                                case 'select':
                                case 'textarea':
                                    r = !!r.autoFocus;
                                    break e;
                                case 'img':
                                    r = !0;
                                    break e;
                                default:
                                    r = !1;
                            }
                        }
                        r && (t.flags |= 4);
                    }
                    t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
                }
                return (ze(t), null);
            case 6:
                if (e && t.stateNode != null) Su(e, t, e.memoizedProps, r);
                else {
                    if (typeof r != 'string' && t.stateNode === null) throw Error(s(166));
                    if (((n = an(vr.current)), an(gt.current), ul(t))) {
                        if (
                            ((r = t.stateNode),
                            (n = t.memoizedProps),
                            (r[ht] = t),
                            (i = r.nodeValue !== n) && ((e = Xe), e !== null))
                        )
                            switch (e.tag) {
                                case 3:
                                    tl(r.nodeValue, n, (e.mode & 1) !== 0);
                                    break;
                                case 5:
                                    e.memoizedProps.suppressHydrationWarning !== !0 &&
                                        tl(r.nodeValue, n, (e.mode & 1) !== 0);
                            }
                        i && (t.flags |= 4);
                    } else
                        ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
                            (r[ht] = t),
                            (t.stateNode = r));
                }
                return (ze(t), null);
            case 13:
                if (
                    (de(me),
                    (r = t.memoizedState),
                    e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
                ) {
                    if (pe && Ge !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0)
                        (Es(), Rn(), (t.flags |= 98560), (i = !1));
                    else if (((i = ul(t)), r !== null && r.dehydrated !== null)) {
                        if (e === null) {
                            if (!i) throw Error(s(318));
                            if (((i = t.memoizedState), (i = i !== null ? i.dehydrated : null), !i))
                                throw Error(s(317));
                            i[ht] = t;
                        } else
                            (Rn(),
                                (t.flags & 128) === 0 && (t.memoizedState = null),
                                (t.flags |= 4));
                        (ze(t), (i = !1));
                    } else (at !== null && (Lo(at), (at = null)), (i = !0));
                    if (!i) return t.flags & 65536 ? t : null;
                }
                return (t.flags & 128) !== 0
                    ? ((t.lanes = n), t)
                    : ((r = r !== null),
                      r !== (e !== null && e.memoizedState !== null) &&
                          r &&
                          ((t.child.flags |= 8192),
                          (t.mode & 1) !== 0 &&
                              (e === null || (me.current & 1) !== 0 ? Ne === 0 && (Ne = 3) : zo())),
                      t.updateQueue !== null && (t.flags |= 4),
                      ze(t),
                      null);
            case 4:
                return (On(), yo(e, t), e === null && cr(t.stateNode.containerInfo), ze(t), null);
            case 10:
                return (Qi(t.type._context), ze(t), null);
            case 17:
                return ($e(t.type) && ll(), ze(t), null);
            case 19:
                if ((de(me), (i = t.memoizedState), i === null)) return (ze(t), null);
                if (((r = (t.flags & 128) !== 0), (a = i.rendering), a === null))
                    if (r) Sr(i, !1);
                    else {
                        if (Ne !== 0 || (e !== null && (e.flags & 128) !== 0))
                            for (e = t.child; e !== null; ) {
                                if (((a = hl(e)), a !== null)) {
                                    for (
                                        t.flags |= 128,
                                            Sr(i, !1),
                                            r = a.updateQueue,
                                            r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                                            t.subtreeFlags = 0,
                                            r = n,
                                            n = t.child;
                                        n !== null;
                                    )
                                        ((i = n),
                                            (e = r),
                                            (i.flags &= 14680066),
                                            (a = i.alternate),
                                            a === null
                                                ? ((i.childLanes = 0),
                                                  (i.lanes = e),
                                                  (i.child = null),
                                                  (i.subtreeFlags = 0),
                                                  (i.memoizedProps = null),
                                                  (i.memoizedState = null),
                                                  (i.updateQueue = null),
                                                  (i.dependencies = null),
                                                  (i.stateNode = null))
                                                : ((i.childLanes = a.childLanes),
                                                  (i.lanes = a.lanes),
                                                  (i.child = a.child),
                                                  (i.subtreeFlags = 0),
                                                  (i.deletions = null),
                                                  (i.memoizedProps = a.memoizedProps),
                                                  (i.memoizedState = a.memoizedState),
                                                  (i.updateQueue = a.updateQueue),
                                                  (i.type = a.type),
                                                  (e = a.dependencies),
                                                  (i.dependencies =
                                                      e === null
                                                          ? null
                                                          : {
                                                                lanes: e.lanes,
                                                                firstContext: e.firstContext,
                                                            })),
                                            (n = n.sibling));
                                    return (ue(me, (me.current & 1) | 2), t.child);
                                }
                                e = e.sibling;
                            }
                        i.tail !== null &&
                            ye() > Un &&
                            ((t.flags |= 128), (r = !0), Sr(i, !1), (t.lanes = 4194304));
                    }
                else {
                    if (!r)
                        if (((e = hl(a)), e !== null)) {
                            if (
                                ((t.flags |= 128),
                                (r = !0),
                                (n = e.updateQueue),
                                n !== null && ((t.updateQueue = n), (t.flags |= 4)),
                                Sr(i, !0),
                                i.tail === null && i.tailMode === 'hidden' && !a.alternate && !pe)
                            )
                                return (ze(t), null);
                        } else
                            2 * ye() - i.renderingStartTime > Un &&
                                n !== 1073741824 &&
                                ((t.flags |= 128), (r = !0), Sr(i, !1), (t.lanes = 4194304));
                    i.isBackwards
                        ? ((a.sibling = t.child), (t.child = a))
                        : ((n = i.last),
                          n !== null ? (n.sibling = a) : (t.child = a),
                          (i.last = a));
                }
                return i.tail !== null
                    ? ((t = i.tail),
                      (i.rendering = t),
                      (i.tail = t.sibling),
                      (i.renderingStartTime = ye()),
                      (t.sibling = null),
                      (n = me.current),
                      ue(me, r ? (n & 1) | 2 : n & 1),
                      t)
                    : (ze(t), null);
            case 22:
            case 23:
                return (
                    To(),
                    (r = t.memoizedState !== null),
                    e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
                    r && (t.mode & 1) !== 0
                        ? (Je & 1073741824) !== 0 &&
                          (ze(t), t.subtreeFlags & 6 && (t.flags |= 8192))
                        : ze(t),
                    null
                );
            case 24:
                return null;
            case 25:
                return null;
        }
        throw Error(s(156, t.tag));
    }
    function nf(e, t) {
        switch ((Bi(t), t.tag)) {
            case 1:
                return (
                    $e(t.type) && ll(),
                    (e = t.flags),
                    e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
                );
            case 3:
                return (
                    On(),
                    de(Be),
                    de(Re),
                    qi(),
                    (e = t.flags),
                    (e & 65536) !== 0 && (e & 128) === 0
                        ? ((t.flags = (e & -65537) | 128), t)
                        : null
                );
            case 5:
                return (Ji(t), null);
            case 13:
                if ((de(me), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
                    if (t.alternate === null) throw Error(s(340));
                    Rn();
                }
                return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
            case 19:
                return (de(me), null);
            case 4:
                return (On(), null);
            case 10:
                return (Qi(t.type._context), null);
            case 22:
            case 23:
                return (To(), null);
            case 24:
                return null;
            default:
                return null;
        }
    }
    var jl = !1,
        Ie = !1,
        rf = typeof WeakSet == 'function' ? WeakSet : Set,
        U = null;
    function Dn(e, t) {
        var n = e.ref;
        if (n !== null)
            if (typeof n == 'function')
                try {
                    n(null);
                } catch (r) {
                    ve(e, t, r);
                }
            else n.current = null;
    }
    function xo(e, t, n) {
        try {
            n();
        } catch (r) {
            ve(e, t, r);
        }
    }
    var Nu = !1;
    function lf(e, t) {
        if (((Ri = Hr), (e = ts()), Si(e))) {
            if ('selectionStart' in e) var n = { start: e.selectionStart, end: e.selectionEnd };
            else
                e: {
                    n = ((n = e.ownerDocument) && n.defaultView) || window;
                    var r = n.getSelection && n.getSelection();
                    if (r && r.rangeCount !== 0) {
                        n = r.anchorNode;
                        var l = r.anchorOffset,
                            i = r.focusNode;
                        r = r.focusOffset;
                        try {
                            (n.nodeType, i.nodeType);
                        } catch {
                            n = null;
                            break e;
                        }
                        var a = 0,
                            d = -1,
                            f = -1,
                            k = 0,
                            P = 0,
                            _ = e,
                            E = null;
                        t: for (;;) {
                            for (
                                var F;
                                _ !== n || (l !== 0 && _.nodeType !== 3) || (d = a + l),
                                    _ !== i || (r !== 0 && _.nodeType !== 3) || (f = a + r),
                                    _.nodeType === 3 && (a += _.nodeValue.length),
                                    (F = _.firstChild) !== null;
                            )
                                ((E = _), (_ = F));
                            for (;;) {
                                if (_ === e) break t;
                                if (
                                    (E === n && ++k === l && (d = a),
                                    E === i && ++P === r && (f = a),
                                    (F = _.nextSibling) !== null)
                                )
                                    break;
                                ((_ = E), (E = _.parentNode));
                            }
                            _ = F;
                        }
                        n = d === -1 || f === -1 ? null : { start: d, end: f };
                    } else n = null;
                }
            n = n || { start: 0, end: 0 };
        } else n = null;
        for (Ti = { focusedElem: e, selectionRange: n }, Hr = !1, U = t; U !== null; )
            if (((t = U), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
                ((e.return = t), (U = e));
            else
                for (; U !== null; ) {
                    t = U;
                    try {
                        var A = t.alternate;
                        if ((t.flags & 1024) !== 0)
                            switch (t.tag) {
                                case 0:
                                case 11:
                                case 15:
                                    break;
                                case 1:
                                    if (A !== null) {
                                        var W = A.memoizedProps,
                                            xe = A.memoizedState,
                                            v = t.stateNode,
                                            m = v.getSnapshotBeforeUpdate(
                                                t.elementType === t.type ? W : st(t.type, W),
                                                xe,
                                            );
                                        v.__reactInternalSnapshotBeforeUpdate = m;
                                    }
                                    break;
                                case 3:
                                    var y = t.stateNode.containerInfo;
                                    y.nodeType === 1
                                        ? (y.textContent = '')
                                        : y.nodeType === 9 &&
                                          y.documentElement &&
                                          y.removeChild(y.documentElement);
                                    break;
                                case 5:
                                case 6:
                                case 4:
                                case 17:
                                    break;
                                default:
                                    throw Error(s(163));
                            }
                    } catch (R) {
                        ve(t, t.return, R);
                    }
                    if (((e = t.sibling), e !== null)) {
                        ((e.return = t.return), (U = e));
                        break;
                    }
                    U = t.return;
                }
        return ((A = Nu), (Nu = !1), A);
    }
    function Nr(e, t, n) {
        var r = t.updateQueue;
        if (((r = r !== null ? r.lastEffect : null), r !== null)) {
            var l = (r = r.next);
            do {
                if ((l.tag & e) === e) {
                    var i = l.destroy;
                    ((l.destroy = void 0), i !== void 0 && xo(t, n, i));
                }
                l = l.next;
            } while (l !== r);
        }
    }
    function El(e, t) {
        if (((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
            var n = (t = t.next);
            do {
                if ((n.tag & e) === e) {
                    var r = n.create;
                    n.destroy = r();
                }
                n = n.next;
            } while (n !== t);
        }
    }
    function wo(e) {
        var t = e.ref;
        if (t !== null) {
            var n = e.stateNode;
            switch (e.tag) {
                case 5:
                    e = n;
                    break;
                default:
                    e = n;
            }
            typeof t == 'function' ? t(e) : (t.current = e);
        }
    }
    function ju(e) {
        var t = e.alternate;
        (t !== null && ((e.alternate = null), ju(t)),
            (e.child = null),
            (e.deletions = null),
            (e.sibling = null),
            e.tag === 5 &&
                ((t = e.stateNode),
                t !== null &&
                    (delete t[ht], delete t[fr], delete t[Mi], delete t[$d], delete t[Ad])),
            (e.stateNode = null),
            (e.return = null),
            (e.dependencies = null),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.pendingProps = null),
            (e.stateNode = null),
            (e.updateQueue = null));
    }
    function Eu(e) {
        return e.tag === 5 || e.tag === 3 || e.tag === 4;
    }
    function Cu(e) {
        e: for (;;) {
            for (; e.sibling === null; ) {
                if (e.return === null || Eu(e.return)) return null;
                e = e.return;
            }
            for (
                e.sibling.return = e.return, e = e.sibling;
                e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
            ) {
                if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
                ((e.child.return = e), (e = e.child));
            }
            if (!(e.flags & 2)) return e.stateNode;
        }
    }
    function ko(e, t, n) {
        var r = e.tag;
        if (r === 5 || r === 6)
            ((e = e.stateNode),
                t
                    ? n.nodeType === 8
                        ? n.parentNode.insertBefore(e, t)
                        : n.insertBefore(e, t)
                    : (n.nodeType === 8
                          ? ((t = n.parentNode), t.insertBefore(e, n))
                          : ((t = n), t.appendChild(e)),
                      (n = n._reactRootContainer),
                      n != null || t.onclick !== null || (t.onclick = nl)));
        else if (r !== 4 && ((e = e.child), e !== null))
            for (ko(e, t, n), e = e.sibling; e !== null; ) (ko(e, t, n), (e = e.sibling));
    }
    function So(e, t, n) {
        var r = e.tag;
        if (r === 5 || r === 6) ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
        else if (r !== 4 && ((e = e.child), e !== null))
            for (So(e, t, n), e = e.sibling; e !== null; ) (So(e, t, n), (e = e.sibling));
    }
    var _e = null,
        ut = !1;
    function Wt(e, t, n) {
        for (n = n.child; n !== null; ) (Pu(e, t, n), (n = n.sibling));
    }
    function Pu(e, t, n) {
        if (mt && typeof mt.onCommitFiberUnmount == 'function')
            try {
                mt.onCommitFiberUnmount(Ur, n);
            } catch {}
        switch (n.tag) {
            case 5:
                Ie || Dn(n, t);
            case 6:
                var r = _e,
                    l = ut;
                ((_e = null),
                    Wt(e, t, n),
                    (_e = r),
                    (ut = l),
                    _e !== null &&
                        (ut
                            ? ((e = _e),
                              (n = n.stateNode),
                              e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n))
                            : _e.removeChild(n.stateNode)));
                break;
            case 18:
                _e !== null &&
                    (ut
                        ? ((e = _e),
                          (n = n.stateNode),
                          e.nodeType === 8 ? Oi(e.parentNode, n) : e.nodeType === 1 && Oi(e, n),
                          tr(e))
                        : Oi(_e, n.stateNode));
                break;
            case 4:
                ((r = _e),
                    (l = ut),
                    (_e = n.stateNode.containerInfo),
                    (ut = !0),
                    Wt(e, t, n),
                    (_e = r),
                    (ut = l));
                break;
            case 0:
            case 11:
            case 14:
            case 15:
                if (!Ie && ((r = n.updateQueue), r !== null && ((r = r.lastEffect), r !== null))) {
                    l = r = r.next;
                    do {
                        var i = l,
                            a = i.destroy;
                        ((i = i.tag),
                            a !== void 0 && ((i & 2) !== 0 || (i & 4) !== 0) && xo(n, t, a),
                            (l = l.next));
                    } while (l !== r);
                }
                Wt(e, t, n);
                break;
            case 1:
                if (
                    !Ie &&
                    (Dn(n, t), (r = n.stateNode), typeof r.componentWillUnmount == 'function')
                )
                    try {
                        ((r.props = n.memoizedProps),
                            (r.state = n.memoizedState),
                            r.componentWillUnmount());
                    } catch (d) {
                        ve(n, t, d);
                    }
                Wt(e, t, n);
                break;
            case 21:
                Wt(e, t, n);
                break;
            case 22:
                n.mode & 1
                    ? ((Ie = (r = Ie) || n.memoizedState !== null), Wt(e, t, n), (Ie = r))
                    : Wt(e, t, n);
                break;
            default:
                Wt(e, t, n);
        }
    }
    function _u(e) {
        var t = e.updateQueue;
        if (t !== null) {
            e.updateQueue = null;
            var n = e.stateNode;
            (n === null && (n = e.stateNode = new rf()),
                t.forEach(function (r) {
                    var l = mf.bind(null, e, r);
                    n.has(r) || (n.add(r), r.then(l, l));
                }));
        }
    }
    function ct(e, t) {
        var n = t.deletions;
        if (n !== null)
            for (var r = 0; r < n.length; r++) {
                var l = n[r];
                try {
                    var i = e,
                        a = t,
                        d = a;
                    e: for (; d !== null; ) {
                        switch (d.tag) {
                            case 5:
                                ((_e = d.stateNode), (ut = !1));
                                break e;
                            case 3:
                                ((_e = d.stateNode.containerInfo), (ut = !0));
                                break e;
                            case 4:
                                ((_e = d.stateNode.containerInfo), (ut = !0));
                                break e;
                        }
                        d = d.return;
                    }
                    if (_e === null) throw Error(s(160));
                    (Pu(i, a, l), (_e = null), (ut = !1));
                    var f = l.alternate;
                    (f !== null && (f.return = null), (l.return = null));
                } catch (k) {
                    ve(l, t, k);
                }
            }
        if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) (Lu(t, e), (t = t.sibling));
    }
    function Lu(e, t) {
        var n = e.alternate,
            r = e.flags;
        switch (e.tag) {
            case 0:
            case 11:
            case 14:
            case 15:
                if ((ct(t, e), yt(e), r & 4)) {
                    try {
                        (Nr(3, e, e.return), El(3, e));
                    } catch (W) {
                        ve(e, e.return, W);
                    }
                    try {
                        Nr(5, e, e.return);
                    } catch (W) {
                        ve(e, e.return, W);
                    }
                }
                break;
            case 1:
                (ct(t, e), yt(e), r & 512 && n !== null && Dn(n, n.return));
                break;
            case 5:
                if ((ct(t, e), yt(e), r & 512 && n !== null && Dn(n, n.return), e.flags & 32)) {
                    var l = e.stateNode;
                    try {
                        Hn(l, '');
                    } catch (W) {
                        ve(e, e.return, W);
                    }
                }
                if (r & 4 && ((l = e.stateNode), l != null)) {
                    var i = e.memoizedProps,
                        a = n !== null ? n.memoizedProps : i,
                        d = e.type,
                        f = e.updateQueue;
                    if (((e.updateQueue = null), f !== null))
                        try {
                            (d === 'input' && i.type === 'radio' && i.name != null && ra(l, i),
                                ql(d, a));
                            var k = ql(d, i);
                            for (a = 0; a < f.length; a += 2) {
                                var P = f[a],
                                    _ = f[a + 1];
                                P === 'style'
                                    ? da(l, _)
                                    : P === 'dangerouslySetInnerHTML'
                                      ? ua(l, _)
                                      : P === 'children'
                                        ? Hn(l, _)
                                        : ne(l, P, _, k);
                            }
                            switch (d) {
                                case 'input':
                                    Yl(l, i);
                                    break;
                                case 'textarea':
                                    oa(l, i);
                                    break;
                                case 'select':
                                    var E = l._wrapperState.wasMultiple;
                                    l._wrapperState.wasMultiple = !!i.multiple;
                                    var F = i.value;
                                    F != null
                                        ? hn(l, !!i.multiple, F, !1)
                                        : E !== !!i.multiple &&
                                          (i.defaultValue != null
                                              ? hn(l, !!i.multiple, i.defaultValue, !0)
                                              : hn(l, !!i.multiple, i.multiple ? [] : '', !1));
                            }
                            l[fr] = i;
                        } catch (W) {
                            ve(e, e.return, W);
                        }
                }
                break;
            case 6:
                if ((ct(t, e), yt(e), r & 4)) {
                    if (e.stateNode === null) throw Error(s(162));
                    ((l = e.stateNode), (i = e.memoizedProps));
                    try {
                        l.nodeValue = i;
                    } catch (W) {
                        ve(e, e.return, W);
                    }
                }
                break;
            case 3:
                if ((ct(t, e), yt(e), r & 4 && n !== null && n.memoizedState.isDehydrated))
                    try {
                        tr(t.containerInfo);
                    } catch (W) {
                        ve(e, e.return, W);
                    }
                break;
            case 4:
                (ct(t, e), yt(e));
                break;
            case 13:
                (ct(t, e),
                    yt(e),
                    (l = e.child),
                    l.flags & 8192 &&
                        ((i = l.memoizedState !== null),
                        (l.stateNode.isHidden = i),
                        !i ||
                            (l.alternate !== null && l.alternate.memoizedState !== null) ||
                            (Eo = ye())),
                    r & 4 && _u(e));
                break;
            case 22:
                if (
                    ((P = n !== null && n.memoizedState !== null),
                    e.mode & 1 ? ((Ie = (k = Ie) || P), ct(t, e), (Ie = k)) : ct(t, e),
                    yt(e),
                    r & 8192)
                ) {
                    if (
                        ((k = e.memoizedState !== null),
                        (e.stateNode.isHidden = k) && !P && (e.mode & 1) !== 0)
                    )
                        for (U = e, P = e.child; P !== null; ) {
                            for (_ = U = P; U !== null; ) {
                                switch (((E = U), (F = E.child), E.tag)) {
                                    case 0:
                                    case 11:
                                    case 14:
                                    case 15:
                                        Nr(4, E, E.return);
                                        break;
                                    case 1:
                                        Dn(E, E.return);
                                        var A = E.stateNode;
                                        if (typeof A.componentWillUnmount == 'function') {
                                            ((r = E), (n = E.return));
                                            try {
                                                ((t = r),
                                                    (A.props = t.memoizedProps),
                                                    (A.state = t.memoizedState),
                                                    A.componentWillUnmount());
                                            } catch (W) {
                                                ve(r, n, W);
                                            }
                                        }
                                        break;
                                    case 5:
                                        Dn(E, E.return);
                                        break;
                                    case 22:
                                        if (E.memoizedState !== null) {
                                            zu(_);
                                            continue;
                                        }
                                }
                                F !== null ? ((F.return = E), (U = F)) : zu(_);
                            }
                            P = P.sibling;
                        }
                    e: for (P = null, _ = e; ; ) {
                        if (_.tag === 5) {
                            if (P === null) {
                                P = _;
                                try {
                                    ((l = _.stateNode),
                                        k
                                            ? ((i = l.style),
                                              typeof i.setProperty == 'function'
                                                  ? i.setProperty('display', 'none', 'important')
                                                  : (i.display = 'none'))
                                            : ((d = _.stateNode),
                                              (f = _.memoizedProps.style),
                                              (a =
                                                  f != null && f.hasOwnProperty('display')
                                                      ? f.display
                                                      : null),
                                              (d.style.display = ca('display', a))));
                                } catch (W) {
                                    ve(e, e.return, W);
                                }
                            }
                        } else if (_.tag === 6) {
                            if (P === null)
                                try {
                                    _.stateNode.nodeValue = k ? '' : _.memoizedProps;
                                } catch (W) {
                                    ve(e, e.return, W);
                                }
                        } else if (
                            ((_.tag !== 22 && _.tag !== 23) ||
                                _.memoizedState === null ||
                                _ === e) &&
                            _.child !== null
                        ) {
                            ((_.child.return = _), (_ = _.child));
                            continue;
                        }
                        if (_ === e) break e;
                        for (; _.sibling === null; ) {
                            if (_.return === null || _.return === e) break e;
                            (P === _ && (P = null), (_ = _.return));
                        }
                        (P === _ && (P = null), (_.sibling.return = _.return), (_ = _.sibling));
                    }
                }
                break;
            case 19:
                (ct(t, e), yt(e), r & 4 && _u(e));
                break;
            case 21:
                break;
            default:
                (ct(t, e), yt(e));
        }
    }
    function yt(e) {
        var t = e.flags;
        if (t & 2) {
            try {
                e: {
                    for (var n = e.return; n !== null; ) {
                        if (Eu(n)) {
                            var r = n;
                            break e;
                        }
                        n = n.return;
                    }
                    throw Error(s(160));
                }
                switch (r.tag) {
                    case 5:
                        var l = r.stateNode;
                        r.flags & 32 && (Hn(l, ''), (r.flags &= -33));
                        var i = Cu(e);
                        So(e, i, l);
                        break;
                    case 3:
                    case 4:
                        var a = r.stateNode.containerInfo,
                            d = Cu(e);
                        ko(e, d, a);
                        break;
                    default:
                        throw Error(s(161));
                }
            } catch (f) {
                ve(e, e.return, f);
            }
            e.flags &= -3;
        }
        t & 4096 && (e.flags &= -4097);
    }
    function of(e, t, n) {
        ((U = e), Ru(e));
    }
    function Ru(e, t, n) {
        for (var r = (e.mode & 1) !== 0; U !== null; ) {
            var l = U,
                i = l.child;
            if (l.tag === 22 && r) {
                var a = l.memoizedState !== null || jl;
                if (!a) {
                    var d = l.alternate,
                        f = (d !== null && d.memoizedState !== null) || Ie;
                    d = jl;
                    var k = Ie;
                    if (((jl = a), (Ie = f) && !k))
                        for (U = l; U !== null; )
                            ((a = U),
                                (f = a.child),
                                a.tag === 22 && a.memoizedState !== null
                                    ? Iu(l)
                                    : f !== null
                                      ? ((f.return = a), (U = f))
                                      : Iu(l));
                    for (; i !== null; ) ((U = i), Ru(i), (i = i.sibling));
                    ((U = l), (jl = d), (Ie = k));
                }
                Tu(e);
            } else (l.subtreeFlags & 8772) !== 0 && i !== null ? ((i.return = l), (U = i)) : Tu(e);
        }
    }
    function Tu(e) {
        for (; U !== null; ) {
            var t = U;
            if ((t.flags & 8772) !== 0) {
                var n = t.alternate;
                try {
                    if ((t.flags & 8772) !== 0)
                        switch (t.tag) {
                            case 0:
                            case 11:
                            case 15:
                                Ie || El(5, t);
                                break;
                            case 1:
                                var r = t.stateNode;
                                if (t.flags & 4 && !Ie)
                                    if (n === null) r.componentDidMount();
                                    else {
                                        var l =
                                            t.elementType === t.type
                                                ? n.memoizedProps
                                                : st(t.type, n.memoizedProps);
                                        r.componentDidUpdate(
                                            l,
                                            n.memoizedState,
                                            r.__reactInternalSnapshotBeforeUpdate,
                                        );
                                    }
                                var i = t.updateQueue;
                                i !== null && zs(t, i, r);
                                break;
                            case 3:
                                var a = t.updateQueue;
                                if (a !== null) {
                                    if (((n = null), t.child !== null))
                                        switch (t.child.tag) {
                                            case 5:
                                                n = t.child.stateNode;
                                                break;
                                            case 1:
                                                n = t.child.stateNode;
                                        }
                                    zs(t, a, n);
                                }
                                break;
                            case 5:
                                var d = t.stateNode;
                                if (n === null && t.flags & 4) {
                                    n = d;
                                    var f = t.memoizedProps;
                                    switch (t.type) {
                                        case 'button':
                                        case 'input':
                                        case 'select':
                                        case 'textarea':
                                            f.autoFocus && n.focus();
                                            break;
                                        case 'img':
                                            f.src && (n.src = f.src);
                                    }
                                }
                                break;
                            case 6:
                                break;
                            case 4:
                                break;
                            case 12:
                                break;
                            case 13:
                                if (t.memoizedState === null) {
                                    var k = t.alternate;
                                    if (k !== null) {
                                        var P = k.memoizedState;
                                        if (P !== null) {
                                            var _ = P.dehydrated;
                                            _ !== null && tr(_);
                                        }
                                    }
                                }
                                break;
                            case 19:
                            case 17:
                            case 21:
                            case 22:
                            case 23:
                            case 25:
                                break;
                            default:
                                throw Error(s(163));
                        }
                    Ie || (t.flags & 512 && wo(t));
                } catch (E) {
                    ve(t, t.return, E);
                }
            }
            if (t === e) {
                U = null;
                break;
            }
            if (((n = t.sibling), n !== null)) {
                ((n.return = t.return), (U = n));
                break;
            }
            U = t.return;
        }
    }
    function zu(e) {
        for (; U !== null; ) {
            var t = U;
            if (t === e) {
                U = null;
                break;
            }
            var n = t.sibling;
            if (n !== null) {
                ((n.return = t.return), (U = n));
                break;
            }
            U = t.return;
        }
    }
    function Iu(e) {
        for (; U !== null; ) {
            var t = U;
            try {
                switch (t.tag) {
                    case 0:
                    case 11:
                    case 15:
                        var n = t.return;
                        try {
                            El(4, t);
                        } catch (f) {
                            ve(t, n, f);
                        }
                        break;
                    case 1:
                        var r = t.stateNode;
                        if (typeof r.componentDidMount == 'function') {
                            var l = t.return;
                            try {
                                r.componentDidMount();
                            } catch (f) {
                                ve(t, l, f);
                            }
                        }
                        var i = t.return;
                        try {
                            wo(t);
                        } catch (f) {
                            ve(t, i, f);
                        }
                        break;
                    case 5:
                        var a = t.return;
                        try {
                            wo(t);
                        } catch (f) {
                            ve(t, a, f);
                        }
                }
            } catch (f) {
                ve(t, t.return, f);
            }
            if (t === e) {
                U = null;
                break;
            }
            var d = t.sibling;
            if (d !== null) {
                ((d.return = t.return), (U = d));
                break;
            }
            U = t.return;
        }
    }
    var af = Math.ceil,
        Cl = ae.ReactCurrentDispatcher,
        No = ae.ReactCurrentOwner,
        nt = ae.ReactCurrentBatchConfig,
        q = 0,
        Ce = null,
        ke = null,
        Le = 0,
        Je = 0,
        Fn = Ft(0),
        Ne = 0,
        jr = null,
        un = 0,
        Pl = 0,
        jo = 0,
        Er = null,
        We = null,
        Eo = 0,
        Un = 1 / 0,
        Pt = null,
        _l = !1,
        Co = null,
        Vt = null,
        Ll = !1,
        Ht = null,
        Rl = 0,
        Cr = 0,
        Po = null,
        Tl = -1,
        zl = 0;
    function De() {
        return (q & 6) !== 0 ? ye() : Tl !== -1 ? Tl : (Tl = ye());
    }
    function Qt(e) {
        return (e.mode & 1) === 0
            ? 1
            : (q & 2) !== 0 && Le !== 0
              ? Le & -Le
              : Vd.transition !== null
                ? (zl === 0 && (zl = Ca()), zl)
                : ((e = le),
                  e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : Ma(e.type))),
                  e);
    }
    function dt(e, t, n, r) {
        if (50 < Cr) throw ((Cr = 0), (Po = null), Error(s(185)));
        (Jn(e, n, r),
            ((q & 2) === 0 || e !== Ce) &&
                (e === Ce && ((q & 2) === 0 && (Pl |= n), Ne === 4 && Kt(e, Le)),
                Ve(e, r),
                n === 1 && q === 0 && (t.mode & 1) === 0 && ((Un = ye() + 500), ol && Bt())));
    }
    function Ve(e, t) {
        var n = e.callbackNode;
        Vc(e, t);
        var r = Ar(e, e === Ce ? Le : 0);
        if (r === 0) (n !== null && Na(n), (e.callbackNode = null), (e.callbackPriority = 0));
        else if (((t = r & -r), e.callbackPriority !== t)) {
            if ((n != null && Na(n), t === 1))
                (e.tag === 0 ? Wd(Mu.bind(null, e)) : ws(Mu.bind(null, e)),
                    Ud(function () {
                        (q & 6) === 0 && Bt();
                    }),
                    (n = null));
            else {
                switch (Pa(r)) {
                    case 1:
                        n = ii;
                        break;
                    case 4:
                        n = ja;
                        break;
                    case 16:
                        n = Fr;
                        break;
                    case 536870912:
                        n = Ea;
                        break;
                    default:
                        n = Fr;
                }
                n = Vu(n, Ou.bind(null, e));
            }
            ((e.callbackPriority = t), (e.callbackNode = n));
        }
    }
    function Ou(e, t) {
        if (((Tl = -1), (zl = 0), (q & 6) !== 0)) throw Error(s(327));
        var n = e.callbackNode;
        if (Bn() && e.callbackNode !== n) return null;
        var r = Ar(e, e === Ce ? Le : 0);
        if (r === 0) return null;
        if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t) t = Il(e, r);
        else {
            t = r;
            var l = q;
            q |= 2;
            var i = Fu();
            (Ce !== e || Le !== t) && ((Pt = null), (Un = ye() + 500), dn(e, t));
            do
                try {
                    cf();
                    break;
                } catch (d) {
                    Du(e, d);
                }
            while (!0);
            (Hi(),
                (Cl.current = i),
                (q = l),
                ke !== null ? (t = 0) : ((Ce = null), (Le = 0), (t = Ne)));
        }
        if (t !== 0) {
            if ((t === 2 && ((l = oi(e)), l !== 0 && ((r = l), (t = _o(e, l)))), t === 1))
                throw ((n = jr), dn(e, 0), Kt(e, r), Ve(e, ye()), n);
            if (t === 6) Kt(e, r);
            else {
                if (
                    ((l = e.current.alternate),
                    (r & 30) === 0 &&
                        !sf(l) &&
                        ((t = Il(e, r)),
                        t === 2 && ((i = oi(e)), i !== 0 && ((r = i), (t = _o(e, i)))),
                        t === 1))
                )
                    throw ((n = jr), dn(e, 0), Kt(e, r), Ve(e, ye()), n);
                switch (((e.finishedWork = l), (e.finishedLanes = r), t)) {
                    case 0:
                    case 1:
                        throw Error(s(345));
                    case 2:
                        fn(e, We, Pt);
                        break;
                    case 3:
                        if ((Kt(e, r), (r & 130023424) === r && ((t = Eo + 500 - ye()), 10 < t))) {
                            if (Ar(e, 0) !== 0) break;
                            if (((l = e.suspendedLanes), (l & r) !== r)) {
                                (De(), (e.pingedLanes |= e.suspendedLanes & l));
                                break;
                            }
                            e.timeoutHandle = Ii(fn.bind(null, e, We, Pt), t);
                            break;
                        }
                        fn(e, We, Pt);
                        break;
                    case 4:
                        if ((Kt(e, r), (r & 4194240) === r)) break;
                        for (t = e.eventTimes, l = -1; 0 < r; ) {
                            var a = 31 - it(r);
                            ((i = 1 << a), (a = t[a]), a > l && (l = a), (r &= ~i));
                        }
                        if (
                            ((r = l),
                            (r = ye() - r),
                            (r =
                                (120 > r
                                    ? 120
                                    : 480 > r
                                      ? 480
                                      : 1080 > r
                                        ? 1080
                                        : 1920 > r
                                          ? 1920
                                          : 3e3 > r
                                            ? 3e3
                                            : 4320 > r
                                              ? 4320
                                              : 1960 * af(r / 1960)) - r),
                            10 < r)
                        ) {
                            e.timeoutHandle = Ii(fn.bind(null, e, We, Pt), r);
                            break;
                        }
                        fn(e, We, Pt);
                        break;
                    case 5:
                        fn(e, We, Pt);
                        break;
                    default:
                        throw Error(s(329));
                }
            }
        }
        return (Ve(e, ye()), e.callbackNode === n ? Ou.bind(null, e) : null);
    }
    function _o(e, t) {
        var n = Er;
        return (
            e.current.memoizedState.isDehydrated && (dn(e, t).flags |= 256),
            (e = Il(e, t)),
            e !== 2 && ((t = We), (We = n), t !== null && Lo(t)),
            e
        );
    }
    function Lo(e) {
        We === null ? (We = e) : We.push.apply(We, e);
    }
    function sf(e) {
        for (var t = e; ; ) {
            if (t.flags & 16384) {
                var n = t.updateQueue;
                if (n !== null && ((n = n.stores), n !== null))
                    for (var r = 0; r < n.length; r++) {
                        var l = n[r],
                            i = l.getSnapshot;
                        l = l.value;
                        try {
                            if (!ot(i(), l)) return !1;
                        } catch {
                            return !1;
                        }
                    }
            }
            if (((n = t.child), t.subtreeFlags & 16384 && n !== null)) ((n.return = t), (t = n));
            else {
                if (t === e) break;
                for (; t.sibling === null; ) {
                    if (t.return === null || t.return === e) return !0;
                    t = t.return;
                }
                ((t.sibling.return = t.return), (t = t.sibling));
            }
        }
        return !0;
    }
    function Kt(e, t) {
        for (
            t &= ~jo, t &= ~Pl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
            0 < t;
        ) {
            var n = 31 - it(t),
                r = 1 << n;
            ((e[n] = -1), (t &= ~r));
        }
    }
    function Mu(e) {
        if ((q & 6) !== 0) throw Error(s(327));
        Bn();
        var t = Ar(e, 0);
        if ((t & 1) === 0) return (Ve(e, ye()), null);
        var n = Il(e, t);
        if (e.tag !== 0 && n === 2) {
            var r = oi(e);
            r !== 0 && ((t = r), (n = _o(e, r)));
        }
        if (n === 1) throw ((n = jr), dn(e, 0), Kt(e, t), Ve(e, ye()), n);
        if (n === 6) throw Error(s(345));
        return (
            (e.finishedWork = e.current.alternate),
            (e.finishedLanes = t),
            fn(e, We, Pt),
            Ve(e, ye()),
            null
        );
    }
    function Ro(e, t) {
        var n = q;
        q |= 1;
        try {
            return e(t);
        } finally {
            ((q = n), q === 0 && ((Un = ye() + 500), ol && Bt()));
        }
    }
    function cn(e) {
        Ht !== null && Ht.tag === 0 && (q & 6) === 0 && Bn();
        var t = q;
        q |= 1;
        var n = nt.transition,
            r = le;
        try {
            if (((nt.transition = null), (le = 1), e)) return e();
        } finally {
            ((le = r), (nt.transition = n), (q = t), (q & 6) === 0 && Bt());
        }
    }
    function To() {
        ((Je = Fn.current), de(Fn));
    }
    function dn(e, t) {
        ((e.finishedWork = null), (e.finishedLanes = 0));
        var n = e.timeoutHandle;
        if ((n !== -1 && ((e.timeoutHandle = -1), Fd(n)), ke !== null))
            for (n = ke.return; n !== null; ) {
                var r = n;
                switch ((Bi(r), r.tag)) {
                    case 1:
                        ((r = r.type.childContextTypes), r != null && ll());
                        break;
                    case 3:
                        (On(), de(Be), de(Re), qi());
                        break;
                    case 5:
                        Ji(r);
                        break;
                    case 4:
                        On();
                        break;
                    case 13:
                        de(me);
                        break;
                    case 19:
                        de(me);
                        break;
                    case 10:
                        Qi(r.type._context);
                        break;
                    case 22:
                    case 23:
                        To();
                }
                n = n.return;
            }
        if (
            ((Ce = e),
            (ke = e = Yt(e.current, null)),
            (Le = Je = t),
            (Ne = 0),
            (jr = null),
            (jo = Pl = un = 0),
            (We = Er = null),
            on !== null)
        ) {
            for (t = 0; t < on.length; t++)
                if (((n = on[t]), (r = n.interleaved), r !== null)) {
                    n.interleaved = null;
                    var l = r.next,
                        i = n.pending;
                    if (i !== null) {
                        var a = i.next;
                        ((i.next = l), (r.next = a));
                    }
                    n.pending = r;
                }
            on = null;
        }
        return e;
    }
    function Du(e, t) {
        do {
            var n = ke;
            try {
                if ((Hi(), (gl.current = wl), vl)) {
                    for (var r = he.memoizedState; r !== null; ) {
                        var l = r.queue;
                        (l !== null && (l.pending = null), (r = r.next));
                    }
                    vl = !1;
                }
                if (
                    ((sn = 0),
                    (Ee = Se = he = null),
                    (yr = !1),
                    (xr = 0),
                    (No.current = null),
                    n === null || n.return === null)
                ) {
                    ((Ne = 1), (jr = t), (ke = null));
                    break;
                }
                e: {
                    var i = e,
                        a = n.return,
                        d = n,
                        f = t;
                    if (
                        ((t = Le),
                        (d.flags |= 32768),
                        f !== null && typeof f == 'object' && typeof f.then == 'function')
                    ) {
                        var k = f,
                            P = d,
                            _ = P.tag;
                        if ((P.mode & 1) === 0 && (_ === 0 || _ === 11 || _ === 15)) {
                            var E = P.alternate;
                            E
                                ? ((P.updateQueue = E.updateQueue),
                                  (P.memoizedState = E.memoizedState),
                                  (P.lanes = E.lanes))
                                : ((P.updateQueue = null), (P.memoizedState = null));
                        }
                        var F = au(a);
                        if (F !== null) {
                            ((F.flags &= -257),
                                su(F, a, d, i, t),
                                F.mode & 1 && ou(i, k, t),
                                (t = F),
                                (f = k));
                            var A = t.updateQueue;
                            if (A === null) {
                                var W = new Set();
                                (W.add(f), (t.updateQueue = W));
                            } else A.add(f);
                            break e;
                        } else {
                            if ((t & 1) === 0) {
                                (ou(i, k, t), zo());
                                break e;
                            }
                            f = Error(s(426));
                        }
                    } else if (pe && d.mode & 1) {
                        var xe = au(a);
                        if (xe !== null) {
                            ((xe.flags & 65536) === 0 && (xe.flags |= 256),
                                su(xe, a, d, i, t),
                                Wi(Mn(f, d)));
                            break e;
                        }
                    }
                    ((i = f = Mn(f, d)),
                        Ne !== 4 && (Ne = 2),
                        Er === null ? (Er = [i]) : Er.push(i),
                        (i = a));
                    do {
                        switch (i.tag) {
                            case 3:
                                ((i.flags |= 65536), (t &= -t), (i.lanes |= t));
                                var v = lu(i, f, t);
                                Ts(i, v);
                                break e;
                            case 1:
                                d = f;
                                var m = i.type,
                                    y = i.stateNode;
                                if (
                                    (i.flags & 128) === 0 &&
                                    (typeof m.getDerivedStateFromError == 'function' ||
                                        (y !== null &&
                                            typeof y.componentDidCatch == 'function' &&
                                            (Vt === null || !Vt.has(y))))
                                ) {
                                    ((i.flags |= 65536), (t &= -t), (i.lanes |= t));
                                    var R = iu(i, d, t);
                                    Ts(i, R);
                                    break e;
                                }
                        }
                        i = i.return;
                    } while (i !== null);
                }
                Bu(n);
            } catch (V) {
                ((t = V), ke === n && n !== null && (ke = n = n.return));
                continue;
            }
            break;
        } while (!0);
    }
    function Fu() {
        var e = Cl.current;
        return ((Cl.current = wl), e === null ? wl : e);
    }
    function zo() {
        ((Ne === 0 || Ne === 3 || Ne === 2) && (Ne = 4),
            Ce === null || ((un & 268435455) === 0 && (Pl & 268435455) === 0) || Kt(Ce, Le));
    }
    function Il(e, t) {
        var n = q;
        q |= 2;
        var r = Fu();
        (Ce !== e || Le !== t) && ((Pt = null), dn(e, t));
        do
            try {
                uf();
                break;
            } catch (l) {
                Du(e, l);
            }
        while (!0);
        if ((Hi(), (q = n), (Cl.current = r), ke !== null)) throw Error(s(261));
        return ((Ce = null), (Le = 0), Ne);
    }
    function uf() {
        for (; ke !== null; ) Uu(ke);
    }
    function cf() {
        for (; ke !== null && !Oc(); ) Uu(ke);
    }
    function Uu(e) {
        var t = Wu(e.alternate, e, Je);
        ((e.memoizedProps = e.pendingProps), t === null ? Bu(e) : (ke = t), (No.current = null));
    }
    function Bu(e) {
        var t = e;
        do {
            var n = t.alternate;
            if (((e = t.return), (t.flags & 32768) === 0)) {
                if (((n = tf(n, t, Je)), n !== null)) {
                    ke = n;
                    return;
                }
            } else {
                if (((n = nf(n, t)), n !== null)) {
                    ((n.flags &= 32767), (ke = n));
                    return;
                }
                if (e !== null) ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
                else {
                    ((Ne = 6), (ke = null));
                    return;
                }
            }
            if (((t = t.sibling), t !== null)) {
                ke = t;
                return;
            }
            ke = t = e;
        } while (t !== null);
        Ne === 0 && (Ne = 5);
    }
    function fn(e, t, n) {
        var r = le,
            l = nt.transition;
        try {
            ((nt.transition = null), (le = 1), df(e, t, n, r));
        } finally {
            ((nt.transition = l), (le = r));
        }
        return null;
    }
    function df(e, t, n, r) {
        do Bn();
        while (Ht !== null);
        if ((q & 6) !== 0) throw Error(s(327));
        n = e.finishedWork;
        var l = e.finishedLanes;
        if (n === null) return null;
        if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current)) throw Error(s(177));
        ((e.callbackNode = null), (e.callbackPriority = 0));
        var i = n.lanes | n.childLanes;
        if (
            (Hc(e, i),
            e === Ce && ((ke = Ce = null), (Le = 0)),
            ((n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0) ||
                Ll ||
                ((Ll = !0),
                Vu(Fr, function () {
                    return (Bn(), null);
                })),
            (i = (n.flags & 15990) !== 0),
            (n.subtreeFlags & 15990) !== 0 || i)
        ) {
            ((i = nt.transition), (nt.transition = null));
            var a = le;
            le = 1;
            var d = q;
            ((q |= 4),
                (No.current = null),
                lf(e, n),
                Lu(n, e),
                Rd(Ti),
                (Hr = !!Ri),
                (Ti = Ri = null),
                (e.current = n),
                of(n),
                Mc(),
                (q = d),
                (le = a),
                (nt.transition = i));
        } else e.current = n;
        if (
            (Ll && ((Ll = !1), (Ht = e), (Rl = l)),
            (i = e.pendingLanes),
            i === 0 && (Vt = null),
            Uc(n.stateNode),
            Ve(e, ye()),
            t !== null)
        )
            for (r = e.onRecoverableError, n = 0; n < t.length; n++)
                ((l = t[n]), r(l.value, { componentStack: l.stack, digest: l.digest }));
        if (_l) throw ((_l = !1), (e = Co), (Co = null), e);
        return (
            (Rl & 1) !== 0 && e.tag !== 0 && Bn(),
            (i = e.pendingLanes),
            (i & 1) !== 0 ? (e === Po ? Cr++ : ((Cr = 0), (Po = e))) : (Cr = 0),
            Bt(),
            null
        );
    }
    function Bn() {
        if (Ht !== null) {
            var e = Pa(Rl),
                t = nt.transition,
                n = le;
            try {
                if (((nt.transition = null), (le = 16 > e ? 16 : e), Ht === null)) var r = !1;
                else {
                    if (((e = Ht), (Ht = null), (Rl = 0), (q & 6) !== 0)) throw Error(s(331));
                    var l = q;
                    for (q |= 4, U = e.current; U !== null; ) {
                        var i = U,
                            a = i.child;
                        if ((U.flags & 16) !== 0) {
                            var d = i.deletions;
                            if (d !== null) {
                                for (var f = 0; f < d.length; f++) {
                                    var k = d[f];
                                    for (U = k; U !== null; ) {
                                        var P = U;
                                        switch (P.tag) {
                                            case 0:
                                            case 11:
                                            case 15:
                                                Nr(8, P, i);
                                        }
                                        var _ = P.child;
                                        if (_ !== null) ((_.return = P), (U = _));
                                        else
                                            for (; U !== null; ) {
                                                P = U;
                                                var E = P.sibling,
                                                    F = P.return;
                                                if ((ju(P), P === k)) {
                                                    U = null;
                                                    break;
                                                }
                                                if (E !== null) {
                                                    ((E.return = F), (U = E));
                                                    break;
                                                }
                                                U = F;
                                            }
                                    }
                                }
                                var A = i.alternate;
                                if (A !== null) {
                                    var W = A.child;
                                    if (W !== null) {
                                        A.child = null;
                                        do {
                                            var xe = W.sibling;
                                            ((W.sibling = null), (W = xe));
                                        } while (W !== null);
                                    }
                                }
                                U = i;
                            }
                        }
                        if ((i.subtreeFlags & 2064) !== 0 && a !== null) ((a.return = i), (U = a));
                        else
                            e: for (; U !== null; ) {
                                if (((i = U), (i.flags & 2048) !== 0))
                                    switch (i.tag) {
                                        case 0:
                                        case 11:
                                        case 15:
                                            Nr(9, i, i.return);
                                    }
                                var v = i.sibling;
                                if (v !== null) {
                                    ((v.return = i.return), (U = v));
                                    break e;
                                }
                                U = i.return;
                            }
                    }
                    var m = e.current;
                    for (U = m; U !== null; ) {
                        a = U;
                        var y = a.child;
                        if ((a.subtreeFlags & 2064) !== 0 && y !== null) ((y.return = a), (U = y));
                        else
                            e: for (a = m; U !== null; ) {
                                if (((d = U), (d.flags & 2048) !== 0))
                                    try {
                                        switch (d.tag) {
                                            case 0:
                                            case 11:
                                            case 15:
                                                El(9, d);
                                        }
                                    } catch (V) {
                                        ve(d, d.return, V);
                                    }
                                if (d === a) {
                                    U = null;
                                    break e;
                                }
                                var R = d.sibling;
                                if (R !== null) {
                                    ((R.return = d.return), (U = R));
                                    break e;
                                }
                                U = d.return;
                            }
                    }
                    if (((q = l), Bt(), mt && typeof mt.onPostCommitFiberRoot == 'function'))
                        try {
                            mt.onPostCommitFiberRoot(Ur, e);
                        } catch {}
                    r = !0;
                }
                return r;
            } finally {
                ((le = n), (nt.transition = t));
            }
        }
        return !1;
    }
    function $u(e, t, n) {
        ((t = Mn(n, t)),
            (t = lu(e, t, 1)),
            (e = At(e, t, 1)),
            (t = De()),
            e !== null && (Jn(e, 1, t), Ve(e, t)));
    }
    function ve(e, t, n) {
        if (e.tag === 3) $u(e, e, n);
        else
            for (; t !== null; ) {
                if (t.tag === 3) {
                    $u(t, e, n);
                    break;
                } else if (t.tag === 1) {
                    var r = t.stateNode;
                    if (
                        typeof t.type.getDerivedStateFromError == 'function' ||
                        (typeof r.componentDidCatch == 'function' && (Vt === null || !Vt.has(r)))
                    ) {
                        ((e = Mn(n, e)),
                            (e = iu(t, e, 1)),
                            (t = At(t, e, 1)),
                            (e = De()),
                            t !== null && (Jn(t, 1, e), Ve(t, e)));
                        break;
                    }
                }
                t = t.return;
            }
    }
    function ff(e, t, n) {
        var r = e.pingCache;
        (r !== null && r.delete(t),
            (t = De()),
            (e.pingedLanes |= e.suspendedLanes & n),
            Ce === e &&
                (Le & n) === n &&
                (Ne === 4 || (Ne === 3 && (Le & 130023424) === Le && 500 > ye() - Eo)
                    ? dn(e, 0)
                    : (jo |= n)),
            Ve(e, t));
    }
    function Au(e, t) {
        t === 0 &&
            ((e.mode & 1) === 0
                ? (t = 1)
                : ((t = $r), ($r <<= 1), ($r & 130023424) === 0 && ($r = 4194304)));
        var n = De();
        ((e = jt(e, t)), e !== null && (Jn(e, t, n), Ve(e, n)));
    }
    function pf(e) {
        var t = e.memoizedState,
            n = 0;
        (t !== null && (n = t.retryLane), Au(e, n));
    }
    function mf(e, t) {
        var n = 0;
        switch (e.tag) {
            case 13:
                var r = e.stateNode,
                    l = e.memoizedState;
                l !== null && (n = l.retryLane);
                break;
            case 19:
                r = e.stateNode;
                break;
            default:
                throw Error(s(314));
        }
        (r !== null && r.delete(t), Au(e, n));
    }
    var Wu;
    Wu = function (e, t, n) {
        if (e !== null)
            if (e.memoizedProps !== t.pendingProps || Be.current) Ae = !0;
            else {
                if ((e.lanes & n) === 0 && (t.flags & 128) === 0) return ((Ae = !1), ef(e, t, n));
                Ae = (e.flags & 131072) !== 0;
            }
        else ((Ae = !1), pe && (t.flags & 1048576) !== 0 && ks(t, sl, t.index));
        switch (((t.lanes = 0), t.tag)) {
            case 2:
                var r = t.type;
                (Nl(e, t), (e = t.pendingProps));
                var l = Pn(t, Re.current);
                (In(t, n), (l = to(null, t, r, e, l, n)));
                var i = no();
                return (
                    (t.flags |= 1),
                    typeof l == 'object' &&
                    l !== null &&
                    typeof l.render == 'function' &&
                    l.$$typeof === void 0
                        ? ((t.tag = 1),
                          (t.memoizedState = null),
                          (t.updateQueue = null),
                          $e(r) ? ((i = !0), il(t)) : (i = !1),
                          (t.memoizedState =
                              l.state !== null && l.state !== void 0 ? l.state : null),
                          Xi(t),
                          (l.updater = kl),
                          (t.stateNode = l),
                          (l._reactInternals = t),
                          so(t, r, e, n),
                          (t = po(null, t, r, !0, i, n)))
                        : ((t.tag = 0), pe && i && Ui(t), Me(null, t, l, n), (t = t.child)),
                    t
                );
            case 16:
                r = t.elementType;
                e: {
                    switch (
                        (Nl(e, t),
                        (e = t.pendingProps),
                        (l = r._init),
                        (r = l(r._payload)),
                        (t.type = r),
                        (l = t.tag = gf(r)),
                        (e = st(r, e)),
                        l)
                    ) {
                        case 0:
                            t = fo(null, t, r, e, n);
                            break e;
                        case 1:
                            t = mu(null, t, r, e, n);
                            break e;
                        case 11:
                            t = uu(null, t, r, e, n);
                            break e;
                        case 14:
                            t = cu(null, t, r, st(r.type, e), n);
                            break e;
                    }
                    throw Error(s(306, r, ''));
                }
                return t;
            case 0:
                return (
                    (r = t.type),
                    (l = t.pendingProps),
                    (l = t.elementType === r ? l : st(r, l)),
                    fo(e, t, r, l, n)
                );
            case 1:
                return (
                    (r = t.type),
                    (l = t.pendingProps),
                    (l = t.elementType === r ? l : st(r, l)),
                    mu(e, t, r, l, n)
                );
            case 3:
                e: {
                    if ((hu(t), e === null)) throw Error(s(387));
                    ((r = t.pendingProps),
                        (i = t.memoizedState),
                        (l = i.element),
                        Rs(e, t),
                        ml(t, r, null, n));
                    var a = t.memoizedState;
                    if (((r = a.element), i.isDehydrated))
                        if (
                            ((i = {
                                element: r,
                                isDehydrated: !1,
                                cache: a.cache,
                                pendingSuspenseBoundaries: a.pendingSuspenseBoundaries,
                                transitions: a.transitions,
                            }),
                            (t.updateQueue.baseState = i),
                            (t.memoizedState = i),
                            t.flags & 256)
                        ) {
                            ((l = Mn(Error(s(423)), t)), (t = gu(e, t, r, n, l)));
                            break e;
                        } else if (r !== l) {
                            ((l = Mn(Error(s(424)), t)), (t = gu(e, t, r, n, l)));
                            break e;
                        } else
                            for (
                                Ge = Dt(t.stateNode.containerInfo.firstChild),
                                    Xe = t,
                                    pe = !0,
                                    at = null,
                                    n = _s(t, null, r, n),
                                    t.child = n;
                                n;
                            )
                                ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
                    else {
                        if ((Rn(), r === l)) {
                            t = Ct(e, t, n);
                            break e;
                        }
                        Me(e, t, r, n);
                    }
                    t = t.child;
                }
                return t;
            case 5:
                return (
                    Is(t),
                    e === null && Ai(t),
                    (r = t.type),
                    (l = t.pendingProps),
                    (i = e !== null ? e.memoizedProps : null),
                    (a = l.children),
                    zi(r, l) ? (a = null) : i !== null && zi(r, i) && (t.flags |= 32),
                    pu(e, t),
                    Me(e, t, a, n),
                    t.child
                );
            case 6:
                return (e === null && Ai(t), null);
            case 13:
                return vu(e, t, n);
            case 4:
                return (
                    Gi(t, t.stateNode.containerInfo),
                    (r = t.pendingProps),
                    e === null ? (t.child = Tn(t, null, r, n)) : Me(e, t, r, n),
                    t.child
                );
            case 11:
                return (
                    (r = t.type),
                    (l = t.pendingProps),
                    (l = t.elementType === r ? l : st(r, l)),
                    uu(e, t, r, l, n)
                );
            case 7:
                return (Me(e, t, t.pendingProps, n), t.child);
            case 8:
                return (Me(e, t, t.pendingProps.children, n), t.child);
            case 12:
                return (Me(e, t, t.pendingProps.children, n), t.child);
            case 10:
                e: {
                    if (
                        ((r = t.type._context),
                        (l = t.pendingProps),
                        (i = t.memoizedProps),
                        (a = l.value),
                        ue(dl, r._currentValue),
                        (r._currentValue = a),
                        i !== null)
                    )
                        if (ot(i.value, a)) {
                            if (i.children === l.children && !Be.current) {
                                t = Ct(e, t, n);
                                break e;
                            }
                        } else
                            for (i = t.child, i !== null && (i.return = t); i !== null; ) {
                                var d = i.dependencies;
                                if (d !== null) {
                                    a = i.child;
                                    for (var f = d.firstContext; f !== null; ) {
                                        if (f.context === r) {
                                            if (i.tag === 1) {
                                                ((f = Et(-1, n & -n)), (f.tag = 2));
                                                var k = i.updateQueue;
                                                if (k !== null) {
                                                    k = k.shared;
                                                    var P = k.pending;
                                                    (P === null
                                                        ? (f.next = f)
                                                        : ((f.next = P.next), (P.next = f)),
                                                        (k.pending = f));
                                                }
                                            }
                                            ((i.lanes |= n),
                                                (f = i.alternate),
                                                f !== null && (f.lanes |= n),
                                                Ki(i.return, n, t),
                                                (d.lanes |= n));
                                            break;
                                        }
                                        f = f.next;
                                    }
                                } else if (i.tag === 10) a = i.type === t.type ? null : i.child;
                                else if (i.tag === 18) {
                                    if (((a = i.return), a === null)) throw Error(s(341));
                                    ((a.lanes |= n),
                                        (d = a.alternate),
                                        d !== null && (d.lanes |= n),
                                        Ki(a, n, t),
                                        (a = i.sibling));
                                } else a = i.child;
                                if (a !== null) a.return = i;
                                else
                                    for (a = i; a !== null; ) {
                                        if (a === t) {
                                            a = null;
                                            break;
                                        }
                                        if (((i = a.sibling), i !== null)) {
                                            ((i.return = a.return), (a = i));
                                            break;
                                        }
                                        a = a.return;
                                    }
                                i = a;
                            }
                    (Me(e, t, l.children, n), (t = t.child));
                }
                return t;
            case 9:
                return (
                    (l = t.type),
                    (r = t.pendingProps.children),
                    In(t, n),
                    (l = et(l)),
                    (r = r(l)),
                    (t.flags |= 1),
                    Me(e, t, r, n),
                    t.child
                );
            case 14:
                return (
                    (r = t.type),
                    (l = st(r, t.pendingProps)),
                    (l = st(r.type, l)),
                    cu(e, t, r, l, n)
                );
            case 15:
                return du(e, t, t.type, t.pendingProps, n);
            case 17:
                return (
                    (r = t.type),
                    (l = t.pendingProps),
                    (l = t.elementType === r ? l : st(r, l)),
                    Nl(e, t),
                    (t.tag = 1),
                    $e(r) ? ((e = !0), il(t)) : (e = !1),
                    In(t, n),
                    nu(t, r, l),
                    so(t, r, l, n),
                    po(null, t, r, !0, e, n)
                );
            case 19:
                return xu(e, t, n);
            case 22:
                return fu(e, t, n);
        }
        throw Error(s(156, t.tag));
    };
    function Vu(e, t) {
        return Sa(e, t);
    }
    function hf(e, t, n, r) {
        ((this.tag = e),
            (this.key = n),
            (this.sibling =
                this.child =
                this.return =
                this.stateNode =
                this.type =
                this.elementType =
                    null),
            (this.index = 0),
            (this.ref = null),
            (this.pendingProps = t),
            (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
            (this.mode = r),
            (this.subtreeFlags = this.flags = 0),
            (this.deletions = null),
            (this.childLanes = this.lanes = 0),
            (this.alternate = null));
    }
    function rt(e, t, n, r) {
        return new hf(e, t, n, r);
    }
    function Io(e) {
        return ((e = e.prototype), !(!e || !e.isReactComponent));
    }
    function gf(e) {
        if (typeof e == 'function') return Io(e) ? 1 : 0;
        if (e != null) {
            if (((e = e.$$typeof), e === ft)) return 11;
            if (e === pt) return 14;
        }
        return 2;
    }
    function Yt(e, t) {
        var n = e.alternate;
        return (
            n === null
                ? ((n = rt(e.tag, t, e.key, e.mode)),
                  (n.elementType = e.elementType),
                  (n.type = e.type),
                  (n.stateNode = e.stateNode),
                  (n.alternate = e),
                  (e.alternate = n))
                : ((n.pendingProps = t),
                  (n.type = e.type),
                  (n.flags = 0),
                  (n.subtreeFlags = 0),
                  (n.deletions = null)),
            (n.flags = e.flags & 14680064),
            (n.childLanes = e.childLanes),
            (n.lanes = e.lanes),
            (n.child = e.child),
            (n.memoizedProps = e.memoizedProps),
            (n.memoizedState = e.memoizedState),
            (n.updateQueue = e.updateQueue),
            (t = e.dependencies),
            (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
            (n.sibling = e.sibling),
            (n.index = e.index),
            (n.ref = e.ref),
            n
        );
    }
    function Ol(e, t, n, r, l, i) {
        var a = 2;
        if (((r = e), typeof e == 'function')) Io(e) && (a = 1);
        else if (typeof e == 'string') a = 5;
        else
            e: switch (e) {
                case Fe:
                    return pn(n.children, l, i, t);
                case Ze:
                    ((a = 8), (l |= 8));
                    break;
                case Lt:
                    return ((e = rt(12, n, t, l | 2)), (e.elementType = Lt), (e.lanes = i), e);
                case Qe:
                    return ((e = rt(13, n, t, l)), (e.elementType = Qe), (e.lanes = i), e);
                case lt:
                    return ((e = rt(19, n, t, l)), (e.elementType = lt), (e.lanes = i), e);
                case ge:
                    return Ml(n, l, i, t);
                default:
                    if (typeof e == 'object' && e !== null)
                        switch (e.$$typeof) {
                            case xt:
                                a = 10;
                                break e;
                            case bt:
                                a = 9;
                                break e;
                            case ft:
                                a = 11;
                                break e;
                            case pt:
                                a = 14;
                                break e;
                            case Ue:
                                ((a = 16), (r = null));
                                break e;
                        }
                    throw Error(s(130, e == null ? e : typeof e, ''));
            }
        return ((t = rt(a, n, t, l)), (t.elementType = e), (t.type = r), (t.lanes = i), t);
    }
    function pn(e, t, n, r) {
        return ((e = rt(7, e, r, t)), (e.lanes = n), e);
    }
    function Ml(e, t, n, r) {
        return (
            (e = rt(22, e, r, t)),
            (e.elementType = ge),
            (e.lanes = n),
            (e.stateNode = { isHidden: !1 }),
            e
        );
    }
    function Oo(e, t, n) {
        return ((e = rt(6, e, null, t)), (e.lanes = n), e);
    }
    function Mo(e, t, n) {
        return (
            (t = rt(4, e.children !== null ? e.children : [], e.key, t)),
            (t.lanes = n),
            (t.stateNode = {
                containerInfo: e.containerInfo,
                pendingChildren: null,
                implementation: e.implementation,
            }),
            t
        );
    }
    function vf(e, t, n, r, l) {
        ((this.tag = t),
            (this.containerInfo = e),
            (this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
            (this.timeoutHandle = -1),
            (this.callbackNode = this.pendingContext = this.context = null),
            (this.callbackPriority = 0),
            (this.eventTimes = ai(0)),
            (this.expirationTimes = ai(-1)),
            (this.entangledLanes =
                this.finishedLanes =
                this.mutableReadLanes =
                this.expiredLanes =
                this.pingedLanes =
                this.suspendedLanes =
                this.pendingLanes =
                    0),
            (this.entanglements = ai(0)),
            (this.identifierPrefix = r),
            (this.onRecoverableError = l),
            (this.mutableSourceEagerHydrationData = null));
    }
    function Do(e, t, n, r, l, i, a, d, f) {
        return (
            (e = new vf(e, t, n, d, f)),
            t === 1 ? ((t = 1), i === !0 && (t |= 8)) : (t = 0),
            (i = rt(3, null, null, t)),
            (e.current = i),
            (i.stateNode = e),
            (i.memoizedState = {
                element: r,
                isDehydrated: n,
                cache: null,
                transitions: null,
                pendingSuspenseBoundaries: null,
            }),
            Xi(i),
            e
        );
    }
    function yf(e, t, n) {
        var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
        return {
            $$typeof: Oe,
            key: r == null ? null : '' + r,
            children: e,
            containerInfo: t,
            implementation: n,
        };
    }
    function Hu(e) {
        if (!e) return Ut;
        e = e._reactInternals;
        e: {
            if (en(e) !== e || e.tag !== 1) throw Error(s(170));
            var t = e;
            do {
                switch (t.tag) {
                    case 3:
                        t = t.stateNode.context;
                        break e;
                    case 1:
                        if ($e(t.type)) {
                            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
                            break e;
                        }
                }
                t = t.return;
            } while (t !== null);
            throw Error(s(171));
        }
        if (e.tag === 1) {
            var n = e.type;
            if ($e(n)) return ys(e, n, t);
        }
        return t;
    }
    function Qu(e, t, n, r, l, i, a, d, f) {
        return (
            (e = Do(n, r, !0, e, l, i, a, d, f)),
            (e.context = Hu(null)),
            (n = e.current),
            (r = De()),
            (l = Qt(n)),
            (i = Et(r, l)),
            (i.callback = t ?? null),
            At(n, i, l),
            (e.current.lanes = l),
            Jn(e, l, r),
            Ve(e, r),
            e
        );
    }
    function Dl(e, t, n, r) {
        var l = t.current,
            i = De(),
            a = Qt(l);
        return (
            (n = Hu(n)),
            t.context === null ? (t.context = n) : (t.pendingContext = n),
            (t = Et(i, a)),
            (t.payload = { element: e }),
            (r = r === void 0 ? null : r),
            r !== null && (t.callback = r),
            (e = At(l, t, a)),
            e !== null && (dt(e, l, a, i), pl(e, l, a)),
            a
        );
    }
    function Fl(e) {
        if (((e = e.current), !e.child)) return null;
        switch (e.child.tag) {
            case 5:
                return e.child.stateNode;
            default:
                return e.child.stateNode;
        }
    }
    function Ku(e, t) {
        if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
            var n = e.retryLane;
            e.retryLane = n !== 0 && n < t ? n : t;
        }
    }
    function Fo(e, t) {
        (Ku(e, t), (e = e.alternate) && Ku(e, t));
    }
    function xf() {
        return null;
    }
    var Yu =
        typeof reportError == 'function'
            ? reportError
            : function (e) {
                  console.error(e);
              };
    function Uo(e) {
        this._internalRoot = e;
    }
    ((Ul.prototype.render = Uo.prototype.render =
        function (e) {
            var t = this._internalRoot;
            if (t === null) throw Error(s(409));
            Dl(e, t, null, null);
        }),
        (Ul.prototype.unmount = Uo.prototype.unmount =
            function () {
                var e = this._internalRoot;
                if (e !== null) {
                    this._internalRoot = null;
                    var t = e.containerInfo;
                    (cn(function () {
                        Dl(null, e, null, null);
                    }),
                        (t[wt] = null));
                }
            }));
    function Ul(e) {
        this._internalRoot = e;
    }
    Ul.prototype.unstable_scheduleHydration = function (e) {
        if (e) {
            var t = Ra();
            e = { blockedOn: null, target: e, priority: t };
            for (var n = 0; n < It.length && t !== 0 && t < It[n].priority; n++);
            (It.splice(n, 0, e), n === 0 && Ia(e));
        }
    };
    function Bo(e) {
        return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
    }
    function Bl(e) {
        return !(
            !e ||
            (e.nodeType !== 1 &&
                e.nodeType !== 9 &&
                e.nodeType !== 11 &&
                (e.nodeType !== 8 || e.nodeValue !== ' react-mount-point-unstable '))
        );
    }
    function Xu() {}
    function wf(e, t, n, r, l) {
        if (l) {
            if (typeof r == 'function') {
                var i = r;
                r = function () {
                    var k = Fl(a);
                    i.call(k);
                };
            }
            var a = Qu(t, r, e, 0, null, !1, !1, '', Xu);
            return (
                (e._reactRootContainer = a),
                (e[wt] = a.current),
                cr(e.nodeType === 8 ? e.parentNode : e),
                cn(),
                a
            );
        }
        for (; (l = e.lastChild); ) e.removeChild(l);
        if (typeof r == 'function') {
            var d = r;
            r = function () {
                var k = Fl(f);
                d.call(k);
            };
        }
        var f = Do(e, 0, !1, null, null, !1, !1, '', Xu);
        return (
            (e._reactRootContainer = f),
            (e[wt] = f.current),
            cr(e.nodeType === 8 ? e.parentNode : e),
            cn(function () {
                Dl(t, f, n, r);
            }),
            f
        );
    }
    function $l(e, t, n, r, l) {
        var i = n._reactRootContainer;
        if (i) {
            var a = i;
            if (typeof l == 'function') {
                var d = l;
                l = function () {
                    var f = Fl(a);
                    d.call(f);
                };
            }
            Dl(t, a, e, l);
        } else a = wf(n, t, e, l, r);
        return Fl(a);
    }
    ((_a = function (e) {
        switch (e.tag) {
            case 3:
                var t = e.stateNode;
                if (t.current.memoizedState.isDehydrated) {
                    var n = Gn(t.pendingLanes);
                    n !== 0 &&
                        (si(t, n | 1), Ve(t, ye()), (q & 6) === 0 && ((Un = ye() + 500), Bt()));
                }
                break;
            case 13:
                (cn(function () {
                    var r = jt(e, 1);
                    if (r !== null) {
                        var l = De();
                        dt(r, e, 1, l);
                    }
                }),
                    Fo(e, 1));
        }
    }),
        (ui = function (e) {
            if (e.tag === 13) {
                var t = jt(e, 134217728);
                if (t !== null) {
                    var n = De();
                    dt(t, e, 134217728, n);
                }
                Fo(e, 134217728);
            }
        }),
        (La = function (e) {
            if (e.tag === 13) {
                var t = Qt(e),
                    n = jt(e, t);
                if (n !== null) {
                    var r = De();
                    dt(n, e, t, r);
                }
                Fo(e, t);
            }
        }),
        (Ra = function () {
            return le;
        }),
        (Ta = function (e, t) {
            var n = le;
            try {
                return ((le = e), t());
            } finally {
                le = n;
            }
        }),
        (ti = function (e, t, n) {
            switch (t) {
                case 'input':
                    if ((Yl(e, n), (t = n.name), n.type === 'radio' && t != null)) {
                        for (n = e; n.parentNode; ) n = n.parentNode;
                        for (
                            n = n.querySelectorAll(
                                'input[name=' + JSON.stringify('' + t) + '][type="radio"]',
                            ),
                                t = 0;
                            t < n.length;
                            t++
                        ) {
                            var r = n[t];
                            if (r !== e && r.form === e.form) {
                                var l = rl(r);
                                if (!l) throw Error(s(90));
                                (ta(r), Yl(r, l));
                            }
                        }
                    }
                    break;
                case 'textarea':
                    oa(e, n);
                    break;
                case 'select':
                    ((t = n.value), t != null && hn(e, !!n.multiple, t, !1));
            }
        }),
        (ha = Ro),
        (ga = cn));
    var kf = { usingClientEntryPoint: !1, Events: [pr, En, rl, pa, ma, Ro] },
        Pr = {
            findFiberByHostInstance: tn,
            bundleType: 0,
            version: '18.3.1',
            rendererPackageName: 'react-dom',
        },
        Sf = {
            bundleType: Pr.bundleType,
            version: Pr.version,
            rendererPackageName: Pr.rendererPackageName,
            rendererConfig: Pr.rendererConfig,
            overrideHookState: null,
            overrideHookStateDeletePath: null,
            overrideHookStateRenamePath: null,
            overrideProps: null,
            overridePropsDeletePath: null,
            overridePropsRenamePath: null,
            setErrorHandler: null,
            setSuspenseHandler: null,
            scheduleUpdate: null,
            currentDispatcherRef: ae.ReactCurrentDispatcher,
            findHostInstanceByFiber: function (e) {
                return ((e = wa(e)), e === null ? null : e.stateNode);
            },
            findFiberByHostInstance: Pr.findFiberByHostInstance || xf,
            findHostInstancesForRefresh: null,
            scheduleRefresh: null,
            scheduleRoot: null,
            setRefreshHandler: null,
            getCurrentFiber: null,
            reconcilerVersion: '18.3.1-next-f1338f8080-20240426',
        };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
        var Al = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!Al.isDisabled && Al.supportsFiber)
            try {
                ((Ur = Al.inject(Sf)), (mt = Al));
            } catch {}
    }
    return (
        (He.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = kf),
        (He.createPortal = function (e, t) {
            var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
            if (!Bo(t)) throw Error(s(200));
            return yf(e, t, null, n);
        }),
        (He.createRoot = function (e, t) {
            if (!Bo(e)) throw Error(s(299));
            var n = !1,
                r = '',
                l = Yu;
            return (
                t != null &&
                    (t.unstable_strictMode === !0 && (n = !0),
                    t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
                    t.onRecoverableError !== void 0 && (l = t.onRecoverableError)),
                (t = Do(e, 1, !1, null, null, n, !1, r, l)),
                (e[wt] = t.current),
                cr(e.nodeType === 8 ? e.parentNode : e),
                new Uo(t)
            );
        }),
        (He.findDOMNode = function (e) {
            if (e == null) return null;
            if (e.nodeType === 1) return e;
            var t = e._reactInternals;
            if (t === void 0)
                throw typeof e.render == 'function'
                    ? Error(s(188))
                    : ((e = Object.keys(e).join(',')), Error(s(268, e)));
            return ((e = wa(t)), (e = e === null ? null : e.stateNode), e);
        }),
        (He.flushSync = function (e) {
            return cn(e);
        }),
        (He.hydrate = function (e, t, n) {
            if (!Bl(t)) throw Error(s(200));
            return $l(null, e, t, !0, n);
        }),
        (He.hydrateRoot = function (e, t, n) {
            if (!Bo(e)) throw Error(s(405));
            var r = (n != null && n.hydratedSources) || null,
                l = !1,
                i = '',
                a = Yu;
            if (
                (n != null &&
                    (n.unstable_strictMode === !0 && (l = !0),
                    n.identifierPrefix !== void 0 && (i = n.identifierPrefix),
                    n.onRecoverableError !== void 0 && (a = n.onRecoverableError)),
                (t = Qu(t, null, e, 1, n ?? null, l, !1, i, a)),
                (e[wt] = t.current),
                cr(e),
                r)
            )
                for (e = 0; e < r.length; e++)
                    ((n = r[e]),
                        (l = n._getVersion),
                        (l = l(n._source)),
                        t.mutableSourceEagerHydrationData == null
                            ? (t.mutableSourceEagerHydrationData = [n, l])
                            : t.mutableSourceEagerHydrationData.push(n, l));
            return new Ul(t);
        }),
        (He.render = function (e, t, n) {
            if (!Bl(t)) throw Error(s(200));
            return $l(null, e, t, !1, n);
        }),
        (He.unmountComponentAtNode = function (e) {
            if (!Bl(e)) throw Error(s(40));
            return e._reactRootContainer
                ? (cn(function () {
                      $l(null, null, e, !1, function () {
                          ((e._reactRootContainer = null), (e[wt] = null));
                      });
                  }),
                  !0)
                : !1;
        }),
        (He.unstable_batchedUpdates = Ro),
        (He.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
            if (!Bl(n)) throw Error(s(200));
            if (e == null || e._reactInternals === void 0) throw Error(s(38));
            return $l(e, t, n, !1, r);
        }),
        (He.version = '18.3.1-next-f1338f8080-20240426'),
        He
    );
}
var nc;
function hc() {
    if (nc) return Wo.exports;
    nc = 1;
    function o() {
        if (
            !(
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
            )
        )
            try {
                __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(o);
            } catch (c) {
                console.error(c);
            }
    }
    return (o(), (Wo.exports = Tf()), Wo.exports);
}
var rc;
function zf() {
    if (rc) return Wl;
    rc = 1;
    var o = hc();
    return ((Wl.createRoot = o.createRoot), (Wl.hydrateRoot = o.hydrateRoot), Wl);
}
var If = zf();
const Of = pc(If);
hc();
/**
 * @remix-run/router v1.23.1
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ function Rr() {
    return (
        (Rr = Object.assign
            ? Object.assign.bind()
            : function (o) {
                  for (var c = 1; c < arguments.length; c++) {
                      var s = arguments[c];
                      for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (o[p] = s[p]);
                  }
                  return o;
              }),
        Rr.apply(this, arguments)
    );
}
var Jt;
(function (o) {
    ((o.Pop = 'POP'), (o.Push = 'PUSH'), (o.Replace = 'REPLACE'));
})(Jt || (Jt = {}));
const lc = 'popstate';
function Mf(o) {
    o === void 0 && (o = {});
    function c(p, h) {
        let { pathname: w, search: x, hash: j } = p.location;
        return Ko(
            '',
            { pathname: w, search: x, hash: j },
            (h.state && h.state.usr) || null,
            (h.state && h.state.key) || 'default',
        );
    }
    function s(p, h) {
        return typeof h == 'string' ? h : Hl(h);
    }
    return Ff(c, s, null, o);
}
function we(o, c) {
    if (o === !1 || o === null || typeof o > 'u') throw new Error(c);
}
function Jo(o, c) {
    if (!o) {
        typeof console < 'u' && console.warn(c);
        try {
            throw new Error(c);
        } catch {}
    }
}
function Df() {
    return Math.random().toString(36).substr(2, 8);
}
function ic(o, c) {
    return { usr: o.state, key: o.key, idx: c };
}
function Ko(o, c, s, p) {
    return (
        s === void 0 && (s = null),
        Rr(
            { pathname: typeof o == 'string' ? o : o.pathname, search: '', hash: '' },
            typeof c == 'string' ? $n(c) : c,
            { state: s, key: (c && c.key) || p || Df() },
        )
    );
}
function Hl(o) {
    let { pathname: c = '/', search: s = '', hash: p = '' } = o;
    return (
        s && s !== '?' && (c += s.charAt(0) === '?' ? s : '?' + s),
        p && p !== '#' && (c += p.charAt(0) === '#' ? p : '#' + p),
        c
    );
}
function $n(o) {
    let c = {};
    if (o) {
        let s = o.indexOf('#');
        s >= 0 && ((c.hash = o.substr(s)), (o = o.substr(0, s)));
        let p = o.indexOf('?');
        (p >= 0 && ((c.search = o.substr(p)), (o = o.substr(0, p))), o && (c.pathname = o));
    }
    return c;
}
function Ff(o, c, s, p) {
    p === void 0 && (p = {});
    let { window: h = document.defaultView, v5Compat: w = !1 } = p,
        x = h.history,
        j = Jt.Pop,
        N = null,
        T = I();
    T == null && ((T = 0), x.replaceState(Rr({}, x.state, { idx: T }), ''));
    function I() {
        return (x.state || { idx: null }).idx;
    }
    function S() {
        j = Jt.Pop;
        let D = I(),
            ie = D == null ? null : D - T;
        ((T = D), N && N({ action: j, location: $.location, delta: ie }));
    }
    function O(D, ie) {
        j = Jt.Push;
        let oe = Ko($.location, D, ie);
        T = I() + 1;
        let ne = ic(oe, T),
            ae = $.createHref(oe);
        try {
            x.pushState(ne, '', ae);
        } catch (je) {
            if (je instanceof DOMException && je.name === 'DataCloneError') throw je;
            h.location.assign(ae);
        }
        w && N && N({ action: j, location: $.location, delta: 1 });
    }
    function z(D, ie) {
        j = Jt.Replace;
        let oe = Ko($.location, D, ie);
        T = I();
        let ne = ic(oe, T),
            ae = $.createHref(oe);
        (x.replaceState(ne, '', ae), w && N && N({ action: j, location: $.location, delta: 0 }));
    }
    function K(D) {
        let ie = h.location.origin !== 'null' ? h.location.origin : h.location.href,
            oe = typeof D == 'string' ? D : Hl(D);
        return (
            (oe = oe.replace(/ $/, '%20')),
            we(ie, 'No window.location.(origin|href) available to create URL for href: ' + oe),
            new URL(oe, ie)
        );
    }
    let $ = {
        get action() {
            return j;
        },
        get location() {
            return o(h, x);
        },
        listen(D) {
            if (N) throw new Error('A history only accepts one active listener');
            return (
                h.addEventListener(lc, S),
                (N = D),
                () => {
                    (h.removeEventListener(lc, S), (N = null));
                }
            );
        },
        createHref(D) {
            return c(h, D);
        },
        createURL: K,
        encodeLocation(D) {
            let ie = K(D);
            return { pathname: ie.pathname, search: ie.search, hash: ie.hash };
        },
        push: O,
        replace: z,
        go(D) {
            return x.go(D);
        },
    };
    return $;
}
var oc;
(function (o) {
    ((o.data = 'data'), (o.deferred = 'deferred'), (o.redirect = 'redirect'), (o.error = 'error'));
})(oc || (oc = {}));
function Uf(o, c, s) {
    return (s === void 0 && (s = '/'), Bf(o, c, s));
}
function Bf(o, c, s, p) {
    let h = typeof c == 'string' ? $n(c) : c,
        w = Zo(h.pathname || '/', s);
    if (w == null) return null;
    let x = gc(o);
    $f(x);
    let j = null;
    for (let N = 0; j == null && N < x.length; ++N) {
        let T = qf(w);
        j = Gf(x[N], T);
    }
    return j;
}
function gc(o, c, s, p) {
    (c === void 0 && (c = []), s === void 0 && (s = []), p === void 0 && (p = ''));
    let h = (w, x, j) => {
        let N = {
            relativePath: j === void 0 ? w.path || '' : j,
            caseSensitive: w.caseSensitive === !0,
            childrenIndex: x,
            route: w,
        };
        N.relativePath.startsWith('/') &&
            (we(
                N.relativePath.startsWith(p),
                'Absolute route path "' +
                    N.relativePath +
                    '" nested under path ' +
                    ('"' + p + '" is not valid. An absolute child route path ') +
                    'must start with the combined path of all its parent routes.',
            ),
            (N.relativePath = N.relativePath.slice(p.length)));
        let T = Zt([p, N.relativePath]),
            I = s.concat(N);
        (w.children &&
            w.children.length > 0 &&
            (we(
                w.index !== !0,
                'Index routes must not have child routes. Please remove ' +
                    ('all child routes from route path "' + T + '".'),
            ),
            gc(w.children, c, I, T)),
            !(w.path == null && !w.index) &&
                c.push({ path: T, score: Yf(T, w.index), routesMeta: I }));
    };
    return (
        o.forEach((w, x) => {
            var j;
            if (w.path === '' || !((j = w.path) != null && j.includes('?'))) h(w, x);
            else for (let N of vc(w.path)) h(w, x, N);
        }),
        c
    );
}
function vc(o) {
    let c = o.split('/');
    if (c.length === 0) return [];
    let [s, ...p] = c,
        h = s.endsWith('?'),
        w = s.replace(/\?$/, '');
    if (p.length === 0) return h ? [w, ''] : [w];
    let x = vc(p.join('/')),
        j = [];
    return (
        j.push(...x.map((N) => (N === '' ? w : [w, N].join('/')))),
        h && j.push(...x),
        j.map((N) => (o.startsWith('/') && N === '' ? '/' : N))
    );
}
function $f(o) {
    o.sort((c, s) =>
        c.score !== s.score
            ? s.score - c.score
            : Xf(
                  c.routesMeta.map((p) => p.childrenIndex),
                  s.routesMeta.map((p) => p.childrenIndex),
              ),
    );
}
const Af = /^:[\w-]+$/,
    Wf = 3,
    Vf = 2,
    Hf = 1,
    Qf = 10,
    Kf = -2,
    ac = (o) => o === '*';
function Yf(o, c) {
    let s = o.split('/'),
        p = s.length;
    return (
        s.some(ac) && (p += Kf),
        c && (p += Vf),
        s.filter((h) => !ac(h)).reduce((h, w) => h + (Af.test(w) ? Wf : w === '' ? Hf : Qf), p)
    );
}
function Xf(o, c) {
    return o.length === c.length && o.slice(0, -1).every((p, h) => p === c[h])
        ? o[o.length - 1] - c[c.length - 1]
        : 0;
}
function Gf(o, c, s) {
    let { routesMeta: p } = o,
        h = {},
        w = '/',
        x = [];
    for (let j = 0; j < p.length; ++j) {
        let N = p[j],
            T = j === p.length - 1,
            I = w === '/' ? c : c.slice(w.length) || '/',
            S = Jf({ path: N.relativePath, caseSensitive: N.caseSensitive, end: T }, I),
            O = N.route;
        if (!S) return null;
        (Object.assign(h, S.params),
            x.push({
                params: h,
                pathname: Zt([w, S.pathname]),
                pathnameBase: rp(Zt([w, S.pathnameBase])),
                route: O,
            }),
            S.pathnameBase !== '/' && (w = Zt([w, S.pathnameBase])));
    }
    return x;
}
function Jf(o, c) {
    typeof o == 'string' && (o = { path: o, caseSensitive: !1, end: !0 });
    let [s, p] = Zf(o.path, o.caseSensitive, o.end),
        h = c.match(s);
    if (!h) return null;
    let w = h[0],
        x = w.replace(/(.)\/+$/, '$1'),
        j = h.slice(1);
    return {
        params: p.reduce((T, I, S) => {
            let { paramName: O, isOptional: z } = I;
            if (O === '*') {
                let $ = j[S] || '';
                x = w.slice(0, w.length - $.length).replace(/(.)\/+$/, '$1');
            }
            const K = j[S];
            return (z && !K ? (T[O] = void 0) : (T[O] = (K || '').replace(/%2F/g, '/')), T);
        }, {}),
        pathname: w,
        pathnameBase: x,
        pattern: o,
    };
}
function Zf(o, c, s) {
    (c === void 0 && (c = !1),
        s === void 0 && (s = !0),
        Jo(
            o === '*' || !o.endsWith('*') || o.endsWith('/*'),
            'Route path "' +
                o +
                '" will be treated as if it were ' +
                ('"' + o.replace(/\*$/, '/*') + '" because the `*` character must ') +
                'always follow a `/` in the pattern. To get rid of this warning, ' +
                ('please change the route path to "' + o.replace(/\*$/, '/*') + '".'),
        ));
    let p = [],
        h =
            '^' +
            o
                .replace(/\/*\*?$/, '')
                .replace(/^\/*/, '/')
                .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
                .replace(
                    /\/:([\w-]+)(\?)?/g,
                    (x, j, N) => (
                        p.push({ paramName: j, isOptional: N != null }),
                        N ? '/?([^\\/]+)?' : '/([^\\/]+)'
                    ),
                );
    return (
        o.endsWith('*')
            ? (p.push({ paramName: '*' }),
              (h += o === '*' || o === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'))
            : s
              ? (h += '\\/*$')
              : o !== '' && o !== '/' && (h += '(?:(?=\\/|$))'),
        [new RegExp(h, c ? void 0 : 'i'), p]
    );
}
function qf(o) {
    try {
        return o
            .split('/')
            .map((c) => decodeURIComponent(c).replace(/\//g, '%2F'))
            .join('/');
    } catch (c) {
        return (
            Jo(
                !1,
                'The URL path "' +
                    o +
                    '" could not be decoded because it is is a malformed URL segment. This is probably due to a bad percent ' +
                    ('encoding (' + c + ').'),
            ),
            o
        );
    }
}
function Zo(o, c) {
    if (c === '/') return o;
    if (!o.toLowerCase().startsWith(c.toLowerCase())) return null;
    let s = c.endsWith('/') ? c.length - 1 : c.length,
        p = o.charAt(s);
    return p && p !== '/' ? null : o.slice(s) || '/';
}
const bf = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
    ep = (o) => bf.test(o);
function tp(o, c) {
    c === void 0 && (c = '/');
    let { pathname: s, search: p = '', hash: h = '' } = typeof o == 'string' ? $n(o) : o,
        w;
    if (s)
        if (ep(s)) w = s;
        else {
            if (s.includes('//')) {
                let x = s;
                ((s = s.replace(/\/\/+/g, '/')),
                    Jo(
                        !1,
                        'Pathnames cannot have embedded double slashes - normalizing ' +
                            (x + ' -> ' + s),
                    ));
            }
            s.startsWith('/') ? (w = sc(s.substring(1), '/')) : (w = sc(s, c));
        }
    else w = c;
    return { pathname: w, search: lp(p), hash: ip(h) };
}
function sc(o, c) {
    let s = c.replace(/\/+$/, '').split('/');
    return (
        o.split('/').forEach((h) => {
            h === '..' ? s.length > 1 && s.pop() : h !== '.' && s.push(h);
        }),
        s.length > 1 ? s.join('/') : '/'
    );
}
function Qo(o, c, s, p) {
    return (
        "Cannot include a '" +
        o +
        "' character in a manually specified " +
        ('`to.' + c + '` field [' + JSON.stringify(p) + '].  Please separate it out to the ') +
        ('`to.' + s + '` field. Alternatively you may provide the full path as ') +
        'a string in <Link to="..."> and the router will parse it for you.'
    );
}
function np(o) {
    return o.filter((c, s) => s === 0 || (c.route.path && c.route.path.length > 0));
}
function qo(o, c) {
    let s = np(o);
    return c
        ? s.map((p, h) => (h === s.length - 1 ? p.pathname : p.pathnameBase))
        : s.map((p) => p.pathnameBase);
}
function bo(o, c, s, p) {
    p === void 0 && (p = !1);
    let h;
    typeof o == 'string'
        ? (h = $n(o))
        : ((h = Rr({}, o)),
          we(!h.pathname || !h.pathname.includes('?'), Qo('?', 'pathname', 'search', h)),
          we(!h.pathname || !h.pathname.includes('#'), Qo('#', 'pathname', 'hash', h)),
          we(!h.search || !h.search.includes('#'), Qo('#', 'search', 'hash', h)));
    let w = o === '' || h.pathname === '',
        x = w ? '/' : h.pathname,
        j;
    if (x == null) j = s;
    else {
        let S = c.length - 1;
        if (!p && x.startsWith('..')) {
            let O = x.split('/');
            for (; O[0] === '..'; ) (O.shift(), (S -= 1));
            h.pathname = O.join('/');
        }
        j = S >= 0 ? c[S] : '/';
    }
    let N = tp(h, j),
        T = x && x !== '/' && x.endsWith('/'),
        I = (w || x === '.') && s.endsWith('/');
    return (!N.pathname.endsWith('/') && (T || I) && (N.pathname += '/'), N);
}
const Zt = (o) => o.join('/').replace(/\/\/+/g, '/'),
    rp = (o) => o.replace(/\/+$/, '').replace(/^\/*/, '/'),
    lp = (o) => (!o || o === '?' ? '' : o.startsWith('?') ? o : '?' + o),
    ip = (o) => (!o || o === '#' ? '' : o.startsWith('#') ? o : '#' + o);
function op(o) {
    return (
        o != null &&
        typeof o.status == 'number' &&
        typeof o.statusText == 'string' &&
        typeof o.internal == 'boolean' &&
        'data' in o
    );
}
const yc = ['post', 'put', 'patch', 'delete'];
new Set(yc);
const ap = ['get', ...yc];
new Set(ap);
/**
 * React Router v6.30.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ function Tr() {
    return (
        (Tr = Object.assign
            ? Object.assign.bind()
            : function (o) {
                  for (var c = 1; c < arguments.length; c++) {
                      var s = arguments[c];
                      for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (o[p] = s[p]);
                  }
                  return o;
              }),
        Tr.apply(this, arguments)
    );
}
const ea = L.createContext(null),
    sp = L.createContext(null),
    qt = L.createContext(null),
    Ql = L.createContext(null),
    _t = L.createContext({ outlet: null, matches: [], isDataRoute: !1 }),
    xc = L.createContext(null);
function up(o, c) {
    let { relative: s } = c === void 0 ? {} : c;
    An() || we(!1);
    let { basename: p, navigator: h } = L.useContext(qt),
        { hash: w, pathname: x, search: j } = Sc(o, { relative: s }),
        N = x;
    return (
        p !== '/' && (N = x === '/' ? p : Zt([p, x])),
        h.createHref({ pathname: N, search: j, hash: w })
    );
}
function An() {
    return L.useContext(Ql) != null;
}
function Wn() {
    return (An() || we(!1), L.useContext(Ql).location);
}
function wc(o) {
    L.useContext(qt).static || L.useLayoutEffect(o);
}
function kc() {
    let { isDataRoute: o } = L.useContext(_t);
    return o ? jp() : cp();
}
function cp() {
    An() || we(!1);
    let o = L.useContext(ea),
        { basename: c, future: s, navigator: p } = L.useContext(qt),
        { matches: h } = L.useContext(_t),
        { pathname: w } = Wn(),
        x = JSON.stringify(qo(h, s.v7_relativeSplatPath)),
        j = L.useRef(!1);
    return (
        wc(() => {
            j.current = !0;
        }),
        L.useCallback(
            function (T, I) {
                if ((I === void 0 && (I = {}), !j.current)) return;
                if (typeof T == 'number') {
                    p.go(T);
                    return;
                }
                let S = bo(T, JSON.parse(x), w, I.relative === 'path');
                (o == null &&
                    c !== '/' &&
                    (S.pathname = S.pathname === '/' ? c : Zt([c, S.pathname])),
                    (I.replace ? p.replace : p.push)(S, I.state, I));
            },
            [c, p, x, w, o],
        )
    );
}
const dp = L.createContext(null);
function fp(o) {
    let c = L.useContext(_t).outlet;
    return c && L.createElement(dp.Provider, { value: o }, c);
}
function Sc(o, c) {
    let { relative: s } = c === void 0 ? {} : c,
        { future: p } = L.useContext(qt),
        { matches: h } = L.useContext(_t),
        { pathname: w } = Wn(),
        x = JSON.stringify(qo(h, p.v7_relativeSplatPath));
    return L.useMemo(() => bo(o, JSON.parse(x), w, s === 'path'), [o, x, w, s]);
}
function pp(o, c) {
    return mp(o, c);
}
function mp(o, c, s, p) {
    An() || we(!1);
    let { navigator: h } = L.useContext(qt),
        { matches: w } = L.useContext(_t),
        x = w[w.length - 1],
        j = x ? x.params : {};
    x && x.pathname;
    let N = x ? x.pathnameBase : '/';
    x && x.route;
    let T = Wn(),
        I;
    if (c) {
        var S;
        let D = typeof c == 'string' ? $n(c) : c;
        (N === '/' || ((S = D.pathname) != null && S.startsWith(N)) || we(!1), (I = D));
    } else I = T;
    let O = I.pathname || '/',
        z = O;
    if (N !== '/') {
        let D = N.replace(/^\//, '').split('/');
        z = '/' + O.replace(/^\//, '').split('/').slice(D.length).join('/');
    }
    let K = Uf(o, { pathname: z }),
        $ = xp(
            K &&
                K.map((D) =>
                    Object.assign({}, D, {
                        params: Object.assign({}, j, D.params),
                        pathname: Zt([
                            N,
                            h.encodeLocation ? h.encodeLocation(D.pathname).pathname : D.pathname,
                        ]),
                        pathnameBase:
                            D.pathnameBase === '/'
                                ? N
                                : Zt([
                                      N,
                                      h.encodeLocation
                                          ? h.encodeLocation(D.pathnameBase).pathname
                                          : D.pathnameBase,
                                  ]),
                    }),
                ),
            w,
            s,
            p,
        );
    return c && $
        ? L.createElement(
              Ql.Provider,
              {
                  value: {
                      location: Tr(
                          { pathname: '/', search: '', hash: '', state: null, key: 'default' },
                          I,
                      ),
                      navigationType: Jt.Pop,
                  },
              },
              $,
          )
        : $;
}
function hp() {
    let o = Np(),
        c = op(o)
            ? o.status + ' ' + o.statusText
            : o instanceof Error
              ? o.message
              : JSON.stringify(o),
        s = o instanceof Error ? o.stack : null,
        h = { padding: '0.5rem', backgroundColor: 'rgba(200,200,200, 0.5)' };
    return L.createElement(
        L.Fragment,
        null,
        L.createElement('h2', null, 'Unexpected Application Error!'),
        L.createElement('h3', { style: { fontStyle: 'italic' } }, c),
        s ? L.createElement('pre', { style: h }, s) : null,
        null,
    );
}
const gp = L.createElement(hp, null);
class vp extends L.Component {
    constructor(c) {
        (super(c),
            (this.state = { location: c.location, revalidation: c.revalidation, error: c.error }));
    }
    static getDerivedStateFromError(c) {
        return { error: c };
    }
    static getDerivedStateFromProps(c, s) {
        return s.location !== c.location || (s.revalidation !== 'idle' && c.revalidation === 'idle')
            ? { error: c.error, location: c.location, revalidation: c.revalidation }
            : {
                  error: c.error !== void 0 ? c.error : s.error,
                  location: s.location,
                  revalidation: c.revalidation || s.revalidation,
              };
    }
    componentDidCatch(c, s) {
        console.error('React Router caught the following error during render', c, s);
    }
    render() {
        return this.state.error !== void 0
            ? L.createElement(
                  _t.Provider,
                  { value: this.props.routeContext },
                  L.createElement(xc.Provider, {
                      value: this.state.error,
                      children: this.props.component,
                  }),
              )
            : this.props.children;
    }
}
function yp(o) {
    let { routeContext: c, match: s, children: p } = o,
        h = L.useContext(ea);
    return (
        h &&
            h.static &&
            h.staticContext &&
            (s.route.errorElement || s.route.ErrorBoundary) &&
            (h.staticContext._deepestRenderedBoundaryId = s.route.id),
        L.createElement(_t.Provider, { value: c }, p)
    );
}
function xp(o, c, s, p) {
    var h;
    if (
        (c === void 0 && (c = []),
        s === void 0 && (s = null),
        p === void 0 && (p = null),
        o == null)
    ) {
        var w;
        if (!s) return null;
        if (s.errors) o = s.matches;
        else if (
            (w = p) != null &&
            w.v7_partialHydration &&
            c.length === 0 &&
            !s.initialized &&
            s.matches.length > 0
        )
            o = s.matches;
        else return null;
    }
    let x = o,
        j = (h = s) == null ? void 0 : h.errors;
    if (j != null) {
        let I = x.findIndex((S) => S.route.id && (j == null ? void 0 : j[S.route.id]) !== void 0);
        (I >= 0 || we(!1), (x = x.slice(0, Math.min(x.length, I + 1))));
    }
    let N = !1,
        T = -1;
    if (s && p && p.v7_partialHydration)
        for (let I = 0; I < x.length; I++) {
            let S = x[I];
            if (
                ((S.route.HydrateFallback || S.route.hydrateFallbackElement) && (T = I), S.route.id)
            ) {
                let { loaderData: O, errors: z } = s,
                    K =
                        S.route.loader &&
                        O[S.route.id] === void 0 &&
                        (!z || z[S.route.id] === void 0);
                if (S.route.lazy || K) {
                    ((N = !0), T >= 0 ? (x = x.slice(0, T + 1)) : (x = [x[0]]));
                    break;
                }
            }
        }
    return x.reduceRight((I, S, O) => {
        let z,
            K = !1,
            $ = null,
            D = null;
        s &&
            ((z = j && S.route.id ? j[S.route.id] : void 0),
            ($ = S.route.errorElement || gp),
            N &&
                (T < 0 && O === 0
                    ? (Ep('route-fallback'), (K = !0), (D = null))
                    : T === O && ((K = !0), (D = S.route.hydrateFallbackElement || null))));
        let ie = c.concat(x.slice(0, O + 1)),
            oe = () => {
                let ne;
                return (
                    z
                        ? (ne = $)
                        : K
                          ? (ne = D)
                          : S.route.Component
                            ? (ne = L.createElement(S.route.Component, null))
                            : S.route.element
                              ? (ne = S.route.element)
                              : (ne = I),
                    L.createElement(yp, {
                        match: S,
                        routeContext: { outlet: I, matches: ie, isDataRoute: s != null },
                        children: ne,
                    })
                );
            };
        return s && (S.route.ErrorBoundary || S.route.errorElement || O === 0)
            ? L.createElement(vp, {
                  location: s.location,
                  revalidation: s.revalidation,
                  component: $,
                  error: z,
                  children: oe(),
                  routeContext: { outlet: null, matches: ie, isDataRoute: !0 },
              })
            : oe();
    }, null);
}
var Nc = (function (o) {
        return (
            (o.UseBlocker = 'useBlocker'),
            (o.UseRevalidator = 'useRevalidator'),
            (o.UseNavigateStable = 'useNavigate'),
            o
        );
    })(Nc || {}),
    jc = (function (o) {
        return (
            (o.UseBlocker = 'useBlocker'),
            (o.UseLoaderData = 'useLoaderData'),
            (o.UseActionData = 'useActionData'),
            (o.UseRouteError = 'useRouteError'),
            (o.UseNavigation = 'useNavigation'),
            (o.UseRouteLoaderData = 'useRouteLoaderData'),
            (o.UseMatches = 'useMatches'),
            (o.UseRevalidator = 'useRevalidator'),
            (o.UseNavigateStable = 'useNavigate'),
            (o.UseRouteId = 'useRouteId'),
            o
        );
    })(jc || {});
function wp(o) {
    let c = L.useContext(ea);
    return (c || we(!1), c);
}
function kp(o) {
    let c = L.useContext(sp);
    return (c || we(!1), c);
}
function Sp(o) {
    let c = L.useContext(_t);
    return (c || we(!1), c);
}
function Ec(o) {
    let c = Sp(),
        s = c.matches[c.matches.length - 1];
    return (s.route.id || we(!1), s.route.id);
}
function Np() {
    var o;
    let c = L.useContext(xc),
        s = kp(),
        p = Ec();
    return c !== void 0 ? c : (o = s.errors) == null ? void 0 : o[p];
}
function jp() {
    let { router: o } = wp(Nc.UseNavigateStable),
        c = Ec(jc.UseNavigateStable),
        s = L.useRef(!1);
    return (
        wc(() => {
            s.current = !0;
        }),
        L.useCallback(
            function (h, w) {
                (w === void 0 && (w = {}),
                    s.current &&
                        (typeof h == 'number'
                            ? o.navigate(h)
                            : o.navigate(h, Tr({ fromRouteId: c }, w))));
            },
            [o, c],
        )
    );
}
const uc = {};
function Ep(o, c, s) {
    uc[o] || (uc[o] = !0);
}
function Cp(o, c) {
    (o == null || o.v7_startTransition, o == null || o.v7_relativeSplatPath);
}
function Pp(o) {
    let { to: c, replace: s, state: p, relative: h } = o;
    An() || we(!1);
    let { future: w, static: x } = L.useContext(qt),
        { matches: j } = L.useContext(_t),
        { pathname: N } = Wn(),
        T = kc(),
        I = bo(c, qo(j, w.v7_relativeSplatPath), N, h === 'path'),
        S = JSON.stringify(I);
    return (
        L.useEffect(() => T(JSON.parse(S), { replace: s, state: p, relative: h }), [T, S, h, s, p]),
        null
    );
}
function _p(o) {
    return fp(o.context);
}
function Gt(o) {
    we(!1);
}
function Lp(o) {
    let {
        basename: c = '/',
        children: s = null,
        location: p,
        navigationType: h = Jt.Pop,
        navigator: w,
        static: x = !1,
        future: j,
    } = o;
    An() && we(!1);
    let N = c.replace(/^\/*/, '/'),
        T = L.useMemo(
            () => ({
                basename: N,
                navigator: w,
                static: x,
                future: Tr({ v7_relativeSplatPath: !1 }, j),
            }),
            [N, j, w, x],
        );
    typeof p == 'string' && (p = $n(p));
    let {
            pathname: I = '/',
            search: S = '',
            hash: O = '',
            state: z = null,
            key: K = 'default',
        } = p,
        $ = L.useMemo(() => {
            let D = Zo(I, N);
            return D == null
                ? null
                : {
                      location: { pathname: D, search: S, hash: O, state: z, key: K },
                      navigationType: h,
                  };
        }, [N, I, S, O, z, K, h]);
    return $ == null
        ? null
        : L.createElement(
              qt.Provider,
              { value: T },
              L.createElement(Ql.Provider, { children: s, value: $ }),
          );
}
function Rp(o) {
    let { children: c, location: s } = o;
    return pp(Yo(c), s);
}
new Promise(() => {});
function Yo(o, c) {
    c === void 0 && (c = []);
    let s = [];
    return (
        L.Children.forEach(o, (p, h) => {
            if (!L.isValidElement(p)) return;
            let w = [...c, h];
            if (p.type === L.Fragment) {
                s.push.apply(s, Yo(p.props.children, w));
                return;
            }
            (p.type !== Gt && we(!1), !p.props.index || !p.props.children || we(!1));
            let x = {
                id: p.props.id || w.join('-'),
                caseSensitive: p.props.caseSensitive,
                element: p.props.element,
                Component: p.props.Component,
                index: p.props.index,
                path: p.props.path,
                loader: p.props.loader,
                action: p.props.action,
                errorElement: p.props.errorElement,
                ErrorBoundary: p.props.ErrorBoundary,
                hasErrorBoundary: p.props.ErrorBoundary != null || p.props.errorElement != null,
                shouldRevalidate: p.props.shouldRevalidate,
                handle: p.props.handle,
                lazy: p.props.lazy,
            };
            (p.props.children && (x.children = Yo(p.props.children, w)), s.push(x));
        }),
        s
    );
}
/**
 * React Router DOM v6.30.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ function Xo() {
    return (
        (Xo = Object.assign
            ? Object.assign.bind()
            : function (o) {
                  for (var c = 1; c < arguments.length; c++) {
                      var s = arguments[c];
                      for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (o[p] = s[p]);
                  }
                  return o;
              }),
        Xo.apply(this, arguments)
    );
}
function Tp(o, c) {
    if (o == null) return {};
    var s = {},
        p = Object.keys(o),
        h,
        w;
    for (w = 0; w < p.length; w++) ((h = p[w]), !(c.indexOf(h) >= 0) && (s[h] = o[h]));
    return s;
}
function zp(o) {
    return !!(o.metaKey || o.altKey || o.ctrlKey || o.shiftKey);
}
function Ip(o, c) {
    return o.button === 0 && (!c || c === '_self') && !zp(o);
}
const Op = [
        'onClick',
        'relative',
        'reloadDocument',
        'replace',
        'state',
        'target',
        'to',
        'preventScrollReset',
        'viewTransition',
    ],
    Mp = '6';
try {
    window.__reactRouterVersion = Mp;
} catch {}
const Dp = 'startTransition',
    cc = _f[Dp];
function Fp(o) {
    let { basename: c, children: s, future: p, window: h } = o,
        w = L.useRef();
    w.current == null && (w.current = Mf({ window: h, v5Compat: !0 }));
    let x = w.current,
        [j, N] = L.useState({ action: x.action, location: x.location }),
        { v7_startTransition: T } = p || {},
        I = L.useCallback(
            (S) => {
                T && cc ? cc(() => N(S)) : N(S);
            },
            [N, T],
        );
    return (
        L.useLayoutEffect(() => x.listen(I), [x, I]),
        L.useEffect(() => Cp(p), [p]),
        L.createElement(Lp, {
            basename: c,
            children: s,
            location: j.location,
            navigationType: j.action,
            navigator: x,
            future: p,
        })
    );
}
const Up =
        typeof window < 'u' &&
        typeof window.document < 'u' &&
        typeof window.document.createElement < 'u',
    Bp = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
    $p = L.forwardRef(function (c, s) {
        let {
                onClick: p,
                relative: h,
                reloadDocument: w,
                replace: x,
                state: j,
                target: N,
                to: T,
                preventScrollReset: I,
                viewTransition: S,
            } = c,
            O = Tp(c, Op),
            { basename: z } = L.useContext(qt),
            K,
            $ = !1;
        if (typeof T == 'string' && Bp.test(T) && ((K = T), Up))
            try {
                let ne = new URL(window.location.href),
                    ae = T.startsWith('//') ? new URL(ne.protocol + T) : new URL(T),
                    je = Zo(ae.pathname, z);
                ae.origin === ne.origin && je != null ? (T = je + ae.search + ae.hash) : ($ = !0);
            } catch {}
        let D = up(T, { relative: h }),
            ie = Ap(T, {
                replace: x,
                state: j,
                target: N,
                preventScrollReset: I,
                relative: h,
                viewTransition: S,
            });
        function oe(ne) {
            (p && p(ne), ne.defaultPrevented || ie(ne));
        }
        return L.createElement(
            'a',
            Xo({}, O, { href: K || D, onClick: $ || w ? p : oe, ref: s, target: N }),
        );
    });
var dc;
(function (o) {
    ((o.UseScrollRestoration = 'useScrollRestoration'),
        (o.UseSubmit = 'useSubmit'),
        (o.UseSubmitFetcher = 'useSubmitFetcher'),
        (o.UseFetcher = 'useFetcher'),
        (o.useViewTransitionState = 'useViewTransitionState'));
})(dc || (dc = {}));
var fc;
(function (o) {
    ((o.UseFetcher = 'useFetcher'),
        (o.UseFetchers = 'useFetchers'),
        (o.UseScrollRestoration = 'useScrollRestoration'));
})(fc || (fc = {}));
function Ap(o, c) {
    let {
            target: s,
            replace: p,
            state: h,
            preventScrollReset: w,
            relative: x,
            viewTransition: j,
        } = c === void 0 ? {} : c,
        N = kc(),
        T = Wn(),
        I = Sc(o, { relative: x });
    return L.useCallback(
        (S) => {
            if (Ip(S, s)) {
                S.preventDefault();
                let O = p !== void 0 ? p : Hl(T) === Hl(I);
                N(o, {
                    replace: O,
                    state: h,
                    preventScrollReset: w,
                    relative: x,
                    viewTransition: j,
                });
            }
        },
        [T, N, I, p, h, s, o, w, x, j],
    );
}
const mn = '/api';
async function Wp() {
    const o = await fetch(`${mn}/status`);
    if (!o.ok) throw new Error('Failed to fetch workers');
    return o.json();
}
async function Vp(o = 1, c = 10) {
    const s = await fetch(`${mn}/queues?page=${o}&limit=${c}`);
    if (!s.ok) throw new Error('Failed to fetch queues');
    return s.json();
}
async function Cc(o = 10) {
    const c = await fetch(`${mn}/stats?limit=${o}`);
    if (!c.ok) throw new Error('Failed to fetch stats');
    return c.json();
}
async function Hp() {
    const o = await fetch(`${mn}/cache`);
    if (!o.ok) throw new Error('Failed to fetch cache stats');
    return o.json();
}
async function Qp() {
    const o = await fetch(`${mn}/logs`);
    if (!o.ok) throw new Error('Failed to fetch logs');
    return o.json();
}
async function Kp() {
    const o = await fetch(`${mn}/auth/me`);
    return o.ok ? o.json() : null;
}
async function Yp() {
    (await fetch(`${mn}/auth/logout`, { method: 'POST' }), window.location.reload());
}
function Xp() {
    const [o, c] = L.useState(() => {
        const p = localStorage.getItem('theme');
        return p === 'dark' || (!p && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });
    return (
        L.useEffect(() => {
            (o
                ? document.documentElement.classList.add('dark')
                : document.documentElement.classList.remove('dark'),
                localStorage.setItem('theme', o ? 'dark' : 'light'));
        }, [o]),
        { isDark: o, toggleTheme: () => c(!o) }
    );
}
function Gp() {
    const { isDark: o, toggleTheme: c } = Xp(),
        [s, p] = L.useState(null);
    return (
        L.useEffect(() => {
            Kp().then((h) => {
                h != null && h.user && p(h.user);
            });
        }, []),
        L.useEffect(() => {
            typeof window.lucide < 'u' && window.lucide.createIcons();
        }, [s, o]),
        u.jsx('header', {
            className:
                'bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50 h-20',
            children: u.jsx('div', {
                className: 'container mx-auto px-4 sm:px-6 lg:px-8',
                children: u.jsxs('div', {
                    className: 'flex justify-between items-center h-20',
                    children: [
                        u.jsxs('div', {
                            className: 'flex items-center gap-3',
                            children: [
                                u.jsx('img', {
                                    src: '/assets/images/jasper-logo.png',
                                    alt: 'Jasper Logo',
                                    className:
                                        'h-12 w-12 object-contain rounded-full border-2 border-brand-primary glow-primary',
                                }),
                                u.jsxs('span', {
                                    className:
                                        'text-xl font-bold text-gray-900 dark:text-white tracking-tight',
                                    children: [
                                        'Jasper ',
                                        u.jsx('span', {
                                            className: 'text-brand-primary',
                                            children: 'Dashboard',
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        u.jsxs('nav', {
                            className: 'hidden lg:flex items-center space-x-1',
                            children: [
                                u.jsx(Lr, { to: '/workers', icon: 'users', children: 'Workers' }),
                                u.jsx(Lr, {
                                    to: '/queues',
                                    icon: 'list-music',
                                    children: 'Queues',
                                }),
                                u.jsx(Lr, { to: '/stats', icon: 'bar-chart-2', children: 'Stats' }),
                                u.jsx(Lr, { to: '/cache', icon: 'database', children: 'Cache' }),
                                u.jsx(Lr, { to: '/logs', icon: 'terminal', children: 'Logs' }),
                                u.jsx('div', {
                                    className: 'ml-2',
                                    children: s
                                        ? u.jsxs('div', {
                                              className: 'flex items-center gap-3',
                                              children: [
                                                  u.jsxs('div', {
                                                      className: 'flex items-center gap-2',
                                                      children: [
                                                          s.avatar
                                                              ? u.jsx('img', {
                                                                    src: s.avatar,
                                                                    className:
                                                                        'w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700',
                                                                    alt: s.username,
                                                                })
                                                              : u.jsx('div', {
                                                                    className:
                                                                        'w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
                                                                    children: u.jsx('i', {
                                                                        'data-lucide': 'user',
                                                                        className:
                                                                            'w-4 h-4 text-gray-500',
                                                                    }),
                                                                }),
                                                          u.jsx('span', {
                                                              className:
                                                                  'text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline',
                                                              children: s.username,
                                                          }),
                                                      ],
                                                  }),
                                                  u.jsx('button', {
                                                      onClick: Yp,
                                                      className:
                                                          'p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                                      title: 'Logout',
                                                      children: u.jsx('i', {
                                                          'data-lucide': 'log-out',
                                                          className: 'w-4 h-4',
                                                      }),
                                                  }),
                                              ],
                                          })
                                        : u.jsxs('a', {
                                              href: '/api/auth/login',
                                              className:
                                                  'px-4 py-2 rounded-full text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors flex items-center gap-2',
                                              children: [
                                                  u.jsx('i', {
                                                      'data-lucide': 'log-in',
                                                      className: 'w-4 h-4',
                                                  }),
                                                  'Login',
                                              ],
                                          }),
                                }),
                                u.jsx('button', {
                                    onClick: c,
                                    type: 'button',
                                    className:
                                        'ml-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2.5 transition-colors',
                                    children: o
                                        ? u.jsx('svg', {
                                              className: 'w-5 h-5',
                                              fill: 'currentColor',
                                              viewBox: '0 0 20 20',
                                              children: u.jsx('path', {
                                                  d: 'M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z',
                                              }),
                                          })
                                        : u.jsx('svg', {
                                              className: 'w-5 h-5',
                                              fill: 'currentColor',
                                              viewBox: '0 0 20 20',
                                              children: u.jsx('path', {
                                                  d: 'M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607l-.707-.707a1 1 0 010-1.414 1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414zM4.95 15.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zM1.414 6.364l.707.707a1 1 0 010 1.414 1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z',
                                                  fillRule: 'evenodd',
                                                  clipRule: 'evenodd',
                                              }),
                                          }),
                                }),
                            ],
                        }),
                    ],
                }),
            }),
        })
    );
}
function Lr({ to: o, icon: c, children: s }) {
    const h = Wn().pathname === o;
    return u.jsxs($p, {
        to: o,
        className: `px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${h ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-brand-primary'}`,
        children: [u.jsx('i', { 'data-lucide': c, className: 'w-4 h-4' }), s],
    });
}
function Jp() {
    return u.jsxs('div', {
        className:
            'min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300',
        children: [
            u.jsx(Gp, {}),
            u.jsx('main', {
                className: 'container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 mt-6',
                children: u.jsx(_p, {}),
            }),
            u.jsx('footer', {
                className:
                    'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto',
                children: u.jsx('div', {
                    className: 'container mx-auto px-4 text-center',
                    children: u.jsxs('p', {
                        className: 'text-gray-500 dark:text-gray-400 text-sm',
                        children: [
                            '© 2025 Jasper Music Bot. All rights reserved. |',
                            ' ',
                            u.jsx('a', {
                                href: '/devtools.html',
                                className: 'hover:text-brand-primary transition-colors',
                                children: 'DevTools',
                            }),
                        ],
                    }),
                }),
            }),
        ],
    });
}
function Zp() {
    const [o, c] = L.useState([]),
        [s, p] = L.useState(!0);
    return (
        L.useEffect(() => {
            const h = async () => {
                try {
                    const x = await Wp();
                    c(x.workers || []);
                } catch (x) {
                    console.error('Failed to fetch workers:', x);
                } finally {
                    p(!1);
                }
            };
            h();
            const w = setInterval(h, 3e3);
            return () => clearInterval(w);
        }, []),
        L.useEffect(() => {
            typeof window.lucide < 'u' && window.lucide.createIcons();
        }, [o]),
        s
            ? u.jsxs('section', {
                  children: [
                      u.jsxs('h2', {
                          className:
                              'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                          children: [
                              u.jsx('i', {
                                  'data-lucide': 'users',
                                  className: 'w-8 h-8 text-brand-primary',
                              }),
                              'Heavenly Council',
                          ],
                      }),
                      u.jsx('div', {
                          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
                          children: [1, 2, 3].map((h) =>
                              u.jsx(
                                  'div',
                                  {
                                      className:
                                          'animate-pulse bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 h-48',
                                  },
                                  h,
                              ),
                          ),
                      }),
                  ],
              })
            : u.jsxs('section', {
                  id: 'workers',
                  className: 'mb-16 scroll-mt-24',
                  children: [
                      u.jsxs('h2', {
                          className:
                              'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                          children: [
                              u.jsx('i', {
                                  'data-lucide': 'users',
                                  className: 'w-8 h-8 text-brand-primary',
                              }),
                              'Heavenly Council',
                          ],
                      }),
                      u.jsx('div', {
                          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
                          children:
                              o.length === 0
                                  ? u.jsx('div', {
                                        className: 'col-span-full text-center py-12 text-gray-500',
                                        children: 'No workers available',
                                    })
                                  : o.map((h) => u.jsx(qp, { worker: h }, h.name)),
                      }),
                  ],
              })
    );
}
function qp({ worker: o }) {
    const c = o.status !== 'offline',
        s = o.busy;
    let p = 'text-gray-400',
        h = 'bg-gray-400',
        w = 'border-gray-200 dark:border-gray-700',
        x = 'Offline';
    return (
        c &&
            (s
                ? ((p = 'text-brand-secondary'),
                  (h = 'bg-brand-secondary'),
                  (w = 'border-brand-secondary'),
                  (x = 'Busy'))
                : ((p = 'text-brand-primary'),
                  (h = 'bg-brand-primary'),
                  (w = 'border-brand-primary'),
                  (x = 'Idle'))),
        u.jsxs('div', {
            className: `bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 ${w} transition-all hover:scale-[1.02] relative overflow-hidden group dark:border-t-0 dark:border-r-0 dark:border-b-0`,
            children: [
                u.jsx('div', {
                    className:
                        'absolute top-2 right-2 text-6xl opacity-5 pointer-events-none select-none transform rotate-12',
                    children: '🎵',
                }),
                u.jsxs('div', {
                    className: 'flex items-start gap-4 mb-4 relative z-10',
                    children: [
                        u.jsxs('div', {
                            className: 'relative',
                            children: [
                                u.jsx('img', {
                                    src: o.avatarUrl || '/assets/images/jasper-logo.png',
                                    alt: o.name,
                                    className: `w-16 h-16 rounded-full border-2 ${w} shadow-md object-cover bg-gray-100 dark:bg-gray-700`,
                                }),
                                u.jsx('div', {
                                    className: `absolute bottom-0 right-0 w-4 h-4 rounded-full ${h} border-2 border-white dark:border-gray-800`,
                                }),
                            ],
                        }),
                        u.jsx('div', {
                            className: 'flex-1 min-w-0',
                            children: u.jsxs('div', {
                                className: 'flex justify-between items-start',
                                children: [
                                    u.jsxs('div', {
                                        children: [
                                            u.jsx('h3', {
                                                className:
                                                    'text-xl font-bold text-gray-900 dark:text-white truncate',
                                                children: o.name,
                                            }),
                                            u.jsx('p', {
                                                className:
                                                    'text-sm text-gray-500 dark:text-gray-400 capitalize',
                                                children: o.role,
                                            }),
                                        ],
                                    }),
                                    u.jsx('span', {
                                        className: `text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${p}`,
                                        children: x,
                                    }),
                                ],
                            }),
                        }),
                    ],
                }),
                u.jsxs('div', {
                    className: 'space-y-3 relative z-10',
                    children: [
                        u.jsxs('div', {
                            className:
                                'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg',
                            children: [
                                u.jsx('i', {
                                    'data-lucide': 'activity',
                                    className: 'w-4 h-4 text-brand-primary shrink-0',
                                }),
                                u.jsx('span', {
                                    className: 'truncate',
                                    children:
                                        o.activity === 'Custom Status'
                                            ? 'Playing Music'
                                            : o.activity || 'None',
                                }),
                            ],
                        }),
                        o.guildId &&
                            u.jsxs('div', {
                                className:
                                    'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300',
                                children: [
                                    o.guildIconUrl
                                        ? u.jsx('img', {
                                              src: o.guildIconUrl,
                                              className: 'w-4 h-4 rounded-full object-cover',
                                              alt: '',
                                          })
                                        : u.jsx('i', {
                                              'data-lucide': 'server',
                                              className: 'w-4 h-4 text-gray-400 shrink-0',
                                          }),
                                    u.jsxs('span', {
                                        className: 'truncate font-medium',
                                        children: [
                                            o.guildName || o.guildId,
                                            o.voiceChannelId &&
                                                u.jsxs(u.Fragment, {
                                                    children: [
                                                        u.jsx('span', {
                                                            className: 'text-gray-400 mx-1',
                                                            children: '•',
                                                        }),
                                                        o.channelName || o.voiceChannelId,
                                                    ],
                                                }),
                                        ],
                                    }),
                                ],
                            }),
                        o.nowPlaying &&
                            u.jsxs('div', {
                                className:
                                    'mt-3 pt-3 border-t border-gray-100 dark:border-gray-700',
                                children: [
                                    u.jsx('div', {
                                        className:
                                            'flex items-center justify-between text-xs text-gray-500 mb-2',
                                        children: u.jsx('span', {
                                            className:
                                                'text-brand-secondary font-bold uppercase tracking-wider',
                                            children: 'Now Playing',
                                        }),
                                    }),
                                    u.jsxs('div', {
                                        className: 'flex items-center gap-3',
                                        children: [
                                            u.jsx('div', {
                                                className:
                                                    'relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0',
                                                children: o.nowPlaying.thumbnail
                                                    ? u.jsx('img', {
                                                          src: o.nowPlaying.thumbnail,
                                                          className: 'w-full h-full object-cover',
                                                          alt: '',
                                                      })
                                                    : u.jsx('div', {
                                                          className:
                                                              'flex items-center justify-center w-full h-full',
                                                          children: u.jsx('i', {
                                                              'data-lucide': 'music',
                                                              className: 'w-6 h-6 text-gray-400',
                                                          }),
                                                      }),
                                            }),
                                            u.jsx('div', {
                                                className: 'min-w-0',
                                                children: u.jsx('p', {
                                                    className:
                                                        'text-sm font-medium text-gray-900 dark:text-white truncate',
                                                    title: o.nowPlaying.title,
                                                    children: o.nowPlaying.title,
                                                }),
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                    ],
                }),
            ],
        })
    );
}
function bp() {
    const [o, c] = L.useState([]),
        [s, p] = L.useState({ currentPage: 1, totalPages: 1, totalQueues: 0, limit: 10 }),
        [h, w] = L.useState(!0),
        [x, j] = L.useState(new Set()),
        N = async (z = s.currentPage) => {
            try {
                w(!0);
                const K = window.matchMedia('(min-width: 1024px)').matches ? 20 : 10,
                    $ = await Vp(z, K);
                (c($.queues || []),
                    p($.pagination || { currentPage: z, totalPages: 1, totalQueues: 0, limit: K }));
            } catch (K) {
                console.error('Failed to fetch queues:', K);
            } finally {
                w(!1);
            }
        };
    (L.useEffect(() => {
        N();
        const z = setInterval(() => N(s.currentPage), 3e3);
        return () => clearInterval(z);
    }, []),
        L.useEffect(() => {
            typeof window.lucide < 'u' && window.lucide.createIcons();
        }, [o]));
    const T = (z) => {
            if (!z) return '00:00';
            const K = Math.floor(z / 60),
                $ = Math.floor(z % 60);
            return `${K}:${$.toString().padStart(2, '0')}`;
        },
        I = (z) => {
            if (!z || z < 60) return 'in <1m';
            const K = Math.floor(z / 3600),
                $ = Math.round((z % 3600) / 60);
            return K > 0 ? `in ${K}h${$}m` : `in ${$}m`;
        },
        S = (z) => {
            j((K) => {
                const $ = new Set(K);
                return ($.has(z) ? $.delete(z) : $.add(z), $);
            });
        },
        O = (z) => {
            N(z);
        };
    return h && o.length === 0
        ? u.jsxs('section', {
              id: 'queues',
              className: 'mb-16 scroll-mt-24',
              children: [
                  u.jsxs('h2', {
                      className:
                          'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                      children: [
                          u.jsx('i', {
                              'data-lucide': 'list-music',
                              className: 'w-8 h-8 text-brand-secondary',
                          }),
                          'Active Queues',
                      ],
                  }),
                  u.jsx('div', {
                      className: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
                      children: [1, 2].map((z) =>
                          u.jsx(
                              'div',
                              {
                                  className:
                                      'animate-pulse bg-white dark:bg-gray-800 p-6 rounded-xl h-64',
                              },
                              z,
                          ),
                      ),
                  }),
              ],
          })
        : u.jsxs('section', {
              id: 'queues',
              className: 'mb-16 scroll-mt-24',
              children: [
                  u.jsxs('h2', {
                      className:
                          'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                      children: [
                          u.jsx('i', {
                              'data-lucide': 'list-music',
                              className: 'w-8 h-8 text-brand-secondary',
                          }),
                          'Active Queues',
                      ],
                  }),
                  o.length === 0
                      ? u.jsxs('div', {
                            className:
                                'col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700',
                            children: [
                                u.jsx('i', {
                                    'data-lucide': 'music-2',
                                    className: 'w-12 h-12 mx-auto mb-3 opacity-50',
                                }),
                                u.jsx('p', {
                                    className: 'text-gray-500',
                                    children: 'No active queues found',
                                }),
                            ],
                        })
                      : u.jsxs(u.Fragment, {
                            children: [
                                u.jsx('div', {
                                    className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6',
                                    children: o.map((z) =>
                                        u.jsx(
                                            em,
                                            {
                                                queue: z,
                                                isExpanded: x.has(
                                                    `${z.guildId}-${z.voiceChannelId}`,
                                                ),
                                                onToggle: () =>
                                                    S(`${z.guildId}-${z.voiceChannelId}`),
                                                formatDuration: T,
                                                formatEta: I,
                                            },
                                            `${z.guildId}-${z.voiceChannelId}`,
                                        ),
                                    ),
                                }),
                                s.totalPages > 1 &&
                                    u.jsxs('div', {
                                        className: 'flex items-center justify-center gap-4',
                                        children: [
                                            u.jsx('button', {
                                                onClick: () => O(s.currentPage - 1),
                                                disabled: !s.hasPreviousPage,
                                                className:
                                                    'px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                                                children: u.jsx('i', {
                                                    'data-lucide': 'chevron-left',
                                                    className: 'w-4 h-4',
                                                }),
                                            }),
                                            u.jsxs('div', {
                                                className:
                                                    'text-sm text-gray-600 dark:text-gray-400',
                                                children: [
                                                    'Page ',
                                                    u.jsx('span', {
                                                        className:
                                                            'font-bold text-gray-900 dark:text-white',
                                                        children: s.currentPage,
                                                    }),
                                                    ' of ',
                                                    u.jsx('span', {
                                                        className: 'font-bold',
                                                        children: s.totalPages,
                                                    }),
                                                    u.jsxs('span', {
                                                        className: 'text-xs ml-2',
                                                        children: [
                                                            '(',
                                                            s.totalQueues,
                                                            ' total queues)',
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            u.jsx('button', {
                                                onClick: () => O(s.currentPage + 1),
                                                disabled: !s.hasNextPage,
                                                className:
                                                    'px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                                                children: u.jsx('i', {
                                                    'data-lucide': 'chevron-right',
                                                    className: 'w-4 h-4',
                                                }),
                                            }),
                                        ],
                                    }),
                            ],
                        }),
              ],
          });
}
function em({ queue: o, isExpanded: c, onToggle: s, formatDuration: p, formatEta: h }) {
    var O;
    let j = o.songs || [];
    o.nowPlaying && j.length > 0 && j[0].title === o.nowPlaying.title && (j = j.slice(1));
    const N = c ? j.slice(0, 20) : j.slice(0, 10),
        T = j.length > 10,
        I = j.length > 20;
    let S = 0;
    if ((O = o.nowPlaying) != null && O.duration) {
        const z = o.nowPlaying.startTime ? (Date.now() - o.nowPlaying.startTime) / 1e3 : 0;
        S = Math.max(0, o.nowPlaying.duration - z);
    }
    return u.jsxs('div', {
        id: `queue-${o.guildId}-${o.voiceChannelId}`,
        className:
            'bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:border-brand-primary/30 transition-colors shadow-sm scroll-mt-24',
        children: [
            u.jsxs('div', {
                className: 'flex items-center justify-between mb-4',
                children: [
                    u.jsxs('div', {
                        className: 'flex items-center gap-3',
                        children: [
                            u.jsx('div', {
                                className:
                                    'w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary',
                                children: u.jsx('i', {
                                    'data-lucide': 'list-music',
                                    className: 'w-5 h-5',
                                }),
                            }),
                            u.jsxs('div', {
                                children: [
                                    u.jsx('h3', {
                                        className: 'font-bold text-gray-900 dark:text-white',
                                        children: o.guildName || o.guildId,
                                    }),
                                    u.jsxs('div', {
                                        className:
                                            'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400',
                                        children: [
                                            u.jsx('span', { children: o.voiceChannelId }),
                                            u.jsx('span', { children: '•' }),
                                            u.jsxs('span', { children: [o.queueLength, ' songs'] }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    u.jsxs('div', {
                        className: 'text-right',
                        children: [
                            u.jsx('div', {
                                className:
                                    'text-xs text-gray-500 uppercase tracking-wider font-bold mb-1',
                                children: 'Worker',
                            }),
                            u.jsx('div', {
                                className: 'text-sm text-brand-primary font-medium',
                                children: o.workerName,
                            }),
                        ],
                    }),
                ],
            }),
            o.nowPlaying &&
                u.jsxs('div', {
                    className:
                        'bg-brand-primary/10 rounded-lg p-3 border-l-4 border-brand-primary mb-3',
                    children: [
                        u.jsxs('div', {
                            className:
                                'text-xs text-brand-primary uppercase tracking-wider font-bold mb-2 flex items-center gap-2',
                            children: [
                                u.jsx('i', { 'data-lucide': 'play-circle', className: 'w-4 h-4' }),
                                'Now Playing',
                            ],
                        }),
                        u.jsx('div', {
                            className: 'flex items-start gap-3',
                            children: u.jsxs('div', {
                                className: 'flex-1 min-w-0',
                                children: [
                                    u.jsx('a', {
                                        href: o.nowPlaying.url,
                                        target: '_blank',
                                        rel: 'noopener noreferrer',
                                        className:
                                            'text-sm font-medium text-gray-900 dark:text-white hover:text-brand-primary transition-colors truncate block',
                                        children: o.nowPlaying.title,
                                    }),
                                    u.jsx('div', {
                                        className:
                                            'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2 mb-1 overflow-hidden',
                                        children:
                                            o.nowPlaying.startTime &&
                                            o.nowPlaying.duration &&
                                            u.jsx('div', {
                                                className:
                                                    'bg-brand-primary h-1.5 rounded-full transition-all duration-1000',
                                                style: {
                                                    width: `${Math.min(100, Math.max(0, ((Date.now() - o.nowPlaying.startTime) / 1e3 / o.nowPlaying.duration) * 100))}%`,
                                                },
                                            }),
                                    }),
                                    u.jsx('div', {
                                        className:
                                            'flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400',
                                        children: u.jsxs('div', {
                                            className: 'flex items-center gap-2',
                                            children: [
                                                u.jsx('span', {
                                                    children: p(o.nowPlaying.duration),
                                                }),
                                                u.jsx('span', { children: '•' }),
                                                u.jsx('span', {
                                                    children:
                                                        o.nowPlaying.requestedBy === 'Radio'
                                                            ? `Enqueued by Radio ${o.workerName} 📻 🐱`
                                                            : `Requested by ${o.nowPlaying.requestedBy}`,
                                                }),
                                            ],
                                        }),
                                    }),
                                ],
                            }),
                        }),
                    ],
                }),
            j.length > 0 &&
                u.jsxs('div', {
                    className: 'space-y-2',
                    children: [
                        u.jsxs('div', {
                            className: 'text-xs text-gray-500 uppercase tracking-wider font-bold',
                            children: ['Up Next (', j.length, ' songs)'],
                        }),
                        N.map((z, K) => {
                            const $ = S;
                            return (
                                (S += z.duration || 0),
                                u.jsx(
                                    'div',
                                    {
                                        className:
                                            'bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-600 hover:border-brand-secondary/30 transition-colors',
                                        children: u.jsxs('div', {
                                            className: 'flex items-center gap-3',
                                            children: [
                                                u.jsx('div', {
                                                    className:
                                                        'relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0',
                                                    children: z.thumbnail
                                                        ? u.jsx('img', {
                                                              src: z.thumbnail,
                                                              className:
                                                                  'w-full h-full object-cover',
                                                              alt: '',
                                                          })
                                                        : u.jsx('div', {
                                                              className:
                                                                  'flex items-center justify-center w-full h-full',
                                                              children: u.jsx('i', {
                                                                  'data-lucide': 'music',
                                                                  className:
                                                                      'w-6 h-6 text-gray-400',
                                                              }),
                                                          }),
                                                }),
                                                u.jsxs('div', {
                                                    className: 'flex-1 min-w-0',
                                                    children: [
                                                        u.jsxs('a', {
                                                            href: z.url,
                                                            target: '_blank',
                                                            rel: 'noopener noreferrer',
                                                            className:
                                                                'text-xs font-medium text-gray-900 dark:text-white hover:text-brand-secondary transition-colors truncate block',
                                                            children: [K + 1, '. ', z.title],
                                                        }),
                                                        u.jsxs('div', {
                                                            className:
                                                                'flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400',
                                                            children: [
                                                                u.jsx('span', {
                                                                    children: p(z.duration),
                                                                }),
                                                                u.jsx('span', { children: '•' }),
                                                                u.jsx('span', {
                                                                    children:
                                                                        z.requestedBy === 'Radio'
                                                                            ? `Radio ${o.workerName} 📻 🐱`
                                                                            : z.requestedBy,
                                                                }),
                                                            ],
                                                        }),
                                                    ],
                                                }),
                                                u.jsxs('div', {
                                                    className:
                                                        'text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0',
                                                    children: ['ETA ', h($)],
                                                }),
                                            ],
                                        }),
                                    },
                                    K,
                                )
                            );
                        }),
                        T &&
                            u.jsx('button', {
                                onClick: s,
                                className:
                                    'w-full mt-2 px-3 py-2 text-xs font-medium text-brand-secondary hover:text-brand-primary border border-brand-secondary/30 hover:border-brand-primary rounded-lg transition-colors flex items-center justify-center gap-2',
                                children: c
                                    ? u.jsxs(u.Fragment, {
                                          children: [
                                              u.jsx('i', {
                                                  'data-lucide': 'chevron-up',
                                                  className: 'w-4 h-4',
                                              }),
                                              'Show Less',
                                          ],
                                      })
                                    : u.jsxs(u.Fragment, {
                                          children: [
                                              u.jsx('i', {
                                                  'data-lucide': 'chevron-down',
                                                  className: 'w-4 h-4',
                                              }),
                                              'Show ',
                                              Math.min(10, j.length - 10),
                                              ' More Songs',
                                              I && ` (${j.length - 20} more not shown)`,
                                          ],
                                      }),
                            }),
                    ],
                }),
        ],
    });
}
function tm() {
    var I;
    const [o, c] = L.useState(null),
        [s, p] = L.useState(!0);
    (L.useEffect(() => {
        const S = async () => {
            try {
                const z = await Cc(10);
                c(z);
            } catch (z) {
                console.error('Failed to fetch stats:', z);
            } finally {
                p(!1);
            }
        };
        S();
        const O = setInterval(S, 1e4);
        return () => clearInterval(O);
    }, []),
        L.useEffect(() => {
            typeof window.lucide < 'u' && window.lucide.createIcons();
        }, [o]));
    const h = (S) => {
        if (!S) return '00:00';
        const O = Math.floor(S / 3600),
            z = Math.floor((S % 3600) / 60);
        return O > 0 ? `${O}h ${z}m` : `${z}m`;
    };
    if (s)
        return u.jsxs('section', {
            id: 'stats',
            className: 'mb-16 scroll-mt-24',
            children: [
                u.jsxs('h2', {
                    className:
                        'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                    children: [
                        u.jsx('i', {
                            'data-lucide': 'bar-chart-2',
                            className: 'w-8 h-8 text-brand-secondary',
                        }),
                        'Statistics',
                    ],
                }),
                u.jsx('div', {
                    className: 'animate-pulse space-y-8',
                    children: u.jsx('div', {
                        className: 'grid grid-cols-1 md:grid-cols-2 gap-6',
                        children: [1, 2].map((S) =>
                            u.jsx(
                                'div',
                                { className: 'bg-white dark:bg-gray-800 p-6 rounded-2xl h-24' },
                                S,
                            ),
                        ),
                    }),
                }),
            ],
        });
    const { globalStats: w, topSongs: x, topUsers: j, topChannels: N, topBots: T } = o || {};
    return u.jsxs('section', {
        id: 'stats',
        className: 'mb-16 scroll-mt-24',
        children: [
            u.jsxs('h2', {
                className:
                    'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                children: [
                    u.jsx('i', {
                        'data-lucide': 'bar-chart-2',
                        className: 'w-8 h-8 text-brand-secondary',
                    }),
                    'Statistics',
                ],
            }),
            u.jsxs('div', {
                className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8',
                children: [
                    u.jsxs('div', {
                        className:
                            'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-primary dark:border-t-0 dark:border-r-0 dark:border-b-0',
                        children: [
                            u.jsx('h3', {
                                className:
                                    'text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider',
                                children: 'Total Plays',
                            }),
                            u.jsx('p', {
                                className: 'text-4xl font-bold text-gray-900 dark:text-white mt-2',
                                children:
                                    ((I = w == null ? void 0 : w.totalPlays) == null
                                        ? void 0
                                        : I.toLocaleString()) || 0,
                            }),
                        ],
                    }),
                    u.jsxs('div', {
                        className:
                            'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-secondary dark:border-t-0 dark:border-r-0 dark:border-b-0',
                        children: [
                            u.jsx('h3', {
                                className:
                                    'text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider',
                                children: 'Total Playtime',
                            }),
                            u.jsx('p', {
                                className: 'text-4xl font-bold text-gray-900 dark:text-white mt-2',
                                children: h((w == null ? void 0 : w.totalDuration) || 0),
                            }),
                        ],
                    }),
                ],
            }),
            u.jsxs('div', {
                className: 'grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8',
                children: [
                    u.jsx(Vl, {
                        title: 'Top Songs',
                        icon: 'music',
                        color: 'brand-primary',
                        children:
                            (x == null ? void 0 : x.length) > 0
                                ? x.map((S, O) =>
                                      u.jsxs(
                                          'div',
                                          {
                                              className:
                                                  'p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                              children: [
                                                  u.jsx('div', {
                                                      className:
                                                          'text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center',
                                                      children: O + 1,
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'flex-1 min-w-0',
                                                      children: [
                                                          u.jsx('a', {
                                                              href: S.songUrl,
                                                              target: '_blank',
                                                              rel: 'noopener noreferrer',
                                                              className:
                                                                  'font-medium text-gray-900 dark:text-white hover:text-brand-primary truncate block',
                                                              children: S.songTitle,
                                                          }),
                                                          u.jsxs('div', {
                                                              className:
                                                                  'text-xs text-gray-500 dark:text-gray-400 mt-0.5',
                                                              children: [
                                                                  h(S.totalDuration),
                                                                  ' total played',
                                                              ],
                                                          }),
                                                      ],
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'text-right',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-bold text-brand-secondary',
                                                              children: S.playCount,
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-[10px] text-gray-400 uppercase tracking-wider',
                                                              children: 'Plays',
                                                          }),
                                                      ],
                                                  }),
                                              ],
                                          },
                                          S.songUrl,
                                      ),
                                  )
                                : u.jsx('div', {
                                      className: 'p-4 text-center text-gray-500 text-sm',
                                      children: 'No data yet',
                                  }),
                    }),
                    u.jsx(Vl, {
                        title: 'Top Listeners',
                        icon: 'user',
                        color: 'brand-secondary',
                        children:
                            (j == null ? void 0 : j.length) > 0
                                ? j.map((S, O) =>
                                      u.jsxs(
                                          'div',
                                          {
                                              className:
                                                  'p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                              children: [
                                                  u.jsx('div', {
                                                      className:
                                                          'text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center',
                                                      children: O + 1,
                                                  }),
                                                  S.avatarUrl
                                                      ? u.jsx('img', {
                                                            src: S.avatarUrl,
                                                            alt: S.username,
                                                            className:
                                                                'w-10 h-10 rounded-full border-2 border-brand-primary object-cover',
                                                        })
                                                      : u.jsx('div', {
                                                            className:
                                                                'w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600',
                                                        }),
                                                  u.jsxs('div', {
                                                      className: 'flex-1 min-w-0',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-medium text-gray-900 dark:text-white truncate',
                                                              children: S.username,
                                                          }),
                                                          u.jsxs('div', {
                                                              className:
                                                                  'text-xs text-gray-500 dark:text-gray-400 mt-0.5',
                                                              children: [
                                                                  h(S.totalDuration),
                                                                  ' total listening time',
                                                              ],
                                                          }),
                                                      ],
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'text-right',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-bold text-brand-primary',
                                                              children: S.playCount,
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-[10px] text-gray-400 uppercase tracking-wider',
                                                              children: 'Plays',
                                                          }),
                                                      ],
                                                  }),
                                              ],
                                          },
                                          S.userId,
                                      ),
                                  )
                                : u.jsx('div', {
                                      className: 'p-4 text-center text-gray-500 text-sm',
                                      children: 'No data yet',
                                  }),
                    }),
                ],
            }),
            u.jsxs('div', {
                className: 'grid grid-cols-1 lg:grid-cols-2 gap-8',
                children: [
                    u.jsx(Vl, {
                        title: 'Top Channels',
                        icon: 'hash',
                        color: 'brand-primary',
                        children:
                            (N == null ? void 0 : N.length) > 0
                                ? N.map((S, O) =>
                                      u.jsxs(
                                          'div',
                                          {
                                              className:
                                                  'p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                              title: S.guildName,
                                              children: [
                                                  u.jsx('div', {
                                                      className:
                                                          'text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center',
                                                      children: O + 1,
                                                  }),
                                                  S.guildIconUrl
                                                      ? u.jsx('img', {
                                                            src: S.guildIconUrl,
                                                            alt: S.guildName,
                                                            className:
                                                                'w-10 h-10 rounded-full border-2 border-brand-primary object-cover',
                                                        })
                                                      : u.jsx('div', {
                                                            className:
                                                                'w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center',
                                                            children: u.jsx('i', {
                                                                'data-lucide': 'hash',
                                                                className: 'w-5 h-5 text-gray-500',
                                                            }),
                                                        }),
                                                  u.jsxs('div', {
                                                      className: 'flex-1 min-w-0',
                                                      children: [
                                                          u.jsxs('div', {
                                                              className:
                                                                  'font-medium text-gray-900 dark:text-white truncate flex items-center gap-1',
                                                              children: [
                                                                  u.jsx('i', {
                                                                      'data-lucide': 'hash',
                                                                      className:
                                                                          'w-3 h-3 text-gray-400',
                                                                  }),
                                                                  S.channelName,
                                                              ],
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate',
                                                              children: S.guildName,
                                                          }),
                                                      ],
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'text-right',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-bold text-brand-primary',
                                                              children: S.playCount,
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-[10px] text-gray-400 uppercase tracking-wider',
                                                              children: 'Plays',
                                                          }),
                                                      ],
                                                  }),
                                              ],
                                          },
                                          S.channelId,
                                      ),
                                  )
                                : u.jsx('div', {
                                      className: 'p-4 text-center text-gray-500 text-sm',
                                      children: 'No data yet',
                                  }),
                    }),
                    u.jsx(Vl, {
                        title: 'Top Bots',
                        icon: 'bot',
                        color: 'brand-secondary',
                        children:
                            (T == null ? void 0 : T.length) > 0
                                ? T.map((S, O) =>
                                      u.jsxs(
                                          'div',
                                          {
                                              className:
                                                  'p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                              children: [
                                                  u.jsx('div', {
                                                      className:
                                                          'text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center',
                                                      children: O + 1,
                                                  }),
                                                  u.jsx('div', {
                                                      className:
                                                          'w-10 h-10 rounded-full bg-brand-secondary/10 flex items-center justify-center',
                                                      children: u.jsx('i', {
                                                          'data-lucide': 'bot',
                                                          className: 'w-5 h-5 text-brand-secondary',
                                                      }),
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'flex-1 min-w-0',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-medium text-gray-900 dark:text-white truncate',
                                                              children: S.botName,
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-xs text-gray-500 dark:text-gray-400 mt-0.5',
                                                              children: 'Heavenly Council Member',
                                                          }),
                                                      ],
                                                  }),
                                                  u.jsxs('div', {
                                                      className: 'text-right',
                                                      children: [
                                                          u.jsx('div', {
                                                              className:
                                                                  'font-bold text-brand-secondary',
                                                              children: S.playCount,
                                                          }),
                                                          u.jsx('div', {
                                                              className:
                                                                  'text-[10px] text-gray-400 uppercase tracking-wider',
                                                              children: 'Plays',
                                                          }),
                                                      ],
                                                  }),
                                              ],
                                          },
                                          S.botName,
                                      ),
                                  )
                                : u.jsx('div', {
                                      className: 'p-4 text-center text-gray-500 text-sm',
                                      children: 'No data yet',
                                  }),
                    }),
                ],
            }),
        ],
    });
}
function Vl({ title: o, icon: c, color: s, children: p }) {
    return u.jsxs('div', {
        className:
            'bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden',
        children: [
            u.jsx('div', {
                className:
                    'p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
                children: u.jsxs('h3', {
                    className: 'font-bold text-gray-900 dark:text-white flex items-center gap-2',
                    children: [u.jsx('i', { 'data-lucide': c, className: `w-4 h-4 text-${s}` }), o],
                }),
            }),
            u.jsx('div', {
                className:
                    'divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto',
                children: p,
            }),
        ],
    });
}
function nm() {
    const [o, c] = L.useState(null),
        [s, p] = L.useState([]),
        [h, w] = L.useState(!0);
    return (
        L.useEffect(() => {
            const x = async () => {
                try {
                    const [N, T] = await Promise.all([Hp(), Cc(10)]);
                    (c(N.stats), p(T.topCacheHits || []));
                } catch (N) {
                    console.error('Failed to fetch cache stats:', N);
                } finally {
                    w(!1);
                }
            };
            x();
            const j = setInterval(x, 1e4);
            return () => clearInterval(j);
        }, []),
        L.useEffect(() => {
            typeof window.lucide < 'u' && window.lucide.createIcons();
        }, [o, s]),
        h
            ? u.jsxs('section', {
                  id: 'cache',
                  className: 'mb-16 scroll-mt-24',
                  children: [
                      u.jsxs('h2', {
                          className:
                              'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                          children: [
                              u.jsx('i', {
                                  'data-lucide': 'database',
                                  className: 'w-8 h-8 text-brand-primary',
                              }),
                              'Cache Statistics',
                          ],
                      }),
                      u.jsx('div', {
                          className: 'animate-pulse space-y-8',
                          children: u.jsx('div', {
                              className: 'grid grid-cols-1 md:grid-cols-3 gap-6',
                              children: [1, 2, 3].map((x) =>
                                  u.jsx(
                                      'div',
                                      {
                                          className:
                                              'bg-white dark:bg-gray-800 p-6 rounded-2xl h-24',
                                      },
                                      x,
                                  ),
                              ),
                          }),
                      }),
                  ],
              })
            : u.jsxs('section', {
                  id: 'cache',
                  className: 'mb-16 scroll-mt-24',
                  children: [
                      u.jsxs('h2', {
                          className:
                              'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                          children: [
                              u.jsx('i', {
                                  'data-lucide': 'database',
                                  className: 'w-8 h-8 text-brand-primary',
                              }),
                              'Cache Statistics',
                          ],
                      }),
                      u.jsxs('div', {
                          className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8',
                          children: [
                              u.jsxs('div', {
                                  className:
                                      'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-primary hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0',
                                  children: [
                                      u.jsx('h3', {
                                          className:
                                              'text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider',
                                          children: 'Search Cache',
                                      }),
                                      u.jsxs('p', {
                                          className:
                                              'text-3xl font-bold text-gray-900 dark:text-white mt-2',
                                          children: [
                                              (o == null ? void 0 : o.searchCacheSize) || 0,
                                              ' entries',
                                          ],
                                      }),
                                  ],
                              }),
                              u.jsxs('div', {
                                  className:
                                      'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-brand-secondary hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0',
                                  children: [
                                      u.jsx('h3', {
                                          className:
                                              'text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider',
                                          children: 'Audio Files',
                                      }),
                                      u.jsxs('p', {
                                          className:
                                              'text-3xl font-bold text-gray-900 dark:text-white mt-2',
                                          children: [
                                              (o == null ? void 0 : o.audioCacheFiles) || 0,
                                              ' files',
                                          ],
                                      }),
                                  ],
                              }),
                              u.jsxs('div', {
                                  className:
                                      'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-l-4 border-purple-500 hover-card dark:border-t-0 dark:border-r-0 dark:border-b-0',
                                  children: [
                                      u.jsx('h3', {
                                          className:
                                              'text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider',
                                          children: 'Storage Used',
                                      }),
                                      u.jsxs('p', {
                                          className:
                                              'text-3xl font-bold text-gray-900 dark:text-white mt-2',
                                          children: [
                                              (o == null ? void 0 : o.audioCacheSizeMB) || 0,
                                              ' MB',
                                          ],
                                      }),
                                  ],
                              }),
                          ],
                      }),
                      u.jsxs('div', {
                          className:
                              'bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden',
                          children: [
                              u.jsx('div', {
                                  className:
                                      'p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
                                  children: u.jsxs('h3', {
                                      className:
                                          'font-bold text-gray-900 dark:text-white flex items-center gap-2',
                                      children: [
                                          u.jsx('i', {
                                              'data-lucide': 'zap',
                                              className: 'w-4 h-4 text-yellow-500',
                                          }),
                                          'Top Cache Recallers',
                                      ],
                                  }),
                              }),
                              u.jsx('div', {
                                  className:
                                      'divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto',
                                  children:
                                      (s == null ? void 0 : s.length) > 0
                                          ? s.map((x, j) =>
                                                u.jsxs(
                                                    'div',
                                                    {
                                                        className:
                                                            'p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                                        children: [
                                                            u.jsx('div', {
                                                                className:
                                                                    'text-2xl font-bold text-gray-300 dark:text-gray-600 w-8 text-center',
                                                                children: j + 1,
                                                            }),
                                                            x.avatarUrl
                                                                ? u.jsx('img', {
                                                                      src: x.avatarUrl,
                                                                      alt: x.displayName,
                                                                      className:
                                                                          'w-10 h-10 rounded-full border-2 border-yellow-500 object-cover',
                                                                  })
                                                                : u.jsx('div', {
                                                                      className:
                                                                          'w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center',
                                                                      children: u.jsx('i', {
                                                                          'data-lucide':
                                                                              x.entityType === 'bot'
                                                                                  ? 'bot'
                                                                                  : 'user',
                                                                          className:
                                                                              'w-5 h-5 text-yellow-500',
                                                                      }),
                                                                  }),
                                                            u.jsxs('div', {
                                                                className: 'flex-1 min-w-0',
                                                                children: [
                                                                    u.jsx('div', {
                                                                        className:
                                                                            'font-medium text-gray-900 dark:text-white truncate',
                                                                        children: x.displayName,
                                                                    }),
                                                                    u.jsx('div', {
                                                                        className:
                                                                            'text-xs text-gray-500 dark:text-gray-400 mt-0.5',
                                                                        children:
                                                                            x.entityType === 'bot'
                                                                                ? '🤖 Bot'
                                                                                : '👤 User',
                                                                    }),
                                                                ],
                                                            }),
                                                            u.jsxs('div', {
                                                                className: 'text-right',
                                                                children: [
                                                                    u.jsxs('div', {
                                                                        className:
                                                                            'font-bold text-yellow-500 flex items-center gap-1',
                                                                        children: [
                                                                            u.jsx('i', {
                                                                                'data-lucide':
                                                                                    'zap',
                                                                                className:
                                                                                    'w-4 h-4',
                                                                            }),
                                                                            x.cacheHits,
                                                                        ],
                                                                    }),
                                                                    u.jsx('div', {
                                                                        className:
                                                                            'text-[10px] text-gray-400 uppercase tracking-wider',
                                                                        children: 'Hits',
                                                                    }),
                                                                ],
                                                            }),
                                                        ],
                                                    },
                                                    x.entityId,
                                                ),
                                            )
                                          : u.jsx('div', {
                                                className: 'p-4 text-center text-gray-500 text-sm',
                                                children: 'No cache hits yet',
                                            }),
                              }),
                          ],
                      }),
                  ],
              })
    );
}
function rm() {
    const [o, c] = L.useState([]),
        [s, p] = L.useState(!0);
    L.useEffect(() => {
        const x = async () => {
            try {
                const N = await Qp();
                c(N.logs || []);
            } catch (N) {
                console.error('Failed to fetch logs:', N);
            } finally {
                p(!1);
            }
        };
        x();
        const j = setInterval(x, 2e3);
        return () => clearInterval(j);
    }, []);
    const h = (x) =>
            new Date(x).toLocaleTimeString([], {
                hour12: !1,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
        w = (x) => {
            switch (x) {
                case 'error':
                    return 'text-red-600 dark:text-red-400';
                case 'warn':
                    return 'text-yellow-600 dark:text-yellow-400';
                case 'debug':
                    return 'text-blue-600 dark:text-blue-400';
                case 'info':
                    return 'text-green-600 dark:text-green-400';
                default:
                    return 'text-gray-500 dark:text-gray-400';
            }
        };
    return s
        ? u.jsxs('section', {
              id: 'logs',
              className: 'mb-16 scroll-mt-24',
              children: [
                  u.jsxs('h2', {
                      className:
                          'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                      children: [
                          u.jsx('i', {
                              'data-lucide': 'terminal',
                              className: 'w-8 h-8 text-gray-500',
                          }),
                          'Activity Logs',
                      ],
                  }),
                  u.jsx('div', {
                      className: 'animate-pulse bg-gray-100 dark:bg-gray-900 rounded-2xl h-96',
                  }),
              ],
          })
        : u.jsxs('section', {
              id: 'logs',
              className: 'mb-16 scroll-mt-24',
              children: [
                  u.jsxs('h2', {
                      className:
                          'text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3',
                      children: [
                          u.jsx('i', {
                              'data-lucide': 'terminal',
                              className: 'w-8 h-8 text-gray-500',
                          }),
                          'Activity Logs',
                      ],
                  }),
                  u.jsxs('div', {
                      className:
                          'bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 glow-secondary',
                      children: [
                          u.jsxs('div', {
                              className:
                                  'flex items-center justify-between px-4 py-3 bg-gray-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
                              children: [
                                  u.jsxs('div', {
                                      className: 'flex space-x-2',
                                      children: [
                                          u.jsx('div', {
                                              className: 'w-3 h-3 rounded-full bg-red-500',
                                          }),
                                          u.jsx('div', {
                                              className: 'w-3 h-3 rounded-full bg-yellow-500',
                                          }),
                                          u.jsx('div', {
                                              className: 'w-3 h-3 rounded-full bg-green-500',
                                          }),
                                      ],
                                  }),
                                  u.jsx('span', {
                                      className:
                                          'text-xs text-gray-500 dark:text-gray-400 font-mono opacity-70',
                                      children: 'jasper-bot.log',
                                  }),
                              ],
                          }),
                          u.jsx('div', {
                              className:
                                  'logs-container p-4 h-96 overflow-y-auto font-mono text-sm text-gray-700 dark:text-gray-300 space-y-1',
                              children:
                                  o.length > 0
                                      ? o.map((x, j) => {
                                            const N = h(x.timestamp),
                                                T = new Date(x.timestamp).toLocaleString(),
                                                I = w(x.level);
                                            return u.jsxs(
                                                'div',
                                                {
                                                    className:
                                                        'log-entry flex items-start gap-3 hover:bg-gray-200 dark:hover:bg-white/5 p-1 rounded transition-colors',
                                                    children: [
                                                        u.jsxs('span', {
                                                            className: `log-level font-bold w-16 uppercase text-xs tracking-wider ${I}`,
                                                            children: ['[', x.level, ']'],
                                                        }),
                                                        u.jsx('span', {
                                                            className:
                                                                'log-timestamp text-gray-500 text-xs',
                                                            title: T,
                                                            children: N,
                                                        }),
                                                        x.module &&
                                                            u.jsxs('span', {
                                                                className:
                                                                    'log-module text-purple-600 dark:text-purple-400 font-medium',
                                                                children: ['[', x.module, ']'],
                                                            }),
                                                        u.jsx('span', {
                                                            className:
                                                                'log-message text-gray-700 dark:text-gray-300 flex-1 break-all',
                                                            children: x.message,
                                                        }),
                                                    ],
                                                },
                                                `${x.timestamp}-${j}`,
                                            );
                                        })
                                      : u.jsx('div', {
                                            className: 'text-gray-500 italic text-sm',
                                            children: 'Waiting for logs...',
                                        }),
                          }),
                      ],
                  }),
              ],
          });
}
function lm() {
    return u.jsx(Fp, {
        basename: '/react-dashboard',
        children: u.jsx(Rp, {
            children: u.jsxs(Gt, {
                path: '/',
                element: u.jsx(Jp, {}),
                children: [
                    u.jsx(Gt, { index: !0, element: u.jsx(Pp, { to: '/workers', replace: !0 }) }),
                    u.jsx(Gt, { path: 'workers', element: u.jsx(Zp, {}) }),
                    u.jsx(Gt, { path: 'queues', element: u.jsx(bp, {}) }),
                    u.jsx(Gt, { path: 'stats', element: u.jsx(tm, {}) }),
                    u.jsx(Gt, { path: 'cache', element: u.jsx(nm, {}) }),
                    u.jsx(Gt, { path: 'logs', element: u.jsx(rm, {}) }),
                ],
            }),
        }),
    });
}
Of.createRoot(document.getElementById('root')).render(
    u.jsx(mc.StrictMode, { children: u.jsx(lm, {}) }),
);
