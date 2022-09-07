class Panel {
  constructor(id, parent) {
    this.parent = parent;
    this.setup(id);
  }
  setup(id) {
    this.container = document.createElement('div');
    this.container.classList.add(id);
    this.parent.container.appendChild(this.container);
  }
}

export { Panel };
