let express = require('express');  
let app = express();  
let server = require('http').createServer(app);  
let io = require('socket.io')(server);
let path = require('path');
const EventEmitter = require('events');
let BBQEvent = new EventEmitter();
let ffmpegHandler = require('./ffmpegHandler').handleJob(BBQEvent);
let fs = require('fs');


app.use('/public', express.static(path.join(__dirname, '../client')));

app.get('/', function (req, res) { res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/index.html', function (req, res) { res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/profiles.html', function (req, res) { res.sendFile(path.join(__dirname, '../client/profiles.html')); });

io.sockets.on('connection', function (socket) {
  socket.on('job', function(job){
    BBQEvent.emit('job', socket, job);
  });

  socket.on('getProfile', function(request){
    if(request.type === 'all'){
      console.log('Get All Profile');
      fs.readFile((path.join(__dirname, '../common/bbq.profile')), (err, data) => {
        if(err){
          socket.emit('profile', {
            error: err
          });
        }
        else{
          socket.emit('profile', JSON.parse(data));
          console.log('All profile sent');
        }
      });
    }
    else{
      console.log('Get '+request.name+' Profile');
      fs.readFile((path.join(__dirname, '../common/bbq.profile')), (err, data) => {
        if(err){
          socket.emit('profile', {
            error: err
          });
        }
        else{
          socket.emit('profile', JSON.parse(data)[request.name]);
          console.log('All profile sent');
        }
      });
    }    
  });

  socket.on('updateProfile', function(request){
    console.log(JSON.stringify(request))
    console.log('Update Profile');
    try { var temp = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/bbq.profile'), 'utf8')); } catch(e) { var temp = {}; console.log('error: '+e.message);}
    temp[request.name] = request;
    temp = JSON.stringify(temp);
    fs.writeFileSync(path.join(__dirname, '../common/bbq.profile'), temp);
  });


  console.log('New user connected');
});


try{
  server.listen(8080);
}
catch(e){
  BBQEvent.emit('error',e);
}


