import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

const port = new SerialPort({ path: 'COM3', baudRate: 115200 })
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

console.log('监听 COM3 (115200)... 按 Ctrl+C 退出\n')

parser.on('data', (line) => {
  const t = line.trim()
  if (t) console.log(t)
})

port.on('error', (err) => {
  console.error('串口错误:', err.message)
  process.exit(1)
})
