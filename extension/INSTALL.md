# Installation Guide

## Quick Start

1. **Prepare Icons**
   - Create or download three icon files (16x16, 48x48, 128x128 pixels)
   - Place them in the `icons/` folder as:
     - `icon16.png`
     - `icon48.png`
     - `icon128.png`
   - You can use any image editor or online tool like [Favicon Generator](https://www.favicon-generator.org/)

2. **Load Extension in Chrome**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension` folder

3. **Log in to X.com**
   - Navigate to [x.com](https://x.com) in a new tab
   - Log in with your X account
   - The extension will use this session

4. **Use the Extension**
   - Click the X-Daily icon in your toolbar
   - Click "Generate Daily Summary"
   - Wait for processing to complete
   - View or download your newsletter

## Troubleshooting

### Extension icon is missing
- Make sure you've added the icon files to the `icons/` folder
- Reload the extension after adding icons

### "Not authenticated" error
- Make sure you're logged in to X.com in the same browser
- Try refreshing the X.com page
- Check that cookies are enabled for x.com

### No posts found
- Verify accounts you follow have posted recently
- Check that you're not blocking JavaScript on x.com
- Some accounts may have private posts

### Extension not loading
- Check Chrome's extension error page: `chrome://extensions/`
- Look for error messages next to the extension
- Make sure all files are in the `extension/` folder
