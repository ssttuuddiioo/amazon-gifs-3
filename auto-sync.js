#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class AutoSync {
    constructor() {
        this.syncInterval = 10 * 1000; // 10 seconds
        this.isRunning = false;
        this.lastSyncTime = null;
        
        console.log('🚀 Auto-sync started - checking Google Drive every 10 seconds');
        this.start();
    }

    start() {
        this.isRunning = true;
        this.syncLoop();
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n⏹️ Stopping auto-sync...');
            this.isRunning = false;
            process.exit(0);
        });
    }

    async syncLoop() {
        while (this.isRunning) {
            try {
                await this.runSync();
                console.log(`⏰ Next sync in 10 seconds... (${new Date().toLocaleTimeString()})`);
                await this.sleep(this.syncInterval);
            } catch (error) {
                console.error('❌ Auto-sync error:', error.message);
                await this.sleep(5000); // Wait 5 seconds before retrying on error
            }
        }
    }

    runSync() {
        return new Promise((resolve, reject) => {
            const syncProcess = spawn('node', ['sync.js', '--cleanup'], {
                cwd: __dirname,
                stdio: 'inherit'
            });

            syncProcess.on('close', (code) => {
                this.lastSyncTime = new Date();
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Sync process exited with code ${code}`));
                }
            });

            syncProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start auto-sync
if (require.main === module) {
    new AutoSync();
} 