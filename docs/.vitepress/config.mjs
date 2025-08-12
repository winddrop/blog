import { defineConfig } from 'vitepress'

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
  outline:{
      level:'deep',
      label:'导航'
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏左侧的标题之前的logo。接受路径字符串或对象来为亮/暗模式设置不同的logo。
    logo: '/flag.svg',
    // 导航栏左侧的标题（默认引用 config.title 值的站点标题）
    siteTitle: 'windDrop',
    nav: [
  {
    "text": "首页",
    "link": "/"
  },
  {
    "text": "likou",
    "items": [
      {
        "text": "licko1",
        "link": "/likou/",
        "activeMatch": "/likou/"
      }
    ]
  },
  {
    "text": "suanfa",
    "items": [
      {
        "text": "suan1",
        "link": "/suanfa/",
        "activeMatch": "/suanfa/"
      }
    ]
  }
],
    
    sidebar: {
  "/likou/": [
    {
      "text": "likou",
      "collapsed": false,
      "items": [
        {
          "text": "licko1",
          "items": [
            {
              "text": "websoket",
              "link": "/likou/licko1/websoket.md"
            }
          ]
        },
        {
          "text": "单调栈",
          "link": "/likou/单调栈.md"
        }
      ]
    }
  ],
  "/suanfa/": [
    {
      "text": "suanfa",
      "collapsed": false,
      "items": [
        {
          "text": "suan1",
          "items": [
            {
              "text": "suan2",
              "items": [
                {
                  "text": "数据结构和算法",
                  "link": "/suanfa/suan1/suan2/数据结构和算法.md"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
},
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/winddrop' }
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
})