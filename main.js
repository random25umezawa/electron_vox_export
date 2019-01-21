const fsp = require("fs").promises
const Jimp = require("jimp")

const {app,BrowserWindow,remote,ipcMain} = require("electron")
const {VoxReader,VoxMerge,VoxExport} = require("./voxtool")

const TEMP_EXPORT_DIR = "temp_export"

let win;

let vox_data;

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

ipcMain.on("setFile",async(e,arg)=>{
	console.log(arg)

	// フォルダ生成
	try{
		await fsp.stat(TEMP_EXPORT_DIR)
		await Promise.all((await fsp.readdir(TEMP_EXPORT_DIR)).map(_f=>fsp.unlink(`${TEMP_EXPORT_DIR}/${_f}`)))
	}catch(e) {
		await fsp.mkdir(TEMP_EXPORT_DIR)
	}

	// vox読み込み
	let file = await fsp.readFile(arg)
	let vr = new VoxReader(file);
	vox_data = vr;

	// 各種情報
	let palette = vox_data.getPalette();
	let vm = new VoxMerge(vr);
	let tree = vm.getRootTree();
	let merged = vm.getRootModel({});

	// 正面画像
	let ve = new VoxExport(merged[1],merged[2],vr.getPalette());
	ve.setSplit(1);
	let rotates = await ve.createRotates()
	await rotates[0].resize(rotates[0].bitmap.width*4,rotates[0].bitmap.height*4,Jimp.RESIZE_NEAREST_NEIGHBOR).write(`${TEMP_EXPORT_DIR}/${`${0}`.padStart(3,"0")}.png`);

	// 画像が読み込めないことがあるので若干待つ
	while(true) {
		try{
			await fsp.stat(TEMP_EXPORT_DIR)
			break;
		}catch(e) {
			await new Promise(resolve=>{
				setTimeout(resolve,125)
			})
		}
	}

	// 情報取得終了
	e.sender.send("setFileComplete",{palette,tree});
})

ipcMain.on("createRotate",async(e,arg)=>{
	let rot_count = arg;
	let vr = vox_data;
	let vm = new VoxMerge(vr);
	let merged = vm.getRootModel({});
	let ve = new VoxExport(merged[1],merged[2],vr.getPalette());
	ve.setSplit(rot_count);
	let rotates = await ve.createRotates()
	for(let i = 0; i < rotates.length; i++) {
		rotates[i].resize(rotates[i].bitmap.width*4,rotates[i].bitmap.height*4,Jimp.RESIZE_NEAREST_NEIGHBOR).write(`${TEMP_EXPORT_DIR}/${`${i}`.padStart(3,"0")}.png`);
	}
	e.sender.send("createRotateComplete",rot_count)
})
