import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "WD-笔记",
  lang: 'zh-CN',  // 设置中文简体
  base: "/",
  description: "学习笔记",
  // 在head里添加其他的元素，例如link,script等。下面例子为：添加 favicon 图标
  head: [['link', { rel: 'icon', href: '/flag.svg' }]],
  // 当设置为true时，VitePress 将从 URL 中删除尾随的.html（启用此功能可能需要在您的托管平台上进行额外配置。为了让它工作，您的服务器必须能够在访问/foo时提供/foo.html而无需重定向。）
  cleanUrls: true,
  srcDir: './markdown',
  // 构建时，不构建哪些md文件
  srcExclude: ['**/README.md'],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏左侧的标题之前的logo。接受路径字符串或对象来为亮/暗模式设置不同的logo。
    logo: '/flag.svg',
    // 导航栏左侧的标题（默认引用 config.title 值的站点标题）
    siteTitle: 'windDrop',
    search: {
      provider: 'local' // 本地搜索
    },
    docFooter: {
      prev: false,
      next: false
    },
    nav: [
      { text: '首页', link: '/' },
      { text: 'vue', link: '/vue/1', activeMatch: '/vue/'},
      { text: 'react', items: [
          { text: 'react小册', link: '/react/reactBook/常用Hook', activeMatch: '/react/reactBook/' }
        ]  },
      { text: 'API', items: [
          { text: 'Chinese', link: '/language/chinese' }
        ] },
    ],
// 侧边栏配置
    sidebar: {
      '/react/reactBook/': [  // 针对指南部分
        {
          text: 'reactBook',
          collapsed: false,
          items: [
            { text: '常用Hook', link: '/react/reactBook/常用Hook', },
            { text: 'immer', link: '/react/reactBook/immer/immer' },
            { text: '小工具',
              items: [
                { text: 'immer', link: '/react/reactBook/immer/immer' },
                { text: '快速', link: '/api-examples' }
              ]
            }
          ]
        },
        {
          text: '高级特性',
          collapsed: false,
          items: [
            { text: '插件', link: '/guide/plugins' },
            { text: '配置', link: '/guide/configuration' }
          ]
        }
      ],
      '/react/': [  // 针对指南部分
        {
          text: 'react笔记',
          collapsed: true,
          items: [
            { text: '安装指南', link: '/react/reactBook/1' },
            { text: '小工具', link: '/vue/2',
              items: [
                { text: 'immer', link: '/react/reactBook/immer' },
                { text: '快速', link: '/vue/2' }
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
    aside:true,
    outline:{
      level:'deep',
      label:'当前页导航'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }

    ],
    footer: {
      // 版权前显示的信息 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      message: 'Released under the MIT License.',
      // 实际的版权文本 （支持 HTML 字符串。注意：只能内联元素，因为该内容渲染在p元素内）
      copyright: 'Copyright © 2025-present Junguang'
    },
  }
})
