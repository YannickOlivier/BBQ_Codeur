const path = require('path')
function start(app, port) {
  app.use('/public', express.static(path.join(__dirname, '../client')))
  app.listen(port)
  console.log('Démarrage du serveur.')

  app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '../client/index.html'))
})
}

module.exports.start = start

