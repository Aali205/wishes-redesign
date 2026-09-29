// ---------------------------------------------------------------------------
// Supabase connection used to save orders and power the admin dashboard.
// The anon key is meant to be public: access is limited by the row-level
// security rules in supabase/schema.sql.
//
// Redesign note: the client is the official UMD build of @supabase/supabase-js
// (copied unchanged from node_modules into public/vendor/supabase.js), loaded
// on demand. This keeps the site runnable from any plain static server with no
// bundler, and if the file can't load the site falls back to the built-in
// catalogue in data.js exactly as before.
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://vjfrledvdygacbuinpuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3FkKaEcOVBsTDidjllebLg_MTFcTbGA';

function loadClientLibrary() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    // Pages live at the site root, so this resolves in dev, dist and on GitHub Pages.
    script.src = new URL('vendor/supabase.js', document.baseURI).href;
    script.onload = () => resolve(window.supabase || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
    setTimeout(() => resolve(window.supabase || null), 4000);
  });
}

const lib = SUPABASE_URL && SUPABASE_ANON_KEY ? await loadClientLibrary() : null;

export const supabase = lib?.createClient
  ? lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
