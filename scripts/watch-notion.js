const NotionSync = require('./sync-notion');
const cron = require('node-cron');

class NotionWatcher {
    constructor() {
        this.sync = new NotionSync();
    }

    start() {
        console.log('🔄 启动 Notion 监听器...');

        // 每10分钟检查一次更新
        cron.schedule('*/10 * * * *', async () => {
            console.log('⏰ 定时同步开始...');
            await this.sync.sync();
        });

        // 立即执行一次同步
        this.sync.sync();
    }
}

const watcher = new NotionWatcher();
watcher.start();