# Zotero Reference


[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-round&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![Latest release](https://img.shields.io/github/v/release/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/releases)
![Release Date](https://img.shields.io/github/release-date/MuiseDestiny/zotero-reference?color=9cf)
[![License](https://img.shields.io/github/license/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/blob/master/LICENSE)
![Downloads latest release](https://img.shields.io/github/downloads/MuiseDestiny/zotero-reference/latest/total?color=yellow)


![Reference](addon/chrome/content/icons/favicon.png)

🎉 我，一个Zotero插件，大名叫`ZOTERO-REFERENCE`，小名叫`zotero-reference`，每当你打开PDF，我会帮你看它的最后几页，并整理出一条条的参考文献放在侧边栏，供你查阅。

🐇 虽然我的理解力有限，有时候会很慢🐌，但请你相信我，我总会，毫无保留地，告诉你我所知道的，关于参考文献的一切。

👻 是的，我有两个小伙伴，一个叫`茉莉花/jasminum`，一个叫`zotero-pdf-translate`。还有两个小帮手，一个叫`crossref`，另一个叫`cnki`，一旦我理解不了便会向它们位求助，当然，毕竟是求助，结果可能并不理想。另外，如果你知道其它帮手，欢迎加入我们。

👋 如果你发现了我的知识盲点，你认为这是我这个年纪应该可以参悟的，你可以把它提交到我的[米奇不妙屋](https://github.com/MuiseDestiny/zotero-reference/issues/6)，有了大家的奇思妙想，相信我会无限进步！

--- 

🎈 首次使用建议打开首选项，进行个性化配置，**插件不生产数据，只是数据的搬运工**

> 浮窗顶部小圆点代表不同的数据源，点击切换源

![image](https://user-images.githubusercontent.com/51939531/217991811-44d2e6f3-4f55-4517-9d18-0d0cf19e914e.png)

![image](https://user-images.githubusercontent.com/51939531/217991894-b81f66f8-749c-478c-9012-62943145c1c7.png)

![image](https://user-images.githubusercontent.com/51939531/217991933-2aa121ac-a98e-4dff-875f-d7d543283b05.png)


## 👋 使用

![image](https://user-images.githubusercontent.com/51939531/208303590-dfe6f3cf-cd48-4afe-90a0-9cce6ff5f9cb.png)

|操作|触发|说明|
|--|--|--|
|单击蓝色区域|复制参考文献信息|连同标识符一起复制，如DOI|
|ctrl+单击蓝色区域|用系统浏览器打开文献URL|偶尔会查询文献地址消耗一定的时间|
|单击`+`|添加参考文献到正在阅读文献所在的所有文件夹下，并双向关联||
|ctrl+单击`+`|添加到`Zotero主面板`选择的文件夹下，并双向关联|如下图的GEE|
|单击`-`|取消双向关联|但是不会删除该文献，它仍在`我的文库`中|

![image](https://user-images.githubusercontent.com/51939531/208303399-0dc09046-997c-4809-8639-9100001e6002.png)


**浮窗**

支持下列源
* PDF（默认）
* readpaper（标题搜索）
* crossref（标题，DOI搜素）
* semanticscholar（DOI搜素）

![image](https://user-images.githubusercontent.com/51939531/217994089-100d5d20-8a6b-42ec-ad9b-5550cf354366.png)

**浮窗内文字可选择复制**

![image](https://user-images.githubusercontent.com/51939531/217994406-64e96f4e-68bf-49bf-bda3-f6fe4a003df9.png)

**放大/缩小**

> ctrl+鼠标滚轮

![image](https://user-images.githubusercontent.com/51939531/217994453-686cc320-d2bf-49dc-be73-6b95cd5cdbfb.png)

**翻译**
> 需要安装[zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)插件
> ctrl+鼠标左键在原文/译文之间自由切换

![image](https://user-images.githubusercontent.com/51939531/217994498-87ce1191-407f-45e1-bf97-ddd178375d07.png)

**分栏快速跳转**
> 主阅读界面若有跳转链接如`Fig 4`，点击后会在分割界面（横向/竖向）跳转，主阅读界面无跳转，避免点击前进后退。可满足看图，公式，表格的需求。但只针对有跳转链接的PDF。

![image](https://user-images.githubusercontent.com/51939531/209768934-c959f54c-09d2-47e9-871c-defe42074afe.png)

**在PDF空白处右键取消勾选`XX分割`即可取消分栏**

![image](https://user-images.githubusercontent.com/51939531/215972501-3090e93f-e09c-47ff-817c-874419154429.png)

**推荐关联**
> 来自`readcube API`

![图片1](https://user-images.githubusercontent.com/51939531/209890021-14b421a6-f5d8-476f-801f-294a8104f95f.png)

**设置界面**

- `自动抓取参考文献` - 是否在文献被打开时自动抓取参考文献
- `下述条目类型...` - 排除一些类型的文献，一般它们页数过多，若自动刷新往往会带来影响
- `优先从...` - 第一次点击刷新从PDF/URL解析
- `ctrl点击...` - 勾选后悬浮的摘要标题可通过按住ctrl+点击以翻译（基于zotero-pdf-translate插件，需要提前安装）

**注意**：即便设置了不自动刷新，或者正在阅读的文献类型被你设置为不自动刷新，你仍然可以通过点击刷新来抓取参考文献。
条目类型的输入为英文，且`,`隔开，现将所有字段列出，通过翻译可找到对应中文：
<details>
<summary>所有类型中英对照</summary>
  
  ```
  note=笔记
  annotation=注释
  attachment=附件
  book=图书
  bookSection=图书章节
  journalArticle=期刊文章
  magazineArticle=杂志文章
  newspaperArticle=报纸文章
  thesis=学位论文
  letter=信件
  manuscript=手稿
  interview=采访稿
  film=电影
  artwork=艺术品
  webpage=网页
  report=报告
  bill=法案
  case=司法案例
  hearing=听证会
  patent=专利
  statute=法律
  email=E-mail
  map=地图
  blogPost=博客帖子
  instantMessage=即时讯息
  forumPost=论坛帖子
  audioRecording=音频
  presentation=演示文档
  videoRecording=视频
  tvBroadcast=电视广播
  radioBroadcast=电台广播
  podcast=播客
  computerProgram=软件
  conferencePaper=会议论文
  document=文档
  encyclopediaArticle=百科全书文章
  dictionaryEntry=词条
  preprint=预印本
  ```
  
</details>

## 🕊️ TODO
- [ ] 根据反馈，是否需要在主界面（非阅读状态）添加`参考文献`到侧边栏，目前仅阅读状态下添加
- [ ] 是否需要全部导入，或多选导入功能
- [x] 是否需要中文支持，如果需要请提供网站或参考文献获取方案（已支持知网）
- [ ] 是否需要针对特定期刊改变参考文献获取策略
- [ ] 根据条目类型改变参考文献条目图标

## 👋 说明

1. 本插件的自动关联功能与`scihub`插件不兼容

## 🍭 致谢

本插件基于模板：

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

本插件部分功能基于插件:

- [茉莉花/jasminum](https://github.com/l0o0/jasminum)
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)

代码参考：

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
- [chartero](https://github.com/volatile-static/Chartero)

API：
- [unpaywall](https://api.unpaywall.org/)
- [crossref](https://github.com/CrossRef/rest-api-doc)
- [readpaper](https://readpaper.com/)
- [readcube](https://www.readcube.com/)
