/*
 * Copyright (c) 2017 Baidu, Inc. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DcsClient = require("./dcs_client");
const AvsClient = require("./avs_client");
const DcsController = require("./dcs_controller");
const Recorder = require("./recorder");
const configModule = require("./config.js");
const config = configModule.getAll();
const child_process = require("child_process");
const fs = require('fs');
const http = require('http')
var util = require("util")
var recorder = new Recorder();

let controller = new DcsController();

var host_url='http://120.79.21.18:9011'
var request = require('request');

let speak = (str,host_url,is=1) => {
    var data = {
        txt:str,
        speak:is
    };
    data = require('querystring').stringify(data);
    let url = `${host_url}/TTS2?${data}`
    request({
        followAllRedirects: true,
        url: url
    }, function (error, response, body) {
        if (!error) {
            body=JSON.parse(body)
            let wave_url = `${host_url}/${body.waveURL}`
            let align_url = `${host_url}/${body.alignURL}`
            http.get(wave_url, function onResponse(response) {
                response.pipe(fs.createWriteStream(body.waveURL));
            });
            http.get(align_url, function onResponse(response) {
                response.pipe(fs.createWriteStream(body.alignURL));
            });
        }
    });
}

let i=0

controller.on("directive", (response) => {
    try {
        if (response.directive.header.namespace === 'ai.dueros.device_interface.screen' && response.directive.header.name === 'RenderCard') {
            let content = response.directive.payload.content;
            console.log(content)
            speak(content,host_url)
            //console.log(`you said ${content}`)
            return;
        }
        else
        {

        }
    }
    catch(e){
        //=vv]
        console.log(e)
    }
});

controller.on("event", (eventData) => {
});


function onKeypressed() {
    if (controller.isPlaying()) {
        controller.stopPlay();
        controller.stopRecognize();
        return;
    }
    console.log("keypress!!");
    if (controller.isRecognizing()) {
        console.log("stopRecognize!!");
        controller.stopRecognize();
        //recorder.stderr().unpipe(process.stderr);
    } else {
        console.log("startRecognize!!");
        controller.startRecognize();
        //recorder.stderr().pipe(process.stderr);
    }
}

var keypress = require('keypress');
keypress(process.stdin);
process.stdin.on("keypress", onKeypressed);



var unameAll = child_process.execSync("uname -a").toString();
var isRaspberrypi = unameAll.match(/raspberrypi/);



let snowboy = require("./snowboy.js");
const BufferManager = require("./wakeup/buffermanager").BufferManager;

function onWakeup(index, hotword, buffer) {
    console.log("hotword " + index);
    var cmd = config.play_cmd + " -t wav '" + __dirname + "/nihao.wav'";
    child_process.exec(cmd,{
        env: config.play_env,
    }, () => {
        controller.startRecognize();
    });
}
snowboy.on("hotword", onWakeup);

let started = false;
module.exports = {
    setRecorder: function(_recorder) {
        recorder = _recorder;
    },
    emitWakeup: function() {
        onWakeup(1, "小度小度", Buffer.alloc(0));
    },
    isStarted: function() {
        return started;
    },
    start: function() {
        if (started) {
            return;
        }
        started = true;
        if (config.avs_protocol) {
            console.log("use avs!!");
            configModule.set("directive_uri", config.avs_directive_uri);
            configModule.set("events_uri", config.avs_events_uri);
            configModule.set("ping_uri", config.avs_ping_uri);
            console.log(config);

            let client = new AvsClient({
                recorder: recorder
            });
            controller.setClient(client);
        } else {
            let client = new DcsClient({
                recorder: recorder
            });
            controller.setClient(client);
        }
        snowboy.start(recorder.start().out());
    },
    controller: controller
}
if (require.main === module) {
    module.exports.start();
    process.on('uncaughtException', (e) => {
        console.log(e);
    });
}
