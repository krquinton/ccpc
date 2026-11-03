// Paste the same Firebase config you use in your other apps.
const firebaseConfig = {
  apiKey: "AIzaSyB4IiCCQHtGeIT44n71oGlKk7PIOSWxfg8",
  authDomain: "ccpc-1943f.firebaseapp.com",
  databaseURL: "https://ccpc-1943f-default-rtdb.firebaseio.com",
  projectId: "ccpc-1943f",
  storageBucket: "ccpc-1943f.firebasestorage.app",
  messagingSenderId: "904942754236",
  appId: "1:904942754236:web:aecbec51d5cd0b745b33b9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const TEAM_COUNT = 16;
// Paths: tournament/teams/{id}={name,logo,members[4],slot,order}  tournament/reveal={n}  tournament/tv={mode,teamId}  tournament/settings={fast}
