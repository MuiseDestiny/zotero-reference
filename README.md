# Zotero Reference
> 为Zotero扩展`参考文献`侧边栏，让`关联文献`不再孤单

侧边栏快速检索，点击参考文献右侧`+`可将其与正在阅读文献双向关联，`-`号与`关联文献`里的`-`号效果一致，会将关联移除。

![image](https://user-images.githubusercontent.com/51939531/207201084-f23bab21-3c9a-49d6-98dd-0f3ba694fedb.png)

![image](https://user-images.githubusercontent.com/51939531/207201099-c0c34b05-7e0c-42b8-941d-48fcb697d6c9.png)

![image](https://user-images.githubusercontent.com/51939531/207207254-30127076-efa1-44e5-8898-dcf4e0ecc672.png)

![image](https://user-images.githubusercontent.com/51939531/207079897-740896a7-5ebe-4aba-b857-5e94d715ba91.png)


## 实现方法
> 本插件基于`crossref`和`unpaywall`的API，以及`PDF`内可点击的`包含DOI的a标签`，因此也仅支持包含DOI的文献

### 1. DOI
`crossref`返会数据往往不全，当PDF加载完毕，插件会搜索PDF内`包含DOI的a标签`，并以一种匹配方法将`crossref`丢失的DOI信息补全。
### 2. 作者，年份和标题
这些信息`crossref`返回数据会包含，插件优先使用它提供的信息。但是，当这些信息不全时，会利用`unpaywall`（输入DOI）二次获取这些信息，所以部分情况下，需要一定的加载时间（一般<10s）。
### 3. 数据储存
从Zotero打开到关闭期间内所有api返回结果都会以`DOI`作为key储存，所以二次加载会`飞快`。但不长期储存，随着Zotero的关闭，这些数据也将消亡。
### 4. 关于知网文献
插件不具备获取`无DOI`文献的参考文献的能力，但若知网文献`包含DOI`插件可以获取它的参考文献列表，若其中包含`无DOI`的参考文献，插件支持添加关联和移除关联（根据标题保证其唯一性）。这一功能借助`茉莉花`插件，所以请确保`茉莉花`插件可正常使用。

![image](https://user-images.githubusercontent.com/51939531/207233841-230e323f-d3d6-40b1-997f-271d7806d173.png)
![image](https://user-images.githubusercontent.com/51939531/207233859-ea82a266-5253-45c1-9e52-9cb4b5f86ce9.png)
![image](https://user-images.githubusercontent.com/51939531/207233912-46f13bc4-bc3d-41e7-80d5-482d88ef4bb7.png)

## TODO
- [ ] 根据反馈，是否需要在主界面（非阅读状态）添加`参考文献`到侧边栏，目前仅阅读状态下添加
- [ ] 是否需要全部导入，或多选导入功能
- [ ] 是否需要中文支持，如果需要请提供网站或参考文献获取方案
- [ ] 是否需要针对特定期刊改变参考文献获取策略
- [ ] 根据条目类型改变参考文献条目图标

## 说明

1. 本插件的自动关联功能与`scihub`插件不兼容

![未命名文件-导出 (1)](https://user-images.githubusercontent.com/51939531/207202729-8ddf88db-287d-46b1-a124-fa69385c0e0e.png)


## 致谢

本插件基于模板：

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

本插件部分功能基于插件:

- [茉莉花/jasminum](https://github.com/l0o0/jasminum)

代码参考：

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
