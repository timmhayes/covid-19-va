import path from 'path'
import {fileURLToPath} from 'url'
import cron from 'node-cron';
import data from './src/data.mjs'
import Fastify from 'fastify'
import fastifyStatic from 'fastify-static'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let siteAddress

cron.schedule('30 */6 * * *', () => {
  // At minute 30 past every 6th hour.
  data.update(siteAddress)
});

const fastify = Fastify({logger: false});
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'data'),
  prefix: '/data/',
  decorateReply: false 
});

fastify.get('/', function(request, reply) {
  reply.sendFile('/index.html')
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT || '8080', '127.0.0.1', function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  siteAddress = address
  data.update(siteAddress)
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
