#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { google } = require('googleapis');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

class GoogleDriveVideoSync {
    constructor() {
        this.videosDir = path.join(__dirname, 'videos');
        this.previewsDir = path.join(__dirname, 'previews');
        this.videosJsonPath = path.join(__dirname, 'videos.json');
        this.supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        this.drive = null;
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        
        // Initialize Google Drive API
        this.initializeGoogleDrive();
    }

    initializeGoogleDrive() {
        try {
            // Option 1: Using Service Account JSON file (recommended for automation)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
                const keyFile = path.join(__dirname, process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
                const auth = new google.auth.GoogleAuth({
                    keyFile: keyFile,
                    scopes: ['https://www.googleapis.com/auth/drive.readonly']
                });
                this.drive = google.drive({ version: 'v3', auth });
                console.log('✅ Google Drive API initialized with Service Account JSON file');
            }
            // Option 2: Using Service Account JSON string (fallback)
            else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                const auth = new google.auth.GoogleAuth({
                    credentials: serviceAccount,
                    scopes: ['https://www.googleapis.com/auth/drive.readonly']
                });
                this.drive = google.drive({ version: 'v3', auth });
                console.log('✅ Google Drive API initialized with Service Account');
            }
            // Option 3: Using OAuth2 credentials
            else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    'urn:ietf:wg:oauth:2.0:oob'
                );
                oauth2Client.setCredentials({
                    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
                });
                this.drive = google.drive({ version: 'v3', auth: oauth2Client });
                console.log('✅ Google Drive API initialized with OAuth2');
            }
            else {
                console.log('⚠️ No Google Drive credentials found. Using demo mode.');
                this.drive = null;
            }
        } catch (error) {
            console.error('❌ Error initializing Google Drive API:', error.message);
            this.drive = null;
        }
    }

    async sync() {
        console.log('🔄 Starting Google Drive video sync...');
        
        try {
            // Ensure videos and previews directories exist
            await fs.ensureDir(this.videosDir);
            await fs.ensureDir(this.previewsDir);
            
            if (!this.drive) {
                console.log('📺 Demo mode: Creating sample videos.json');
                await this.createDemoVideosJson();
                return;
            }

            if (!this.folderId) {
                console.error('❌ GOOGLE_DRIVE_FOLDER_ID not set in environment variables');
                await this.createDemoVideosJson();
                return;
            }

            // Get video files from Google Drive
            const driveVideos = await this.getVideosFromDrive();
            console.log(`📁 Found ${driveVideos.length} videos in Google Drive`);

            // Download new/updated videos
            const localVideos = await this.downloadVideos(driveVideos);
            
            // Update videos.json
            await this.updateVideosJson(localVideos);
            
            console.log('✅ Sync completed successfully!');
            
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
            console.log('📺 Creating fallback videos.json');
            await this.createDemoVideosJson();
            // Don't exit with error code - let build continue
        }
    }

    async getVideosFromDrive() {
        try {
            const response = await this.drive.files.list({
                q: `'${this.folderId}' in parents and trashed=false`,
                fields: 'files(id, name, size, modifiedTime, mimeType)',
                orderBy: 'modifiedTime desc'
            });

            const files = response.data.files || [];
            
            // Filter for video files
            const videoFiles = files.filter(file => {
                const ext = path.extname(file.name).toLowerCase();
                return this.supportedFormats.includes(ext) || file.mimeType.startsWith('video/');
            });

            return videoFiles;
        } catch (error) {
            console.error('❌ Error fetching files from Google Drive:', error.message);
            throw error;
        }
    }

    async downloadVideos(driveVideos) {
        const localVideos = [];
        
        for (const video of driveVideos) {
            try {
                const localPath = path.join(this.videosDir, video.name);
                const shouldDownload = await this.shouldDownloadVideo(video, localPath);
                
                if (shouldDownload) {
                    console.log(`⬇️ Downloading: ${video.name}`);
                    await this.downloadFile(video.id, localPath);
                    console.log(`✅ Downloaded: ${video.name}`);
                } else {
                    console.log(`⏭️ Skipping (already up to date): ${video.name}`);
                }
                
                // Generate preview for this video
                const previewPath = await this.generatePreview(localPath, video.name);
                const previewName = path.basename(previewPath);
                
                // Add to local videos list
                localVideos.push({
                    name: video.name,
                    path: `/videos/${video.name}`,
                    previewPath: `/previews/${previewName}`,
                    size: parseInt(video.size) || 0,
                    lastModified: video.modifiedTime,
                    driveId: video.id
                });
                
            } catch (error) {
                console.error(`❌ Error downloading ${video.name}:`, error.message);
                // Continue with other videos
            }
        }
        
        return localVideos;
    }

    async shouldDownloadVideo(driveVideo, localPath) {
        try {
            const stats = await fs.stat(localPath);
            const localModified = stats.mtime;
            const driveModified = new Date(driveVideo.modifiedTime);
            
            // Download if drive file is newer
            return driveModified > localModified;
        } catch (error) {
            // File doesn't exist locally, should download
            return true;
        }
    }

    async downloadFile(fileId, localPath) {
        return new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(localPath);
            
            this.drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, { responseType: 'stream' })
            .then(response => {
                response.data
                    .on('error', reject)
                    .on('end', resolve)
                    .pipe(dest);
            })
            .catch(reject);
        });
    }

    async generatePreview(videoPath, videoName) {
        const previewName = `preview_${videoName}`;
        const previewPath = path.join(this.previewsDir, previewName);
        
        // Check if preview already exists and is newer than video
        try {
            const videoStats = await fs.stat(videoPath);
            const previewStats = await fs.stat(previewPath);
            
            if (previewStats.mtime > videoStats.mtime) {
                console.log(`⏭️ Preview exists: ${previewName}`);
                return previewPath;
            }
        } catch (error) {
            // Preview doesn't exist, will generate
        }
        
        console.log(`🎬 Generating preview: ${previewName}`);
        
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .setDuration(0.5) // First 0.5 seconds
                .output(previewPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .on('end', () => {
                    console.log(`✅ Preview generated: ${previewName}`);
                    resolve(previewPath);
                })
                .on('error', (err) => {
                    console.error(`❌ Preview generation failed for ${videoName}:`, err.message);
                    // Return original video path as fallback
                    resolve(videoPath);
                })
                .run();
        });
    }

    async updateVideosJson(videos) {
        const videosData = {
            lastSync: new Date().toISOString(),
            count: videos.length,
            videos: videos
        };
        
        await fs.writeJSON(this.videosJsonPath, videosData, { spaces: 2 });
        console.log(`📄 Updated videos.json with ${videos.length} videos`);
    }

    async createDemoVideosJson() {
        // Create a demo videos.json for development/testing
        const demoVideos = [];
        
        // Check if there are any existing videos in the folder
        try {
            await fs.ensureDir(this.previewsDir);
            const existingFiles = await fs.readdir(this.videosDir);
            const videoFiles = existingFiles.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return this.supportedFormats.includes(ext);
            });
            
            for (const file of videoFiles) {
                const filePath = path.join(this.videosDir, file);
                const stats = await fs.stat(filePath);
                
                // Generate preview for existing video
                const previewPath = await this.generatePreview(filePath, file);
                const previewName = path.basename(previewPath);
                
                demoVideos.push({
                    name: file,
                    path: `/videos/${file}`,
                    previewPath: `/previews/${previewName}`,
                    size: stats.size,
                    lastModified: stats.mtime.toISOString(),
                    driveId: 'demo'
                });
            }
        } catch (error) {
            console.log('📁 No existing videos found');
        }
        
        const videosData = {
            lastSync: new Date().toISOString(),
            count: demoVideos.length,
            videos: demoVideos,
            demo: true
        };
        
        await fs.writeJSON(this.videosJsonPath, videosData, { spaces: 2 });
        console.log(`📄 Created demo videos.json with ${demoVideos.length} videos`);
    }

    async cleanup() {
        // Remove videos that are no longer in Google Drive
        try {
            const videosJson = await fs.readJSON(this.videosJsonPath);
            const existingFiles = await fs.readdir(this.videosDir);
            
            const validVideoNames = videosJson.videos.map(v => v.name);
            
            for (const file of existingFiles) {
                if (file === '.gitkeep') continue;
                
                const ext = path.extname(file).toLowerCase();
                if (this.supportedFormats.includes(ext) && !validVideoNames.includes(file)) {
                    const filePath = path.join(this.videosDir, file);
                    await fs.remove(filePath);
                    console.log(`🗑️ Removed obsolete video: ${file}`);
                }
            }
        } catch (error) {
            console.log('⚠️ Cleanup skipped:', error.message);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const sync = new GoogleDriveVideoSync();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Google Drive Video Sync Tool

Usage: node sync.js [options]

Options:
  --help, -h     Show this help message
  --cleanup      Remove videos not in Google Drive
  --demo         Run in demo mode (no Google Drive API)

Environment Variables:
  GOOGLE_DRIVE_FOLDER_ID     - Google Drive folder ID containing videos
  GOOGLE_SERVICE_ACCOUNT_KEY - JSON string of service account credentials
  OR
  GOOGLE_CLIENT_ID           - OAuth2 client ID
  GOOGLE_CLIENT_SECRET       - OAuth2 client secret
  GOOGLE_REFRESH_TOKEN       - OAuth2 refresh token

Examples:
  npm run sync
  node sync.js --cleanup
        `);
        return;
    }
    
    await sync.sync();
    
    if (args.includes('--cleanup')) {
        await sync.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error.message);
        // Exit gracefully to allow build to continue
        process.exit(0);
    });
}

module.exports = GoogleDriveVideoSync; 