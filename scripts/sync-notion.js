const NotionClient = require('./notion-client');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const {organizeNav, organizeData} = require("./helper");

class NotionSync {
    constructor() {
        this.client = new NotionClient();
        this.contentDir = path.join(__dirname, '../content');
        this.docsDir = path.join(__dirname, '../docs');
    }

    async sync() {
        console.log('🚀 开始同步 Notion 文档...');

        try {
            // 创建必要目录
            this.ensureDirectories();

            // 获取 Notion 页面
            const pages = await this.client.getPages();
            console.log(`📄 找到 ${pages.length} 篇文档`);

            // 生成文档索引
            const articles = [];

            for (const page of pages) {
                const article = await this.processPage(page);
                if (article) {
                    articles.push(article);
                }
            }

            // 生成索引文件
            await this.generateIndex(articles);

            // 更新 VitePress 配置
            await this.updateVitePressConfig(articles);

            console.log('✅ 同步完成！');

        } catch (error) {
            console.error('❌ 同步失败:', error);
            process.exit(1);
        }
    }

    async processPage(page) {
        try {
            const properties = this.client.parsePageProperties(page);
            console.log(`📝 处理文档: ${properties.title}`);

            // 获取页面内容
            const blocks = await this.client.getPageContent(page.id,properties);

            // todo 加title
            let content = await this.client.blocksToMarkdown(blocks);
            content = `# ${properties.title}\n${content}`
            // 生成 slug
            const slug = properties.slug || this.generateSlug(properties.title);


            // 创建 frontmatter
            const frontmatter = {
                title: properties.title,
                description: content.substring(0, 100).replace(/\n/g, ' ').trim(),
                date: properties.created_time,
                updated: properties.last_edited_time,
                category: properties.category, // 变为数组了
                tags: properties.tags,
                notion_id: properties.id,
                notion_url: properties.url
            };
            // 生成 markdown 文件
            const markdown = matter.stringify(content, frontmatter);

            // todo 确定文件路径
            const fileName = `${properties.title}.md`;
            // const fileName = `${slug}.md`;
            const categoryDir = path.join(this.docsDir, properties.category.join('/'));
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }
            const filePath = path.join(categoryDir, fileName);
            console.log(filePath)
            // 写入文件
            fs.writeFileSync(filePath, markdown, 'utf-8');

            console.log(`✅ 生成文档: ${filePath}`);

            return {
                title: properties.title,
                slug: `/${properties.category.join('/')}/${properties.title}.md`,
                category: properties.category,
                date: properties.created_time,
                tags: properties.tags,
                filePath: path.relative(this.docsDir, filePath)
            };

        } catch (error) {
            console.error(`❌ 处理页面失败 ${page.id}:`, error);
            return null;
        }
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }

    async generateIndex(articles) {
        // todo 按分类分组

        const categories = {};
        articles.forEach(article => {
            const _category = article.category[0]
            if (!categories[_category]) {
                categories[_category] = [];
            }
            categories[_category].push(article);
        });
        // todo
        // 生成 分类页面
        for (const [category, categoryArticles] of Object.entries(categories)) {
            const indexContent = `# ${category}\n\n${categoryArticles.map(article =>
                `- [${article.title}](${article.slug})`
            ).join('\n')}`;

            const categoryDir = path.join(this.docsDir, category);
            const indexPath = path.join(categoryDir, 'index.md');

            fs.writeFileSync(indexPath, indexContent, 'utf-8');
        }

        // 生成总索引
        const indexContent = `---
layout: home
hero:
  name: "windDrop"
  text: "学习笔记"
  image:
    src: /crocodile.png
    alt: 背景图
  actions:
    - theme: alt
      text: View on GitHub
      link: https://github.com/raindropLiu
features:
${Object.keys(categories).map(category => `  - title: ${category}
    link: /${category}/
    details: ${categories[category].length} 篇文章`).join('\n')}
---

## 最新文章

${articles.slice(0, 10).map(article =>
            `- [${article.title}](${article.slug}) - ${new Date(article.date).toLocaleDateString()}`
        ).join('\n')}`;

        fs.writeFileSync(path.join(this.docsDir, 'index.md'), indexContent, 'utf-8');
    }

    async updateVitePressConfig(articles) {
        // 生成侧边栏配置

        const sidebar =  organizeData(articles);

        // const sidebar = {};
        // const categories = {};
        // articles.forEach(article => {
        //     const _category = article.category[0]
        //     if (!categories[_category]) {
        //         categories[_category] = [];
        //     }
        //     categories[_category].push({
        //         text: article.title,
        //         link: article.slug,
        //         // category: article.category
        //     });
        // });

        // for (const [category, items] of Object.entries(categories)) {
        //     sidebar[`/${category}/`] = [
        //         {
        //             text: category,
        //             items: items
        //         }
        //     ];
        // }


        let _nav = organizeNav(articles);
        _nav.unshift({ text: '首页', link: '/' })
        const config = `import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "WD-笔记",
  lang: 'zh-CN',  // 设置中文简体
  base: "/",
  search: {
      provider: 'local' // 本地搜索
    },
    // 在head里添加其他的元素，例如link,script等。下面例子为：添加 favicon 图标
  head: [['link', { rel: 'icon', href: '/flag.svg' }]],
  // 当设置为true时，VitePress 将从 URL 中删除尾随的.html（启用此功能可能需要在您的托管平台上进行额外配置。为了让它工作，您的服务器必须能够在访问/foo时提供/foo.html而无需重定向。）
  cleanUrls: true,
  // 构建时，不构建哪些md文件
  srcExclude: ['**/README.md'],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏左侧的标题之前的logo。接受路径字符串或对象来为亮/暗模式设置不同的logo。
    logo: '/flag.svg',
    // 导航栏左侧的标题（默认引用 config.title 值的站点标题）
    siteTitle: 'windDrop',
    nav: ${JSON.stringify(_nav, null, 2)},
    
    sidebar: ${JSON.stringify(sidebar, null, 2)},
    outline:{
      level:'deep',
      label:'导航'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/raindropLiu' }
    ],
     footer: {
      // 版权前显示的信息 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      message: 'Released under the MIT License.',
      // 实际的版权文本 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      copyright: 'Copyright © 2025-present Junguang'
    },
    search: {
      provider: 'local'
    }
  }
})`;

        fs.writeFileSync(
            path.join(__dirname, '../docs/.vitepress/config.mjs'),
            config,
            'utf-8'
        );
    }

    ensureDirectories() {
        const dirs = [this.contentDir, this.docsDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
}

// 运行同步
const sync = new NotionSync();
sync.sync();