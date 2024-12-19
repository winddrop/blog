import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "空腹虫",
  lang: 'zh-CN',  // 设置中文简体
  base: "/",
  description: "----",
  // 在head里添加其他的元素，例如link,script等。下面例子为：添加 favicon 图标
  head: [['link', { rel: 'icon', href: '/674孟.svg' }]],
  // 当设置为true时，VitePress 将从 URL 中删除尾随的.html（启用此功能可能需要在您的托管平台上进行额外配置。为了让它工作，您的服务器必须能够在访问/foo时提供/foo.html而无需重定向。）
  cleanUrls: true,
  srcDir: './markdown',
  // 构建时，不构建哪些md文件
  srcExclude: ['**/README.md'],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏左侧的标题之前的logo。接受路径字符串或对象来为亮/暗模式设置不同的logo。
    logo: '/home-icon.png',
    // 导航栏左侧的标题（默认引用 config.title 值的站点标题）
    siteTitle: 'meng ui',
    outlineTitle: '当前页',
    search: {
      provider: 'local' // 本地搜索
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/vue/1', activeMatch: '/vue/'},
      { text: 'API', items: [
          { text: 'Chinese', link: '/language/chinese' }
        ] },
    ],
// 侧边栏配置
    sidebar: {
      '/vue/': [  // 针对指南部分
        {
          text: '开始使用',
          collapsed: true,
          items: [
            { text: '安装指南', link: '/vue/1' },
            { text: '快速入门', link: '/vue/2',
              items: [
                { text: '安装22', link: '/vue/1' },
                { text: '快速33', link: '/vue/2' }
              ]
            }
          ]
        },
        {
          text: '高级特性',
          collapsed: true,
          items: [
            { text: '插件', link: '/guide/plugins' },
            { text: '配置', link: '/guide/configuration' }
          ]
        }
      ],
    },
    // sidebar: [
    //   {
    //     text: 'Examples',
    //     collapsible: true, // 此项设置侧边栏折叠
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   },
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   },
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   }
    // ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],
    footer: {
      // 版权前显示的信息 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      message: 'Released under the MIT License.',
      // 实际的版权文本 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      copyright: 'Copyright © 2024-present Liu'
    },
  }
})
