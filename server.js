import path from 'path'
import {fileURLToPath} from 'url'
import cron from 'node-cron';
import data from './src/data.mjs'
import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import handlebars from 'handlebars'
import pointOfView from 'point-of-view'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let siteAddress
let lastUpdate = ''

cron.schedule('30 */6 * * *', async () => {
  // At minute 30 past every 6th hour.
  lastUpdate = await data.update(siteAddress)
});

const fastify = Fastify({logger: false});

fastify.register(pointOfView, {
  engine: {handlebars: handlebars}
});


fastify.get("/", function(request, reply) {
  reply.view("./src/index.html", { lastUpdated: lastUpdate });
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'data'),
  prefix: '/data/',
  decorateReply: false 
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT || '8080', '127.0.0.1', async (err, address) => {
  if (err) {
    fastify.log.error(err);
    console.log(err)
    process.exit(1);
  }
  siteAddress = address
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
  lastUpdate = await data.update(siteAddress)
});
