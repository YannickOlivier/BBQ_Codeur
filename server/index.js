'use strict';

let debugMod = false;

	process.argv.forEach((val, index) => {
  		if(val == 'debug')
        debugMod = true;
	});


//LIBS
  const express = require('express');
  const formidable = require('formidable');
  const app = express();
  const server = require('http').createServer(app);
  const io = require('socket.io')(server);
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  const CronJob = require('cron').CronJob;
  const ffmpeg = require('fluent-ffmpeg');
  const crypto = require('crypto');
  const chokidar = require('chokidar');
  const YAML = require('yamljs');

//Constantes
  const globalPSNRegex = /Global PSNR: [0-9]{1,2}.[0-9]{1,3}/g;
  const IPSNRRegex = /PSNR Mean: Y:[0-9]{1,2}.[0-9]{1,3} U:[0-9]{1,2}.[0-9]{1,3} V:[0-9]{1,2}.[0-9]{1,3}/g;
  const IRegex = /frame I:/;
  const PRegex = /frame P:/;
  const BRegex = /frame B:/;
  const encodedFrameRegex = /encoded [0-9]* frames/g;
  const regexStartFFmpegFullDuration = /Duration: [0-9]{2}:{1}[0-9]{2}:{1}[0-9]{2}.[0-9]{2}/;

// LOG 

  const colors = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[oad2m",
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
  const LogError = function(text){ 
    console.error(colors.fg.Magenta + dateLog() + 'ERROR   ' + text); 
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
  const LogInfo = function(text){ 
    console.log(colors.fg.White + dateLog() + 'INFO   ' + text); 
    fs.appendFile(getLogFileName(), (dateLog() + 'INFO   ' + text+'\r\n'), function(err){
      if(err)
        console.log('ERROR logInfo '+err);
    });
  };
  const LogWarning = function(text){ 
    console.log(colors.fg.Yellow + dateLog() + 'WARNING   ' + text); 
    //windowsLog.warn('WARNING   ' + text);
    fs.appendFile(getLogFileName(), (dateLog() + 'WARNING  ' + text+'\r\n'), function(err){
      if(err)
        console.log('ERROR logWarning '+err);      
    });
  };
  const LogWorkflow = function(text) { 
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
  const writeJobStats = function(id){
    let YAMLpath = path.join(__dirname, '../common/output', jobs[id].name+'.yaml');
    fs.writeFile(YAMLpath, YAML.stringify({
      source: {
        name: jobs[id].name,
        source: jobs[id].source,
        inputPath: jobs[id].path,
        duration: jobs[id].duration
      },
      job: {
        commandLine: jobs[id].commandLine
      },
      stats:{
        executionTimeMS: jobs[id].executionTime+'ms',
        executionTimeSecondes: Math.round((jobs[id].executionTime * 100) / 60) / 100 +'s',
        psnr:{
          globalPSNR: jobs[id].globalPSNR,
          iPSNR: jobs[id].iPSNR,
          pPSNR: jobs[id].pPSNR,
          bPSNR: jobs[id].bPSNR
        },
        encodedFrame: jobs[id].encodedFrame
      }
    }, 4), (err) => {
      if(err)
        LogError(`Wrinting YAML file for ${id} : ${err}`);
    });
  };

var jobs = {};
const watchfolderJobs = {};
var monitoring = {};
const serverStartTime = new Date();
var alarms = {};

if(debugMod)
  LogWarning('!!!  DEBUG MODE ON  !!!');

ffmpeg.setFfmpegPath(path.join(__dirname, '../common/bin/ffmpeg.exe'));

//HTTP / WS Section
  app.use('/public', express.static(path.join(__dirname, '../client'), {
    etag: false
  }));
  try{delete express.bodyParser.parse['multipart/form-data'];} catch(e){}

  app.get('/', (req, res) =>{ res.sendFile(path.join(__dirname, '../client/index.html')); });
  app.get('/index.html', (req, res) =>{ res.sendFile(path.join(__dirname, '../client/index.html')); });
  app.get('/profiles.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/profiles.html')); });
  app.get('/shutdown.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/shutdown.html')); });
  app.get('/output.html', (req, res) => { res.sendFile(path.join(__dirname, '../client/output.html')); });
  app.get('/download/:fileName', (req, res) => {
    try{
      const fileName = req.params.fileName;
      if(debugMod)
        LogWorkflow(`Download ${fileName}`);
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
      if(debugMod)
        LogWorkflow(`new job sended by ID: ${socket.id}`);
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
      if(debugMod)
        LogInfo(`get All profile requested by ID: ${socket.id}`);
      else
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
      if(debugMod)
        LogInfo(`Update profile required by ID: ${socket.id}`);
      else
        LogInfo('Update Profile');
      try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError(e.message);}
      profile[request.name] = request;
      var tempString = JSON.stringify(profile);
      fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
      io.local.emit('profile', profile);
      return;
    });

    socket.on('deleteProfile', (request) => {
      if(debugMod)
        LogInfo(`Delete profile requested by ID: ${socket.id}`);   
      else
        LogInfo('Delete Profile: '+request.name);
      try { var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), 'utf8')); } catch(e) { var profile = {}; LogError(+e.message);}
      delete(profile[request.name]);
      var tempString = JSON.stringify(profile);
      fs.writeFileSync(path.join(__dirname, '../common/profiles/bbq.profile'), tempString);
      io.local.emit('profile', profile);
      return;
    });

    socket.on('shutdown', (request) =>{
      if(debugMod)
        LogWarning(`Shutdown requested by ID: ${socket.id}`);
      else
        LogWarning('Shutdown request !!');
      for(var i in jobs){
        cancelWFJob(i);
      }
      updateMonitoring();
      setTimeout(function () {
        io.local.emit('shutdown', {message: 'Server is shutting down !'} );
        io.close();
        server.close();
        LogWarning('Shutting down !!');
        process.exit(0);
      }, 1000);
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

    socket.on('watchfolder', request => {
      if(debugMod)
        LogWorkflow(`New watchfolder creation requested by ID: ${socket.id}`);
      else
        LogWorkflow('New watchfolder creation requested');

      createWatchFolder(request.folder, request.profileName);
      return;
    });

    LogWorkflow(`New user connected ID: ${socket.id}`);
  });

  const Upload = function(req, res, jobID){
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

      var NameOfUploadFile = '';
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
        self.uploadPath = file.path;
      });

      form.on('fileBegin', function(name, file) {
        LogWorkflow('Starting file upload: '+name);
      });

      form.on('progress', function(bytesReceived, bytesExpected) {
        self.percent = Math.round((bytesReceived/bytesExpected)*100);
        if(debugMod)
          LogWorkflow(`Uploading ${self.name} : ${self.percent}`);
      });

      //On récupere le nom du profile
      form.on('field', function(name, value) {  
        switch(name){
          case 'profile':
            parameters.profile = value;
          break;
          case 'name':
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
        fs.exists(path.join(form.uploadDir, self.name), function(exists){
          if(exists){
            var ext = path.extname(self.name);
            const fileName = '' + path.basename(self.name, ext)  + '-' + crypto.randomBytes(6).toString('hex') + ext;
            fs.rename(self.uploadPath, path.join(form.uploadDir, fileName), function(){
              parameters.path = path.join(form.uploadDir, fileName);
              parameters.name = fileName;
              parameters.source = 'Upload';
              self.name = fileName;
              if(!self.isUploadCancel)
                  jobs[jobID] = new BBQJob(jobID, parameters);
            });
          }
          else{
            fs.rename(self.uploadPath, path.join(form.uploadDir, self.name), function(){
              parameters.path = path.join(form.uploadDir, self.name);
              parameters.name = self.name;
              if(!self.isUploadCancel)
                jobs[jobID] = new BBQJob(jobID, parameters);
            });
          }
        });
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

const updateMonitoring = function(){
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
          monitoring[i].encodingTime = (jobs[i].executionTime / 1000)+'s';
          monitoring[i].globalPSNR = jobs[i].globalPSNR;
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
const updateServerStatus = function(){
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

const getCPUNumber = function (){
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

var newWFJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
   LogError('Crating job! ', e);
  }
  return;
};

const parseInfo = function(line, id){
  let globalPSNR = globalPSNRegex.exec(line);
  if(globalPSNR != null){
    jobs[id].globalPSNR = globalPSNR[0];
    LogInfo(`Global PSNR = ${jobs[id].globalPSNR}`);
    return;
  }
  let iPSNR = IRegex.exec(line);
  let pPSNR = PRegex.exec(line);
  let bPSNR = BRegex.exec(line);
  if(iPSNR != null){
    let psnr = IPSNRRegex.exec(line);
    if(psnr != null){
      jobs[id].iPSNR = psnr[0];
      LogInfo(`iPSNR = ${jobs[id].iPSNR}`);      
    }
    return;
  }
  if(pPSNR != null){
    let psnr = IPSNRRegex.exec(line);
    if(psnr != null){
      jobs[id].pPSNR = psnr[0];
      LogInfo(`pPSNR = ${jobs[id].pPSNR}`);      
    }
    return;
  }
  if(bPSNR != null){
    let psnr = IPSNRRegex.exec(line);
    if(psnr != null){
      jobs[id].bPSNR = psnr[0];
      LogInfo(`bPSNR = ${jobs[id].bPSNR}`);
    }
    return;
  }
  let encodedFrame = encodedFrameRegex.exec(line);
  if(encodedFrame != null){
    LogWarning(encodedFrame[0])
    jobs[id].encodedFrame = encodedFrame[0].split(' ')[1];
    return;
  }

  let duration = regexStartFFmpegFullDuration.exec(line);
  if(duration != null){
    jobs[id].duration = duration[0].split(' ')[1];
    return;   
  }


  return;
};

const cancelWFJob = function(id){
  try{
    if(jobs[id]){
      if(jobs[id].status == 'Upload'){
        jobs[id].stopUpload('Abord');
      }
      if(jobs[id].status == 'Transcode'){
        jobs[id].ffmpegProcess.kill();
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

const createWatchFolder = function(folder, profileName){
  try{
    let id = crypto.randomBytes(32).toString('hex');
    let alreadyExist = false;
    for(let i in watchfolderJobs)
      if(watchfolderJobs[i].folder == folder)
        alreadyExist = true;
    
    if(!alreadyExist) 
      watchfolderJobs[id] = new Watchfolder(folder, profileName);
  }
  catch(e){
    LogError(`Failed to create Watchfolder ${e.message}`);
  }
};

const BBQJob = function (jobID, parameters) {
  var self = this;
  try{
    self.source = parameters.source;
    self.id = jobID;
    self.percent = '0';
    self.name = parameters.name;
    self.status = 'Transcode';
    var profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../common/profiles/bbq.profile')))[parameters.profile];
    self.profile = profile;
    self.path = parameters.path;
    self.startTime = new Date();
  
    var vCodec = 'libx265';
    switch(profile.vCodec){
      case 'x264':
        vCodec = 'libx264';
      break;
      case 'x265':
        vCodec = 'libx265';
      break;
      default:
        vCodec = 'libx264';
      break;
    }

    try{
      var customOptions = [];
      var  x265params = []; 

      if(profile.vGOP)
        customOptions.push('-g '+profile.vGOP);

      customOptions.push(`-c:v ${vCodec}`);

      if(!profile.Format === 'same')
        customVideoFilter.push('scale='+profile.Format);

      if(!profile.FrameRate === 'same')
        customOptions.push('-r '+profile.FrameRate);

      if(profile.vDebit)
        customOptions.push('-b:v ' + profile.vDebit + 'k'); 


      if(profile.WPP === 'Oui')
        x265params.push('wpp=1');

      if(profile.vCTU)
        x265params.push(`ctu=${profile.vCTU}`);

      if(profile.vQP)
        x265params.push(`qp=${profile.vQP}`);

      if(x265params.length > 0){
        let string = '-x265-params ';
        if(x265params.length  === 1)
          string += ''+x265params[0];
        else{
          string += ''+x265params[0];
          for(let i = 1; i<x265params.length; i++)
            string += ':'+x265params[i];          
        }
        customOptions.push(string);
      }

      if(profile.Lossless)
        customOptions.push('--lossless');

      if(profile.preset != 'none' && profile.preset)
        customOptions.push(`-preset ${profile.preset}`);

      customOptions.push('-psnr');
    }
    catch(e){
      LogError(`Pushing Custom parameters String for: ${self.name}: ${e.message}`);
    }
    self.ffmpegProcess = ffmpeg(parameters.path)
                          .audioCodec(profile.aCodec == 'AAC' ? 'aac': 'pcm_s16le')
                          .audioBitrate(profile.aDebit ? profile.aDebit: '48000k')
                          .outputOption(customOptions)
                          .on('start', function(commandLine) {
                            LogWorkflow(`Spawned Ffmpeg with command: ${commandLine} with profile: ${parameters.profile}`);
                            self.commandLine = commandLine;
                          })
                          .on('progress', function(progress) {
                            //LogInfo('Processing: ' + progress.percent + ' % done');
                            self.percent = Math.floor(progress.percent);
                          })
                          .save(path.join(__dirname, '../common/output',parameters.name))  
                          .on('end', function(stdout, stderr) {
                            console.log('toto');
                            if(debugMod){
                              LogError(`Stderr line ${stderr}`);
                              LogInfo(`Stdout line ${stdout}`);
                            }
                            self.percent = 100;
                            self.status = 'DONE';
                            self.endTime = new Date();
                            self.executionTime = self.endTime - self.startTime;
                            writeJobStats(self.id);
                            LogWorkflow(`${self.name} was successfully INGESTED in ${ self.executionTime}`);
                          }) 
                          .on('error', function(err, stdout, stderr) {
                            let killedRegex = /SIGKILL/g;
                            LogError(`FFMPEG ERROR on ${parameters.name} : ${err}`);
                            self.percent = 100;
                            if(killedRegex.exec(err) == null)
                              self.status = 'ERROR';
                          })  
                          .on('stdout', (stdoutLine) =>{
                            parseInfo(stdoutLine, self.id);
                            if(debugMod)
                              LogWorkflow(`Stdout line ${stdoutLine}`);
                          })
                          .on('stderr', function(stderrLine) {
                            parseInfo(stderrLine, self.id);
                          if(debugMod)
                              LogError(`Stderr line ${stderrLine}`);
                          });
    LogWorkflow('Transcode: ' + parameters.name);
  }
  catch(e){
    LogError('During transcode: '+e.message);
    self.percent = 100;
    self.status = 'ERROR';
  }
};

class Watchfolder {
  constructor(folder, profileName){
    try{
      this.profile = profileName;
    } catch(e) {}
    this.folder = folder;
    this.watchfolderDirectory = path.join(__dirname, '../common/watchfolder', folder);
    if(!fs.existsSync(this.watchfolderDirectory))
      fs.mkdirSync(this.watchfolderDirectory)

    LogWorkflow(`New Watchfolder created : ${folder} whith profile : ${profileName}`);
    this.watchfolder = chokidar.watch(this.watchfolderDirectory, {
      ignored: /(^|[\/\\])\../,
      awaitWriteFinish: {
        stabilityThreshold: 6000,
        pollInterval: 100
      },
    })
    .on("add", filePath => {
      newWFJob({
        path: filePath,
        name: path.basename(filePath) + path.extname(filePath),
        profile: this.profile,
        source: `Watchfolder: ${folder}`
      });
    });
  }
}


try{ server.listen(8080); LogWarning('Sever started and listen on port 8080'); } catch(e){ LogError('Starting server ' + e.message); }

process.on('exit', (code) => {
		LogInfo('Exit code: '+code);
});


process.on('uncaughtException', (err) =>{
  var errorID = crypto.randomBytes(32).toString('hex');
  alarms[errorID] = err;
  LogError(`FATAL ERROR!!: ${err}`);
	//process.exit(1);
});
