import Addon from "./addon";

class AddonModule {
  protected Addon: Addon;
  constructor(parent: Addon) {
    this.Addon = parent;
  }
}

export default AddonModule;