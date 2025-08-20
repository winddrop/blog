// 增强版 Notion 客户端 - 解决连接问题
const { Client } = require("@notionhq/client");
const https = require("https");
const fs = require("fs");
const path = require("path");
const nodeFetch = require("node-fetch");
const ImageUploader = require("./image-uploader");
require("dotenv").config();
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

    // 初始化图片上传器
    this.imageUploader = new ImageUploader();

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
          "User-Agent": "VitePress-Notion-Integration/1.0",
          ...options.headers,
        },
      });
    };
  }

  // 带重试的请求包装器
  async withRetry(operation, context = "") {
    let lastError;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(
          `🔄 ${context} (尝试 ${attempt}/${this.retryConfig.maxRetries})`
        );
        const result = await operation();

        if (attempt > 1) {
          console.log(`✅ ${context} 重试成功`);
        }

        return result;
      } catch (error) {
        lastError = error;
        const isRetryableError = this.isRetryableError(error);

        console.warn(
          `⚠️  ${context} 失败 (尝试 ${attempt}/${this.retryConfig.maxRetries}):`,
          error.message
        );

        if (!isRetryableError || attempt === this.retryConfig.maxRetries) {
          break;
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.exponentialBase, attempt - 1),
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
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ENOTFOUND",
      "EAI_AGAIN",
      "fetch failed",
    ];

    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code?.toLowerCase();

    return (
      retryableErrors.some(
        (retryable) =>
          errorMessage.includes(retryable.toLowerCase()) ||
          errorCode === retryable.toLowerCase()
      ) ||
      (error.status >= 500 && error.status < 600)
    ); // 5xx 服务器错误
  }

  // 延迟函数
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 获取数据库页面（带重试）
  async getPages() {
    return this.withRetry(async () => {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          or: [
            {
              property: "status",
              select: {
                equals: "待更新",
              },
            },
            {
              property: "status",
              select: {
                equals: "更新完成",
              },
            },
          ],
        },
        sorts: [
          // `"ascending"` or `"descending"`
          {
            property: "date",
            direction: "descending",
          },
        ],
        page_size: 10, // 减少单次请求量
      });
      return response.results;
    }, "获取数据库页面");
  }
  // 获取页面内容（带重试和分批处理）
  async getPageContent(pageId, properties) {
    const allBlocks = [];
    let hasMore = true;
    let nextCursor = undefined;
    while (hasMore) {
      const response = await this.withRetry(async () => {
        const params = {
          // todo  pageId
          block_id: properties.slug || pageId,
          page_size: 50, // 减少单次请求的块数量
        };

        if (nextCursor) {
          params.start_cursor = nextCursor;
        }

        return await this.notion.blocks.children.list(params);
      }, `获取页面内容 ${pageId.substring(0, 8)}`);
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
      console.log("🏥 进行 Notion API 健康检查...");

      const response = await this.withRetry(async () => {
        return await this.notion.databases.retrieve({
          database_id: this.databaseId,
        });
      }, "API 健康检查");

      console.log("✅ Notion API 连接正常");
      console.log(
        `📊 数据库: ${response.title?.[0]?.plain_text || "Unnamed Database"}`
      );

      return true;
    } catch (error) {
      console.error("❌ Notion API 健康检查失败:", error.message);
      return false;
    }
  }

  // 网络诊断
  async networkDiagnostic() {
    console.log("🔧 开始网络诊断...");

    // 检查基本网络连接
    try {
      const dns = require("dns").promises;
      await dns.lookup("api.notion.com");
      console.log("✅ DNS 解析正常");
    } catch (error) {
      console.error("❌ DNS 解析失败:", error.message);
    }

    // 检查 HTTPS 连接
    try {
      const net = require("net");
      const socket = net.createConnection({
        host: "api.notion.com",
        port: 443,
      });

      await new Promise((resolve, reject) => {
        socket.on("connect", () => {
          console.log("✅ TCP 连接正常");
          socket.destroy();
          resolve();
        });

        socket.on("error", reject);
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error("连接超时"));
        });
      });
    } catch (error) {
      console.error("❌ TCP 连接失败:", error.message);
    }

    // 测试基本 HTTP 请求
    try {
      const https = require("https");
      const options = {
        hostname: "api.notion.com",
        port: 443,
        path: "/v1/databases/" + this.databaseId,
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
        },
        timeout: 10000,
      };

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          console.log(`✅ HTTP 状态码: ${res.statusCode}`);
          res.on("data", () => {}); // 消费响应数据
          res.on("end", resolve);
        });

        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("请求超时"));
        });

        req.end();
      });
    } catch (error) {
      console.error("❌ HTTP 请求失败:", error.message);
    }
  }

  // 解析页面属性（保持不变）
  parsePageProperties(page) {
    const properties = page.properties;
    return {
      id: page.id,
      title: properties.title?.title?.[0]?.plain_text || "Untitled",
      slug: properties.slug?.rich_text?.[0]?.plain_text || "",
      category: (properties.category?.rich_text?.[0]?.plain_text || "").split(
        "/"
      ),
      tags: properties.tags?.multi_select?.map((tag) => tag.name) || [],
      status: properties.status?.select?.name || "draft",
      created_time: properties.created_time?.created_time,
      indexDate: properties.date?.date?.start || new Date(),
      last_edited_time: properties.last_edited_time?.last_edited_time,
      url: page.url,
    };
  }

  // 转换 blocks 为 Markdown（增加错误处理）
  async blocksToMarkdown(blocks, pageId) {
    let markdown = "";

    for (const block of blocks) {
      console.log(block.type);
      try {
        switch (block.type) {
          case "paragraph":
            const text = this.richTextToMarkdown(block.paragraph.rich_text);
            markdown += text + "\n\n";
            break;

          case "heading_1":
            const h1Text = this.richTextToMarkdown(block.heading_1.rich_text);
            markdown += `# ${h1Text}\n\n`;
            break;

          case "heading_2":
            const h2Text = this.richTextToMarkdown(block.heading_2.rich_text);
            markdown += `## ${h2Text}\n\n`;
            break;

          case "heading_3":
            const h3Text = this.richTextToMarkdown(block.heading_3.rich_text);
            markdown += `### ${h3Text}\n\n`;
            break;

          case "bulleted_list_item":
            const bulletText = this.richTextToMarkdown(
              block.bulleted_list_item.rich_text
            );
            markdown += `- ${bulletText}\n`;

            // 处理嵌套子项
            if (block.has_children) {
              try {
                const children = await this.getPageContent(block.id, {});
                const childMarkdown = await this.blocksToMarkdown(
                  children,
                  pageId
                );
                // 为子项添加缩进
                const indentedChild = childMarkdown
                  .split("\n")
                  .map((line) => (line.trim() ? `  ${line}` : line))
                  .join("\n");
                markdown += indentedChild;
              } catch (childError) {
                console.warn(
                  `列表子项处理失败 ${block.id}:`,
                  childError.message
                );
              }
            }
            break;

          case "numbered_list_item":
            const numberedText = this.richTextToMarkdown(
              block.numbered_list_item.rich_text
            );
            markdown += `1. ${numberedText}\n`;

            // 处理嵌套子项
            if (block.has_children) {
              try {
                const children = await this.getPageContent(block.id, {});
                const childMarkdown = await this.blocksToMarkdown(
                  children,
                  pageId
                );
                // 为子项添加缩进
                const indentedChild = childMarkdown
                  .split("\n")
                  .map((line) => (line.trim() ? `   ${line}` : line))
                  .join("\n");
                markdown += indentedChild;
              } catch (childError) {
                console.warn(
                  `列表子项处理失败 ${block.id}:`,
                  childError.message
                );
              }
            }
            break;

          case "code":
            const codeText = this.richTextToMarkdown(block.code.rich_text);
            const language = block.code.language || "";
            markdown += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
            break;

          case "quote":
            const quoteText = this.richTextToMarkdown(block.quote.rich_text);
            markdown += `> ${quoteText}\n\n`;
            break;

          case "divider":
            markdown += "---\n\n";
            break;
          case "link_preview":
            const preview = block.link_preview;
            const url = preview.url;

            // 提取域名作为默认标题
            let title = url;
            try {
              const urlObj = new URL(url);
              title = urlObj.hostname;
            } catch (e) {
              title = url;
            }

            // 使用 Notion 提供的元数据（如果有）
            const linkTitle = preview.title || title;
            const linkDescription = preview.description || "";

            // 生成 Markdown
            markdown += `### 🔗 [${linkTitle}](${url})\n\n`;

            if (linkDescription) {
              markdown += `${linkDescription}\n\n`;
            }

            markdown += `**链接**: ${url}\n\n`;
            break;
          case "mention":
            // 处理不同类型的富文本
            const mention = block.mention;
            debugger;
            switch (mention.type) {
              case "user":
                // 用户提及
                const userName = mention.user.name || mention.user.id;
                text = `@${userName}`;
                break;

              case "page":
                // 页面提及
                const pageId = mention.page.id;
                // 如果有页面标题，使用标题，否则使用 ID
                text = `[Page](https://notion.so/${pageId.replace(/-/g, "")})`;
                break;

              case "database":
                // 数据库提及
                const databaseId = mention.database.id;
                text = `[Database](https://notion.so/${databaseId.replace(
                  /-/g,
                  ""
                )})`;
                break;

              case "date":
                // 日期提及
                const dateObj = mention.date;
                if (dateObj.end) {
                  text = `[${dateObj.start} → ${dateObj.end}]`;
                } else {
                  text = `[${dateObj.start}]`;
                }
                break;

              case "link_preview":
                // 链接预览
                text = `[${mention.link_preview.url}](${mention.link_preview.url})`;
                break;

              case "template_mention":
                // 模板提及（如 @today, @now 等）
                const templateType = mention.template_mention.type;
                switch (templateType) {
                  case "template_mention_date":
                    text =
                      mention.template_mention.template_mention_date ||
                      "@today";
                    break;
                  case "template_mention_user":
                    text =
                      mention.template_mention.template_mention_user || "@me";
                    break;
                  default:
                    text = richText.plain_text;
                }
                break;

              default:
                text = richText.plain_text;
            }
            break;

          case "image":
            try {
              const imageUrl =
                block.image.file?.url || block.image.external?.url;
              const caption = block.image.caption
                ? this.richTextToMarkdown(block.image.caption)
                : "";

              // 使用图片上传器处理图片
              console.log(`🖼️  处理图片: ${caption || "无标题"}`);
              const processedImageUrl = await this.imageUploader.processImage(
                imageUrl,
                caption,
                pageId
              );

              markdown += `![${caption}](${processedImageUrl})\n\n`;
            } catch (imgError) {
              console.warn("图片处理失败:", imgError.message);
              markdown += "<!-- 图片加载失败 -->\n\n";
            }
            break;

          case "callout":
            try {
              const icon = block.callout.icon?.emoji || "💡";
              let iconText = "";
              const calloutText = this.richTextToMarkdown(
                block.callout.rich_text
              );
              const color = block.callout.color || "default";

              if (icon) {
                if (icon.type === "emoji") {
                  iconText = icon.emoji + " ";
                } else {
                  // 默认图标
                  iconText = "💡 ";
                }
              }
              if (!iconText && colorMap[color]) {
                iconText = colorMap[color] + " ";
              }

              // 使用引用格式来表示 callout
              markdown += `> ${iconText} **注意**\n> \n> ${calloutText}\n\n`;

              // 处理 callout 的子内容
              if (block.has_children) {
                try {
                  const children = await this.getPageContent(block.id, {});
                  const childMarkdown = await this.blocksToMarkdown(
                    children,
                    pageId
                  );
                  // 为子内容添加引用格式
                  const quotedChild = childMarkdown
                    .split("\n")
                    .map((line) => (line.trim() ? `> ${line}` : ">"))
                    .join("\n");
                  markdown += quotedChild + "\n\n";
                } catch (childError) {
                  console.warn(
                    `Callout 子内容处理失败 ${block.id}:`,
                    childError.message
                  );
                }
              }
            } catch (calloutError) {
              console.warn("Callout 处理失败:", calloutError.message);
              markdown += "<!-- Callout 处理失败 -->\n\n";
            }
            break;

          case "embed":
            try {
              const embedUrl = block.embed.url;
              const caption = block.embed.caption
                ? this.richTextToMarkdown(block.embed.caption)
                : "";

              // 根据不同的嵌入类型处理
              if (
                embedUrl.includes("youtube.com") ||
                embedUrl.includes("youtu.be")
              ) {
                // YouTube 视频
                markdown += `📺 **视频**: [${
                  caption || "YouTube 视频"
                }](${embedUrl})\n\n`;
              } else if (embedUrl.includes("codepen.io")) {
                // CodePen
                markdown += `💻 **CodePen**: [${
                  caption || "CodePen 演示"
                }](${embedUrl})\n\n`;
              } else {
                // 其他嵌入内容
                markdown += `🔗 **嵌入内容**: [${
                  caption || "查看内容"
                }](${embedUrl})\n\n`;
              }
            } catch (embedError) {
              console.warn("Embed 处理失败:", embedError.message);
              markdown += "<!-- Embed 处理失败 -->\n\n";
            }
            break;

          case "bookmark":
            try {
              const bookmarkUrl = block.bookmark.url;
              const caption = block.bookmark.caption
                ? this.richTextToMarkdown(block.bookmark.caption)
                : "";

              markdown += `🔖 **书签**: [${
                caption || bookmarkUrl
              }](${bookmarkUrl})\n\n`;
            } catch (bookmarkError) {
              console.warn("Bookmark 处理失败:", bookmarkError.message);
              markdown += "<!-- Bookmark 处理失败 -->\n\n";
            }
            break;
          case "table":
            try {
              // 获取表格的子行
              if (block.has_children) {
                const children = await this.getPageContent(block.id, {});
                const tableRows = [];

                for (const child of children) {
                  if (child.type === "table_row") {
                    const cells = child.table_row.cells.map((cell) =>
                      this.richTextToMarkdown(cell).replace(/\|/g, "\\|")
                    );
                    tableRows.push(cells);
                  }
                }

                if (tableRows.length > 0) {
                  // 生成表格头部
                  const headerRow = tableRows[0];
                  markdown += `| ${headerRow.join(" | ")} |\n`;
                  markdown += `| ${headerRow.map(() => "---").join(" | ")} |\n`;

                  // 生成表格数据行
                  for (let i = 1; i < tableRows.length; i++) {
                    const row = tableRows[i];
                    // 确保每行的列数与头部一致
                    while (row.length < headerRow.length) {
                      row.push("");
                    }
                    markdown += `| ${row.join(" | ")} |\n`;
                  }
                  markdown += "\n";
                }
              }
            } catch (tableError) {
              console.warn("Table 处理失败:", tableError.message);
              markdown += "<!-- 表格处理失败 -->\n\n";
            }
            break;

          // 处理有子块的情况
          default:
            if (block.has_children) {
              try {
                const children = await this.getPageContent(block.id, {});
                const childMarkdown = await this.blocksToMarkdown(
                  children,
                  pageId
                );
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
      return "";
    }

    return richTextArray
      .map((text) => {
        let markdown = text.plain_text || "";

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
      })
      .join("");
  }
}

module.exports = RobustNotionClient;
