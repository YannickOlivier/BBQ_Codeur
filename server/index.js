let express = require('express');
let formidable = require('formidable');
let app = express();
let server = require('http').createServer(app);
let io = require('socket.io')(server);
let path = require('path');
let fs = require('fs');
let ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
ffmpeg.setFfmpegPath(path.join(__dirname, '../common/bin/ffmpeg.exe'));
ffmpeg.setFfprobePath(path.join(__dirname, '../common/bin/ffprobe.exe'));
let WatchIO = require('watch.io'),
  watcher = new WatchIO();

const colors = {
 Reset: "\x1b[0m",
 Bright: "\x1b[1m",
 Dim: "\x1b[2m",
 Underscore: "\x1b[4m",
 Blink: "\x1b[5m",
 Reverse: "\x1b[7m",
 Hidden: "\x1b[8m",
 fg: {
  Black: "\x1b[30m",
  Red: "\x1b[31m",
  Green: "\x1b[32m",
  Yellow: "\x1b[33m",
  Blue: "\x1b[34m",
  Magenta: "\x1b[35m",
  Cyan: "\x1b[36m",
  White: "\x1b[37m",
  Crimson: "\x1b[38m" //القرمزي
 },
 bg: {
  Black: "\x1b[40m",
  Red: "\x1b[41m",
  Green: "\x1b[42m",
  Yellow: "\x1b[43m",
  Blue: "\x1b[44m",
  Magenta: "\x1b[45m",
  Cyan: "\x1b[46m",
  White: "\x1b[47m",
  Crimson: "\x1b[48m"
 }
};
var log = console.log;
console.log = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return '[' +
               ((hour < 10) ? '0' + hour: hour) +
               ':' +
               ((minutes < 10) ? '0' + minutes: minutes) +
               ':' +
               ((seconds < 10) ? '0' + seconds: seconds) +
               '.' +
               ('00' + milliseconds).slice(-3) +
               '] ';
    }

    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};
var error = console.error;
console.error = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return '[' +
               ((hour < 10) ? '0' + hour: hour) +
               ':' +
               ((minutes < 10) ? '0' + minutes: minutes) +
               ':' +
               ((seconds < 10) ? '0' + seconds: seconds) +
               '.' +
               ('00' + milliseconds).slice(-3) +
               '] ';
    }

    error.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};


var LogError = function(text){ console.error('ERROR' + colors.fg.Red + text); };
var LogInfo = function(text){ console.log(colors.fg.White + text); };
var LogWarning = function(text){ console.log(colors.fg.Yellow + text); };
var LogWorkflow = function(text) { console.log(colors.fg.Cyan + text); };

//HTTP / WS Section
app.use('/public', express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) =>{ res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/index.html', (req, res) =>{ res.sendFile(path.join(__dirname, '../client/index.html')); });
app.get('/profiles.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/profiles.html')); });
app.get('/shutdown.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/shutdown.html')); });
app.get('/output.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/output.html')); });
app.get('/download/:fileName', (req, res) => {
  try{
    var fileName = req.params.fileName;
    res.download(path.join(__dirname, '../common/output', fileName), fileName, function(err){
      if (err) {
        LogError('ERROR Downloading File! ' + err);
        res.status(500).end();
      } else {
        LogInfo('Downloading ' + fileName);
      }
    });
  }
  catch(e){
    LogError('ERROR Downloading ' + fileName + ' ' + e.message);
    res.status(500).end();
  }
});
app.post('/upload', (req, res) => {

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
    LogWorkflow('Starting file upload: '+name);
  });

  //On récupere le nom du profile
  form.on('field', function(name, value) {  
    if(name == 'profile'){
      parameters.profile = value;
      LogInfo('Profile name receveid: '+value);
    }
  });
  // log any errors that occur
  form.on('error', function(err) {
    LogInfo('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
    newJob(parameters);
  });

  // parse the incoming request containing the form data
  form.parse(req);

});

io.sockets.on('connection', (socket) => {
  socket.on('job', (job) =>{
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

  socket.on('getProfile', (request) => {
    LogInfo('Get All Profile');
    try{
      fs.readFile((path.join(__dirname, '../common/profiles/bbq.profile')), (err, data) => {
        if(err){
          socket.emit('profile', {
            error: err
          });
        }
        else{
          socket.emit('profile', JSON.parse(data));
          LogInfo('All profile sent');
        }
      });
    }
    catch(e){LogError('Error getting Profile: '+e.message);}
    return;
  });

  socket.on('updateProfile', (request) => {
    LogInfo('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError('error: '+e.message);}
    profile[request.name] = request;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
    socket.broadcastemit('profile', profile);
    return;
  });

  socket.on('deleteProfile', (request) => {
    LogInfo('Delete Profile: '+request.name);
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError('error: '+e.message);}
    delete(profile[request.name]);
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
    socket.broadcast('profile', profile);
    return;
  });

  socket.on('shutdown', (request) =>{
    LogInfo('Shutdown request !!');
    socket.broadcast('shutdown', {message: 'Server is shutting down !'} );
    process.exit(0);
  });

  LogWorkflow('New user connected');
});


//Job Section
/*watcher.watch(path.join(__dirname, '../common/tmp')); //WatchFolder !!! A metre dans une fonction pour gestion depuis interface

watcher.on('create', function ( file, stat ) {
    LogInfo('New file cregggated: '+file+' - '+JSON.stringify(stat));
    //newJob({ path: file });
}); */

/*fs.watch(path.join(__dirname, '../common/tmp'), (eventType, filename) => {
  LogInfo(filename+ '   '+eventType);
  if(filename){
    LogInfo(path.join(__dirname, '../common/tmp/',filename));

  }
}); */


var jobs ={};

var newJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
   LogError('error', e);
  }
  return;
};

var BBQJob = function (jobID, parameters) {
  var self = this;
  try{
    self.id = jobID;
    self.cancelJob = function(){
      self.ffmpegProcess.kill();
      LogWorkflow('Job '+ jobID + 'Killed');
    };
    var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile')))[parameters.profile];
    self.profile = profile;
    self.ffmpegProcess = ffmpeg(parameters.path)
                          .videoCodec('libx264')
                          .size(profile.Format)
                          .audioCodec(profile.aCodec == 'AAC' ? 'aac': 'pcm_s16le')
                          .on('progress', function(progress) {
                            //LogInfo('Processing: ' + progress.percent + ' % done');
                            self.monitoring = progress.percent;
                          })
                          .save(path.join(__dirname, '../common/output',parameters.name));
    LogWorkflow('Transcoding: ' + parameters.name);

  }
  catch(e){
    LogError('ERRROR during transcode: '+e.message);
  }
};


try{ server.listen(8080); } catch(e){ LogError('error',e); }

process.on('exit', (code) => {
		LogInfo('Exit code: '+code);
});

process.on('uncaughtException', (err) =>{
  LogError('FATAL ERROR!!: '+err);
	//process.exit(1);
});