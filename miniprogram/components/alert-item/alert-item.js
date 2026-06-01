Component({
  properties: {
    alert: { type: Object, value: {} },
    levelMap: { type: Object, value: {} }
  },
  methods: {
    onResolve(e) {
      this.triggerEvent('resolve', { id: e.currentTarget.dataset.id })
    }
  }
})
