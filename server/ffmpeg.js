'use strict';

const EventEmitter = require('events');
const util = require('util');
const exec = require('child_process').exec;
const byline = require('byline');
const path = require('path');

var ffmpegPath = path.join(__dirname, '../common/bin/ffmpeg.exe');

const regexStartFFmpegFullDuration = /Duration: [0-9]{2}:{1}[0-9]{2}:{1}[0-9]{2}.[0-9]{2}/;
const regexFFmpegDuration = /time=[0-9]{2}:{1}[0-9]{2}:{1}[0-9]{2}.[0-9]{2}/;

class FFmpegProcess extends EventEmitter {
    constructor(ffmpegParameters = { err: 'default' }) {
        super();
        if (ffmpegParameters.err === 'default') {
            this.emit('err', 'cannot get ffmpegParameters');
            return;
        }
        this.name = ffmpegParameters.name;
        this.jobID = ffmpegParameters.jobID;
        this.ffmpegParameters = ffmpegParameters;
        this.process = null;
    }

    lunchFFmpegTask(ffmpegParameters) {
        const commandLine = this.buildCommandLine(ffmpegParameters);
        if (ffmpegPath === '') {
            this.emit('err', 'ffmpegPath is not Set !');
            return;
        }

        this.emit('start', '' + commandLine);

        try {
            this.process =   exec(commandLine, (error, stdout, stderr) => {
                if (error) {
                    this.emit('err', error);
                    return;
                }
                this.emit('end');
                return;
            });
            this.progress = 0;
        } catch (e) {
            console.log('error spawning child');
            this.emit('err', `Spawning child with ${e}`);
            return;
        }

        /* this.process.on('close', (code, signal) => {
             this.emit('end', `code: ${code} signal: ${signal}`);
         }); */

        const stdoutStream = byline.createStream();
        this.process.stdout.pipe(stdoutStream);
        stdoutStream.on('data', (line) => {
            console.log(`new STDOUT line : ${line}`);
            this.parseProgressLine(line);
        });

       const stdrStream = byline.createStream();
        this.process.stderr.pipe(stdrStream);
        stdrStream.on('data', (line) => {
            console.log(`new STDERR line : ${line}`);
            this.parseProgressLine(line);
        });

        return;
    }

    buildCommandLine(ffmpegParameters) {
        let commandLine = [];

        commandLine.push(`${ffmpegPath}`);

        commandLine.push('-psnr');

        commandLine.push('-stats ');

        commandLine.push(`-i ${ffmpegParameters.input}`); // input

        switch (ffmpegParameters.profile.vCodec) {
            case 'x264':
                commandLine.push('-c:v libx264');
                break;
            case 'x265':
                commandLine.push('-c:v libx265');
                break;
            default:
                commandLine.push('-c:v libx264');
                break;
        }
        if (!ffmpegParameters.profile.Format === 'same')
            commandLine.push(`scale=${ffmpegParameters.profile.Format}`);

        if (!ffmpegParameters.profile.FrameRate === 'same')
            commandLine.push(`-r ${ffmpegParameters.profile.FrameRate}`);

        if (ffmpegParameters.profile.vDebit)
            commandLine.push(`-b:v ${ffmpegParameters.profile.vDebit} k`);

        if (ffmpegParameters.profile.vGOP)
            commandLine.push(`-g ${ffmpegParameters.profile.vGOP}`);

        if (ffmpegParameters.profile.vQP)
            commandLine.push(`-crf ${ffmpegParameters.profile.vQP}`);

        if (ffmpegParameters.profile.WPP)
            // customComplexFilter.push('wpp');

            if (ffmpegParameters.profile.Lossless)
                commandLine.push('--lossless');

        commandLine.push(`${ffmpegParameters.output} `);

        commandLine.push('-y');

        let commandLineString = '';
        for (const i of commandLine)
            commandLineString += `${i} `;

        return commandLineString;
    }

    kill() {
        console.log('tring to kill process');
        process.kill(this.process.pid, 'SIGKILL');
        return;
    }

    eventTest() {
        return this.emit('test', 'first emit!');
    }

    parseProgressLine(line) {
        let match = regexStartFFmpegFullDuration.exec(line);
        if(match !== null){
            this.fullDuration = this.ffmpegDurationToMS(match[0].split(' ')[0]);
        }
        else{
            let duration = regexFFmpegDuration.exec(line);
            if(duration !== null){
                this.progress = Math.floor(this.ffmpegDurationToMS(duration[0]) / this.fullDuration);
                console.log(this.progress);
                this.emit('progress', this.progress);
            }
        }
        return;
    }
    
    ffmpegDurationToMS(line){
        try{
            let splitedTime = line.split(':');
            let duration = 3600000 * splitedTime[0];
            duration += 60000 * splitedTime[1];
            splitedTime = splitedTime[3].split('.');
            duration += 1000 * splitedTime [0];
            duration += splitedTime[1];
            return duration;
        }
        catch(e){
            console.log('err '+e);
            return this.process;
        }
    }
}

module.exports.FFmpegProcess = FFmpegProcess;