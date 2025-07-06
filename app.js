class VideoGallery {
    constructor() {
        this.videos = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadVideos();
    }

    bindEvents() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleAllVideos();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    async loadVideos() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch(`videos.json?t=${Date.now()}`);
            const data = await response.json();
            
            this.videos = data.videos || [];
            this.renderVideos();
            
            console.log(`📼 Loaded ${this.videos.length} videos`);
            
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos');
        } finally {
            this.isLoading = false;
        }
    }

    renderVideos() {
        const container = document.getElementById('video-grid');
        const loading = document.getElementById('loading');
        const noVideos = document.getElementById('no-videos');

        loading.style.display = 'none';
        noVideos.style.display = 'none';

        if (this.videos.length === 0) {
            noVideos.style.display = 'block';
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.videos.map(video => `
            <div class="video-item">
                <video
                    src="${video.path}"
                    controls
                    muted
                    loop
                    preload="metadata"
                    data-video-name="${video.name}"
                    poster=""
                >
                    Your browser does not support the video tag.
                </video>
                
                <div class="video-controls">
                    <button class="download-btn" onclick="downloadVideo('${video.path}', '${video.name}')">
                        ⬇️ Download
                    </button>
                </div>
            </div>
        `).join('');

        // Add video event listeners
        const videos = container.querySelectorAll('video');
        videos.forEach(video => {
            video.addEventListener('loadedmetadata', () => {
                console.log(`📹 Video loaded: ${video.dataset.videoName}`);
            });
            
            video.addEventListener('error', (e) => {
                console.error(`❌ Video error: ${video.dataset.videoName}`, e);
            });
        });
    }

    toggleAllVideos() {
        const videos = document.querySelectorAll('video');
        const allPaused = Array.from(videos).every(video => video.paused);
        
        videos.forEach(video => {
            if (allPaused) {
                video.play().catch(e => console.log('Play failed:', e));
            } else {
                video.pause();
            }
        });
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const noVideos = document.getElementById('no-videos');
        
        loading.style.display = 'block';
        noVideos.style.display = 'none';
    }

    showError(message) {
        const loading = document.getElementById('loading');
        const noVideos = document.getElementById('no-videos');
        
        loading.style.display = 'none';
        noVideos.style.display = 'block';
        noVideos.textContent = message;
    }



    refresh() {
        console.log('🔄 Refreshing videos...');
        this.loadVideos();
    }
}

// Download function
function downloadVideo(videoPath, videoName) {
    const link = document.createElement('a');
    link.href = videoPath;
    link.download = videoName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`📥 Downloaded: ${videoName}`);
}

// Initialize the gallery
document.addEventListener('DOMContentLoaded', () => {
    window.videoGallery = new VideoGallery();
});

// Auto-refresh every 10 seconds to check for new videos
setInterval(() => {
    if (window.videoGallery) {
        console.log('🔄 Auto-checking for new videos...');
        window.videoGallery.refresh();
    }
}, 10 * 1000); // 10 seconds

// Also check when the page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.videoGallery) {
        console.log('👁️ Page visible - checking for new videos...');
        window.videoGallery.refresh();
    }
}); 