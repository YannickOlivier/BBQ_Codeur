let express = require('express');
let formidable = require('formidable');
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

app.post('/upload', function(req, res){

  // create an incoming form object
  var form = new formidable.IncomingForm();
  var parameters = {};
  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '../uploads');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
    parameters.path = path.join(form.uploadDir, file.name);
    parameters.name = file.name;
  });
  form.on('fileBegin', function(name, file) {
    console.log('Starting file upload: '+name);
  });

  //On récupere le nom du profile
  form.on('field', function(name, value) {  
    if(name == 'profile'){
      parameters.profile = value;
      console.log('Profile name receveid: '+value);
    }
  });
  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
    newJob(parameters);
  });

  // parse the incoming request containing the form data
  form.parse(req);

});

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
    try{
      fs.readFile((path.join(__dirname, '../common/profiles/bbq.profile')), (err, data) => {
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
    catch(e){console.log('Error getting Profile: '+e.message);}
    return;
  });

  socket.on('updateProfile', function(request){
    console.log('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    profile[request.name] = request;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
    socket.emit('profile', profile);
    return;
  });

  socket.on('deleteProfile', function(request){
    console.log('Delete Profile: '+request.name);
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; console.log('error: '+e.message);}
    delete(profile[request.name]);
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
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

/*fs.watch(path.join(__dirname, '../common/tmp'), (eventType, filename) => {
  console.log(filename+ '   '+eventType);
  if(filename){
    console.log(path.join(__dirname, '../common/tmp/',filename));

  }
}); */


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
  try{
    self.id = jobID;
    self.cancelJob = function(){
      self.ffmpegProcess.kill();
    };
    var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile')))[parameters.profile];
    self.profile = profile;
    self.ffmpegProcess = ffmpeg(parameters.path)
                          .videoCodec('libx264')
                          .size(profile.Format)
                          .audioCodec(profile.aCodec == 'AAC' ? 'aac': 'pcm_s16le')
                          .on('progress', function(progress) {
                            console.log('Processing: ' + progress.percent + '% done');
                          })
                          .save(path.join(__dirname, '../common/output',parameters.name));
    console.log('Transcoding: '+parameters.path);

  }
  catch(e){
    console.log('ERRROR during transcode: '+e.message);
  }
};


try{ server.listen(8080); } catch(e){ BBQEvent.emit('error',e); }

process.on('exit', (code) => {
		console.log('Exit code: '+code);
});

process.on('uncaughtException', (err) =>{
  console.log('FATAL ERROR!!: '+err);
	//process.exit(1);
});