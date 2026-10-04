import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import {
  ACCENTS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  MODE_STORAGE_KEY,
  SHOW_THEME_SWITCHER,
} from './src/theme/accents';

/** Injects the accent config into the pre-paint theme script in index.html. */
function themeConfig(): Plugin {
  const config = JSON.stringify({
    accents: ACCENTS.map((a) => a.id),
    defaultAccent: DEFAULT_ACCENT,
    showSwitcher: SHOW_THEME_SWITCHER,
    accentKey: ACCENT_STORAGE_KEY,
    modeKey: MODE_STORAGE_KEY,
  });
  return {
    name: 'theme-config',
    transformIndexHtml: (html) => html.replace('__THEME_CONFIG__', config),
  };
}

/** Emits sitemap.xml and robots.txt using VITE_SITE_URL so they always match the deployed domain. */
function seoFiles(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: 'seo-files',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // TODO: set VITE_SITE_URL to your final domain (used for canonical URL, OG tags and sitemap).
  const siteUrl = env.VITE_SITE_URL || 'https://shafrith-portfolio.vercel.app';
  process.env.VITE_SITE_URL = siteUrl;
  process.env.VITE_API_URL = (env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  return {
    plugins: [react(), themeConfig(), seoFiles(siteUrl)],
    server: { port: 5173 },
    preview: { port: 4173 },
    build: { target: 'es2020', cssCodeSplit: true },
  };
});
