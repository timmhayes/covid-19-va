import https from 'https';
import {promises} from 'fs';
const {writeFile, readFile, stat, mkdir} = promises;

const fetch = url => {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => resolve(JSON.parse(data)));
    }).on("error", (err) => {
      reject(err);
    });
  })
}

const refreshCache = async () => {
  //https://data.census.gov/cedsci/table?q=United%20States&t=Populations%20and%20People&g=0100000US_0400000US51%240500000
  // also this https://data.virginia.gov/Government/VDH-PublicUseDataset-NCHS-Population/5s4f-hthh

  console.log(`Refreching cache`)
  const dataDirectory = './data'
  const stats = await stat(dataDirectory).catch(async e => { await mkdir(dataDirectory)})

  let [results, populationsByFips] = await Promise.all([
    await fetch(`https://data.virginia.gov/resource/bre9-aqqr.json?$limit=100000`),
    await readFile('./src/fips.json', 'utf8').then(data => JSON.parse(data))
  ])
  writeFile(`${dataDirectory}/raw-data.json`, JSON.stringify(results))

  const dates = Object.keys(results.reduce((acc, curr) => {
    acc[curr.report_date]=''
    return acc
  }, {})).sort()

  const fips = Object.keys(results.reduce((acc, curr) => {
    acc[curr.fips]=''
    return acc
  }, {}))

  const totalsByFips = {}
  fips.forEach(fips => {
    const dataForFip = results.filter(result => result.fips === fips)
    totalsByFips[fips] = dates.map(date =>  {
       return parseInt(dataForFip.find(result => result.report_date == date).total_cases)
    })
  })

  const dailyByFips = {}
  Object.entries(totalsByFips).forEach(([fips, data]) => {
    dailyByFips[fips] = data.map((cases, index) => {
      let prev = data[index-1] || 0
      return cases - prev
    })
  })

  const json = {
    lastQueried: new Date(),
    dates: dates.map(date => date.replace('T00:00:00.000', '')),
    populationsByFips: populationsByFips,
    dailyByFips: dailyByFips//,  stateTotals: stateTotals
  }

  writeFile(`${dataDirectory}/data.json`, JSON.stringify(json))
  console.log(`Data refrested at ${json.lastQueried}`)
  return json
}

export default {
  update: async () => {
    const data = await refreshCache()
    return data
  }
}