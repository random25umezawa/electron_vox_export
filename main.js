const {app,BrowserWindow} = require("electron")
const {VoxReader,VoxMerge,VoxExport} = require("./voxtool")

let win;

function createWindow(){
	win = new BrowserWindow({width:600,height:480})
	win.loadFile("index.html")
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
