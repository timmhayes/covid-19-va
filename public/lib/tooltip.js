
export default class Tooltip {

  constructor(d3Object) {
    this.element = document.createElement('div')
    this.element.className = 'tooltip'
    this.obj = d3Object
    document.body.appendChild(this.element)
  }

  hide() {
    this.element.classList.remove('on')
    this.obj.on('mousemove.tooltip', null)
  }

  position = () => {
    const rect = this.element.getBoundingClientRect()
    const x = (d3.event.pageX + rect.width + 25 < document.body.offsetWidth)
             ? d3.event.pageX + 25
             : d3.event.pageX - rect.width - 25
    const h = rect.height / 2
    const y = (d3.event.pageY + rect.height - h < document.body.offsetHeight)
             ? d3.event.pageY - h
             : d3.event.pageY - rect.height

    this.element.style.left = `${x}px`
    this.element.style.top  = `${y}px`
  }

  show(html) {
    this.element.innerHTML = html
    this.element.classList.add('on')
    this.obj.on('mousemove.tooltip', this.position)
    this.position()
  }

}