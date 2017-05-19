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
ffmpeg.setFfmpegPath(path.join(__dirname, '../common/bin/ffmpeg.exe'));
ffmpeg.setFfprobePath(path.join(__dirname, '../common/bin/ffprobe.exe'));
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
    console.log('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    profile[request.name] = request;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/bbq.profile'), tempString);
    socket.emit('profile', profile);
    return;
  });
  socket.on('deleteProfile', function(request){
    console.log('Delete Profile: '+request.name);
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    delete(profile[request.name]);
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/bbq.profile'), tempString);
    socket.emit('profile', profile);
    return;
  });

  console.log('New user connected');
});


//Job Section
/*watcher.watch(path.join(__dirname, '../common/tmp')); //WatchFolder !!! A metre dans une fonction pour gestion depuis interface

watcher.on('create', function ( file, stat ) {
    console.log('New file cregggated: '+file+' - '+JSON.stringify(stat));
    //newJob({ path: file });
}); */

fs.watch(path.join(__dirname, '../common/tmp'), (eventType, filename) => {
  console.log(filename+ '   '+eventType);
  if(filename){
    console.log(path.join(__dirname, '../common/tmp/',filename));
    fs.stat(path.join(__dirname, '../common/tmp/',filename), function(err, stat){
      console.log(stat)
    });
  }
});


var jobs ={};

var newJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
    BBQEvent.emit('error', e);
  }
  return;
};

var BBQJob = function (jobID, parameters) {
  var self = this;
  self.id = jobID;
  self.cancelJob = function(){
    self.ffmpegProcess.kill();
  };
  self.ffmpegProcess = ffmpeg(parameters.path)
                        .videoCodec('libx264')
                        .on('progress', function(progress) {
                          console.log('Processing: ' + progress.percent + '% done');
                        })
                        .save('D:/WOODY/output.mp4');
  console.log('Transcoding: '+parameters.path);
};


try{
  server.listen(8080);
}
catch(e){
  BBQEvent.emit('error',e);
}
