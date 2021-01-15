const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const progressStream = require('progress-stream');
const nodemailer = require('nodemailer');


//下载 的文件 地址 （https://nodejs.org/dist/v12.18.3/node-v12.18.3-x64.msi）
//vscode地址：https://az764295.vo.msecnd.net/stable/ea3859d4ba2f3e577a159bc91e3074c5d85c0523/VSCodeUserSetup-x64-1.52.1.exe
let fileURL = 'https://az764295.vo.msecnd.net/stable/ea3859d4ba2f3e577a159bc91e3074c5d85c0523/VSCodeUserSetup-x64-1.52.1.exe';

//分割后文件集合
let attachments = [];
//每个邮件附件最大数量
let perEmailAttachmentMaxCount = 1;
//每个附件最大大小
let attachmentMaxSize = 1024 * 1024 * 45;
//下载保存的文件路径
let fileSavePath = path.join(__dirname, path.basename(fileURL));
//缓存文件路径
let tmpFileSavePath = fileSavePath + ".tmp";
//创建写入流
const fileStream = fs.createWriteStream(tmpFileSavePath).on('error', function (e) {
    console.error('error==>', e)
}).on('ready', function () {
    console.log("开始下载:", fileURL);
}).on('finish', function () {
    //下载完成后重命名文件
    fs.renameSync(tmpFileSavePath, fileSavePath);
    console.log('文件下载完成:', fileSavePath);
    const readstream = fs.createReadStream(fileSavePath);
	let i = 0;
	console.time('readtime');
    let patchIndex = 0;


	readstream.on('readable', () => {
        {
            let chunk = readstream.read(attachmentMaxSize);
            while (null !== chunk) {
                patchIndex = patchIndex + 1;
                // console.log('read times:'+patchIndex)
                // console.log(fileSavePath+'.email_'+patchIndex);

                let emailFilePath = fileSavePath+'.email_'+patchIndex;
                let emailFile = fs.createWriteStream(emailFilePath);
                emailFile.write(chunk);
                emailFile.end();
                
                attachments.push({
                    filename: patchIndex+'_'+path.basename(fileURL),
                    path: emailFilePath,
                });

		        chunk = readstream.read(attachmentMaxSize);
            }
        }
	});
	readstream.on('close', () => {
        console.timeEnd('readtime');
        attachments.push({
            filename: '文件分割合并器(SplitMergeFile).exe',
            path: path.join(__dirname, 'SplitMergeFile.exe')
        })
        let sendIndex = 1;
        let sendFiles = [];
        var i = 0;
        for(i = 0; i < attachments.length; i++)
        {
            sendFiles.push(attachments[i]);
            if(sendFiles.length >= perEmailAttachmentMaxCount)
            {
                sendEmail(sendFiles,sendIndex);
                sendFiles = [];
                sendIndex += 1;
            }
        }
        if(sendFiles.length > 0)
        {
            sendEmail(sendFiles,sendIndex);
            sendFiles = [];
        }

    });
    
});

var sendEmail = function(sendFiles,patchIndex){
    let msg = createEmailMessage(path.basename(fileURL) + '_Part' + patchIndex + '', sendFiles);
    console.log('Send Mail Part_' + patchIndex + '   ' + path.basename(fileURL));
    var i;
    for(i = 0; i < msg.attachments.length; i++)
    {
        console.log(msg.attachments[i].path);
    }
    var transporter = createTransporter();
    transporter.sendMail(msg, (error, info) => {
        if (error) {
            console.log('Error occurred');
            console.log(error.message);
            return;
        }
        console.log(path.basename(fileURL) + '_Part' + patchIndex + ' sent successfully! ');
        // console.log('Server responded with "%s"', info.response);
        transporter.close();
    });
};

//请求文件
fetch(fileURL, {
    method: 'GET',
    headers: { 'Content-Type': 'application/octet-stream' },
    // timeout: 100,    
}).then(res => {
    //获取请求头中的文件大小数据
    let fsize = res.headers.get("content-length");
    //创建进度
    let str = progressStream({
        length: fsize,
        time: 100 /* ms */
    });
    // 下载进度 
    str.on('progress', function (progressData) {
        //不换行输出
        let percentage = Math.round(progressData.percentage) + '%';
        console.log(percentage);
        // process.stdout.write('\033[2J'+);
        // console.log(progress);
        /*
        {
            percentage: 9.05,
            transferred: 949624,
            length: 10485760,
            remaining: 9536136,
            eta: 42,
            runtime: 3,
            delta: 295396,
            speed: 949624
        }
        */
    });
    res.body.pipe(str).pipe(fileStream);
}).catch(e => {
    //自定义异常处理
    console.log(e);
});



var createTransporter = function(){
    return nodemailer.createTransport({
        service: 'smtp.163.com',
        host: "smtp.163.com",
        secureConnection: true,
        port:465,
        auth: {
            user: process.env.SENDEMAIL,//发送者邮箱
            pass: process.env.EMAILPASS //邮箱第三方登录授权码
        },
        debug: true
    },{
        from: process.env.SENDEMAIL,//发送者邮箱
        headers: {
            'X-Laziness-level': 1000
        }
    });
} 

console.log('SMTP Configured');

var createEmailMessage = function(subject,sendFiles){
    var message = {
        // Comma separated lsit of recipients 收件人用逗号间隔
        to: process.env.TOEMAIL,
    
        // Subject of the message 信息主题
        subject:  subject,
    
        // plaintext body
        // text: '请查阅附件',
    
        // Html body
        html: '<p>下载文件成功</p>',
    
        // Apple Watch specific HTML body 苹果手表指定HTML格式
        // watchHtml: '<b>Hello</b> to myself',
    
        // An array of attachments 附件
        attachments: sendFiles
        // [
            // String attachment
           //  {
           //      filename: 'notes.txt',
           //      content: 'Some notes about this e-mail',
           //      contentType: 'text/plain' // optional,would be detected from the filename 可选的，会检测文件名
           //  },
           //  // Binary Buffer attchment
           //  {
           //      filename: 'image.png',
           //      content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD/' +
           //         '//+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4U' +
           //         'g9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC', 'base64'),
           //      cid: '00001'  // should be as unique as possible 尽可能唯一
           //  },
            // File Stream attachment
            // {
            //     filename: filename,
            //     path: filepath,
            //     // cid: '00002'  // should be as unique as possible 尽可能唯一
            //  }
        // ]
    
    };
    return message;
};


