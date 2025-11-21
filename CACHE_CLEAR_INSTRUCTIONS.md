# Cache Clearing Instructions

## The Problem
You're seeing old content because:
1. **Browser cache** - Your browser cached the old JavaScript/CSS files
2. **Netlify build cache** - Netlify may be serving cached builds
3. **Service Worker** (if any) - May be caching old assets

## Solutions (Try in Order)

### 1. Hard Refresh Browser (Easiest)
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **Or**: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### 2. Clear Browser Cache Completely
- **Chrome/Edge**: 
  - Settings → Privacy → Clear browsing data
  - Select "Cached images and files"
  - Time range: "All time"
  - Click "Clear data"

- **Firefox**:
  - Settings → Privacy & Security → Cookies and Site Data
  - Click "Clear Data" → Check "Cached Web Content"

### 3. Force Netlify Rebuild
1. Go to your Netlify dashboard
2. Click on your site
3. Go to "Deploys" tab
4. Click "Trigger deploy" → "Clear cache and deploy site"
5. Wait for the build to complete (2-5 minutes)

### 4. Check Netlify Build Logs
- Go to Netlify → Your Site → Deploys
- Click on the latest deploy
- Check if the build succeeded
- Look for any errors

### 5. Verify Changes Are Live
After clearing cache, check:
- Open DevTools (F12) → Network tab
- Check "Disable cache"
- Reload the page
- Look at the JavaScript files - they should have new timestamps

### 6. Check if Service Worker is Active
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in left sidebar
4. If you see any registered service workers:
   - Click "Unregister"
   - Reload the page

### 7. Test in Incognito/Private Window
- Open a new incognito/private window
- Navigate to your site
- This bypasses all cache
- If it works here, it's definitely a cache issue

## If Still Not Working

### Check Build Output
The changes are in the code (commits: 4af82b2, a1b1d7e, etc.)

### Verify Netlify Environment Variables
Make sure `VITE_API_URL` is set correctly in Netlify:
1. Netlify Dashboard → Site Settings → Environment Variables
2. Check `VITE_API_URL` is set to your API URL

### Check Browser Console for Errors
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for any red errors
4. These might indicate why changes aren't loading

## Quick Test
After clearing cache, you should see:
- Auth page loads first (not dashboard)
- Onboarding shows after login
- Better button click effects
- Notifications with icons
- Improved navigation

If you still see old behavior, the cache wasn't cleared properly.

