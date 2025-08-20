// 图床上传服务 - scripts/image-uploader.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const FormData = require("form-data");
const fetch = require("node-fetch");
require("dotenv").config();
class ImageUploader {
  constructor() {
    this.config = {
      uploadUrl: process.env.IMG_UPLOAD_URL,
      authCode: process.env.IMG_UPLOAD_AUTHCODE,
      uploadFolder: process.env.IMG_UPLOAD_FOLDER,
      baseUrl: process.env.IMG_BASEURL,
      IMG_DELETE_URL: process.env.IMG_DELETE_URL,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheDir: path.join(__dirname, "../.cache/images"),
    };

    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }
  // 删除图床文件夹
  async deleteFolder(pageId) {
    console.log(
      `📤 删除图床文件夹: ${process.env.IMG_UPLOAD_FOLDER}/${pageId}`
    );
    const formData = new FormData();
    try {
      const response = await fetch(
        `${this.config.IMG_DELETE_URL}${process.env.IMG_UPLOAD_FOLDER}/${pageId}?folder=true`,
        {
          method: "GET",
          timeout: this.config.timeout,
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.config.authCode}`,
          },
        }
      );
      // if (!response.success) {
      //   throw new Error(`删除图床文件夹失败: ${response.text()}`);
      // }
      const result = await response.text();
      console.log(`✅ 删除图床文件夹成功: ${result}`);
    } catch (error) {
      console.error(`❌ 删除图床文件夹失败:`, error.message);
    }
  }

  // 生成图片缓存键
  generateCacheKey(imageUrl) {
    return crypto.createHash("md5").update(imageUrl).digest("hex");
  }

  // 检查图片缓存
  getCachedImageUrl(imageUrl) {
    const cacheKey = this.generateCacheKey(imageUrl);
    const cacheFile = path.join(this.config.cacheDir, `${cacheKey}.json`);

    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));

        // 检查缓存是否过期（24小时）
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log(`📸 使用缓存图片: ${cached.uploadedUrl}`);
          return cached.uploadedUrl;
        }
      } catch (error) {
        console.warn("图片缓存读取失败:", error.message);
      }
    }

    return null;
  }

  // 缓存图片URL
  cacheImageUrl(originalUrl, uploadedUrl) {
    const cacheKey = this.generateCacheKey(originalUrl);
    const cacheFile = path.join(this.config.cacheDir, `${cacheKey}.json`);

    const cacheData = {
      originalUrl,
      uploadedUrl,
      timestamp: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), "utf-8");
    } catch (error) {
      console.warn("图片缓存写入失败:", error.message);
    }
  }

  // 从 URL 下载图片
  async downloadImage(imageUrl, timeout = 30000) {
    console.log(`📥 下载图片: ${imageUrl.substring(0, 80)}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://notion.so/",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        throw new Error(`不是有效的图片格式: ${contentType}`);
      }

      const buffer = await response.buffer();
      console.log(
        `✅ 图片下载完成，大小: ${(buffer.length / 1024).toFixed(2)} KB`
      );

      return {
        buffer,
        contentType,
        size: buffer.length,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error("图片下载超时");
      }

      throw new Error(`图片下载失败: ${error.message}`);
    }
  }

  // 获取文件扩展名
  getFileExtension(contentType, originalUrl) {
    // 从 Content-Type 推断扩展名
    const typeMap = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/bmp": ".bmp",
    };

    if (typeMap[contentType]) {
      return typeMap[contentType];
    }

    // 从 URL 推断扩展名
    const urlMatch = originalUrl.match(
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)(?:\?.*)?$/i
    );
    if (urlMatch) {
      return "." + urlMatch[1].toLowerCase();
    }

    // 默认使用 .jpg
    return ".jpg";
  }

  // 生成唯一文件名
  generateFileName(originalUrl, contentType, pageId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(contentType, originalUrl);

    return `notion_${timestamp}_${random}${extension}`;
  }

  // 上传图片到图床
  async uploadToImageBed(imageBuffer, fileName, pageId) {
    console.log(`📤 上传图片到图床: ${fileName}`);

    let lastError;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append("file", imageBuffer, fileName);
        console.log(`uploadToImageBed  ${this.config.uploadFolder}/${pageId}`);
        const response = await fetch(
          `${this.config.uploadUrl}?authCode=${this.config.authCode}&uploadFolder=${this.config.uploadFolder}/${pageId}`,
          {
            method: "POST",
            body: formData,
            timeout: this.config.timeout,
            headers: {
              ...formData.getHeaders(),
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `上传失败: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.text();

        // 检查响应格式
        let relativePath;
        try {
          const jsonResult = JSON.parse(result);

          // 处理不同的响应格式
          if (Array.isArray(jsonResult) && jsonResult.length > 0) {
            // 数组格式：[{"src": "..."}]
            relativePath =
              jsonResult[0].src ||
              jsonResult[0].url ||
              jsonResult[0].path ||
              jsonResult[0].data;
          } else {
            // 对象格式：{"url": "...", "path": "...", "data": "..."}
            relativePath =
              jsonResult.url ||
              jsonResult.path ||
              jsonResult.data ||
              jsonResult.src;
          }
        } catch {
          // 如果不是JSON，假设直接返回相对路径
          relativePath = result.trim();
        }

        if (!relativePath) {
          throw new Error(`图床返回的路径为空，原始响应: ${result}`);
        }

        // 确保路径以 / 开头
        if (!relativePath.startsWith("/")) {
          relativePath = "/" + relativePath;
        }

        const fullUrl = this.config.baseUrl + relativePath;
        console.log(`✅ 图片上传成功: ${fullUrl}`);

        return fullUrl;
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️  上传尝试 ${attempt}/${this.config.maxRetries} 失败:`,
          error.message
        );

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ ${delay}ms 后重试...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`图片上传最终失败: ${lastError.message}`);
  }

  // 处理图片：下载并上传到图床
  async processImage(notionImageUrl, caption = "", pageId) {
    try {
      // 检查缓存
      const cachedUrl = this.getCachedImageUrl(notionImageUrl);
      if (cachedUrl) {
        return cachedUrl;
      }

      console.log(`🖼️  处理图片: ${caption || "无标题"}`);

      // 下载图片
      const imageData = await this.downloadImage(notionImageUrl);

      // 生成文件名
      const fileName = this.generateFileName(
        notionImageUrl,
        imageData.contentType
      );

      // 上传到图床
      const uploadedUrl = await this.uploadToImageBed(
        imageData.buffer,
        fileName,
        pageId
      );

      // 缓存结果
      this.cacheImageUrl(notionImageUrl, uploadedUrl);

      return uploadedUrl;
    } catch (error) {
      console.error(`❌ 图片处理失败:`, error.message);

      // 返回原始 URL 作为后备
      console.warn(`⚠️  使用原始图片链接作为后备: ${notionImageUrl}`);
      return notionImageUrl;
    }
  }

  // todo 暂不可用 批量处理图片
  async processBatchImages(imageUrls) {
    console.log(`🖼️  批量处理 ${imageUrls.length} 张图片...`);

    const results = [];
    const batchSize = 3; // 限制并发数量

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);

      const batchPromises = batch.map(async (imageUrl, index) => {
        try {
          const result = await this.processImage(
            imageUrl,
            `批次图片 ${i + index + 1}`
          );
          return { original: imageUrl, uploaded: result, success: true };
        } catch (error) {
          console.error(`批次图片处理失败 ${imageUrl}:`, error.message);
          return {
            original: imageUrl,
            uploaded: imageUrl,
            success: false,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批次间延迟
      if (i + batchSize < imageUrls.length) {
        await this.sleep(1000);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `✅ 批量处理完成: ${successCount}/${results.length} 张图片成功`
    );

    return results;
  }

  // 清理过期缓存
  async cleanExpiredCache() {
    console.log("🧹 清理过期的图片缓存...");

    try {
      const files = fs.readdirSync(this.config.cacheDir);
      let cleanedCount = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(this.config.cacheDir, file);
        const stats = fs.statSync(filePath);

        // 删除超过7天的缓存
        const age = Date.now() - stats.mtime.getTime();
        if (age > 7 * 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      console.log(`✅ 清理完成，删除了 ${cleanedCount} 个过期缓存文件`);
    } catch (error) {
      console.warn("缓存清理失败:", error.message);
    }
  }

  // 获取缓存统计
  getCacheStats() {
    try {
      const files = fs.readdirSync(this.config.cacheDir);
      const cacheFiles = files.filter((f) => f.endsWith(".json"));

      let totalSize = 0;
      cacheFiles.forEach((file) => {
        const filePath = path.join(this.config.cacheDir, file);
        totalSize += fs.statSync(filePath).size;
      });

      return {
        count: cacheFiles.length,
        size: totalSize,
        sizeFormatted: this.formatBytes(totalSize),
      };
    } catch (error) {
      return { count: 0, size: 0, sizeFormatted: "0 B" };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ImageUploader;
