let express = require('express');  
let app = express();  
let server = require('http').createServer(app);  
let io = require('socket.io')(server);
let path = require('path');
const EventEmitter = require('events');
let BBQEvent = new EventEmitter();
let ffmpegHandler = require('./ffmpegHandler').handleJob(BBQEvent);
let fs = require('fs');
let ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
ffmpeg.setFfmpegPath('../common/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('../common/bin/ffprobe.exe');
let WatchIO = require('watch.io'),
  watcher = new WatchIO();


//HTTP / WS Section
app.use('/public', express.static(path.join(__dirname, '../client')));

app.get('/', function (req, res) { res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/index.html', function (req, res) { res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/profiles.html', function (req, res) { res.sendFile(path.join(__dirname, '../client/profiles.html')); });

io.sockets.on('connection', function (socket) {
  socket.on('job', function(job){
    switch(job.type){
      case 'new':
        newJob(job.parameters);
      break;

      case 'delete':
        deleteJob(job.jobID);
      break;
    }
    return;
  });

  socket.on('getProfile', function(request){
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
    return;
  });

  socket.on('updateProfile', function(request){
    console.log(JSON.stringify(request));
    console.log('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    profile[request.name] = request;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/bbq.profile'), tempString);
    socket.emit('profile', profile);
    return;
  });
  socket.on('deleteProfile', function(request){
    console.log(JSON.stringify(request));
    console.log('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    profile[request.name] = null;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/bbq.profile'), tempString);
    socket.emit('profile', JSON.parse(tempString));
    return;
  });

  console.log('New user connected');
});


//Job Section
watcher.watch(path.join(__dirname, '../common/tmp')); //WatchFolder !!! A metre dans une fonction pour gestion depuis interface

watcher.on('create', function ( file, stat ) {
    console.log('New file created: '+file);
});
let jobs ={};

let newJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
    BBQEvent.emit('error', e);
  }
  return;
};

let BBQJob = function (jobID, parameters) {
  this.id = jobID;
  this.cancelJob = function(){

  }; 
  this.ffmpegProcess = ffmpeg();
  console.log(parameters.name);
};



try{
  server.listen(8080);
}
catch(e){
  BBQEvent.emit('error',e);
}


