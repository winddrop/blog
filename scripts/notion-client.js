// 增强版 Notion 客户端 - 解决连接问题
const { Client } = require('@notionhq/client');
const https = require('https');
const fs = require('fs');
const path = require('path');
const nodeFetch = require('node-fetch');
require('dotenv').config();
class RobustNotionClient {
    constructor() {
        // 创建自定义 HTTPS Agent 来处理连接问题
        const httpsAgent = new https.Agent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 5,
            maxFreeSockets: 2,
            timeout: 60000,
            freeSocketTimeout: 30000,
        });

        this.notion = new Client({
            auth: process.env.NOTION_TOKEN,
            // 添加自定义配置
            fetch: this.createCustomFetch(httpsAgent),
        });

        this.databaseId = process.env.NOTION_DATABASE_ID;

        // 重试配置
        this.retryConfig = {
            maxRetries: 5,
            baseDelay: 1000,
            maxDelay: 10000,
            exponentialBase: 2,
        };
    }

    // 创建自定义 fetch 函数
    createCustomFetch(agent) {
        return (url, options = {}) => {
            return nodeFetch(url, {
                ...options,
                agent,
                timeout: 30000, // 30秒超时
                headers: {
                    'User-Agent': 'VitePress-Notion-Integration/1.0',
                    ...options.headers,
                },
            });
        };
    }

    // 带重试的请求包装器
    async withRetry(operation, context = '') {
        let lastError;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                console.log(`🔄 ${context} (尝试 ${attempt}/${this.retryConfig.maxRetries})`);
                const result = await operation();

                if (attempt > 1) {
                    console.log(`✅ ${context} 重试成功`);
                }

                return result;

            } catch (error) {
                lastError = error;
                const isRetryableError = this.isRetryableError(error);

                console.warn(`⚠️  ${context} 失败 (尝试 ${attempt}/${this.retryConfig.maxRetries}):`, error.message);

                if (!isRetryableError || attempt === this.retryConfig.maxRetries) {
                    break;
                }

                // 计算延迟时间（指数退避）
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(this.retryConfig.exponentialBase, attempt - 1),
                    this.retryConfig.maxDelay
                );

                console.log(`⏳ ${delay}ms 后重试...`);
                await this.sleep(delay);
            }
        }

        throw new Error(`${context} 最终失败: ${lastError.message}`);
    }

    // 判断是否为可重试的错误
    isRetryableError(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'EHOSTUNREACH',
            'ENOTFOUND',
            'EAI_AGAIN',
            'fetch failed',
        ];

        const errorMessage = error.message.toLowerCase();
        const errorCode = error.code?.toLowerCase();

        return retryableErrors.some(retryable =>
            errorMessage.includes(retryable.toLowerCase()) ||
            errorCode === retryable.toLowerCase()
        ) || (error.status >= 500 && error.status < 600); // 5xx 服务器错误
    }

    // 延迟函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 获取数据库页面（带重试）
    async getPages() {
        return this.withRetry(async () => {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                filter: {
                    property: 'status',
                    select: {
                        equals: '完成'
                    }
                },
                sorts: [
                    {
                        property: 'created_time',
                        direction: 'descending'
                    }
                ],
                page_size: 10, // 减少单次请求量
            });
            console.log(response)
            return response.results;
        }, '获取数据库页面');
    }

    // 获取所有页面（分页处理）
    async getAllPages() {
        const allPages = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const response = await this.withRetry(async () => {
                const queryParams = {
                    database_id: this.databaseId,
                    filter: {
                        property: 'status',
                        select: {
                            equals: 'Published'
                        }
                    },
                    sorts: [
                        {
                            property: 'created_time',
                            direction: 'descending'
                        }
                    ],
                    page_size: 10,
                };

                if (nextCursor) {
                    queryParams.start_cursor = nextCursor;
                }

                return await this.notion.databases.query(queryParams);
            }, `获取页面批次 (游标: ${nextCursor?.substring(0, 8) || '首页'})`);

            allPages.push(...response.results);
            hasMore = response.has_more;
            nextCursor = response.next_cursor;

            // 在分页之间添加延迟
            if (hasMore) {
                await this.sleep(500);
            }
        }

        return allPages;
    }

    // 获取页面内容（带重试和分批处理）
    async getPageContent(pageId,properties) {
        const allBlocks = [];
        let hasMore = true;
        let nextCursor = undefined;
        while (hasMore) {
            const response = await this.withRetry(async () => {
                const params = {
                    // todo  pageId
                    block_id: properties.slug||pageId,
                    page_size: 50, // 减少单次请求的块数量
                };

                if (nextCursor) {
                    params.start_cursor = nextCursor;
                }

                return await this.notion.blocks.children.list(params);
            }, `获取页面内容 ${pageId.substring(0, 8)}`);
            console.log('response',response)
            allBlocks.push(...response.results);
            hasMore = response.has_more;
            nextCursor = response.next_cursor;

            // 在批次之间添加延迟
            if (hasMore) {
                await this.sleep(400);
            }
        }

        return allBlocks;
    }

    // 健康检查
    async healthCheck() {
        try {
            console.log('🏥 进行 Notion API 健康检查...');

            const response = await this.withRetry(async () => {
                return await this.notion.databases.retrieve({
                    database_id: this.databaseId
                });
            }, 'API 健康检查');

            console.log('✅ Notion API 连接正常');
            console.log(`📊 数据库: ${response.title?.[0]?.plain_text || 'Unnamed Database'}`);

            return true;
        } catch (error) {
            console.error('❌ Notion API 健康检查失败:', error.message);
            return false;
        }
    }

    // 网络诊断
    async networkDiagnostic() {
        console.log('🔧 开始网络诊断...');

        // 检查基本网络连接
        try {
            const dns = require('dns').promises;
            await dns.lookup('api.notion.com');
            console.log('✅ DNS 解析正常');
        } catch (error) {
            console.error('❌ DNS 解析失败:', error.message);
        }

        // 检查 HTTPS 连接
        try {
            const net = require('net');
            const socket = net.createConnection({ host: 'api.notion.com', port: 443 });

            await new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    console.log('✅ TCP 连接正常');
                    socket.destroy();
                    resolve();
                });

                socket.on('error', reject);
                socket.setTimeout(5000, () => {
                    socket.destroy();
                    reject(new Error('连接超时'));
                });
            });
        } catch (error) {
            console.error('❌ TCP 连接失败:', error.message);
        }

        // 测试基本 HTTP 请求
        try {
            const https = require('https');
            const options = {
                hostname: 'api.notion.com',
                port: 443,
                path: '/v1/databases/' + this.databaseId,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28',
                },
                timeout: 10000,
            };

            await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    console.log(`✅ HTTP 状态码: ${res.statusCode}`);
                    res.on('data', () => {}); // 消费响应数据
                    res.on('end', resolve);
                });

                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });

                req.end();
            });
        } catch (error) {
            console.error('❌ HTTP 请求失败:', error.message);
        }
    }

    // 解析页面属性（保持不变）
    parsePageProperties(page) {
        const properties = page.properties;
        return {
            id: page.id,
            title: properties.title?.title?.[0]?.plain_text || 'Untitled',
            slug: properties.slug?.rich_text?.[0]?.plain_text || '',
            category: (properties.category?.rich_text?.[0]?.plain_text||'').split('/'),
            tags: properties.tags?.multi_select?.map(tag => tag.name) || [],
            status: properties.status?.select?.name || 'draft',
            created_time: properties.created_time?.created_time,
            last_edited_time: properties.last_edited_time?.last_edited_time,
            url: page.url
        };
    }

    // 转换 blocks 为 Markdown（增加错误处理）
    async blocksToMarkdown(blocks) {
        let markdown = '';

        for (const block of blocks) {
            try {
                switch (block.type) {
                    case 'paragraph':
                        const text = this.richTextToMarkdown(block.paragraph.rich_text);
                        markdown += text + '\n\n';
                        break;

                    case 'heading_1':
                        const h1Text = this.richTextToMarkdown(block.heading_1.rich_text);
                        markdown += `# ${h1Text}\n\n`;
                        break;

                    case 'heading_2':
                        const h2Text = this.richTextToMarkdown(block.heading_2.rich_text);
                        markdown += `## ${h2Text}\n\n`;
                        break;

                    case 'heading_3':
                        const h3Text = this.richTextToMarkdown(block.heading_3.rich_text);
                        markdown += `### ${h3Text}\n\n`;
                        break;

                    case 'bulleted_list_item':
                        const bulletText = this.richTextToMarkdown(block.bulleted_list_item.rich_text);
                        markdown += `- ${bulletText}\n`;
                        break;

                    case 'numbered_list_item':
                        const numberedText = this.richTextToMarkdown(block.numbered_list_item.rich_text);
                        markdown += `1. ${numberedText}\n`;
                        break;

                    case 'code':
                        const codeText = this.richTextToMarkdown(block.code.rich_text);
                        const language = block.code.language || '';
                        markdown += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
                        break;

                    case 'quote':
                        const quoteText = this.richTextToMarkdown(block.quote.rich_text);
                        markdown += `> ${quoteText}\n\n`;
                        break;

                    case 'divider':
                        markdown += '---\n\n';
                        break;

                    case 'image':
                        try {
                            const imageUrl = block.image.file?.url || block.image.external?.url;
                            const caption = block.image.caption ? this.richTextToMarkdown(block.image.caption) : '';
                            markdown += `![${caption}](${imageUrl})\n\n`;
                        } catch (imgError) {
                            console.warn('图片处理失败:', imgError.message);
                            markdown += '<!-- 图片加载失败 -->\n\n';
                        }
                        break;

                    // 处理有子块的情况
                    default:
                        if (block.has_children) {
                            try {
                                const children = await this.getPageContent(block.id);
                                const childMarkdown = await this.blocksToMarkdown(children);
                                markdown += childMarkdown;
                            } catch (childError) {
                                console.warn(`子块处理失败 ${block.id}:`, childError.message);
                            }
                        }
                        break;
                }
            } catch (blockError) {
                console.warn(`块处理失败 ${block.id}:`, blockError.message);
                markdown += `<!-- 块处理失败: ${block.type} -->\n\n`;
            }
        }

        return markdown;
    }

    // 富文本转 Markdown（保持不变）
    richTextToMarkdown(richTextArray) {
        if (!Array.isArray(richTextArray)) {
            return '';
        }

        return richTextArray.map(text => {
            let markdown = text.plain_text || '';

            if (text.annotations?.bold) {
                markdown = `**${markdown}**`;
            }
            if (text.annotations?.italic) {
                markdown = `*${markdown}*`;
            }
            if (text.annotations?.strikethrough) {
                markdown = `~~${markdown}~~`;
            }
            if (text.annotations?.code) {
                markdown = `\`${markdown}\``;
            }
            if (text.href) {
                markdown = `[${markdown}](${text.href})`;
            }

            return markdown;
        }).join('');
    }
}

module.exports = RobustNotionClient;