const fsp = require("fs").promises
const Jimp = require("jimp")

const {app,BrowserWindow,remote,ipcMain} = require("electron")
const {VoxReader,VoxMerge,VoxExport} = require("./voxtool")

const TEMP_EXPORT_DIR = "temp_export"

let win;

function createWindow(){
	win = new BrowserWindow({width:800,height:600})
	win.loadFile("index.html")
	win.openDevTools()
	win.on("closed",_=>{
		win = null
	})
}

app.on("ready",createWindow)
app.on("window-all-closed",_=>{
	if(process.platform!=="darwin"){
		app.quit()
	}
})
app.on("active",_=>{
	if(win===null){
		createWindow()
	}
})

ipcMain.on("get",(e,arg)=>{
	console.log(arg)
	e.sender.send("send","weiwei")
})

ipcMain.on("setFile",async(e,arg)=>{
	console.log(arg)
	try{
		await fsp.stat(TEMP_EXPORT_DIR)
		await Promise.all((await fsp.readdir(TEMP_EXPORT_DIR)).map(_f=>fsp.unlink(`${TEMP_EXPORT_DIR}/${_f}`)))
	}catch(e) {
		await fsp.mkdir(TEMP_EXPORT_DIR)
	}
	let file = await fsp.readFile(arg)
	let vr = new VoxReader(file);
	let vm = new VoxMerge(vr);
	let merged = vm.getRootModel({});
	let ve = new VoxExport(merged[1],merged[2],vr.getPalette());
	ve.setSplit(36);
	let rotates = await ve.createRotates()
	for(let i = 0; i < rotates.length; i++) {
		rotates[i].resize(rotates[i].bitmap.width*4,rotates[i].bitmap.height*4,Jimp.RESIZE_NEAREST_NEIGHBOR).write(`${TEMP_EXPORT_DIR}/${`${i}`.padStart(3,"0")}.png`);
	}
	e.sender.send("setFileComplete",36)
})
