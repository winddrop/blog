
import fs from 'fs'
import path from 'path'

function resolvePath(dir) {
  return path.resolve(__dirname, './', dir)
}
const content = fs.readFileSync('.docignore', 'utf-8');
const lines = content.split('\n');
const exclude = []
for (let line = 0; line < lines.length; line++) {
  const text = lines[line]
  if (text)
    exclude.push(text)
}

let rootTree = {text: '', items: [], path: '',}

function deepReadDirSync(dirPath, parent) {
  // console.log('dirPath:', dirPath)
  // 该文件夹下的所有文件名称 (文件夹 + 文件)
  let files = fs.readdirSync(dirPath)
  files.forEach(file => {
    if (file === 'README.md' || file === 'index.md') return;
    if (exclude.includes(file)) return;
    if (file.substring(0, 1) === '.') return;

    let filePath = `${dirPath}/${file}`
    let stat = fs.lstatSync(filePath)
    // console.log(file, " isFile=", stat.isFile(), " isDirectory=", stat.isDirectory())

    if (stat.isFile()) { // 是文件
      let ext = path.extname(file)
      let basename = path.basename(file, ext);
      // console.log("file=", file, " basename=", basename, " ext=", ext)

      if (ext === '.md') {
        let item = {
          text: basename,
          link: `${parent.path}/${basename}`,
        }
        if (!parent.items) parent.items = []
        parent.items.push(item)
      }
    } else if (stat.isDirectory()) { // 是文件夹
      let currentPath = `${parent.path}/${file}`
      let link = fs.existsSync(`${filePath}/README.md`) ? `${currentPath}/README` : null
      let item = {
        text: file,
        link,
        path: currentPath
      }
      // console.log('item:', item)

      if (!parent.items) parent.items = []
      parent.items.push(item)

      deepReadDirSync(filePath, item)
    }
  })
}

// 冒泡排序
function bubble_sort(array) {
  if(!array || !array.length)
    return

  let n = array.length;
  for (let i = 1; i <= n - 1; i++) {
    for (let j = 1; j <= n - i; j++) {
      let prevItem = array[j - 1]
      let curItem = array[j]
      let prevValue = Number(prevItem.text.split(" ")[0])
      let curValue = Number(curItem.text.split(" ")[0])
      if (!isNaN(prevValue) && !isNaN(curValue)) {
        if (prevValue > curValue) {
          let temp = array[j - 1];
          array[j - 1] = array[j]
          array[j] = temp;
        }
      }
    }
  }
}

export default bubble_sort
