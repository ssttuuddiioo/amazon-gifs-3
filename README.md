# 🎬 Google Drive → Netlify Video Site (Auto-Sync)

A beautiful, modern video gallery that automatically syncs videos from Google Drive to your Netlify-hosted static site. No CORS issues, no authentication required for viewers, and full control over video playback.

## ✨ Features

- **🔄 Auto-Sync**: Automatically pulls videos from Google Drive
- **🎨 Modern UI**: Beautiful, responsive video gallery with glassmorphism design
- **⚡ Full Control**: Autoplay, loop, mute, download controls
- **📱 Responsive**: Works perfectly on desktop and mobile
- **⌨️ Keyboard Shortcuts**: Space (play/pause), L (loop), M (mute), R (refresh)
- **🚀 Fast Loading**: Lazy loading and optimized performance
- **🎯 No CORS Issues**: Videos served as static assets from Netlify
- **📊 File Info**: Shows file size, duration, and last modified date

## 🚀 Quick Start

### 1. Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/yourrepo)

### 2. Set up Google Drive API

#### Option A: Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Create a Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description
   - Click "Create and Continue"
   - Skip role assignment for now
   - Click "Done"
5. Generate a key:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose JSON format
   - Download and save the key file
6. Share your Google Drive folder with the service account email

#### Option B: OAuth2 (Manual Setup)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Create OAuth2 credentials
4. Use the OAuth2 Playground to get refresh token

### 3. Configure Environment Variables

Create a `.env` file (copy from `env.example`):

```bash
# Your Google Drive folder ID (from the folder URL)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# Service Account JSON (entire JSON as a string)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# OR OAuth2 credentials (if not using service account)
# GOOGLE_CLIENT_ID=your_client_id
# GOOGLE_CLIENT_SECRET=your_client_secret
# GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### 4. Configure GitHub Secrets

Add these secrets to your GitHub repository:

- `GOOGLE_DRIVE_FOLDER_ID`: Your Google Drive folder ID
- `GOOGLE_SERVICE_ACCOUNT_KEY`: The entire JSON key file as a string
- `NETLIFY_SITE_ID`: Your Netlify site ID (optional, for direct deploy)
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token (optional)

### 5. Install and Run

```bash
# Install dependencies
npm install

# Run sync manually
npm run sync

# Start local development server
npm run dev
```

## 📁 How to Get Google Drive Folder ID

1. Open Google Drive in your browser
2. Navigate to your videos folder
3. Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Copy the `FOLDER_ID_HERE` part

## 🎯 How It Works

### Automatic Sync Process

1. **Schedule**: GitHub Actions runs every 6 hours (configurable)
2. **Fetch**: Queries Google Drive API for videos in your folder
3. **Compare**: Checks if local videos are up-to-date
4. **Download**: Downloads new or updated videos
5. **Update**: Creates/updates `videos.json` with metadata
6. **Commit**: Pushes changes to GitHub
7. **Deploy**: Netlify automatically redeploys your site

### Manual Sync

You can also run sync manually:

```bash
# Sync videos
npm run sync

# Sync and cleanup old videos
node sync.js --cleanup

# View help
node sync.js --help
```

## 🎨 Customization

### Video Interface

The video gallery is fully customizable via CSS. Key files:

- `index.html`: Main structure
- `styles.css`: All styling (modern glassmorphism design)
- `app.js`: JavaScript functionality

### Supported Video Formats

- MP4 (recommended)
- MOV
- AVI
- MKV
- WEBM

### Keyboard Shortcuts

- **Space**: Play/pause all videos
- **L**: Toggle loop mode
- **M**: Toggle mute
- **R**: Refresh video list

## 🔧 Advanced Configuration

### Custom Sync Interval

Edit `.github/workflows/sync-videos.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 0 * * *'  # Daily at midnight
  # - cron: '0 */2 * * *' # Every 2 hours
```

### File Size Limits

Large videos are supported, but consider:

- GitHub has a 100MB file size limit
- Netlify has bandwidth limits on free plan
- Consider using Git LFS for very large files

### Custom Video Processing

You can extend `sync.js` to:

- Generate thumbnails
- Convert video formats
- Add watermarks
- Create different quality versions

## 📱 Mobile Optimization

The site is fully responsive and includes:

- Touch-friendly controls
- Optimized loading for mobile
- Responsive grid layout
- Mobile-specific CSS optimizations

## 🎬 Demo

Check out the live demo: [https://your-site.netlify.app](https://your-site.netlify.app)

## 🔒 Security & Privacy

- Videos are served as static assets (no API keys exposed)
- Service account has read-only access to your Drive folder
- No user authentication required for viewers
- All credentials stored securely in GitHub Secrets

## 🚨 Troubleshooting

### Common Issues

1. **"No videos found"**: Check your Google Drive folder ID and permissions
2. **API errors**: Verify your service account key is valid
3. **GitHub Actions failing**: Check your repository secrets
4. **Videos not loading**: Ensure videos are in supported formats

### Debug Mode

Run with debug logging:

```bash
DEBUG=* npm run sync
```

### Check Logs

- GitHub Actions: Go to Actions tab in your repository
- Netlify: Check deploy logs in Netlify dashboard
- Local: Check console output

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Credits

- Built with vanilla HTML, CSS, and JavaScript
- Uses Google Drive API for video sync
- Deployed on Netlify with GitHub Actions
- Inspired by modern video gallery designs

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with details
4. Include error logs and configuration (remove sensitive data)

---

**Made with ❤️ for seamless video sharing** 