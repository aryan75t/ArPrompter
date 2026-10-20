# ArPrompter — Browser Teleprompter

Paste a script on the start screen and choose **Start prompter**. During playback, adjust scroll speed and text size independently; open **Text appearance** to change the background, text color, or font family.

## Development

Run `npm install`, then `npm run dev` to start the local app at http://localhost:5173. Run `npm run build` to create the production site in `dist/` for deployment to Vercel, Netlify, or another static host.

## Search and production hosting

The document includes a descriptive title and summary, social sharing metadata, WebApplication structured data, a crawlable HTML entry point, and a permissive `robots.txt`. Set the canonical URL and add a sitemap when the production domain is known; neither should point to a placeholder domain. Submit the live sitemap in Google Search Console and Bing Webmaster Tools after deployment.

The production build is a static site with no application server or shared database. Host `dist/` on a CDN-backed static host to serve traffic from the edge. Configure hashed files in `assets/` for long-lived immutable caching, and revalidate `index.html` on each visit so deployments become visible promptly. Static hosting scales delivery without adding per-request application-server work. Scripts stay in each visitor's browser and are not shared across users or devices.

Search rankings and Lighthouse scores depend on the deployed domain, hosting, network, and real-user experience; they cannot be guaranteed by source changes alone. Add the production canonical URL, sitemap, and social preview image once those production assets and URLs exist, and measure the deployed site with Lighthouse and Search Console.

Scripts and settings are stored in this browser's local storage and are not synced between devices. Voice-controlled scrolling is not included.
