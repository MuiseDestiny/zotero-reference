# Zotero Reference

[中文文档](README.md) | English Document

![logo](addon/chrome/content/icons/favicon.png)

[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-round&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![Latest release](https://img.shields.io/github/v/release/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/releases)
![Release Date](https://img.shields.io/github/release-date/MuiseDestiny/zotero-reference?color=9cf)
[![License](https://img.shields.io/github/license/MuiseDestiny/zotero-reference)](https://github.com/MuiseDestiny/zotero-reference/blob/master/LICENSE)
![Downloads latest release](https://img.shields.io/github/downloads/MuiseDestiny/zotero-reference/latest/total?color=yellow)

Hi, if the PDF fails to parse, give feedback
[here](https://github.com/MuiseDestiny/zotero-reference/issues/6). This PDF was
translated with Google Translate and then edited by a native English speaker.
There may be some awkward sentences.

---

🎈 For the first time use, it is recommended to open the preferences and
perform personalized configuration. **The plug-in does not produce data, it
only fetches data**

> The small dots at the top of the floating window represent different data
> sources, click to switch sources:

##### Standard view

![Standard view](https://user-images.githubusercontent.com/51939531/226575476-3234f112-877a-4b6e-a110-ecc3aee72d26.png)

##### Stacked view

![Stack View](https://user-images.githubusercontent.com/51939531/227147529-bd6b97ee-4d5e-4239-adb9-591cdc3a88cb.png)

## 👋 How to use

1. Open a paper in Zotero
2. Click `References` in the right panel (Circle 1)
3. Click `Refresh` (Circle 2)
4. Mouse over a referenc and a floating window will appear
5. Click on the dot (Circle 3) at the top of the floating window to switch sources
6. Click `+` in the right of reference to add it to your Zotero

### Refresh

> Small refresh, big impact (no English image available). After installation,
> Open a PDF and click the "refresh" button. Your references will be loaded.

![image](https://user-images.githubusercontent.com/51939531/221145006-56834b6e-e5c2-4bb4-a369-cfcf15a53349.png)

| Action                                                     | Trigger                                                                                                                         | Description                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click                                                      | Parse/Get the references of the current PDF                                                                                     | The first click will get from the priority source set in the preferences, and the second click to refresh will switch to another source                                                                       |
| Long press                                                 | If there is a reference cache of the current PDF locally, it will be read by default, and long press will not read and re-parse | All sources are applicable                                                                                                                                                                                    |
| `Ctrl` + click/long press                                  | Parse references forward from the current page                                                                                  | Applicable to PDF sources, not valid for API sources, it is recommended to use when parsing master and doctoral thesis, you need to scroll the PDF to the page where the last reference is located in advance |
| Double-click the text `31 References` in the picture above | Copy all current references to the clipboard                                                                                    |                                                                                                                                                                                                               |

### References

![image](https://user-images.githubusercontent.com/51939531/208303590-dfe6f3cf-cd48-4afe-90a0-9cce6ff5f9cb.png)

![image](https://user-images.githubusercontent.com/51939531/221150190-934a1c03-99ff-421a-880b-8c1b4b185898.png)

![image](https://user-images.githubusercontent.com/51939531/208303399-0dc09046-997c-4809-8639-9100001e6002.png)

| Action                     | Trigger                                                                                                          | Description                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Click on blue area         | Copy reference information                                                                                       | Copy along with identifier, such as DOI                                                                                         |
| Long press the blue area   | Edit reference information                                                                                       | It is recommended to use the editing function for Chinese references to simplify entries and improve the success rate of import |
| `Ctrl`+click the blue area | Open the document URL with the system browser                                                                    | Occasionally, it will take a certain amount of time to query the document address                                               |
| Click `+`                  | Add references to all the folders where the documents you are reading are located, and bidirectional association |                                                                                                                                 |
| `Ctrl`+click`+`            | Add to the folder selected by `Zotero Main Panel`, and bidirectional association                                 | GEE as shown above                                                                                                              |
| Click `-`                  | Cancel Bidirectional Association                                                                                 | But the document will not be deleted, it is still in `My Library`                                                               |

**floating window**

The following sources are supported

- PDF (default)
- readpaper (title search)
- CrossRef (title, DOI search)
- SemanticScholar (DOI search)
- arXiv (arXivID search)

![image](https://user-images.githubusercontent.com/51939531/217994089-100d5d20-8a6b-42ec-ad9b-5550cf354366.png)

**The text in the floating window can be copied**

![image](https://user-images.githubusercontent.com/51939531/217994406-64e96f4e-68bf-49bf-bda3-f6fe4a003df9.png)

**zoom in/zoom out**

> ctrl+mousewheel

![image](https://user-images.githubusercontent.com/51939531/217994453-686cc320-d2bf-49dc-be73-6b95cd5cdbfb.png)

**translate**

> Need to install [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate) plugin
>
> ctrl + left mouse button to freely switch between original text/translated text

![image](https://user-images.githubusercontent.com/51939531/217994498-87ce1191-407f-45e1-bf97-ddd178375d07.png)

**Column quick jump**

> If there is a jump link in the main reading interface such as `Fig 4`, it will jump in the split interface (horizontal/vertical) after clicking, and there is no jump in the main reading interface, so avoid clicking forward and backward. It can meet the needs of viewing pictures, formulas and tables. But only for PDFs with jump links.

![image](https://user-images.githubusercontent.com/51939531/209768934-c959f54c-09d2-47e9-871c-defe42074afe.png)

How to close? Uncheck the following picture

![image](https://user-images.githubusercontent.com/51939531/217995465-d5893305-c0d2-4c50-b4ca-42c50d2f077c.png)

**Recommended Association**

> from `readcube API`

![Image 1](https://user-images.githubusercontent.com/51939531/209890021-14b421a6-f5d8-476f-801f-294a8104f95f.png)

**Set interface**

- `Auto-fetch references` - Whether to automatically grab references when the document is opened
- `The following entry types...` - Exclude some types of documents, generally they have too many pages, and automatic refresh will often have an impact
- `Priority From...` - first click to refresh from PDF/URL parse
- `ctrl-click...` - The floating abstract title after checking can be translated by holding down ctrl+clicking (based on the zotero-pdf-translate plugin, which needs to be installed in advance)

**Note**: Even if it is set not to refresh automatically, or the type of document you are reading is set not to refresh automatically, you can still grab the references by clicking Refresh.
The input of the entry type is in English, separated by `,`, all fields are listed now, and the corresponding Chinese can be found through translation:

<details>
<summary>All types of bilingual Chinese and English</summary>

```
note=note
annotation=annotation
attachment=attachment
book=book
bookSection=book chapter
journalArticle=Journal Article
magazineArticle=Magazine Article
newspaperArticle=newspaper article
thesis=dissertation
letter=letter
manuscript=manuscript
interview=interview draft
film=film
artwork=artwork
webpage=webpage
report=report
bill=bill
case=judicial case
hearing=hearing
patent=patent
statute=law
email=E-mail
map=map
blogPost=Blog post
instantMessage=instant message
forumPost=Forum post
audioRecording=Audio
presentation=presentation document
videoRecording=Video
tvBroadcast=Television broadcast
radioBroadcast=Radio broadcast
podcast=podcast
computerProgram=Software
conferencePaper=conference paper
document=document
encyclopediaArticle=Encyclopedia Article
dictionaryEntry=entry
preprint=preprint
```

</details>

## 🕊️ TODO

- [ ] According to the feedback, do you need to add `References` to the sidebar in the main interface (non-reading state), currently only added in the reading state
- [ ] Do you want to import all, or multi-select import function
- [x] Do you need Chinese support? If so, please provide a website or reference acquisition plan (HowNet is already supported)
- [ ] Whether the reference acquisition strategy needs to be changed for a specific journal
- [ ] Change reference entry icon according to entry type

## 👋 Description

1. The automatic correlation function of this plugin is not compatible with `scihub` plugin

## 🍭 Thanks

This plugin is based on a template:

- [zotero-addon-template](https://github.com/windingwind/zotero-addon-template)

Some functions of this plugin are based on the plugin:

- [jasmine/jasminum](https://github.com/l0o0/jasminum)
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)

Code reference:

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
- [chartero]
