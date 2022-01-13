export default {

  fetch: async () => {

    const data = await fetch('./data/data.json').then(d => d.json())

    data.averagesByFips = {}
    data.averagesByFips100k = {}
    Object.entries(data.dailyByFips).forEach(([fips, dailyData]) => {
      const pop = data.populationsByFips.find(o => o.FIPS == fips).VDH18
      const populationOffset = 100000 / pop
      data.averagesByFips[fips] = []
      data.averagesByFips100k[fips] = dailyData.map((cases, index) => {
        const endOfSlice = index + 1
        const prevIndex = Math.max(0, endOfSlice - 7)
        const total = dailyData.slice(prevIndex, endOfSlice).reduce((acc, curr) => acc + curr, 0)
        const average = total / 7
        data.averagesByFips[fips].push(Math.round(average * 10) / 10)
        return Math.round(average * 10 * populationOffset) / 10
      })
    })

    data.stateTotals = data.dates.map((date, dateIndex) => {
      return Object.values(data.dailyByFips).reduce((acc, curr) => acc + parseInt(curr[dateIndex]), 0)
    })

    return data

  }

}