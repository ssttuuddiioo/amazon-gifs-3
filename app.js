class VideoGallery {
    constructor() {
        this.videos = [];
        this.isLoading = false;
        this.intersectionObserver = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupIntersectionObserver();
        this.loadVideos();
    }

    bindEvents() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleAllThumbs();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    setupIntersectionObserver() {
        // Lazy loading for thumbnail images
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        this.intersectionObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
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
            <div class="video-item" data-video='${JSON.stringify(video)}'>
                <div class="thumbnail-container">
                    <img
                        data-src="${video.thumb}"
                        alt="${video.title}"
                        class="video-thumbnail"
                        loading="lazy"
                        style="cursor: pointer;"
                        title="Click to view full video"
                    />
                    <div class="play-overlay">
                        <div class="play-button">▶</div>
                    </div>
                </div>
                
                <div class="video-controls">
                    <button class="download-btn" onclick="downloadVideo('${video.downloadUrl}', '${video.name}')">
                        ⬇️ Download
                    </button>
                </div>
            </div>
        `).join('');

        // Setup lazy loading for thumbnails
        const thumbnails = container.querySelectorAll('.video-thumbnail');
        thumbnails.forEach(img => {
            this.intersectionObserver.observe(img);
        });

        // Add click handlers for video items
        const videoItems = container.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            const thumbnail = item.querySelector('.video-thumbnail');
            const playOverlay = item.querySelector('.play-overlay');
            
            const clickHandler = () => {
                const videoData = JSON.parse(item.dataset.video);
                this.playFullVideo(item, videoData);
            };
            
            thumbnail.addEventListener('click', clickHandler);
            playOverlay.addEventListener('click', clickHandler);
            
            // Add hover effects
            item.addEventListener('mouseenter', () => {
                playOverlay.style.opacity = '1';
            });
            
            item.addEventListener('mouseleave', () => {
                playOverlay.style.opacity = '0';
            });
        });
    }

    playFullVideo(container, videoData) {
        const thumbnailContainer = container.querySelector('.thumbnail-container');
        const videoControls = container.querySelector('.video-controls');
        
        // Replace thumbnail with video element
        thumbnailContainer.innerHTML = `
            <video
                src="${videoData.video}"
                controls
                autoplay
                preload="metadata"
                style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;"
            >
                Your browser does not support the video tag.
            </video>
            <button class="back-to-thumb" onclick="backToThumbnail(this)">
                ← Back to thumbnail
            </button>
        `;
        
        // Show enhanced controls
        videoControls.innerHTML = `
            <button class="download-btn" onclick="downloadVideo('${videoData.downloadUrl}', '${videoData.name}')">
                ⬇️ Download
            </button>
            <button class="fullscreen-btn" onclick="openFullscreen('${videoData.video}')">
                ⛶ Fullscreen
            </button>
        `;
        
        // Add video event listeners
        const video = thumbnailContainer.querySelector('video');
        video.addEventListener('loadedmetadata', () => {
            console.log(`📹 Video loaded: ${videoData.title}`);
        });
        
        video.addEventListener('error', (e) => {
            console.error(`❌ Video error: ${videoData.title}`, e);
            this.showVideoError(container, videoData);
        });
    }

    showVideoError(container, videoData) {
        const thumbnailContainer = container.querySelector('.thumbnail-container');
        thumbnailContainer.innerHTML = `
            <div class="video-error">
                <p>❌ Video failed to load</p>
                <button onclick="backToThumbnail(this)">← Back</button>
            </div>
        `;
    }

    toggleAllThumbs() {
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

// Global functions
function downloadVideo(videoUrl, videoName) {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = videoName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`📥 Downloaded: ${videoName}`);
}

function openFullscreen(videoUrl) {
    window.open(videoUrl, '_blank');
}

function backToThumbnail(button) {
    const videoItem = button.closest('.video-item');
    const videoData = JSON.parse(videoItem.dataset.video);
    const thumbnailContainer = videoItem.querySelector('.thumbnail-container');
    const videoControls = videoItem.querySelector('.video-controls');
    
    // Restore thumbnail
    thumbnailContainer.innerHTML = `
        <img
            src="${videoData.thumb}"
            alt="${videoData.title}"
            class="video-thumbnail"
            style="cursor: pointer;"
            title="Click to view full video"
        />
        <div class="play-overlay">
            <div class="play-button">▶</div>
        </div>
    `;
    
    // Restore original controls
    videoControls.innerHTML = `
        <button class="download-btn" onclick="downloadVideo('${videoData.downloadUrl}', '${videoData.name}')">
            ⬇️ Download
        </button>
    `;
    
    // Re-add click handlers
    const thumbnail = thumbnailContainer.querySelector('.video-thumbnail');
    const playOverlay = thumbnailContainer.querySelector('.play-overlay');
    
    const clickHandler = () => {
        window.videoGallery.playFullVideo(videoItem, videoData);
    };
    
    thumbnail.addEventListener('click', clickHandler);
    playOverlay.addEventListener('click', clickHandler);
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