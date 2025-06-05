import { create as R } from "zustand";
const T = { BASE_URL: "./", DEV: !1, MODE: "production", PROD: !0, SSR: !1 }, I = /* @__PURE__ */ new Map(), b = (u) => {
  const l = I.get(u);
  return l ? Object.fromEntries(
    Object.entries(l.stores).map(([r, a]) => [r, a.getState()])
  ) : {};
}, k = (u, l, r) => {
  if (u === void 0)
    return {
      type: "untracked",
      connection: l.connect(r)
    };
  const a = I.get(r.name);
  if (a)
    return { type: "tracked", store: u, ...a };
  const e = {
    connection: l.connect(r),
    stores: {}
  };
  return I.set(r.name, e), { type: "tracked", store: u, ...e };
}, A = (u, l) => {
  if (l === void 0) return;
  const r = I.get(u);
  r && (delete r.stores[l], Object.keys(r.stores).length === 0 && I.delete(u));
}, D = (u) => {
  var l, r;
  if (!u) return;
  const a = u.split(`
`), e = a.findIndex(
    (h) => h.includes("api.setState")
  );
  if (e < 0) return;
  const i = ((l = a[e + 1]) == null ? void 0 : l.trim()) || "";
  return (r = /.+ (.+) .+/.exec(i)) == null ? void 0 : r[1];
}, j = (u, l = {}) => (r, a, e) => {
  const { enabled: i, anonymousActionType: h, store: o, ...v } = l;
  let S;
  try {
    S = (i ?? (T ? "production" : void 0) !== "production") && window.__REDUX_DEVTOOLS_EXTENSION__;
  } catch {
  }
  if (!S)
    return u(r, a, e);
  const { connection: n, ...m } = k(o, S, v);
  let f = !0;
  e.setState = (t, d, c) => {
    const s = r(t, d);
    if (!f) return s;
    const g = D(new Error().stack), _ = c === void 0 ? { type: h || g || "anonymous" } : typeof c == "string" ? { type: c } : c;
    return o === void 0 ? (n == null || n.send(_, a()), s) : (n == null || n.send(
      {
        ..._,
        type: `${o}/${_.type}`
      },
      {
        ...b(v.name),
        [o]: e.getState()
      }
    ), s);
  }, e.devtools = {
    cleanup: () => {
      n && typeof n.unsubscribe == "function" && n.unsubscribe(), A(v.name, o);
    }
  };
  const p = (...t) => {
    const d = f;
    f = !1, r(...t), f = d;
  }, y = u(e.setState, a, e);
  if (m.type === "untracked" ? n == null || n.init(y) : (m.stores[m.store] = e, n == null || n.init(
    Object.fromEntries(
      Object.entries(m.stores).map(([t, d]) => [
        t,
        t === m.store ? y : d.getState()
      ])
    )
  )), e.dispatchFromDevtools && typeof e.dispatch == "function") {
    let t = !1;
    const d = e.dispatch;
    e.dispatch = (...c) => {
      (T ? "production" : void 0) !== "production" && c[0].type === "__setState" && !t && (console.warn(
        '[zustand devtools middleware] "__setState" action type is reserved to set state from the devtools. Avoid using it.'
      ), t = !0), d(...c);
    };
  }
  return n.subscribe((t) => {
    var d;
    switch (t.type) {
      case "ACTION":
        if (typeof t.payload != "string") {
          console.error(
            "[zustand devtools middleware] Unsupported action format"
          );
          return;
        }
        return O(
          t.payload,
          (c) => {
            if (c.type === "__setState") {
              if (o === void 0) {
                p(c.state);
                return;
              }
              Object.keys(c.state).length !== 1 && console.error(
                `
                    [zustand devtools middleware] Unsupported __setState action format.
                    When using 'store' option in devtools(), the 'state' should have only one key, which is a value of 'store' that was passed in devtools(),
                    and value of this only key should be a state object. Example: { "type": "__setState", "state": { "abc123Store": { "foo": "bar" } } }
                    `
              );
              const s = c.state[o];
              if (s == null)
                return;
              JSON.stringify(e.getState()) !== JSON.stringify(s) && p(s);
              return;
            }
            e.dispatchFromDevtools && typeof e.dispatch == "function" && e.dispatch(c);
          }
        );
      case "DISPATCH":
        switch (t.payload.type) {
          case "RESET":
            return p(y), o === void 0 ? n == null ? void 0 : n.init(e.getState()) : n == null ? void 0 : n.init(b(v.name));
          case "COMMIT":
            if (o === void 0) {
              n == null || n.init(e.getState());
              return;
            }
            return n == null ? void 0 : n.init(b(v.name));
          case "ROLLBACK":
            return O(t.state, (c) => {
              if (o === void 0) {
                p(c), n == null || n.init(e.getState());
                return;
              }
              p(c[o]), n == null || n.init(b(v.name));
            });
          case "JUMP_TO_STATE":
          case "JUMP_TO_ACTION":
            return O(t.state, (c) => {
              if (o === void 0) {
                p(c);
                return;
              }
              JSON.stringify(e.getState()) !== JSON.stringify(c[o]) && p(c[o]);
            });
          case "IMPORT_STATE": {
            const { nextLiftedState: c } = t.payload, s = (d = c.computedStates.slice(-1)[0]) == null ? void 0 : d.state;
            if (!s) return;
            p(o === void 0 ? s : s[o]), n == null || n.send(
              null,
              // FIXME no-any
              c
            );
            return;
          }
          case "PAUSE_RECORDING":
            return f = !f;
        }
        return;
    }
  }), y;
}, J = j, O = (u, l) => {
  let r;
  try {
    r = JSON.parse(u);
  } catch (a) {
    console.error(
      "[zustand devtools middleware] Could not parse the received json",
      a
    );
  }
  r !== void 0 && l(r);
};
function P(u, l) {
  let r;
  try {
    r = u();
  } catch {
    return;
  }
  return {
    getItem: (e) => {
      var i;
      const h = (v) => v === null ? null : JSON.parse(v, void 0), o = (i = r.getItem(e)) != null ? i : null;
      return o instanceof Promise ? o.then(h) : h(o);
    },
    setItem: (e, i) => r.setItem(e, JSON.stringify(i, void 0)),
    removeItem: (e) => r.removeItem(e)
  };
}
const w = (u) => (l) => {
  try {
    const r = u(l);
    return r instanceof Promise ? r : {
      then(a) {
        return w(a)(r);
      },
      catch(a) {
        return this;
      }
    };
  } catch (r) {
    return {
      then(a) {
        return this;
      },
      catch(a) {
        return w(a)(r);
      }
    };
  }
}, F = (u, l) => (r, a, e) => {
  let i = {
    storage: P(() => localStorage),
    partialize: (t) => t,
    version: 0,
    merge: (t, d) => ({
      ...d,
      ...t
    }),
    ...l
  }, h = !1;
  const o = /* @__PURE__ */ new Set(), v = /* @__PURE__ */ new Set();
  let S = i.storage;
  if (!S)
    return u(
      (...t) => {
        console.warn(
          `[zustand persist middleware] Unable to update item '${i.name}', the given storage is currently unavailable.`
        ), r(...t);
      },
      a,
      e
    );
  const n = () => {
    const t = i.partialize({ ...a() });
    return S.setItem(i.name, {
      state: t,
      version: i.version
    });
  }, m = e.setState;
  e.setState = (t, d) => {
    m(t, d), n();
  };
  const f = u(
    (...t) => {
      r(...t), n();
    },
    a,
    e
  );
  e.getInitialState = () => f;
  let p;
  const y = () => {
    var t, d;
    if (!S) return;
    h = !1, o.forEach((s) => {
      var g;
      return s((g = a()) != null ? g : f);
    });
    const c = ((d = i.onRehydrateStorage) == null ? void 0 : d.call(i, (t = a()) != null ? t : f)) || void 0;
    return w(S.getItem.bind(S))(i.name).then((s) => {
      if (s)
        if (typeof s.version == "number" && s.version !== i.version) {
          if (i.migrate) {
            const g = i.migrate(
              s.state,
              s.version
            );
            return g instanceof Promise ? g.then((_) => [!0, _]) : [!0, g];
          }
          console.error(
            "State loaded from storage couldn't be migrated since no migrate function was provided"
          );
        } else
          return [!1, s.state];
      return [!1, void 0];
    }).then((s) => {
      var g;
      const [_, E] = s;
      if (p = i.merge(
        E,
        (g = a()) != null ? g : f
      ), r(p, !0), _)
        return n();
    }).then(() => {
      c == null || c(p, void 0), p = a(), h = !0, v.forEach((s) => s(p));
    }).catch((s) => {
      c == null || c(void 0, s);
    });
  };
  return e.persist = {
    setOptions: (t) => {
      i = {
        ...i,
        ...t
      }, t.storage && (S = t.storage);
    },
    clearStorage: () => {
      S == null || S.removeItem(i.name);
    },
    getOptions: () => i,
    rehydrate: () => y(),
    hasHydrated: () => h,
    onHydrate: (t) => (o.add(t), () => {
      o.delete(t);
    }),
    onFinishHydration: (t) => (v.add(t), () => {
      v.delete(t);
    })
  }, i.skipHydration || y(), p || f;
}, L = F, U = (u, l, r, a) => (e, i) => {
  const h = a == null ? void 0 : a.persist, o = a == null ? void 0 : a.dependencies, v = () => {
    e((d) => ({
      version: d.version + 1
    }));
  }, S = () => {
    var c, s;
    const d = i();
    return d ? ((c = d[l]) != null && c.state || (d[l].state = u), (s = d[l]) == null ? void 0 : s.state) : u;
  }, n = (d) => {
    e((c) => {
      const s = c[l], _ = { ...S(), ...d }, E = { ...s, state: _ }, z = c.version + 1;
      return { ...c, [l]: E, version: z };
    });
  };
  let m = {};
  return {
    name: l,
    state: u,
    controllers: m,
    update: v,
    getState: S,
    setState: n,
    setError: (d) => {
      n({
        error: d,
        status: {
          ...S().status,
          error: "true"
        }
      });
    },
    reset: () => {
      n(u);
    },
    setup: async (d) => (m = await r(
      v,
      i,
      S,
      n,
      d
    ), e((c) => {
      const s = { ...c };
      return s[l] = { ...s[l] }, s[l].state = { ...s[l].state }, s[l].initialized = !0, s[l].state.version = c.version + 1, s[l].controllers = m, s;
    }), Promise.resolve()),
    persist: h,
    dependencies: o
  };
}, x = {
  initObject: null,
  initialized: !1,
  version: 0,
  isInitializing: !1,
  error: null
};
function M(u) {
  const { name: l, slices: r, onSave: a } = u;
  return R()(
    J(
      L(
        (i, h, o) => {
          const v = {};
          r.forEach((m) => {
            const f = m.create(i, h, o);
            v[f.name] = f;
          });
          const S = async (m) => {
            const f = h();
            if (!(f.initialized || f.isInitializing)) {
              i((p) => ({
                ...p,
                isInitializing: !0,
                initObject: m,
                version: p.version + 1
              }));
              try {
                for (const p of r) {
                  const y = v[p.name];
                  y && y.setup && await y.setup(m);
                }
                i({
                  initialized: !0,
                  isInitializing: !1,
                  error: null
                });
              } catch (p) {
                console.error("Failed to initialize store slices:", p), i({
                  isInitializing: !1,
                  initialized: !1,
                  error: `Initialization failed: ${p.message || "Unknown error"}`
                });
              }
            }
          };
          return a && o.subscribe((m) => {
            !m.isInitializing && m.initialized && !m.error && a(m).catch((f) => {
              console.error("Failed to save state to server:", f);
            });
          }), {
            ...x,
            ...v,
            setup: S
          };
        },
        {
          name: l,
          // Implement selective partialize based on slice options
          partialize: (i) => {
            const h = {};
            return r.forEach((o) => {
              var S;
              const v = i[o.name];
              if (v && ((S = o.options) != null && S.persist)) {
                const n = {}, m = Object.keys(v.state);
                o.options.persist.whitelist ? o.options.persist.whitelist.forEach((f) => {
                  m.includes(f) && (n[f] = v.state[f]);
                }) : o.options.persist.blacklist ? m.forEach((f) => {
                  var p, y, t;
                  (t = (y = (p = o == null ? void 0 : o.options) == null ? void 0 : p.persist) == null ? void 0 : y.blacklist) != null && t.includes(
                    f
                  ) || (n[f] = v.state[f]);
                }) : Object.assign(n, v.state), h[o.name] = {
                  state: n
                };
              }
            }), h;
          },
          // Implement selective merge based on slice options
          merge: (i, h) => {
            const o = { ...h };
            return r.forEach((v) => {
              var n, m;
              const S = v.name;
              (n = i[S]) != null && n.state && ((m = o[S]) != null && m.state) && (o[S].state = {
                ...h[S].state,
                ...i[S].state
              });
            }), o;
          }
        }
      ),
      {
        name: l,
        enabled: !0
      }
    )
  );
}
function H(u) {
  return u;
}
function $(u) {
  return u;
}
export {
  M as createAppStore,
  U as createStoreSlice,
  H as defineSliceConfig,
  $ as defineStoreConfig
};
//# sourceMappingURL=index.es.js.map
