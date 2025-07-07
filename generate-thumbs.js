#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ThumbnailGenerator {
    constructor() {
        this.videosDir = path.join(__dirname, 'videos');
        this.thumbsDir = path.join(__dirname, 'thumbs');
        this.videosJsonPath = path.join(__dirname, 'videos.json');
        this.supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        this.cacheFile = path.join(__dirname, '.thumb-cache.json');
    }

    async generate() {
        console.log('🎬 Starting thumbnail generation...');
        
        try {
            // Check if ffmpeg is available
            this.checkFfmpeg();
            
            // Ensure directories exist
            await fs.ensureDir(this.videosDir);
            await fs.ensureDir(this.thumbsDir);
            
            // Load existing cache
            const cache = await this.loadCache();
            
            // Get video files
            const videoFiles = await this.getVideoFiles();
            console.log(`📁 Found ${videoFiles.length} video files`);
            
            const processedVideos = [];
            
            for (const videoFile of videoFiles) {
                try {
                    const result = await this.processVideo(videoFile, cache);
                    if (result) {
                        processedVideos.push(result);
                    }
                } catch (error) {
                    console.error(`❌ Error processing ${videoFile}:`, error.message);
                }
            }
            
            // Save cache
            await this.saveCache(cache);
            
            // Generate videos.json
            await this.generateVideosJson(processedVideos);
            
            console.log(`✅ Generated ${processedVideos.length} thumbnails`);
            
        } catch (error) {
            console.error('❌ Thumbnail generation failed:', error.message);
            process.exit(1);
        }
    }

    checkFfmpeg() {
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
            console.log('✅ ffmpeg found');
        } catch (error) {
            console.error('❌ ffmpeg not found. Please install ffmpeg:');
            console.error('   macOS: brew install ffmpeg');
            console.error('   Ubuntu: sudo apt install ffmpeg');
            console.error('   Windows: Download from https://ffmpeg.org/');
            process.exit(1);
        }
    }

    async getVideoFiles() {
        const files = await fs.readdir(this.videosDir);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return this.supportedFormats.includes(ext);
        });
    }

    async processVideo(videoFile, cache) {
        const videoPath = path.join(this.videosDir, videoFile);
        const videoName = path.parse(videoFile).name;
        const thumbName = `${videoName}.webp`;
        const thumbPath = path.join(this.thumbsDir, thumbName);
        
        // Check if thumbnail needs to be generated
        const videoStats = await fs.stat(videoPath);
        const videoHash = this.getFileHash(videoPath, videoStats);
        
        if (cache[videoFile] && cache[videoFile].hash === videoHash && await fs.pathExists(thumbPath)) {
            console.log(`⏭️ Skipping ${videoFile} (up to date)`);
            return {
                name: videoName,
                title: this.generateTitle(videoName),
                video: `/videos/${videoFile}`,
                thumb: `/thumbs/${thumbName}`,
                downloadUrl: `/videos/${videoFile}`,
                size: videoStats.size,
                lastModified: videoStats.mtime.toISOString()
            };
        }
        
        console.log(`🔄 Generating thumbnail for ${videoFile}...`);
        
        // Generate WebP thumbnail with ffmpeg
        const ffmpegCommand = [
            'ffmpeg',
            '-i', `"${videoPath}"`,
            '-vf', '"scale=540:960:force_original_aspect_ratio=decrease:flags=lanczos,pad=540:960:-1:-1:color=black"',
            '-loop', '0',
            '-t', '0.5',
            '-r', '30', // 30 fps for 0.5s = 15 frames
            '-c:v', 'libwebp',
            '-quality', '85',
            '-preset', 'default',
            '-an', // no audio
            '-y', // overwrite
            `"${thumbPath}"`
        ].join(' ');
        
        try {
            execSync(ffmpegCommand, { stdio: 'pipe' });
            console.log(`✅ Generated thumbnail: ${thumbName}`);
            
            // Update cache
            cache[videoFile] = {
                hash: videoHash,
                generated: new Date().toISOString()
            };
            
            return {
                name: videoName,
                title: this.generateTitle(videoName),
                video: `/videos/${videoFile}`,
                thumb: `/thumbs/${thumbName}`,
                downloadUrl: `/videos/${videoFile}`,
                size: videoStats.size,
                lastModified: videoStats.mtime.toISOString()
            };
            
        } catch (error) {
            console.error(`❌ ffmpeg failed for ${videoFile}:`, error.message);
            return null;
        }
    }

    generateTitle(filename) {
        // Convert filename to readable title
        return filename
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    getFileHash(filePath, stats) {
        // Create hash from file path, size, and mtime
        const hashData = `${filePath}:${stats.size}:${stats.mtime.getTime()}`;
        return crypto.createHash('md5').update(hashData).digest('hex');
    }

    async loadCache() {
        try {
            if (await fs.pathExists(this.cacheFile)) {
                return await fs.readJSON(this.cacheFile);
            }
        } catch (error) {
            console.warn('⚠️ Could not load cache:', error.message);
        }
        return {};
    }

    async saveCache(cache) {
        try {
            await fs.writeJSON(this.cacheFile, cache, { spaces: 2 });
        } catch (error) {
            console.warn('⚠️ Could not save cache:', error.message);
        }
    }

    async generateVideosJson(videos) {
        const videosData = {
            lastGenerated: new Date().toISOString(),
            count: videos.length,
            videos: videos.sort((a, b) => a.title.localeCompare(b.title))
        };
        
        await fs.writeJSON(this.videosJsonPath, videosData, { spaces: 2 });
        console.log('📄 Generated videos.json');
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new ThumbnailGenerator();
    generator.generate();
}

module.exports = ThumbnailGenerator; 