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
                <div class="video-wrapper" onclick="playVideo(this)">
                    <video
                        src="${video.path}"
                        muted
                        preload="none"
                        data-video-name="${video.name}"
                        data-playing="false"
                        poster=""
                    >
                        Your browser does not support the video tag.
                    </video>
                    <div class="play-overlay">
                        <div class="play-button">▶️</div>
                    </div>
                </div>
                
                <div class="video-controls">
                    <button class="download-btn" onclick="downloadVideo('${video.path}', '${video.name}')">
                        Save
                    </button>
                </div>
            </div>
        `).join('');

        // Add video event listeners
        const videos = container.querySelectorAll('video');
        videos.forEach(video => {
            const wrapper = video.closest('.video-wrapper');
            const overlay = wrapper.querySelector('.play-overlay');
            
            // Initially show play button
            overlay.innerHTML = '<div class="play-button">▶️</div>';
            overlay.style.display = 'flex';
            
            video.addEventListener('loadedmetadata', () => {
                console.log(`📹 Video loaded: ${video.dataset.videoName}`);
                // Set video to first frame
                video.currentTime = 0;
            });
            
            video.addEventListener('error', (e) => {
                console.error(`❌ Video error: ${video.dataset.videoName}`, e);
                overlay.innerHTML = '<div class="error-message">❌ Error loading video</div>';
                overlay.style.display = 'flex';
            });
            
            // Handle video end
            video.addEventListener('ended', () => {
                video.dataset.playing = 'false';
            });
        });
    }

    toggleAllVideos() {
        const videos = document.querySelectorAll('video[data-playing="true"]');
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

// Check when the page becomes visible again (e.g., switching tabs)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.videoGallery) {
        console.log('👁️ Page visible - checking for new videos...');
        window.videoGallery.refresh();
    }
});

// Play video function
function playVideo(wrapper) {
    const video = wrapper.querySelector('video');
    const overlay = wrapper.querySelector('.play-overlay');
    
    if (video.dataset.playing === 'false') {
        // Show loading state
        overlay.innerHTML = '<div class="loading-spinner">⏳</div>';
        overlay.style.display = 'flex';
        
        // Start loading the video
        video.preload = 'metadata';
        video.load();
        
        // Wait for video to be ready, then play
        const playWhenReady = () => {
            video.loop = true;
            video.dataset.playing = 'true';
            
            video.play().then(() => {
                // Successfully started playing
                overlay.style.display = 'none';
                console.log(`✅ Playing: ${video.dataset.videoName}`);
            }).catch(e => {
                // Play failed, show error or retry
                console.log('Play failed:', e);
                overlay.innerHTML = '<div class="play-button">▶️</div>';
                overlay.style.display = 'flex';
                video.dataset.playing = 'false';
            });
        };
        
        // Listen for when video is ready to play
        if (video.readyState >= 3) {
            // Video is already ready
            playWhenReady();
        } else {
            // Wait for video to be ready
            video.addEventListener('canplay', playWhenReady, { once: true });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (video.dataset.playing === 'false') {
                    overlay.innerHTML = '<div class="play-button">▶️</div>';
                    overlay.style.display = 'flex';
                    console.log('Video load timeout');
                }
            }, 10000);
        }
        
    } else {
        // Toggle play/pause
        if (video.paused) {
            video.play().catch(e => console.log('Play failed:', e));
            overlay.style.display = 'none';
        } else {
            video.pause();
            video.dataset.playing = 'false';
        }
    }
} 