///base on node built-in http module
const EventEmitter = require("events");
const util = require('util');
const request = require("request");
const config = require("./config.js").getAll();
const Readable = require('stream').Readable;
const http2 = require("http2");
const fs = require('fs');
const Dicer = require('dicer');
const BufferManager = require("./wakeup/buffermanager").BufferManager;

function DownStream() {
    EventEmitter.call(this);
    this.init();
}



//this.state: connecting/closed/connected

DownStream.prototype.isConnected = function() {
    return this.state == "connected";
};

DownStream.prototype.init = async function() {
    var self = this;
    if (this.state == "connecting") {
        return;
    }

    if (this.req) {
        try {
            this.req.rstWithCancel();
        } catch (e) {}
        this.req = null;
    }

    if (this.pingInterval) {
        clearInterval(this.pingInterval);
        if (this.pingReq) {
            try {
                this.pingReq.rstWithCancel();
            } catch (e) {}
            this.pingReq = null;
        }
    }

    if (this.http2session) {
        try {
            this.http2session.shutdown({
                graceful: true
            });
        } catch (e) {}
        this.http2session = null;
        await new Promise((resolve, reject) => {
            setTimeout(resolve, 1000);
        });
    }
    console.log(config.oauth_token);
    console.log("https://" + config.ip);
    this.http2session = http2.connect("https://" + config.ip,{rejectUnauthorized:false});
    this.http2session.socket.setNoDelay(true);
    
    this.http2session.on("error", () => {
        this.state = "closed";
        console.log('downstream session error!!!!!!!!');
    });
    this.http2session.on("close", () => {
        this.state = "closed";
        this.emit("sessionClosed");
        console.log('downstream session closed!!!!!!!!');
        this.init();
    });
    var logid = config.device_id + "_" + new Date().getTime() + "_monitor";
    console.log("downstream logid:" + logid);
    this.req = this.http2session.request({
        ":path": config.directive_uri,
        "SAIYALOGID": logid,
        "authorization": "Bearer " + config.oauth_token,
        "Dueros-Device-Id": config.device_id
    });
    this.req.on("error", (e) => {
        console.log('downstream error!!!!!!!!' + e.toString());
    });
    this.req.on("streamClosed", () => {
        this.emit("streamClosed");
        console.log('downstream closed');
        this.init();
    });
    this.http2session.setTimeout(0, () => {
        console.log("downstream session timeout");
    });
    this.req.setTimeout(0, () => {
        console.log("downstream stream timeout");
    });
    this.state = "connecting";
    if (this.pingInterval) {
        clearInterval(this.pingInterval);
    }
    this.pingInterval = setInterval(() => {
        if (!this.http2session || this.http2session.aborted || this.http2session.destroyed) {
            console.log('downstream ping error, stream closed');
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
            }
            return;
        }
        var req = this.pingReq = this.http2session.request({
            ":path": config.ping_uri,
            "authorization": "Bearer " + config.oauth_token,
            "Dueros-Device-Id": config.device_id
        });
        req.setTimeout(5000, () => {
            console.log("downstream ping timeout");
            if (!req.destroyed) {
                req.rstWithCancel();
            }
            if (this.req && !this.req.destroyed) {
                this.req.rstWithCancel();
            }
        });
        req.on("response", (headers) => {
            //console.log(headers[':status']);
            if (headers[':status'] != 200) {
                console.log("ping status error!!", headers);
                //this.init();
            }
        });
        setTimeout(() => {
            if (!req.destroyed) {
                req.rstWithCancel();
            }
        }, 5000);
        req.on("error", (e) => {
            console.log('downstream ping error!!!!!!!!' + e.toString());
            //this.init();
        });
    }, 5000);
    var d = this.dicer = new Dicer({
        "boundary": ""
    });
    d.on('error', () => {
        console.log('downstream dicer error, no multi part in downstream!!!!!!!!');
    });
    this.req.on('response', (headers) => {
        if (!this.req) {
            return;
        }
        this.state = "connected";
        console.log("downstream created!");
        this.emit("init");
        if (!headers['content-type']) {
            console.log(headers);
            throw new Error("server header error: no content-type");
        }
        var matches = headers['content-type'].match(/boundary=([^;]*)/);
        if (matches && matches[1]) {
            d.setBoundary(matches[1]);
        }
        this.req.on("data", (data) => {
            //console.log(data.toString());
        });
        let rWrap = new Readable().wrap(this.req);
        rWrap.pipe(fs.createWriteStream(__dirname + "/tmp/ds" + logid, {
            flags: 'w',
            defaultEncoding: 'binary',
            autoClose: true
        }));
        rWrap.pipe(d);
    });
    //content-type: multipart/form-data; boundary=___dumi_avs_xuejuntao___
    d.on('part', function(p) {
        //console.log("on part");
        var name = null;
        var jsonBody = new BufferManager();
        var response = null;
        p.on('header', function(header) {
            name = null;
            jsonBody.clear();
            response = null;
            //console.log(JSON.stringify(header, null, '  '));
            if (header["content-disposition"]) {
                var matches;
                if (matches = header["content-disposition"][0].match(/name="(\w+)"/)) {
                    name = matches[1];
                }
            }
            if (header['content-id']) {
                var content_id = header["content-id"][0].replace(/[<>]/g, "");
                //console.log("content_id:"+content_id);
                self.emit("content", content_id, p);
            }
        });
        p.on('data', function(data) {
            if (name == "metadata") {
                jsonBody.add(data);
            }
        });
        p.on('end', function() {
            if (jsonBody) {
                try {
                    response = JSON.parse(jsonBody.toBuffer().toString("utf8"));
                } catch (e) {}
                if (response) {
                    self.emit("directive", response);
                }
            }
            //console.log(JSON.stringify(response, null, '  '));
        });
        p.on('error', () => {
            console.log('downstream dicer error, event part error');
        });
    });
    d.on('finish', function() {
        //console.log('End of parts');
    });

}
util.inherits(DownStream, EventEmitter);

module.exports = DownStream;
