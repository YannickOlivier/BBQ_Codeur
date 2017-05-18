let ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
let path = require('path');
ffmpeg.setFfmpegPath('../common/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('../common/bin/ffprobe.exe');
let WatchIO = require('watch.io'),
  watcher = new WatchIO();

watcher.watch(path.join(__dirname, '../common/tmp'));

watcher.on('create', function ( file, stat ) {
    console.log('New file created: '+file);
});


let jobs ={};
let BBQEvent = {} 
let handleJob = function (jobEmitter) {
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

let Job = function (parameters) {
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
  console.log(parameters.name);
};

module.exports.handleJob = handleJob