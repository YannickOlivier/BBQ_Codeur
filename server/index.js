//var EventLogger = require('node-windows').EventLogger;
var express = require('express');
var formidable = require('formidable');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
var fs = require('fs');
var os = require('os');
var ffmpeg = require('fluent-ffmpeg');
var crypto = require('crypto');
var CronJob = require('cron').CronJob;
ffmpeg.setFfmpegPath(path.join(__dirname, '../common/bin/ffmpeg.exe'));
ffmpeg.setFfprobePath(path.join(__dirname, '../common/bin/ffprobe.exe'));
/*var WatchIO = require('watch.io'),
  watcher = new WatchIO(); */

// LOG 
var colors = {
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
var jobs = {};
var monitoring = {};
var serverStartTime = new Date();
var alarms = {};
//var windowsLog = new EventLogger('BBQ_Codeur');

function dateLog () {
  var date = new Date();
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
function getLogFileName(){
  var now = new Date();
  return ''+path.join(__dirname, '../common/tmp/log','log-' +("0" + now.getDate()).slice(-2) + '-' + ("0" + (now.getMonth()+1)).slice(-2) + '-' + now.getFullYear()+'.log');
}
var LogError = function(text){ 
  console.error(colors.fg.Red + dateLog() + 'ERROR   ' + text); 
  //windowsLog.error('ERROR   ' + text);
  fs.appendFile(getLogFileName(), (dateLog() + 'ERROR   ' + text+'\r\n'), {
    encoding: 'utf8',
    mode: '0o666',
    flag: 'a+'
  }, function(err){
    if(err)
      console.log('ERROR logError '+err);      
  });
};
var LogInfo = function(text){ 
  console.log(colors.fg.White + dateLog() + 'INFO   ' + text); 
  fs.appendFile(getLogFileName(), (dateLog() + 'INFO   ' + text+'\r\n'), function(err){
    if(err)
      console.log('ERROR logInfo '+err);
  });
};
var LogWarning = function(text){ 
  console.log(colors.fg.Yellow + dateLog() + 'WARNING   ' + text); 
  //windowsLog.warn('WARNING   ' + text);
  fs.appendFile(getLogFileName(), (dateLog() + 'WARNING  ' + text+'\r\n'), function(err){
    if(err)
      console.log('ERROR logWarning '+err);      
  });
};
var LogWorkflow = function(text) { 
  console.log(colors.fg.Cyan + dateLog() + 'WORKFLOW   ' + text); 
  fs.appendFile(getLogFileName(), (dateLog() + 'WORKFLOW  ' + text+'\r\n'), {
    encoding: 'utf8',
    mode: '0o666',
    flag: 'a+'
  }, function(err){
    if(err)
      console.log('ERROR logWorkflow '+err);      
  });
};

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
        LogError('Downloading File! ' + err);
        res.status(500).end();
      } else {
        LogInfo('Downloading ' + fileName);
      }
    });
  }
  catch(e){
    LogError('Downloading ' + fileName + ' ' + e.message);
    res.status(500).end();
  }
});
app.post('/upload', (req, res) => {
    var jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new Upload(req, res, jobID);
});

io.sockets.on('connection', (socket) => {
  socket.on('job', (job) =>{
    switch(job.type){
      case 'new':
        newJob(job.parameters);
      break;

      case 'delete':
        cancelWFJob(job.jobID);
      break;
    }
    return;
  });

  socket.on('getProfile', (request) => {
    LogInfo('Get All Profile request');
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
    catch(e){LogError('Getting Profile: '+e.message);}
    return;
  });

  socket.on('updateProfile', (request) => {
    LogInfo('Update Profile');
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError(e.message);}
    profile[request.name] = request;
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
    socket.broadcast('profile', profile);
    return;
  });

  socket.on('deleteProfile', (request) => {
    LogInfo('Delete Profile: '+request.name);
    try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError(+e.message);}
    delete(profile[request.name]);
    tempString = JSON.stringify(profile);
    fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
    socket.broadcast('profile', profile);
    return;
  });

  socket.on('shutdown', (request) =>{
    LogWarning('Shutdown request !!');
    for(var i in jobs){
      cancelWFJob(i);
    }
    updateMonitoring();
    setTimeout(function () {
      io.local.emit('shutdown', {message: 'Server is shutting down !'} );
      io.server.close();
      server.close();
      LogWarning('Shutting down !!');
      process.exit(0);
    }, 1000);
  });
  socket.on('test', (request) => {
    LogWarning('TEST: '+request.test);
  });

  socket.on('getMonitoring', (request) => {
    LogInfo('Get monitoring Request');
    socket.emit('monitoring', monitoring);
  });

  socket.on('clearMonitoring', function(request){
    LogInfo('Clear monitoring Request');
    monitoring = {};
    updateMonitoring();
  });

  LogWorkflow('New user connected');
});

var Upload = function(req, res, jobID){
  var self = this;
  try{
    self.id = jobID;
    self.name ='Waiting ...';
    self.status = 'Upload';
    self.percent = 0;
    self.isUploadCancel = false;
    self.stopUpload = function(){
      res.end('abord');
      self.isUploadCancel = true;
    };
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
    });

    form.on('fileBegin', function(name, file) {
      LogWorkflow('Starting file upload: '+name);
    });

    form.on('progress', function(bytesReceived, bytesExpected) {
      self.percent = Math.round((bytesReceived/bytesExpected)*100);
    });

    //On récupere le nom du profile
    form.on('field', function(name, value) {  
      switch(name){
        case 'profile':
          parameters.profile = value;
        break;
        case 'name':
          parameters.name = value;
          self.name = value;
        break;
      }

    });

    // log any errors that occur
    form.on('error', function(err) {
      LogError('An error has occured: ' + err);
      cancelWFJob(jobID);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
      res.end('success');
      if(!self.isUploadCancel)
        jobs[jobID] = new BBQJob(jobID, parameters);
    });

    // parse the incoming request containing the form data
    form.parse(req);

    return;
  } catch(e) {LogError('Error uploading file on line '+e.lineNumber+' : '+e.message); }
};

//Routines
try{
  try{
    fs.readFile(path.join(__dirname, '../common/tmp/monitoring/monitoring.json'), (err, data) =>{
      if(err)
        LogError('Read monitoring file');
      else
        monitoring = JSON.parse(data);
    });
  } catch(e) {}
  var monitoringRoutine = new CronJob('* * * * * *', function() {  //Routine toutes les secondes
    try{
      updateMonitoring();
    } catch(e){ LogError('updateMonitoring: '+e.message); }
  }, null, true); 
  var serverStatus = new CronJob('* * * * * *', function() {  //Routine toutes les secondes
    try{
      updateServerStatus();
    } catch(e){ LogError('updateServerStatus: '+e.message);}
  }, null, true); 
} catch(e){ LogError('On routine '+e.message); }

var updateMonitoring = function(){
  try{
    for(var i in jobs){
      if(!monitoring[i]){
          monitoring[i] = {
            name: jobs[i].name,
            displayName: jobs[i].name.length > 15 ? jobs[i].name.substring(0, 12)+'...' : jobs[i].name,
            id: jobs[i].id
          };
      }

      switch(jobs[i].status){
        case 'Transcode':
          monitoring[i].percent = jobs[i].percent;
          monitoring[i].status = 'Transcode';
        break;
        case 'Upload':
          monitoring[i].percent = jobs[i].percent;
          monitoring[i].status = 'Upload';
        break;
        case 'ERROR':
          monitoring[i].percent = 100;
          monitoring[i].status = 'ERROR';
        break;
        case 'DONE':
          monitoring[i].percent = 100;
          monitoring[i].status = 'DONE';
        break;
        case 'STOP':
          monitoring[i].percent = 100;
          monitoring[i].status = 'STOP';
        break;
      }
      if(monitoring[i].name == 'Waiting ...' && monitoring[i].status == 'STOP')
        monitoring[i].name = 'Aborded';    
      if(monitoring[i].name == 'Waiting ...' && monitoring[i].name != jobs[i].name){
        monitoring[i].name = jobs[i].name;
        monitoring[i].displayName = jobs[i].name.length > 15 ? jobs[i].name.substring(0, 12)+'...' : jobs[i].name;
      }
    }
    fs.writeFile(path.join(__dirname, '../common/tmp/monitoring/monitoring.json'), JSON.stringify(monitoring), (err) =>{
      if(err)
        LogError('Writing monitoring file '+err);
    });

    io.local.emit('monitoring', monitoring);
  } catch(e) { LogError('In monitoring construction: '+e.message); }

};
var updateServerStatus = function(){
  try{
    var serverStatus = {
      'uptime': Math.floor(process.uptime()),
      'nodeVersion': process.version,
      'serverFreeMem': os.freemem(),
      'hostname': os.hostname(),
      'plateform': os.platform(),
      'osVersion': os.release(),
      'osUptime': Math.floor(os.uptime()),
      'cpuNumber': getCPUNumber(),
      'alarms': alarms
    };

    //LogWarning(JSON.stringify(serverStatus));

    io.local.emit('serverStatus', serverStatus);
  } catch(e){ LogError('Updating ServerStatus: '+e.message); }
};

var getCPUNumber = function (){
  try{
    var cpus = os.cpus();
    var cpuNumber = 0;
    for(var i in cpus){
      cpuNumber++;
    }
    return cpuNumber;
  }
  catch(e){
    LogError('Getting CPU Number: '+e.message);
  }
};

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



var newWFJob = function (parameters) {
  try{
    var jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
   LogError('Crating job! ', e);
  }
  return;
};

var cancelWFJob = function(id){
  try{
    if(jobs[id]){
      if(jobs[id].status == 'Upload'){
        jobs[id].stopUpload('Abord');
      }
      if(jobs[id].status == 'Transcode'){
        jobs[id].ffmpegProcess.kill('SIGKILL');
        jobs[id].status = 'STOP';
        LogWorkflow('Job '+ id + 'Killed');
      }
      if(jobs[id].name == 'Waiting ...'){
        jobs[id].name = 'Aborded';
      }

      jobs[id].percent = 100;
      jobs[id].status = 'STOP';
    }
    LogWarning('JOB ABORDED '+jobs[id].name);
    
    updateMonitoring();
  } catch(e) {LogError('Cancel Job : '+e.message); }
};

var BBQJob = function (jobID, parameters) {
  var self = this;
  try{
    self.id = jobID;
    self.percent = '0';
    self.name = parameters.name;
    self.status = 'Transcode';
    var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile')))[parameters.profile];
    self.profile = profile;
    self.ffmpegProcess = ffmpeg(parameters.path)
                          .videoCodec('libx264')
                          .size(profile.Format === 'same' ? '': rofile.Format)
                          .audioCodec(profile.aCodec == 'AAC' ? 'aac': 'pcm_s16le')
                          .on('progress', function(progress) {
                            LogInfo('Processing: ' + progress.percent + ' % done');
                            self.percent = Math.round(progress.percent);
                          })
                          .save(path.join(__dirname, '../common/output',parameters.name))  
                          .on('end', function() {
                            self.percent = 100;
                            self.status = 'DONE';
                          }) 
                          .on('error', function(err, stdout, stderr) {
                            self.percent = 100;
                            self.status = 'ERROR';
                          });
    LogWorkflow('Transcode: ' + parameters.name);

  }
  catch(e){
    LogError('During transcode: '+e.message);
    self.percent = 100;
    self.status = 'ERROR';
  }
};


try{ server.listen(8080); } catch(e){ LogError('Starting server '+e.message); }

process.on('exit', (code) => {
		LogInfo('Exit code: '+code);
});

process.on('uncaughtException', (err) =>{
  var errorID = crypto.randomBytes(32).toString('hex');
  alarms[errorID] = err;
  LogError('FATAL ERROR!!: '+err);
	//process.exit(1);
});

LogWarning('Sever started');