const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const progressStream = require('progress-stream');
const nodemailer = require('nodemailer');

console.log(process.env.DOWNLOADURL)
//下载 的文件 地址
let fileURL = process.env.DOWNLOADURL;
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


    console.log('Send Mail');
    console.log(path.basename(fileURL));
    transporter.sendMail(message, (error, info) => {
        if (error) {
            console.log('Error occurred');
            console.log(error.message);
            return;
        }
        console.log('Message sent successfully!');
        console.log('Server responded with "%s"', info.response);
        transporter.close();
    });


});
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



var transporter = nodemailer.createTransport({
    service: 'qq',
    auth: {
        user: process.env.SENDEMAIL,//发送者邮箱
        pass: process.env.EMAILPASS //邮箱第三方登录授权码
    },
   //  logger: bunyan.createLogger({
   //      name: 'nodemailer'
   //  }),//打印日志
    debug: true
},{
    from: process.env.SENDEMAIL,//发送者邮箱
    headers: {
        'X-Laziness-level': 1000
    }
});

console.log('SMTP Configured');

var message = {
    // Comma separated lsit of recipients 收件人用逗号间隔
    to: process.env.TOEMAIL,

    // Subject of the message 信息主题
    subject:  'Nodemailer is unicode friendly',

    // plaintext body
    text: 'Hello to myself~',

    // Html body
    html: '<p>成功下载文件</p>',

    // Apple Watch specific HTML body 苹果手表指定HTML格式
    watchHtml: '<b>Hello</b> to myself',

    // An array of attachments 附件
    attachments: [
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
        {
            filename: path.basename(fileURL),
            path: fileSavePath,
            // cid: '00002'  // should be as unique as possible 尽可能唯一
         }
    ]

};
