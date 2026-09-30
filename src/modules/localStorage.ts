import { config } from "../../package.json";

class LocalStorage {
  public filename!: string;
  public cache: any;
  public lock: any;
  constructor(filename: string) {
    this.lock = Zotero.Promise.defer()
    this.init(filename)
  }

  async init(filename: string) {
    // <Zotero temp dir>/../<filename>.json; OS.File is gone in newer Firefox, IOUtils/PathUtils work in 7-10
    const temp = Zotero.getTempDirectory();
    this.filename = PathUtils.join(PathUtils.parent(temp.path)!, `${filename}.json`);
    try {
      const rawString = await Zotero.File.getContentsAsync(this.filename) as string
      this.cache = JSON.parse(rawString)
      ztoolkit.log(this.cache)
    } catch {
      this.cache = {}
    }
    this.lock.resolve()
  }

  get(item: Zotero.Item | { key: string }, key: string) {
    if (this.cache == undefined) {
      ztoolkit.log("cache is undefined")
      return
    }
    return (this.cache[item.key] ??= {})[key]
  }

  async set(item: Zotero.Item | { key: string }, key: string, value: any) {
    await this.lock.promise;
    (this.cache[item.key] ??= {})[key] = value
    window.setTimeout(async () => {
      await Zotero.File.putContentsAsync(this.filename, JSON.stringify(this.cache));
    })
  }
}

export default LocalStorage

