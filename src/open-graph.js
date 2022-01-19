import fs from 'fs'
import puppeteer from 'puppeteer'
import GIFEncoder from 'gifencoder'
import PNG from 'png-js'

function decode(png) {
  return new Promise(r => {png.decode(pixels => r(pixels))})
}

async function gifAddFrame(page, encoder) {
  const pngBuffer = await page.screenshot({ clip: { width: 1024, height: 620, x: 3, y: 130 } })
  const png = new PNG(pngBuffer)
  await decode(png).then(pixels => encoder.addFrame(pixels))
}

export default {

  generateGif: async function openGraph(url, outputFile) {

    console.log('updating open graph gif')
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    page.setViewport({width: 1060, height: 768})
    await page.goto(url, {
      waitUntil: ['networkidle0']
    });

    // record gif
    var encoder = new GIFEncoder(1024, 620);
    encoder.createWriteStream()
      .pipe(fs.createWriteStream(outputFile));

    // setting gif encoder
    encoder.start()
    encoder.setRepeat(0)
    encoder.setDelay(500)
    encoder.setQuality(10) // default

    for (let i = 10; i >= 0; i--) {
      await page.evaluate((i) => {
        const range = document.querySelector('#dateRange')
        range.value = parseInt(dateRange.max) - i
        const event = new Event('input')
        range.dispatchEvent(event)
      }, i)
      await gifAddFrame(page, encoder)
    }
    
    // finish encoder, test.gif saved
    encoder.finish()
    await browser.close()
    console.log('saved open graph gif')

  }
}