let http = require('http')
let fs = require('fs')

let server = http.createServer()

server.on('request', (request, response) => {
  fs.readFile('../client/index.html', 'utf-8', (err, data) =>{
    if(err) {
      response.writeHead(404, {
        'content-type': 'text/html; charset=utf-8'
      })
      response.end("Ce fichier n'existe pas")
    }
    else{
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8'
      })
      response.end(data)
    }
  })
}).listen(8080)
