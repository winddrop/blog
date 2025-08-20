import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "winddrop's blog",
  lang: 'zh-CN',  // 设置中文简体
  base: "/",
  search: {
      provider: 'local' // 本地搜索
    },
    // 在head里添加其他的元素，例如link,script等。下面例子为：添加 favicon 图标
  head: [['link', { rel: 'icon', href: '/crocodile.png' }]],
  // 当设置为true时，VitePress 将从 URL 中删除尾随的.html（启用此功能可能需要在您的托管平台上进行额外配置。为了让它工作，您的服务器必须能够在访问/foo时提供/foo.html而无需重定向。）
  cleanUrls: true,
  // 构建时，不构建哪些md文件
  srcExclude: ['**/README.md'],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏左侧的标题之前的logo。接受路径字符串或对象来为亮/暗模式设置不同的logo。
    logo: '/crocodile.png',
    // 导航栏左侧的标题（默认引用 config.title 值的站点标题）
    siteTitle: 'windDrop',
    nav: [
  {
    "text": "首页",
    "link": "/"
  },
  {
    "text": "关于",
    "activeMatch": "/关于/",
    "items": [
      {
        "text": "图床搭建",
        "link": "/关于/图床搭建/图床搭建/",
        "activeMatch": "/关于/图床搭建/"
      },
      {
        "text": "博客",
        "link": "/关于/博客/博客/",
        "activeMatch": "/关于/博客/"
      }
    ]
  },
  {
    "text": "力扣",
    "activeMatch": "/力扣/",
    "items": [
      {
        "text": "测试",
        "link": "/力扣/测试/websoket/",
        "activeMatch": "/力扣/测试/"
      },
      {
        "text": "teset",
        "link": "/力扣/teset/单调栈/",
        "activeMatch": "/力扣/teset/"
      }
    ]
  },
  {
    "text": "算法",
    "activeMatch": "/算法/",
    "items": [
      {
        "text": "测试1",
        "link": "/算法/测试1/测试2/数据结构和算法/",
        "activeMatch": "/算法/测试1/测试2/"
      }
    ]
  }
],
    
    sidebar: {
  "/关于/": [
    {
      "text": "关于",
      "collapsed": false,
      "items": [
        {
          "text": "图床搭建",
          "items": [
            {
              "text": "图床搭建",
              "link": "/关于/图床搭建/图床搭建.md"
            }
          ]
        },
        {
          "text": "博客",
          "items": [
            {
              "text": "博客",
              "link": "/关于/博客/博客.md"
            }
          ]
        }
      ]
    }
  ],
  "/力扣/": [
    {
      "text": "力扣",
      "collapsed": false,
      "items": [
        {
          "text": "测试",
          "items": [
            {
              "text": "websoket",
              "link": "/力扣/测试/websoket.md"
            }
          ]
        },
        {
          "text": "teset",
          "items": [
            {
              "text": "单调栈",
              "link": "/力扣/teset/单调栈.md"
            }
          ]
        }
      ]
    }
  ],
  "/算法/": [
    {
      "text": "算法",
      "collapsed": false,
      "items": [
        {
          "text": "测试1",
          "items": [
            {
              "text": "测试2",
              "items": [
                {
                  "text": "数据结构和算法",
                  "link": "/算法/测试1/测试2/数据结构和算法.md"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
},
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
})