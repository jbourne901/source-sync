
const socketio  = require('socket.io');
const fs  = require('fs');
const chokidar = require('chokidar');
const exec = require("child_process");

let [a1,a2,baseDir,...paths] = process.argv;
if(!baseDir || !paths || paths.length===0) {
  console.error("usage: fsw-server baseDir filepath1 (filepath2, ...) ");
  process.exit(-1);
}

if(baseDir==="" || baseDir==="." || baseDir==="./") {
  baseDir=__dirname;
}
console.log(`watching baseDir=${baseDir} paths=`);
for(let p of paths) {
   console.log(baseDir+"/"+p);
}

const sendFull = async (socket) => {
  const tmpfile = require("os").tmpdir()+"/tmp.zip";
  const pathlist = paths.join(" ");
  const cmd = `${baseDir}/archive.sh ${baseDir} ${tmpfile} ${pathlist}`
  console.log(`sendFull tmpfile=${tmpfile}`);
  try {
      try {
         await fs.promises.unlink(tmpfile);
      } catch(ignore) {
         console.error(ignore);
      }

     console.log(`sendFull.2 start compress`);
     await new Promise( (resolve, reject) => { 
       exec.exec(cmd, (err) => {
          if(err) {
             return reject(err);
          }
          return resolve();
       });
     });
     const content = await fs.promises.readFile(tmpfile, {encoding: "base64"});
     const data = {eventType: "sync", file:content};
     console.log(`sendFull3. sending`) 
     console.dir(data);
     socket.emit("fileevent", data);
      console.log(`sendFull4. sent done`)
  } catch(err) {
     console.error(err);
     socket.disconnect();
  }
};

const io = socketio.listen(5001);
io.on("connect", (socket) => {
  console.log("new client connection");
  sendFull(socket);
});

const handleAddChangeFile = async (event, path) => {
  try {
     const content = await fs.promises.readFile(path, {encoding: "base64"});
     console.log(`sending file ${path}  =  ${content}`)
     io.sockets.emit("fileevent", {eventType: event, path, file: content});
  } catch(err) {
     console.error(err);
  }
};

const handleChange = (event, path) => {
  if(path.startsWith(baseDir)) {
      path = path.substring(baseDir.length);
  }
  if(path[0]==="/") {
      console.log("trimming / from path");
      path = path.substring(1);
  }
  console.log(event, path);
  if(event==="add" || event==="change") {
     handleAddChangeFile(event, path);
     return;
  }
  io.sockets.emit("fileevent", {eventType: event, path});
};


for(const p of paths) {
   chokidar.watch(baseDir+"/"+p).on('all', (event, path) => {
      handleChange(event, path);
   });
}







