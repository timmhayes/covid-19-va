import * as topojson from 'https://cdn.skypack.dev/topojson-client@3';
import Tooltip from './lib/tooltip.js'
import format from './lib/format.js'
import dataConnector from './lib/data-connector.js'

const getBoundsPruneOutliers = (arrayOfValues) => {
  arrayOfValues = arrayOfValues.sort((a, b) => a - b)
  const low = Math.round(arrayOfValues.length * 0.00025)
  const high = arrayOfValues.length - low
  const prunedData = arrayOfValues.slice(low, high)
  return {
    max: prunedData[prunedData.length - 1],
    min: prunedData[0]
  }
}

(async () => {
  const tooltip = new Tooltip(d3.select('svg'))
  const [allData, va] = await Promise.all([
    dataConnector.fetch(),
    fetch('./lib/va-counties-topo.json').then(d => d.json())
  ])
  console.log(allData)

  const svg = d3.select('svg'),
  width = 1000, // +svg.attr('width'),
  height = 625, // +svg.attr('height'),
  range = document.querySelector('#dateRange')
  let currentDateIndex = 0
  const allValues = Object.values(allData.averagesByFips100k).reduce((prev, current) => [...prev, ...current], [])
  const averageMax = getBoundsPruneOutliers(allValues).max
  const geojson = topojson.feature(va, va.objects.counties).features

  // Map and projection
  const projection = d3.geoConicConformal()
    .parallels([38.03333333, 41])
    .rotate([79.5,20])
    .scale(8000)
    .center([0, 57.7])
    .translate([width / 2, height / 2]);

  const updateData = (setTo) => {
    currentDateIndex = Math.max(0, Math.min(setTo,allData.dates.length - 1))
    range.value = currentDateIndex
    tooltip.hide()
    svg.selectAll('path')
    .data(geojson).join('path')
    .attr('fill', (d) => {
      const fips = d.id
      const avginFIPS = allData.averagesByFips100k[fips]
      if (avginFIPS) {
        return d3.interpolateTurbo(avginFIPS[currentDateIndex]/averageMax)
      } else {
        console.log(`No average for ${fips}`)
        return '#ccc'
      }
    })
    svg.select('.date').text(format.date(allData.dates[currentDateIndex]))

  }

  const showTooltip = (id) => {
    const data = allData.averagesByFips100k[id][currentDateIndex]
    if (!data) return
    const fips = allData.populationsByFips.find(d => d.FIPS == id)
    const daily = allData.dailyByFips[id][currentDateIndex]
    const average7Day = allData.averagesByFips[id][currentDateIndex]
    tooltip.show(`
      <h2>${fips.Location}, Virginia</h2>
      <table>
        <tr><td colspan="2">${format.date(allData.dates[currentDateIndex])}</td></tr>
        <tr><td>New Cases:</td><td>${daily}</td></tr>
        <tr><td>7-Day Average:</td><td>${format.number(average7Day)}</td></tr>
        <tr><td>7-Day Ave/100k:</td><td>${format.number(data)}</td></tr>
        <tr><td>Population:</td><td>${format.number(fips.VDH18)}</td></tr>
      </table>
    `)
  }

  //#region Map
  svg.append('g')
    .selectAll('path')
    .data(geojson)
    .enter().append('path')
    .attr('d', d3.geoPath().projection(projection))
    .on('click, mouseover', function (d, s, el) {
      showTooltip(d.id)
    })
    .on('mouseout', () => tooltip.hide())

  range.setAttribute('min', 0)
  range.setAttribute('max', allData.dates.length - 1)
  range.setAttribute('value', allData.dates.length - 1)
  range.addEventListener('input', (e) => {
    updateData(e.target.value)
  })
  //#endregion

  //#region LEGEND_TOP
  const data = d3.range(20)
  const x = d3.scaleLinear()
    .domain([0, 20])
    .range([0, averageMax])

  svg.append('text')
    .attr('class', 'date')
    .attr('x', width - 50)
    .attr('y', 40)
    .attr('text-anchor', 'end')
    .attr('font-size', '25px')

  const rects = svg.selectAll('g')
    .data(data)
    .enter()
    .append('g')

  rects.append('rect')
    .attr('y', 10)
    .attr('height', 30)
    .attr('x', (d, i) => i*29)
    .attr('width', 26)
    .attr('fill', d => d3.interpolateTurbo(d/20))
    .attr('stroke', 'gray')

  rects.append('text')
    .attr('x', (d, i) => i*29 + 13)
    .attr('y', 55)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('fill', 'black')
    .text(function(d) {  return Math.round(x(d)) });

  rects.append('text')
    .attr('x', 300)
    .attr('y', 75)
    .attr('width', 200)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('fill', 'black')
    .text('7-Day Average Per 100,000 Residents');
  //#endregion

  //#region STATE_TOTALS
  const xScale = d3.scaleBand()
    .domain(allData.stateTotals)
    .range([0, width - 20])
    .padding(0.3)

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(allData.stateTotals)])
    .range([0, 80]);

  const g = svg.append('g')
  g.selectAll('.bar')
    .data(allData.stateTotals)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(d, i) { return xScale(d) + 10 })
    .attr('y', function(d, i) { return height - yScale(d) - 50})
    .attr('width',  xScale.bandwidth())
    .attr('height', function(d, i) { return yScale(d); })
    .on('click mouseover', function (d, i, el) {
      if (d3.event.type == 'click') {
        updateData(i)
      }
      console.log(d3.event)
      tooltip.show(`
      <h2>${ format.date(allData.dates[i])}</h2>
      <table>
        <tr><td>Total New Cases:</td><td>${format.number(d)}</td></tr>
      </table>
      `)
    })

  const xScaleCal = d3.scaleTime()
    .domain(d3.extent(allData.dates, function(d) { 
      return new Date(d); 
    }))
    .range([0, width - 30]); 

  const x_axis = d3.axisBottom().scale(xScaleCal).ticks(5); 

  svg.append('g') 
    .attr('transform', `translate(15, ${height - 50})`) 
    .call(x_axis)

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('fill', 'black')
    .text('New Cases Per Day for All Locations');
  //#endregion


  updateData(allData.dates.length - 1)

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
      updateData(currentDateIndex - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      updateData(currentDateIndex + 1)
      e.preventDefault()
    }
  })

  const playButton = document.querySelector('.play-button')
  let playing = false

  function animate() {
    if (playing && currentDateIndex < allData.dates.length - 1) {
      updateData(currentDateIndex + 1)
      setTimeout(() => requestAnimationFrame(animate), 10) // native is too fast
    } else {
      playing = false
      playButton.setAttribute('aria-label', 'Play')
      playButton.classList.remove('on')
    }

  }

  playButton.addEventListener('click', (e) => {
    playing = e.target.classList.toggle('on')
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    if (playing) {
      updateData(0)
      requestAnimationFrame(animate)
    }
  })


})()
