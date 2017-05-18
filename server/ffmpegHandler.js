let ffmpeg = require('fluent-ffmpeg')
const crypto = require('crypto');
ffmpeg.setFfmpegPath('../common/bin/ffmpeg.exe');
ffmpeg.setFfprobePath('../common/bin/ffprobe.exe');


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

let newJob = function (parameters) {
  try{
    let jobID = crypto.randomBytes(32).toString('hex');
    jobs[jobID] = new BBQJob(jobID, parameters);
  }
  catch(e){
    BBQEvent.emit('error', e);
  }
}

let BBQJob = function (jobID, parameters) {
  console.log(parameters.name);
};

module.exports.handleJob = handleJob