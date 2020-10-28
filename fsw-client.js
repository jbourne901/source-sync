//npm install socket.io-client child_process --save-dev
const socketio = require('socket.io-client');
const fs = require("fs");
const exec = require('child_process');


let [a1,a2,baseDir] = process.argv;
if(!baseDir) {
   baseDir = __dirname;
}
console.log(`Waiting for changes in ${baseDir}`)

const socket = socketio('http://192.168.2.242:5001');

const handleConnect = () => {
   console.log("connected");
}

const handleDisconnect = () => {
   console.log("disconnected");
}

const handleAddFile = async (event) => {
   console.log(`handleAdd.1 path=${event.path} eventTyoe = ${event.eventType}`);
   try {
      const exists = fs.existsSync(event.path);
      if(exists) {
         console.log(`handleAdd.2 path=${event.path} exists - skipping`);
         return;
      }
      return await handleChangeFile(event);
   } catch(err) {
      console.error(err);
   } 
}

const handleAddDir = async (event) => {
   console.log(`handleAddDir.1 path=${event.path} eventTyoe = ${event.eventType}`);
   try {
      const exists = fs.existsSync(event.path);
      if(exists) {
         console.log(`handleAddDir.2 path=${event.path} exists - skipping`);
         return;
      }
      await fs.promises.mkdir(event.path);
      console.log("handleAddDir = success")
   } catch(err) {
      console.error(err);
   } 
}

const handleChangeFile = async (event) => {
  console.log(`handleChange.1 path=${event.path} eventTyoe = ${event.eventType}`);
  const buf = new Buffer(event.file, "base64").toString("binary");
  try {
     await fs.promises.writeFile(event.path, buf, 'binary');
     console.log("handleChange.2");
     if(event.path.endsWith("package.json")) {
        console.log(`package.json - executing npm install`)
        await new Promise( (resolve, reject) => { 
            console.log(`inside promise 1`)
            exec.exec(`cd ${baseDir} && npm install`, (err, stdout, stderr) => {
               console.log(`inside exec callback`)
               if(err) {
                  console.error(err);
                  return reject(err);
               }
               if(stderr) {
                  console.error(stderr);
                  return reject(stderr);
               }
               return resolve(stdout);
            });
         });
      }
  } catch (err) {
     console.error(err);
  }
};

const handleDeleteFile = async (event) => {
   console.log("handleDeleteFile 1 event=");
   try {
      await fs.promises.unlink(event.path);
      console.log("handleDeleteFile 2 success");
   } catch(err) {
      console.error(err)
   }   
}


const handleDeleteDir = async (event) => {
   console.log("handleDeleteDir 1 event=");
   try {
      await fs.promises.rmdir(event.path, {recursive: true});
      console.log("handleDeleteDir 2 success");
   } catch(err) {
      console.error(err)
   }   
};

const handleFull = async (event) => {
   console.log("handleFull 1 event=");
   const tmpsrcdir = require("os").tmpdir()+"/tmptmp";   
   const tmpfile = require("os").tmpdir()+"/tmp.zip";
   const buf = new Buffer(event.file, "base64").toString("binary");
   const cmd = `unzip -o ${tmpfile} -d ${baseDir}`;

   try {
      try {
         await fs.promises.rmdir(tmpsrcdir, {recursive: true});
         await fs.promises.unlink(tmpfile);
      } catch(ignore) {}

      await fs.promises.mkdir(tmpsrcdir);   
      await fs.promises.writeFile(tmpfile, buf, 'binary');   
      console.log(`handleFull2 unzip ${tmpfile}`)   
      await new Promise( (resolve, reject) => {
         console.log(`in promise 1`)
         exec.exec(cmd, (err, stdout, stderr) => {
            console.log(`in exec callback 1`)
            if(err) {
               console.error(err);
               return reject(err);
            }
            if(stderr) {
               console.error(stderr);
               return reject(stderr);
            }
            console.log(`zip done`)
            return resolve(stdout);
         });
      });
      await fs.promises.unlink(tmpfile);
      await fs.promises.rmdir(tmpsrcdir, {recursive: true});   
      console.log(`handleFull3 done`)      
   } catch(err) {
      console.error(err);
   }
}

const handleEvent = (event) => {
   console.log("event");
   console.dir(event);
   if(event.eventType==="add") {      
      handleAddFile(event);
   } else if(event.eventType==="change") {
      console.log("calling handleChangeFile")
      handleChangeFile(event);
   } else if(event.eventType==="unlink") {
      handleDeleteFile(event);
   } else if(event.eventType==="addDir") {
      handleAddDir(event);
   } else if(event.eventType==="unlinkDir") {
      handleDeleteDir(event);
   } else if(event.eventType==="sync") {
      console.log(`calling handleFull`)
      handleFull(event);
   }
}

socket.on('connect', () => handleConnect());
socket.on('fileevent', (event) => handleEvent(event));
socket.on('disconnect', () => handleDisconnect() );
