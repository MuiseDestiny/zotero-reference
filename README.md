# Zotero Reference

[![Latest release](https://img.shields.io/github/v/release/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/releases)
![Release Date](https://img.shields.io/github/release-date/MuiseDestiny/zotero-reference?color=9cf)
[![License](https://img.shields.io/github/license/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/blob/master/LICENSE)
![Downloads latest release](https://img.shields.io/github/downloads/MuiseDestiny/zotero-reference/latest/total?color=yellow)

> 一个插件的自述

🎉 我，一个插件，开发者叫我zotero reference，每当你打开PDF，我会帮你看它的最后几页，并整理出一条条的参考文献放在侧边栏，供你查阅。

🐇 虽然我的理解力有限，有时候会很慢🐌，但请你相信我，我总会，毫无保留地，告诉你我所知道的，关于参考文献的一切。

👻 是的，我有一个小伙伴，叫`茉莉花`，她是一个女孩子。还有两个小帮手，一个叫`crossref`，另一个叫`cnki`，一旦我理解不了便会向它们位求助，当然，毕竟是求助，结果可能并不理想。另外，如果你知道其它帮手，欢迎加入我们。

👋 如果你发现了我的知识盲点，你认为这是我这个年纪应该可以参悟的，你可以把它提交到我的[米奇不妙屋](https://github.com/MuiseDestiny/zotero-reference/issues/6)，有了你和开发者的调教，相信我会无限进步！

--- 

🎈 首次打开本地PDF解析参考文献，失败或点击`刷新`按钮会使用API解析。

绿色分区，蓝色被引用量
![image](https://user-images.githubusercontent.com/51939531/208426046-4bd3276c-2e85-43f0-9c67-2a08ed872f91.png)

![image](https://user-images.githubusercontent.com/51939531/208114512-2b58ebcb-ca34-4187-93b2-d7f96b0ea4c2.png)

## 👋 使用
![image](https://user-images.githubusercontent.com/51939531/208303590-dfe6f3cf-cd48-4afe-90a0-9cce6ff5f9cb.png)

单击蓝色区域 -> 复制此条参考文献信息；

ctrl+单击蓝色区域 -> 用默认浏览器打开文献地址；

单击`+` -> 添加参考文献至`正在阅读文献`所在文件夹下并与之双向关联；

ctrl+单击`+` -> 添加参考文献至`当前所在文件夹`下并与之双向关联；

![image](https://user-images.githubusercontent.com/51939531/208303399-0dc09046-997c-4809-8639-9100001e6002.png)

如，这里的GEE就是当前所在文件夹，可以在主界面点击要添加到的文件夹，然后回到阅读文献ctrl+单击`+`即可。

单击红框，复制内容，可用于进一步翻译等操作。
![image](https://user-images.githubusercontent.com/51939531/208624530-d519d3c2-408b-48ec-a579-79bbeb61eeee.png)


## 🌸 实现

[视频介绍](https://www.bilibili.com/video/BV17v4y1Q7gn/?spm_id_from=333.999.0.0&vd_source=5a8c42dfa6d28820002ecae5a4a4fa64)

## 🕊️ TODO
- [ ] 根据反馈，是否需要在主界面（非阅读状态）添加`参考文献`到侧边栏，目前仅阅读状态下添加
- [ ] 是否需要全部导入，或多选导入功能
- [x] 是否需要中文支持，如果需要请提供网站或参考文献获取方案（已支持知网）
- [ ] 是否需要针对特定期刊改变参考文献获取策略
- [ ] 根据条目类型改变参考文献条目图标

## 👋 说明

1. 本插件的自动关联功能与`scihub`插件不兼容

![未命名文件-导出 (3)](https://user-images.githubusercontent.com/51939531/208129588-e26ff970-7412-4c3f-9c1c-405514b10509.png)

## 🍭 致谢

本插件基于模板：

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

本插件部分功能基于插件:

- [茉莉花/jasminum](https://github.com/l0o0/jasminum)

代码参考：

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
- [chartero](https://github.com/volatile-static/Chartero)

API：
- [unpaywall](https://api.unpaywall.org/)
- [crossref](https://github.com/CrossRef/rest-api-doc)
