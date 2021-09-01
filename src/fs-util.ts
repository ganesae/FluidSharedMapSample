import * as fs from 'fs';
const path = require('path');

export function readFromFile(file: string, textFile?: boolean): any {
  try {
    const content = fs.readFileSync(file, textFile ? 'utf8' : undefined);
    return content;
  } catch (e) {
    console.info(`Failed to read file ${file}`);
    return null;
  }
}

export function writeToFile(file: string, content: any): boolean {
  try {
    const fileDir = path.dirname(file);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    let strData;
    if (typeof content === 'object') {
      strData = JSON.stringify(content, null, 2);
    } else {
      strData = content;
    }

    if (strData.length > 0 && strData[strData.length - 1] !== '\n') {
      strData = strData + '\r\n';
    }

    fs.writeFileSync(file, strData);

    return true;
  } catch (e) {
    return false;
  }
}
