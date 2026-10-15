/* Capa de datos: Firestore en producción, localStorage en MODO DEMO.
   Ambas exponen la misma interfaz para que app.js no sepa cuál usa. */
import { firebaseConfig, DEMO } from './config.js';

export { DEMO };
export let store, auth;

if (DEMO) {
  const KEY = 'th-lutec-demo';
  const db = JSON.parse(localStorage.getItem(KEY) || '{}');
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const col = c => (db[c] ||= {});
  const list = c => Object.entries(col(c)).map(([id, d]) => ({ ...d, id }));
  const OPS = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b };
  // Igual que setDoc(..., {merge:true}): los mapas anidados se combinan, no se reemplazan.
  const merge = (a = {}, b) => {
    for (const [k, v] of Object.entries(b))
      a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k], v) : v;
    return a;
  };
  store = {
    all: async c => list(c),
    where: async (c, f, op, v) => list(c).filter(d => d[f] != null && OPS[op](d[f], v)),
    get: async (c, id) => (col(c)[id] ? { ...col(c)[id], id } : null),
    put: async (c, id, data) => { col(c)[id] = merge(col(c)[id], structuredClone(data)); save(); },
    add: async (c, data) => { const id = crypto.randomUUID().slice(0, 20); col(c)[id] = structuredClone(data); save(); return id; },
    del: async (c, id) => { delete col(c)[id]; save(); },
    putMany: async (c, rows) => { rows.forEach(r => (col(c)[r.id] = merge(col(c)[r.id], structuredClone(r.data)))); save(); },
  };
  let cb;
  auth = {
    onChange: f => { cb = f; f(JSON.parse(sessionStorage.getItem(KEY) || 'null')); },
    login: async email => { const u = { email: email || 'demo@lutec.com.co' }; sessionStorage.setItem(KEY, JSON.stringify(u)); cb(u); },
    logout: async () => { sessionStorage.removeItem(KEY); cb(null); },
    reset: async () => {},
  };
} else {
  const FB = 'https://www.gstatic.com/firebasejs/10.12.0/';
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const fa = A.getAuth(app);
  const db = F.getFirestore(app);
  const snap = s => s.docs.map(d => ({ ...d.data(), id: d.id }));
  store = {
    all: async c => snap(await F.getDocs(F.collection(db, c))),
    where: async (c, f, op, v) => snap(await F.getDocs(F.query(F.collection(db, c), F.where(f, op, v)))),
    get: async (c, id) => { const d = await F.getDoc(F.doc(db, c, id)); return d.exists() ? { ...d.data(), id: d.id } : null; },
    put: (c, id, data) => F.setDoc(F.doc(db, c, id), data, { merge: true }),
    add: async (c, data) => (await F.addDoc(F.collection(db, c), data)).id,
    del: (c, id) => F.deleteDoc(F.doc(db, c, id)),
    // Firestore admite máximo 500 escrituras por lote.
    putMany: async (c, rows) => {
      for (let i = 0; i < rows.length; i += 400) {
        const b = F.writeBatch(db);
        rows.slice(i, i + 400).forEach(r => b.set(F.doc(db, c, r.id), r.data, { merge: true }));
        await b.commit();
      }
    },
  };
  auth = {
    onChange: f => A.onAuthStateChanged(fa, u => f(u && { email: u.email })),
    login: (e, p) => A.signInWithEmailAndPassword(fa, e, p),
    logout: () => A.signOut(fa),
    reset: e => A.sendPasswordResetEmail(fa, e),
  };
}
