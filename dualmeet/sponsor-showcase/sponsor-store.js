// Shared data layer for sponsor.html (admin) and tvurl.html (TV display).
// Firestore when firebase-config.js is filled in; localStorage otherwise.
//
// Firestore layout:
//   sponsorShows/{eventId}                 -> settings document
//   sponsorShows/{eventId}/sponsors/{id}   -> { name, type, logo, order, createdAt }
//
// Use ?event=your-event-id on both pages to run separate events.
(function () {
  const params = new URLSearchParams(location.search);
  const EVENT_ID = ((params.get('event') || 'main').replace(/[^\w-]/g, '')) || 'main';

  const DEFAULT_SETTINGS = {
    eventName: '',
    eyebrow: 'With heartfelt thanks',
    introText: 'This event would not be possible without the generous support of our sponsors.',
    outroTitle: 'Maraming Salamat!',
    outroText: 'Thank you to everyone who helped make this event happen.',
    majorSeconds: 6,
    minorSeconds: 6,
    specialSeconds: 7
  };
  const TYPES = ['major', 'minor', 'special'];

  const cfg = window.FIREBASE_CONFIG || {};
  const useFirebase = !!(cfg.apiKey && !/PASTE/i.test(cfg.apiKey) && window.firebase && firebase.firestore);

  let db = null, showRef = null, sponsorsRef = null;
  if (useFirebase) {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    db = firebase.firestore();
    showRef = db.collection('sponsorShows').doc(EVENT_ID);
    sponsorsRef = showRef.collection('sponsors');
  }

  // ---------- local fallback ----------
  const LS_KEY = 'sponsorShow:' + EVENT_ID;
  const localListeners = new Set();
  function lsRead() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY));
      if (d && Array.isArray(d.sponsors)) return d;
    } catch (e) { /* ignore */ }
    return { settings: {}, sponsors: [] };
  }
  function lsWrite(d) {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
    localListeners.forEach(fn => fn());
  }
  window.addEventListener('storage', e => { if (e.key === LS_KEY) localListeners.forEach(fn => fn()); });

  function normalize(settings, sponsors) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const list = (sponsors || [])
      .filter(x => x && x.name)
      .map(x => Object.assign({ type: 'minor', logo: null, order: 0 }, x))
      .map(x => (TYPES.includes(x.type) ? x : Object.assign(x, { type: 'minor' })))
      .sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || (a.order - b.order) || ((a.createdAt || 0) - (b.createdAt || 0)));
    return { settings: s, sponsors: list };
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const Store = {
    EVENT_ID,
    DEFAULT_SETTINGS,
    TYPES,
    mode: useFirebase ? 'firebase' : 'local',

    // cb({ settings, sponsors }) is called now and on every change. Returns unsubscribe.
    subscribe(cb, onError) {
      if (!useFirebase) {
        const fire = () => { const d = lsRead(); cb(normalize(d.settings, d.sponsors)); };
        localListeners.add(fire);
        fire();
        return () => localListeners.delete(fire);
      }
      let settings = null, sponsors = null;
      const emit = () => { if (settings !== null && sponsors !== null) cb(normalize(settings, sponsors)); };
      const err = e => { console.error(e); if (onError) onError(e); };
      const u1 = showRef.onSnapshot(doc => { settings = doc.exists ? doc.data() : {}; emit(); }, err);
      const u2 = sponsorsRef.onSnapshot(snap => {
        sponsors = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        emit();
      }, err);
      return () => { u1(); u2(); };
    },

    async saveSettings(patch) {
      if (!useFirebase) { const d = lsRead(); d.settings = Object.assign({}, d.settings, patch); lsWrite(d); return; }
      await showRef.set(patch, { merge: true });
    },

    async addSponsor(data) {
      const rec = { name: data.name, type: data.type, logo: data.logo || null, order: Date.now(), createdAt: Date.now() };
      if (!useFirebase) { const d = lsRead(); rec.id = uid(); d.sponsors.push(rec); lsWrite(d); return rec.id; }
      const ref = await sponsorsRef.add(rec);
      return ref.id;
    },

    async updateSponsor(id, patch) {
      if (!useFirebase) {
        const d = lsRead();
        const s = d.sponsors.find(x => x.id === id);
        if (s) Object.assign(s, patch);
        lsWrite(d);
        return;
      }
      await sponsorsRef.doc(id).update(patch);
    },

    async deleteSponsor(id) {
      if (!useFirebase) { const d = lsRead(); d.sponsors = d.sponsors.filter(x => x.id !== id); lsWrite(d); return; }
      await sponsorsRef.doc(id).delete();
    },

    // Swap display order of two sponsors
    async swapOrder(a, b) {
      await Promise.all([
        Store.updateSponsor(a.id, { order: b.order }),
        Store.updateSponsor(b.id, { order: a.order === b.order ? a.order + 1 : a.order })
      ]);
    }
  };

  window.SponsorStore = Store;
})();
