function listen(errorEmitter) {
  errorEmitter.on('400', (resp) =>{
    console.log('400 BadRequest')
    resp.writeHead(404, {'Content-Type': 'application/json'})
    resp.write({'Error': '400', 'description': 'BadRequest'})
    resp.end()
  })

  errorEmitter.on('404', (resp) =>{
    console.log('404 NotFound')
    resp.writeHead(404, {'Content-Type': 'text/html'})
    resp.write('404 Not Found !')
    resp.end()
  })

  errorEmitter.on('error', (err) => {
    console.log('Error: '+err.description)
  })
}



module.exports.listen = listen
