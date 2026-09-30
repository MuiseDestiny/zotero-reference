# Zotero Reference

![Reference](addon/chrome/content/icons/favicon.png)

[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-round&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![Latest release](https://img.shields.io/github/v/release/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/releases)
![Release Date](https://img.shields.io/github/release-date/MuiseDestiny/zotero-reference?color=9cf)
[![License](https://img.shields.io/github/license/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/blob/master/LICENSE)
![Downloads latest release](https://img.shields.io/github/downloads/MuiseDestiny/zotero-reference/latest/total?color=yellow)


English | [简体中文](README_zh.md)

Hi, [PDF parsing failure feedback](https://github.com/MuiseDestiny/zotero-reference/issues/6)

--- 

🎈 On first use, we recommend opening the preferences and configuring the plugin to your needs. **The plugin does not produce data, it only transports it.**

> The small dots at the top of the popup represent different data sources; click to switch sources.

![Standard view](https://user-images.githubusercontent.com/51939531/226575476-3234f112-877a-4b6e-a110-ecc3aee72d26.png)

![Stacked view](https://user-images.githubusercontent.com/51939531/227147529-bd6b97ee-4d5e-4239-adb9-591cdc3a88cb.png)


## 👋 Usage

### Refresh

> A small refresh button with a lot inside

![image](https://user-images.githubusercontent.com/51939531/221145006-56834b6e-e5c2-4bb4-a369-cfcf15a53349.png)

|Action|Effect|Notes|
|--|--|--|
| Click | Parse/fetch the references of the current PDF | The first click fetches from the preferred source set in the preferences; clicking refresh again switches to another source |
| Long press | If a local reference cache exists for the current PDF, it is read by default; a long press ignores it and re-parses | Applies to all sources |
| `Ctrl` + click/long press | Parse references backwards starting from the current page | Applies to the PDF source only, not to API sources. Recommended for master's/doctoral theses; scroll the PDF to the page containing the last reference beforehand |
| Double-click the `31 references` text shown above | Copy all current references to the clipboard | |

### References

![image](https://user-images.githubusercontent.com/51939531/208303590-dfe6f3cf-cd48-4afe-90a0-9cce6ff5f9cb.png)

![image](https://user-images.githubusercontent.com/51939531/221150190-934a1c03-99ff-421a-880b-8c1b4b185898.png)

![image](https://user-images.githubusercontent.com/51939531/208303399-0dc09046-997c-4809-8639-9100001e6002.png)

|Action|Effect|Notes|
|--|--|--|
|Click the blue area|Copy the reference information|Copied together with its identifier, e.g. the DOI|
|Long press the blue area| Edit the reference information | For Chinese references, editing is recommended to trim the entry and improve the import success rate |
|`Ctrl`+click the blue area|Open the reference URL in the system browser|Looking up the URL may occasionally take some time|
|Click `+`|Add the reference to all collections containing the item being read, and link them bidirectionally||
|`Ctrl`+click `+`|Add to the collection selected in the `Zotero main pane`, and link bidirectionally|e.g. GEE in the screenshot above|
|Click `-`|Remove the bidirectional link|The item is not deleted; it remains in `My Library`|




**Popup**

The following sources are supported:
* PDF (default)
* readpaper (title search)
* crossref (title and DOI search)
* semanticscholar (DOI search)
* arXiv (arXiv ID search)

![image](https://user-images.githubusercontent.com/51939531/217994089-100d5d20-8a6b-42ec-ad9b-5550cf354366.png)

**Text in the popup can be selected and copied**

![image](https://user-images.githubusercontent.com/51939531/217994406-64e96f4e-68bf-49bf-bda3-f6fe4a003df9.png)

**Zoom in/out**

> Ctrl + mouse wheel

![image](https://user-images.githubusercontent.com/51939531/217994453-686cc320-d2bf-49dc-be73-6b95cd5cdbfb.png)

**Translation**
> Requires the [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate) plugin
> 
> Ctrl + left click toggles between original text and translation

![image](https://user-images.githubusercontent.com/51939531/217994498-87ce1191-407f-45e1-bf97-ddd178375d07.png)

**Split-view quick jump**
> If the main reader view contains jump links such as `Fig 4`, clicking one jumps in the split view (horizontal/vertical) while the main view stays in place, so you don't need to navigate back and forth. Useful for viewing figures, equations and tables. Only works for PDFs that contain jump links.

![image](https://user-images.githubusercontent.com/51939531/209768934-c959f54c-09d2-47e9-871c-defe42074afe.png)

How to disable it? Uncheck the option shown below.

![image](https://user-images.githubusercontent.com/51939531/217995465-d5893305-c0d2-4c50-b4ca-42c50d2f077c.png)

**Recommended related items**
> From the `readcube API`

![Figure 1](https://user-images.githubusercontent.com/51939531/209890021-14b421a6-f5d8-476f-801f-294a8104f95f.png)

**Preferences**

- `Automatically fetch references` - whether to fetch references automatically when an item is opened
- `The following item types...` - exclude certain item types; these usually have many pages, and automatic refreshing would often be disruptive
- `Prefer...` - whether the first refresh click parses from PDF or URL
- `Ctrl-click...` - when checked, the title of the hovering abstract can be translated with Ctrl + click (based on the zotero-pdf-translate plugin, which must be installed beforehand)

**Note**: Even if automatic refresh is disabled, or the type of the item you are reading is excluded from automatic refresh, you can still fetch references by clicking refresh.
Item types are entered in English, separated by `,`. All available values are listed below:
<details>
<summary>All item types</summary>
  
  ```
  note=Note
  annotation=Annotation
  attachment=Attachment
  book=Book
  bookSection=Book Section
  journalArticle=Journal Article
  magazineArticle=Magazine Article
  newspaperArticle=Newspaper Article
  thesis=Thesis
  letter=Letter
  manuscript=Manuscript
  interview=Interview
  film=Film
  artwork=Artwork
  webpage=Web Page
  report=Report
  bill=Bill
  case=Case
  hearing=Hearing
  patent=Patent
  statute=Statute
  email=E-mail
  map=Map
  blogPost=Blog Post
  instantMessage=Instant Message
  forumPost=Forum Post
  audioRecording=Audio Recording
  presentation=Presentation
  videoRecording=Video Recording
  tvBroadcast=TV Broadcast
  radioBroadcast=Radio Broadcast
  podcast=Podcast
  computerProgram=Software
  conferencePaper=Conference Paper
  document=Document
  encyclopediaArticle=Encyclopedia Article
  dictionaryEntry=Dictionary Entry
  preprint=Preprint
  ```
  
</details>

## 🕊️ TODO
- [x] Based on feedback: add `References` to the sidebar in the main pane (not only while reading); previously only added in reader mode
- [x] Import all, or multi-select import
- [x] Chinese support; if needed, please suggest websites or approaches for fetching references (CNKI is supported)
- [ ] Adapt the reference-fetching strategy for specific journals
- [ ] Change the reference entry icon based on item type

## 👋 Notes

1. The automatic linking feature of this plugin is not compatible with the `scihub` plugin

## 🍭 Acknowledgements

This plugin is based on the template:

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

Some features of this plugin are based on the plugins:

- [茉莉花/jasminum](https://github.com/l0o0/jasminum)
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)

Code references:

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
- [chartero](https://github.com/volatile-static/Chartero)

APIs:
- [unpaywall](https://api.unpaywall.org/)
- [crossref](https://github.com/CrossRef/rest-api-doc)
- [readpaper](https://readpaper.com/)
- [readcube](https://www.readcube.com/)

## Sponsors

<img src="https://user-images.githubusercontent.com/51939531/227145474-ca165a93-fcf2-4b47-baf4-ea6b29f43d99.png" width="50%" height="50%">


Thanks to [@leichaoL](https://github.com/leichaoL), [@JOJOdioJosita](https://github.com/JOJOdioJosita), @小陈, [@YangChunyu1999](https://github.com/YangChunyu1999), [@遍一认着倒要少至你赌我](https://b23.tv/JjHR5ON) and several anonymous sponsors, and thanks also for the many heartwarming messages.
