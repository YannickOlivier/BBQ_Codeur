let ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
let path = require('path');
ffmpeg.setFfmpegPath('../common/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('../common/bin/ffprobe.exe');
let WatchIO = require('watch.io'),
  watcher = new WatchIO();

watcher.watch(path.join(__dirname, '../common/tmp')); //WatchFolder !!! A metre dans une fonction pour gestion depuis interface

watcher.on('create', function ( file, stat ) {
    console.log('New file created: '+file);
});


let jobs ={};
let BBQEvent = {} 
let handleJob = function (jobEmitter, socket) {
  BBQEvent = jobEmitter;
  jobEmitter.on('job', (job) => {
    switch(job.type){
      case 'new':
        newJob(job.parameters);
      break;

      case 'delete':
        deleteJob(job.jobID);
      break;
    }
  });
};

let newJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
    this.id = jobID;
  }
  catch(e){
    BBQEvent.emit('error', e);
  }
}

let BBQJob = function (jobID, parameters) {
  this.cancelJob = function(){

  }; 
  this.ffmpegProcess = ffmpeg();
  console.log(parameters.name);
};

module.exports.handleJob = handleJob;